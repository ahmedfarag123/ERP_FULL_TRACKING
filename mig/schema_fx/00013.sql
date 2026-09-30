CREATE OR REPLACE FUNCTION public.admin_cancel_delivery_plan(p_plan_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
begin
  perform public.logistics_admin_required();

  update public.logistics_delivery_plans
  set
    plan_status = 'cancelled',
    cancelled_at = timezone('utc', now()),
    notes = coalesce(nullif(trim(coalesce(p_reason, '')), ''), notes),
    updated_at = timezone('utc', now())
  where id = p_plan_id
    and plan_status in ('pending', 'in_progress')
  returning *
  into v_plan;

  if v_plan.id is null then
    perform public.raise_logistics_error('PLAN_NOT_FOUND_OR_LOCKED', 'Plan not found or cannot be cancelled.');
  end if;

  update public.logistics_shipments
  set
    shipment_status = 'CANCELLED',
    delivery_phase = 'cancelled',
    shipment_state = 'cancel',
    cancelled_at = timezone('utc', now()),
    notes = coalesce(nullif(trim(coalesce(p_reason, '')), ''), notes),
    updated_at = timezone('utc', now())
  where plan_id = p_plan_id
    and shipment_status in ('PENDING_ASSIGN', 'ASSIGNED', 'CHECK_IN', 'PICKUP', 'OUT_FOR_DELIVERY', 'ARRIVED');

  return v_plan;
end;
$function$;
