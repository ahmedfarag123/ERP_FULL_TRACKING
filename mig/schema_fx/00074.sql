CREATE OR REPLACE FUNCTION public.driver_get_shipment_orders(p_shipment_ids uuid[])
 RETURNS TABLE(shipment_id uuid, order_id uuid, order_number text, order_total numeric, payment_term text, order_create_uid text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    shipment.id as shipment_id,
    o.id as order_id,
    coalesce(o.odoo_order_name, o.external_order_id) as order_number,
    o.total_amount as order_total,
    case
      when o.raw_payload ? 'payment_term_id' then o.raw_payload->>'payment_term_id'
      else null
    end as payment_term,
    o.create_uid as order_create_uid
  from public.logistics_shipments as shipment
  join lateral (
    select matched_order.*
    from public.orders as matched_order
    where matched_order.id = shipment.linked_order_id
      or (
        shipment.linked_order_id is null
        and (
          (shipment.odoo_order_name is not null and matched_order.odoo_order_name = shipment.odoo_order_name)
          or (shipment.external_order_id is not null and matched_order.external_order_id = shipment.external_order_id)
        )
      )
    order by
      case when matched_order.id = shipment.linked_order_id then 0 else 1 end,
      matched_order.created_at desc
    limit 1
  ) as o on true
  where shipment.id = any(coalesce(p_shipment_ids, array[]::uuid[]))
    and shipment.assigned_profile_id::text = auth.uid()::text;
$function$;
