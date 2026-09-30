CREATE OR REPLACE FUNCTION public.get_individual_kpi_per_agent(p_date_from date, p_date_to date)
 RETURNS TABLE(profile_id uuid, full_name text, role text, job_title text, department text, department_slug text, kpi_code text, kpi_name_en text, kpi_name_ar text, actual_value numeric, target_value numeric, unit text, weight numeric, frequency text, direction text)
 LANGUAGE sql
 STABLE
AS $function$
WITH
period AS (
  SELECT p_date_from::date AS f, p_date_to::date AS t
),
prior AS (
  SELECT (p.f - ((p.t - p.f) + 1))::date AS f, (p.f - 1)::date AS t
  FROM period p
),
wd AS (
  SELECT count(*)::numeric AS n
  FROM generate_series((SELECT f FROM period), (SELECT t FROM period), interval '1 day') d(day)
  WHERE extract(isodow FROM d.day) <= 5
),
excluded_profiles AS (
  SELECT p.id
  FROM public.profiles p
  WHERE p.job_title = 'test'
     OR p.email ILIKE '%test%'
     OR p.full_name ILIKE '%screenshot%'
     OR p.user_uid = 78 -- karim (admin): ignored
),
defs AS (
  SELECT * FROM (VALUES
    ('IND-TC-01','Tele-Sales Agent','Sales','sales','Calls Productivity','إنتاجية المكالمات','calls/day','Daily','Higher is Better',0.20,45),
    ('IND-TC-02','Tele-Sales Agent','Sales','sales','Order Conversion','تحويل المكالمات لأوردرات','%','Daily / Weekly','Higher is Better',0.25,25),
    ('IND-TC-03','Tele-Sales Agent','Sales','sales','Customer Retention','الحفاظ على العملاء','%','Monthly','Higher is Better',0.20,80),
    ('IND-TC-04','Tele-Sales Agent','Sales','sales','Reactivation','تنشيط العملاء النائمين','customers','Weekly','Higher is Better',0.15,5),
    ('IND-TC-05','Tele-Sales Agent','Sales','sales','Collection Follow-up Quality','جودة متابعة التحصيل','%','Weekly','Higher is Better',0.10,95),
    ('IND-TC-06','Tele-Sales Agent','Sales','sales','CRM Discipline','الالتزام بتسجيل النشاط','%','Daily','Higher is Better',0.10,95),
    ('IND-OS-01','Outdoor Sales Rep','Sales','sales','Visit Achievement','تحقيق الزيارات','visits/day','Daily','Higher is Better',0.20,15),
    ('IND-OS-02','Outdoor Sales Rep','Sales','sales','New Customers','عملاء جدد','customers','Weekly / Monthly','Higher is Better',0.20,10),
    ('IND-OS-03','Outdoor Sales Rep','Sales','sales','Sales Achievement','تحقيق المبيعات','%','Monthly','Higher is Better',0.25,100),
    ('IND-OS-04','Outdoor Sales Rep','Sales','sales','Conversion Rate','نسبة التحويل','%','Weekly','Higher is Better',0.15,25),
    ('IND-OS-05','Outdoor Sales Rep','Sales','sales','Collection Support','دعم التحصيل','%','Weekly','Higher is Better',0.10,95),
    ('IND-OS-06','Outdoor Sales Rep','Sales','sales','Customer Satisfaction','رضا العملاء','%','Monthly','Higher is Better',0.10,85),
    ('IND-DR-01','Driver / Delivery Rep','Delivery','delivery','On-Time Delivery','التسليم في الموعد','%','Daily','Higher is Better',0.25,90),
    ('IND-DR-02','Driver / Delivery Rep','Delivery','delivery','Delivered Orders','الطلبات المسلمة','orders/day','Daily','Higher is Better',0.20,20),
    ('IND-DR-03','Driver / Delivery Rep','Delivery','delivery','Cash Collection Accuracy','دقة تحصيل الكاش','%','Daily','Higher is Better',0.25,100),
    ('IND-DR-04','Driver / Delivery Rep','Delivery','delivery','Returned Orders','المرتجعات','%','Weekly','Lower is Better',0.10,3),
    ('IND-DR-05','Driver / Delivery Rep','Delivery','delivery','Vehicle/Route Discipline','الالتزام بخط السير','%','Daily','Higher is Better',0.10,90),
    ('IND-DR-06','Driver / Delivery Rep','Delivery','delivery','Customer Rating','تقييم العميل','%','Weekly','Higher is Better',0.10,85),
    ('IND-WH-01','Warehouse Worker','Warehouse','warehouse','Picking Accuracy','دقة التجهيز','%','Daily','Higher is Better',0.35,98),
    ('IND-WH-02','Warehouse Worker','Warehouse','warehouse','Productivity','الإنتاجية','items/shift','Daily','Higher is Better',0.20,40),
    ('IND-WH-03','Warehouse Worker','Warehouse','warehouse','Damage Control','تقليل التالف','%','Weekly','Lower is Better',0.15,0.5),
    ('IND-WH-04','Warehouse Worker','Warehouse','warehouse','Receiving/Dispatch Discipline','الالتزام بالاستلام والصرف','%','Daily','Higher is Better',0.15,95),
    ('IND-WH-05','Warehouse Worker','Warehouse','warehouse','Attendance & Safety','الحضور والسلامة','%','Monthly','Higher is Better',0.15,95),
    ('IND-CS-01','Customer Service','Quality & CS','quality-customer-service','First Response Time','زمن أول استجابة','hours','Daily','Lower is Better',0.15,2),
    ('IND-CS-02','Customer Service','Quality & CS','quality-customer-service','Complaint Resolution Rate','معدل حل الشكاوى','%','Weekly','Higher is Better',0.20,90),
    ('IND-CS-03','Customer Service','Quality & CS','quality-customer-service','Complaint Resolution Time','وقت حل الشكوى','hours','Weekly','Lower is Better',0.15,24),
    ('IND-CS-04','Customer Service','Quality & CS','quality-customer-service','Closure Accuracy','دقة الإغلاق','%','Monthly','Higher is Better',0.10,95),
    ('IND-CS-05','Customer Service','Quality & CS','quality-customer-service','Complaint Recurrence Rate','نسبة تكرار الشكاوى','%','Monthly','Lower is Better',0.15,10),
    ('IND-CS-06','Customer Service','Quality & CS','quality-customer-service','Customer Satisfaction','رضا العملاء','%','Monthly','Higher is Better',0.25,85)
  ) AS d(kpi_code, role, department, department_slug, kpi_name_en, kpi_name_ar, unit, frequency, direction, weight, target_value)
),


