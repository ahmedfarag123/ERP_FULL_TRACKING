CREATE OR REPLACE FUNCTION public.get_rep_route_summary(p_user_id uuid, p_date_from date DEFAULT CURRENT_DATE, p_date_to date DEFAULT CURRENT_DATE)
 RETURNS TABLE(user_id uuid, total_tracking_points bigint, total_distance_meters numeric, total_visits bigint, unique_customers bigint, avg_visit_duration_minutes numeric, suspicious_visits bigint, fraudulent_visits bigint, first_point_at timestamp with time zone, last_point_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_app_role();

  if v_role in ('sales_agent', 'telesales') and p_user_id <> auth.uid() then
    raise exception 'You cannot inspect another user''s route summary';
  end if;

  return query
  with ordered_points as (
    select
      lt.*,
      lag(lt.lat) over (partition by lt.user_id order by lt.captured_at) as prev_lat,
      lag(lt.lng) over (partition by lt.user_id order by lt.captured_at) as prev_lng
    from public.location_tracking lt
    where lt.user_id = p_user_id
      and lt.captured_at >= p_date_from::timestamp
      and lt.captured_at < (p_date_to + 1)::timestamp
  ),
  tracking_stats as (
    select
      p_user_id as user_id,
      count(*)::bigint as total_tracking_points,
      coalesce(sum(
        case
          when prev_lat is null or prev_lng is null then 0
          else public.calculate_haversine_meters(prev_lat, prev_lng, lat, lng)
        end
      ), 0)::numeric(14,2) as total_distance_meters,
      min(captured_at) as first_point_at,
      max(captured_at) as last_point_at
    from ordered_points
  ),
  visit_stats as (
    select
      count(*)::bigint as total_visits,
      count(distinct customer_id)::bigint as unique_customers,
      avg(
        case
          when started_at is not null and completed_at is not null
          then extract(epoch from (completed_at - started_at)) / 60.0
          else null
        end
      )::numeric(10,2) as avg_visit_duration_minutes,
      count(*) filter (where fraud_status = 'suspicious')::bigint as suspicious_visits,
      count(*) filter (where fraud_status = 'fraudulent')::bigint as fraudulent_visits
    from public.visits
    where user_id = p_user_id
      and checked_in_at >= p_date_from::timestamp
      and checked_in_at < (p_date_to + 1)::timestamp
  )
  select
    ts.user_id,
    ts.total_tracking_points,
    ts.total_distance_meters,
    coalesce(vs.total_visits, 0),
    coalesce(vs.unique_customers, 0),
    coalesce(vs.avg_visit_duration_minutes, 0),
    coalesce(vs.suspicious_visits, 0),
    coalesce(vs.fraudulent_visits, 0),
    ts.first_point_at,
    ts.last_point_at
  from tracking_stats ts
  cross join visit_stats vs;
end;
$function$;
