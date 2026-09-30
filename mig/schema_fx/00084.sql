CREATE OR REPLACE FUNCTION public.driver_submit_order_collections(p_shipment_id uuid, p_order_collections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
  v_order jsonb;
  v_payment_method text;
  v_order_total numeric(14, 2);
  v_collected_amount numeric(14, 2);
  v_driver_debt_amount numeric(14, 2);
  v_cash_total numeric(14, 2) := 0;
  v_sales_rep_id uuid;
  v_transfer_responsible_name text;
begin
  select *
  into v_shipment
  from public.logistics_shipments
  where id::text = p_shipment_id::text
  for update;

  if v_shipment.id is null or v_shipment.assigned_profile_id::text <> auth.uid()::text then
    raise exception 'Shipment not found or not authorized.';
  end if;

  if jsonb_typeof(coalesce(p_order_collections, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_order_collections, '[]'::jsonb)) = 0
  then
    raise exception 'At least one order collection is required.';
  end if;

  for v_order in select * from jsonb_array_elements(p_order_collections)
  loop
    v_payment_method := lower(trim(coalesce(v_order->>'paymentMethod', '')));
    if v_payment_method = 'transfer' then
      v_payment_method := 'bank_transfer';
    elsif v_payment_method = 'installments' then
      v_payment_method := 'credit';
    end if;

    if v_payment_method not in ('cash', 'credit', 'cheque', 'bank_transfer') then
      raise exception 'Unsupported payment method: %.', v_payment_method;
    end if;

    v_sales_rep_id := nullif(v_order->>'salesRepId', '')::uuid;
    v_transfer_responsible_name := coalesce(
      nullif(v_order->>'salesRepName', ''),
      nullif(v_order->>'orderCreateUid', '')
    );

    v_order_total := coalesce((v_order->>'orderTotal')::numeric, 0);
    v_collected_amount := case when v_payment_method = 'cash' then v_order_total else 0 end;
    v_driver_debt_amount := case when v_payment_method = 'cash' then v_order_total else 0 end;
    v_cash_total := v_cash_total + v_driver_debt_amount;

    insert into public.logistics_order_collections (
      shipment_id,
      order_id,
      order_number,
      order_total,
      payment_method,
      collected_amount,
      driver_debt_amount,
      sales_rep_id,
      transfer_responsible_name,
      cheque_reference,
      installment_count,
      collection_status,
      accounting_status,
      driver_notes,
      collected_at
    )
    values (
      p_shipment_id::text,
      v_order->>'orderId',
      nullif(v_order->>'orderNumber', ''),
      v_order_total,
      v_payment_method,
      v_collected_amount,
      v_driver_debt_amount,
      v_sales_rep_id,
      v_transfer_responsible_name,
      nullif(v_order->>'chequeReference', ''),
      null,
      case when v_payment_method = 'cash' then 'collected' else 'exempt' end,
      'pending_accounting_review',
      nullif(v_order->>'driverNotes', ''),
      timezone('utc', now())
    )
    on conflict (shipment_id, order_id) do update set
      order_number = excluded.order_number,
      order_total = excluded.order_total,
      payment_method = excluded.payment_method,
      collected_amount = excluded.collected_amount,
      driver_debt_amount = excluded.driver_debt_amount,
      sales_rep_id = excluded.sales_rep_id,
      transfer_responsible_name = excluded.transfer_responsible_name,
      cheque_reference = excluded.cheque_reference,
      installment_count = null,
      collection_status = excluded.collection_status,
      accounting_status = excluded.accounting_status,
      driver_notes = excluded.driver_notes,
      collected_at = excluded.collected_at,
      updated_at = timezone('utc', now());
  end loop;

  insert into public.logistics_shipment_collections (
    shipment_id,
    pending_delivery_amount,
    collected_from_customer,
    driver_debt_amount,
    payment_method,
    collection_status,
    accounting_status,
    collected_from_customer_at
  )
  values (
    p_shipment_id,
    v_cash_total,
    v_cash_total,
    v_cash_total,
    case when v_cash_total > 0 then 'cash' else 'credit' end,
    case when v_cash_total > 0 then 'collected_from_customer' else 'pending_delivery_amount' end,
    'pending_accounting_review',
    case when v_cash_total > 0 then timezone('utc', now()) else null end
  )
  on conflict (shipment_id) do update set
    pending_delivery_amount = excluded.pending_delivery_amount,
    collected_from_customer = excluded.collected_from_customer,
    driver_debt_amount = excluded.driver_debt_amount,
    payment_method = excluded.payment_method,
    collection_status = excluded.collection_status,
    accounting_status = excluded.accounting_status,
    collected_from_customer_at = case
      when excluded.driver_debt_amount > 0
        then coalesce(public.logistics_shipment_collections.collected_from_customer_at, excluded.collected_from_customer_at)
      else public.logistics_shipment_collections.collected_from_customer_at
    end,
    updated_at = timezone('utc', now());

  insert into public.logistics_shipment_events (
    shipment_id,
    actor_profile_id,
    previous_phase,
    next_phase,
    note,
    payload
  )
  values (
    p_shipment_id,
    auth.uid(),
    v_shipment.delivery_phase,
    'collection_submitted',
    'Order collections submitted',
    jsonb_build_object(
      'order_count', jsonb_array_length(p_order_collections),
      'cash_total', v_cash_total,
      'cash_only_driver_debt', true,
      'transfer_attribution_source', 'orders.create_uid'
    )
  );

  return jsonb_build_object(
    'success', true,
    'order_count', jsonb_array_length(p_order_collections),
    'cash_total', v_cash_total
  );
end;
$function$;
