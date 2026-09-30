CREATE OR REPLACE FUNCTION public.get_leaderboard(p_date_from date DEFAULT (CURRENT_DATE - 30), p_date_to date DEFAULT CURRENT_DATE)
 RETURNS TABLE(user_id uuid, full_name text, email citext, role app_role, total_visits bigint, total_calls bigint, reachability_rate numeric, total_orders bigint, total_gmv numeric, total_quotations bigint, suspicious_visits bigint, fraudulent_visits bigint, target_visits integer, target_calls integer, target_reachability numeric, target_gmv numeric, target_quotations integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_month date;
BEGIN
  IF auth.uid() IS NULL THEN
    raise exception 'Authentication required';
  END IF;

  v_month := date_trunc('month', coalesce(p_date_to, current_date))::date;

  RETURN QUERY
  WITH
  visit_stats AS (
    SELECT
      v.user_id,
      count(*)::bigint AS total_visits,
      count(*) filter (where v.fraud_status = 'suspicious')::bigint AS suspicious_visits,
      count(*) filter (where v.fraud_status = 'fraudulent')::bigint AS fraudulent_visits
    FROM public.visits v
    WHERE v.checked_in_at >= p_date_from::timestamp
      AND v.checked_in_at < (p_date_to + 1)::timestamp
    GROUP BY v.user_id
  ),
  call_stats AS (
    SELECT
      c.user_id,
      count(*)::bigint AS total_calls,
      count(*) filter (where public.is_reachable_call(c.call_outcome))::bigint AS reachable_calls
    FROM public.calls c
    WHERE coalesce(c.completed_at, c.started_at, c.created_at) >= p_date_from::timestamp
      AND coalesce(c.completed_at, c.started_at, c.created_at) < (p_date_to + 1)::timestamp
    GROUP BY c.user_id
  ),
  order_stats AS (
    SELECT
      COALESCE(o.assigned_user_id, p.id) AS user_id,
      count(*)::bigint AS total_orders,
      coalesce(sum(o.total_amount), 0)::numeric(14,2) AS total_gmv
    FROM public.orders o
    LEFT JOIN public.profiles p ON p.odoo_user_id = o.user_id
    WHERE COALESCE(o.assigned_user_id, p.id) IS NOT NULL
      AND o.order_date >= p_date_from::timestamp
      AND o.order_date < (p_date_to + 1)::timestamp
    GROUP BY 1
  ),
  quotation_stats AS (
    SELECT
      q.created_by AS user_id,
      count(*)::bigint AS total_quotations
    FROM public.quotations q
    WHERE q.generated_at >= p_date_from::timestamp
      AND q.generated_at < (p_date_to + 1)::timestamp
    GROUP BY q.created_by
  ),
  target_stats AS (
    SELECT
      t.user_id,
      t.target_visits,
      t.target_calls,
      t.target_reachability,
      t.target_gmv,
      t.target_quotations
    FROM public.sales_targets t
    WHERE t.target_month = v_month
  )
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    coalesce(vs.total_visits, 0),
    coalesce(cs.total_calls, 0),
    CASE
      WHEN coalesce(cs.total_calls, 0) = 0 THEN 0::numeric(8,2)
      ELSE round((coalesce(cs.reachable_calls, 0)::numeric / cs.total_calls::numeric) * 100, 2)
    END,
    coalesce(os.total_orders, 0),
    coalesce(os.total_gmv, 0)::numeric(14,2),
    coalesce(qs.total_quotations, 0),
    coalesce(vs.suspicious_visits, 0),
    coalesce(vs.fraudulent_visits, 0),
    coalesce(ts.target_visits, 0),
    coalesce(ts.target_calls, 0),
    coalesce(ts.target_reachability, 0)::numeric(8,2),
    coalesce(ts.target_gmv, 0)::numeric(14,2),
    coalesce(ts.target_quotations, 0)
  FROM public.profiles p
  LEFT JOIN visit_stats vs ON vs.user_id = p.id
  LEFT JOIN call_stats cs ON cs.user_id = p.id
  LEFT JOIN order_stats os ON os.user_id = p.id
  LEFT JOIN quotation_stats qs ON qs.user_id = p.id
  LEFT JOIN target_stats ts ON ts.user_id = p.id
  WHERE p.status = 'active'
  ORDER BY coalesce(os.total_gmv, 0) DESC, coalesce(vs.total_visits, 0) DESC, p.full_name ASC;
END;
$function$;
