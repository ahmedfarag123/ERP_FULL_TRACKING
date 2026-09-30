CREATE OR REPLACE FUNCTION public.set_calls_odoo_insert_payload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.odoo_insert_payload = public.build_calls_odoo_insert(new);
  return new;
end;
$function$;
