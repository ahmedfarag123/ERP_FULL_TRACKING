-- 00204: cs_analytics rebuilt from the Google Form file (CUSTOMER SERVICE Tickets(7).xlsx).
-- Why: /tickets/analytics counted EVERY form response. 7959 of the 10220 2026 rows are
--      "تم التسليم بسلام" (no problem), so they dominated every card: delivery status showed
--      9075 "تم بالكامل" and the department card showed الحركة with 198 in Sep 22-28 while only
--      16 of them were real problems. Owner's instruction: count only tickets that carry a
--      problem, everything based on the file.
-- Changes (SQL function only - no data row is inserted/updated/deleted):
--   1) filter: drop rows whose problem_detail (file column 'تفاصيل المشكلة') equals
--      'تم التسليم بسلام' from EVERY aggregate, the tickets list and the product walk.
--      App-created tickets (raw_payload IS NULL, real problem subjects) are kept.
--   2) delivery_key split (file column 'حالة التسليم'): 'الغاء' => 'cancelled' (ملغى);
--      'مرتجع كلى*' / 'مرتجع كلي' / 'مرتجع' => 'returned' (ارجاع كلي). Previously both
--      collapsed into one bucket labelled ارجاع كلي, inflating returns by 141 cancellations.
--   3) deliveryLabels: added "returned", relabelled cancelled to ملغى.
-- Expected (asserted below, window 2026-01-01..2026-09-30):
--   total 10271 -> 2330 | byDelivery: full 1137, partial 675, returned 376, cancelled 142
--   Sep 22-28: total 106 (was ~270), delivery_issue 8 (was 190), dept الحركة 14 (was 198)
-- Rollback: SELECT prosrc FROM public.cs_analytics_bak_00204;
-- Safety: one transaction, ON_ERROR_STOP, hard assertions before COMMIT.

\set ON_ERROR_STOP on

BEGIN;

-- 1) backup of the previous function definition ------------------------------
CREATE TABLE public.cs_analytics_bak_00204 AS
  SELECT proname, prosrc FROM pg_proc WHERE proname = 'cs_analytics';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.cs_analytics_bak_00204;
  IF n <> 1 THEN RAISE EXCEPTION 'ABORT: function backup has % rows', n; END IF;
END $$;

