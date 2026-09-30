CREATE OR REPLACE FUNCTION public.reject_odoo_pending_action(p_action_id uuid, p_reason text DEFAULT NULL::text)
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

  IF v_current_status NOT IN ('waiting_approval', 'approved') THEN
    RAISE EXCEPTION 'Cannot reject action with status %.', v_current_status;
  END IF;

  UPDATE odoo_pending_actions
  SET status = 'rejected',
      rejected_by = v_user_id,
      rejected_at = now(),
      rejection_reason = p_reason
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, user_id, details)
  VALUES (p_action_id, 'rejected', v_user_id, jsonb_build_object(
    'event', 'rejected',
    'reason', p_reason
  ));
END;
$function$;
