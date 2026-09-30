CREATE OR REPLACE FUNCTION public.get_odoo_action_audit_log(p_action_id uuid)
 RETURNS TABLE(id uuid, status odoo_action_status, user_id uuid, user_name text, details jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.status,
    l.user_id,
    COALESCE(p.full_name, p.email, 'System')::TEXT AS user_name,
    l.details,
    l.created_at
  FROM odoo_pending_action_audit_log l
  LEFT JOIN profiles p ON p.id = l.user_id
  WHERE l.action_id = p_action_id
  ORDER BY l.created_at ASC;
END;
$function$;
