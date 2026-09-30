CREATE OR REPLACE FUNCTION public.logistics_delivery_phase_from_status(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case upper(trim(coalesce(p_value, '')))
    when 'PENDING_ASSIGN' then 'pending'
    when 'ASSIGNED' then 'assigned'
    when 'CHECK_IN' then 'arrived_pickup'
    when 'PICKUP' then 'picked_up'
    when 'OUT_FOR_DELIVERY' then 'in_transit'
    when 'ARRIVED' then 'arrived_delivery'
    when 'DELIVERED' then 'delivered'
    when 'FINISHED' then 'finished'
    when 'SETTLED' then 'settled'
    when 'CANCELLED' then 'cancelled'
    when 'FAILED' then 'failed'
    when 'ATTEMPTED' then 'attempted'
    else null
  end;
$function$;
