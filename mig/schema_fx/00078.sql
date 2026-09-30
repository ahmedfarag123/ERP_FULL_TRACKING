CREATE OR REPLACE FUNCTION public.driver_start_route_tracking(p_plan_id text, p_planned_route jsonb, p_vehicle_type text DEFAULT 'van'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := auth.uid()::text;
  v_tracking_id uuid;
  v_vehicle RECORD;
  v_planned_distance double precision := 0;
  v_planned_duration integer := 0;
  v_stop_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM logistics_delivery_plans
    WHERE id = p_plan_id AND "assignedProfileId" = v_actor
  ) THEN
    RAISE EXCEPTION 'Plan not found or not authorized';
  END IF;

  SELECT * INTO v_vehicle FROM logistics_vehicle_profiles WHERE vehicle_type = p_vehicle_type;
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
  END IF;

  IF v_vehicle IS NOT NULL AND v_planned_distance > 0 THEN
    v_planned_duration := ceil((v_planned_distance / v_vehicle.avg_speed_kmh) * 60) + (v_stop_count * 5);
  ELSE
    v_planned_duration := v_stop_count * 10;
  END IF;

  INSERT INTO logistics_route_tracking (
    plan_id, driver_profile_id,
    planned_route, planned_distance_km, planned_duration_minutes,
    planned_stop_count, vehicle_type, avg_speed_kmh
  ) VALUES (
    p_plan_id, v_actor,
    p_planned_route, v_planned_distance, v_planned_duration,
    v_stop_count, p_vehicle_type, COALESCE(v_vehicle.avg_speed_kmh, 40)
  )
  ON CONFLICT (plan_id) DO UPDATE SET
    planned_route = EXCLUDED.planned_route,
    planned_distance_km = EXCLUDED.planned_distance_km,
    planned_duration_minutes = EXCLUDED.planned_duration_minutes,
    planned_stop_count = EXCLUDED.planned_stop_count,
    vehicle_type = EXCLUDED.vehicle_type,
    avg_speed_kmh = EXCLUDED.avg_speed_kmh,
    updated_at = now()
  RETURNING id INTO v_tracking_id;

  RETURN v_tracking_id;
END;
$function$;
