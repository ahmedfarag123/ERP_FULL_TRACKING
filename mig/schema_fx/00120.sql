CREATE OR REPLACE FUNCTION public.logistics_assert_plan_shipments_have_items(p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment record;
begin
  for v_shipment in
    select shipment.id as shipment_id, shipment.linked_order_id
    from public.logistics_shipments shipment
    where shipment.plan_id = p_plan_id
      and coalesce(shipment.shipment_status, '') not in ('DELIVERED', 'CANCELLED', 'FAILED')
      and not exists (
        select 1
        from public.logistics_shipment_items item
        where item.shipment_id = shipment.id
      )
  loop
    if v_shipment.linked_order_id is not null then
      perform public.sync_logistics_shipment_items_from_order(
        v_shipment.shipment_id,
        v_shipment.linked_order_id
      );
    end if;
  end loop;

  if exists (
    select 1
    from public.logistics_shipments shipment
    where shipment.plan_id = p_plan_id
      and coalesce(shipment.shipment_status, '') not in ('DELIVERED', 'CANCELLED', 'FAILED')
      and shipment.linked_order_id is null
      and not exists (
        select 1
        from public.logistics_shipment_items item
        where item.shipment_id = shipment.id
      )
  ) then
    raise exception 'Some shipments have no linked order and no items. Link the order first.'
      using errcode = 'P0001';
  end if;
end;
$function$;
