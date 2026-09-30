CREATE OR REPLACE FUNCTION public.get_fraud_overview(p_date_from date DEFAULT (CURRENT_DATE - 30), p_date_to date DEFAULT CURRENT_DATE, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, full_name text, total_visits bigint, suspicious_visits bigint, fraudulent_visits bigint, average_fraud_score numeric, fraud_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role;
  v_scope_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_app_role();
  if v_role in ('sales_agent', 'telesales') then
    v_scope_user := auth.uid();
  else
    v_scope_user := p_user_id;
  end if;

  return query
  select
    p.id,
    p.full_name,
    count(v.id)::bigint as total_visits,
    count(v.id) filter (where v.fraud_status = 'suspicious')::bigint as suspicious_visits,
    count(v.id) filter (where v.fraud_status = 'fraudulent')::bigint as fraudulent_visits,
    coalesce(avg(v.fraud_score), 0)::numeric(10,2) as average_fraud_score,
    case
      when count(v.id) = 0 then 0::numeric(8,2)
      else round((count(v.id) filter (where v.fraud_status in ('suspicious', 'fraudulent'))::numeric / count(v.id)::numeric) * 100, 2)
    end as fraud_rate
  from public.profiles p
  left join public.visits v
    on v.user_id = p.id
   and v.checked_in_at >= p_date_from::timestamp
   and v.checked_in_at < (p_date_to + 1)::timestamp
  where p.status = 'active'
    and (v_scope_user is null or p.id = v_scope_user)
  group by p.id, p.full_name
  order by fraudulent_visits desc, suspicious_visits desc, average_fraud_score desc;
end;
$function$;
