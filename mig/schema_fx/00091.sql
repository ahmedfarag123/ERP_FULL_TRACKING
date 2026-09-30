CREATE OR REPLACE FUNCTION public.driver_update_shipment_phase(p_shipment_id uuid, p_next_phase text, p_note text DEFAULT NULL::text, p_proof_photo_path text DEFAULT NULL::text, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric, p_payload jsonb DEFAULT NULL::jsonb)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_current_phase text;
  v_next_phase text;
  v_completed_at timestamptz;
  v_cogs_account uuid;
  v_revenue_account uuid;
  v_line_total numeric(14,2);
  v_journal_lines jsonb;
  v_item record;
  v_return_shipment_id uuid;
  v_return_plan_id uuid;
  v_has_returns boolean := false;
  v_return_items jsonb := '[]'::jsonb;
  v_total_returned_value numeric(14,2) := 0;
  v_unit_price numeric(14,2);
  v_delivered_total numeric(14,2) := 0;
  v_savings_account uuid;
  v_ar_account uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'Authentication required.'; end if;

  select * into v_shipment from public.logistics_shipments where id = p_shipment_id for update;
  if v_shipment.id is null then raise exception 'Shipment not found.'; end if;

  if not public.is_management_role() and v_shipment.assigned_profile_id <> auth.uid() then
    raise exception 'You do not have access to update this shipment.'; end if;

  v_current_phase := lower(coalesce(v_shipment.delivery_phase, 'pending'));
  v_next_phase := lower(trim(coalesce(p_next_phase, '')));

  if v_next_phase = '' then raise exception 'Next phase is required.'; end if;
  if v_current_phase = v_next_phase then return v_shipment; end if;

  -- Transition guard
  if v_current_phase in ('pending', 'ready') and v_next_phase not in ('in_transit', 'cancelled', 'failed') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;
  if v_current_phase = 'in_transit' and v_next_phase not in ('arrived_delivery', 'failed', 'cancelled') then
    raise exception 'Invalid transition from % to %. Must arrive at customer before delivery.', v_current_phase, v_next_phase;
  end if;
  if v_current_phase = 'arrived_delivery' and v_next_phase not in ('delivered', 'failed', 'cancelled') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;
  if v_current_phase in ('failed', 'cancelled') and v_next_phase not in ('in_transit', 'arrived_delivery', 'delivered') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;

  v_completed_at := case
    when v_next_phase in ('delivered', 'cancelled') then timezone('utc', now())
    else v_shipment.completed_at
  end;

  update public.logistics_shipments set
    delivery_phase = v_next_phase,
    shipment_state = case
      when v_next_phase = 'delivered' then 'done'
      when v_next_phase = 'cancelled' then 'cancel'
      when v_next_phase = 'failed' then 'exception'
      when v_next_phase in ('in_transit', 'arrived_delivery') then 'assigned'
      else shipment_state
    end,
    arrived_at_customer_at = case
      when v_next_phase = 'arrived_delivery' and v_shipment.arrived_at_customer_at is null then timezone('utc', now())
      else arrived_at_customer_at
    end,
    notes = coalesce(nullif(trim(coalesce(p_note, '')), ''), notes),
    completed_at = v_completed_at,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning * into v_shipment;

  insert into public.logistics_shipment_events (
    shipment_id, actor_profile_id, previous_phase, next_phase, note, proof_photo_path, location_lat, location_lng, payload
  ) values (
    v_shipment.id, auth.uid(), v_current_phase, v_next_phase,
    nullif(trim(coalesce(p_note, '')), ''), nullif(trim(coalesce(p_proof_photo_path, '')), ''),
    p_location_lat, p_location_lng, coalesce(p_payload, '{}'::jsonb)
  );

  -- On delivery: validate all items confirmed, compute returns, create return shipment
  if v_next_phase = 'delivered' and v_shipment.linked_order_id is not null then
    if exists (
      select 1 from public.logistics_shipment_items li
      where li.shipment_id = p_shipment_id and li.done_quantity is null
    ) then
      raise exception 'All items must have confirmed delivered quantities before marking delivered.';
    end if;

    update public.logistics_shipment_items li
    set approved_quantity = coalesce(li.approved_quantity, dp.approved_quantity)
    from public.dispatcher_plan_item_preparations dp
    join public.dispatcher_plan_preparations dpp on dpp.id = dp.plan_preparation_id
    join public.logistics_delivery_plans ldp on ldp.id = dpp.plan_id
    where li.shipment_id = p_shipment_id
      and li.approved_quantity is null
      and ldp.id = v_shipment.plan_id
      and lower(trim(dp.product_name)) = lower(trim(li.product_name));

    for v_item in
      select li.id as item_id, li.product_id, li.external_product_id, li.product_ref, li.product_name,
        li.requested_quantity,
        coalesce(li.approved_quantity, li.requested_quantity) as effective_approved,
        coalesce(li.done_quantity, 0) as delivered_qty
      from public.logistics_shipment_items li
      where li.shipment_id = p_shipment_id
    loop
      if v_item.delivered_qty < v_item.effective_approved then
        v_has_returns := true;
        update public.logistics_shipment_items
        set returned_quantity = v_item.effective_approved - v_item.delivered_qty
        where id = v_item.item_id;

        select coalesce(oli.unit_price, oli.total_amount / nullif(oli.ordered_quantity, 0), 0)
        into v_unit_price
        from public.order_line_items oli
        where oli.order_id = v_shipment.linked_order_id
          and lower(trim(oli.product_name)) = lower(trim(v_item.product_name))
        limit 1;

        v_total_returned_value := v_total_returned_value + ((v_item.effective_approved - v_item.delivered_qty) * coalesce(v_unit_price, 0));
        v_return_items := v_return_items || jsonb_build_object(
          'parent_item_id', v_item.item_id, 'product_id', v_item.product_id,
          'external_product_id', v_item.external_product_id, 'product_ref', v_item.product_ref,
          'product_name', v_item.product_name, 'requested_quantity', v_item.requested_quantity,
          'approved_quantity', v_item.effective_approved, 'delivered_quantity', v_item.delivered_qty,
          'returned_quantity', v_item.effective_approved - v_item.delivered_qty
        );
      else
        update public.logistics_shipment_items set returned_quantity = 0 where id = v_item.item_id;
      end if;
    end loop;

    if v_has_returns then
      insert into public.logistics_shipments (
        origin_ref, odoo_order_name,
        customer_id, external_customer_id, customer_name, customer_phone,
        customer_latitude, customer_longitude,
        warehouse_id, external_warehouse_id, warehouse_name,
        warehouse_latitude, warehouse_longitude,
        logistics_user_id, assigned_profile_id, assigned_user_name,
        shipment_status, shipment_state, delivery_phase,
        parent_shipment_id, is_return_shipment, return_reference,
        total_gmv, notes, priority, scheduled_at, last_sync_at
      ) values (
        v_shipment.origin_ref, v_shipment.odoo_order_name,
        v_shipment.customer_id, v_shipment.external_customer_id, v_shipment.customer_name, v_shipment.customer_phone,
        v_shipment.customer_latitude, v_shipment.customer_longitude,
        v_shipment.warehouse_id, v_shipment.external_warehouse_id, v_shipment.warehouse_name,
        v_shipment.warehouse_latitude, v_shipment.warehouse_longitude,
        v_shipment.logistics_user_id, null, null,
        'PENDING_ASSIGN', 'assigned', 'pending',
        p_shipment_id, true, 'R-' || v_shipment.origin_ref,
        v_total_returned_value, 'Auto-created return from delivery of shipment ' || v_shipment.shipment_reference,
        v_shipment.priority, current_date, timezone('utc', now())
      ) returning id into v_return_shipment_id;

      insert into public.logistics_delivery_plans (
        plan_reference, return_of_plan_id, logistics_user_id, planned_date, plan_status, notes
      ) values (
        'RET-' || v_shipment.origin_ref,
        v_shipment.plan_id,
        v_shipment.logistics_user_id, current_date, 'returned',
        'Return trip for shipment ' || v_shipment.origin_ref
      ) returning id into v_return_plan_id;

      update public.logistics_shipments set plan_id = v_return_plan_id where id = v_return_shipment_id;

      insert into public.logistics_return_shipment_items (
        return_shipment_id, parent_shipment_id, parent_item_id,
        product_id, external_product_id, product_ref, product_name,
        requested_quantity, approved_quantity, delivered_quantity, returned_quantity, return_reason
      )
      select v_return_shipment_id, p_shipment_id, (item->>'parent_item_id')::uuid,
        item->>'product_id', item->>'external_product_id', item->>'product_ref', item->>'product_name',
        (item->>'requested_quantity')::numeric, (item->>'approved_quantity')::numeric,
        (item->>'delivered_quantity')::numeric, (item->>'returned_quantity')::numeric,
        'driver_partial_delivery'
      from jsonb_array_elements(v_return_items) as item;

      insert into public.logistics_shipment_events (shipment_id, actor_profile_id, previous_phase, next_phase, note, payload)
      values (v_shipment.id, auth.uid(), 'delivered', 'return_created', 'Auto-created return shipment',
        jsonb_build_object('event_type', 'return_created', 'return_shipment_id', v_return_shipment_id,
          'return_plan_id', v_return_plan_id, 'returned_items', v_return_items, 'total_returned_value', v_total_returned_value));

      insert into public.logistics_shipment_events (shipment_id, actor_profile_id, previous_phase, next_phase, note, payload)
      values (v_return_shipment_id, auth.uid(), null, 'pending', 'Return shipment created from delivery',
        jsonb_build_object('parent_shipment_id', p_shipment_id, 'returned_items', v_return_items, 'total_returned_value', v_total_returned_value));
    end if;

    select id into v_cogs_account from public.finance_accounts where code = '5010' and allow_posting = true limit 1;
    select id into v_revenue_account from public.finance_accounts where code = '4010' and allow_posting = true limit 1;

    select coalesce(sum(li.done_quantity * coalesce(oli.unit_price, oli.total_amount / nullif(oli.ordered_quantity, 0), 0)), 0)
    into v_delivered_total
    from public.logistics_shipment_items li
    join public.order_line_items oli on oli.order_id = v_shipment.linked_order_id
      and lower(trim(oli.product_name)) = lower(trim(li.product_name))
    where li.shipment_id = p_shipment_id;

    if v_cogs_account is not null and v_revenue_account is not null and v_delivered_total > 0 then
      perform public.post_journal_entry(
        p_entry_date := current_date, p_source_type := 'delivery', p_source_id := v_shipment.linked_order_id,
        p_description := 'Auto journal: delivery of order ' || v_shipment.linked_order_id || ' (delivered qty)',
        p_lines := jsonb_build_array(
          jsonb_build_object('account_id', v_cogs_account, 'debit', v_delivered_total, 'credit', 0),
          jsonb_build_object('account_id', v_revenue_account, 'debit', 0, 'credit', v_delivered_total)));
    end if;

    if v_has_returns and v_total_returned_value > 0 then
      select id into v_savings_account from public.finance_accounts where code = '4030' and allow_posting = true limit 1;
      select id into v_ar_account from public.finance_accounts where code = '1013' and allow_posting = true limit 1;
      if v_savings_account is not null and v_ar_account is not null then
        perform public.post_journal_entry(
          p_entry_date := current_date, p_source_type := 'reversal', p_source_id := v_return_shipment_id,
          p_description := 'Auto credit note: returned goods from delivery ' || coalesce(v_shipment.shipment_reference, v_shipment.id::text),
          p_lines := jsonb_build_array(
            jsonb_build_object('account_id', v_savings_account, 'debit', v_total_returned_value, 'credit', 0),
            jsonb_build_object('account_id', v_ar_account, 'debit', 0, 'credit', v_total_returned_value)));
      end if;
    end if;
  end if;

  return v_shipment;
end;
$function$;
