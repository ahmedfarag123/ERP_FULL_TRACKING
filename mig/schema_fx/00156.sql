CREATE OR REPLACE FUNCTION public.refresh_mv_account_balances()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_account_balances;
END;
$function$;
