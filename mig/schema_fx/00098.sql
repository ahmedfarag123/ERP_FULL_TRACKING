CREATE OR REPLACE FUNCTION public.get_ar_aging_report()
 RETURNS TABLE(customer_id uuid, customer_name text, total_outstanding numeric, current_amount numeric, days_30 numeric, days_60 numeric, days_90 numeric, over_90 numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role_permission('finance.view') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.customer_name,
    COALESCE(SUM(fi.total - COALESCE(
      (SELECT SUM(fp.amount) FROM public.finance_payments fp WHERE fp.invoice_id = fi.id AND fp.status = 'confirmed'), 0
    )), 0) AS total_outstanding,
    COALESCE(SUM(CASE WHEN fi.due_date >= current_date THEN fi.total ELSE 0 END), 0) AS current_amount,
    COALESCE(SUM(CASE WHEN fi.due_date < current_date AND fi.due_date >= current_date - 30 THEN fi.total ELSE 0 END), 0) AS days_30,
    COALESCE(SUM(CASE WHEN fi.due_date < current_date - 30 AND fi.due_date >= current_date - 60 THEN fi.total ELSE 0 END), 0) AS days_60,
    COALESCE(SUM(CASE WHEN fi.due_date < current_date - 60 AND fi.due_date >= current_date - 90 THEN fi.total ELSE 0 END), 0) AS days_90,
    COALESCE(SUM(CASE WHEN fi.due_date < current_date - 90 THEN fi.total ELSE 0 END), 0) AS over_90
  FROM public.finance_invoices fi
  JOIN public.customers c ON c.id = fi.customer_id
  WHERE fi.status IN ('posted', 'partially_paid')
  GROUP BY c.id, c.customer_name
  HAVING COALESCE(SUM(fi.total - COALESCE(
    (SELECT SUM(fp.amount) FROM public.finance_payments fp WHERE fp.invoice_id = fi.id AND fp.status = 'confirmed'), 0
  )), 0) > 0
  ORDER BY total_outstanding DESC;
END;
$function$;
