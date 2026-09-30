-- 00202: Customer-service (Google Form) import — "Form responses 1" sheet, 2026.
-- Context: /tickets/analytics reads RPC cs_analytics(), which reads order_tickets.
--          The previous import (2026-09-24) only landed 1355 of the 10220 2026 responses
--          and stored created_at = import time, so date filters were wrong.
-- Decisions (owner-approved):
--   1. scope = the 'Form responses 1' sheet only (8865 new rows; 2025 sheets excluded).
--   2. created_at = the real ticket date (التاريخ) at 00:00:00Z  -> correct byDay/by-month.
--   3. raw_payload->>'customer_name' is added (cs_analytics reads that key) for the new
--      rows AND back-filled onto the 1355 already-imported rows (UPDATE, nothing dropped).
-- Reproduces the previous import's observable behaviour: identical raw_payload keys,
-- source='excel_backfill', scope='order' (dominant 1251/1355), order_id resolved through
-- orders.odoo_order_name, status resolved unless solved='تم تفويض لقسماخر', priority medium.
-- category: the old script is gone and was judgement-based (max 86% reproducible from the
-- file), so it is learned from the 1355 already-imported rows: (detail,delivery,title) exact
-- 8699 + detail-level 69 + generic 97.
-- Safety: single transaction, hard assertions before COMMIT; backup table first.
--         No DELETE, no UPDATE of existing business columns (only raw_payload enrichment).

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';

BEGIN;

-- 1) backup ------------------------------------------------------------------
CREATE TABLE public.order_tickets_bak_00202 AS
  SELECT * FROM public.order_tickets;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.order_tickets_bak_00202;
  IF n < 1400 THEN RAISE EXCEPTION 'backup looks wrong: %', n; END IF;
  RAISE NOTICE 'backup rows: %', n;
END $$;

-- 2) staging -----------------------------------------------------------------
CREATE TEMP TABLE stage_00202 (
  order_reference text, date_from_excel date, original_timestamp text,
  customer_name text, sales_person text, delivery_rep text, created_by_name text,
  status text, category text, scope text, priority text, departments text,
  subject text, description text, raw_payload text
);
\copy stage_00202 FROM '/tmp/cst_import_00202.csv' WITH (FORMAT csv, HEADER true, QUOTE '"', ENCODING 'UTF8')

-- 3) enrich existing rows: customer_name (cs_analytics reads this key) ----------
UPDATE public.order_tickets t
   SET raw_payload = t.raw_payload || jsonb_build_object('customer_name', t.raw_payload->>'customer_name_xl'),
       updated_at  = now()
 WHERE t.raw_payload ? 'customer_name_xl'
   AND NOT (t.raw_payload ? 'customer_name')
   AND COALESCE(t.raw_payload->>'customer_name_xl','') <> '';

-- 4) insert the new responses --------------------------------------------------
INSERT INTO public.order_tickets (
  order_id, customer_id, subject, description, status, priority, category,
  assigned_to, created_by, resolved_at, closed_at, raw_payload, created_at, updated_at,
  assigned_to_full_name, created_by_full_name, scope, assigned_departments, assigned_user_ids
)
SELECT
  o.id, NULL, s.subject, s.description, s.status::ticket_status, s.priority::ticket_priority,
  s.category, NULL, NULL,
  CASE WHEN s.status = 'resolved' THEN s.date_from_excel::timestamptz ELSE NULL END,
  NULL, s.raw_payload::jsonb, s.date_from_excel::timestamptz, now(),
  NULL, s.created_by_name, s.scope,
  ARRAY(SELECT jsonb_array_elements_text(s.departments::jsonb)), '{}'::uuid[]
FROM stage_00202 s
LEFT JOIN LATERAL (
  SELECT x.id FROM public.orders x
   WHERE x.odoo_order_name = s.order_reference
   ORDER BY x.id::text LIMIT 1
) o ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_tickets t
   WHERE t.raw_payload->>'source' = 'excel_backfill'
     AND t.raw_payload->>'order_reference' = s.order_reference
     AND left(t.raw_payload->>'date_from_excel', 10) = s.date_from_excel::text
);

