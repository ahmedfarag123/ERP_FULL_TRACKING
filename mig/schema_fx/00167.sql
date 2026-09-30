CREATE OR REPLACE FUNCTION public.send_notification(p_audience_type notification_audience_type, p_title text, p_body text, p_channel notification_channel DEFAULT 'in_app'::notification_channel, p_audience_role app_role DEFAULT NULL::app_role, p_audience_user_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_notification_id uuid;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can send notifications';
  end if;

  insert into public.notifications (
    created_by,
    audience_type,
    audience_role,
    audience_user_id,
    channel,
    title,
    body,
    metadata
  )
  values (
    auth.uid(),
    p_audience_type,
    p_audience_role,
    p_audience_user_id,
    p_channel,
    p_title,
    p_body,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_notification_id;

  if p_audience_type = 'all' then
    insert into public.notification_recipients (notification_id, user_id)
    select v_notification_id, p.id
    from public.profiles p
    where p.status = 'active';
  elseif p_audience_type = 'role' then
    if p_audience_role is null then
      raise exception 'Role audience requires p_audience_role';
    end if;

    insert into public.notification_recipients (notification_id, user_id)
    select v_notification_id, p.id
    from public.profiles p
    where p.status = 'active'
      and p.role = p_audience_role;
  elseif p_audience_type = 'user' then
    if p_audience_user_id is null then
      raise exception 'User audience requires p_audience_user_id';
    end if;

    insert into public.notification_recipients (notification_id, user_id)
    values (v_notification_id, p_audience_user_id);
  else
    raise exception 'Unsupported audience type';
  end if;

  if not exists (
    select 1
    from public.notification_recipients
    where notification_id = v_notification_id
  ) then
    raise exception 'Notification resolved to zero recipients';
  end if;

  perform public.log_audit_event(
    'send_notification',
    'notification',
    v_notification_id,
    'Notification sent',
    jsonb_build_object(
      'audience_type', p_audience_type,
      'audience_role', p_audience_role,
      'audience_user_id', p_audience_user_id
    )
  );

  return v_notification_id;
end;
$function$;
