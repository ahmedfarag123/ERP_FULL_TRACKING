-- 00192: shipment detail RPC — corrects the money on /logistics/shipments/:id.
--         Same shape as 00191 plus honest return arithmetic. Replaces 00191's function.
-- ---------------------------------------------------------------------------
-- WHAT 00191 GOT WRONG (found on shipment 47561638-d4f3-4645-82a9-1dc754537d5b):
--
--   price 12,240.00 / delivered 12,240.00 / returns 12,440.00 / NET -200.00
--
--   A fully delivered shipment (42 of 42 units) reported a NEGATIVE net. Two separate
--   arithmetic errors stacked:
--
--   (A) net_value = delivered_value - returns_value double-counted the shortfall.
--       returns_value was built from returned_quantity, but the units it counted were
--       never handed to the customer, so they are ALREADY absent from delivered_value.
--       Subtracting them removes value that was never added.
--
--   (B) returned_quantity itself is not a physical return. driver_report_delivery_failure
--       and driver_update_shipment_phase both compute
--           returned_quantity = approved_quantity - delivered_quantity
--       and approved_quantity is copied out of dispatcher_plan_item_preparations, which is
--       a PLAN-level row aggregated across every order in the plan (measured: 11 orders),
--       joined to one shipment by product name only. On the reference shipment the plan
--       approved 34 units of Heinz Mayonnaise while the order itself ordered 5, so
--       34 - 5 = 29 units were booked as "returned" (29 x 350 = 10,150 of the 12,440).
--       Measured across the table: 130 of 178 return rows exceed their own shortfall, and
--       returned_quantity > delivered_quantity in 112 rows, which is physically impossible.
--       received_quantity is 0 in all 178 rows (and no code ever writes it), confirming
--       nothing was ever brought back to the warehouse.
--
-- THE FIX (read-only — no base table is modified by this migration):
--   1. Each return is clamped to the shortfall of its own shipment item:
--          effective = LEAST(returned_quantity, GREATEST(requested - delivered, 0))
--      For the reference shipment this takes 29 -> 0, 1 -> 0, 2 -> 0, so returns go
--      12,440.00 -> 0.00 and the page shows the plain delivered figure.
--   2. net_value = delivered_value. The owed amount is what was delivered.
--   3. The removed amount is reported as phantom_value and the ordered-but-not-delivered
--      amount as unfulfilled_value (authoritative, from logistics_shipment_items), so the
--      page can explain the gap instead of hiding it.
--      Global effect across all shipments: returns 1,138,327.02 -> 223,849.12 EGP.
--
-- Scope: this function is called by src/lib/shipmentDetail.ts and by nothing else, so
-- the correction cannot move any other screen.
--
-- ---------------------------------------------------------------------------
-- (00191 header retained below for the original design rationale)
-- 00191: shipment detail RPC — full order price, per-line pricing, returns value,
--         collection (all three states), driver chain and salesperson, in ONE call.
-- ---------------------------------------------------------------------------
-- WHY THIS MIGRATION EXISTS (data-source gaps on /logistics/shipments/:id):
--
-- The admin detail page ran 5 separate PostgREST queries and read NO money except
-- logistics_shipments.total_gmv, which is populated on 3 of 6200 delivered shipments
-- (0.05%) -> the "قيمة GMV" tile always rendered '--'. Meanwhile the driver app
-- (driver_team/src/services/shipmentData.ts) already joins order_line_items for prices
-- and the order total for the collection amount. The admin page was blind to all of it.
--
-- MEASURED FACTS (each one drove a decision below; the numbers are live and drift):
--
-- 1) FULL ORDER PRICE = orders.total_amount, NOT amount_to_invoice.
--      total_amount      : 6390/6390 orders populated (100%)
--      amount_total      : 5944/6390 (93%), identical to total_amount in all 5944
--      amount_to_invoice : 121/6200 delivered shipments (1.9%)
--      amount_untaxed    : 93% (pre-tax, so not the headline)
--    The reference shipment proves the trap: total_amount = 3167.00 while
--    amount_to_invoice = 2852.00, and logistics_order_collections.order_total = 2852.00
--    -> order_total in the collection table is the INVOICED amount, NOT the full price.
--    So the headline is COALESCE(total_amount, amount_total) at 97.4% of delivered
--    shipments, and amount_to_invoice is exposed separately and only as a hint.
--
-- 2) ORDER RESOLUTION. odoo_order_name resolves 97% of delivered shipments;
--    linked_order_id only 63% (the driver app uses linked_order_id alone and therefore
--    loses ~37% of orders). Three sources are tried in priority order and the winning
--    source is reported back as order.match_source so the UI can be honest about it.
--
-- 3) PRICE JOIN + DUPLICATE GUARD. 74 orders carry duplicated order_line_items for the
--    same external_product_id (worst: 8 lines for one product) and 490 shipments are
--    affected (worst: 38 duplicated item rows). Joining without dedup multiplies item
--    rows and inflates every money total, so order lines are reduced with
--    DISTINCT ON (order_id, price_key) keeping the freshest row, exactly the same
--    precedence the driver app uses: external_product_id first, then a lower(trim())
--    product_name fallback, then unit_price := total_amount / ordered_quantity.
--    The number of dropped duplicate keys is reported as pricing.price_dupes.
--    2% of item rows find no price at all -> reported as pricing.unpriced_items, never
--    silently priced at 0.
--
-- 4) RETURNS COME FROM ITEM LEVEL, NOT is_return_shipment. Only 3 shipments are flagged
--    is_return_shipment (dedicated return shipments), but returned_quantity > 0 exists on
--    82 shipments / 172 lines — partial returns recorded on ordinary shipments. Filtering
--    on is_return_shipment would have shown 3 instead of 82, so the returns block is built
--    from logistics_return_shipment_items by parent_shipment_id (what the page already
--    used) and priced through the same order-line join.
--
-- 5) COLLECTION. logistics_shipment_collections is strictly 1:1 with a shipment
--    (UNIQUE on shipment_id, max 1 observed) and covers 1217 of 6202 delivered shipments
--    (19.6%). The three real states are kept under their own names:
--      pending_delivery_amount        -> المبلغ المستحق
--      collected_successfully_amount  -> تم تحصيله بنجاح
--      collected_from_customer        -> محصّل من العميل
--    driver_debt_amount > 0 with collected_successfully_amount = 0 means the money is
--    still with the driver (43 of the 44 such rows), which is surfaced as
--    collection.driver_holds_money so the UI can warn 'لم يسلم للمدير'.
--    logistics_order_collections (86 rows, 83 of which overlap) and its payment legs
--    (51 rows) are returned as a SECONDARY block, not merged, because order_total there
--    is the invoiced amount and must never be shown as the full order price.
--
-- 6) The whole finance module is EMPTY and is NOT invented here: finance_invoices (0),
--    finance_payments (0), finance_credit_notes (0), finance_driver_settlements (0),
--    logistics_collection_handovers (0), logistics_collection_requests (0),
--    logistics_route_settlements (0). The only live accounting is
--    finance_journal_entries (216) + finance_journal_lines (432, debit = credit =
--    5,879,323.55) where source_type 'delivery' points at ORDERS and 'reversal' points at
--    SHIPMENTS. 103 of 137 delivery entries equal orders.total_amount. The journal block is
--    therefore returned as supporting evidence only, never as the order price.
--
-- 7) DRIVER and SALESPERSON reuse the exact resolution chain fixed in 00190 (five driver
--    sources with placeholder filtering, and orders.user_id -> salespersons_odoo ->
--    customers.assigned_user_id_full_name), so the two pages cannot disagree.
--
-- SECURITY INVOKER on purpose: RLS stays in force on every table read here. A driver-role
-- account therefore only resolves a shipment it is allowed to see, exactly as the direct
-- PostgREST queries did. Nothing is widened.
--
-- TWO CRASHES FOUND WHILE VERIFYING, both fixed below and both worth remembering:
--   a) jsonb_array_elements on `driver.names` fails when the driver is unknown, because
--      to_jsonb(NULL) is the JSON literal null, not SQL NULL, so COALESCE(x,'[]') does
--      not fire. Consumers must test for JSON null explicitly.
--   b) logistics_order_collections is unique on (shipment_id, order_id), NOT on
--      shipment_id, so a shipment can own several rows (measured: be595fbb-... has 3).
--      Read as a scalar subquery the whole function raised "more than one row returned by
--      a subquery used as an expression" for that shipment. driver_plan_collection_checks
--      has no unique constraint at all, so it is guarded the same way even though it
--      happens to be clean today.

