CREATE OR REPLACE FUNCTION public.dispatcher_receive_returned_item(p_return_shipment_id uuid, p_item_id uuid, p_received_quantity numeric, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item public.logistics_return_shipment_items%rowtype;
  v_return_shipment public.logistics_shipments%rowtype;
  v_all_received boolean;
begin
  if not public.is_management_role() then
    raise exception 'Only dispatchers can receive returned items.';
  end if;

  select * into v_item
  from public.logistics_return_shipment_items
  where id = p_item_id and return_shipment_id = p_return_shipment_id
  for update;

  if v_item.id is null then
    raise exception 'Return item not found.';
  end if;

  if p_received_quantity < 0 or p_received_quantity > v_item.returned_quantity then
    raise exception 'Received quantity must be between 0 and % (returned qty).', v_item.returned_quantity;
  end if;

  if p_received_quantity < v_item.returned_quantity and p_reason is null then
    raise exception 'Reason is required when received quantity is less than returned quantity.';
  end if;

  update public.logistics_return_shipment_items
  set
    received_quantity = p_received_quantity,
    return_reason = coalesce(p_reason, return_reason),
    updated_at = timezone('utc', now())
  where id = p_item_id;

  -- Check if all items in this return shipment have been fully received
  select * into v_return_shipment
  from public.logistics_shipments
  where id = p_return_shipment_id
  for update;

  select not exists (
    select 1
    from public.logistics_return_shipment_items
    where return_shipment_id = p_return_shipment_id
      and received_quantity < returned_quantity
  ) into v_all_received;

  if v_all_received then
    -- All items received - mark return shipment as finished then settled
    update public.logistics_shipments
    set
      shipment_status = 'FINISHED',
      delivery_phase = 'finished',
      shipment_state = 'done',
      completed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = p_return_shipment_id;

    -- Complete the return-trip plan if it exists
    if v_return_shipment.plan_id is not null then
      perform private.logistics_complete_plan_if_shipments_delivered(v_return_shipment.plan_id);
    end if;
  else
    -- Partially received - update status to indicate progress
    update public.logistics_shipments
    set
      shipment_status = 'ASSIGNED',
      updated_at = timezone('utc', now())
    where id = p_return_shipment_id
      and shipment_status = 'PENDING_ASSIGN';
  end if;
end;
$function$;
