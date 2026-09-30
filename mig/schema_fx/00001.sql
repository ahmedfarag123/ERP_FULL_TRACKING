CREATE OR REPLACE VIEW "public"."agent_performance_snapshot" AS
 WITH months AS (
         SELECT sales_targets.user_id,
            sales_targets.target_month
           FROM sales_targets
        UNION
         SELECT visits.user_id,
            date_trunc('month'::text, visits.checked_in_at)::date AS target_month
           FROM visits
        UNION
         SELECT calls.user_id,
            date_trunc('month'::text, COALESCE(calls.completed_at, calls.started_at, calls.created_at))::date AS target_month
           FROM calls
        UNION
         SELECT quotations.created_by AS user_id,
            date_trunc('month'::text, quotations.generated_at)::date AS target_month
           FROM quotations
        UNION
         SELECT COALESCE(o.assigned_user_id, p_1.id) AS user_id,
            date_trunc('month'::text, o.order_date)::date AS target_month
           FROM orders o
             LEFT JOIN profiles p_1 ON p_1.odoo_user_id = o.user_id
          WHERE COALESCE(o.assigned_user_id, p_1.id) IS NOT NULL
        ), visit_metrics AS (
         SELECT visits.user_id,
            date_trunc('month'::text, visits.checked_in_at)::date AS target_month,
            count(*) AS actual_visits,
            count(DISTINCT visits.customer_id) AS unique_customers_visited,
            count(*) FILTER (WHERE visits.fraud_status = 'suspicious'::fraud_status) AS suspicious_visits,
            count(*) FILTER (WHERE visits.fraud_status = 'fraudulent'::fraud_status) AS fraudulent_visits
           FROM visits
          GROUP BY visits.user_id, (date_trunc('month'::text, visits.checked_in_at)::date)
        ), call_metrics AS (
         SELECT calls.user_id,
            date_trunc('month'::text, COALESCE(calls.completed_at, calls.started_at, calls.created_at))::date AS target_month,
            count(*) AS actual_calls,
            count(*) FILTER (WHERE is_reachable_call(calls.call_outcome)) AS reachable_calls
           FROM calls
          GROUP BY calls.user_id, (date_trunc('month'::text, COALESCE(calls.completed_at, calls.started_at, calls.created_at))::date)
        ), quotation_metrics AS (
         SELECT quotations.created_by AS user_id,
            date_trunc('month'::text, quotations.generated_at)::date AS target_month,
            count(*) AS actual_quotations
           FROM quotations
          GROUP BY quotations.created_by, (date_trunc('month'::text, quotations.generated_at)::date)
        ), order_metrics AS (
         SELECT COALESCE(o.assigned_user_id, p_1.id) AS user_id,
            date_trunc('month'::text, o.order_date)::date AS target_month,
            count(*) AS actual_orders,
            COALESCE(sum(o.total_amount), 0::numeric)::numeric(14,2) AS actual_gmv
           FROM orders o
             LEFT JOIN profiles p_1 ON p_1.odoo_user_id = o.user_id
          WHERE COALESCE(o.assigned_user_id, p_1.id) IS NOT NULL
          GROUP BY (COALESCE(o.assigned_user_id, p_1.id)), (date_trunc('month'::text, o.order_date)::date)
        )
 SELECT p.id AS user_id,
    p.full_name,
    p.email,
    p.role,
    m.target_month,
    COALESCE(t.target_visits, 0) AS target_visits,
    COALESCE(t.target_calls, 0) AS target_calls,
    COALESCE(t.target_reachability, 0::numeric) AS target_reachability,
    COALESCE(t.target_gmv, 0::numeric)::numeric(14,2) AS target_gmv,
    COALESCE(t.target_quotations, 0) AS target_quotations,
    COALESCE(vm.actual_visits, 0::bigint) AS actual_visits,
    COALESCE(cm.actual_calls, 0::bigint) AS actual_calls,
        CASE
            WHEN COALESCE(cm.actual_calls, 0::bigint) = 0 THEN 0::numeric(8,2)
            ELSE round(COALESCE(cm.reachable_calls, 0::bigint)::numeric / cm.actual_calls::numeric * 100::numeric, 2)
        END AS actual_reachability,
    COALESCE(qm.actual_quotations, 0::bigint) AS actual_quotations,
    COALESCE(om.actual_orders, 0::bigint) AS actual_orders,
    COALESCE(om.actual_gmv, 0::numeric)::numeric(14,2) AS actual_gmv,
    COALESCE(vm.unique_customers_visited, 0::bigint) AS unique_customers_visited,
    COALESCE(vm.suspicious_visits, 0::bigint) AS suspicious_visits,
    COALESCE(vm.fraudulent_visits, 0::bigint) AS fraudulent_visits
   FROM months m
     JOIN profiles p ON p.id = m.user_id
     LEFT JOIN sales_targets t ON t.user_id = m.user_id AND t.target_month = m.target_month
     LEFT JOIN visit_metrics vm ON vm.user_id = m.user_id AND vm.target_month = m.target_month
     LEFT JOIN call_metrics cm ON cm.user_id = m.user_id AND cm.target_month = m.target_month
     LEFT JOIN quotation_metrics qm ON qm.user_id = m.user_id AND qm.target_month = m.target_month
     LEFT JOIN order_metrics om ON om.user_id = m.user_id AND om.target_month = m.target_month;
