CREATE OR REPLACE FUNCTION public.admin_assign_shipment_to_plan(p_shipment_id uuid, p_plan_id uuid, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_notes text DEFAULT NULL::text)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_driver public.logistics_users%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_next_sequence integer;
begin
  perform public.logistics_admin_required();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    raise exception 'Plan not found.';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Only pending or in-progress plans can receive shipments.';
  end if;

  select *
  into v_driver
  from public.logistics_users
  where id = v_plan.logistics_user_id;

  if v_driver.id is null or v_driver.linked_profile_id is null then
    raise exception 'Plan driver is not linked to an app profile.';
  end if;

  select *
  into v_shipment
  from public.logistics_shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null then
    raise exception 'Shipment not found.';
  end if;

  if coalesce(v_shipment.shipment_status, 'PENDING_ASSIGN') in ('DELIVERED', 'FINISHED', 'SETTLED') then
    raise exception 'Completed shipments cannot be reassigned.';
  end if;

  select coalesce(max(route_sequence), 0) + 1
  into v_next_sequence
  from public.logistics_shipments
  where plan_id = v_plan.id;

  update public.logistics_shipments
  set
    plan_id = v_plan.id,
    logistics_user_id = v_driver.id,
    assigned_profile_id = v_driver.linked_profile_id,
    assigned_user_name = v_driver.employee_name,
    assigned_job_title = v_driver.job_title,
    shipment_state = 'assigned',
    shipment_status = 'ASSIGNED',
    delivery_phase = 'assigned',
    completed_at = null,
    scheduled_at = coalesce(p_scheduled_at, scheduled_at, v_plan.planned_date::timestamptz),
    route_sequence = case
      when plan_id is distinct from v_plan.id then v_next_sequence
      else coalesce(route_sequence, v_next_sequence)
    end,
    notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
    raw_payload = coalesce(raw_payload, '{}'::jsonb) || jsonb_build_object(
      'assigned_from', 'admin_plan_control',
      'assigned_by', auth.uid(),
      'assigned_at', timezone('utc', now())
    ),
    updated_at = timezone('utc', now())
  where id = v_shipment.id
  returning *
  into v_shipment;

  return v_shipment;
end;
$function$;
