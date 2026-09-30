CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS notification_recipients
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_recipient public.notification_recipients%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.notification_recipients
  set read_at = coalesce(read_at, timezone('utc', now()))
  where notification_id = p_notification_id
    and user_id = auth.uid()
  returning * into v_recipient;

  if v_recipient.id is null then
    raise exception 'Notification recipient not found';
  end if;

  return v_recipient;
end;
$function$;
