CREATE OR REPLACE FUNCTION public.admin_update_plan_status(p_plan_id uuid, p_new_status text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan_id    uuid;
  v_old_status text;
  v_affected   integer;
begin
  perform public.logistics_admin_required();

  select plan_status into v_old_status
  from public.logistics_delivery_plans where id = p_plan_id;

  if not found then
    perform public.raise_logistics_error('PLAN_NOT_FOUND', 'Plan not found');
  end if;

  if p_new_status not in ('pending', 'in_progress', 'completed', 'cancelled') then
    perform public.raise_logistics_error('INVALID_STATUS', 'Invalid plan status: ' || p_new_status);
  end if;

  if v_old_status in ('completed', 'cancelled') then
    perform public.raise_logistics_error('TERMINAL_STATUS', 'Cannot change from terminal status ' || v_old_status);
  end if;

  if v_old_status = 'pending' and p_new_status = 'completed' then
    perform public.raise_logistics_error('INVALID_TRANSITION', 'Cannot complete a pending plan. Start it first.');
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = p_new_status,
    dispatched_at = case when p_new_status = 'in_progress' and dispatched_at is null then timezone('utc', now()) else dispatched_at end,
    started_at = case when p_new_status = 'in_progress' and started_at is null then timezone('utc', now()) else started_at end,
    finished_at = case when p_new_status = 'completed' and finished_at is null then timezone('utc', now()) else finished_at end,
    cancelled_at = case when p_new_status = 'cancelled' and cancelled_at is null then timezone('utc', now()) else cancelled_at end,
    notes = case when p_reason is not null and trim(p_reason) != ''
            then coalesce(notes, '') || E'\n[' || p_new_status || '] ' || p_reason
            else notes end,
    updated_at = timezone('utc', now())
  where id = p_plan_id
  returning id into v_plan_id;

  if p_new_status = 'completed' then
    update public.logistics_shipments
    set shipment_status = 'FINISHED', delivery_phase = 'finished', updated_at = timezone('utc', now())
    where plan_id = v_plan_id and shipment_status = 'DELIVERED';
  elsif p_new_status = 'cancelled' then
    update public.logistics_shipments
    set shipment_status = 'CANCELLED', delivery_phase = 'cancelled', shipment_state = 'cancel',
        cancelled_at = coalesce(cancelled_at, timezone('utc', now())), updated_at = timezone('utc', now())
    where plan_id = v_plan_id
      and shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED');
  end if;

  return (select to_jsonb(p.*) from public.logistics_delivery_plans p where p.id = v_plan_id);
end;
$function$;
