CREATE OR REPLACE FUNCTION public.mark_odoo_action_sending(p_action_id uuid)
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

  IF v_current_status != 'approved' THEN
    RAISE EXCEPTION 'Cannot send action with status %.', v_current_status;
  END IF;

  UPDATE odoo_pending_actions SET status = 'sending' WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, details)
  VALUES (p_action_id, 'sending', jsonb_build_object('event', 'sending'));
END;
$function$;
