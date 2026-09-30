CREATE OR REPLACE FUNCTION public.driver_reorder_plan_shipments(p_plan_id uuid, p_shipment_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_profile_id uuid;
  v_shipment_id uuid;
  v_seq integer;
begin
  v_profile_id := auth.uid();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    raise exception 'Plan not found.';
  end if;

  if v_plan.assigned_profile_id is distinct from v_profile_id then
    raise exception 'This plan is not assigned to you.';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Can only reorder shipments in active plans.';
  end if;

  v_seq := 1;
  foreach v_shipment_id in array p_shipment_ids loop
    update public.logistics_shipments
    set
      route_sequence = v_seq,
      updated_at = timezone('utc', now())
    where id = v_shipment_id
      and plan_id = p_plan_id;

    v_seq := v_seq + 1;
  end loop;
end;
$function$;
