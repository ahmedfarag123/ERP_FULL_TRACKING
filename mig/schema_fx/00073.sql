CREATE OR REPLACE FUNCTION public.driver_get_settlement_requests()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'plan_id', r.plan_id,
      'total_debt_amount', r.total_debt_amount,
      'currency_code', r.currency_code,
      'status', r.status,
      'driver_notes', r.driver_notes,
      'admin_notes', r.admin_notes,
      'reviewed_at', r.reviewed_at,
      'paid_at', r.paid_at,
      'created_at', r.created_at,
      'plan_reference', p.plan_reference
    )
    order by r.created_at desc
  ), '[]'::jsonb)
  from public.driver_plan_settlement_requests r
  left join public.logistics_delivery_plans p on p.id = r.plan_id
  where r.driver_profile_id = auth.uid()::text::uuid
     or r.driver_profile_id::text = auth.uid()::text;
$function$;
