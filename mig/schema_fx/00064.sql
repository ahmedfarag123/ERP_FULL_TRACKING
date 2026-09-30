CREATE OR REPLACE FUNCTION public.dispatcher_resync_plan_items(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_preparation_id uuid;
  v_deleted integer;
  v_inserted integer;
begin
  select id into v_preparation_id
  from public.dispatcher_plan_preparations
  where plan_id = p_plan_id;

  if v_preparation_id is null then
    raise exception 'No preparation found for plan %', p_plan_id;
  end if;

  -- Delete existing items
  delete from public.dispatcher_plan_item_preparations
  where plan_preparation_id = v_preparation_id;

  get diagnostics v_deleted = row_count;

  -- Re-seed from current shipments
  insert into public.dispatcher_plan_item_preparations (
    plan_preparation_id, plan_id, product_name, product_ref, product_code,
    external_product_id, product_id, dataset_id,
    total_requested_quantity, approved_quantity, status
  )
  select
    v_preparation_id,
    p_plan_id,
    coalesce(oli.product_name, oli.product_ref, oli.product_code, 'product'),
    oli.product_ref,
    oli.product_code,
    oli.external_product_id,
    null as product_id,
    null as dataset_id,
    sum(coalesce(oli.ordered_quantity, 0)) as total_requested_quantity,
    0 as approved_quantity,
    'pending' as status
  from public.logistics_shipments ls
  join public.order_line_items oli on oli.order_id = ls.linked_order_id
  where ls.plan_id = p_plan_id
    and ls.linked_order_id is not null
    and (oli.display_type is null or oli.display_type = 'false')
    and (
      coalesce(oli.external_product_id, '') <> ''
      or coalesce(oli.product_ref, '') <> ''
      or coalesce(oli.product_code, '') <> ''
    )
    and (
      coalesce(oli.ordered_quantity, 0) > 0
      or coalesce(oli.delivered_quantity, 0) > 0
      or coalesce(oli.total_amount, 0) > 0
      or coalesce(oli.subtotal_amount, 0) > 0
      or coalesce(oli.unit_price, 0) > 0
    )
  group by
    oli.product_name, oli.product_ref, oli.product_code, oli.external_product_id;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'preparation_id', v_preparation_id,
    'deleted', v_deleted,
    'inserted', v_inserted
  );
end;
$function$;
