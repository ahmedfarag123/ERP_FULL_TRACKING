CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::integer
  from public.notification_recipients nr
  where nr.user_id = auth.uid()
    and nr.read_at is null
$function$;
