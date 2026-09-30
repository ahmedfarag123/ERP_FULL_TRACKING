CREATE OR REPLACE FUNCTION public.logistics_refresh_customer_shipment_route_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.logistics_shipments as shipment
  set
    customer_id = coalesce(shipment.customer_id, new.id),
    external_customer_id = coalesce(shipment.external_customer_id, new.external_customer_id),
    customer_name = coalesce(shipment.customer_name, new.customer_name),
    customer_latitude = new.lat,
    customer_longitude = new.lng,
    updated_at = timezone('utc', now())
  where new.lat is not null
    and new.lng is not null
    and abs(new.lat) <= 90
    and abs(new.lng) <= 180
    and not (abs(new.lat) < 0.000001 and abs(new.lng) < 0.000001)
    and (
      shipment.customer_id = new.id
      or (
        shipment.customer_id is null
        and shipment.external_customer_id is not null
        and shipment.external_customer_id = new.external_customer_id
      )
    );

  return new;
end;
$function$;
