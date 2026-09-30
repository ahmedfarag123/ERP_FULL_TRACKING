CREATE OR REPLACE FUNCTION public.logistics_prevent_multiple_working_plans()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.plan_status = 'in_progress' and new.assigned_profile_id is not null then
    if exists (
      select 1
      from public.logistics_delivery_plans existing
      where existing.assigned_profile_id = new.assigned_profile_id
        and existing.plan_status = 'in_progress'
        and existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) then
      raise exception 'Driver already has an in-progress delivery plan.';
    end if;
  end if;

  return new;
end;
$function$;
