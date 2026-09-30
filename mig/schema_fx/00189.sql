-- 00189: OTIF analytics for the logistics dashboard, ONE uncapped round trip.
-- Source of truth: logistics_shipments (+ logistics_shipment_items for quantities).
-- Approved logic (2026-09-26):
--   base     = DISTINCT ON shipment_reference, latest last_sync_at/updated_at wins
--              (622 refs are re-synced duplicates; 443 of them carry conflicting completed_at)
--   eligible = NOT is_return_shipment AND delivery_phase<>'cancelled' AND shipment_status<>'CANCELLED'
--   analysed = eligible AND completed_at IS NOT NULL
--   period   = scheduled_at in [p_from, p_to)  (the promise date drives the window)
--   on_time  = completed_at <= scheduled_at        -> denominator = delivered
--   in_full  = every ACTIVE line fully done (per-line, NOT sum-aggregate: a short line
--              cannot be compensated by an over-delivered one) -> denominator = verifiable
--   cancelled lines (move_state='cancel') are EXCLUDED from the denominator
--   verifiable = shipment has >=1 active line; 41.3% of delivered shipments carry NO items
--                at all => In Full is unknowable, so they surface as a data-quality tile
--                and are excluded from the OTIF / In Full rates.
-- Filter semantics: p_warehouse/p_governorate/p_driver/p_state drive KPIs, breakdowns and
--   quality tiles; p_search narrows ONLY the drilldown table, so the breakdown lists stay
--   usable as navigation while a search is active.
-- Driver: logistics_shipments.logistics_user_id is NULL on 99.9% of rows, so the plan
--   (logistics_delivery_plans.assigned_profile_id_full_name) is the fallback source.
-- RLS: driven from logistics_shipments. Management sees all; other roles see only their own.
--   logistics_shipment_items is NOT RLS-restricted, so the join must stay anchored on the
--   shipments CTE or scoping would leak.
-- arrived_at_customer_at (6 rows) / pod_signed_at (129 rows) are NOT used as proof of
--   delivery: coverage is far too thin to be a criterion.
-- Sales team: orders.assigned_user_id_full_name is blank on 88% of orders, so only ~11%
--   of shipments resolve to a salesperson. It is surfaced as its own breakdown with the
--   coverage stated in the UI rather than folded into the OTIF headline.
--   The orders side is pre-aggregated (not a per-row LATERAL): orders.odoo_order_name is
--   unique today, and grouping keeps the join 1:1 even if that ever changes, while a
--   LATERAL re-scans orders once per shipment and times the RPC out.
CREATE INDEX IF NOT EXISTS orders_odoo_order_name_idx ON public.orders (odoo_order_name);

