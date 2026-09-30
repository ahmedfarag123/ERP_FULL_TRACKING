CREATE OR REPLACE FUNCTION public.fail_odoo_action(p_action_id uuid, p_error_message text DEFAULT NULL::text, p_odoo_response jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE odoo_pending_actions
  SET status = 'failed',
      error_message = p_error_message,
      odoo_response = p_odoo_response,
      retry_count = retry_count + 1
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, details)
  VALUES (p_action_id, 'failed', jsonb_build_object(
    'event', 'failed',
    'error', p_error_message
  ));
END;
$function$;