-- 2) new definition ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cs_analytics(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$

WITH tk AS (
  SELECT t.id, t.order_id, t.scope, t.subject, t.status::text AS status, t.category,
         t.created_at, t.resolved_at, t.closed_at,
         t.created_by_full_name, t.assigned_to_full_name, t.assigned_departments,
         t.raw_payload, o.delivery_status
  FROM order_tickets t
  LEFT JOIN orders o ON o.id = t.order_id
  WHERE t.created_at >= p_from AND t.created_at <= p_to
    AND COALESCE(btrim(t.raw_payload->>'problem_detail'),'') <> 'تم التسليم بسلام'
),
dlv AS (
  SELECT tk.id, tk.order_id, tk.scope, tk.subject, tk.status, tk.category,
         tk.created_at, tk.resolved_at, tk.closed_at,
         tk.created_by_full_name, tk.assigned_to_full_name, tk.assigned_departments,
         COALESCE(tk.raw_payload->>'customer_name','') AS customer_full_name,
         (tk.status IN ('resolved','closed') OR tk.resolved_at IS NOT NULL OR tk.closed_at IS NOT NULL) AS is_resolved,
         CASE
           WHEN COALESCE(tk.raw_payload->>'delivery_status_xl','') <> '' THEN
             CASE btrim(tk.raw_payload->>'delivery_status_xl')
               WHEN 'بالكامل' THEN 'full'
               WHEN 'مرتجع جزئى' THEN 'partial'
               WHEN 'الغاء' THEN 'cancelled'
               WHEN 'مرتجع' THEN 'returned'
               WHEN 'مرتجع كلى' THEN 'returned'
               WHEN 'مرتجع كلي' THEN 'returned'
               WHEN 'مرتجع كلى بعد الوصول' THEN 'returned'
               WHEN 'مرتجع كلى قبل الوصول' THEN 'returned'
               ELSE 'other_delivery' END
           WHEN lower(COALESCE(tk.delivery_status,'')) = 'false' THEN 'cancelled'
           WHEN lower(COALESCE(tk.delivery_status,'')) = 'true'  THEN 'full'
           ELSE COALESCE(NULLIF(tk.delivery_status,''), 'unknown')
         END AS delivery_key
  FROM tk
),
items AS (
  SELECT d.id AS ticket_id, d.order_id,
         COALESCE(ti.product_name, o.product_name) AS pname,
         COALESCE(ti.product_code, o.product_code) AS pcode
  FROM dlv d
  JOIN ticket_items ti ON ti.ticket_id = d.id
  LEFT JOIN order_line_items o ON o.id = ti.order_line_item_id
  WHERE d.scope = 'products'
    AND (o.id IS NULL OR (COALESCE(o.display_type,'product') = 'product' AND COALESCE(o.ordered_quantity,0) > 0))
  UNION ALL
  SELECT d.id, d.order_id, o.product_name, o.product_code
  FROM dlv d
  JOIN order_line_items o ON o.order_id = d.order_id
  WHERE d.scope IS DISTINCT FROM 'products'
    AND COALESCE(o.display_type,'product') = 'product'
    AND COALESCE(o.ordered_quantity,0) > 0
),
items_clean AS (
  SELECT ticket_id, order_id, pname, pcode FROM items
  WHERE pname IS NOT NULL AND btrim(pname) <> ''
),
tp AS (
  SELECT ticket_id,
         array_agg(DISTINCT COALESCE(NULLIF(btrim(pcode),''), 'name:' || pname)) AS pkeys
  FROM items_clean GROUP BY ticket_id
)
SELECT jsonb_build_object(
  'total',         (SELECT count(*) FROM dlv),
  'resolved',      (SELECT count(*) FROM dlv WHERE is_resolved),
  'percentage',    (SELECT CASE WHEN COALESCE(sum(q.tot),0) = 0 THEN 0
                          ELSE round(100.0 * sum(q.res) / sum(q.tot))::int END
                    FROM (SELECT count(*) AS tot, count(*) FILTER (WHERE is_resolved) AS res FROM dlv) q),
  'byCategory',    (SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) FROM
                      (SELECT COALESCE(NULLIF(btrim(category),''),'other') AS k, count(*) AS v FROM dlv GROUP BY 1) s),
  'byDepartment',  (SELECT COALESCE(jsonb_object_agg(dname, v), '{}'::jsonb) FROM
                      (SELECT dname, count(*) AS v FROM dlv, LATERAL unnest(COALESCE(assigned_departments, ARRAY[]::text[])) AS dname GROUP BY 1) s),
  'byDelivery',    (SELECT COALESCE(jsonb_object_agg(delivery_key, v), '{}'::jsonb) FROM
                      (SELECT delivery_key, count(*) AS v FROM dlv GROUP BY 1) s),
  'byDay',         (SELECT COALESCE(jsonb_object_agg(dday, v), '{}'::jsonb) FROM
                      (SELECT to_char(created_at, 'YYYY-MM-DD') AS dday, count(*) AS v FROM dlv GROUP BY 1) s),
  'agentMap',      (SELECT COALESCE(jsonb_object_agg(agent,
                      jsonb_build_object('total', tot, 'resolved', res, 'totalTime', tt, 'count', cnt)), '{}'::jsonb) FROM
                      (SELECT COALESCE(NULLIF(btrim(created_by_full_name),''),'غير محدد') AS agent,
                              count(*) AS tot,
                              count(*) FILTER (WHERE is_resolved) AS res,
                              COALESCE(sum(EXTRACT(EPOCH FROM (COALESCE(resolved_at, closed_at) - created_at))::bigint)
                                       FILTER (WHERE is_resolved AND COALESCE(resolved_at, closed_at) IS NOT NULL), 0) AS tt,
                              count(*) FILTER (WHERE is_resolved AND COALESCE(resolved_at, closed_at) IS NOT NULL) AS cnt
                       FROM dlv GROUP BY 1) s),
  'deliveryLabels','{"full":"تم بالكامل","partial":"ارجاع جزئي","returned":"ارجاع كلي","cancelled":"ملغى","pending":"قيد الانتظار","other_delivery":"أخرى","unknown":"غير معروف"}'::jsonb,
  'tickets',       (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'id', d.id, 'subject', d.subject, 'status', d.status, 'category', d.category,
                        'created_at', d.created_at, 'resolved_at', d.resolved_at, 'closed_at', d.closed_at,
                        'created_by_full_name', d.created_by_full_name,
                        'assigned_to_full_name', d.assigned_to_full_name,
                        'assigned_departments', d.assigned_departments,
                        'customer_full_name', d.customer_full_name,
                        'order_id', d.order_id, 'delivery_key', d.delivery_key,
                        'is_resolved', d.is_resolved,
                        'product_keys', COALESCE(tp.pkeys, ARRAY[]::text[]))
                      ORDER BY d.created_at DESC), '[]'::jsonb)
                    FROM dlv d LEFT JOIN tp ON tp.ticket_id = d.id),
  'products',      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'product_code', pcode, 'product_name', pname,
                        'ticket_count', tcount, 'order_count', ocount, 'ticket_ids', tids)
                      ORDER BY tcount DESC, pname), '[]'::jsonb) FROM
                      (SELECT MAX(pcode) AS pcode, pname,
                              count(DISTINCT ticket_id) AS tcount,
                              count(DISTINCT order_id)  AS ocount,
                              array_agg(DISTINCT ticket_id) AS tids
                       FROM items_clean GROUP BY pname) s)
);

