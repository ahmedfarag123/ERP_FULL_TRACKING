CREATE OR REPLACE FUNCTION public.driver_update_plan_status(p_plan_id uuid, p_next_status text)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_next_status text := lower(trim(coalesce(p_next_status, '')));
begin
  if v_next_status not in ('pending', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Unsupported plan status: %. Plan status is broad; use shipment delivery_phase for driver workflow stages.', v_next_status;
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = v_next_status,
    started_at = case
      when v_next_status = 'in_progress' then coalesce(started_at, timezone('utc', now()))
      else started_at
    end,
    finished_at = case
      when v_next_status = 'completed' then coalesce(finished_at, timezone('utc', now()))
      else finished_at
    end,
    updated_at = timezone('utc', now())
  where id::text = p_plan_id::text
    and assigned_profile_id::text = auth.uid()::text
    and plan_status in ('pending', 'in_progress', 'completed')
  returning *
  into v_plan;

  if v_plan.id is null then
    raise exception 'Plan not found or not authorized.';
  end if;

  return v_plan;
end;
$function$;
