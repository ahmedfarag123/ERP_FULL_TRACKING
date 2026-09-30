CREATE OR REPLACE FUNCTION public.get_rep_route_visits(p_user_id uuid, p_date_from date DEFAULT CURRENT_DATE, p_date_to date DEFAULT CURRENT_DATE)
 RETURNS TABLE(visit_id uuid, checked_in_at timestamp with time zone, customer_id uuid, customer_name text, lat double precision, lng double precision, visit_result text, fraud_score numeric, fraud_status fraud_status, note text, linked_order_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_app_role();

  if v_role in ('sales_agent', 'telesales') and p_user_id <> auth.uid() then
    raise exception 'You cannot inspect another user''s route visits';
  end if;

  return query
  select
    v.id,
    v.checked_in_at,
    v.customer_id,
    c.customer_name,
    v.lat,
    v.lng,
    v.visit_result,
    v.fraud_score,
    v.fraud_status,
    v.note,
    v.linked_order_id
  from public.visits v
  left join public.customers c on c.id = v.customer_id
  where v.user_id = p_user_id
    and v.checked_in_at >= p_date_from::timestamp
    and v.checked_in_at < (p_date_to + 1)::timestamp
  order by v.checked_in_at asc;
end;
$function$;
