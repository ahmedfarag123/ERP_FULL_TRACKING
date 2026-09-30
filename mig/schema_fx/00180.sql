CREATE OR REPLACE FUNCTION private.sync_approved_collection_check_accounting(p_check_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_check public.driver_plan_collection_checks%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_amount numeric(14, 2);
  v_ledger_payment_method text;
  v_pending_amount numeric(14, 2);
  v_collected_amount numeric(14, 2);
  v_driver_debt_amount numeric(14, 2);
  v_collection_status text;
  v_route_cash_amount numeric(14, 2);
begin
  select *
  into v_check
  from public.driver_plan_collection_checks
  where id = p_check_id
  for update;

  if not found
    or v_check.review_status <> 'approved'
    or v_check.check_status <> 'collected' then
    return;
  end if;

  select s.*
  into v_shipment
  from public.logistics_shipments s
  where s.id::text = v_check.shipment_id
  for update of s;

  if not found then
    raise exception 'Shipment % for collection check % was not found.', v_check.shipment_id, v_check.id;
  end if;

  select coalesce(
    (select o.amount_total from public.orders o where o.id = v_shipment.linked_order_id),
    v_shipment.total_gmv,
    0
  )
  into v_amount;

  v_ledger_payment_method := case
    when lower(trim(coalesce(v_check.payment_method, ''))) = 'installments' then 'credit'
    else lower(trim(coalesce(v_check.payment_method, '')))
  end;

  if v_ledger_payment_method not in ('cash', 'credit', 'cheque', 'bank_transfer') then
    raise exception 'Unsupported payment method on collection check %: %', v_check.id, v_check.payment_method;
  end if;

  if v_ledger_payment_method = 'credit' then
    v_pending_amount := 0;
    v_collected_amount := 0;
    v_collection_status := 'pending_delivery_amount';
  else
    v_pending_amount := greatest(coalesce(v_amount, 0), 0);
    v_collected_amount := v_pending_amount;
    v_collection_status := 'collected_from_customer';
  end if;

  v_driver_debt_amount := case
    when v_ledger_payment_method = 'cash' then v_collected_amount
    else 0
  end;

  insert into public.logistics_shipment_collections (
    shipment_id,
    pending_delivery_amount,
    collected_from_customer,
    collected_successfully_amount,
    currency_code,
    collection_status,
    collected_by_logistics_user_id,
    collected_by_profile_id,
    collected_from_customer_at,
    payment_method,
    driver_notes,
    payment_collected_at,
    sales_rep_id,
    driver_debt_amount,
    accounting_status
  ) values (
    v_shipment.id,
    v_pending_amount,
    v_collected_amount,
    0,
    'EGP',
    v_collection_status,
    v_shipment.logistics_user_id,
    v_check.driver_profile_id,
    case when v_collected_amount > 0 then coalesce(v_check.reviewed_at, timezone('utc', now())) end,
    v_ledger_payment_method,
    v_check.driver_notes,
    case when v_collected_amount > 0 then coalesce(v_check.reviewed_at, timezone('utc', now())) end,
    v_check.sales_rep_id,
    v_driver_debt_amount,
    'pending_accounting_review'
  )
  on conflict (shipment_id) do update set
    pending_delivery_amount = excluded.pending_delivery_amount,
    collected_from_customer = excluded.collected_from_customer,
    collection_status = excluded.collection_status,
    collected_by_logistics_user_id = excluded.collected_by_logistics_user_id,
    collected_by_profile_id = excluded.collected_by_profile_id,
    collected_from_customer_at = coalesce(
      public.logistics_shipment_collections.collected_from_customer_at,
      excluded.collected_from_customer_at
    ),
    payment_method = excluded.payment_method,
    driver_notes = excluded.driver_notes,
    payment_collected_at = coalesce(
      public.logistics_shipment_collections.payment_collected_at,
      excluded.payment_collected_at
    ),
    sales_rep_id = excluded.sales_rep_id,
    driver_debt_amount = excluded.driver_debt_amount,
    accounting_status = case
      when public.logistics_shipment_collections.accounting_status = 'confirmed' then 'confirmed'
      else 'pending_accounting_review'
    end,
    updated_at = timezone('utc', now());

  -- Serialize recalculation for this driver/route. The existing balance table
  -- has no uniqueness constraint, so update all pending rows consistently.
  perform pg_advisory_xact_lock(hashtextextended(v_check.driver_profile_id::text || ':' || v_check.plan_id::text, 0));

  select coalesce(sum(l.driver_debt_amount), 0)
  into v_route_cash_amount
  from public.logistics_shipment_collections l
  join public.driver_plan_collection_checks c
    on c.shipment_id = l.shipment_id::text
  where c.plan_id = v_check.plan_id
    and c.driver_profile_id = v_check.driver_profile_id
    and c.review_status = 'approved'
    and c.check_status = 'collected'
    and l.payment_method = 'cash'
    and l.collection_status = 'collected_from_customer';

  update public.driver_cash_balance
  set cash_amount = v_route_cash_amount,
      updated_at = timezone('utc', now())
  where driver_id = v_check.driver_profile_id
    and route_plan_id = v_check.plan_id
    and status = 'pending';

  if not found and v_route_cash_amount > 0 then
    insert into public.driver_cash_balance (
      driver_id,
      route_plan_id,
      cash_amount,
      currency_code,
      status,
      created_at,
      updated_at
    ) values (
      v_check.driver_profile_id,
      v_check.plan_id,
      v_route_cash_amount,
      'EGP',
      'pending',
      timezone('utc', now()),
      timezone('utc', now())
    );
  end if;
end;
$function$;
