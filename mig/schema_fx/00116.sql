CREATE OR REPLACE FUNCTION public.is_management_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(public.current_app_role() in ('admin', 'manager', 'supervisor', 'dispatcher', 'spv'), false);
$function$;
