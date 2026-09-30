CREATE OR REPLACE FUNCTION public.driver_complete_route_tracking(p_plan_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor text := auth.uid()::text;
  v_actual_distance double precision := 0;
  v_actual_duration integer := 0;
  v_point jsonb;
  v_prev_lat double precision;
  v_prev_lng double precision;
  v_first_ts double precision;
  v_last_ts double precision;
  v_started_at timestamptz;
begin
  select started_at
  into v_started_at
  from public.logistics_route_tracking
  where plan_id::text = p_plan_id::text
    and driver_profile_id::text = v_actor
  order by started_at desc
  limit 1;

  for v_point in
    select jsonb_array_elements(actual_route)
    from public.logistics_route_tracking
    where plan_id::text = p_plan_id::text
      and driver_profile_id::text = v_actor
      and tracking_status = 'active'
  loop
    if v_first_ts is null then
      v_first_ts := (v_point->>'ts')::double precision;
    end if;
    v_last_ts := (v_point->>'ts')::double precision;

    if v_prev_lat is not null and v_prev_lng is not null then
      v_actual_distance := v_actual_distance + (
        6371 * 2 * asin(sqrt(
          power(sin(radians((v_point->>'lat')::double precision - v_prev_lat) / 2), 2) +
          cos(radians(v_prev_lat)) * cos(radians((v_point->>'lat')::double precision)) *
          power(sin(radians((v_point->>'lng')::double precision - v_prev_lng) / 2), 2)
        ))
      );
    end if;

    v_prev_lat := (v_point->>'lat')::double precision;
    v_prev_lng := (v_point->>'lng')::double precision;
  end loop;

  if v_first_ts is not null and v_last_ts is not null then
    v_actual_duration := greatest(1, ceil((v_last_ts - v_first_ts) / 60))::integer;
  end if;

  update public.logistics_route_tracking
  set
    actual_distance_km = v_actual_distance,
    actual_duration_minutes = v_actual_duration,
    actual_stop_count = (
      select count(distinct event.shipment_id)
      from public.logistics_shipment_events event
      where event.actor_profile_id::text = v_actor
        and event.next_phase in ('arrived_delivery', 'delivered')
        and (v_started_at is null or event.created_at >= v_started_at)
    ),
    tracking_status = 'completed',
    completed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where plan_id::text = p_plan_id::text
    and driver_profile_id::text = v_actor
    and tracking_status = 'active';
end;
$function$;
