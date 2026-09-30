CREATE OR REPLACE FUNCTION public.driver_submit_collection_check(p_shipment_id text, p_check_status text, p_payment_method text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_driver_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
  v_plan_id  uuid;
  v_payment_method text;
begin
  v_payment_method := nullif(trim(lower(p_payment_method)), '');

  select * into v_shipment
  from public.logistics_shipments
  where id::text = p_shipment_id::text
  for update;

  if v_shipment.id is null or v_shipment.assigned_profile_id <> auth.uid() then
    raise exception 'Shipment not found or not authorized.';
  end if;

  v_plan_id := v_shipment.plan_id;

  if p_check_status not in ('collected', 'not_collected') then
    raise exception 'Invalid check_status: %', p_check_status;
  end if;

  if p_check_status = 'collected' then
    if v_payment_method not in ('cash', 'bank_transfer', 'installments', 'cheque', 'credit') then
      raise exception 'payment_method is required for collected status. Allowed values: cash, bank_transfer, installments, cheque, credit.';
    end if;
  end if;

  if p_check_status = 'not_collected' then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'reason is required for not_collected status.';
    end if;
  end if;

  insert into public.driver_plan_collection_checks (
    shipment_id, driver_profile_id, plan_id,
    check_status, payment_method, reason, driver_notes
  ) values (
    p_shipment_id, auth.uid(), v_plan_id,
    p_check_status, v_payment_method, p_reason, p_driver_notes
  )
  on conflict (shipment_id) do update set
    check_status    = excluded.check_status,
    payment_method  = excluded.payment_method,
    reason          = excluded.reason,
    driver_notes    = excluded.driver_notes,
    review_status   = 'pending',
    reviewed_by_profile_id = null,
    admin_notes     = null,
    reviewed_at     = null,
    updated_at      = timezone('utc', now());

  return jsonb_build_object('success', true, 'shipment_id', p_shipment_id);
end;
$function$;
