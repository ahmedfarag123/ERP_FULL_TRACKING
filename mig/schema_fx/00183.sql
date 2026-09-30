CREATE OR REPLACE FUNCTION public.sync_profiles_to_logistics_users()
 RETURNS TABLE(profile_id uuid, logistics_user_id uuid, action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- 1. Link unlinked logistics_users to profiles by email match
  return query
  with email_match as (
    select
      p.id as pid,
      lu.id as luid,
      row_number() over (
        partition by p.id
        order by
          case when lu.source = 'odoo_sync' then 0 else 1 end,
          lu.updated_at desc nulls last
      ) as rn
    from public.profiles p
    join public.logistics_users lu
      on lower(trim(lu.work_email::text)) = lower(trim(p.email::text))
      and lu.linked_profile_id is null
    where p.status = 'active'
  ),
  linked as (
    update public.logistics_users lu
    set
      linked_profile_id = em.pid,
      employee_name = coalesce(
        nullif(trim((select full_name from public.profiles where id = em.pid)), ''),
        lu.employee_name
      ),
      work_email = coalesce(
        (select email from public.profiles where id = em.pid),
        lu.work_email
      ),
      work_phone = coalesce(
        nullif(trim((select phone from public.profiles where id = em.pid)), ''),
        lu.work_phone
      ),
      mobile_phone = coalesce(
        nullif(trim((select phone from public.profiles where id = em.pid)), ''),
        lu.mobile_phone
      ),
      job_title = coalesce(
        lu.job_title,
        case (select role::text from public.profiles where id = em.pid)
          when 'driver' then 'Driver'
          when 'dispatcher' then 'Dispatcher'
          when 'spv' then 'SPV'
          when 'manager' then 'Logistics Manager'
          when 'supervisor' then 'Logistics Supervisor'
          when 'admin' then 'Logistics Admin'
          else 'Logistics User'
        end
      ),
      status = (select status from public.profiles where id = em.pid),
      source = case
        when lu.source = 'odoo_sync' then lu.source
        else 'admin_user_create'
      end,
      raw_payload = coalesce(lu.raw_payload, '{}'::jsonb) || jsonb_build_object(
        'synced_from_profile', true,
        'profile_id', em.pid,
        'synced_at', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SSZ')
      ),
      last_sync_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    from email_match em
    where lu.id = em.luid
      and em.rn = 1
    returning lu.linked_profile_id as pid, lu.id as luid
  )
  select
    linked.pid,
    linked.luid,
    'linked'::text
  from linked;

  -- 2. Refresh already-linked logistics_users with latest profile data
  return query
  with refreshed as (
    update public.logistics_users lu
    set
      employee_name = coalesce(
        nullif(trim(p.full_name), ''),
        lu.employee_name
      ),
      work_email = coalesce(p.email, lu.work_email),
      work_phone = coalesce(
        nullif(trim(p.phone), ''),
        lu.work_phone
      ),
      mobile_phone = coalesce(
        nullif(trim(p.phone), ''),
        lu.mobile_phone
      ),
      status = p.status,
      raw_payload = coalesce(lu.raw_payload, '{}'::jsonb) || jsonb_build_object(
        'synced_from_profile', true,
        'profile_id', p.id,
        'synced_at', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SSZ')
      ),
      last_sync_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    from public.profiles p
    where lu.linked_profile_id = p.id
      and p.status = 'active'
    returning lu.linked_profile_id as pid, lu.id as luid
  )
  select
    refreshed.pid,
    refreshed.luid,
    'refreshed'::text
  from refreshed;

  -- 3. Create new logistics_users for profiles with no existing record
  return query
  with target_profiles as (
    select
      p.id as pid,
      nullif(trim(p.full_name), '') as full_name,
      p.email,
      p.role::text as role,
      p.status,
      nullif(trim(p.phone), '') as phone,
      nullif(trim(p.job_title), '') as job_title,
      p.department_id,
      nullif(trim(d.name), '') as department_name
    from public.profiles p
    left join public.departments d on d.id = p.department_id
    where p.status = 'active'
      and not exists (
        select 1 from public.logistics_users lu
        where lu.linked_profile_id = p.id
      )
      and not exists (
        select 1 from public.logistics_users lu
        where lower(trim(lu.work_email::text)) = lower(trim(p.email::text))
      )
  ),
  inserted as (
    insert into public.logistics_users (
      linked_profile_id,
      employee_name,
      job_title,
      work_email,
      work_phone,
      mobile_phone,
      department_name,
      status,
      source,
      raw_payload,
      last_sync_at,
      created_at,
      updated_at
    )
    select
      tp.pid,
      coalesce(tp.full_name, tp.email, 'Logistics User'),
      coalesce(
        tp.job_title,
        case tp.role
          when 'driver' then 'Driver'
          when 'dispatcher' then 'Dispatcher'
          when 'spv' then 'SPV'
          when 'manager' then 'Logistics Manager'
          when 'supervisor' then 'Logistics Supervisor'
          when 'admin' then 'Logistics Admin'
          else 'Logistics User'
        end
      ),
      tp.email,
      tp.phone,
      tp.phone,
      tp.department_name,
      tp.status,
      'admin_user_create',
      jsonb_build_object(
        'source', 'sync_profiles_to_logistics_users',
        'profile_id', tp.pid,
        'role', tp.role,
        'department_id', tp.department_id
      ),
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    from target_profiles tp
    returning id as luid, linked_profile_id as pid
  )
  select
    inserted.pid,
    inserted.luid,
    'created'::text
  from inserted;
end;
$function$;
