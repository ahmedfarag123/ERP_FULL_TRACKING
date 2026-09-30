CREATE OR REPLACE FUNCTION public.finance_review_settlement(p_settlement_id uuid, p_approved boolean, p_finance_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_settlement RECORD;
  v_reviewer_id UUID;
BEGIN
  v_reviewer_id := auth.uid();
  IF v_reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get settlement record
  SELECT * INTO v_settlement
  FROM logistics_route_settlements
  WHERE id = p_settlement_id;

  IF v_settlement IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;

  IF v_settlement.status != 'waiting_for_finance' THEN
    RAISE EXCEPTION 'Settlement is not pending review';
  END IF;

  -- Update settlement status
  UPDATE logistics_route_settlements
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      approved_by = v_reviewer_id,
      approved_at = now(),
      finance_notes = p_finance_notes,
      updated_at = now()
  WHERE id = p_settlement_id;

  -- If approved, mark cash balance as settled
  IF p_approved THEN
    UPDATE driver_cash_balance
    SET status = 'settled',
        settled_by = v_reviewer_id,
        settled_at = now(),
        updated_at = now()
    WHERE driver_id = v_settlement.driver_id
      AND route_plan_id = v_settlement.plan_id
      AND status IN ('handed_to_finance', 'sent_via_fawry');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', p_settlement_id,
    'approved', p_approved,
    'status', CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END
  );
END;
$function$;
