CREATE OR REPLACE FUNCTION public.dispatcher_get_plan_orders(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'order_id', o.id,
      'odoo_order_name', o.odoo_order_name,
      'customer_name', o.customer_name,
      'total_amount', o.total_amount,
      'currency_code', o.currency_code,
      'items_count', (
        select count(*)
        from public.order_line_items oli
        where oli.order_id = o.id
          and oli.display_type is null
      )
    )
    order by o.odoo_order_name
  ), '[]'::jsonb)
  from public.logistics_shipments ls
  join public.orders o on o.id = ls.linked_order_id
  where ls.plan_id = p_plan_id
    and ls.linked_order_id is not null;
$function$;
