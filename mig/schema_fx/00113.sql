CREATE OR REPLACE FUNCTION public.has_role_permission(p_permission_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.role_permission_assignments assignment
    join public.permission_catalog catalog
      on catalog.permission_key = assignment.permission_key
    where assignment.role = public.current_app_role()
      and assignment.permission_key = p_permission_key
      and catalog.is_active
  );
$function$;
