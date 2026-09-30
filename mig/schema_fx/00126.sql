CREATE OR REPLACE FUNCTION public.logistics_hydrate_shipment_route_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_default_warehouse_latitude constant double precision := 30.1592333;
  v_default_warehouse_longitude constant double precision := 31.357159;
  v_order_customer_id uuid;
  v_order_external_order_id text;
  v_order_name text;
  v_order_customer_name text;
  v_order_warehouse_ref text;
  v_customer_id uuid;
  v_customer_external_id text;
  v_customer_name text;
  v_customer_latitude double precision;
  v_customer_longitude double precision;
  v_warehouse public.logistics_warehouses%rowtype;
  v_warehouse_ref text;
begin
  if new.linked_order_id is not null then
    select
      sales_order.customer_id,
      sales_order.external_order_id,
      sales_order.odoo_order_name,
      sales_order.customer_name,
      sales_order.warehouse_id
    into
      v_order_customer_id,
      v_order_external_order_id,
      v_order_name,
      v_order_customer_name,
      v_order_warehouse_ref
    from public.orders as sales_order
    where sales_order.id = new.linked_order_id;

    new.customer_id := coalesce(new.customer_id, v_order_customer_id);
    new.external_order_id := coalesce(new.external_order_id, v_order_external_order_id);
    new.odoo_order_name := coalesce(new.odoo_order_name, v_order_name);
    new.customer_name := coalesce(new.customer_name, v_order_customer_name);
    new.external_warehouse_id := coalesce(new.external_warehouse_id, v_order_warehouse_ref);
    new.warehouse_name := coalesce(new.warehouse_name, v_order_warehouse_ref);
  end if;

  if new.customer_id is not null then
    select
      customer.id,
      customer.external_customer_id,
      customer.customer_name,
      customer.lat,
      customer.lng
    into
      v_customer_id,
      v_customer_external_id,
      v_customer_name,
      v_customer_latitude,
      v_customer_longitude
    from public.customers as customer
    where customer.id = new.customer_id;
  elsif nullif(trim(coalesce(new.external_customer_id, '')), '') is not null then
    select
      customer.id,
      customer.external_customer_id,
      customer.customer_name,
      customer.lat,
      customer.lng
    into
      v_customer_id,
      v_customer_external_id,
      v_customer_name,
      v_customer_latitude,
      v_customer_longitude
    from public.customers as customer
    where customer.external_customer_id = new.external_customer_id
    limit 1;
  end if;

  if v_customer_id is not null then
    new.customer_id := coalesce(new.customer_id, v_customer_id);
    new.external_customer_id := coalesce(new.external_customer_id, v_customer_external_id);
    new.customer_name := coalesce(new.customer_name, v_customer_name);

    if v_customer_latitude is not null
      and v_customer_longitude is not null
      and abs(v_customer_latitude) <= 90
      and abs(v_customer_longitude) <= 180
      and not (abs(v_customer_latitude) < 0.000001 and abs(v_customer_longitude) < 0.000001)
    then
      new.customer_latitude := v_customer_latitude;
      new.customer_longitude := v_customer_longitude;
    end if;
  end if;

  v_warehouse_ref := nullif(trim(coalesce(new.external_warehouse_id, new.warehouse_name, '')), '');

  if new.warehouse_id is null and v_warehouse_ref is not null then
    select warehouse.*
    into v_warehouse
    from public.logistics_warehouses as warehouse
    where warehouse.external_warehouse_id = v_warehouse_ref
       or warehouse.external_warehouse_id = nullif(trim(split_part(v_warehouse_ref, '|', 1)), '')
       or warehouse.warehouse_code = v_warehouse_ref
       or warehouse.warehouse_name = new.warehouse_name
    order by warehouse.created_at
    limit 1;

    if v_warehouse.id is not null then
      new.warehouse_id := v_warehouse.id;
      new.external_warehouse_id := coalesce(new.external_warehouse_id, v_warehouse.external_warehouse_id);
      new.warehouse_name := coalesce(new.warehouse_name, v_warehouse.warehouse_name);
    end if;
  end if;

  new.warehouse_latitude := coalesce(new.warehouse_latitude, v_default_warehouse_latitude);
  new.warehouse_longitude := coalesce(new.warehouse_longitude, v_default_warehouse_longitude);

  if new.customer_latitude is not null
    and new.customer_longitude is not null
    and new.warehouse_latitude is not null
    and new.warehouse_longitude is not null
  then
    if tg_op = 'INSERT'
      or new.estimated_road_distance_km is null
    then
      new.estimated_road_distance_km := round(public.logistics_distance_km(
        new.warehouse_latitude,
        new.warehouse_longitude,
        new.customer_latitude,
        new.customer_longitude
      )::numeric, 2)::double precision;
    elsif old.customer_latitude is distinct from new.customer_latitude
      or old.customer_longitude is distinct from new.customer_longitude
      or old.warehouse_latitude is distinct from new.warehouse_latitude
      or old.warehouse_longitude is distinct from new.warehouse_longitude
    then
      new.estimated_road_distance_km := round(public.logistics_distance_km(
        new.warehouse_latitude,
        new.warehouse_longitude,
        new.customer_latitude,
        new.customer_longitude
      )::numeric, 2)::double precision;
    end if;
  end if;

  return new;
end;
$function$;
