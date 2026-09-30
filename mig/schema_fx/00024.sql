CREATE OR REPLACE FUNCTION public.admin_mark_settlement_paid(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_management_role() then
    raise exception 'Admin access required.';
  end if;

  update public.driver_plan_settlement_requests
  set
    status = 'paid',
    paid_at = timezone('utc', now())
  where id = p_request_id and status = 'approved';

  if not found then
    raise exception 'Settlement request not found or not approved.';
  end if;

  return jsonb_build_object('success', true, 'status', 'paid');
end;
$function$;
