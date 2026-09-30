CREATE OR REPLACE FUNCTION public.dispatcher_get_plan_items(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', dpi.id,
      'plan_preparation_id', dpi.plan_preparation_id,
      'plan_id', dpi.plan_id,
      'product_name', dpi.product_name,
      'product_ref', dpi.product_ref,
      'product_code', dpi.product_code,
      'external_product_id', dpi.external_product_id,
      'product_id', dpi.product_id,
      'dataset_id', dpi.dataset_id,
      'total_requested_quantity', dpi.total_requested_quantity,
      'approved_quantity', dpi.approved_quantity,
      'preparation_status', dpi.status,
      'shortage_reason', dpi.shortage_reason,
      'note', dpi.note,
      'barcode_scanned', (dpi.barcode_validated_at is not null)
    )
    order by dpi.product_name
  ), '[]'::jsonb)
  from public.dispatcher_plan_item_preparations dpi
  where dpi.plan_id = p_plan_id;
$function$;