tc_calls AS (
  SELECT c.user_id,
    count(*)::numeric AS calls,
    count(DISTINCT c.customer_id)::numeric AS called_customers,
    count(DISTINCT date_trunc('day', coalesce(c.completed_at, c.started_at, c.created_at)))::numeric AS active_days
  FROM public.calls c
  WHERE coalesce(c.completed_at, c.started_at, c.created_at) >= (SELECT f FROM period)
    AND coalesce(c.completed_at, c.started_at, c.created_at) < (SELECT t FROM period) + interval '1 day'
  GROUP BY c.user_id
),
odoo_activity AS (
  SELECT p.id AS profile_id,
    count(*) FILTER (WHERE o.activity_type_name = 'Call')::numeric AS odoo_calls,
    count(DISTINCT date_trunc('day', coalesce(o.odoo_created_at, o.created_at)))::numeric AS odoo_days
  FROM (SELECT * FROM public.odoo_crm_activity_reports WHERE user_id ~ '^[0-9]+$') o
  JOIN public.profiles p ON p.user_uid = o.user_id::integer
  WHERE coalesce(o.odoo_created_at, o.created_at) >= (SELECT f FROM period)
    AND coalesce(o.odoo_created_at, o.created_at) < (SELECT t FROM period) + interval '1 day'
  GROUP BY p.id
),
period_orders AS (
  SELECT DISTINCT o.customer_id
  FROM public.orders o
  WHERE o.customer_id IS NOT NULL
    AND coalesce(o.order_date, o.created_at) >= (SELECT f FROM period)
    AND coalesce(o.order_date, o.created_at) < (SELECT t FROM period) + interval '1 day'
),
prior_orders AS (
  SELECT DISTINCT o.assigned_user_id, o.customer_id
  FROM public.orders o
  WHERE o.assigned_user_id IS NOT NULL AND o.customer_id IS NOT NULL
    AND coalesce(o.order_date, o.created_at) >= (SELECT f FROM prior)
    AND coalesce(o.order_date, o.created_at) < (SELECT f FROM period)
),
tc_retention AS (
  SELECT pp.assigned_user_id,
    count(DISTINCT pp.customer_id)::numeric AS prior_customers,
    count(DISTINCT CASE WHEN pe.customer_id IS NOT NULL THEN pp.customer_id END)::numeric AS retained
  FROM prior_orders pp
  LEFT JOIN period_orders pe ON pe.customer_id = pp.customer_id
  GROUP BY pp.assigned_user_id
),
reactivated AS (
  SELECT DISTINCT o.assigned_user_id, o.customer_id
  FROM public.orders o
  WHERE o.assigned_user_id IS NOT NULL AND o.customer_id IS NOT NULL
    AND coalesce(o.order_date, o.created_at) >= (SELECT f FROM period)
    AND coalesce(o.order_date, o.created_at) < (SELECT t FROM period) + interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM public.orders o2
      WHERE o2.customer_id = o.customer_id
        AND coalesce(o2.order_date, o2.created_at) >= (SELECT f FROM period) - interval '60 days'
        AND coalesce(o2.order_date, o2.created_at) < (SELECT f FROM period)
    )
),
tc_converted AS (
  SELECT DISTINCT c.user_id, c.customer_id
  FROM public.calls c
  JOIN period_orders pe ON pe.customer_id = c.customer_id
  WHERE c.user_id IS NOT NULL AND c.customer_id IS NOT NULL
    AND coalesce(c.completed_at, c.started_at, c.created_at) >= (SELECT f FROM period)
    AND coalesce(c.completed_at, c.started_at, c.created_at) < (SELECT t FROM period) + interval '1 day'
),
due_customers AS (
  SELECT DISTINCT o.assigned_user_id AS owner_id, o.customer_id
  FROM public.order_invoice_documents i
  JOIN public.orders o ON o.id = i.order_id
  WHERE i.invoice_state = 'posted'
    AND i.payment_state IN ('not_paid','partial')
    AND (i.invoice_date <= (SELECT t FROM period) OR i.invoice_date IS NULL)
    AND o.assigned_user_id IS NOT NULL AND o.customer_id IS NOT NULL
),
followed_up AS (
  SELECT DISTINCT dc.owner_id, dc.customer_id
  FROM due_customers dc
  WHERE EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.customer_id = dc.customer_id
      AND coalesce(c.completed_at, c.started_at, c.created_at) >= (SELECT f FROM period)
      AND coalesce(c.completed_at, c.started_at, c.created_at) < (SELECT t FROM period) + interval '1 day'
  )
  OR EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.customer_id = dc.customer_id
      AND v.checked_in_at >= (SELECT f FROM period)
      AND v.checked_in_at < (SELECT t FROM period) + interval '1 day'
  )
),
tc_activity_days AS (
  SELECT user_id, count(*)::numeric AS active_days
  FROM (
    SELECT c.user_id, date_trunc('day', coalesce(c.completed_at, c.started_at, c.created_at)) AS day FROM public.calls c
    UNION
    SELECT v.user_id, date_trunc('day', v.checked_in_at) FROM public.visits v
    UNION
    SELECT p.id, date_trunc('day', coalesce(o.odoo_created_at, o.created_at))
    FROM (SELECT * FROM public.odoo_crm_activity_reports WHERE user_id ~ '^[0-9]+$') o
    JOIN public.profiles p ON p.user_uid = o.user_id::integer
  ) a
  WHERE a.day >= (SELECT f FROM period)
    AND a.day < (SELECT t FROM period) + interval '1 day'
  GROUP BY user_id
),
os_visits AS (
  SELECT v.user_id,
    count(*)::numeric AS visits,
    count(DISTINCT v.customer_id)::numeric AS visited_customers
  FROM public.visits v
  WHERE v.checked_in_at >= (SELECT f FROM period)
    AND v.checked_in_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY v.user_id
),
os_converted AS (
  SELECT DISTINCT v.user_id, v.customer_id
  FROM public.visits v
  JOIN period_orders pe ON pe.customer_id = v.customer_id
  WHERE v.user_id IS NOT NULL AND v.customer_id IS NOT NULL
    AND v.checked_in_at >= (SELECT f FROM period)
    AND v.checked_in_at < (SELECT t FROM period) + interval '1 day'
),
first_orders AS (
  SELECT DISTINCT ON (o.customer_id) o.customer_id, o.assigned_user_id,
         coalesce(o.order_date, o.created_at) AS first_order_at
  FROM public.orders o
  WHERE o.customer_id IS NOT NULL AND o.assigned_user_id IS NOT NULL
  ORDER BY o.customer_id, coalesce(o.order_date, o.created_at)
),
os_new_customers AS (
  SELECT fo.assigned_user_id AS owner_id, count(*)::numeric AS new_customers
  FROM first_orders fo
  WHERE fo.first_order_at >= (SELECT f FROM period)
    AND fo.first_order_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY fo.assigned_user_id
),
os_sales AS (
  SELECT o.assigned_user_id, coalesce(sum(o.total_amount), 0)::numeric AS gmv
  FROM public.orders o
  WHERE o.assigned_user_id IS NOT NULL AND o.state = 'sale'
    AND coalesce(o.order_date, o.created_at) >= (SELECT f FROM period)
    AND coalesce(o.order_date, o.created_at) < (SELECT t FROM period) + interval '1 day'
  GROUP BY o.assigned_user_id
),
sales_targets_agg AS (
  SELECT user_id, coalesce(sum(target_gmv), 0)::numeric AS target_gmv
  FROM public.sales_targets
  WHERE target_month >= date_trunc('month', (SELECT f FROM period))::date
    AND target_month <= date_trunc('month', (SELECT t FROM period))::date
  GROUP BY user_id
),
dr_shipments AS (
  SELECT s.assigned_profile_id,
    count(*)::numeric AS total,
    count(*) FILTER (WHERE s.shipment_status IN ('DELIVERED','FINISHED','SETTLED'))::numeric AS delivered,
    count(*) FILTER (WHERE s.shipment_status IN ('DELIVERED','FINISHED','SETTLED')
                       AND (s.scheduled_at IS NULL OR s.completed_at <= s.scheduled_at))::numeric AS on_time,
    count(*) FILTER (WHERE s.shipment_status <> 'PENDING_ASSIGN')::numeric AS progressed
  FROM public.logistics_shipments s
  WHERE s.assigned_profile_id IS NOT NULL AND s.is_return_shipment IS NOT TRUE
    AND s.created_at >= (SELECT f FROM period)
    AND s.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY s.assigned_profile_id
),
dr_returns AS (
  SELECT coalesce(r.assigned_profile_id, parent.assigned_profile_id) AS assigned_profile_id,
    count(*)::numeric AS returned
  FROM public.logistics_shipments r
  LEFT JOIN public.logistics_shipments parent ON parent.id = r.parent_shipment_id
  WHERE r.is_return_shipment IS TRUE
    AND r.created_at >= (SELECT f FROM period)
    AND r.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY 1
),
dr_collections AS (
  SELECT s.assigned_profile_id,
    sum(c.order_total)::numeric AS expected,
    sum(c.collected_amount)::numeric AS collected
  FROM public.logistics_order_collections c
  JOIN public.logistics_shipments s ON s.id::text = c.shipment_id
  WHERE c.payment_method = 'cash'
    AND c.collection_status IN ('collected','confirmed')
    AND c.created_at >= (SELECT f FROM period)
    AND c.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY s.assigned_profile_id
),
dr_overall AS (
  SELECT
    count(*)::numeric AS total,
    count(*) FILTER (WHERE s.shipment_status IN ('DELIVERED','FINISHED','SETTLED'))::numeric AS delivered,
    count(*) FILTER (WHERE s.shipment_status IN ('DELIVERED','FINISHED','SETTLED')
                       AND (s.scheduled_at IS NULL OR s.completed_at <= s.scheduled_at))::numeric AS on_time,
    count(*) FILTER (WHERE s.shipment_status <> 'PENDING_ASSIGN')::numeric AS progressed
  FROM public.logistics_shipments s
  WHERE s.assigned_profile_id IS NOT NULL AND s.is_return_shipment IS NOT TRUE
    AND s.created_at >= (SELECT f FROM period)
    AND s.created_at < (SELECT t FROM period) + interval '1 day'
),
dr_returns_overall AS (
  SELECT count(*)::numeric AS returned
  FROM public.logistics_shipments r
  WHERE r.is_return_shipment IS TRUE
    AND r.created_at >= (SELECT f FROM period)
    AND r.created_at < (SELECT t FROM period) + interval '1 day'
),
dr_collections_overall AS (
  SELECT sum(c.order_total)::numeric AS expected,
    sum(c.collected_amount)::numeric AS collected
  FROM public.logistics_order_collections c
  JOIN public.logistics_shipments s ON s.id::text = c.shipment_id
  WHERE c.payment_method = 'cash'
    AND c.collection_status IN ('collected','confirmed')
    AND c.created_at >= (SELECT f FROM period)
    AND c.created_at < (SELECT t FROM period) + interval '1 day'
),
wh_picks AS (
  SELECT dp.dispatcher_profile_id,
    count(dpi.id)::numeric AS total_items,
    count(dpi.id) FILTER (WHERE dpi.status = 'ready')::numeric AS ready_items,
    count(dpi.id) FILTER (WHERE dpi.shortage_reason = 'damaged')::numeric AS damaged_items
  FROM public.dispatcher_plan_item_preparations dpi
  JOIN public.dispatcher_plan_preparations dp ON dp.id = dpi.plan_preparation_id
  WHERE dp.dispatcher_profile_id IS NOT NULL
    AND dpi.created_at >= (SELECT f FROM period)
    AND dpi.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY dp.dispatcher_profile_id
),
wh_dispatch AS (
  SELECT dp.dispatcher_profile_id,
    count(DISTINCT s.id)::numeric AS total_shipments,
    count(DISTINCT CASE WHEN r.parent_shipment_id IS NOT NULL THEN s.id END)::numeric AS returned_shipments
  FROM public.dispatcher_plan_preparations dp
  JOIN public.logistics_shipments s ON s.plan_id = dp.plan_id
  LEFT JOIN public.logistics_return_shipment_items r ON r.parent_shipment_id = s.id
  WHERE dp.dispatcher_profile_id IS NOT NULL
    AND s.shipment_status NOT IN ('PENDING_ASSIGN','CANCELLED')
    AND s.created_at >= (SELECT f FROM period)
    AND s.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY dp.dispatcher_profile_id
),
wh_preps AS (
  SELECT dp.dispatcher_profile_id,
    count(*)::numeric AS total,
    count(*) FILTER (WHERE dp.completed_at IS NOT NULL AND dp.status <> 'cancelled')::numeric AS completed
  FROM public.dispatcher_plan_preparations dp
  WHERE dp.dispatcher_profile_id IS NOT NULL
    AND dp.created_at >= (SELECT f FROM period)
    AND dp.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY dp.dispatcher_profile_id
),
cs_tickets AS (
  SELECT t.created_by AS agent_id,
    count(*)::numeric AS total,
    count(*) FILTER (WHERE t.status = 'resolved')::numeric AS resolved,
    count(*) FILTER (WHERE t.closed_at IS NOT NULL)::numeric AS closed,
    count(DISTINCT t.customer_id)::numeric AS ticket_customers
  FROM public.order_tickets t
  WHERE t.created_by IS NOT NULL
    AND t.created_at >= (SELECT f FROM period)
    AND t.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY t.created_by
),
cs_repeat AS (
  SELECT t.created_by AS agent_id, count(DISTINCT t.customer_id)::numeric AS repeat_customers
  FROM public.order_tickets t
  WHERE t.created_by IS NOT NULL AND t.customer_id IS NOT NULL
    AND t.created_at >= (SELECT f FROM period)
    AND t.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY t.created_by, t.customer_id
  HAVING count(*) > 1
),
cs_first_response AS (
  SELECT t.created_by AS agent_id,
    avg(EXTRACT(EPOCH FROM (c2.first_comment_at - t.created_at)) / 3600)::numeric AS first_response_hours
  FROM public.order_tickets t
  JOIN LATERAL (
    SELECT created_at AS first_comment_at
    FROM public.order_ticket_comments c
    WHERE c.ticket_id = t.id
    ORDER BY c.created_at
    LIMIT 1
  ) c2 ON true
  WHERE t.created_by IS NOT NULL
    AND t.created_at >= (SELECT f FROM period)
    AND t.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY t.created_by
),
cs_resolution AS (
  SELECT t.created_by AS agent_id,
    avg(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600)::numeric AS resolution_hours
  FROM public.order_tickets t
  WHERE t.created_by IS NOT NULL AND t.resolved_at IS NOT NULL
    AND t.created_at >= (SELECT f FROM period)
    AND t.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY t.created_by
),

