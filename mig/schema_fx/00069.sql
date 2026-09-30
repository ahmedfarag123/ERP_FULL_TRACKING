CREATE OR REPLACE FUNCTION public.driver_finish_delivery_route(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_open_count integer := 0;
begin
  select *
  into v_plan
  from public.logistics_delivery_plans
  where id::text = p_plan_id::text
  for update;

  if v_plan.id is null or v_plan.assigned_profile_id::text <> auth.uid()::text then
    raise exception 'Plan not found or not authorized.';
  end if;

  perform public.driver_complete_route_tracking(p_plan_id::text);

  update public.logistics_route_tracking
  set
    tracking_status = 'completed',
    completed_at = coalesce(completed_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where plan_id::text = p_plan_id::text
    and driver_profile_id::text = auth.uid()::text
    and tracking_status = 'active';

  select count(*)
  into v_open_count
  from public.logistics_shipments shipment
  where shipment.plan_id::text = p_plan_id::text
    and coalesce(shipment.shipment_status, 'PENDING_ASSIGN')
      not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED', 'FAILED', 'ATTEMPTED');

  if v_open_count > 0 then
    raise exception 'Plan still has % open shipments.', v_open_count;
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = 'completed',
    finished_at = coalesce(finished_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id::text = p_plan_id::text
  returning *
  into v_plan;

  return jsonb_build_object('success', true, 'plan_id', p_plan_id);
end;
$function$;
