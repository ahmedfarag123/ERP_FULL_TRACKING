CREATE OR REPLACE FUNCTION public.create_system_notification_for_roles(p_roles app_role[], p_title text, p_body text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_ids uuid[];
begin
  select coalesce(array_agg(profile.id), '{}'::uuid[])
  into v_user_ids
  from public.profiles profile
  where profile.status = 'active'
    and profile.role = any(p_roles);

  return public.create_system_notification_for_users(v_user_ids, p_title, p_body, p_metadata);
end;
$function$;
