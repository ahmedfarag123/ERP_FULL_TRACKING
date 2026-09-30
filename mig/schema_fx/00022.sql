CREATE OR REPLACE FUNCTION public.admin_get_collection_checks(p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, shipment_id text, odoo_order_name text, customer_name text, plan_id text, driver_profile_id uuid, driver_name text, check_status text, payment_method text, reason text, driver_notes text, review_status text, admin_notes text, reviewed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.id,
    c.shipment_id,
    s.odoo_order_name,
    s.customer_name,
    c.plan_id::text,
    c.driver_profile_id,
    coalesce(p.full_name, p.email::text, c.driver_profile_id::text) as driver_name,
    c.check_status,
    c.payment_method,
    c.reason,
    c.driver_notes,
    c.review_status,
    c.admin_notes,
    c.reviewed_at,
    c.created_at
  from public.driver_plan_collection_checks c
  left join public.profiles p on p.id = c.driver_profile_id
  left join public.logistics_shipments s on s.id::text = c.shipment_id
  where (p_status is null or c.review_status = p_status)
  order by c.created_at desc;
$function$;
