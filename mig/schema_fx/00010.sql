CREATE OR REPLACE FUNCTION public.admin_assign_order_to_driver(p_order_id uuid, p_logistics_user_id uuid, p_scheduled_at timestamp with time zone, p_notes text DEFAULT NULL::text, p_planned_date date DEFAULT NULL::date, p_force_new boolean DEFAULT false, p_plan_id uuid DEFAULT NULL::uuid)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.orders%rowtype;
  v_customer public.customers%rowtype;
  v_plan public.logistics_delivery_plans%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_shipment_id uuid;
  v_planned_date date;
  v_total_amount numeric(14, 2);
  v_currency text;
begin
  perform public.logistics_admin_required();

  if p_scheduled_at is null then
    raise exception 'Scheduled delivery time is required.';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  select *
  into v_customer
  from public.customers
  where id = v_order.customer_id;

  v_planned_date := coalesce(p_planned_date, (p_scheduled_at at time zone 'Africa/Cairo')::date);

  if p_plan_id is not null then
    select *
    into v_plan
    from public.logistics_delivery_plans
    where id = p_plan_id
    for update;

    if v_plan.id is null then
      perform public.raise_logistics_error('PLAN_NOT_FOUND', 'Plan not found.');
    end if;

    if v_plan.logistics_user_id is distinct from p_logistics_user_id then
      perform public.raise_logistics_error('PLAN_DRIVER_MISMATCH', 'Selected plan belongs to a different driver.');
    end if;

    if v_plan.plan_status not in ('pending', 'in_progress') then
      perform public.raise_logistics_error('INVALID_PLAN_STATUS', 'Plan cannot receive assigned orders in its current status.');
    end if;
  else
    select *
    into v_plan
    from public.admin_create_delivery_plan(p_logistics_user_id, v_planned_date, p_notes, p_force_new);
  end if;

  select *
  into v_shipment
  from public.logistics_shipments
  where linked_order_id = v_order.id
    and coalesce(shipment_status, 'PENDING_ASSIGN') not in ('DELIVERED', 'FINISHED', 'SETTLED')
  order by created_at desc
  limit 1
  for update;

  if v_shipment.id is null then
    insert into public.logistics_shipments (
      plan_id,
      shipment_reference,
      origin_ref,
      external_order_id,
      odoo_order_name,
      linked_order_id,
      customer_id,
      customer_name,
      external_warehouse_id,
      warehouse_name,
      shipment_state,
      shipment_status,
      delivery_phase,
      scheduled_at,
      customer_latitude,
      customer_longitude,
      notes,
      source,
      raw_payload
    )
    values (
      v_plan.id,
      'SHIP-' || coalesce(v_order.odoo_order_name, v_order.external_order_id, left(v_order.id::text, 8)),
      coalesce(v_order.odoo_order_name, v_order.external_order_id, v_order.id::text),
      v_order.external_order_id,
      v_order.odoo_order_name,
      v_order.id,
      v_order.customer_id,
      coalesce(v_order.customer_name, v_customer.customer_name),
      v_order.warehouse_id,
      v_order.warehouse_id,
      'assigned',
      'ASSIGNED',
      'assigned',
      p_scheduled_at,
      v_customer.lat,
      v_customer.lng,
      nullif(trim(coalesce(p_notes, '')), ''),
      'manual',
      jsonb_build_object(
        'assigned_from', 'admin_assign_order_to_driver',
        'assigned_by', auth.uid(),
        'payment_term', v_order.payment_term_id
      )
    )
    returning *
    into v_shipment;
  else
    update public.logistics_shipments
    set
      customer_id = coalesce(customer_id, v_order.customer_id),
      customer_name = coalesce(customer_name, v_order.customer_name, v_customer.customer_name),
      external_order_id = coalesce(external_order_id, v_order.external_order_id),
      odoo_order_name = coalesce(odoo_order_name, v_order.odoo_order_name),
      external_warehouse_id = coalesce(external_warehouse_id, v_order.warehouse_id),
      warehouse_name = coalesce(warehouse_name, v_order.warehouse_id),
      customer_latitude = coalesce(customer_latitude, v_customer.lat),
      customer_longitude = coalesce(customer_longitude, v_customer.lng),
      scheduled_at = p_scheduled_at,
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      updated_at = timezone('utc', now())
    where id = v_shipment.id
    returning *
    into v_shipment;
  end if;

  v_shipment_id := v_shipment.id;

  select *
  into v_shipment
  from public.admin_assign_shipment_to_plan(v_shipment_id, v_plan.id, p_scheduled_at, p_notes);

  perform public.sync_logistics_shipment_items_from_order(v_shipment.id, v_order.id);

  v_total_amount := coalesce(v_order.amount_total, v_order.total_amount, 0);
  v_currency := coalesce(v_order.currency_code, 'EGP');

  insert into public.logistics_shipment_collections (
    shipment_id,
    pending_delivery_amount,
    collected_from_customer,
    collected_successfully_amount,
    currency_code,
    collection_status
  )
  values (
    v_shipment.id,
    v_total_amount,
    0,
    0,
    v_currency,
    'pending_delivery_amount'
  )
  on conflict (shipment_id) do update
  set
    pending_delivery_amount = greatest(public.logistics_shipment_collections.pending_delivery_amount, excluded.pending_delivery_amount),
    currency_code = excluded.currency_code,
    updated_at = timezone('utc', now());

  return v_shipment;
end;
$function$;
