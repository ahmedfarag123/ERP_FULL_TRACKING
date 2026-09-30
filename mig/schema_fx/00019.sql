CREATE OR REPLACE FUNCTION public.admin_create_delivery_plan(p_logistics_user_id uuid, p_planned_date date, p_notes text DEFAULT NULL::text, p_force_new boolean DEFAULT false)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_driver public.logistics_users%rowtype;
  v_plan public.logistics_delivery_plans%rowtype;
begin
  perform public.logistics_admin_required();

  select *
  into v_driver
  from public.logistics_users
  where id = p_logistics_user_id
    and status = 'active';

  if v_driver.id is null then
    perform public.raise_logistics_error('DRIVER_NOT_FOUND', 'Active logistics user not found.');
  end if;

  if v_driver.linked_profile_id is null then
    perform public.raise_logistics_error('DRIVER_NOT_LINKED', 'Driver must be linked to an app profile before dispatch.');
  end if;

  if p_planned_date is null then
    perform public.raise_logistics_error('DATE_REQUIRED', 'Planned date is required.');
  end if;

  -- Only reuse existing plan when force_new is false
  if not p_force_new then
    select *
    into v_plan
    from public.logistics_delivery_plans
    where logistics_user_id = p_logistics_user_id
      and planned_date = p_planned_date
      and plan_status in ('pending', 'in_progress')
    order by created_at
    limit 1;

    if v_plan.id is not null then
      update public.logistics_delivery_plans
      set
        notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
        updated_at = timezone('utc', now())
      where id = v_plan.id
      returning *
      into v_plan;

      return v_plan;
    end if;
  end if;

  insert into public.logistics_delivery_plans (
    logistics_user_id,
    assigned_profile_id,
    planned_date,
    plan_status,
    notes,
    created_by_profile_id
  )
  values (
    v_driver.id,
    v_driver.linked_profile_id,
    p_planned_date,
    'pending',
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning *
  into v_plan;

  return v_plan;
end;
$function$;
