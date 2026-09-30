CREATE OR REPLACE FUNCTION public.admin_close_delivery_plan(p_plan_id uuid)
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

  select count(*)
  into v_open_count
  from public.logistics_shipments
  where plan_id = p_plan_id
    and shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED');

  if v_open_count > 0 then
    perform public.raise_logistics_error('OPEN_SHIPMENTS', format('Plan still has % open shipments.', v_open_count));
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = 'completed',
    finished_at = coalesce(finished_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = p_plan_id
  returning *
  into v_plan;

  if v_plan.id is null then
    perform public.raise_logistics_error('PLAN_NOT_FOUND', 'Plan not found.');
  end if;

  update public.logistics_shipments
  set
    shipment_status = case when shipment_status = 'DELIVERED' then 'FINISHED' else shipment_status end,
    delivery_phase = case when delivery_phase = 'delivered' then 'finished' else delivery_phase end,
    updated_at = timezone('utc', now())
  where plan_id = p_plan_id
    and shipment_status = 'DELIVERED';

  return v_plan;
end;
$function$;
