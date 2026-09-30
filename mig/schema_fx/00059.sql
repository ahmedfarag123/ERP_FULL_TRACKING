CREATE OR REPLACE FUNCTION public.dispatcher_complete_plan_preparation(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_preparation record;
  v_pending_count integer;
  v_total_items integer;
  v_has_shortage boolean;
  v_duration integer;
begin
  select id, status, started_at into v_preparation
  from public.dispatcher_plan_preparations
  where plan_id = p_plan_id;

  if v_preparation is null then
    raise exception 'Plan preparation not found';
  end if;

  if v_preparation.status = 'ready' then
    return jsonb_build_object('status', 'ready', 'message', 'Already completed');
  end if;

  -- Check all items are processed
  select count(*) into v_pending_count
  from public.dispatcher_plan_item_preparations
  where plan_preparation_id = v_preparation.id
    and status = 'pending';

  if v_pending_count > 0 then
    raise exception 'يجب تجهيز كل المنتجات قبل إكمال الخطة. متبقي % منتج', v_pending_count;
  end if;

  -- Check at least one item is available
  select count(*) into v_total_items
  from public.dispatcher_plan_item_preparations
  where plan_preparation_id = v_preparation.id;

  if not exists (
    select 1 from public.dispatcher_plan_item_preparations
    where plan_preparation_id = v_preparation.id
      and approved_quantity > 0
      and status <> 'unavailable'
  ) then
    raise exception 'Cannot complete preparation without at least one available item';
  end if;

  -- Check for shortages
  select exists (
    select 1 from public.dispatcher_plan_item_preparations
    where plan_preparation_id = v_preparation.id
      and status in ('partial', 'unavailable')
  ) into v_has_shortage;

  -- Calculate duration
  v_duration := greatest(0, extract(epoch from (now() - v_preparation.started_at))::int);

  -- Update preparation status to ready
  update public.dispatcher_plan_preparations
  set status = 'ready',
      completed_at = now(),
      duration_seconds = v_duration,
      updated_at = now()
  where id = v_preparation.id;

  -- Bridge: auto-dispatch the delivery plan when preparation completes
  -- This advances the plan from pending to in_progress so the driver
  -- can immediately see and act on it.
  update public.logistics_delivery_plans
  set
    plan_status = 'in_progress',
    dispatched_at = coalesce(dispatched_at, timezone('utc', now())),
    started_at = coalesce(started_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = p_plan_id
    and plan_status = 'pending';

  return jsonb_build_object(
    'status', 'ready',
    'duration_seconds', v_duration,
    'has_shortage', v_has_shortage,
    'total_items', v_total_items
  );
end;
$function$;
