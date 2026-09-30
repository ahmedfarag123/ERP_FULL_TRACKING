CREATE OR REPLACE FUNCTION public.driver_submit_route_settlement(p_plan_id uuid, p_settlement_method text, p_receipt_image_url text DEFAULT NULL::text, p_driver_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_driver_id UUID;
  v_total_cash NUMERIC;
  v_currency_code TEXT;
  v_settlement_id UUID;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_settlement_method NOT IN ('hand_to_finance', 'send_via_fawry') THEN
    RAISE EXCEPTION 'Invalid settlement method';
  END IF;

  -- Compute total from shipment collections (driver_debt_amount)
  SELECT
    COALESCE(SUM(lsc.driver_debt_amount), 0),
    COALESCE(MAX(lsc.currency_code), 'EGP')
  INTO v_total_cash, v_currency_code
  FROM public.logistics_shipment_collections lsc
  JOIN public.logistics_shipments ls ON ls.id = lsc.shipment_id
  WHERE ls.plan_id = p_plan_id
    AND lsc.driver_debt_amount > 0
    AND lsc.accounting_status = 'pending_accounting_review';

  IF v_total_cash IS NULL OR v_total_cash <= 0 THEN
    RAISE EXCEPTION 'No pending collection amount for this route';
  END IF;

  INSERT INTO public.logistics_route_settlements (
    plan_id, driver_id, settlement_method, total_cash_amount,
    receipt_image_url, driver_notes, currency_code
  ) VALUES (
    p_plan_id, v_driver_id, p_settlement_method, v_total_cash,
    p_receipt_image_url, p_driver_notes, v_currency_code
  ) RETURNING id INTO v_settlement_id;

  -- Update accounting_status on the collections
  UPDATE public.logistics_shipment_collections lsc
  SET accounting_status = 'pending_accounting_review'
  FROM public.logistics_shipments ls
  WHERE ls.id = lsc.shipment_id
    AND ls.plan_id = p_plan_id
    AND lsc.driver_debt_amount > 0
    AND lsc.accounting_status = 'pending_accounting_review';

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', v_settlement_id,
    'total_cash_amount', v_total_cash,
    'currency_code', v_currency_code,
    'settlement_method', p_settlement_method,
    'status', 'waiting_for_finance'
  );
END;
$function$;