branch_telesales AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-TC-01' THEN round((tc_calls.calls + coalesce(odoo_activity.odoo_calls, 0)) / wd.n, 2)
      WHEN 'IND-TC-02' THEN round(
        (SELECT count(*)::numeric FROM tc_converted tc WHERE tc.user_id = p.id)
        / nullif(tc_calls.called_customers, 0) * 100, 2)
      WHEN 'IND-TC-03' THEN round(tr.retained / nullif(tr.prior_customers, 0) * 100, 2)
      WHEN 'IND-TC-04' THEN (SELECT count(*) FROM reactivated r WHERE r.assigned_user_id = p.id)::numeric
      WHEN 'IND-TC-05' THEN round(
        (SELECT count(DISTINCT fu.customer_id)::numeric FROM followed_up fu WHERE fu.owner_id = p.id)
        / nullif((SELECT count(DISTINCT dc.customer_id)::numeric FROM due_customers dc WHERE dc.owner_id = p.id), 0) * 100, 2)
      WHEN 'IND-TC-06' THEN round(tc_activity_days.active_days / wd.n * 100, 2)
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN tc_calls ON tc_calls.user_id = p.id
  LEFT JOIN odoo_activity ON odoo_activity.profile_id = p.id
  LEFT JOIN tc_retention tr ON tr.assigned_user_id = p.id
  LEFT JOIN tc_activity_days ON tc_activity_days.user_id = p.id
  WHERE p.job_title = 'telesales' AND p.status = 'active' AND d.role = 'Tele-Sales Agent'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
    AND (tc_calls.user_id IS NOT NULL OR odoo_activity.profile_id IS NOT NULL)
),

