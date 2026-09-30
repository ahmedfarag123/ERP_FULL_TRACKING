CREATE OR REPLACE FUNCTION public.admin_optimize_delivery_plan(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_remaining uuid[];
  v_current uuid;
  v_next uuid;
  v_open_count integer;
  v_sequence integer := 1;
  v_locked_sequences integer[];
  v_total_distance double precision := 0;
  v_prev_lat double precision := null;
  v_prev_lng double precision := null;
  v_start_lat double precision := null;
  v_start_lng double precision := null;
  v_start_source text := 'shipment_schedule';
  v_next_lat double precision;
  v_next_lng double precision;
  v_leg double precision;
begin
  perform public.logistics_admin_required();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    raise exception 'Plan not found.';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Only pending or in-progress plans can be optimized.';
  end if;

  select count(*)
  into v_open_count
  from public.logistics_shipments shipment
  where shipment.plan_id = p_plan_id
    and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED');

  if v_open_count = 0 then
    raise exception 'Plan has no open shipments.';
  end if;

  select
    shipment.warehouse_latitude,
    shipment.warehouse_longitude,
    'warehouse_coordinates'
  into v_start_lat, v_start_lng, v_start_source
  from public.logistics_shipments shipment
  where shipment.plan_id = p_plan_id
    and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
    and shipment.warehouse_latitude is not null
    and shipment.warehouse_longitude is not null
  order by shipment.route_sequence nulls last, shipment.scheduled_at nulls last, shipment.created_at
  limit 1;

  if v_start_lat is not null and v_start_lng is not null then
    v_prev_lat := v_start_lat;
    v_prev_lng := v_start_lng;
  else
    v_start_source := 'shipment_schedule';
  end if;

  select coalesce(array_agg(distinct shipment.route_sequence), array[]::integer[])
  into v_locked_sequences
  from public.logistics_shipments shipment
  where shipment.plan_id = p_plan_id
    and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
    and coalesce(shipment.route_locked, false) = true
    and shipment.route_sequence is not null;

  select array_agg(shipment.id order by shipment.scheduled_at nulls last, shipment.created_at)
  into v_remaining
  from public.logistics_shipments shipment
  where shipment.plan_id = p_plan_id
    and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
    and coalesce(shipment.route_locked, false) = false;

  loop
    exit when coalesce(array_length(v_remaining, 1), 0) = 0;

    if v_prev_lat is null or v_prev_lng is null then
      select shipment.id, coalesce(shipment.customer_latitude, customer.lat), coalesce(shipment.customer_longitude, customer.lng)
      into v_next, v_next_lat, v_next_lng
      from public.logistics_shipments shipment
      left join public.customers customer on customer.id = shipment.customer_id
      where shipment.id = any(v_remaining)
      order by shipment.scheduled_at nulls last, shipment.created_at
      limit 1;
    else
      select shipment.id,
        coalesce(shipment.customer_latitude, customer.lat),
        coalesce(shipment.customer_longitude, customer.lng),
        public.logistics_distance_km(
          v_prev_lat,
          v_prev_lng,
          coalesce(shipment.customer_latitude, customer.lat),
          coalesce(shipment.customer_longitude, customer.lng)
        )
      into v_next, v_next_lat, v_next_lng, v_leg
      from public.logistics_shipments shipment
      left join public.customers customer on customer.id = shipment.customer_id
      where shipment.id = any(v_remaining)
      order by
        public.logistics_distance_km(
          v_prev_lat,
          v_prev_lng,
          coalesce(shipment.customer_latitude, customer.lat),
          coalesce(shipment.customer_longitude, customer.lng)
        ) nulls last,
        shipment.scheduled_at nulls last,
        shipment.created_at
      limit 1;

      v_total_distance := v_total_distance + coalesce(v_leg, 0);
    end if;

    while v_sequence = any(v_locked_sequences) loop
      v_sequence := v_sequence + 1;
    end loop;

    update public.logistics_shipments
    set
      route_sequence = v_sequence,
      customer_latitude = coalesce(customer_latitude, v_next_lat),
      customer_longitude = coalesce(customer_longitude, v_next_lng),
      updated_at = timezone('utc', now())
    where id = v_next;

    v_remaining := array_remove(v_remaining, v_next);
    v_current := v_next;
    v_prev_lat := v_next_lat;
    v_prev_lng := v_next_lng;
    v_sequence := v_sequence + 1;
  end loop;

  with ordered_stops as (
    select
      coalesce(shipment.customer_latitude, customer.lat) as lat,
      coalesce(shipment.customer_longitude, customer.lng) as lng,
      lag(coalesce(shipment.customer_latitude, customer.lat)) over (
        order by shipment.route_sequence nulls last, shipment.scheduled_at nulls last, shipment.created_at
      ) as prev_lat,
      lag(coalesce(shipment.customer_longitude, customer.lng)) over (
        order by shipment.route_sequence nulls last, shipment.scheduled_at nulls last, shipment.created_at
      ) as prev_lng,
      row_number() over (
        order by shipment.route_sequence nulls last, shipment.scheduled_at nulls last, shipment.created_at
      ) as rn
    from public.logistics_shipments shipment
    left join public.customers customer on customer.id = shipment.customer_id
    where shipment.plan_id = p_plan_id
      and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
  )
  select coalesce(sum(coalesce(public.logistics_distance_km(
    case when rn = 1 and v_start_lat is not null and v_start_lng is not null then v_start_lat else prev_lat end,
    case when rn = 1 and v_start_lat is not null and v_start_lng is not null then v_start_lng else prev_lng end,
    lat,
    lng
  ), 0)), 0)
  into v_total_distance
  from ordered_stops;

  update public.logistics_delivery_plans
  set
    route_optimized_at = timezone('utc', now()),
    route_total_distance_km = round(v_total_distance::numeric, 2)::double precision,
    route_metadata = coalesce(route_metadata, '{}'::jsonb) || jsonb_build_object(
      'optimizer', 'nearest_neighbor',
      'optimized_by', auth.uid(),
      'optimized_at', timezone('utc', now()),
      'stop_count', v_open_count,
      'start_source', v_start_source,
      'start_lat', v_start_lat,
      'start_lng', v_start_lng,
      'last_shipment_id', v_current
    ),
    updated_at = timezone('utc', now())
  where id = p_plan_id;

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'stop_count', v_open_count,
    'estimated_distance_km', round(v_total_distance::numeric, 2)
  );
end;
$function$;
