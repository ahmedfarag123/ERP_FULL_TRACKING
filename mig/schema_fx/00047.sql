CREATE OR REPLACE FUNCTION public.close_fiscal_period(p_period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period record;
BEGIN
  -- Permission check: finance.close_period required
  IF NOT public.has_role_permission('finance.close_period') THEN
    RAISE EXCEPTION 'Permission denied: finance.close_period required';
  END IF;

  SELECT id, status, start_date, end_date INTO v_period
  FROM public.finance_fiscal_periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fiscal period not found.';
  END IF;

  IF v_period.status != 'open' THEN
    RAISE EXCEPTION 'Period is already %.', v_period.status;
  END IF;

  -- Block if any draft invoices reference dates inside the period
  IF EXISTS (
    SELECT 1 FROM public.finance_invoices
    WHERE status = 'draft'
      AND invoice_date BETWEEN v_period.start_date AND v_period.end_date
  ) THEN
    RAISE EXCEPTION 'Cannot close period: draft invoices exist for this period.';
  END IF;

  -- Block if any draft settlements reference dates inside the period
  IF EXISTS (
    SELECT 1 FROM public.finance_driver_settlements
    WHERE status = 'draft'
      AND settlement_date BETWEEN v_period.start_date AND v_period.end_date
  ) THEN
    RAISE EXCEPTION 'Cannot close period: draft driver settlements exist for this period.';
  END IF;

  -- Block if any draft journal entries exist in the period
  IF EXISTS (
    SELECT 1 FROM public.finance_journal_entries e
    JOIN public.finance_fiscal_periods fp ON fp.id = e.fiscal_period_id
    WHERE e.status = 'draft'
      AND fp.id = p_period_id
  ) THEN
    RAISE EXCEPTION 'Cannot close period: draft journal entries exist for this period.';
  END IF;

  UPDATE public.finance_fiscal_periods
  SET status = 'closed', closed_at = now(), closed_by = auth.uid()
  WHERE id = p_period_id;
END;
$function$;