branch_outdoor AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-OS-01' THEN round(os_visits.visits / wd.n, 2)
      WHEN 'IND-OS-02' THEN os_new_customers.new_customers
      WHEN 'IND-OS-03' THEN round(os_sales.gmv / nullif(sta.target_gmv, 0) * 100, 2)
      WHEN 'IND-OS-04' THEN round(
        (SELECT count(*)::numeric FROM os_converted oc WHERE oc.user_id = p.id)
        / nullif(os_visits.visited_customers, 0) * 100, 2)
      WHEN 'IND-OS-05' THEN round(
        (SELECT count(DISTINCT fu.customer_id)::numeric FROM followed_up fu WHERE fu.owner_id = p.id)
        / nullif((SELECT count(DISTINCT dc.customer_id)::numeric FROM due_customers dc WHERE dc.owner_id = p.id), 0) * 100, 2)
      WHEN 'IND-OS-06' THEN NULL
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN os_visits ON os_visits.user_id = p.id
  LEFT JOIN os_new_customers ON os_new_customers.owner_id = p.id
  LEFT JOIN os_sales ON os_sales.assigned_user_id = p.id
  LEFT JOIN sales_targets_agg sta ON sta.user_id = p.id
  WHERE p.job_title = 'sales' AND p.status = 'active' AND d.role = 'Outdoor Sales Rep'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
    AND (os_visits.user_id IS NOT NULL OR os_sales.assigned_user_id IS NOT NULL OR os_new_customers.owner_id IS NOT NULL)
),

