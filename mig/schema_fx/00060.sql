CREATE OR REPLACE FUNCTION public.dispatcher_confirm_plan_item(p_plan_preparation_id uuid, p_item_id uuid, p_approved_quantity numeric, p_shortage_reason text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_barcode text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item record;
  v_approved numeric;
  v_status text;
  v_actor uuid := auth.uid();
begin
  -- Validate item belongs to this preparation
  select id, total_requested_quantity into v_item
  from public.dispatcher_plan_item_preparations
  where id = p_item_id
    and plan_preparation_id = p_plan_preparation_id;

  if v_item is null then
    raise exception 'Plan item not found';
  end if;

  v_approved := greatest(0, least(p_approved_quantity, v_item.total_requested_quantity));

  if v_approved <= 0 then
    v_status := 'unavailable';
  elsif v_approved < v_item.total_requested_quantity then
    v_status := 'partial';
  else
    v_status := 'ready';
  end if;

  if v_status <> 'ready' and p_shortage_reason is null then
    raise exception 'Shortage reason is required when quantity is less than requested';
  end if;

  update public.dispatcher_plan_item_preparations
  set approved_quantity = v_approved,
      status = v_status,
      shortage_reason = case when v_status = 'ready' then null else p_shortage_reason end,
      note = p_note,
      barcode = p_barcode,
      barcode_validated_at = case when p_barcode is not null then now() else barcode_validated_at end,
      confirmed_at = now(),
      confirmed_by_profile_id = v_actor,
      updated_at = now()
  where id = p_item_id;

  return jsonb_build_object(
    'item_id', p_item_id,
    'status', v_status,
    'approved_quantity', v_approved
  );
end;
$function$;
