CREATE OR REPLACE FUNCTION public.logistics_shipment_status_from_phase(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE lower(trim(p_value))
    WHEN 'pending' THEN 'PENDING_ASSIGN'
    WHEN 'assigned' THEN 'ASSIGNED'
    WHEN 'accepted' THEN 'ASSIGNED'
    WHEN 'arrived_pickup' THEN 'CHECK_IN'
    WHEN 'check_in' THEN 'CHECK_IN'
    WHEN 'picked_up' THEN 'PICKUP'
    WHEN 'in_transit' THEN 'OUT_FOR_DELIVERY'
    WHEN 'arrived_delivery' THEN 'ARRIVED'
    WHEN 'delivered' THEN 'DELIVERED'
    WHEN 'finished' THEN 'FINISHED'
    WHEN 'settled' THEN 'SETTLED'
    WHEN 'attempted' THEN 'CANCELLED'
    WHEN 'failed' THEN 'CANCELLED'
    WHEN 'cancelled' THEN 'CANCELLED'
    WHEN 'rescheduled' THEN 'PENDING_ASSIGN'
    ELSE 'PENDING_ASSIGN'
  END;
$function$;
