CREATE OR REPLACE FUNCTION public.logistics_distance_km(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then null
    else 6371 * 2 * asin(
      sqrt(
        power(sin(radians((p_lat2 - p_lat1) / 2)), 2) +
        cos(radians(p_lat1)) * cos(radians(p_lat2)) *
        power(sin(radians((p_lng2 - p_lng1) / 2)), 2)
      )
    )
  end;
$function$;