branch_driver AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-DR-01' THEN round(ds.on_time / nullif(ds.delivered, 0) * 100, 2)
      WHEN 'IND-DR-02' THEN round(ds.delivered / wd.n, 2)
      WHEN 'IND-DR-03' THEN round(dc.collected / nullif(dc.expected, 0) * 100, 2)
      WHEN 'IND-DR-04' THEN round(dr.returned / nullif(ds.delivered, 0) * 100, 2)
      WHEN 'IND-DR-05' THEN round(ds.progressed / nullif(ds.total, 0) * 100, 2)
      WHEN 'IND-DR-06' THEN NULL
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN dr_shipments ds ON ds.assigned_profile_id = p.id
  LEFT JOIN dr_returns dr ON dr.assigned_profile_id = p.id
  LEFT JOIN dr_collections dc ON dc.assigned_profile_id = p.id
  WHERE p.job_title = 'driver' AND p.status = 'active' AND d.role = 'Driver / Delivery Rep'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
    AND NOT EXISTS (
      SELECT 1 FROM public.dispatcher_plan_item_preparations dpi2
      JOIN public.dispatcher_plan_preparations dp2 ON dp2.id = dpi2.plan_preparation_id
      WHERE dp2.dispatcher_profile_id = p.id
    )
    AND (ds.assigned_profile_id IS NOT NULL OR dr.assigned_profile_id IS NOT NULL OR dc.assigned_profile_id IS NOT NULL)
),
branch_driver_overall AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-DR-01' THEN round(dr_o.on_time / nullif(dr_o.delivered, 0) * 100, 2)
      WHEN 'IND-DR-02' THEN round(dr_o.delivered / wd.n, 2)
      WHEN 'IND-DR-03' THEN round(dr_co.collected / nullif(dr_co.expected, 0) * 100, 2)
      WHEN 'IND-DR-04' THEN round(dr_r.returned / nullif(dr_o.delivered, 0) * 100, 2)
      WHEN 'IND-DR-05' THEN round(dr_o.progressed / nullif(dr_o.total, 0) * 100, 2)
      WHEN 'IND-DR-06' THEN NULL
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  CROSS JOIN dr_overall dr_o
  CROSS JOIN dr_returns_overall dr_r
  CROSS JOIN dr_collections_overall dr_co
  WHERE p.full_name = 'Hassan el sheikh' AND p.status = 'active' AND d.role = 'Driver / Delivery Rep'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
),

