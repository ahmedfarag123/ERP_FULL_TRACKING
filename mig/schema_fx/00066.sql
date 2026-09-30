CREATE OR REPLACE FUNCTION public.driver_append_route_breadcrumb(p_plan_id text, p_lat double precision, p_lng double precision, p_accuracy double precision DEFAULT NULL::double precision, p_speed double precision DEFAULT NULL::double precision)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := auth.uid()::text;
BEGIN
  UPDATE logistics_route_tracking
  SET actual_route = actual_route || jsonb_build_object(
    'lat', p_lat, 'lng', p_lng,
    'ts', extract(epoch from now()),
    'acc', p_accuracy, 'spd', p_speed
  ),
  updated_at = now()
  WHERE plan_id = p_plan_id
    AND driver_profile_id = v_actor
    AND tracking_status = 'active';
END;
$function$;
