CREATE OR REPLACE FUNCTION public.calculate_haversine_meters(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'public'
AS $function$
  select
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((p_lat2 - p_lat1) / 2)), 2) +
        cos(radians(p_lat1)) * cos(radians(p_lat2)) *
        power(sin(radians((p_lng2 - p_lng1) / 2)), 2)
      )
    )
$function$;
