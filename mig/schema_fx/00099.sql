CREATE OR REPLACE FUNCTION public.get_customer_timeline(p_customer_id uuid)
 RETURNS TABLE(event_time timestamp with time zone, event_type text, title text, description text, actor_user_id uuid, actor_name text, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role;
  v_customer public.customers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_app_role();

  select *
  into v_customer
  from public.customers
  where id = p_customer_id;

  if v_customer.id is null then
    raise exception 'Customer not found';
  end if;

  if v_role not in ('admin', 'manager', 'supervisor')
     and coalesce(v_customer.assigned_user_id, auth.uid()) <> auth.uid()
     and coalesce(v_customer.created_by, auth.uid()) <> auth.uid() then
    raise exception 'You do not have access to this customer timeline';
  end if;

  return query
  select
    ci.created_at as event_time,
    ci.interaction_type as event_type,
    ci.title,
    ci.description,
    ci.actor_user_id,
    p.full_name as actor_name,
    ci.metadata
  from public.customer_interactions ci
  left join public.profiles p on p.id = ci.actor_user_id
  where ci.customer_id = p_customer_id
  order by ci.created_at desc;
end;
$function$;
