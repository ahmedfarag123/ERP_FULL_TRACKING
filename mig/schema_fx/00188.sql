-- 00188: Customer-service analytics in ONE uncapped round trip.
-- Read-only. Replaces 6 capped PostgREST queries + a capped product walk in the app.
-- delivery_key: raw_payload->'delivery_status_xl' (the Excel) is authoritative.
-- order_delivery_documents.picking_state is deliberately NOT used: it tracks
-- warehouse picking, not returns (orders with a full return still show picking='done').
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
),
dlv AS (
  SELECT tk.id, tk.order_id, tk.scope, tk.subject, tk.status, tk.category,
         tk.created_at, tk.resolved_at, tk.closed_at,
         tk.created_by_full_name, tk.assigned_to_full_name, tk.assigned_departments,
         COALESCE(tk.raw_payload->>'customer_name','') AS customer_full_name,
         (tk.status IN ('resolved','closed') OR tk.resolved_at IS NOT NULL OR tk.closed_at IS NOT NULL) AS is_resolved,
         CASE
           WHEN COALESCE(tk.raw_payload->>'delivery_status_xl','') <> '' THEN
             CASE tk.raw_payload->>'delivery_status_xl'
               WHEN 'بالكامل' THEN 'full'
               WHEN 'مرتجع جزئى' THEN 'partial'
               WHEN 'مرتجع كلى بعد الوصول' THEN 'cancelled'
               WHEN 'مرتجع كلى قبل الوصول' THEN 'cancelled'
               WHEN 'مرتجع كلى' THEN 'cancelled'
               WHEN 'مرتجع كلي' THEN 'cancelled'
               WHEN 'الغاء' THEN 'cancelled'
               WHEN 'مرتجع' THEN 'cancelled'
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
  'deliveryLabels','{"full":"تم بالكامل","partial":"ارجاع جزئي","cancelled":"ارجاع كلي","pending":"قيد الانتظار","other_delivery":"أخرى","unknown":"غير معروف"}'::jsonb,
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

GRANT EXECUTE ON FUNCTION public.cs_analytics(timestamptz, timestamptz) TO anon, authenticated, service_role;
