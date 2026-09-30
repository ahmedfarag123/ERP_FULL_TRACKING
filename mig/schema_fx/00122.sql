CREATE OR REPLACE FUNCTION private.logistics_complete_plan_if_shipments_delivered(p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if p_plan_id is null then
    return;
  end if;

  update public.logistics_delivery_plans as plan
  set
    plan_status = 'completed',
    finished_at = coalesce(plan.finished_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where plan.id = p_plan_id
    and plan.plan_status in ('pending', 'in_progress')
    and exists (
      select 1
      from public.logistics_shipments as shipment
      where shipment.plan_id = plan.id
    )
    and not exists (
      select 1
      from public.logistics_shipments as shipment
      where shipment.plan_id = plan.id
        and coalesce(shipment.shipment_status, 'PENDING_ASSIGN')
          not in ('DELIVERED', 'FINISHED', 'SETTLED')
    );
end;
$function$;
