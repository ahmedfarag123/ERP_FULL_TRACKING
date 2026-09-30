CREATE OR REPLACE FUNCTION public.assign_customer(p_customer_id uuid, p_assigned_user_id uuid)
 RETURNS customers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_customer public.customers%rowtype;
begin
  if not public.is_management_role() then
    raise exception 'Only management roles can assign customers';
  end if;

  update public.customers
  set
    assigned_user_id = p_assigned_user_id,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where id = p_customer_id
  returning * into v_customer;

  if v_customer.id is null then
    raise exception 'Customer not found';
  end if;

  perform public.log_audit_event(
    'assign_customer',
    'customer',
    v_customer.id,
    'Assigned customer to user',
    jsonb_build_object('assigned_user_id', p_assigned_user_id)
  );

  return v_customer;
end;
$function$;
