CREATE OR REPLACE FUNCTION public.driver_submit_collection_handover(p_plan_id uuid DEFAULT NULL::uuid, p_handed_to_manager boolean DEFAULT false, p_reason text DEFAULT NULL::text, p_total_amount numeric DEFAULT 0, p_currency_code text DEFAULT 'EGP'::text)
 RETURNS logistics_collection_handovers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_handover public.logistics_collection_handovers%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Authentication required.';
  end if;

  if not p_handed_to_manager and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Reason is required when collection was not handed to manager.';
  end if;

  insert into public.logistics_collection_handovers (
    driver_profile_id,
    plan_id,
    handed_to_manager,
    reason,
    total_amount,
    currency_code,
    metadata
  )
  values (
    auth.uid(),
    p_plan_id,
    p_handed_to_manager,
    nullif(trim(coalesce(p_reason, '')), ''),
    coalesce(p_total_amount, 0),
    coalesce(nullif(trim(p_currency_code), ''), 'EGP'),
    jsonb_build_object('driver_name', v_profile.full_name)
  )
  returning *
  into v_handover;

  return v_handover;
end;
$function$;
