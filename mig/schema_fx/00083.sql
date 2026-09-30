CREATE OR REPLACE FUNCTION public.driver_submit_collection_request(p_plan_id uuid DEFAULT NULL::uuid, p_collected_amount numeric DEFAULT 0, p_currency_code text DEFAULT 'EGP'::text, p_proof_photo_url text DEFAULT NULL::text, p_driver_notes text DEFAULT NULL::text)
 RETURNS logistics_collection_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_request public.logistics_collection_requests%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(p_collected_amount, 0) <= 0 then
    raise exception 'Collected amount must be greater than zero.';
  end if;

  insert into public.logistics_collection_requests (
    driver_profile_id,
    plan_id,
    collected_amount,
    currency_code,
    proof_photo_url,
    driver_notes,
    status
  )
  values (
    auth.uid(),
    p_plan_id,
    p_collected_amount,
    coalesce(nullif(trim(p_currency_code), ''), 'EGP'),
    nullif(trim(coalesce(p_proof_photo_url, '')), ''),
    nullif(trim(coalesce(p_driver_notes, '')), ''),
    'pending'
  )
  returning *
  into v_request;

  return v_request;
end;
$function$;
