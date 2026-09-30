CREATE OR REPLACE FUNCTION public.admin_review_settlement_request(p_request_id uuid, p_status text, p_admin_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_management_role() then
    raise exception 'Admin access required.';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status. Must be approved or rejected.';
  end if;

  update public.driver_plan_settlement_requests
  set
    status = p_status,
    admin_notes = p_admin_notes,
    reviewed_by_profile_id = auth.uid()::text::uuid,
    reviewed_at = timezone('utc', now())
  where id = p_request_id;

  if not found then
    raise exception 'Settlement request not found.';
  end if;

  return jsonb_build_object('success', true, 'status', p_status);
end;
$function$;
