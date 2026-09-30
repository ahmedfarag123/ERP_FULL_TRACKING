-- 00190: fix the two broken dimension sources on the OTIF page + the governorate regex.
-- ---------------------------------------------------------------------------
-- WHY THIS MIGRATION EXISTS (all three are DATA-SOURCE bugs, not logic changes):
--
-- 1) SALESPERSON was read from orders.assigned_user_id_full_name, which is blank on 88%
--    of orders -> only 11% of shipments resolved. The real Odoo salesperson lives in
--    orders.user_id, formatted '<oid> <name>' (e.g. '15 Haddil Haron'), and is populated
--    on 6352/6353 orders (99.98%) -> 97.0% of delivered shipments, INCLUDING September
--    (96.4%), so the "Odoo stopped syncing" theory was wrong.
--    Bare-oid rows ('18', '19', ...) are resolved through salespersons_odoo (14 names,
--    covers 12 of the 21 oids present); anything still unresolved falls back to
--    assigned_user_id_full_name and finally to '(غير محدد)'.
--    NOTE: customers.assigned_user_id_full_name is 60% populated but is USELESS here:
--    those 2,219 customers are the 'C-Class-####' series, while shipments reference only
--    the numeric-Odoo series (823 customers). The two populations have ZERO overlap.
--
-- 2) DRIVER was read from logistics_shipments.logistics_user_id, which is NULL on 99.93%
--    of rows (5 of 6697). The plan (logistics_shipments.plan_id) is the real link and
--    resolves via four sources. Ceiling measured: 2162/6697 = 32.3%.
--    plan_id is a NEW feature: June 0%, July 15%, August 14%, September 8%. So the
--    driver breakdown is only trustworthy for recent periods, and the UI says so.
--
-- 3) customers.governorate is stored as '278 | Cairo (EG)'. The 00189 regex stripped the
--    numeric code but left the '|' separator, so EVERY governorate rendered as
--    '| Cairo', '| Giza', ... Fix: strip the 'NNN | ' prefix, a bare '|', and the
--    ' (EG)' suffix. A literal 'false' maps to NULL (already handled).
--
-- CO-DRIVERS (approved 2026-09-26: "primary for the numbers, all names for the filter"):
--   logistics_plan_assignees holds several drivers per plan. Counting a shipment under
--   each of them would double-count, so:
--     driver       = the single primary name -> breakdowns sum exactly to the total
--     driver_names = every name on the shipment -> p_driver matches ANY of them,
--                    so a co-driver is still findable, without inflating any total
--
-- UNCHANGED FROM 00189 (verified identical after this migration): the dedup rule, the
-- eligibility filter, the On Time / In Full / OTIF definitions and their denominators,
-- the cancelled-line exclusion, and the search-only-on-the-table semantics.
-- Driver and salesperson are DISPLAY dimensions: applying them must not move the OTIF
-- headline numbers.

