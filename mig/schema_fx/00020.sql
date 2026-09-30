CREATE OR REPLACE FUNCTION public.admin_create_manual_stop(p_plan_id uuid, p_customer_name text, p_customer_phone text DEFAULT NULL::text, p_customer_address text DEFAULT NULL::text, p_customer_latitude double precision DEFAULT NULL::double precision, p_customer_longitude double precision DEFAULT NULL::double precision, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_notes text DEFAULT NULL::text)
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
  v_ref text;
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
    raise exception 'Only pending or in-progress plans can receive stops.';
  end if;

  select *
  into v_driver
  from public.logistics_users
  where id = v_plan.logistics_user_id;

  if v_driver.id is null or v_driver.linked_profile_id is null then
    raise exception 'Plan driver is not linked to an app profile.';
  end if;

  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'Customer name is required.';
  end if;

  select coalesce(max(route_sequence), 0) + 1
  into v_next_sequence
  from public.logistics_shipments
  where plan_id = v_plan.id;

  v_ref := 'MSN-' || upper(substr(md5(random()::text), 1, 8));

  insert into public.logistics_shipments (
    shipment_reference,
    linked_order_id,
    plan_id,
    logistics_user_id,
    assigned_profile_id,
    assigned_user_name,
    assigned_job_title,
    customer_name,
    customer_phone,
    source_location_ref,
    destination_location_ref,
    customer_latitude,
    customer_longitude,
    scheduled_at,
    shipment_status,
    shipment_state,
    delivery_phase,
    route_sequence,
    source,
    notes,
    raw_payload
  )
  values (
    v_ref,
    null,
    v_plan.id,
    v_driver.id,
    v_driver.linked_profile_id,
    v_driver.employee_name,
    v_driver.job_title,
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(trim(coalesce(p_customer_address, '')), ''),
    nullif(trim(coalesce(p_customer_address, '')), ''),
    p_customer_latitude,
    p_customer_longitude,
    coalesce(p_scheduled_at, v_plan.planned_date::timestamptz),
    'ASSIGNED',
    'assigned',
    'assigned',
    v_next_sequence,
    'manual',
    nullif(trim(coalesce(p_notes, '')), ''),
    jsonb_build_object(
      'created_by', 'admin',
      'created_by_user', auth.uid(),
      'created_at', timezone('utc', now())
    )
  )
  returning *
  into v_shipment;

  return v_shipment;
end;
$function$;
