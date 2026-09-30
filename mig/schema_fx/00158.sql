CREATE OR REPLACE FUNCTION public.reopen_fiscal_period(p_period_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period record;
BEGIN
  -- Permission check: finance.close_period required for reopen too
  IF NOT public.has_role_permission('finance.close_period') THEN
    RAISE EXCEPTION 'Permission denied: finance.close_period required';
  END IF;

  SELECT id, status INTO v_period
  FROM public.finance_fiscal_periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fiscal period not found.';
  END IF;

  IF v_period.status NOT IN ('closed', 'locked') THEN
    RAISE EXCEPTION 'Period is already open.';
  END IF;

  UPDATE public.finance_fiscal_periods
  SET status = 'open', closed_at = NULL, closed_by = NULL
  WHERE id = p_period_id;
END;
$function$;
