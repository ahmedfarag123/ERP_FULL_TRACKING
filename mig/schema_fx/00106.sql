CREATE OR REPLACE FUNCTION public.get_order_delivery_reconciliation(p_order_id uuid)
 RETURNS TABLE(product_name text, ordered_qty numeric, delivered_qty numeric, remaining_qty numeric, delivery_status text)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT
    oli.product_name,
    oli.ordered_quantity AS ordered_qty,
    COALESCE(SUM(
      greatest(coalesce(nullif(item.done_quantity, 0), item.requested_quantity, 0), 0)
    ), 0) AS delivered_qty,
    oli.ordered_quantity - COALESCE(SUM(
      greatest(coalesce(nullif(item.done_quantity, 0), item.requested_quantity, 0), 0)
    ), 0) AS remaining_qty,
    CASE
      WHEN COALESCE(SUM(greatest(coalesce(nullif(item.done_quantity, 0), item.requested_quantity, 0), 0)), 0) >= oli.ordered_quantity THEN 'complete'
      WHEN COALESCE(SUM(greatest(coalesce(nullif(item.done_quantity, 0), item.requested_quantity, 0), 0)), 0) > 0 THEN 'partial'
      ELSE 'pending'
    END AS delivery_status
  FROM public.order_line_items oli
  LEFT JOIN public.logistics_shipment_items item
    ON item.external_product_id = oli.external_product_id
    AND item.shipment_id IN (
      SELECT id FROM public.logistics_shipments WHERE linked_order_id = p_order_id
    )
  WHERE oli.order_id = p_order_id
  GROUP BY oli.id, oli.product_name, oli.ordered_quantity
  ORDER BY oli.sort_order;
$function$;
