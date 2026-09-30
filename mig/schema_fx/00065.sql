CREATE OR REPLACE FUNCTION public.dispatcher_start_plan_preparation(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_plan record;
  v_preparation_id uuid;
  v_actor uuid := auth.uid();
  v_result jsonb;
  v_is_return_plan boolean;
begin
  select id, plan_status into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id;

  if v_plan is null then
    raise exception 'Plan not found';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Plan is not in a assignable status: %', v_plan.plan_status;
  end if;

  -- Check if this is a return plan (has return shipments)
  select exists (
    select 1 from public.logistics_shipments ls
    where ls.plan_id = p_plan_id and ls.is_return_shipment = true
  ) into v_is_return_plan;

  insert into public.dispatcher_plan_preparations (
    plan_id, status, started_at, dispatcher_profile_id
  ) values (
    p_plan_id, 'preparing', now(), v_actor
  )
  on conflict (plan_id) do update
  set status = 'preparing',
      dispatcher_profile_id = v_actor,
      started_at = coalesce(public.dispatcher_plan_preparations.started_at, now()),
      updated_at = now()
  returning id into v_preparation_id;

  if not exists (
    select 1 from public.dispatcher_plan_item_preparations
    where plan_preparation_id = v_preparation_id
  ) then
    if v_is_return_plan then
      -- For return plans: seed from logistics_return_shipment_items
      insert into public.dispatcher_plan_item_preparations (
        plan_preparation_id, plan_id, product_name, product_ref, product_code,
        external_product_id, product_id, dataset_id,
        total_requested_quantity, approved_quantity, status
      )
      select
        v_preparation_id,
        p_plan_id,
        lrsi.product_name,
        lrsi.product_ref,
        null,
        lrsi.external_product_id,
        null,
        null,
        sum(coalesce(lrsi.returned_quantity, 0)) as total_requested_quantity,
        0 as approved_quantity,
        'pending' as status
      from public.logistics_return_shipment_items lrsi
      join public.logistics_shipments ls ON ls.id = lrsi.return_shipment_id
      where ls.plan_id = p_plan_id
        and lrsi.returned_quantity > 0
      group by lrsi.product_name, lrsi.product_ref, lrsi.external_product_id;
    else
      -- For regular plans: seed from order_line_items
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
    end if;
  end if;

  select jsonb_build_object(
    'preparation_id', v_preparation_id,
    'plan_id', p_plan_id,
    'status', 'preparing'
  ) into v_result;

  return v_result;
end;
$function$;
