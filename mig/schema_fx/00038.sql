CREATE OR REPLACE FUNCTION public.assign_customers_by_district(p_governorate text, p_district text, p_assigned_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_updated_count integer;
begin
  if not public.is_management_role() then
    raise exception 'Only management roles can bulk-assign customers';
  end if;

  update public.customers
  set
    assigned_user_id = p_assigned_user_id,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where coalesce(governorate, '') = coalesce(p_governorate, coalesce(governorate, ''))
    and district = p_district;

  get diagnostics v_updated_count = row_count;

  perform public.log_audit_event(
    'bulk_assign_customers',
    'customer',
    null,
    format('Bulk assigned customers in district %s', p_district),
    jsonb_build_object(
      'governorate', p_governorate,
      'district', p_district,
      'assigned_user_id', p_assigned_user_id,
      'updated_count', v_updated_count
    )
  );

  return v_updated_count;
end;
$function$;
