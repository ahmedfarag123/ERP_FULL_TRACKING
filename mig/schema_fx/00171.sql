CREATE OR REPLACE FUNCTION public.set_finance_invoices_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN new.updated_at = timezone('utc', now()); RETURN new; END; $function$;
