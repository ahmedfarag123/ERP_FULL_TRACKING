CREATE OR REPLACE FUNCTION public.log_audit_event(p_action_type text, p_entity_type text, p_entity_id uuid, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_audit_id uuid;
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    actor_role,
    action_type,
    entity_type,
    entity_id,
    description,
    metadata
  )
  values (
    auth.uid(),
    v_profile.email,
    v_profile.role,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_description,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$function$;
