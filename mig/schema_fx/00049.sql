CREATE OR REPLACE FUNCTION public.complete_odoo_action(p_action_id uuid, p_odoo_record_id integer DEFAULT NULL::integer, p_odoo_reference text DEFAULT NULL::text, p_odoo_response jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE odoo_pending_actions
  SET status = 'completed',
      odoo_record_id = p_odoo_record_id,
      odoo_reference = p_odoo_reference,
      odoo_response = p_odoo_response,
      error_message = NULL
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, details)
  VALUES (p_action_id, 'completed', jsonb_build_object(
    'event', 'completed',
    'odoo_record_id', p_odoo_record_id,
    'odoo_reference', p_odoo_reference
  ));
END;
$function$;
