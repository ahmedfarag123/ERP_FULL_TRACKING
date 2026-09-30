CREATE OR REPLACE FUNCTION public.driver_start_delivery_route(p_plan_id uuid, p_planned_route jsonb DEFAULT '[]'::jsonb, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric, p_vehicle_type text DEFAULT 'van'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_updated_count integer := 0;
  v_tracking_id uuid;
begin
  if p_location_lat is null or p_location_lng is null then
    raise exception 'Driver location is required to start the delivery route.';
  end if;

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id::text = p_plan_id::text
  for update;

  if v_plan.id is null or v_plan.assigned_profile_id::text <> auth.uid()::text then
    raise exception 'Plan not found or not authorized.';
  end if;

  if v_plan.plan_status <> 'in_progress' then
    raise exception 'Plan must be prepared by dispatcher before route start. Current status: %.', v_plan.plan_status;
  end if;

  update public.logistics_delivery_plans
  set
    started_at = coalesce(started_at, timezone('utc', now())),
    dispatched_at = coalesce(dispatched_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id::text = p_plan_id::text
  returning *
  into v_plan;

  insert into public.logistics_route_tracking (
    plan_id,
    driver_profile_id,
    planned_route,
    actual_route,
    planned_stop_count,
    vehicle_type,
    tracking_status,
    started_at
  )
  values (
    p_plan_id::text,
    auth.uid()::text,
    coalesce(p_planned_route, '[]'::jsonb),
    jsonb_build_array(jsonb_build_object(
      'lat', p_location_lat,
      'lng', p_location_lng,
      'ts', extract(epoch from now()),
      'source', 'route_start'
    )),
    jsonb_array_length(coalesce(p_planned_route, '[]'::jsonb)),
    coalesce(nullif(p_vehicle_type, ''), 'van'),
    'active',
    timezone('utc', now())
  )
  on conflict (plan_id) do update set
    driver_profile_id = excluded.driver_profile_id,
    planned_route = excluded.planned_route,
    actual_route = excluded.actual_route,
    planned_stop_count = excluded.planned_stop_count,
    vehicle_type = excluded.vehicle_type,
    tracking_status = 'active',
    started_at = timezone('utc', now()),
    completed_at = null,
    updated_at = timezone('utc', now())
  returning id
  into v_tracking_id;

  with candidates as (
    select
      shipment.id,
      case shipment.shipment_status
        when 'ASSIGNED' then 'assigned'
        when 'CHECK_IN' then 'arrived_pickup'
        when 'PICKUP' then 'picked_up'
        else lower(coalesce(shipment.shipment_status, 'assigned'))
      end as previous_phase
    from public.logistics_shipments shipment
    where shipment.plan_id::text = p_plan_id::text
      and shipment.shipment_status in ('ASSIGNED', 'CHECK_IN', 'PICKUP')
    for update
  ),
  updated as (
    update public.logistics_shipments
    set
      shipment_status = 'OUT_FOR_DELIVERY',
      shipment_state = 'assigned',
      updated_at = timezone('utc', now())
    from candidates
    where logistics_shipments.id = candidates.id
    returning logistics_shipments.id, candidates.previous_phase
  )
  insert into public.logistics_shipment_events (
    shipment_id,
    actor_profile_id,
    previous_phase,
    next_phase,
    note,
    location_lat,
    location_lng,
    payload
  )
  select
    id,
    auth.uid(),
    previous_phase,
    'in_transit',
    'Driver started delivery route',
    p_location_lat,
    p_location_lng,
    jsonb_build_object('route_tracking_id', v_tracking_id, 'plan_id', p_plan_id)
  from updated;

  get diagnostics v_updated_count = row_count;

  return jsonb_build_object(
    'success', true,
    'plan_id', p_plan_id,
    'tracking_id', v_tracking_id,
    'updated_shipments', v_updated_count
  );
end;
$function$;
