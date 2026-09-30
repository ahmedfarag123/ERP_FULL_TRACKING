CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_date_from date DEFAULT (CURRENT_DATE - 30), p_date_to date DEFAULT CURRENT_DATE, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_scope_user uuid;
  v_month date;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    raise exception 'Authentication required';
  END IF;

  v_role := public.current_app_role();
  v_month := date_trunc('month', coalesce(p_date_to, current_date))::date;

  IF v_role IN ('sales_agent', 'telesales') THEN
    v_scope_user := auth.uid();
  ELSE
    v_scope_user := p_user_id;
  END IF;

  WITH
  visit_stats AS (
    SELECT
      count(*)::int AS visits,
      count(distinct customer_id)::int AS unique_customers,
      count(*) filter (where fraud_status = 'suspicious')::int AS suspicious_visits,
      count(*) filter (where fraud_status = 'fraudulent')::int AS fraudulent_visits
    FROM public.visits
    WHERE checked_in_at >= p_date_from::timestamp
      AND checked_in_at < (p_date_to + 1)::timestamp
      AND (v_scope_user IS NULL OR user_id = v_scope_user)
  ),
  call_stats AS (
    SELECT
      count(*)::int AS calls,
      count(*) filter (where public.is_reachable_call(call_outcome))::int AS reachable_calls
    FROM public.calls
    WHERE coalesce(completed_at, started_at, created_at) >= p_date_from::timestamp
      AND coalesce(completed_at, started_at, created_at) < (p_date_to + 1)::timestamp
      AND (v_scope_user IS NULL OR user_id = v_scope_user)
  ),
  order_stats AS (
    SELECT
      count(*)::int AS orders,
      coalesce(sum(total_amount), 0)::numeric(14,2) AS gmv
    FROM public.orders o
    LEFT JOIN public.profiles p ON p.odoo_user_id = o.user_id
    WHERE order_date >= p_date_from::timestamp
      AND order_date < (p_date_to + 1)::timestamp
      AND (v_scope_user IS NULL OR COALESCE(o.assigned_user_id, p.id) = v_scope_user)
  ),
  quotation_stats AS (
    SELECT
      count(*)::int AS quotations
    FROM public.quotations
    WHERE generated_at >= p_date_from::timestamp
      AND generated_at < (p_date_to + 1)::timestamp
      AND (v_scope_user IS NULL OR created_by = v_scope_user)
  ),
  target_stats AS (
    SELECT
      coalesce(sum(target_visits), 0)::int AS target_visits,
      coalesce(sum(target_calls), 0)::int AS target_calls,
      coalesce(sum(target_reachability), 0)::numeric(8,2) AS target_reachability,
      coalesce(sum(target_gmv), 0)::numeric(14,2) AS target_gmv,
      coalesce(sum(target_quotations), 0)::int AS target_quotations
    FROM public.sales_targets
    WHERE target_month = v_month
      AND (v_scope_user IS NULL OR user_id = v_scope_user)
  )
  SELECT jsonb_build_object(
    'date_from', p_date_from,
    'date_to', p_date_to,
    'scope_user_id', v_scope_user,
    'visits', vs.visits,
    'unique_customers', vs.unique_customers,
    'suspicious_visits', vs.suspicious_visits,
    'fraudulent_visits', vs.fraudulent_visits,
    'calls', cs.calls,
    'reachable_calls', cs.reachable_calls,
    'reachability_rate',
      CASE
        WHEN cs.calls = 0 THEN 0
        ELSE round((cs.reachable_calls::numeric / cs.calls::numeric) * 100, 2)
      END,
    'orders', os.orders,
    'gmv', os.gmv,
    'quotations', qs.quotations,
    'targets', jsonb_build_object(
      'target_visits', ts.target_visits,
      'target_calls', ts.target_calls,
      'target_reachability', ts.target_reachability,
      'target_gmv', ts.target_gmv,
      'target_quotations', ts.target_quotations
    ),
    'notifications_unread', public.get_unread_notification_count()
  )
  INTO v_result
  FROM visit_stats vs, call_stats cs, order_stats os, quotation_stats qs, target_stats ts;

  RETURN v_result;
END;
$function$;
