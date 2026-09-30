CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_reason text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_cancellation_id uuid;
  v_inventory_reversed boolean := false;
BEGIN
  IF NOT public.is_management_role() THEN
    RAISE EXCEPTION 'Only management can cancel orders.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF v_order.status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Order is already %.', v_order.status;
  END IF;

  INSERT INTO public.order_cancellations (order_id, reason, cancelled_by, notes)
  VALUES (p_order_id, p_reason, auth.uid(), p_notes)
  RETURNING id INTO v_cancellation_id;

  UPDATE public.orders
  SET status = 'cancelled',
      delivery_status = 'cancelled',
      updated_at = timezone('utc', now())
  WHERE id = p_order_id;

  UPDATE public.products p
  SET quantity_on_hand = p.quantity_on_hand + oli.delivered_quantity,
      outgoing_quantity = greatest(p.outgoing_quantity - oli.delivered_quantity, 0)
  FROM public.order_line_items oli
  WHERE oli.order_id = p_order_id
    AND oli.product_id = p.id
    AND oli.delivered_quantity > 0;

  v_inventory_reversed := FOUND;

  UPDATE public.order_cancellations
  SET inventory_reversed = v_inventory_reversed
  WHERE id = v_cancellation_id;

  PERFORM public.log_audit_event(
    'cancel_order',
    'order',
    p_order_id,
    p_reason,
    jsonb_build_object(
      'cancellation_id', v_cancellation_id,
      'inventory_reversed', v_inventory_reversed
    )
  );

  RETURN jsonb_build_object(
    'cancellation_id', v_cancellation_id,
    'order_id', p_order_id,
    'inventory_reversed', v_inventory_reversed
  );
END;
$function$;
