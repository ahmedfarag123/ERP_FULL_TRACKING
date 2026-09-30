CREATE OR REPLACE FUNCTION public.driver_record_cash_payment(p_shipment_id uuid, p_amount numeric, p_currency_code text DEFAULT 'EGP'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_plan_id UUID;
  v_driver_id UUID;
  v_existing_balance NUMERIC;
BEGIN
  -- Get shipment details
  SELECT plan_id, assigned_profile_id INTO v_plan_id, v_driver_id
  FROM logistics_shipments
  WHERE id = p_shipment_id;

  IF v_plan_id IS NULL OR v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;

  -- Check if driver has existing cash balance for this plan
  SELECT cash_amount INTO v_existing_balance
  FROM driver_cash_balance
  WHERE driver_id = v_driver_id
    AND route_plan_id = v_plan_id
    AND status = 'pending';

  IF v_existing_balance IS NOT NULL THEN
    -- Update existing balance
    UPDATE driver_cash_balance
    SET cash_amount = v_existing_balance + p_amount,
        updated_at = now()
    WHERE driver_id = v_driver_id
      AND route_plan_id = v_plan_id
      AND status = 'pending';
  ELSE
    -- Create new balance record
    INSERT INTO driver_cash_balance (driver_id, route_plan_id, cash_amount, currency_code)
    VALUES (v_driver_id, v_plan_id, p_amount, p_currency_code);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', v_plan_id,
    'total_cash', v_existing_balance + p_amount
  );
END;
$function$;