branch_warehouse_dispatcher AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-WH-01' THEN round(
        (wh_dispatch.total_shipments - coalesce(wh_dispatch.returned_shipments, 0))
        / nullif(wh_dispatch.total_shipments, 0) * 100, 2)
      WHEN 'IND-WH-02' THEN round(wp.total_items / wd.n, 2)
      WHEN 'IND-WH-03' THEN round(wp.damaged_items / nullif(wp.total_items, 0) * 100, 2)
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN wh_picks wp ON wp.dispatcher_profile_id = p.id
  LEFT JOIN wh_dispatch ON wh_dispatch.dispatcher_profile_id = p.id
  WHERE p.status = 'active' AND d.role = 'Warehouse Worker' AND d.kpi_code IN ('IND-WH-01','IND-WH-02','IND-WH-03')
    AND p.job_title = 'driver' -- dispatcher role (mahmoud)
    AND EXISTS (
      SELECT 1 FROM public.dispatcher_plan_item_preparations dpi2
      JOIN public.dispatcher_plan_preparations dp2 ON dp2.id = dpi2.plan_preparation_id
      WHERE dp2.dispatcher_profile_id = p.id
        AND dpi2.created_at >= (SELECT f FROM period)
        AND dpi2.created_at < (SELECT t FROM period) + interval '1 day'
    )
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
),
branch_warehouse_plans AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-WH-04' THEN round(wp2.completed / nullif(wp2.total, 0) * 100, 2)
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN wh_preps wp2 ON wp2.dispatcher_profile_id = p.id
  WHERE p.status = 'active' AND d.role = 'Warehouse Worker' AND d.kpi_code = 'IND-WH-04'
    AND p.job_title = 'logistics spv' -- plan creator (Hassan el sheikh)
    AND EXISTS (
      SELECT 1 FROM public.dispatcher_plan_preparations dp2
      WHERE dp2.dispatcher_profile_id = p.id
        AND dp2.created_at >= (SELECT f FROM period)
        AND dp2.created_at < (SELECT t FROM period) + interval '1 day'
    )
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
),

