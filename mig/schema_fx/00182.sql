CREATE OR REPLACE FUNCTION public.sync_logistics_user_from_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Only provision logistics_users for driver profiles
  if new.role is distinct from 'driver'::app_role then
    return new;
  end if;

  -- Don't duplicate if logistics_user already exists for this profile
  if exists (
    select 1
    from public.logistics_users lu
    where lu.linked_profile_id = new.id
  ) then
    return new;
  end if;

  insert into public.logistics_users (
    linked_profile_id,
    employee_name,
    job_title,
    work_email,
    work_phone,
    mobile_phone,
    status,
    source,
    created_at,
    updated_at
  ) values (
    new.id,
    new.full_name,
    new.job_title,
    new.email,
    nullif(new.phone, '') ,
    null,
    'active'::record_status,
    'profiles_trigger'::text,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  );

  return new;
end;
$function$;