DROP FUNCTION IF EXISTS public.otif_analytics(timestamptz, timestamptz, text, text, text, text, text, int, int);
CREATE OR REPLACE FUNCTION public.otif_analytics(
  p_from        timestamptz,
  p_to          timestamptz,
  p_warehouse   text DEFAULT NULL,
  p_governorate text DEFAULT NULL,
  p_driver      text DEFAULT NULL,
  p_state       text DEFAULT NULL,
  p_search      text DEFAULT NULL,
  p_limit       int    DEFAULT 100,
  p_offset      int    DEFAULT 0,
  p_salesperson text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
WITH dedup AS (
  SELECT DISTINCT ON (COALESCE(NULLIF(s.shipment_reference,''), s.id::text))
         s.id, s.shipment_reference, s.odoo_order_name, s.customer_id,
         s.customer_name, s.warehouse_name, s.operation_type_name,
         s.is_return_shipment, s.delivery_phase, s.shipment_status,
         s.scheduled_at, s.completed_at, s.pod_signed_at,
         s.total_gmv, s.picked_up_gmv,
         COALESCE(NULLIF(s.assigned_profile_id_full_name,''), NULLIF(s.assigned_user_name,'')) AS driver_direct,
         NULLIF(p.assigned_profile_id_full_name,'') AS driver_plan,
         NULLIF(btrim(o.assigned_user_id_full_name),'') AS salesperson
  FROM logistics_shipments s
  LEFT JOIN logistics_delivery_plans p ON p.id = s.plan_id
  LEFT JOIN (
         SELECT odoo_order_name, MAX(assigned_user_id_full_name) AS assigned_user_id_full_name
         FROM orders
         WHERE odoo_order_name IS NOT NULL
           AND NULLIF(btrim(assigned_user_id_full_name),'') IS NOT NULL
         GROUP BY 1
  ) o ON o.odoo_order_name = s.odoo_order_name
  ORDER BY COALESCE(NULLIF(s.shipment_reference,''), s.id::text),
           COALESCE(s.last_sync_at, s.updated_at) DESC
),
geo AS (
  SELECT d.*,
    CASE WHEN NULLIF(btrim(c.governorate),'') IS NOT NULL
              AND lower(btrim(c.governorate)) <> 'false'
         THEN btrim(regexp_replace(regexp_replace(c.governorate, '^\s*[0-9]+\s*', ''), '\s*\(EG\)\s*$', ''))
    END AS governorate
  FROM dedup d LEFT JOIN customers c ON c.id = d.customer_id
),
scored AS (
  SELECT g.*,
    COALESCE(NULLIF(g.driver_direct,''), NULLIF(g.driver_plan,''), '(غير معروف)') AS driver,
    (g.completed_at <= g.scheduled_at) AS on_time,
    (COALESCE(i.active_lines,0) > 0)  AS verifiable,
    (COALESCE(i.active_lines,0) > 0 AND COALESCE(i.short_lines,0) = 0) AS in_full,
    COALESCE(i.active_lines,0) AS active_lines,
    COALESCE(i.short_lines,0)  AS short_lines,
    COALESCE(i.req_qty,0)  AS req_qty,
    COALESCE(i.done_qty,0) AS done_qty,
    COALESCE(i.ret_qty,0)  AS ret_qty
  FROM geo g
  LEFT JOIN (
    SELECT shipment_id,
           count(*) FILTER (WHERE COALESCE(requested_quantity,0) > 0) AS active_lines,
           count(*) FILTER (WHERE COALESCE(requested_quantity,0) > 0
                              AND COALESCE(done_quantity,0) < COALESCE(requested_quantity,0)) AS short_lines,
           sum(COALESCE(done_quantity,0))      FILTER (WHERE COALESCE(requested_quantity,0) > 0) AS done_qty,
           sum(COALESCE(requested_quantity,0)) FILTER (WHERE COALESCE(requested_quantity,0) > 0) AS req_qty,
           sum(COALESCE(returned_quantity,0)) FILTER (WHERE COALESCE(requested_quantity,0) > 0) AS ret_qty
    FROM logistics_shipment_items
    WHERE move_state IS DISTINCT FROM 'cancel'
    GROUP BY shipment_id
  ) i ON i.shipment_id = g.id
  WHERE NOT g.is_return_shipment
    AND g.delivery_phase <> 'cancelled'
    AND g.shipment_status <> 'CANCELLED'
    AND g.completed_at IS NOT NULL
),
labelled AS (
  SELECT s.*,
    CASE WHEN NOT s.verifiable        THEN 'unverifiable'
         WHEN s.in_full AND s.on_time THEN 'otif'
         WHEN s.in_full               THEN 'full_late'
         WHEN s.on_time               THEN 'ontime_short'
         ELSE 'short_late' END AS otif_state
  FROM scored s
),
curd AS (
  SELECT l.* FROM labelled l
  WHERE l.scheduled_at >= p_from AND l.scheduled_at < p_to
    AND (p_warehouse   IS NULL OR l.warehouse_name = p_warehouse)
    AND (p_governorate IS NULL OR l.governorate    = p_governorate)
    AND (p_driver      IS NULL OR l.driver         = p_driver)
    AND (p_salesperson IS NULL OR COALESCE(l.salesperson,'(غير محدد)') = p_salesperson)
    AND (p_state       IS NULL OR l.otif_state     = p_state)
),
curf AS (
  SELECT c.* FROM curd c
  WHERE p_search IS NULL OR NULLIF(btrim(p_search),'') IS NULL
     OR c.shipment_reference ILIKE '%'||btrim(p_search)||'%'
     OR c.odoo_order_name    ILIKE '%'||btrim(p_search)||'%'
     OR c.customer_name      ILIKE '%'||btrim(p_search)||'%'
     OR c.driver             ILIKE '%'||btrim(p_search)||'%'
),
prev AS (
  SELECT l.* FROM labelled l
  WHERE l.scheduled_at >= p_from - (p_to - p_from) AND l.scheduled_at < p_from
    AND (p_warehouse   IS NULL OR l.warehouse_name = p_warehouse)
    AND (p_governorate IS NULL OR l.governorate    = p_governorate)
    AND (p_driver      IS NULL OR l.driver         = p_driver)
    AND (p_salesperson IS NULL OR COALESCE(l.salesperson,'(غير محدد)') = p_salesperson)
),
g AS (
  SELECT
    count(*) AS delivered,
    count(*) FILTER (WHERE verifiable) AS verifiable,
    count(*) FILTER (WHERE NOT verifiable) AS unverifiable,
    count(*) FILTER (WHERE otif_state = 'otif') AS otif,
    count(*) FILTER (WHERE in_full) AS in_full,
    count(*) FILTER (WHERE on_time) AS on_time,
    count(*) FILTER (WHERE driver = '(غير معروف)') AS no_driver,
    count(*) FILTER (WHERE governorate IS NULL) AS no_governorate,
    count(*) FILTER (WHERE driver ILIKE '%screenshot%') AS test_driver,
    count(*) FILTER (WHERE shipment_reference IS NULL) AS no_ref,
    count(*) FILTER (WHERE salesperson IS NULL) AS no_salesperson,
    COALESCE(sum(req_qty),0) AS req_qty,
    COALESCE(sum(done_qty),0) AS done_qty,
    round(avg(EXTRACT(EPOCH FROM (completed_at - scheduled_at))/3600.0)::numeric,2) AS avg_delay_h,
    round(avg(EXTRACT(EPOCH FROM (completed_at - scheduled_at))/3600.0)
          FILTER (WHERE completed_at > scheduled_at)::numeric,2) AS avg_late_h
  FROM curd
),
gp AS (
  SELECT count(*) AS delivered,
         count(*) FILTER (WHERE verifiable) AS verifiable,
         count(*) FILTER (WHERE otif_state = 'otif') AS otif,
         count(*) FILTER (WHERE in_full) AS in_full,
         count(*) FILTER (WHERE on_time) AS on_time
  FROM prev
)
SELECT jsonb_build_object(
  'scope', jsonb_build_object('from', p_from, 'to', p_to,
     'days', round(EXTRACT(EPOCH FROM (p_to - p_from))/86400.0)::int),
  'kpis', jsonb_build_object(
     'delivered', g.delivered,
     'verifiable', g.verifiable,
     'otif', g.otif,
     'in_full', g.in_full,
     'on_time', g.on_time,
     'otif_rate',    round(100.0*g.otif/NULLIF(g.verifiable,0),1),
     'in_full_rate', round(100.0*g.in_full/NULLIF(g.verifiable,0),1),
     'on_time_rate', round(100.0*g.on_time/NULLIF(g.delivered,0),1),
     'prev_otif_rate',    round(100.0*gp.otif/NULLIF(gp.verifiable,0),1),
     'prev_in_full_rate', round(100.0*gp.in_full/NULLIF(gp.verifiable,0),1),
     'prev_on_time_rate', round(100.0*gp.on_time/NULLIF(gp.delivered,0),1),
     'prev_verifiable', gp.verifiable, 'prev_delivered', gp.delivered,
     'avg_delay_h', g.avg_delay_h, 'avg_late_h', g.avg_late_h,
     'req_qty', g.req_qty, 'done_qty', g.done_qty),
  'quality', jsonb_build_object(
     'unverifiable', g.unverifiable,
     'unverifiable_pct', round(100.0*g.unverifiable/NULLIF(g.delivered,0),1),
     'no_driver', g.no_driver,
     'no_driver_pct', round(100.0*g.no_driver/NULLIF(g.delivered,0),1),
     'no_governorate', g.no_governorate,
     'no_governorate_pct', round(100.0*g.no_governorate/NULLIF(g.delivered,0),1),
     'test_driver', g.test_driver, 'no_ref', g.no_ref,
     'no_salesperson', g.no_salesperson,
     'no_salesperson_pct', round(100.0*g.no_salesperson/NULLIF(g.delivered,0),1)),
  'by_state', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'state', t.otif_state, 'count', t.n)), '[]'::jsonb)
               FROM (SELECT otif_state, count(*) AS n FROM curd GROUP BY 1) t),
  'by_driver', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'driver', t.driver, 'shipments', t.n, 'otif', t.otif,
                   'in_full', t.in_full, 'on_time', t.on_time, 'verifiable', t.verifiable,
                   'otif_rate', round(100.0*t.otif/NULLIF(t.verifiable,0),1),
                   'avg_delay_h', t.avg_delay,
                   'is_test', (lower(t.driver) LIKE '%screenshot%'))
                 ORDER BY t.verifiable DESC, t.driver), '[]'::jsonb)
               FROM (SELECT driver, count(*) AS n,
                            count(*) FILTER (WHERE verifiable) AS verifiable,
                            count(*) FILTER (WHERE otif_state='otif') AS otif,
                            count(*) FILTER (WHERE in_full) AS in_full,
                            count(*) FILTER (WHERE on_time) AS on_time,
                            round(avg(EXTRACT(EPOCH FROM (completed_at-scheduled_at))/3600.0)::numeric,2) AS avg_delay
                     FROM curd GROUP BY driver) t),
  'by_governorate', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'governorate', t.governorate, 'shipments', t.n, 'otif', t.otif,
                   'in_full', t.in_full, 'on_time', t.on_time, 'verifiable', t.verifiable,
                   'otif_rate', round(100.0*t.otif/NULLIF(t.verifiable,0),1))
                 ORDER BY t.n DESC), '[]'::jsonb)
               FROM (SELECT COALESCE(governorate,'(غير محدد)') AS governorate, count(*) AS n,
                            count(*) FILTER (WHERE verifiable) AS verifiable,
                            count(*) FILTER (WHERE otif_state='otif') AS otif,
                            count(*) FILTER (WHERE in_full) AS in_full,
                            count(*) FILTER (WHERE on_time) AS on_time
                     FROM curd GROUP BY 1) t),
  'by_warehouse', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'warehouse', t.warehouse_name, 'shipments', t.n, 'otif', t.otif,
                   'in_full', t.in_full, 'on_time', t.on_time, 'verifiable', t.verifiable,
                   'otif_rate', round(100.0*t.otif/NULLIF(t.verifiable,0),1))
                 ORDER BY t.n DESC), '[]'::jsonb)
               FROM (SELECT COALESCE(NULLIF(warehouse_name,''),'(غير محدد)') AS warehouse_name,
                            count(*) AS n,
                            count(*) FILTER (WHERE verifiable) AS verifiable,
                            count(*) FILTER (WHERE otif_state='otif') AS otif,
                            count(*) FILTER (WHERE in_full) AS in_full,
                            count(*) FILTER (WHERE on_time) AS on_time
                     FROM curd GROUP BY 1) t),
  'by_customer', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'customer', t.customer_name, 'shipments', t.n, 'otif', t.otif,
                   'verifiable', t.verifiable,
                   'otif_rate', round(100.0*t.otif/NULLIF(t.verifiable,0),1))), '[]'::jsonb)
               FROM (SELECT COALESCE(NULLIF(customer_name,''),'(غير محدد)') AS customer_name,
                            count(*) AS n,
                            count(*) FILTER (WHERE verifiable) AS verifiable,
                            count(*) FILTER (WHERE otif_state='otif') AS otif
                     FROM curd GROUP BY 1 ORDER BY 2 DESC LIMIT 15) t),
  'by_salesperson', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'salesperson', t.salesperson, 'shipments', t.n, 'otif', t.otif,
                   'in_full', t.in_full, 'on_time', t.on_time, 'verifiable', t.verifiable,
                   'otif_rate', round(100.0*t.otif/NULLIF(t.verifiable,0),1))
                 ORDER BY t.verifiable DESC, t.salesperson), '[]'::jsonb)
               FROM (SELECT COALESCE(salesperson,'(غير محدد)') AS salesperson, count(*) AS n,
                            count(*) FILTER (WHERE verifiable) AS verifiable,
                            count(*) FILTER (WHERE otif_state='otif') AS otif,
                            count(*) FILTER (WHERE in_full) AS in_full,
                            count(*) FILTER (WHERE on_time) AS on_time
                     FROM curd GROUP BY 1) t),
  'trend', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'day', t.d, 'shipments', t.n, 'otif', t.otif, 'in_full', t.in_full,
                   'on_time', t.on_time, 'verifiable', t.verifiable,
                   'otif_rate', round(100.0*t.otif/NULLIF(t.verifiable,0),1))
                 ORDER BY t.d), '[]'::jsonb)
            FROM (SELECT to_char(scheduled_at AT TIME ZONE 'Africa/Cairo','YYYY-MM-DD') AS d,
                         count(*) AS n,
                         count(*) FILTER (WHERE verifiable) AS verifiable,
                         count(*) FILTER (WHERE otif_state='otif') AS otif,
                         count(*) FILTER (WHERE in_full) AS in_full,
                         count(*) FILTER (WHERE on_time) AS on_time
                  FROM curd GROUP BY 1) t),
  'rows_total', (SELECT count(*) FROM curf),
  'rows', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'id', r.id, 'shipment_reference', r.shipment_reference,
                   'odoo_order_name', r.odoo_order_name, 'customer_name', r.customer_name,
                   'warehouse_name', r.warehouse_name, 'driver', r.driver,
                   'governorate', r.governorate, 'state', r.otif_state,
                   'on_time', r.on_time, 'in_full', r.in_full, 'verifiable', r.verifiable,
                   'scheduled_at', r.scheduled_at, 'completed_at', r.completed_at,
                   'delay_h', round(EXTRACT(EPOCH FROM (r.completed_at - r.scheduled_at))/3600.0::numeric,2),
                   'active_lines', r.active_lines, 'short_lines', r.short_lines,
                   'req_qty', r.req_qty, 'done_qty', r.done_qty)
                 ORDER BY r.scheduled_at DESC, r.shipment_reference), '[]'::jsonb)
           FROM (SELECT * FROM curf ORDER BY scheduled_at DESC, shipment_reference
                 OFFSET GREATEST(COALESCE(p_offset,0),0)
                 LIMIT LEAST(GREATEST(COALESCE(p_limit,100),1),500)) r)
)
FROM g, gp
$fn$;

GRANT EXECUTE ON FUNCTION public.otif_analytics(timestamptz, timestamptz, text, text, text, text, text, int, int, text) TO anon, authenticated, service_role;
