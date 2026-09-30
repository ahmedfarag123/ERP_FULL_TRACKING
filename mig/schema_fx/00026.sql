CREATE OR REPLACE FUNCTION public.admin_reject_collection_request(p_request_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS logistics_collection_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request public.logistics_collection_requests%rowtype;
begin
  if not public.is_management_role() then
    raise exception 'Only management users can reject collection requests.';
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

  update public.logistics_collection_requests
  set
    status = 'rejected',
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    reviewed_by_profile_id = auth.uid(),
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_request_id
  returning *
  into v_request;

  return v_request;
end;
$function$;
