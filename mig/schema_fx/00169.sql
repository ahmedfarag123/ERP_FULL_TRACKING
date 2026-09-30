CREATE OR REPLACE FUNCTION public.set_department_roles(p_department_id uuid, p_roles app_role[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inserted_count integer;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can update department roles';
  end if;

  delete from public.department_role_assignments
  where department_id = p_department_id;

  insert into public.department_role_assignments (
    department_id,
    role,
    created_by
  )
  select
    p_department_id,
    role_value,
    auth.uid()
  from (
    select distinct unnest(coalesce(p_roles, array[]::public.app_role[])) as role_value
  ) seeded;

  get diagnostics v_inserted_count = row_count;

  perform public.log_audit_event(
    'set_department_roles',
    'department',
    p_department_id,
    'Updated department role coverage',
    jsonb_build_object(
      'department_id', p_department_id,
      'roles', coalesce(p_roles, array[]::public.app_role[]),
      'role_count', v_inserted_count
    )
  );

  return v_inserted_count;
end;
$function$;
