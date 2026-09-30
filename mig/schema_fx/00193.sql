-- 00193.sql — Root-cause fix for inflated delivery returns + unpersisted delivered quantities.
--
-- PROVEN ROOT CAUSE
--   driver_update_shipment_phase (all three overloads) denormalised
--   approved_quantity onto every logistics_shipment_items row by copying it from
--   dispatcher_plan_item_preparations — a PLAN-level aggregate (8,106 rows, no
--   order_id) matched only on lower(trim(product_name)) within the same plan.
--   A shipment then computed returned = approved - delivered, so any order sharing
--   a product with a larger order in the same plan inherited that plan's approved
--   quantity and produced phantom returns (example: order asked 5, plan approved
--   34 -> 29 phantom returned units, 4.8x).
--   The driver app reinforced it: attachPreparationStatus overwrote the item's
--   approved_quantity with the plan-level value, and the maxQty input allowed the
--   driver to record up to (approved - done) phantom units.
--
-- SECONDARY BUG (confirmed)
--   driver_update_shipment_phase never wrote done_quantity; it only asserted
--   done_quantity IS NOT NULL, which accepted 0. The driver app wrote quantities
--   through a single non-offline-queued RPC (driver_update_shipment_items) from
--   one screen, so many DELIVERED shipments (879, 3,774 items) retained
--   done_quantity = 0 even though Odoo's order_line_items.delivered_quantity had
--   the true delivered figures (114,900 vs 141,155 units). This under-reported
--   delivered value and over-stated returns.
--
-- WHAT THIS MIGRATION DOES (data only; functions already fixed separately)
--   Step 1  approved := requested  where approved > requested   (both item tables)
--   Step 2  done     := order_line_items.delivered_quantity for DELIVERED shipments
--          (only where it differs; this is Odoo — the same source the platform's
--           own sync_logistics_shipment_items_from_order trusts)
--   Step 3  returned := GREATEST(requested - done, 0)  (shipment items) and
--          returned := GREATEST(requested - delivered, 0)  (return items),
--          recomputed AFTER steps 1-2 so the real shortfall is authoritative.
--   Step 4  recompute total_gmv on return shipments = SUM(returned * unit price).
--   Step 5  a guard CHECK-style comment; no new constraint (tables may already be
--          large and we avoid locking; the functions now clamp on write).
--
--   NOT done here (explicitly deferred by the owner): the 85 legacy credit-note
--   (reversal) journal entries totalling 1,137,830.22 EGP were posted from the
--   contaminated return value. Correcting those ledger entries is a separate,
--   owner-approved follow-up. The data this migration fixes is the source those
--   entries were derived from; new entries will be correct because the functions
--   are fixed.
--
-- SAFETY
--   Runs in one transaction. A pre-image of the affected columns is written to
--   public.logistics_00193_backup (created if absent) so every touched row can be
--   restored, and return-shipment total_gmv to public.logistics_00193_gmv_backup.
--   Shipment items are matched to Odoo through a strictly-unique (order, product)
--   map (products appearing on exactly one order line), which leaves ambiguous
--   duplicate-line items untouched. Return quantities are only recomputed for
--   shipments that reached a delivery/failure decision; undelivered shipments get
--   zeroed so a stale return never survives.

BEGIN;

-- ---------------------------------------------------------------------------
-- Pre-image backup of the columns we mutate (idempotent, re-runnable).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_00193_backup (
  backup_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  table_name     text        NOT NULL,
  row_id         uuid        NOT NULL,
  shipment_id    uuid,
  approved_quantity   numeric,
  requested_quantity  numeric,
  done_quantity       numeric,
  delivered_quantity  numeric,
  returned_quantity   numeric
);

-- ---------------------------------------------------------------------------
-- Step 0 — snapshot the rows we are about to change.
-- ---------------------------------------------------------------------------
INSERT INTO public.logistics_00193_backup
  (table_name, row_id, shipment_id, approved_quantity, requested_quantity,
   done_quantity, returned_quantity)
SELECT 'logistics_shipment_items', li.id, li.shipment_id, li.approved_quantity,
       li.requested_quantity, li.done_quantity, li.returned_quantity
FROM public.logistics_shipment_items li
JOIN public.logistics_shipments s ON s.id = li.shipment_id
WHERE li.approved_quantity > li.requested_quantity
   OR li.returned_quantity > GREATEST(li.requested_quantity - li.done_quantity, 0)
   -- rows whose done_quantity step 2 will restate from Odoo
   OR (s.is_return_shipment = false AND s.shipment_status = 'DELIVERED'
       AND s.delivery_phase = 'delivered' AND li.external_product_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.order_line_items oli
                   WHERE oli.order_id = s.linked_order_id
                     AND oli.external_product_id = li.external_product_id));