branch_customer_service AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-CS-01' THEN round(cs_fr.first_response_hours, 2)
      WHEN 'IND-CS-02' THEN round(cs_t.resolved / nullif(cs_t.total, 0) * 100, 2)
      WHEN 'IND-CS-03' THEN round(cs_r2.resolution_hours, 2)
      WHEN 'IND-CS-04' THEN round(cs_t.closed / nullif(cs_t.resolved, 0) * 100, 2)
      WHEN 'IND-CS-05' THEN round(
        (SELECT coalesce(sum(rc.repeat_customers), 0)::numeric FROM cs_repeat rc WHERE rc.agent_id = p.id)
        / nullif(cs_t.ticket_customers, 0) * 100, 2)
      WHEN 'IND-CS-06' THEN NULL
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN cs_tickets cs_t ON cs_t.agent_id = p.id
  LEFT JOIN cs_first_response cs_fr ON cs_fr.agent_id = p.id
  LEFT JOIN cs_resolution cs_r2 ON cs_r2.agent_id = p.id
  WHERE p.job_title ILIKE 'customer service%' AND p.status = 'active' AND d.role = 'Customer Service'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
    AND (cs_t.agent_id IS NOT NULL)
)

SELECT * FROM branch_telesales
UNION ALL
SELECT * FROM branch_outdoor
UNION ALL
SELECT * FROM branch_driver
UNION ALL
SELECT * FROM branch_driver_overall
UNION ALL
SELECT * FROM branch_warehouse_dispatcher
UNION ALL
SELECT * FROM branch_warehouse_plans
UNION ALL
SELECT * FROM branch_customer_service
ORDER BY department_slug, role, full_name, kpi_code;
$function$;