DROP FUNCTION IF EXISTS public.otif_analytics(timestamptz, timestamptz, text, text, text, text, text, int, int, text);
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
AS $body$
WITH base AS (
  SELECT DISTINCT ON (COALESCE(NULLIF(s.shipment_reference,''), s.id::text))
         s.id, s.shipment_reference, s.odoo_order_name, s.customer_id,
         s.customer_name, s.warehouse_name, s.operation_type_name, s.plan_id,
         s.is_return_shipment, s.delivery_phase, s.shipment_status,
         s.scheduled_at, s.completed_at, s.pod_signed_at,
         s.total_gmv, s.picked_up_gmv,
         NULLIF(btrim(s.assigned_profile_id_full_name),'') AS d_ship_profile,
         NULLIF(btrim(s.assigned_user_name),'')             AS d_ship_user,
         NULLIF(btrim(p.assigned_profile_id_full_name),'')   AS d_plan_profile,
         NULLIF(btrim(plu.employee_name),'')                AS d_plan_user,
         NULLIF(btrim(slu.employee_name),'')                AS d_ship_lu,
         pa.assignee_names,
         o.odoo_user_id, o.assigned_name
  FROM logistics_shipments s
  LEFT JOIN logistics_delivery_plans p  ON p.id = s.plan_id
  LEFT JOIN logistics_users plu          ON plu.id = p.logistics_user_id
  LEFT JOIN logistics_users slu          ON slu.id = s.logistics_user_id
  LEFT JOIN (
    SELECT plan_id, array_agg(DISTINCT btrim(display_name)) AS assignee_names
    FROM logistics_plan_assignees
    WHERE NULLIF(btrim(display_name),'') IS NOT NULL
    GROUP BY plan_id
  ) pa ON pa.plan_id = s.plan_id
  LEFT JOIN (
    SELECT DISTINCT ON (odoo_order_name)
           odoo_order_name,
           NULLIF(btrim(user_id),'')                  AS odoo_user_id,
           NULLIF(btrim(assigned_user_id_full_name),'') AS assigned_name
    FROM orders
    WHERE odoo_order_name IS NOT NULL
    ORDER BY odoo_order_name, COALESCE(last_sync_at, updated_at) DESC NULLS LAST
  ) o ON o.odoo_order_name = s.odoo_order_name
  ORDER BY COALESCE(NULLIF(s.shipment_reference,''), s.id::text),
           COALESCE(s.last_sync_at, s.updated_at) DESC
),
geo AS (
  SELECT b.*,
    CASE WHEN NULLIF(btrim(c.governorate),'') IS NOT NULL
              AND lower(btrim(c.governorate)) <> 'false'
         THEN btrim(regexp_replace(
                regexp_replace(
                  regexp_replace(c.governorate, '^\s*[0-9]+\s*\|\s*', ''),
                  '^\s*\|\s*', ''),
                '\s*\(EG\)\s*$', ''))
    END AS governorate,
    CASE WHEN NULLIF(btrim(replace(b.odoo_user_id,'|',' ')),'') IS NULL THEN b.assigned_name
         WHEN btrim(replace(b.odoo_user_id,'|',' ')) ~ '^\d+\s+\S'
         THEN NULLIF(btrim(regexp_replace(btrim(replace(b.odoo_user_id,'|',' ')), '^\d+\s+', '')), '')
         WHEN btrim(b.odoo_user_id) ~ '^\d+$' THEN spo.salesperson_name
         ELSE b.assigned_name
    END AS salesperson
  FROM base b
  LEFT JOIN customers c ON c.id = b.customer_id
  LEFT JOIN (SELECT user_id, MAX(salesperson_name) AS salesperson_name
             FROM salespersons_odoo GROUP BY 1) spo
         ON b.odoo_user_id ~ '^\d+$' AND spo.user_id::text = btrim(b.odoo_user_id)
),
driver_resolved AS (
  SELECT g.*,
    COALESCE((
      SELECT array_agg(z.v ORDER BY z.first_ord)
      FROM (SELECT x.v, min(x.ord) AS first_ord
            FROM unnest(
                   ARRAY[
                     g.d_ship_profile, g.d_ship_user, g.d_plan_profile,
                     g.d_plan_user,   g.d_ship_lu
                   ] || COALESCE(g.assignee_names, ARRAY[]::text[])
                 ) WITH ORDINALITY AS x(v, ord)
            WHERE x.v IS NOT NULL
              AND lower(btrim(x.v)) NOT IN
                  ('driver','سائق','السائق','null','undefined','none','n/a','na','-','0','test')
            GROUP BY x.v) z
    ), ARRAY[]::text[]) AS driver_names
  FROM geo g
),
scored AS (
  SELECT dr.*,
    COALESCE(dr.driver_names[1], '(غير معروف)') AS driver,
    (dr.completed_at <= dr.scheduled_at) AS on_time,
    (COALESCE(i.active_lines,0) > 0)  AS verifiable,
    (COALESCE(i.active_lines,0) > 0 AND COALESCE(i.short_lines,0) = 0) AS in_full,
    COALESCE(i.active_lines,0) AS active_lines,
    COALESCE(i.short_lines,0)  AS short_lines,
    COALESCE(i.req_qty,0)  AS req_qty,
    COALESCE(i.done_qty,0) AS done_qty,
    COALESCE(i.ret_qty,0)  AS ret_qty
  FROM driver_resolved dr
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
  ) i ON i.shipment_id = dr.id
  WHERE NOT dr.is_return_shipment
    AND dr.delivery_phase <> 'cancelled'
    AND dr.shipment_status <> 'CANCELLED'
    AND dr.completed_at IS NOT NULL
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
    AND (p_driver      IS NULL
         OR (p_driver = '(غير معروف)' AND cardinality(l.driver_names) = 0)
         OR p_driver = ANY(l.driver_names))
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
     OR EXISTS (SELECT 1 FROM unnest(c.driver_names) dn WHERE dn ILIKE '%'||btrim(p_search)||'%')
     OR COALESCE(c.salesperson,'') ILIKE '%'||btrim(p_search)||'%'
),
prev AS (
  SELECT l.* FROM labelled l
  WHERE l.scheduled_at >= p_from - (p_to - p_from) AND l.scheduled_at < p_from
    AND (p_warehouse   IS NULL OR l.warehouse_name = p_warehouse)
    AND (p_governorate IS NULL OR l.governorate    = p_governorate)
    AND (p_driver      IS NULL
         OR (p_driver = '(غير معروف)' AND cardinality(l.driver_names) = 0)
         OR p_driver = ANY(l.driver_names))
    AND (p_salesperson IS NULL OR COALESCE(l.salesperson,'(غير محدد)') = p_salesperson)
),
opts AS (
  SELECT COALESCE(dr.driver_names[1],'(غير معروف)')          AS driver,
         COALESCE(dr.salesperson,'(غير محدد)')               AS salesperson,
         COALESCE(dr.governorate,'(غير محدد)')              AS governorate,
         COALESCE(NULLIF(dr.warehouse_name,''),'(غير محدد)') AS warehouse
  FROM driver_resolved dr
  WHERE NOT dr.is_return_shipment
    AND dr.delivery_phase <> 'cancelled'
    AND dr.shipment_status <> 'CANCELLED'
    AND dr.completed_at IS NOT NULL
),
g AS (
  SELECT
    count(*) AS delivered,
    count(*) FILTER (WHERE verifiable) AS verifiable,
    count(*) FILTER (WHERE NOT verifiable) AS unverifiable,
    count(*) FILTER (WHERE otif_state = 'otif') AS otif,
    count(*) FILTER (WHERE in_full) AS in_full,
    count(*) FILTER (WHERE on_time) AS on_time,
    count(*) FILTER (WHERE cardinality(driver_names) = 0) AS no_driver,
    count(*) FILTER (WHERE cardinality(driver_names) > 1) AS co_driver_shipments,
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
         count(*) FILTER (WHERE otif_state='otif') AS otif,
         count(*) FILTER (WHERE in_full) AS in_full,
         count(*) FILTER (WHERE on_time) AS on_time
  FROM prev
)
SELECT jsonb_build_object(
  'scope', jsonb_build_object('from', p_from, 'to', p_to,
     'days', round(EXTRACT(EPOCH FROM (p_to - p_from))/86400.0)::int),
  'kpis', jsonb_build_object(
     'delivered', g.delivered, 'verifiable', g.verifiable,
     'otif', g.otif, 'in_full', g.in_full, 'on_time', g.on_time,
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
     'co_driver_shipments', g.co_driver_shipments,
     'no_governorate', g.no_governorate,
     'no_governorate_pct', round(100.0*g.no_governorate/NULLIF(g.delivered,0),1),
     'test_driver', g.test_driver, 'no_ref', g.no_ref,
     'no_salesperson', g.no_salesperson,
     'no_salesperson_pct', round(100.0*g.no_salesperson/NULLIF(g.delivered,0),1)),
  'filter_options', jsonb_build_object(
     'drivers', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'value', t.driver, 'shipments', t.n) ORDER BY t.n DESC), '[]'::jsonb)
                 FROM (SELECT driver, count(*) AS n FROM opts GROUP BY 1) t),
     'salespersons', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'value', t.salesperson, 'shipments', t.n) ORDER BY t.n DESC), '[]'::jsonb)
                 FROM (SELECT salesperson, count(*) AS n FROM opts GROUP BY 1) t),
     'governorates', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'value', t.governorate, 'shipments', t.n) ORDER BY t.n DESC), '[]'::jsonb)
                 FROM (SELECT governorate, count(*) AS n FROM opts GROUP BY 1) t),
     'warehouses', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'value', t.warehouse, 'shipments', t.n) ORDER BY t.n DESC), '[]'::jsonb)
                 FROM (SELECT warehouse, count(*) AS n FROM opts GROUP BY 1) t)),
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
                   'driver_names', to_jsonb(r.driver_names),
                   'co_drivers', greatest(cardinality(r.driver_names) - 1, 0),
                   'salesperson', r.salesperson,
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
$body$;

GRANT EXECUTE ON FUNCTION public.otif_analytics(timestamptz, timestamptz, text, text, text, text, text, int, int, text) TO anon, authenticated, service_role;
