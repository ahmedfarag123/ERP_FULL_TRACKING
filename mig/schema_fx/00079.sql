CREATE OR REPLACE FUNCTION public.driver_start_route_tracking(p_plan_id uuid, p_planned_route jsonb, p_vehicle_type text DEFAULT 'van'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan public.logistics_delivery_plans%rowtype;
  v_tracking_id uuid;
  v_vehicle RECORD;
  v_planned_distance double precision := 0;
  v_planned_duration integer := 0;
  v_stop_count integer;
BEGIN
  SELECT * INTO v_plan
  FROM public.logistics_delivery_plans
  WHERE id = p_plan_id;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Plan not found.';
  END IF;

  IF NOT public.is_management_role() AND v_plan.assigned_profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'You do not have access to this plan.';
  END IF;

  SELECT * INTO v_vehicle FROM public.logistics_vehicle_profiles WHERE vehicle_type = p_vehicle_type;
  v_stop_count := jsonb_array_length(p_planned_route);

  IF v_stop_count >= 2 THEN
    WITH points AS (
      SELECT
        (elem->>'lat')::double precision AS lat,
        (elem->>'lng')::double precision AS lng,
        row_number() OVER () AS rn
      FROM jsonb_array_elements(p_planned_route) AS elem
    )
    SELECT COALESCE(SUM(
      6371 * 2 * asin(sqrt(
        power(sin(radians(p2.lat - p1.lat) / 2), 2) +
        cos(radians(p1.lat)) * cos(radians(p2.lat)) *
        power(sin(radians(p2.lng - p1.lng) / 2), 2)
      ))
    ), 0)
    INTO v_planned_distance
    FROM points p1
    JOIN points p2 ON p2.rn = p1.rn + 1;

    v_planned_duration := GREATEST(v_stop_count * 5, (v_planned_distance / 40.0 * 60)::int);
  END IF;

  INSERT INTO public.logistics_route_trackings (
    plan_id, driver_profile_id, vehicle_type,
    planned_distance_km, planned_duration_min, planned_stop_count,
    planned_route
  ) VALUES (
    p_plan_id, auth.uid(), v_vehicle.vehicle_type,
    v_planned_distance, v_planned_duration, v_stop_count,
    p_planned_route
  )
  RETURNING id INTO v_tracking_id;

  UPDATE public.logistics_delivery_plans
  SET plan_status = 'in_progress',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  WHERE id = p_plan_id;

  RETURN v_tracking_id;
END;
$function$;
