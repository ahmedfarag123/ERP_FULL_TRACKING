CREATE OR REPLACE FUNCTION public.driver_submit_plan_settlement_request(p_plan_id uuid, p_total_debt_amount numeric, p_currency_code text DEFAULT 'EGP'::text, p_driver_notes text DEFAULT NULL::text, p_proof_photo_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_driver_id uuid;
  v_existing uuid;
begin
  v_driver_id := auth.uid();

  if v_driver_id is null then
    raise exception 'Driver authentication required.';
  end if;

  if not exists (
    select 1 from public.logistics_delivery_plans
    where id = p_plan_id
      and assigned_profile_id = v_driver_id
  ) then
    raise exception 'Plan not found or not authorized.';
  end if;

  select id into v_existing
  from public.driver_plan_settlement_requests
  where plan_id = p_plan_id;

  if v_existing is not null then
    raise exception 'Settlement request already exists for this plan.';
  end if;

  insert into public.driver_plan_settlement_requests (
    driver_profile_id,
    plan_id,
    total_debt_amount,
    currency_code,
    driver_notes,
    proof_photo_url
  ) values (
    v_driver_id,
    p_plan_id,
    p_total_debt_amount,
    p_currency_code,
    p_driver_notes,
    p_proof_photo_url
  );

  return jsonb_build_object('success', true, 'message', 'Settlement request submitted successfully.');
end;
$function$;
