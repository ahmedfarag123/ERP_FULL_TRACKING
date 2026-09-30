CREATE OR REPLACE FUNCTION public.logistics_shipment_status_rank(p_status text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE upper(trim(p_status))
    WHEN 'PENDING_ASSIGN' THEN 1
    WHEN 'ASSIGNED' THEN 2
    WHEN 'CHECK_IN' THEN 3
    WHEN 'PICKUP' THEN 4
    WHEN 'OUT_FOR_DELIVERY' THEN 5
    WHEN 'ARRIVED' THEN 6
    WHEN 'DELIVERED' THEN 7
    WHEN 'FINISHED' THEN 8
    WHEN 'SETTLED' THEN 9
    WHEN 'CANCELLED' THEN 10
    ELSE 0
  END;
$function$;
