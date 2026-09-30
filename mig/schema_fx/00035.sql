CREATE OR REPLACE FUNCTION public.approve_driver_settlement(p_settlement_id uuid)
 RETURNS finance_driver_settlements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settlement public.finance_driver_settlements%ROWTYPE;
BEGIN
  IF NOT public.has_role_permission('finance.manage') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_settlement FROM public.finance_driver_settlements WHERE id = p_settlement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found.'; END IF;
  IF v_settlement.status != 'draft' THEN RAISE EXCEPTION 'Only draft settlements can be approved.'; END IF;

  UPDATE public.finance_driver_settlements
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_settlement_id
  RETURNING * INTO v_settlement;

  PERFORM public.log_audit_event(
    'approve_driver_settlement',
    'finance_driver_settlement',
    p_settlement_id,
    'Settlement approved',
    jsonb_build_object('net_payable', v_settlement.net_payable)
  );

  RETURN v_settlement;
END;
$function$;
