CREATE OR REPLACE FUNCTION public.current_app_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
$function$;
