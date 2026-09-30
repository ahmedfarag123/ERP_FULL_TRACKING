CREATE OR REPLACE FUNCTION public.post_driver_settlement(p_settlement_id uuid)
 RETURNS finance_driver_settlements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settlement public.finance_driver_settlements%ROWTYPE;
  v_journal_entry_id uuid;
  v_journal_lines jsonb;
  v_cash_account uuid;
  v_receivable_account uuid;
BEGIN
  IF NOT public.has_role_permission('finance.manage') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_settlement FROM public.finance_driver_settlements WHERE id = p_settlement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found.'; END IF;
  IF v_settlement.status != 'approved' THEN RAISE EXCEPTION 'Only approved settlements can be posted.'; END IF;

  SELECT id INTO v_cash_account FROM public.finance_accounts WHERE code = '1010' AND allow_posting = true LIMIT 1;
  SELECT id INTO v_receivable_account FROM public.finance_accounts WHERE code = '1120' AND allow_posting = true LIMIT 1;

  IF v_cash_account IS NOT NULL AND v_receivable_account IS NOT NULL AND v_settlement.net_payable > 0 THEN
    v_journal_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_cash_account, 'debit', v_settlement.net_payable, 'credit', 0),
      jsonb_build_object('account_id', v_receivable_account, 'debit', 0, 'credit', v_settlement.net_payable)
    );

    v_journal_entry_id := public.post_journal_entry(
      p_entry_date := current_date,
      p_source_type := 'driver_settlement',
      p_source_id := p_settlement_id,
      p_description := 'Driver settlement posting',
      p_lines := v_journal_lines
    );
  END IF;

  UPDATE public.finance_driver_settlements
  SET status = 'posted',
      journal_entry_id = v_journal_entry_id,
      posted_by = auth.uid(),
      posted_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_settlement_id
  RETURNING * INTO v_settlement;

  PERFORM public.log_audit_event(
    'post_driver_settlement',
    'finance_driver_settlement',
    p_settlement_id,
    'Settlement posted',
    jsonb_build_object('journal_entry_id', v_journal_entry_id, 'net_payable', v_settlement.net_payable)
  );

  RETURN v_settlement;
END;
$function$;
