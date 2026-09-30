CREATE OR REPLACE FUNCTION public.admin_approve_collection_request(p_request_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS logistics_collection_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request public.logistics_collection_requests%rowtype;
  v_collection public.logistics_shipment_collections%rowtype;
begin
  if not public.is_management_role() then
    raise exception 'Only management users can approve collection requests.';
  end if;

  select *
  into v_request
  from public.logistics_collection_requests
  where id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Collection request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This collection request has already been %.', v_request.status;
  end if;

  -- Update request status
  update public.logistics_collection_requests
  set
    status = 'approved',
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    reviewed_by_profile_id = auth.uid(),
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_request_id
  returning *
  into v_request;

  -- Mark all shipments in the plan as settled
  if v_request.plan_id is not null then
    update public.logistics_shipments
    set
      shipment_status = 'SETTLED',
      delivery_phase = 'settled',
      updated_at = timezone('utc', now())
    where plan_id = v_request.plan_id
      and shipment_status not in ('SETTLED', 'CANCELLED');

    update public.logistics_shipment_collections
    set
      collection_status = 'collected_successfully',
      collected_successfully_amount = v_request.collected_amount,
      admin_confirmed_by_profile_id = auth.uid(),
      admin_confirmed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where shipment_id in (
      select id from public.logistics_shipments
      where plan_id = v_request.plan_id
    )
    and collection_status <> 'collected_successfully';
  end if;

  return v_request;
end;
$function$;
