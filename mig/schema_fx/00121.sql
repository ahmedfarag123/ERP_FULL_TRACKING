CREATE OR REPLACE FUNCTION public.logistics_canonical_driver_phase(p_delivery_phase text, p_shipment_status text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  with phases as (
    select
      lower(trim(nullif(coalesce(p_delivery_phase, ''), ''))) as delivery_phase,
      public.logistics_delivery_phase_from_status(p_shipment_status) as status_phase
  )
  select case
    when status_phase is null then coalesce(delivery_phase, 'pending')
    when delivery_phase is null then status_phase
    when public.logistics_driver_phase_rank(status_phase) >= public.logistics_driver_phase_rank(delivery_phase)
      then status_phase
    else delivery_phase
  end
  from phases;
$function$;