$fn$;

-- 3) assertions (numbers computed from the Excel file beforehand) ------------
DO $$
DECLARE
  r_full jsonb; r_sep jsonb;
  n_total int; n_sum int; n_badkeys int; n_unkbuckets int;
  n_sep int; n_sep_del int; n_sep_haraka int;
  n_tickets int; n_pct int;
BEGIN
  r_full := public.cs_analytics('2026-01-01'::timestamptz, '2026-09-30 23:59:59'::timestamptz);
  r_sep  := public.cs_analytics('2026-09-22'::timestamptz, '2026-09-28 23:59:59'::timestamptz);

  n_total := (r_full->>'total')::int;
  SELECT COALESCE(sum(v::int),0) INTO n_sum FROM jsonb_each_text(r_full->'byDelivery') e(k, v);
  SELECT count(*) INTO n_badkeys FROM jsonb_object_keys(r_full->'byDelivery') k
   WHERE k NOT IN ('full','partial','returned','cancelled','pending','other_delivery','unknown');
  SELECT count(*) INTO n_unkbuckets FROM jsonb_object_keys(r_full->'byDelivery') k
   WHERE k IN ('unknown','other_delivery');
  n_tickets := jsonb_array_length(r_full->'tickets');
  n_pct := (r_full->>'percentage')::int;
  n_sep := (r_sep->>'total')::int;
  n_sep_del := COALESCE((r_sep->'byCategory')#>>'{delivery_issue}','0')::int;
  SELECT COALESCE(sum((e.value)::int),0) INTO n_sep_haraka
    FROM jsonb_each(r_sep->'byDepartment') e WHERE e.key = 'الحركة';
  IF n_badkeys <> 0 THEN RAISE EXCEPTION 'ABORT: % unknown byDelivery keys', n_badkeys; END IF;
  IF n_unkbuckets <> 0 THEN RAISE EXCEPTION 'ABORT: unknown/other_delivery bucket present'; END IF;
  IF n_total <> 2330 THEN RAISE EXCEPTION 'ABORT: full-year total %, expected 2330', n_total; END IF;
  IF n_sum <> n_total THEN RAISE EXCEPTION 'ABORT: byDelivery sum % <> total %', n_sum, n_total; END IF;
  IF n_tickets <> n_total THEN RAISE EXCEPTION 'ABORT: tickets array % <> total %', n_tickets, n_total; END IF;
  IF n_pct < 0 OR n_pct > 100 THEN RAISE EXCEPTION 'ABORT: percentage % out of range', n_pct; END IF;
  IF n_sep <> 106 THEN RAISE EXCEPTION 'ABORT: Sep22-28 total %, expected 106', n_sep; END IF;
  IF n_sep_del <> 8 THEN RAISE EXCEPTION 'ABORT: Sep22-28 delivery_issue %, expected 8', n_sep_del; END IF;
  IF n_sep_haraka <> 14 THEN RAISE EXCEPTION 'ABORT: Sep22-28 dept haraka %, expected 14', n_sep_haraka; END IF;
  IF NOT ((r_full->'deliveryLabels') ? 'returned') THEN RAISE EXCEPTION 'ABORT: deliveryLabels missing returned'; END IF;
  IF NOT ((r_full->'deliveryLabels') ? 'cancelled') THEN RAISE EXCEPTION 'ABORT: deliveryLabels missing cancelled'; END IF;
  RAISE NOTICE 'total=% byDelivery_sum=% sep22_28=% sep_delivery_issue=% sep_haraka=% pct=%',
               n_total, n_sum, n_sep, n_sep_del, n_sep_haraka, n_pct;
END $$;

-- 4) proof: the page's data source -------------------------------------------
SELECT (public.cs_analytics('2026-09-22'::timestamptz,'2026-09-28 23:59:59'::timestamptz)->>'total') AS sep_total,
       public.cs_analytics('2026-09-22'::timestamptz,'2026-09-28 23:59:59'::timestamptz)->'byDelivery' AS sep_by_delivery,
       public.cs_analytics('2026-01-01'::timestamptz,'2026-09-30 23:59:59'::timestamptz)->'byDelivery' AS year_by_delivery,
       public.cs_analytics('2026-01-01'::timestamptz,'2026-09-30 23:59:59'::timestamptz)->'deliveryLabels' AS labels;

COMMIT;
