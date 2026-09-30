CREATE OR REPLACE FUNCTION public.driver_get_plan_collection_checks(p_plan_id text DEFAULT NULL::text)
 RETURNS TABLE(shipment_id text, plan_id text, check_status text, payment_method text, reason text, driver_notes text, review_status text, admin_notes text, reviewed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.shipment_id,
    c.plan_id::text,
    c.check_status,
    c.payment_method,
    c.reason,
    c.driver_notes,
    c.review_status,
    c.admin_notes,
    c.reviewed_at,
    c.created_at
  from public.driver_plan_collection_checks c
  where c.driver_profile_id = auth.uid()
    and (p_plan_id is null or c.plan_id::text = p_plan_id)
  order by c.created_at desc;
$function$;
