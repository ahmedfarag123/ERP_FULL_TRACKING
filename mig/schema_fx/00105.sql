CREATE OR REPLACE FUNCTION public.get_odoo_action_counts()
 RETURNS TABLE(status odoo_action_status, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    a.status,
    COUNT(*) AS count
  FROM odoo_pending_actions a
  WHERE a.created_at >= (now() - INTERVAL '30 days')
  GROUP BY a.status;
END;
$function$;
