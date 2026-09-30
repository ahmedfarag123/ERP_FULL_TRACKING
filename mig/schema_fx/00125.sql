CREATE OR REPLACE FUNCTION public.logistics_driver_phase_rank(p_value text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case lower(trim(coalesce(p_value, '')))
    when 'pending' then 0
    when 'ready' then 0
    when 'ready_for_pickup' then 0
    when 'assigned' then 1
    when 'accepted' then 1
    when 'arrived_pickup' then 2
    when 'check_in' then 2
    when 'picked_up' then 3
    when 'in_transit' then 4
    when 'out_for_delivery' then 4
    when 'arrived_delivery' then 5
    when 'delivered' then 6
    when 'finished' then 7
    when 'settled' then 8
    when 'attempted' then 9
    when 'failed' then 9
    when 'cancelled' then 9
    else -1
  end;
$function$;
