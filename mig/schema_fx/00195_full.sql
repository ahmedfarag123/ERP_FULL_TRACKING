-- =============================================================================
-- 00195 / function: driver_submit_order_collections
-- =============================================================================
-- Why this rewrite exists
-- ----------------------
-- The function only understood CASH. Everything else was written as if nothing
-- had been collected:
--
--   collected_amount            = v_cash_total            -> 0 for a bank transfer
--   collection_status           = 'exempt'                -> says "not collected"
--   shipment payment_method     = CASE cash>0 THEN 'cash' ELSE 'credit' END
--                                                            -> a bank transfer was
--                                                               stored as "credit" (آجل)
--   collected_successfully_amount                            -> never written at all
--   pending_delivery_amount      = order total             -> stayed "due" forever
--   sales_rep_id / collected_by_profile_id / *_at           -> never written
--   plan_collection_checks.sales_rep_id                     -> came from a frontend
--                                                               field that was never
--                                                               populated -> always NULL
--   delivered_invoice_amount     = sum(done x price)       -> GROSS, so collecting a
--                                                               shipment silently undid
--                                                               the net-of-returns rule
--                                                               from migration 00194
--
-- The single invariant this function now obeys:
--   A recorded return is REAL. The customer is invoiced for what they actually
--   received (delivered, minus returns, capped at the order request), and that
--   same figure is what the collection is measured against. A return is
--   therefore deducted exactly ONCE - never twice, never zero times.
--
-- Money split (mirrored by the reporting consumers):
--   cash                          -> collected_from_customer, driver_debt = cash
--   bank_transfer / cheque        -> collected_successfully,  driver_debt = 0
--   credit                        -> pending_delivery_amount, nothing collected
--   mixed                         -> cash stays outstanding, transfer counts as collected
-- Consumers rely on: outstanding = max(pending_delivery_amount
--                                       - collected_successfully_amount, 0)
-- so pending_delivery_amount keeps the full billable value and never drops to 0.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.driver_submit_order_collections(
  p_shipment_id uuid,
  p_order_collections jsonb,
  p_check_status text DEFAULT NULL::text,
  p_proof_photo_url text DEFAULT NULL::text,
  p_check_sales_rep_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_shipment public.logistics_shipments%rowtype;
  v_order jsonb;
  v_leg jsonb;
  v_order_total numeric(14,2);
  v_cash_total numeric(14,2) := 0;
  v_leg_amount numeric(14,2);
  v_sales_rep_id uuid;
  v_transfer_responsible_name text;
  v_payment_method text;
  v_delivered_total numeric(14,2) := 0;
  v_primary_method text;
  v_has_cash boolean := false;
  v_has_done_quantities boolean := false;
  v_check_status text;
  v_proof_photo_url text;
  v_check_sales_rep_id uuid;
  v_first_driver_notes text := null;
  -- per-order accumulators (reset for every order)
  v_order_collected numeric(14,2) := 0;   -- cash + cheque + bank_transfer
  v_order_credit    numeric(14,2) := 0;   -- deferred (آجل)
  v_order_installments integer := NULL;
  v_order_cheque_ref text := NULL;
  -- shipment-level accumulators
  v_ship_collected numeric(14,2) := 0;
  v_ship_credit    numeric(14,2) := 0;
  v_ship_transfer  numeric(14,2) := 0;    -- cheque + bank_transfer
  v_ship_billable  numeric(14,2) := 0;
  v_ship_sales_rep_id uuid := NULL;
  v_ship_rep_fullname text := NULL;
  v_ship_responsible text := NULL;
  v_ship_cheque_ref text := NULL;
  v_ship_installments integer := NULL;
  v_collector_name text;
BEGIN
  SELECT * INTO v_shipment
  FROM public.logistics_shipments
  WHERE id::text = p_shipment_id::text
  FOR UPDATE;

  IF v_shipment.id IS NULL OR v_shipment.assigned_profile_id::text <> auth.uid()::text THEN
    RAISE EXCEPTION 'Shipment not found or not authorized.';
  END IF;

  IF jsonb_typeof(coalesce(p_order_collections, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(coalesce(p_order_collections, '[]'::jsonb)) = 0
  THEN
    RAISE EXCEPTION 'At least one order collection is required.';
  END IF;

  -- Check if any item has done_quantity > 0 (POD was performed)
  SELECT EXISTS (
    SELECT 1 FROM public.logistics_shipment_items li
    WHERE li.shipment_id = p_shipment_id AND coalesce(li.done_quantity, 0) > 0
  ) INTO v_has_done_quantities;

  -- ---------------------------------------------------------------------------
  -- Billable value = what the customer actually received.
  -- Identical to migration 00194 and to logistics_shipment_detail (itv2), so the
  -- stored invoice, the shipment page and the accounting journal can never drift
  -- apart, and a return is deducted exactly once.
  -- ---------------------------------------------------------------------------
  IF v_shipment.linked_order_id IS NOT NULL AND v_has_done_quantities THEN
    SELECT coalesce(round(sum(
               GREATEST(LEAST(coalesce(li.done_quantity, 0),
                              coalesce(li.requested_quantity, 0)
                              - coalesce(li.returned_quantity, 0)), 0)
               * coalesce(oli.total_amount / nullif(oli.ordered_quantity, 0),
                          oli.unit_price * (1 - coalesce(oli.discount_percent, 0) / 100.0),
                          0)
             ), 2), 0)
    INTO v_delivered_total
    FROM public.logistics_shipment_items li
    LEFT JOIN LATERAL (
      SELECT o.total_amount, o.ordered_quantity, o.unit_price, o.discount_percent
      FROM public.order_line_items o
      WHERE o.order_id = v_shipment.linked_order_id
        AND COALESCE(NULLIF(btrim(o.external_product_id), ''), lower(btrim(o.product_name)))
          = COALESCE(NULLIF(btrim(li.external_product_id), ''), lower(btrim(li.product_name)))
      ORDER BY coalesce(o.last_sync_at, o.updated_at) DESC NULLS LAST
      LIMIT 1
    ) oli ON true
    WHERE li.shipment_id = p_shipment_id;
  END IF;

  SELECT full_name INTO v_collector_name FROM public.profiles WHERE id = auth.uid();

  FOR v_order IN SELECT * FROM jsonb_array_elements(p_order_collections)
  LOOP
    v_order_total := coalesce((v_order->>'orderTotal')::numeric, 0);

    -- Override with delivered total when POD was performed for this order
    IF v_delivered_total > 0 AND v_shipment.linked_order_id IS NOT NULL
       AND (v_order->>'orderId')::text = v_shipment.linked_order_id::text
    THEN
      v_order_total := v_delivered_total;
    END IF;

    v_primary_method := 'credit';
    v_has_cash := false;
    v_cash_total := 0;
    v_order_collected := 0;
    v_order_credit := 0;
    v_order_installments := NULL;
    v_order_cheque_ref := NULL;

    -- Capture driver notes from first order for collection check
    IF v_first_driver_notes IS NULL THEN
      v_first_driver_notes := nullif(v_order->>'driverNotes', '');
    END IF;

    -- Delete existing payment legs for this order
    DELETE FROM public.logistics_order_collection_payment_legs
    WHERE shipment_id = p_shipment_id::text
      AND order_id = (v_order->>'orderId')::text;

    -- Insert new payment legs
    IF jsonb_typeof(coalesce(v_order->'payments', '[]'::jsonb)) = 'array'
       AND jsonb_array_length(coalesce(v_order->'payments', '[]'::jsonb)) > 0
    THEN
      FOR v_leg IN SELECT * FROM jsonb_array_elements(v_order->'payments')
      LOOP
        v_payment_method := lower(trim(coalesce(v_leg->>'method', '')));
        IF v_payment_method = 'transfer' THEN v_payment_method := 'bank_transfer';
        ELSIF v_payment_method = 'installments' THEN v_payment_method := 'credit';
        END IF;

        IF v_payment_method NOT IN ('cash', 'credit', 'cheque', 'bank_transfer') THEN
          RAISE EXCEPTION 'Unsupported payment method: %.', v_payment_method;
        END IF;

        v_leg_amount := coalesce((v_leg->>'amount')::numeric, 0);
        v_sales_rep_id := nullif(v_leg->>'salesRepId', '')::uuid;
        v_transfer_responsible_name := coalesce(
          nullif(v_leg->>'salesRepName', ''),
          nullif(v_order->>'orderCreateUid', '')
        );

        IF v_leg_amount > 0 THEN
          INSERT INTO public.logistics_order_collection_payment_legs (
            shipment_id, order_id, payment_method, amount,
            sales_rep_id, transfer_responsible_name, cheque_reference, installment_count
          ) VALUES (
            p_shipment_id::text, (v_order->>'orderId')::text, v_payment_method, v_leg_amount,
            v_sales_rep_id, v_transfer_responsible_name,
            nullif(v_leg->>'chequeReference', ''),
            nullif(v_leg->>'installmentCount', '')::integer
          );

          IF v_payment_method = 'cash' THEN
            v_cash_total := v_cash_total + v_leg_amount;
            v_has_cash := true;
            v_order_collected := v_order_collected + v_leg_amount;
          ELSIF v_payment_method = 'credit' THEN
            v_order_credit := v_order_credit + v_leg_amount;
          ELSE  -- cheque, bank_transfer
            v_order_collected := v_order_collected + v_leg_amount;
            v_ship_transfer := v_ship_transfer + v_leg_amount;
          END IF;

          IF v_payment_method = 'cheque' AND v_order_cheque_ref IS NULL THEN
            v_order_cheque_ref := nullif(v_leg->>'chequeReference', '');
          END IF;
          IF nullif(v_leg->>'installmentCount', '')::integer IS NOT NULL THEN
            v_order_installments := coalesce(v_order_installments, 0)
                                    + nullif(v_leg->>'installmentCount', '')::integer;
          END IF;

          IF v_leg_amount > 0 THEN
            v_primary_method := v_payment_method;
          END IF;
        END IF;
      END LOOP;
    ELSE
      -- Legacy single-payment fallback
      v_payment_method := lower(trim(coalesce(v_order->>'paymentMethod', '')));
      IF v_payment_method = 'transfer' THEN v_payment_method := 'bank_transfer';
      ELSIF v_payment_method = 'installments' THEN v_payment_method := 'credit';
      END IF;

      IF v_payment_method NOT IN ('cash', 'credit', 'cheque', 'bank_transfer') THEN
        RAISE EXCEPTION 'Unsupported payment method: %.', v_payment_method;
      END IF;

      v_sales_rep_id := nullif(v_order->>'salesRepId', '')::uuid;
      v_transfer_responsible_name := coalesce(
        nullif(v_order->>'salesRepName', ''),
        nullif(v_order->>'orderCreateUid', '')
      );

      INSERT INTO public.logistics_order_collection_payment_legs (
        shipment_id, order_id, payment_method, amount,
        sales_rep_id, transfer_responsible_name, cheque_reference
      ) VALUES (
        p_shipment_id::text, (v_order->>'orderId')::text, v_payment_method, v_order_total,
        v_sales_rep_id, v_transfer_responsible_name,
        nullif(v_order->>'chequeReference', '')
      );

      IF v_payment_method = 'cash' THEN
        v_cash_total := v_cash_total + v_order_total;
        v_has_cash := true;
        v_order_collected := v_order_collected + v_order_total;
      ELSIF v_payment_method = 'credit' THEN
        v_order_credit := v_order_credit + v_order_total;
      ELSE
        v_order_collected := v_order_collected + v_order_total;
        v_ship_transfer := v_ship_transfer + v_order_total;
        IF v_payment_method = 'cheque' THEN
          v_order_cheque_ref := nullif(v_order->>'chequeReference', '');
        END IF;
      END IF;

      v_primary_method := v_payment_method;
    END IF;

    v_order_cheque_ref := coalesce(v_order_cheque_ref, nullif(v_order->>'chequeReference', ''));

    -- The rep that answers for this order: the bank transfer leg wins, otherwise
    -- the first leg that carries one. Read back from the legs we just wrote so it
    -- is exactly what the constraint is validated against.
    v_sales_rep_id := NULL;
    v_transfer_responsible_name := NULL;
    SELECT l.sales_rep_id, l.transfer_responsible_name
    INTO v_sales_rep_id, v_transfer_responsible_name
    FROM public.logistics_order_collection_payment_legs l
    WHERE l.shipment_id = p_shipment_id::text
      AND l.order_id = (v_order->>'orderId')::text
      AND l.sales_rep_id IS NOT NULL
    ORDER BY (l.payment_method = 'bank_transfer') DESC NULLS LAST
    LIMIT 1;

    v_ship_collected := v_ship_collected + v_order_collected;
    v_ship_credit    := v_ship_credit + v_order_credit;
    v_ship_billable  := v_ship_billable + v_order_total;

    -- cash_debt_check pins these two together: on a cash order the debt MUST
    -- equal what was collected, and on any other method the debt MUST be 0. A
    -- split payment (cash part + transfer part) therefore keeps the order row on
    -- its cash leg; the full split is carried by the legs and the shipment row.
    INSERT INTO public.logistics_order_collections (
      shipment_id, order_id, order_number, order_total, payment_method,
      collected_amount, driver_debt_amount, sales_rep_id,
      transfer_responsible_name, cheque_reference, installment_count,
      collection_status, accounting_status, driver_notes, collected_at
    ) VALUES (
      p_shipment_id::text, (v_order->>'orderId')::text,
      nullif(v_order->>'orderNumber', ''), v_order_total, v_primary_method,
      CASE WHEN v_primary_method = 'cash' THEN v_cash_total ELSE v_order_collected END,
      CASE WHEN v_primary_method = 'cash' THEN v_cash_total ELSE 0 END,
      v_sales_rep_id,
      v_transfer_responsible_name, v_order_cheque_ref, v_order_installments,
      CASE WHEN v_order_collected > 0 THEN 'collected' ELSE 'pending' END,
      'pending_accounting_review',
      nullif(v_order->>'driverNotes', ''), timezone('utc', now())
    )
    ON CONFLICT (shipment_id, order_id) DO UPDATE SET
      order_number = excluded.order_number,
      order_total = excluded.order_total,
      payment_method = excluded.payment_method,
      collected_amount = excluded.collected_amount,
      driver_debt_amount = excluded.driver_debt_amount,
      sales_rep_id = excluded.sales_rep_id,
      transfer_responsible_name = excluded.transfer_responsible_name,
      cheque_reference = excluded.cheque_reference,
      installment_count = excluded.installment_count,
      collection_status = excluded.collection_status,
      accounting_status = excluded.accounting_status,
      driver_notes = excluded.driver_notes,
      collected_at = excluded.collected_at,
      updated_at = timezone('utc', now());
  END LOOP;

  -- Persist delivered_invoice_amount on shipment (for downstream consumers).
  -- v_delivered_total is already net of recorded returns.
  IF v_has_done_quantities AND v_delivered_total > 0 THEN
    UPDATE public.logistics_shipments
    SET delivered_invoice_amount = v_delivered_total,
        updated_at = timezone('utc', now())
    WHERE id = p_shipment_id;
  END IF;

  -- Shipment-level attribution, read back from the payment legs (the source of
  -- truth) instead of from whichever loop variable happened to be last: the
  -- bank transfer rep wins, otherwise the first rep that appears.
  SELECT l.sales_rep_id, l.transfer_responsible_name
  INTO v_ship_sales_rep_id, v_ship_responsible
  FROM public.logistics_order_collection_payment_legs l
  WHERE l.shipment_id = p_shipment_id::text
    AND l.sales_rep_id IS NOT NULL
  ORDER BY (l.payment_method = 'bank_transfer') DESC NULLS LAST,
           l.payment_method, l.order_id
  LIMIT 1;

  IF v_ship_sales_rep_id IS NOT NULL THEN
    SELECT full_name INTO v_ship_rep_fullname
    FROM public.profiles WHERE id = v_ship_sales_rep_id;
  END IF;

  SELECT l.cheque_reference INTO v_ship_cheque_ref
  FROM public.logistics_order_collection_payment_legs l
  WHERE l.shipment_id = p_shipment_id::text
    AND l.cheque_reference IS NOT NULL
  ORDER BY l.created_at
  LIMIT 1;

  SELECT max(l.installment_count) INTO v_ship_installments
  FROM public.logistics_order_collection_payment_legs l
  WHERE l.shipment_id = p_shipment_id::text;

  -- Update shipment-level collection summary.
  -- pending_delivery_amount stays the FULL billable value on purpose: every
  -- report derives the outstanding amount as
  --   max(pending_delivery_amount - collected_successfully_amount, 0)
  -- so it must be the total, not the remainder.
  INSERT INTO public.logistics_shipment_collections (
    shipment_id, pending_delivery_amount, collected_from_customer,
    collected_successfully_amount, driver_debt_amount, payment_method,
    collection_status, accounting_status, collected_by_profile_id,
    collected_by_profile_id_full_name, sales_rep_id, sales_rep_id_full_name,
    transfer_responsible_name, cheque_reference, installment_count,
    collected_from_customer_at, payment_collected_at
  ) VALUES (
    p_shipment_id,
    coalesce(nullif(v_delivered_total, 0), v_ship_billable),
    v_cash_total,
    v_ship_transfer,
    v_cash_total,
    v_primary_method,
    CASE WHEN v_cash_total > 0 THEN 'collected_from_customer'
         WHEN v_ship_transfer > 0 THEN 'collected_successfully'
         ELSE 'pending_delivery_amount' END,
    'pending_accounting_review',
    auth.uid(), v_collector_name,
    v_ship_sales_rep_id, v_ship_rep_fullname,
    v_ship_responsible, v_ship_cheque_ref, v_ship_installments,
    CASE WHEN v_cash_total > 0 THEN timezone('utc', now()) ELSE null END,
    CASE WHEN v_ship_collected > 0 THEN timezone('utc', now()) ELSE null END
  )
  ON CONFLICT (shipment_id) DO UPDATE SET
    pending_delivery_amount = excluded.pending_delivery_amount,
    collected_from_customer = excluded.collected_from_customer,
    collected_successfully_amount = excluded.collected_successfully_amount,
    driver_debt_amount = excluded.driver_debt_amount,
    payment_method = excluded.payment_method,
    collection_status = excluded.collection_status,
    accounting_status = excluded.accounting_status,
    collected_by_profile_id = excluded.collected_by_profile_id,
    collected_by_profile_id_full_name = excluded.collected_by_profile_id_full_name,
    sales_rep_id = excluded.sales_rep_id,
    sales_rep_id_full_name = excluded.sales_rep_id_full_name,
    transfer_responsible_name = excluded.transfer_responsible_name,
    cheque_reference = excluded.cheque_reference,
    installment_count = excluded.installment_count,
    collected_from_customer_at = CASE
      WHEN excluded.driver_debt_amount > 0
        THEN coalesce(public.logistics_shipment_collections.collected_from_customer_at,
                      excluded.collected_from_customer_at)
      ELSE public.logistics_shipment_collections.collected_from_customer_at
    END,
    payment_collected_at = CASE
      WHEN excluded.collected_successfully_amount > 0
        THEN coalesce(public.logistics_shipment_collections.payment_collected_at,
                      excluded.payment_collected_at)
      ELSE public.logistics_shipment_collections.payment_collected_at
    END,
    updated_at = timezone('utc', now());

  -- Write collection check (unified flow: collected only; not_collected goes via driver_submit_collection_check)
  v_check_status := nullif(trim(lower(p_check_status)), '');
  v_proof_photo_url := nullif(p_proof_photo_url, '');
  v_check_sales_rep_id := nullif(p_check_sales_rep_id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_check_status IS NOT NULL AND v_check_status = 'collected' THEN
    INSERT INTO public.driver_plan_collection_checks (
      shipment_id, driver_profile_id, plan_id,
      check_status, payment_method, reason, driver_notes,
      proof_photo_url, sales_rep_id
    ) VALUES (
      p_shipment_id::text, auth.uid(), v_shipment.plan_id,
      v_check_status, v_primary_method, null,
      v_first_driver_notes, v_proof_photo_url,
      coalesce(v_check_sales_rep_id, v_ship_sales_rep_id)
    )
    ON CONFLICT (shipment_id) DO UPDATE SET
      driver_profile_id = excluded.driver_profile_id,
      check_status    = excluded.check_status,
      payment_method  = excluded.payment_method,
      reason          = excluded.reason,
      driver_notes    = excluded.driver_notes,
      proof_photo_url = excluded.proof_photo_url,
      sales_rep_id    = excluded.sales_rep_id,
      review_status   = 'pending',
      reviewed_by_profile_id = null,
      admin_notes     = null,
      reviewed_at     = null,
      updated_at      = timezone('utc', now());
  END IF;

  -- Log event
  INSERT INTO public.logistics_shipment_events (
    shipment_id, actor_profile_id, previous_phase, next_phase, note, payload
  ) VALUES (
    p_shipment_id, auth.uid(), v_shipment.delivery_phase, 'collection_submitted',
    'Order collections submitted',
    jsonb_build_object(
      'order_count', jsonb_array_length(p_order_collections),
      'cash_total', v_cash_total,
      'collected_total', v_ship_collected,
      'credit_total', v_ship_credit,
      'transfer_total', v_ship_transfer,
      'delivered_total', v_delivered_total,
      'has_done_quantities', v_has_done_quantities,
      'cash_only_driver_debt', (v_cash_total > 0),
      'split_payments', jsonb_array_length(p_order_collections) > 0,
      'transfer_attribution_source',
        CASE WHEN v_ship_sales_rep_id IS NOT NULL THEN 'payment_legs.sales_rep_id'
             ELSE 'orders.create_uid' END
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_count', jsonb_array_length(p_order_collections),
    'cash_total', v_cash_total,
    'collected_total', v_ship_collected,
    'credit_total', v_ship_credit,
    'transfer_total', v_ship_transfer,
    'delivered_total', v_delivered_total,
    'has_done_quantities', v_has_done_quantities
  );
END;
$fn$;

-- =============================================================================
-- 00195 — repair the collection cycle that only ever understood cash
-- =============================================================================
-- Symptom
--   A shipment collected by bank transfer (or cheque, or a cash+transfer split)
--   reported itself as "credit / آجل / amount still due / nothing collected",
--   because driver_submit_order_collections wrote only its cash figures.
--   The stored invoice was also re-written GROSS, undoing the net-of-returns
--   rule from 00194.
--
-- Truth sources, in this order
--   1. logistics_order_collection_payment_legs — what was actually tendered.
--   2. logistics_shipment_events (next_phase='collection_submitted') — who
--      collected it and when.
--   3. logistics_order_collections.payment_method — already correct at order
--      level, so it is used to restore the shipment-level method.
--
-- Guarantees
--   * returns are deducted exactly once (invoice = delivered − returns, capped at
--     the order request) using the same expression as 00194 and as
--     logistics_shipment_detail, so invoice / page / journal cannot disagree;
--   * reporting math is preserved: reports derive the outstanding amount as
--     max(pending_delivery_amount − collected_successfully_amount, 0), so
--     pending_delivery_amount keeps the full billable value and is NOT zeroed;
--   * rows written by other flows (1,181 placeholder "pending_delivery_amount"
--     rows, admin confirmations) are never clobbered — this migration only
--     touches shipments that carry a real collection_submitted event;
--   * rows without payment legs carry no evidence and are left untouched.
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------ backups
CREATE TABLE IF NOT EXISTS public.logistics_00195_shipment_collections_backup AS
SELECT * FROM public.logistics_shipment_collections;

CREATE TABLE IF NOT EXISTS public.logistics_00195_order_collections_backup AS
SELECT * FROM public.logistics_order_collections;

CREATE TABLE IF NOT EXISTS public.logistics_00195_plan_checks_backup AS
SELECT * FROM public.driver_plan_collection_checks;

CREATE TABLE IF NOT EXISTS public.logistics_00195_ships_invoice_backup AS
SELECT id, delivered_invoice_amount FROM public.logistics_shipments;

-- ============================================================ 1) order level
-- collected_amount must be everything that left the customer, not just the cash
-- the driver happens to hold.
--
-- cash_debt_check pins the pair together: for a cash order
-- driver_debt_amount MUST equal collected_amount, and for any other method the
-- debt MUST be 0. A split payment (cash part + transfer part, 23 such orders)
-- therefore cannot raise collected_amount on a cash-method row without moving
-- the debt with it — the split itself lives in the legs and at shipment level.
WITH legsum AS (
  SELECT shipment_id, order_id,
         sum(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) AS cash_amt,
         sum(CASE WHEN payment_method <> 'credit' THEN amount ELSE 0 END) AS collected_amt,
         max(installment_count) AS installments,
         max(cheque_reference)   AS cheque_ref
  FROM public.logistics_order_collection_payment_legs
  GROUP BY shipment_id, order_id
)
UPDATE public.logistics_order_collections oc
SET collected_amount = CASE WHEN oc.payment_method = 'cash' THEN ls.cash_amt ELSE ls.collected_amt END,
    driver_debt_amount = CASE WHEN oc.payment_method = 'cash' THEN ls.cash_amt ELSE 0 END,
    -- 'exempt' claimed the order was never collectable; it was collected.
    collection_status = CASE WHEN ls.collected_amt > 0 THEN 'collected' ELSE 'pending' END,
    installment_count = coalesce(oc.installment_count, ls.installments),
    cheque_reference   = coalesce(oc.cheque_reference, ls.cheque_ref),
    updated_at = timezone('utc', now())
FROM legsum ls
WHERE ls.shipment_id = oc.shipment_id
  AND ls.order_id    = oc.order_id;

-- sales rep: the bank transfer leg is accountable, otherwise any leg with one.
WITH rep AS (
  SELECT DISTINCT ON (shipment_id, order_id) shipment_id, order_id, sales_rep_id,
         transfer_responsible_name
  FROM public.logistics_order_collection_payment_legs
  WHERE sales_rep_id IS NOT NULL
  ORDER BY shipment_id, order_id,
           (payment_method = 'bank_transfer') DESC NULLS LAST, payment_method
)
UPDATE public.logistics_order_collections oc
SET sales_rep_id = r.sales_rep_id,
    transfer_responsible_name = coalesce(oc.transfer_responsible_name, r.transfer_responsible_name),
    updated_at = timezone('utc', now())
FROM rep r
WHERE r.shipment_id = oc.shipment_id
  AND r.order_id    = oc.order_id
  AND oc.sales_rep_id IS NULL;

-- ============================================================ 2) shipment level
-- Only shipments that really were collected by a driver (event present) are
-- touched, so the placeholder rows and any other flow stay intact.
WITH legs AS (
  SELECT shipment_id,
         sum(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) AS cash_amt,
         sum(CASE WHEN payment_method IN ('cheque','bank_transfer') THEN amount ELSE 0 END) AS transfer_amt,
         sum(CASE WHEN payment_method <> 'credit' THEN amount ELSE 0 END) AS collected_amt,
         max(installment_count) AS installments,
         max(cheque_reference)   AS cheque_ref
  FROM public.logistics_order_collection_payment_legs
  GROUP BY shipment_id
), ev AS (
  SELECT DISTINCT ON (shipment_id) shipment_id, actor_profile_id, created_at
  FROM public.logistics_shipment_events
  WHERE next_phase = 'collection_submitted'
  ORDER BY shipment_id, created_at DESC
), rep AS (
  SELECT DISTINCT ON (shipment_id) shipment_id, sales_rep_id, transfer_responsible_name
  FROM public.logistics_order_collection_payment_legs
  WHERE sales_rep_id IS NOT NULL
  ORDER BY shipment_id, (payment_method = 'bank_transfer') DESC NULLS LAST, payment_method
), src AS (
  SELECT c.shipment_id,
         coalesce(l.cash_amt, 0)      AS cash_amt,
         coalesce(l.transfer_amt, 0) AS transfer_amt,
         coalesce(l.collected_amt, 0) AS collected_amt,
         l.installments, l.cheque_ref,
         e.actor_profile_id, e.created_at AS collected_at,
         r.sales_rep_id, r.transfer_responsible_name
  FROM public.logistics_shipment_collections c
  JOIN legs l ON l.shipment_id::text = c.shipment_id::text
  JOIN ev   e ON e.shipment_id::text = c.shipment_id::text
  LEFT JOIN rep r ON r.shipment_id::text = c.shipment_id::text
)
UPDATE public.logistics_shipment_collections c
SET collected_from_customer = s.cash_amt,
    collected_successfully_amount = s.transfer_amt,
    driver_debt_amount = CASE WHEN s.cash_amt > 0 THEN s.cash_amt ELSE 0 END,
    -- The old writer stored only the LAST order's total, so a multi-order
    -- shipment could end up with a billable amount below what was collected.
    -- Reports read the outstanding amount as (pending - collected_successfully),
    -- so the billable value is raised to at least what actually came in.
    pending_delivery_amount = greatest(c.pending_delivery_amount,
                                       s.cash_amt + s.transfer_amt),
    -- the method actually tendered, not the old cash/credit guess
    payment_method = coalesce((
      SELECT oc.payment_method FROM public.logistics_order_collections oc
      WHERE oc.shipment_id = c.shipment_id::text
      ORDER BY (oc.payment_method = 'bank_transfer') DESC NULLS LAST,
               oc.collected_at DESC NULLS LAST
      LIMIT 1), c.payment_method),
    collection_status = CASE WHEN s.cash_amt > 0 THEN 'collected_from_customer'
                             WHEN s.transfer_amt > 0 THEN 'collected_successfully'
                             ELSE 'pending_delivery_amount' END,
    collected_by_profile_id = coalesce(c.collected_by_profile_id, s.actor_profile_id),
    collected_from_customer_at = coalesce(c.collected_from_customer_at,
      CASE WHEN s.cash_amt > 0 THEN s.collected_at END),
    payment_collected_at = coalesce(c.payment_collected_at,
      CASE WHEN s.collected_amt > 0 THEN s.collected_at END),
    sales_rep_id = coalesce(c.sales_rep_id, s.sales_rep_id),
    transfer_responsible_name = coalesce(c.transfer_responsible_name, s.transfer_responsible_name),
    cheque_reference = coalesce(c.cheque_reference, s.cheque_ref),
    installment_count = coalesce(c.installment_count, s.installments),
    updated_at = timezone('utc', now())
FROM src s
WHERE s.shipment_id = c.shipment_id;

-- denormalised display names
UPDATE public.logistics_shipment_collections c
SET collected_by_profile_id_full_name = coalesce(c.collected_by_profile_id_full_name, p.full_name),
    updated_at = timezone('utc', now())
FROM public.profiles p
WHERE p.id = c.collected_by_profile_id
  AND c.collected_by_profile_id_full_name IS NULL;

UPDATE public.logistics_shipment_collections c
SET sales_rep_id_full_name = coalesce(c.sales_rep_id_full_name, p.full_name),
    updated_at = timezone('utc', now())
FROM public.profiles p
WHERE p.id = c.sales_rep_id
  AND c.sales_rep_id_full_name IS NULL;

-- ============================================================ 3) review check
UPDATE public.driver_plan_collection_checks k
SET sales_rep_id = r.sales_rep_id,
    updated_at = timezone('utc', now())
FROM (
  SELECT DISTINCT ON (shipment_id) shipment_id, sales_rep_id
  FROM public.logistics_order_collection_payment_legs
  WHERE sales_rep_id IS NOT NULL
  ORDER BY shipment_id, (payment_method = 'bank_transfer') DESC NULLS LAST, payment_method
) r
WHERE k.shipment_id = r.shipment_id
  AND k.sales_rep_id IS NULL;

-- denormalised rep name on the order row and the review check, so the shipment
-- page can name the accountable rep without a second lookup
UPDATE public.logistics_order_collections oc
SET sales_rep_id_full_name = coalesce(oc.sales_rep_id_full_name, p.full_name),
    updated_at = timezone('utc', now())
FROM public.profiles p
WHERE p.id = oc.sales_rep_id
  AND oc.sales_rep_id_full_name IS NULL;

UPDATE public.driver_plan_collection_checks k
SET sales_rep_id_full_name = coalesce(k.sales_rep_id_full_name, p.full_name),
    updated_at = timezone('utc', now())
FROM public.profiles p
WHERE p.id = k.sales_rep_id
  AND k.sales_rep_id_full_name IS NULL;

-- ============================================================ 4) invoice
-- Collected shipments had their invoice re-written as the GROSS delivered value
-- (sum of done x price), which silently undid 00194. Recompute the net figure
-- for exactly those shipments, using the same expression everywhere.
WITH px AS (
  SELECT li.shipment_id, li.id AS item_id,
         COALESCE(o.total_amount / nullif(o.ordered_quantity, 0),
                  o.unit_price * (1 - coalesce(o.discount_percent, 0) / 100.0),
                  0) AS price,
         GREATEST(LEAST(coalesce(li.done_quantity, 0),
                        coalesce(li.requested_quantity, 0)
                        - coalesce(li.returned_quantity, 0)), 0) AS del
  FROM public.logistics_shipment_items li
  JOIN public.logistics_shipments s ON s.id = li.shipment_id AND s.is_return_shipment = false
  LEFT JOIN LATERAL (
    SELECT x.total_amount, x.ordered_quantity, x.unit_price, x.discount_percent
    FROM public.order_line_items x
    WHERE x.order_id = s.linked_order_id
      AND COALESCE(NULLIF(btrim(x.external_product_id), ''), lower(btrim(x.product_name)))
        = COALESCE(NULLIF(btrim(li.external_product_id), ''), lower(btrim(li.product_name)))
    ORDER BY coalesce(x.last_sync_at, x.updated_at) DESC NULLS LAST
    LIMIT 1
  ) o ON true
), n AS (
  SELECT shipment_id, round(sum(del * price), 2) AS net
  FROM px GROUP BY shipment_id
)
UPDATE public.logistics_shipments s
SET delivered_invoice_amount = COALESCE(n.net, 0),
    updated_at = timezone('utc', now())
FROM n
WHERE n.shipment_id = s.id
  AND s.is_return_shipment = false
  AND EXISTS (SELECT 1 FROM public.logistics_shipment_collections c WHERE c.shipment_id = s.id)
  AND abs(coalesce(s.delivered_invoice_amount, 0) - coalesce(n.net, 0)) > 0.01;

COMMIT;