DROP FUNCTION IF EXISTS public.logistics_shipment_detail(uuid);
CREATE OR REPLACE FUNCTION public.logistics_shipment_detail(p_shipment_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $body$
WITH ship AS (
  SELECT s.* FROM logistics_shipments s WHERE s.id = p_shipment_id
),
-- 1) order resolution: odoo_order_name -> linked_order_id -> external_order_id
ord AS (
  SELECT x.* FROM ship s
  CROSS JOIN LATERAL (
    SELECT oo.id, oo.external_order_id, oo.odoo_order_name, oo.order_number,
           oo.customer_id, oo.customer_name,
           oo.total_amount, oo.amount_total, oo.amount_untaxed, oo.amount_undiscounted,
           oo.amount_to_invoice, oo.currency_code, oo.payment_method, oo.invoice_status,
           oo.state, oo.user_id, oo.assigned_user_id_full_name, oo.partner_id,
           oo.shipping_cost, oo.margin, oo.last_sync_at, oo.updated_at,
           'odoo_order_name'::text AS match_source, 1 AS pri
      FROM orders oo
     WHERE NULLIF(btrim(s.odoo_order_name),'') IS NOT NULL
       AND oo.odoo_order_name = btrim(s.odoo_order_name)
    UNION ALL
    SELECT oo.id, oo.external_order_id, oo.odoo_order_name, oo.order_number,
           oo.customer_id, oo.customer_name,
           oo.total_amount, oo.amount_total, oo.amount_untaxed, oo.amount_undiscounted,
           oo.amount_to_invoice, oo.currency_code, oo.payment_method, oo.invoice_status,
           oo.state, oo.user_id, oo.assigned_user_id_full_name, oo.partner_id,
           oo.shipping_cost, oo.margin, oo.last_sync_at, oo.updated_at,
           'linked_order_id'::text, 2
      FROM orders oo
     WHERE s.linked_order_id IS NOT NULL AND oo.id = s.linked_order_id
    UNION ALL
    SELECT oo.id, oo.external_order_id, oo.odoo_order_name, oo.order_number,
           oo.customer_id, oo.customer_name,
           oo.total_amount, oo.amount_total, oo.amount_untaxed, oo.amount_undiscounted,
           oo.amount_to_invoice, oo.currency_code, oo.payment_method, oo.invoice_status,
           oo.state, oo.user_id, oo.assigned_user_id_full_name, oo.partner_id,
           oo.shipping_cost, oo.margin, oo.last_sync_at, oo.updated_at,
           'external_order_id'::text, 3
      FROM orders oo
     WHERE NULLIF(btrim(s.external_order_id),'') IS NOT NULL
       AND oo.external_order_id = btrim(s.external_order_id)
  ) x
  ORDER BY x.pri, COALESCE(x.last_sync_at, x.updated_at) DESC NULLS LAST
  LIMIT 1
),
-- 2) salesperson: identical chain to 00190 so the two pages cannot disagree
sp AS (
  SELECT od.id AS order_id,
    CASE WHEN NULLIF(btrim(replace(od.user_id,'|',' ')),'') IS NULL
              THEN NULLIF(btrim(od.assigned_user_id_full_name),'')
         WHEN btrim(replace(od.user_id,'|',' ')) ~ '^\d+\s+\S'
              THEN NULLIF(btrim(regexp_replace(btrim(replace(od.user_id,'|',' ')), '^\d+\s+', '')), '')
         WHEN btrim(od.user_id) ~ '^\d+$' THEN spo.salesperson_name
         ELSE NULLIF(btrim(od.assigned_user_id_full_name),'')
    END AS salesperson
  FROM ord od
  LEFT JOIN (SELECT user_id, MAX(salesperson_name) AS salesperson_name
               FROM salespersons_odoo GROUP BY 1) spo
         ON od.user_id ~ '^\d+$' AND spo.user_id::text = btrim(od.user_id)
),
cust AS (
  SELECT c.id, c.customer_name, c.customer_email, c.phone_number, c.district, c.place,
    CASE WHEN NULLIF(btrim(c.governorate),'') IS NOT NULL
              AND lower(btrim(c.governorate)) <> 'false'
         THEN btrim(regexp_replace(
                regexp_replace(
                  regexp_replace(c.governorate, '^\s*[0-9]+\s*\|\s*', ''),
                  '^\s*\|\s*', ''),
                '\s*\(EG\)\s*$', ''))
    END AS governorate
  FROM ship s JOIN customers c ON c.id = s.customer_id
),
-- 3) driver chain: IDENTICAL to 00190 -- the same five scalar sources PLUS every
--    logistics_plan_assignees row, same precedence and the same placeholder filter.
--    Keeping the sixth source matters: on the reference shipment the plan assignee list
--    carries a co-driver (محمد عطية) that the five scalar sources do not, so dropping it
--    here would have made this page disagree with the OTIF page on the same shipment.
drv AS (
  SELECT s.id,
    (SELECT array_agg(z.v ORDER BY z.first_ord)
       FROM (SELECT x.v, min(x.ord) AS first_ord
               FROM unnest(ARRAY[
                      NULLIF(btrim(s.assigned_profile_id_full_name),''),
                      NULLIF(btrim(s.assigned_user_name),''),
                      NULLIF(btrim(p.assigned_profile_id_full_name),''),
                      NULLIF(btrim(plu.employee_name),''),
                      NULLIF(btrim(slu.employee_name),'')
                    ] || COALESCE(pa.assignee_names, ARRAY[]::text[])
                  ) WITH ORDINALITY AS x(v, ord)
              WHERE x.v IS NOT NULL
                AND lower(btrim(x.v)) NOT IN
                    ('driver','سائق','السائق','null','undefined','none','n/a','na','-','0','test')
              GROUP BY x.v) z
    ) AS driver_names,
    CASE WHEN NULLIF(btrim(s.assigned_profile_id_full_name),'') IS NOT NULL THEN 'ملف الشحنة'
         WHEN NULLIF(btrim(s.assigned_user_name),'')            IS NOT NULL THEN 'مستخدم الشحنة'
         WHEN NULLIF(btrim(p.assigned_profile_id_full_name),'')  IS NOT NULL THEN 'خطة التوصيل'
         WHEN NULLIF(btrim(plu.employee_name),'')               IS NOT NULL THEN 'مسؤول الخطة'
         WHEN NULLIF(btrim(slu.employee_name),'')               IS NOT NULL THEN 'سائق الشحنة'
    END AS driver_source
  FROM ship s
  LEFT JOIN logistics_delivery_plans p ON p.id = s.plan_id
  LEFT JOIN logistics_users plu          ON plu.id = p.logistics_user_id
  LEFT JOIN logistics_users slu          ON slu.id = s.logistics_user_id
  LEFT JOIN (
    SELECT plan_id, array_agg(DISTINCT btrim(display_name)) AS assignee_names
      FROM logistics_plan_assignees
     WHERE NULLIF(btrim(display_name),'') IS NOT NULL
     GROUP BY plan_id
  ) pa ON pa.plan_id = s.plan_id
),
-- 4) order lines reduced to one row per price_key (duplicate guard)
oli AS (
  SELECT DISTINCT ON (x.order_id, x.price_key)
         x.order_id, x.price_key, x.product_name, x.product_ref, x.ordered_quantity,
         x.unit_price, x.discount_percent, x.subtotal_amount, x.total_amount
  FROM (
    SELECT l.order_id, l.product_name, l.product_ref, l.ordered_quantity, l.unit_price,
           l.discount_percent, l.subtotal_amount, l.total_amount, l.last_sync_at, l.updated_at,
           COALESCE(NULLIF(btrim(l.external_product_id),''), lower(btrim(l.product_name))) AS price_key
      FROM order_line_items l
     WHERE l.order_id = (SELECT id FROM ord)
  ) x
  ORDER BY x.order_id, x.price_key, COALESCE(x.last_sync_at, x.updated_at) DESC NULLS LAST
),
dupes AS (
  SELECT count(*) AS n FROM (
    SELECT COALESCE(NULLIF(btrim(l.external_product_id),''), lower(btrim(l.product_name))) AS k
      FROM order_line_items l WHERE l.order_id = (SELECT id FROM ord)
     GROUP BY 1 HAVING count(*) > 1
  ) t
),
-- 5) shipment items + priced line values
itv AS (
  SELECT si.id, si.external_product_id, si.product_name, si.product_ref, si.product_id,
         si.source, si.move_state,
         si.requested_quantity, si.reserved_quantity, si.done_quantity,
         si.approved_quantity, si.forecast_quantity, si.returned_quantity,
         si.source_location_ref, si.destination_location_ref,
         ol.price_key IS NOT NULL AS priced,
         COALESCE(ol.unit_price,
                  CASE WHEN COALESCE(ol.ordered_quantity,0) > 0
                       THEN round(ol.total_amount / ol.ordered_quantity, 4) END) AS unit_price,
         ol.discount_percent,
         ol.ordered_quantity AS order_ordered_quantity,
         ol.total_amount      AS order_line_total
  FROM logistics_shipment_items si
  LEFT JOIN oli ol
         ON ol.order_id = (SELECT id FROM ord)
        AND ol.price_key = COALESCE(NULLIF(btrim(si.external_product_id),''),
                                    lower(btrim(si.product_name)))
  WHERE si.shipment_id = p_shipment_id
),
itv2 AS (
  SELECT i.*,
    round(i.unit_price * COALESCE(i.done_quantity,0)
          * (1 - COALESCE(i.discount_percent,0)/100.0), 2) AS delivered_value,
    -- Authoritative "ordered but never handed over" value for this item. This is the real
    -- shortfall and is the single source of truth for the unfulfilled figure; the
    -- return-row shortfall is shown alongside it only for reconciliation.
    round(i.unit_price * GREATEST(COALESCE(i.requested_quantity,0) - COALESCE(i.done_quantity,0), 0)
          * (1 - COALESCE(i.discount_percent,0)/100.0), 2) AS item_unfulfilled_value,
    round(i.unit_price * COALESCE(i.returned_quantity,0)
          * (1 - COALESCE(i.discount_percent,0)/100.0), 2) AS item_return_value
  FROM itv i
),
-- 6) returns, priced through the same order lines
ret AS (
  SELECT r.id, r.return_shipment_id, r.parent_shipment_id, r.parent_item_id,
         r.external_product_id, r.product_name, r.product_ref, r.product_id,
         r.requested_quantity, r.approved_quantity, r.delivered_quantity,
         r.returned_quantity, r.received_quantity, r.return_reason,
         (ol.price_key IS NOT NULL) AS priced,
         COALESCE(ol.unit_price,
                  CASE WHEN COALESCE(ol.ordered_quantity,0) > 0
                       THEN round(ol.total_amount / ol.ordered_quantity, 4) END) AS unit_price,
         ol.discount_percent
  FROM logistics_return_shipment_items r
  LEFT JOIN oli ol
         ON ol.order_id = (SELECT id FROM ord)
        AND ol.price_key = COALESCE(NULLIF(btrim(r.external_product_id),''),
                                    lower(btrim(r.product_name)))
  WHERE r.parent_shipment_id = p_shipment_id
),
-- 6b) EFFECTIVE RETURN QUANTITY. A physical return can never exceed what this shipment
--      was asked to deliver and failed to hand over. Measured, 130 of 178 return rows
--      violate that bound because driver_report_delivery_failure / driver_update_shipment_phase
--      set returned_quantity = approved_quantity - delivered_quantity, while approved_quantity
--      is copied from dispatcher_plan_item_preparations — a PLAN-level row aggregated over
--      every order in the plan (11 orders here), matched to a single shipment by product name
--      only. Example: plan approved 34 mayo vs this order's 5, so returned became 29.
--      Clamping to the per-shipment shortfall is the smallest correction that makes the
--      page arithmetically honest WITHOUT mutating any base table.
ret2 AS (
  SELECT r.*,
    LEAST(COALESCE(r.returned_quantity,0),
          GREATEST(COALESCE(r.requested_quantity,0) - COALESCE(r.delivered_quantity,0), 0))
      AS effective_returned_qty,
    round(r.unit_price
          * LEAST(COALESCE(r.returned_quantity,0),
                  GREATEST(COALESCE(r.requested_quantity,0) - COALESCE(r.delivered_quantity,0), 0))
          * (1 - COALESCE(r.discount_percent,0)/100.0), 2) AS return_value,
    round(r.unit_price
          * GREATEST(COALESCE(r.requested_quantity,0) - COALESCE(r.delivered_quantity,0), 0)
          * (1 - COALESCE(r.discount_percent,0)/100.0), 2) AS unfulfilled_value,
    round(r.unit_price
          * GREATEST(COALESCE(r.returned_quantity,0)
                     - GREATEST(COALESCE(r.requested_quantity,0) - COALESCE(r.delivered_quantity,0), 0), 0)
          * (1 - COALESCE(r.discount_percent,0)/100.0), 2) AS phantom_value,
    round(r.unit_price * COALESCE(r.received_quantity,0)
          * (1 - COALESCE(r.discount_percent,0)/100.0), 2) AS received_value
  FROM ret r
),
-- 5) collection blocks. These three tables are NOT all 1:1 and must never be read as
--    plain scalar subqueries:
--      logistics_shipment_collections   : UNIQUE on shipment_id (0 duplicates today)
--      logistics_order_collections      : UNIQUE on (shipment_id, order_id) ONLY, so one
--                                        shipment_id can carry several rows — measured:
--                                        shipment be595fbb-... has 3. Reading it without
--                                        LIMIT made this function raise
--                                        "more than one row returned by a subquery".
--      driver_plan_collection_checks    : no uniqueness at all (0 duplicates today).
--    Each is therefore picked deterministically: the order-collection row that belongs to
--    the resolved order wins, otherwise the most recent; checks take the latest review.
coll AS (
  SELECT * FROM logistics_shipment_collections WHERE shipment_id = p_shipment_id
  ORDER BY updated_at DESC NULLS LAST LIMIT 1
),
ocoll AS (
  SELECT *, count(*) OVER () AS sibling_rows FROM (
    SELECT * FROM logistics_order_collections WHERE shipment_id = p_shipment_id::text
  ) x
  ORDER BY (x.order_id = (SELECT id::text FROM ord)
            OR x.order_number = (SELECT odoo_order_name FROM ord)) DESC,
           COALESCE(x.collected_at, x.created_at) DESC NULLS LAST
  LIMIT 1
),
legs AS (
  SELECT * FROM logistics_order_collection_payment_legs WHERE shipment_id = p_shipment_id::text
),
pchk AS (
  SELECT * FROM driver_plan_collection_checks WHERE shipment_id = p_shipment_id::text
  ORDER BY COALESCE(reviewed_at, created_at) DESC NULLS LAST LIMIT 1
),
jent AS (
  SELECT e.id, e.entry_number, e.source_type, e.status, e.entry_date, e.description,
         e.posted_at,
         (SELECT sum(l.debit) FROM finance_journal_lines l WHERE l.journal_entry_id = e.id) AS posted_total
  FROM finance_journal_entries e
  WHERE (e.source_type = 'delivery' AND e.source_id = (SELECT id FROM ord))
     OR (e.source_type = 'reversal' AND e.source_id = p_shipment_id)
),
agg AS (
  SELECT
    count(*)                                              AS item_count,
    count(*) FILTER (WHERE priced)                        AS priced_count,
    count(*) FILTER (WHERE NOT priced)                    AS unpriced_count,
    COALESCE(sum(COALESCE(requested_quantity,0)),0)       AS requested_qty,
    COALESCE(sum(COALESCE(done_quantity,0)),0)            AS done_qty,
    COALESCE(sum(COALESCE(reserved_quantity,0)),0)        AS reserved_qty,
    COALESCE(sum(COALESCE(returned_quantity,0)),0)        AS returned_qty,
    COALESCE(sum(delivered_value),0)                      AS delivered_value,
    COALESCE(sum(item_unfulfilled_value),0)               AS unfulfilled_value,
    COALESCE(sum(item_return_value),0)                    AS item_return_value
  FROM itv2
),
ragg AS (
  SELECT count(*)                                    AS return_count,
         count(*) FILTER (WHERE priced)              AS return_priced_count,
         COALESCE(sum(COALESCE(returned_quantity,0)),0) AS returned_qty_raw,
         COALESCE(sum(COALESCE(effective_returned_qty,0)),0) AS returned_qty,
         COALESCE(sum(COALESCE(received_quantity,0)),0) AS received_qty,
         COALESCE(sum(return_value),0)                AS returns_value,
         COALESCE(sum(unfulfilled_value),0)           AS unfulfilled_value,
         COALESCE(sum(phantom_value),0)               AS phantom_value,
         COALESCE(sum(received_value),0)              AS received_value
  FROM ret2
)
SELECT jsonb_build_object(
  'shipment',  (SELECT to_jsonb(s) FROM ship s),
  'order',     (SELECT jsonb_build_object(
                  'id', o.id, 'external_order_id', o.external_order_id,
                  'odoo_order_name', o.odoo_order_name, 'order_number', o.order_number,
                  'customer_name', o.customer_name,
                  'match_source', o.match_source,
                  'full_order_price', COALESCE(o.total_amount, o.amount_total),
                  'total_amount', o.total_amount, 'amount_total', o.amount_total,
                  'amount_untaxed', o.amount_untaxed,
                  'amount_undiscounted', o.amount_undiscounted,
                  'amount_to_invoice', o.amount_to_invoice,
                  'currency_code', o.currency_code, 'payment_method', o.payment_method,
                  'invoice_status', o.invoice_status, 'state', o.state,
                  'shipping_cost', o.shipping_cost, 'margin', o.margin,
                  'salesperson', sp.salesperson)
                FROM ord o LEFT JOIN sp ON sp.order_id = o.id),
  'customer',  (SELECT to_jsonb(c) FROM cust c),
  'driver',    (SELECT jsonb_build_object(
                  'names', to_jsonb(d.driver_names),
                  'primary', d.driver_names[1],
                  'co_drivers', CASE WHEN cardinality(d.driver_names) > 1
                                     THEN to_jsonb(d.driver_names[2:cardinality(d.driver_names)])
                                     ELSE '[]'::jsonb END,
                  'co_driver_count', greatest(cardinality(d.driver_names) - 1, 0),
                  'source', d.driver_source)
                FROM drv d),
  'items',     (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'id', t.id, 'external_product_id', t.external_product_id,
                  'product_name', t.product_name, 'product_ref', t.product_ref,
                  'product_id', t.product_id, 'source', t.source, 'move_state', t.move_state,
                  'requested_quantity', t.requested_quantity,
                  'reserved_quantity', t.reserved_quantity,
                  'done_quantity', t.done_quantity,
                  'approved_quantity', t.approved_quantity,
                  'forecast_quantity', t.forecast_quantity,
                  'returned_quantity', t.returned_quantity,
                  'source_location_ref', t.source_location_ref,
                  'destination_location_ref', t.destination_location_ref,
                  'priced', t.priced, 'unit_price', t.unit_price,
                  'discount_percent', t.discount_percent,
                  'line_total', t.order_line_total,
                  'order_ordered_quantity', t.order_ordered_quantity,
                  'delivered_value', t.delivered_value,
                  'unfulfilled_value', t.item_unfulfilled_value,
                  'unfulfilled_qty', GREATEST(COALESCE(t.requested_quantity,0) - COALESCE(t.done_quantity,0), 0),
                  'return_value', t.item_return_value)
                  ORDER BY t.id), '[]'::jsonb)
                FROM itv2 t),
  'returns',   (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'id', t.id, 'return_shipment_id', t.return_shipment_id,
                  'parent_shipment_id', t.parent_shipment_id, 'parent_item_id', t.parent_item_id,
                  'external_product_id', t.external_product_id,
                  'product_name', t.product_name, 'product_ref', t.product_ref,
                  'product_id', t.product_id, 'return_reason', t.return_reason,
                  'requested_quantity', t.requested_quantity,
                  'approved_quantity', t.approved_quantity,
                  'delivered_quantity', t.delivered_quantity,
                  'returned_quantity', t.returned_quantity,
                  'received_quantity', t.received_quantity,
                  'priced', t.priced, 'unit_price', t.unit_price,
                  'discount_percent', t.discount_percent,
                  'return_value', t.return_value, 'received_value', t.received_value,
                  'effective_returned_qty', t.effective_returned_qty,
                  'unfulfilled_value', t.unfulfilled_value,
                  'phantom_value', t.phantom_value)
                  ORDER BY t.id), '[]'::jsonb)
                FROM ret2 t),
  'collection', (SELECT jsonb_build_object(
                  'exists', c.id IS NOT NULL,
                  'collection_status', c.collection_status,
                  'pending_delivery_amount', c.pending_delivery_amount,
                  'collected_from_customer', c.collected_from_customer,
                  'collected_successfully_amount', c.collected_successfully_amount,
                  'driver_debt_amount', c.driver_debt_amount,
                  'driver_holds_money', COALESCE(c.driver_debt_amount,0) > 0
                                      AND COALESCE(c.collected_successfully_amount,0) = 0,
                  'outstanding_amount', greatest(
                    COALESCE(c.driver_debt_amount,0),
                    COALESCE(c.collected_from_customer,0),
                    COALESCE(c.pending_delivery_amount,0)),
                  'currency_code', c.currency_code, 'payment_method', c.payment_method,
                  'installment_count', c.installment_count,
                  'accounting_status', c.accounting_status,
                  'transfer_responsible_name', c.transfer_responsible_name,
                  'cheque_reference', c.cheque_reference,
                  'sales_rep_name', c.sales_rep_id_full_name,
                  'collected_by_name', c.collected_by_profile_id_full_name,
                  'admin_confirmed_by_name', c.admin_confirmed_by_profile_id_full_name,
                  'collected_from_customer_at', c.collected_from_customer_at,
                  'admin_confirmed_at', c.admin_confirmed_at,
                  'payment_collected_at', c.payment_collected_at,
                  'driver_notes', c.driver_notes)
                FROM coll c),
  'order_collection', (SELECT jsonb_build_object(
                  'exists', o.id IS NOT NULL,
                  'sibling_rows', o.sibling_rows,
                  'order_number', o.order_number,
                  'order_total', o.order_total,
                  'collected_amount', o.collected_amount,
                  'driver_debt_amount', o.driver_debt_amount,
                  'collection_status', o.collection_status,
                  'payment_method', o.payment_method,
                  'installment_count', o.installment_count,
                  'accounting_status', o.accounting_status,
                  'transfer_responsible_name', o.transfer_responsible_name,
                  'cheque_reference', o.cheque_reference,
                  'sales_rep_name', o.sales_rep_id_full_name,
                  'collected_at', o.collected_at,
                  'confirmed_at', o.confirmed_at,
                  'legs', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                             'id', l.id, 'payment_method', l.payment_method,
                             'amount', l.amount, 'installment_count', l.installment_count,
                             'transfer_responsible_name', l.transfer_responsible_name,
                             'cheque_reference', l.cheque_reference) ORDER BY l.created_at), '[]'::jsonb)
                           FROM legs l))
                FROM ocoll o),
  'plan_check', (SELECT jsonb_build_object(
                  'exists', k.id IS NOT NULL,
                  'check_status', k.check_status, 'review_status', k.review_status,
                  'payment_method', k.payment_method, 'reason', k.reason,
                  'driver_notes', k.driver_notes, 'admin_notes', k.admin_notes,
                  'sales_rep_name', k.sales_rep_id_full_name,
                  'reviewed_at', k.reviewed_at, 'proof_photo_url', k.proof_photo_url)
                FROM pchk k),
  'journal',   (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'id', j.id, 'entry_number', j.entry_number, 'source_type', j.source_type,
                  'status', j.status, 'entry_date', j.entry_date, 'description', j.description,
                  'posted_total', j.posted_total, 'posted_at', j.posted_at)
                  ORDER BY j.entry_date, j.entry_number), '[]'::jsonb)
                FROM jent j),
  'pricing', (SELECT jsonb_build_object(
                'currency', COALESCE(
                  (SELECT currency_code FROM ord), (SELECT currency_code FROM coll), 'EGP'),
                'full_order_price', (SELECT COALESCE(total_amount, amount_total) FROM ord),
                'delivered_value',   a.delivered_value,
                -- NET == delivered only. A "return" here means goods the driver never
                -- handed over, which are already excluded from delivered_value; subtracting
                -- them double-counted the shortfall and produced nonsense like -200 on a
                -- fully delivered shipment. The amount owed is what was delivered.
                'net_value',         a.delivered_value,
                'returns_value',     rg.returns_value,
                'unfulfilled_value', a.unfulfilled_value,
                'returns_unfulfilled_value', rg.unfulfilled_value,
                'phantom_value',     rg.phantom_value,
                'received_value',    rg.received_value,
                'unpriced_items',    a.unpriced_count,
                'unpriced_returns',  rg.return_count - rg.return_priced_count,
                'price_dupes',       (SELECT n FROM dupes),
                'item_count',        a.item_count,
                'priced_count',      a.priced_count,
                'requested_qty',     a.requested_qty,
                'done_qty',          a.done_qty,
                'reserved_qty',      a.reserved_qty,
                'unfulfilled_qty',   GREATEST(COALESCE(a.requested_qty,0) - COALESCE(a.done_qty,0), 0),
                'returned_qty_raw',  a.returned_qty,
                'returns_returned_qty_raw', rg.returned_qty_raw,
                'returned_qty',      rg.returned_qty,
                'return_count',      rg.return_count,
                'returns_received_qty', rg.received_qty,
                'has_order',         EXISTS (SELECT 1 FROM ord),
                'has_prices',        a.priced_count > 0,
                'gmv',               (SELECT total_gmv FROM ship),
                'delivered_invoice_amount', (SELECT delivered_invoice_amount FROM ship))
              FROM agg a CROSS JOIN ragg rg)
)
$body$;

GRANT EXECUTE ON FUNCTION public.logistics_shipment_detail(uuid) TO anon, authenticated, service_role;
