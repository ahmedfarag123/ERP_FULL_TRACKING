CREATE OR REPLACE FUNCTION public.create_odoo_pending_action(p_entity_type text, p_action_type text, p_odoo_model text, p_odoo_method text, p_entity_id text DEFAULT NULL::text, p_payload_json jsonb DEFAULT '{}'::jsonb, p_validation_result jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_action_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  INSERT INTO odoo_pending_actions (
    entity_type, action_type, odoo_model, odoo_method,
    entity_id, payload_json, validation_result,
    status, created_by
  ) VALUES (
    p_entity_type, p_action_type, p_odoo_model, p_odoo_method,
    p_entity_id, p_payload_json, p_validation_result,
    'waiting_approval', v_user_id
  ) RETURNING id INTO v_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, user_id, details)
  VALUES (v_action_id, 'waiting_approval', v_user_id, jsonb_build_object('event', 'created'));

  RETURN v_action_id;
END;
$function$;
