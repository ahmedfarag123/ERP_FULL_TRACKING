CREATE OR REPLACE FUNCTION public.is_admin_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.current_app_role() = 'admin', false)
$function$;
