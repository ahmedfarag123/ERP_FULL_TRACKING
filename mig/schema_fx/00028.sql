CREATE OR REPLACE FUNCTION public.admin_remove_shipment_from_plan_any_status(p_shipment_id uuid)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
begin
  perform public.logistics_admin_required();

  select *
  into v_shipment
  from public.logistics_shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null then
    raise exception 'Shipment not found.';
  end if;

  if coalesce(v_shipment.shipment_status, 'PENDING_ASSIGN') in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED') then
    raise exception 'Completed or cancelled shipments cannot be removed.';
  end if;

  update public.logistics_shipments
  set
    plan_id = null,
    logistics_user_id = null,
    assigned_profile_id = null,
    assigned_user_name = null,
    assigned_job_title = null,
    route_sequence = null,
    route_locked = false,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning *
  into v_shipment;

  return v_shipment;
end;
$function$;
