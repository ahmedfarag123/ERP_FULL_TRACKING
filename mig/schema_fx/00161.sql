CREATE OR REPLACE FUNCTION public.retry_odoo_action(p_action_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_status odoo_action_status;
BEGIN
  SELECT status INTO v_current_status
  FROM odoo_pending_actions WHERE id = p_action_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Pending action not found.';
  END IF;

  IF v_current_status != 'failed' THEN
    RAISE EXCEPTION 'Can only retry failed actions.';
  END IF;

  UPDATE odoo_pending_actions
  SET status = 'approved',
      error_message = NULL
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, details)
  VALUES (p_action_id, 'approved', jsonb_build_object('event', 'retry'));
END;
$function$;
