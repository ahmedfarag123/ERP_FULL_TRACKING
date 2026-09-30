CREATE OR REPLACE FUNCTION public.sync_logistics_shipment_items_from_order(p_shipment_id uuid, p_order_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_shipment_id IS NULL OR p_order_id IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.logistics_shipment_items
  WHERE shipment_id = p_shipment_id
    AND external_move_id LIKE 'order-line:%';

  DELETE FROM public.logistics_shipment_items lsi
  WHERE lsi.shipment_id = p_shipment_id
    AND lsi.source = 'odoo_sync'
    AND lsi.external_product_id IN (
      SELECT line.external_product_id
      FROM public.order_line_items line
      WHERE line.order_id = p_order_id
        AND line.external_product_id IS NOT NULL
    );

  INSERT INTO public.logistics_shipment_items (
    shipment_id, external_move_id, product_id, external_product_id,
    product_name, product_ref, requested_quantity, done_quantity,
    reserved_quantity, forecast_quantity, move_state, source,
    raw_payload, last_sync_at, updated_at
  )
  SELECT
    p_shipment_id,
    'order-line:' || COALESCE(NULLIF(TRIM(line.external_line_id), ''), line.id::text),
    product.id, line.external_product_id,
    COALESCE(NULLIF(TRIM(line.product_name), ''), NULLIF(TRIM(line.product_ref), ''), NULLIF(TRIM(line.product_code), ''), 'Order line'),
    COALESCE(NULLIF(TRIM(line.product_code), ''), NULLIF(TRIM(line.product_ref), ''), NULLIF(TRIM(line.product_uom), '')),
    COALESCE(line.ordered_quantity, 0), COALESCE(line.delivered_quantity, 0),
    0, 0, 'order_line', 'order_line_sync',
    jsonb_build_object('source', 'order_line_items', 'order_line_item_id', line.id, 'external_line_id', line.external_line_id, 'order_id', line.order_id),
    COALESCE(line.last_sync_at, TIMEZONE('utc', NOW())),
    TIMEZONE('utc', NOW())
  FROM public.order_line_items line
  LEFT JOIN public.products product ON product.external_product_id = line.external_product_id
  WHERE line.order_id = p_order_id
  ORDER BY line.sort_order, line.created_at
  ON CONFLICT (external_move_id) DO UPDATE SET
    shipment_id = EXCLUDED.shipment_id, product_id = EXCLUDED.product_id,
    external_product_id = EXCLUDED.external_product_id, product_name = EXCLUDED.product_name,
    product_ref = EXCLUDED.product_ref, requested_quantity = EXCLUDED.requested_quantity,
    done_quantity = EXCLUDED.done_quantity, reserved_quantity = EXCLUDED.reserved_quantity,
    forecast_quantity = EXCLUDED.forecast_quantity, move_state = EXCLUDED.move_state,
    source = EXCLUDED.source, raw_payload = EXCLUDED.raw_payload,
    last_sync_at = EXCLUDED.last_sync_at, updated_at = TIMEZONE('utc', NOW());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;
