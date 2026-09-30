CREATE OR REPLACE FUNCTION public.admin_bulk_assign_shipments_to_plan(p_shipment_ids uuid[], p_plan_id uuid, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_driver public.logistics_users%rowtype;
  v_count integer;
  v_max_batch constant integer := 100;
  v_shipment_id uuid;
  v_order_id uuid;
begin
  perform public.logistics_admin_required();

  if coalesce(array_length(p_shipment_ids, 1), 0) = 0 then
    raise exception 'At least one shipment is required.';
  end if;

  if array_length(p_shipment_ids, 1) > v_max_batch then
    raise exception 'Cannot assign more than % shipments at once.', v_max_batch;
  end if;

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

  update public.logistics_shipments
  set
    plan_id = v_plan.id,
    logistics_user_id = v_driver.id,
    assigned_profile_id = v_driver.linked_profile_id,
    assigned_user_name = v_driver.employee_name,
    assigned_job_title = v_driver.job_title,
    shipment_state = 'assigned',
    shipment_status = case
      when shipment_status in ('PENDING_ASSIGN') then 'ASSIGNED'
      else shipment_status
    end,
    delivery_phase = case
      when delivery_phase in ('pending', 'ready') then 'assigned'
      else delivery_phase
    end,
    scheduled_at = coalesce(p_scheduled_at, scheduled_at, v_plan.planned_date::timestamptz),
    route_sequence = case
      when plan_id is distinct from v_plan.id then
        coalesce(
          (select coalesce(max(s2.route_sequence), 0) + 1
           from public.logistics_shipments s2
           where s2.plan_id = v_plan.id),
          1
        )
      else coalesce(route_sequence, 1)
    end,
    raw_payload = coalesce(raw_payload, '{}'::jsonb) || jsonb_build_object(
      'assigned_from', 'admin_plan_control',
      'assigned_by', auth.uid(),
      'assigned_at', timezone('utc', now())
    ),
    updated_at = timezone('utc', now())
  where id = any(p_shipment_ids)
    and coalesce(shipment_status, 'PENDING_ASSIGN') not in ('DELIVERED', 'FINISHED', 'SETTLED');

  for v_shipment_id, v_order_id in
    select ls.id, ls.linked_order_id
    from public.logistics_shipments ls
    where ls.id = any(p_shipment_ids)
      and ls.linked_order_id is not null
      and not exists (
        select 1 from public.logistics_shipment_items lsi
        where lsi.shipment_id = ls.id
      )
  loop
    perform public.sync_logistics_shipment_items_from_order(v_shipment_id, v_order_id);
  end loop;

  with ordered as (
    select id, row_number() over (
      order by
        case when route_locked then 0 else 1 end,
        route_sequence nulls last,
        scheduled_at nulls last,
        created_at
    ) as new_seq
    from public.logistics_shipments
    where plan_id = v_plan.id
      and shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
  )
  update public.logistics_shipments s
  set route_sequence = ordered.new_seq,
      updated_at = timezone('utc', now())
  from ordered
  where s.id = ordered.id
    and s.route_sequence is distinct from ordered.new_seq;

  select count(*) into v_count
  from public.logistics_shipments
  where plan_id = v_plan.id;

  return v_count;
end;
$function$;
