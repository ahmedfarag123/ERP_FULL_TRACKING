-- =============================================================================
-- 00200_collection_net.sql
--
-- Keep the "what the customer actually owes" figures net-of-returns, at the
-- moment quantities/returns change, so that:
--   1) the driver collection card + collection sheet show the correct price,
--   2) outstanding = max(pending_delivery_amount - collected_successfully, 0)
--      stays correct BEFORE submission (00195 owns pending at/after submit),
--   3) run_driver_settlement (reads MAX(pending_delivery_amount)) settles the
--      billable net instead of the full invoice.
--
-- Rule (identical to 00194 / 00195 v_delivered_total / logistics_shipment_detail):
--   delivered = sum over items of max(0, min(done, requested - returned)) * price
--   price     = total_amount/ordered_quantity OR unit_price*(1-disc) OR 0
--   line match= external_product_id (trimmed) OR trimmed lowercase product_name
--
-- Guards (never change history / never zero out on a join failure):
--   * only non-return shipments with a linked order and at least one
--     done_quantity > 0 (POD performed). No POD  -> values untouched (status quo).
--   * pending_delivery_amount is only rewritten while the shipment is
--     UNCOLLECTED: no payment timestamps, no collected amounts, no
--     logistics_order_collections receipt rows (submission marker for every
--     payment method incl. credit-only).
--   * a delivered item that matches no order line -> skip entirely (the price
--     basis could not be evaluated; keep the previous value).
--
-- Backfill covered by this migration (measured 2026-09-30 before apply):
--   * 120 uncollected rows with delivered > 0 and pending != delivered  -> pending := delivered
--   * 24 POD shipments with delivered_invoice_amount IS NULL            -> full recompute
--   * ~2967 POD shipments (done > 0): full one-time recompute of
--     delivered_invoice_amount (00194-era stored values are stale/lower for
--     ~2336 of them: returns/done changed after that backfill and nothing
--     re-ran it), then pending := delivered for every UNCOLLECTED POD row.
--
-- Rollback: DROP TRIGGER trg_00200_net_items / trg_00200_net_returns;
--           DROP FUNCTION ...; then
--           UPDATE logistics_shipment_collections c SET pending_delivery_amount = b.pending
--             FROM (SELECT (jsonb_each(...)).*) -- or simply restore from
--             public.logistics_00200_collections_bak b WHERE b.shipment_id = c.shipment_id;
--           UPDATE logistics_shipments s SET delivered_invoice_amount = b.delivered_invoice_amount
--             FROM public.logistics_00200_shipments_bak b WHERE b.id = s.id;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Backups (point in time 2026-09-30, pre-change)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_00200_collections_bak AS
SELECT * FROM public.logistics_shipment_collections;

CREATE TABLE IF NOT EXISTS public.logistics_00200_shipments_bak AS
SELECT id, delivered_invoice_amount, updated_at FROM public.logistics_shipments;

-- ---------------------------------------------------------------------------
-- Recompute function: one shipment -> delivered_invoice_amount + pending
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.logistics_00200_recompute_collection_net(p_shipment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ship public.logistics_shipments%ROWTYPE;
  v_has_done boolean;
  v_net numeric(14,2);
  v_unmatched integer;
BEGIN
  SELECT * INTO v_ship FROM public.logistics_shipments WHERE id = p_shipment_id;
  IF NOT FOUND OR v_ship.is_return_shipment OR v_ship.linked_order_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.logistics_shipment_items li
    WHERE li.shipment_id = p_shipment_id AND COALESCE(li.done_quantity, 0) > 0
  ) INTO v_has_done;
  IF NOT v_has_done THEN
    RETURN;
  END IF;

  -- Never rewrite a value whose price basis could not be evaluated.
  SELECT count(*) INTO v_unmatched
  FROM public.logistics_shipment_items li
  LEFT JOIN LATERAL (
    SELECT o.total_amount, o.ordered_quantity, o.unit_price, o.discount_percent
    FROM public.order_line_items o
    WHERE o.order_id = v_ship.linked_order_id
      AND COALESCE(NULLIF(btrim(o.external_product_id), ''), lower(btrim(o.product_name)))
        = COALESCE(NULLIF(btrim(li.external_product_id), ''), lower(btrim(li.product_name)))
    ORDER BY coalesce(o.last_sync_at, o.updated_at) DESC NULLS LAST
    LIMIT 1
  ) oli ON true
  WHERE li.shipment_id = p_shipment_id
    AND COALESCE(li.done_quantity, 0) > 0
    AND oli.total_amount IS NULL
    AND oli.unit_price IS NULL
    AND oli.ordered_quantity IS NULL;
  IF v_unmatched > 0 THEN
    RETURN;
  END IF;

  SELECT round(COALESCE(sum(
           GREATEST(LEAST(COALESCE(li.done_quantity, 0),
                          COALESCE(li.requested_quantity, 0) - COALESCE(li.returned_quantity, 0)), 0)
           * COALESCE(oli.total_amount / nullif(oli.ordered_quantity, 0),
                      oli.unit_price * (1 - COALESCE(oli.discount_percent, 0) / 100.0),
                      0)
         ), 0), 2)
  INTO v_net
  FROM public.logistics_shipment_items li
  LEFT JOIN LATERAL (
    SELECT o.total_amount, o.ordered_quantity, o.unit_price, o.discount_percent
    FROM public.order_line_items o
    WHERE o.order_id = v_ship.linked_order_id
      AND COALESCE(NULLIF(btrim(o.external_product_id), ''), lower(btrim(o.product_name)))
        = COALESCE(NULLIF(btrim(li.external_product_id), ''), lower(btrim(li.product_name)))
    ORDER BY coalesce(o.last_sync_at, o.updated_at) DESC NULLS LAST
    LIMIT 1
  ) oli ON true
  WHERE li.shipment_id = p_shipment_id;

  UPDATE public.logistics_shipments
     SET delivered_invoice_amount = v_net
   WHERE id = p_shipment_id
     AND delivered_invoice_amount IS DISTINCT FROM v_net;

  UPDATE public.logistics_shipment_collections c
     SET pending_delivery_amount = v_net
   WHERE c.shipment_id = p_shipment_id
     AND COALESCE(c.collected_from_customer, 0) = 0
     AND COALESCE(c.collected_successfully_amount, 0) = 0
     AND c.payment_collected_at IS NULL
     AND c.collected_from_customer_at IS NULL
     AND NOT EXISTS (
           SELECT 1 FROM public.logistics_order_collections oc
           WHERE oc.shipment_id = p_shipment_id::text)
     AND c.pending_delivery_amount IS DISTINCT FROM v_net;
