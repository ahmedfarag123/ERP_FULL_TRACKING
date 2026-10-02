-- Migration 00208: fix admin_get_driver_debts column reference
-- Bug: CTE driver_plan_debts exposes column driver_id, but final SELECT referenced
-- d.driver_profile_id (3 places) -> P0001 "column d.driver_profile_id does not exist".
-- Deployed function was broken; this is a CREATE OR REPLACE bugfix.
-- +copy: applied-manually via psql (ON_ERROR_STOP=1), manifest untouched (stopped at 00196).

CREATE OR REPLACE FUNCTION public.admin_get_driver_debts()
 RETURNS TABLE(driver_profile_id uuid, driver_name text, driver_email text, total_debt numeric, currency_code text, oldest_debt_at timestamp with time zone, hours_since_oldest numeric, overdue boolean, pending_requests bigint, approved_today bigint, total_collected_today numeric, total_approved_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_management_role() then
    raise exception 'Only management users can view driver debts.';
  end if;

  return query
  with driver_plan_debts as (
    select
      s.assigned_profile_id as driver_id,
      sum(
        coalesce(lsc.collected_from_customer, lsc.pending_delivery_amount, 0)
      ) as debt_amount,
      min(s.completed_at) as oldest_completed_at
    from public.logistics_shipments s
    left join public.logistics_shipment_collections lsc
      on lsc.shipment_id = s.id
    where s.assigned_profile_id is not null
      and s.shipment_status in ('DELIVERED', 'FINISHED')
      and (lsc.id is null or lsc.collection_status <> 'collected_successfully')
    group by s.assigned_profile_id
  ),
  request_stats as (
    select
      cr.driver_profile_id,
      count(*) filter (where cr.status = 'pending') as pending_count,
      count(*) filter (where cr.status = 'approved' and cr.reviewed_at::date = current_date) as approved_today_count,
      sum(cr.collected_amount) filter (where cr.status = 'approved' and cr.reviewed_at::date = current_date) as approved_today_amount,
      sum(cr.collected_amount) filter (where cr.status = 'approved') as total_approved_amount
    from public.logistics_collection_requests cr
    group by cr.driver_profile_id
  )
  select
    d.driver_id,
    coalesce(p.full_name, 'Unknown')::text as driver_name,
    coalesce(p.email, '')::text as driver_email,
    coalesce(d.debt_amount, 0) as total_debt,
    'EGP' as currency_code,
    d.oldest_completed_at as oldest_debt_at,
    case when d.oldest_completed_at is not null
      then round(extract(epoch from (now() - d.oldest_completed_at)) / 3600, 1)
      else 0
    end as hours_since_oldest,
    case when d.oldest_completed_at is not null
         and extract(epoch from (now() - d.oldest_completed_at)) > 86400
      then true
      else false
    end as overdue,
    coalesce(rs.pending_count, 0) as pending_requests,
    coalesce(rs.approved_today_count, 0) as approved_today,
    coalesce(rs.approved_today_amount, 0) as total_collected_today,
    coalesce(rs.total_approved_amount, 0) as total_approved_amount
  from driver_plan_debts d
  left join public.profiles p on p.id = d.driver_id
  left join request_stats rs on rs.driver_profile_id = d.driver_id
  where d.debt_amount > 0
  order by d.debt_amount desc;
end;
$function$;
