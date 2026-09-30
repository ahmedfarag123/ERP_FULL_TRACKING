CREATE OR REPLACE FUNCTION public.driver_get_cash_balance(p_plan_id uuid DEFAULT NULL::uuid)
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
    -- Get balance for specific plan
    SELECT jsonb_build_object(
      'cash_amount', cash_amount,
      'currency_code', currency_code,
      'status', status,
      'route_plan_id', route_plan_id
    ) INTO v_result
    FROM driver_cash_balance
    WHERE driver_id = v_driver_id
      AND route_plan_id = p_plan_id;
  ELSE
    -- Get all pending balances
    SELECT jsonb_agg(jsonb_build_object(
      'cash_amount', cash_amount,
      'currency_code', currency_code,
      'status', status,
      'route_plan_id', route_plan_id
    )) INTO v_result
    FROM driver_cash_balance
    WHERE driver_id = v_driver_id;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;