END
$fn$;

-- ---------------------------------------------------------------------------
-- Triggers: quantity/return writes keep the derived values fresh
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_00200_shipment_items_net()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ship uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ship := OLD.shipment_id;
  ELSE
    v_ship := NEW.shipment_id;
  END IF;
  IF v_ship IS NOT NULL THEN
    PERFORM public.logistics_00200_recompute_collection_net(v_ship);
  END IF;
  RETURN NULL;
END
$fn$;

CREATE OR REPLACE FUNCTION public.trg_00200_return_items_net()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ship uuid;
  v_parent_item uuid;
  v_return_ship uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ship := OLD.parent_shipment_id;
    v_parent_item := OLD.parent_item_id;
    v_return_ship := OLD.return_shipment_id;
  ELSE
    v_ship := NEW.parent_shipment_id;
    v_parent_item := NEW.parent_item_id;
    v_return_ship := NEW.return_shipment_id;
  END IF;
  IF v_ship IS NULL AND v_parent_item IS NOT NULL THEN
    SELECT li.shipment_id INTO v_ship
    FROM public.logistics_shipment_items li WHERE li.id = v_parent_item;
  END IF;
  IF v_ship IS NULL AND v_return_ship IS NOT NULL THEN
    SELECT rs.parent_shipment_id INTO v_ship
    FROM public.logistics_shipments rs WHERE rs.id = v_return_ship;
  END IF;
  IF v_ship IS NOT NULL THEN
    PERFORM public.logistics_00200_recompute_collection_net(v_ship);
  END IF;
  RETURN NULL;
END
$fn$;

DROP TRIGGER IF EXISTS trg_00200_net_items ON public.logistics_shipment_items;
CREATE TRIGGER trg_00200_net_items
AFTER INSERT OR UPDATE OF done_quantity, returned_quantity OR DELETE
ON public.logistics_shipment_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_00200_shipment_items_net();

DROP TRIGGER IF EXISTS trg_00200_net_returns ON public.logistics_return_shipment_items;
CREATE TRIGGER trg_00200_net_returns
AFTER INSERT OR UPDATE OR DELETE
ON public.logistics_return_shipment_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_00200_return_items_net();

-- ---------------------------------------------------------------------------
-- Backfill 1: one-time recompute of EVERY POD shipment (done > 0).
-- Covers: delivered IS NULL (24), delivered = 0 written by 00194 while done was
-- still empty, and 00194-era values that drifted (returns/done changed after
-- 2026-09-27 08:24 without a recompute). ~2967 calls; each shipment is only
-- written when its value actually differs.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_sid uuid;
BEGIN
  FOR v_sid IN
    SELECT DISTINCT s.id
    FROM public.logistics_shipments s
    JOIN public.logistics_shipment_items li ON li.shipment_id = s.id
    WHERE NOT s.is_return_shipment
      AND s.linked_order_id IS NOT NULL
      AND COALESCE(li.done_quantity, 0) > 0
  LOOP
    PERFORM public.logistics_00200_recompute_collection_net(v_sid);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- Backfill 2: uncollected POD rows -> pending := delivered (the authoritative
-- billable net written above). No-op for submitted rows (receipts/timestamps/
-- collected amounts present) and for shipments without POD.
-- ---------------------------------------------------------------------------
UPDATE public.logistics_shipment_collections c
SET pending_delivery_amount = s.delivered_invoice_amount
FROM public.logistics_shipments s
WHERE s.id = c.shipment_id
  AND NOT s.is_return_shipment
  AND s.delivered_invoice_amount IS NOT NULL
  AND EXISTS (
        SELECT 1 FROM public.logistics_shipment_items li
        WHERE li.shipment_id = s.id AND COALESCE(li.done_quantity, 0) > 0)
  AND c.pending_delivery_amount IS DISTINCT FROM s.delivered_invoice_amount
  AND COALESCE(c.collected_from_customer, 0) = 0
  AND COALESCE(c.collected_successfully_amount, 0) = 0
  AND c.payment_collected_at IS NULL
  AND c.collected_from_customer_at IS NULL
  AND NOT EXISTS (
        SELECT 1 FROM public.logistics_order_collections oc
        WHERE oc.shipment_id = s.id::text);
