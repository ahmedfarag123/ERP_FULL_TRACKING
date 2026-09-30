CREATE OR REPLACE FUNCTION public.admin_set_plan_stop_sequence(p_plan_id uuid, p_shipment_id uuid, p_route_sequence integer)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
begin
  perform public.logistics_admin_required();

  if p_route_sequence is null or p_route_sequence < 1 then
    raise exception 'Route sequence must be greater than zero.';
  end if;

  update public.logistics_shipments
  set
    route_sequence = p_route_sequence,
    route_locked = true,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
    and plan_id = p_plan_id
  returning *
  into v_shipment;

  if v_shipment.id is null then
    raise exception 'Shipment not found in this plan.';
  end if;

  return v_shipment;
end;
$function$;
