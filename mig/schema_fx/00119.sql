CREATE OR REPLACE FUNCTION public.logistics_admin_required()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_role_permission('logistics.manage') then
    raise exception 'Only logistics management users can perform this action.';
  end if;
end;
$function$;