-- 5) assertions ---------------------------------------------------------------
DO $$
DECLARE
  n_total int; n_bak int; n_gone int; n_new int; n_named int; n_nulldate int; n_linked int;
BEGIN
  SELECT count(*) INTO n_total FROM public.order_tickets;
  SELECT count(*) INTO n_bak   FROM public.order_tickets_bak_00202;
  SELECT count(*) INTO n_gone  FROM public.order_tickets_bak_00202 b
    WHERE NOT EXISTS (SELECT 1 FROM public.order_tickets t WHERE t.id = b.id);
  SELECT count(*) INTO n_new   FROM public.order_tickets t
    WHERE t.raw_payload->>'source' = 'excel_backfill' AND t.id NOT IN (SELECT id FROM public.order_tickets_bak_00202);
  SELECT count(*) INTO n_named FROM public.order_tickets
    WHERE raw_payload->>'source' = 'excel_backfill' AND COALESCE(raw_payload->>'customer_name','') <> '';
  SELECT count(*) INTO n_nulldate FROM public.order_tickets
    WHERE raw_payload->>'source' = 'excel_backfill' AND created_at IS NULL;
  SELECT count(*) INTO n_linked FROM public.order_tickets
    WHERE raw_payload->>'source' = 'excel_backfill' AND order_id IS NOT NULL;

  RAISE NOTICE 'total=% bak=% deleted=% new=% with_customer_name=% null_created_at=% order_linked=%',
               n_total, n_bak, n_gone, n_new, n_named, n_nulldate, n_linked;

  IF n_gone <> 0 THEN RAISE EXCEPTION 'ABORT: % pre-existing rows vanished', n_gone; END IF;
  IF n_bak <> 1406 THEN RAISE EXCEPTION 'ABORT: unexpected pre-import count %', n_bak; END IF;
  IF n_new <> 8865 THEN RAISE EXCEPTION 'ABORT: inserted % rows, expected 8865', n_new; END IF;
  IF n_nulldate <> 0 THEN RAISE EXCEPTION 'ABORT: % rows with null created_at', n_nulldate; END IF;
  IF n_total <> 1406 + 8865 THEN RAISE EXCEPTION 'ABORT: total % unexpected', n_total; END IF;
  -- every Excel row that carried a customer name now exposes it under the key cs_analytics reads
  IF EXISTS (
    SELECT 1 FROM public.order_tickets
     WHERE raw_payload->>'source' = 'excel_backfill'
       AND COALESCE(raw_payload->>'customer_name_xl','') <> ''
       AND COALESCE(raw_payload->>'customer_name','') <> raw_payload->>'customer_name_xl'
  ) THEN RAISE EXCEPTION 'ABORT: customer_name not in sync with customer_name_xl'; END IF;
  -- no pre-existing business column was rewritten
  IF EXISTS (
    SELECT 1 FROM public.order_tickets t JOIN public.order_tickets_bak_00202 b USING (id)
     WHERE (t.subject, t.description, t.status, t.priority, t.category, t.scope,
            t.created_at, t.resolved_at, t.order_id, t.created_by_full_name,
            t.assigned_departments) IS DISTINCT FROM
           (b.subject, b.description, b.status, b.priority, b.category, b.scope,
            b.created_at, b.resolved_at, b.order_id, b.created_by_full_name,
            b.assigned_departments)
  ) THEN RAISE EXCEPTION 'ABORT: a pre-existing row changed a business column'; END IF;
END $$;

-- 6) proof the page's data source still works --------------------------------
SELECT (public.cs_analytics('2026-01-01'::timestamptz, '2026-09-30 23:59:59'::timestamptz)->>'total')   AS total_2026,
       (public.cs_analytics('2026-01-01'::timestamptz, '2026-09-30 23:59:59'::timestamptz)->>'percentage') AS pct_resolved,
       jsonb_array_length(COALESCE((public.cs_analytics('2026-01-01'::timestamptz, '2026-09-30 23:59:59'::timestamptz)->>'tickets')::jsonb, '[]')) AS tickets_arr,
       jsonb_array_length(COALESCE((public.cs_analytics('2026-01-01'::timestamptz, '2026-09-30 23:59:59'::timestamptz)->>'products')::jsonb, '[]')) AS products_arr;

COMMIT;
