CREATE OR REPLACE FUNCTION public.admin_review_collection_check(p_check_id uuid, p_review_status text, p_admin_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
  perform public.logistics_admin_required();

  if p_review_status not in ('approved', 'rejected') then
    raise exception 'Invalid review_status: %', p_review_status;
  end if;

  update public.driver_plan_collection_checks
  set
    review_status = p_review_status,
    admin_notes = p_admin_notes,
    reviewed_by_profile_id = auth.uid(),
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_check_id;

  if not found then
    raise exception 'Collection check not found.';
  end if;

  if p_review_status = 'approved' then
    perform private.sync_approved_collection_check_accounting(p_check_id);
  end if;

  return jsonb_build_object('success', true);
end;
$function$;
