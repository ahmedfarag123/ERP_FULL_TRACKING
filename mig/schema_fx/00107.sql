CREATE OR REPLACE FUNCTION public.get_orders_with_details(p_status text DEFAULT NULL::text, p_assigned_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_odoo_user_id text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  -- Resolve the caller's odoo_user_id for user_id fallback
  SELECT odoo_user_id INTO v_odoo_user_id FROM public.profiles WHERE id = auth.uid();

  SELECT jsonb_build_object(
    'orders', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'external_order_id', o.external_order_id,
        'customer_name', o.customer_name,
        'customer_phone', o.customer_phone,
        'status', o.status,
        'delivery_status', o.delivery_status,
        'total_amount', o.total_amount,
        'order_date', o.order_date,
        'odoo_order_name', o.odoo_order_name,
        'assigned_user_id', o.assigned_user_id,
        'user_id', o.user_id,
        'line_items', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', oli.id,
            'product_name', oli.product_name,
            'ordered_quantity', oli.ordered_quantity,
            'delivered_quantity', oli.delivered_quantity,
            'unit_price', oli.unit_price,
            'total_amount', oli.total_amount
          ))
          FROM public.order_line_items oli WHERE oli.order_id = o.id
        ), '[]'::jsonb),
        'shipments', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', ls.id,
            'shipment_reference', ls.shipment_reference,
            'delivery_phase', ls.delivery_phase,
            'assigned_user_name', ls.assigned_user_name,
            'scheduled_at', ls.scheduled_at
          ))
          FROM public.logistics_shipments ls WHERE ls.linked_order_id = o.id
        ), '[]'::jsonb)
      )
    ), '[]'::jsonb),
    'total_count', (SELECT count(*) FROM public.orders o2
      LEFT JOIN public.profiles p2 ON p2.odoo_user_id = o2.user_id
      WHERE (p_status IS NULL OR o2.status = p_status)
        AND (p_assigned_user_id IS NULL OR COALESCE(o2.assigned_user_id, p2.id) = p_assigned_user_id))
  ) INTO v_result
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.odoo_user_id = o.user_id
  WHERE (p_status IS NULL OR o.status = p_status)
    AND (p_assigned_user_id IS NULL OR COALESCE(o.assigned_user_id, p.id) = p_assigned_user_id)
  ORDER BY o.order_date DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;

  RETURN v_result;
END;
$function$;