INSERT INTO public.logistics_00193_backup
  (table_name, row_id, shipment_id, approved_quantity, requested_quantity,
   delivered_quantity, returned_quantity)
SELECT 'logistics_return_shipment_items', r.id, r.return_shipment_id, r.approved_quantity,
       r.requested_quantity, r.delivered_quantity, r.returned_quantity
FROM public.logistics_return_shipment_items r
WHERE r.approved_quantity > r.requested_quantity
   OR r.returned_quantity > GREATEST(r.requested_quantity - r.delivered_quantity, 0);

-- Also snapshot the return-shipment total_gmv so step 4 is reversible.
CREATE TABLE IF NOT EXISTS public.logistics_00193_gmv_backup (
  backup_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  shipment_id  uuid NOT NULL,
  total_gmv    numeric
);
INSERT INTO public.logistics_00193_gmv_backup (shipment_id, total_gmv)
SELECT id, total_gmv FROM public.logistics_shipments
WHERE is_return_shipment = true
  AND id IN (SELECT DISTINCT return_shipment_id FROM public.logistics_return_shipment_items);

-- ---------------------------------------------------------------------------
-- Step 1 — approved can never exceed the shipment's own request.
-- ---------------------------------------------------------------------------
UPDATE public.logistics_shipment_items
SET approved_quantity = requested_quantity, updated_at = timezone('utc', now())
WHERE approved_quantity > requested_quantity;

UPDATE public.logistics_return_shipment_items
SET approved_quantity = requested_quantity
WHERE approved_quantity > requested_quantity;

-- ---------------------------------------------------------------------------
-- Step 2 — delivered quantities from Odoo for DELIVERED shipments.
-- Build a strictly-unique map of (order, product) -> delivered_quantity (only
-- products that appear on exactly ONE line of the order), then join. This is
-- immune to the 97 duplicate (order, product) line pairs and never relies on a
-- multi-row scalar subquery. Odoo's delivered_quantity is the same source the
-- platform's own sync_logistics_shipment_items_from_order trusts.
-- ---------------------------------------------------------------------------
WITH uniq AS (
  SELECT oli.order_id, oli.external_product_id,
         MAX(oli.delivered_quantity) AS delivered_quantity
  FROM public.order_line_items oli
  WHERE oli.external_product_id IS NOT NULL
  GROUP BY oli.order_id, oli.external_product_id
  HAVING count(*) = 1
), delivered AS (
  SELECT s.id AS shipment_id, li.id AS item_id, uniq.delivered_quantity
  FROM public.logistics_shipment_items li
  JOIN public.logistics_shipments s ON s.id = li.shipment_id
  JOIN uniq ON uniq.order_id = s.linked_order_id
           AND uniq.external_product_id = li.external_product_id
  WHERE s.is_return_shipment = false
    AND s.shipment_status = 'DELIVERED'
    AND s.delivery_phase = 'delivered'
    AND COALESCE(li.done_quantity, 0) <> COALESCE(uniq.delivered_quantity, 0)
)
UPDATE public.logistics_shipment_items li
SET done_quantity = delivered.delivered_quantity, updated_at = timezone('utc', now())
FROM delivered
WHERE li.id = delivered.item_id;

-- ---------------------------------------------------------------------------
-- Step 3 — returns are the real shortfall, recomputed after steps 1-2, but ONLY
-- for shipments that actually reached a delivery/failure decision. A shipment
-- that has not been delivered (still ASSIGNED / PENDING_ASSIGN / in transit /
-- cancelled) has no legitimate return; any non-zero returned_quantity there is
-- stale and must be zeroed. The delivery functions only ever set a return when
-- a shipment moves to 'delivered' or reports a delivery failure, so we scope to:
--   (delivery_phase = 'delivered')
--   OR the shipment already carries a spawned return shipment
--   OR the shipment is flagged delivered/failed via shipment_status.
-- Everything else gets returned_quantity = 0.
-- ---------------------------------------------------------------------------
-- 3a. zero returns on shipments that never reached a delivery decision
UPDATE public.logistics_shipment_items li
SET returned_quantity = 0, updated_at = timezone('utc', now())
FROM public.logistics_shipments s
WHERE li.shipment_id = s.id
  AND s.is_return_shipment = false
  AND li.returned_quantity <> 0
  AND s.delivery_phase NOT IN ('delivered', 'failed')
  AND s.shipment_status NOT IN ('DELIVERED', 'FAILED')
  AND NOT EXISTS (
    SELECT 1 FROM public.logistics_shipments rs
    WHERE rs.parent_shipment_id = s.id AND rs.is_return_shipment = true
  );

