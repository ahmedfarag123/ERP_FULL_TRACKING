CREATE OR REPLACE FUNCTION public.create_system_notification_for_users(p_user_ids uuid[], p_title text, p_body text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_notification_id uuid;
begin
  if coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return null;
  end if;

  insert into public.notifications (
    created_by,
    audience_type,
    channel,
    title,
    body,
    metadata
  )
  values (
    null,
    'user',
    'in_app',
    p_title,
    p_body,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('system_generated', true)
  )
  returning id into v_notification_id;

  insert into public.notification_recipients (notification_id, user_id)
  select distinct v_notification_id, target.profile_id
  from unnest(p_user_ids) as target(profile_id)
  join public.profiles profile on profile.id = target.profile_id
  where profile.status = 'active'
  on conflict (notification_id, user_id) do nothing;

  if not exists (
    select 1
    from public.notification_recipients
    where notification_id = v_notification_id
  ) then
    delete from public.notifications where id = v_notification_id;
    return null;
  end if;

  return v_notification_id;
end;
$function$;
