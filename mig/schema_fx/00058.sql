CREATE OR REPLACE FUNCTION public.dispatcher_bulk_mark_all_ready(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_preparation_id uuid;
  v_updated integer;
begin
  perform public.logistics_admin_required();

  select id into v_preparation_id
  from public.dispatcher_plan_preparations
  where plan_id = p_plan_id;

  if v_preparation_id is null then
    raise exception 'No preparation found for this plan';
  end if;

  update public.dispatcher_plan_item_preparations
  set
    approved_quantity = total_requested_quantity,
    status = 'ready',
    confirmed_at = now(),
    confirmed_by_profile_id = auth.uid(),
    updated_at = now()
  where plan_preparation_id = v_preparation_id
    and status = 'pending';

  get diagnostics v_updated = row_count;

  return jsonb_build_object('updated', v_updated);
end;
$function$;
