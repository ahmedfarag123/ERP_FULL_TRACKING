CREATE OR REPLACE FUNCTION public.set_role_permissions(p_role app_role, p_permission_keys text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inserted_count integer;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can update role permissions';
  end if;

  delete from public.role_permission_assignments
  where role = p_role;

  insert into public.role_permission_assignments (
    role,
    permission_key,
    created_by
  )
  select
    p_role,
    permission_key,
    auth.uid()
  from (
    select distinct unnest(coalesce(p_permission_keys, array[]::text[])) as permission_key
  ) seeded
  where coalesce(permission_key, '') <> '';

  get diagnostics v_inserted_count = row_count;

  perform public.log_audit_event(
    'set_role_permissions',
    'role_definition',
    null,
    format('Updated permission matrix for role %s', p_role::text),
    jsonb_build_object(
      'role', p_role,
      'permission_count', v_inserted_count,
      'permission_keys', coalesce(p_permission_keys, array[]::text[])
    )
  );

  return v_inserted_count;
end;
$function$;
