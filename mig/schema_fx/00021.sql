CREATE OR REPLACE FUNCTION public.admin_dispatch_delivery_plan(p_plan_id uuid)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_open_count integer;
begin
  perform public.logistics_admin_required();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    perform public.raise_logistics_error('PLAN_NOT_FOUND', 'Plan not found.');
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    perform public.raise_logistics_error('INVALID_PLAN_STATUS', 'Plan cannot be dispatched in its current status.');
  end if;

  select count(*)
  into v_open_count
  from public.logistics_shipments
  where plan_id = p_plan_id
    and shipment_status in ('ASSIGNED', 'CHECK_IN', 'PICKUP', 'OUT_FOR_DELIVERY', 'ARRIVED');

  if v_open_count = 0 then
    perform public.raise_logistics_error('NO_SHIPMENTS', 'Plan has no assigned shipments to dispatch.');
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = 'in_progress',
    dispatched_at = coalesce(dispatched_at, timezone('utc', now())),
    started_at = coalesce(started_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = p_plan_id
  returning *
  into v_plan;

  return v_plan;
end;
$function$;
