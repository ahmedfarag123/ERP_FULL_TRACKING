CREATE OR REPLACE FUNCTION public.force_logout_user(p_target_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can force logout users';
  end if;

  update public.profiles
  set
    force_logout_at = timezone('utc', now()),
    session_version = session_version + 1
  where id = p_target_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Target user not found';
  end if;

  perform public.log_audit_event(
    'force_logout',
    'profile',
    v_profile.id,
    coalesce(p_reason, 'User forced to logout by admin'),
    jsonb_build_object('target_user_id', p_target_user_id)
  );

  return v_profile;
end;
$function$;
