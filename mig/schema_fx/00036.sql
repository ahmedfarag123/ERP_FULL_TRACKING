CREATE OR REPLACE FUNCTION public.approve_odoo_pending_action(p_action_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_current_status odoo_action_status;
BEGIN
  v_user_id := auth.uid();

  SELECT status INTO v_current_status
  FROM odoo_pending_actions WHERE id = p_action_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Pending action not found.';
  END IF;

  IF v_current_status NOT IN ('waiting_approval', 'failed') THEN
    RAISE EXCEPTION 'Cannot approve action with status %.', v_current_status;
  END IF;

  UPDATE odoo_pending_actions
  SET status = 'approved',
      approved_by = v_user_id,
      approved_at = now(),
      rejected_by = NULL,
      rejected_at = NULL,
      rejection_reason = NULL,
      error_message = NULL
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, user_id, details)
  VALUES (p_action_id, 'approved', v_user_id, jsonb_build_object('event', 'approved'));
END;
$function$;
