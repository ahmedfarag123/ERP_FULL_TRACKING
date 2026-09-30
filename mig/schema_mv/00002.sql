DROP MATERIALIZED VIEW IF EXISTS "public"."mv_agent_monthly_facts";
CREATE MATERIALIZED VIEW "public"."mv_agent_monthly_facts" AS
 WITH month_grid AS (
         SELECT visits.user_id,
            date_trunc('month'::text, visits.checked_in_at)::date AS month_start
           FROM visits
          WHERE visits.checked_in_at IS NOT NULL
        UNION
         SELECT calls.user_id,
            date_trunc('month'::text, calls.completed_at)::date AS month_start
           FROM calls
          WHERE calls.completed_at IS NOT NULL
        UNION
         SELECT orders.assigned_user_id AS user_id,
            date_trunc('month'::text, orders.order_date)::date AS month_start
           FROM orders
          WHERE orders.order_date IS NOT NULL
        UNION
         SELECT quotations.created_by AS user_id,
            date_trunc('month'::text, quotations.generated_at)::date AS month_start
           FROM quotations
          WHERE quotations.generated_at IS NOT NULL
        UNION
         SELECT sales_targets.user_id,
            date_trunc('month'::text, sales_targets.target_month::timestamp with time zone)::date AS month_start
           FROM sales_targets
          WHERE sales_targets.target_month IS NOT NULL
        ), base AS (
         SELECT g.user_id,
            g.month_start,
            EXTRACT(year FROM g.month_start)::integer AS year,
            EXTRACT(month FROM g.month_start)::integer AS month,
            to_char(g.month_start::timestamp with time zone, 'FMMonth'::text) AS month_name,
            p.role,
            st.target_visits,
            st.target_calls,
            st.target_reachability,
            st.target_quotations,
            st.target_gmv
           FROM month_grid g
             LEFT JOIN sales_targets st ON st.user_id = g.user_id AND date_trunc('month'::text, st.target_month::timestamp with time zone)::date = g.month_start
             LEFT JOIN profiles p ON p.id = g.user_id
        )
 SELECT b.user_id,
    b.month_start,
    b.year,
    b.month,
    b.month_name,
    b.role,
    COALESCE(b.target_visits, 0)::bigint AS target_visits,
    COALESCE(b.target_calls, 0)::bigint AS target_calls,
    b.target_reachability::numeric AS target_reachability,
    COALESCE(b.target_quotations, 0)::bigint AS target_quotations,
    NULL::bigint AS target_orders,
    b.target_gmv::numeric AS target_gmv,
    count(v.id) AS actual_visits,
    count(v.id) FILTER (WHERE v.fraud_status::text IS DISTINCT FROM 'fraudulent'::text AND v.fraud_status::text IS DISTINCT FROM 'suspicious'::text AND v.visit_result IS DISTINCT FROM 'cancelled'::text) AS successful_visits,
    count(v.id) FILTER (WHERE v.fraud_status::text = 'suspicious'::text) AS suspicious_visits,
    count(v.id) FILTER (WHERE v.fraud_status::text = 'fraudulent'::text) AS fraudulent_visits,
    count(v.id) FILTER (WHERE v.visit_result = 'cancelled'::text) AS cancelled_visits,
    avg(EXTRACT(epoch FROM v.completed_at - v.checked_in_at)) AS avg_visit_duration_seconds,
    count(c.id) AS actual_calls,
    count(c.id) FILTER (WHERE c.call_outcome IS DISTINCT FROM 'unreachable'::text) AS reachable_calls,
    count(q.id) AS actual_quotations,
    count(o.id) AS actual_orders,
    COALESCE(sum(o.amount_total), 0::numeric) AS actual_gmv,
    count(DISTINCT v.customer_id) AS unique_customers,
    count(DISTINCT v.customer_id) FILTER (WHERE v.created_at = (( SELECT min(v2.created_at) AS min
           FROM visits v2
          WHERE v2.customer_id = v.customer_id))) AS new_customers,
    count(DISTINCT v.customer_id) FILTER (WHERE v.created_at > (( SELECT min(v2.created_at) AS min
           FROM visits v2
          WHERE v2.customer_id = v.customer_id))) AS returning_customers,
    COALESCE(sum(o.margin), 0::numeric) AS gross_profit,
        CASE
            WHEN count(o.id) = 0 THEN NULL::numeric
            ELSE COALESCE(sum(o.margin) / NULLIF(sum(o.amount_total), 0::numeric), 0::numeric)
        END AS gross_margin
   FROM base b
     LEFT JOIN visits v ON v.user_id = b.user_id AND v.checked_in_at >= b.month_start AND v.checked_in_at < (b.month_start + '1 mon'::interval)
     LEFT JOIN calls c ON c.user_id = b.user_id AND c.completed_at >= b.month_start AND c.completed_at < (b.month_start + '1 mon'::interval)
     LEFT JOIN quotations q ON q.created_by = b.user_id AND q.generated_at >= b.month_start AND q.generated_at < (b.month_start + '1 mon'::interval)
     LEFT JOIN orders o ON o.assigned_user_id = b.user_id AND o.order_date >= b.month_start AND o.order_date < (b.month_start + '1 mon'::interval)
  GROUP BY b.user_id, b.month_start, b.year, b.month, b.month_name, b.role, b.target_visits, b.target_calls, b.target_reachability, b.target_quotations, b.target_gmv WITH NO DATA;