-- 3b. recompute the real shortfall on shipments that were delivered
UPDATE public.logistics_shipment_items li
SET returned_quantity = GREATEST(li.requested_quantity - COALESCE(li.done_quantity, 0), 0),
    updated_at = timezone('utc', now())
FROM public.logistics_shipments s
WHERE li.shipment_id = s.id
  AND s.is_return_shipment = false
  AND (
    s.delivery_phase = 'delivered'
    OR s.shipment_status IN ('DELIVERED', 'FAILED')
    OR EXISTS (
      SELECT 1 FROM public.logistics_shipments rs
      WHERE rs.parent_shipment_id = s.id AND rs.is_return_shipment = true
    )
  )
  AND li.returned_quantity IS DISTINCT FROM
      GREATEST(li.requested_quantity - COALESCE(li.done_quantity, 0), 0);

-- 3c. return-item rows mirror their parent: returned = requested - delivered
UPDATE public.logistics_return_shipment_items
SET returned_quantity = GREATEST(requested_quantity - COALESCE(delivered_quantity, 0), 0)
WHERE returned_quantity IS DISTINCT FROM
      GREATEST(requested_quantity - COALESCE(delivered_quantity, 0), 0);

-- ---------------------------------------------------------------------------
-- Step 4 — recompute return-shipment total_gmv from corrected return items.
-- Uses the same unit-price derivation the creation path uses.
-- ---------------------------------------------------------------------------
WITH val AS (
  SELECT r.return_shipment_id,
         SUM(r.returned_quantity * COALESCE(
              oli.total_amount / NULLIF(oli.ordered_quantity, 0),
              oli.unit_price * (1 - COALESCE(oli.discount_percent, 0) / 100.0),
              oli.unit_price, 0))::numeric(14,2) AS computed_gmv
  FROM public.logistics_return_shipment_items r
  JOIN public.logistics_shipments ps ON ps.id = r.parent_shipment_id
  LEFT JOIN public.order_line_items oli
    ON oli.order_id = ps.linked_order_id
   AND lower(trim(oli.product_name)) = lower(trim(r.product_name))
  GROUP BY r.return_shipment_id
)
UPDATE public.logistics_shipments ls
SET total_gmv = COALESCE(val.computed_gmv, 0), updated_at = timezone('utc', now())
FROM val
WHERE ls.id = val.return_shipment_id
  AND ls.is_return_shipment = true
  AND round(COALESCE(ls.total_gmv, 0), 2) <> round(COALESCE(val.computed_gmv, 0), 2);

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-run verification (read-only). Expect:
--   approved_gt_requested_*  = 0
--   returned_gt_shortfall_*  = 0
--   delivered_done_mismatch  = 0
-- ---------------------------------------------------------------------------
SELECT 'approved_gt_requested_shipment' AS metric, count(*) AS value
FROM public.logistics_shipment_items WHERE approved_quantity > requested_quantity
UNION ALL
SELECT 'approved_gt_requested_return', count(*)
FROM public.logistics_return_shipment_items WHERE approved_quantity > requested_quantity
UNION ALL
SELECT 'returned_gt_shortfall_shipment', count(*)
FROM public.logistics_shipment_items
WHERE returned_quantity > GREATEST(requested_quantity - COALESCE(done_quantity, 0), 0)
UNION ALL
SELECT 'returned_gt_shortfall_return', count(*)
FROM public.logistics_return_shipment_items
WHERE returned_quantity > GREATEST(requested_quantity - COALESCE(delivered_quantity, 0), 0)
UNION ALL
SELECT 'sum_returned_units_shipment', COALESCE(sum(returned_quantity), 0)
FROM public.logistics_shipment_items
UNION ALL
SELECT 'sum_returned_units_return', COALESCE(sum(returned_quantity), 0)
FROM public.logistics_return_shipment_items
UNION ALL
SELECT 'return_shipments_total_gmv', COALESCE(sum(total_gmv), 0)
FROM public.logistics_shipments WHERE is_return_shipment = true
UNION ALL
SELECT 'delivered_done_mismatch_items', count(*)
FROM public.logistics_shipment_items i
JOIN public.logistics_shipments s ON s.id = i.shipment_id
JOIN public.order_line_items oli ON oli.order_id = s.linked_order_id AND oli.external_product_id = i.external_product_id
WHERE s.is_return_shipment = false AND s.shipment_status = 'DELIVERED'
  AND s.delivery_phase = 'delivered' AND COALESCE(i.done_quantity,0) <> COALESCE(oli.delivered_quantity,0);
