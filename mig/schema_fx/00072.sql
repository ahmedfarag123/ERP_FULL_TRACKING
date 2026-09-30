CREATE OR REPLACE FUNCTION public.driver_get_route_settlements(p_plan_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_driver_id UUID;
  v_result JSONB;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_plan_id IS NOT NULL THEN
    -- Get settlements for specific plan
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'settlement_method', settlement_method,
      'total_cash_amount', total_cash_amount,
      'currency_code', currency_code,
      'status', status,
      'driver_notes', driver_notes,
      'finance_notes', finance_notes,
      'created_at', created_at
    )) INTO v_result
    FROM logistics_route_settlements
    WHERE driver_id = v_driver_id
      AND plan_id = p_plan_id;
  ELSE
    -- Get all settlements
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'settlement_method', settlement_method,
      'total_cash_amount', total_cash_amount,
      'currency_code', currency_code,
      'status', status,
      'driver_notes', driver_notes,
      'finance_notes', finance_notes,
      'created_at', created_at
    )) INTO v_result
    FROM logistics_route_settlements
    WHERE driver_id = v_driver_id;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;
