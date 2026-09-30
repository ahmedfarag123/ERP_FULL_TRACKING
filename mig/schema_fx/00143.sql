CREATE OR REPLACE FUNCTION public.odoo_datetime(p_value text)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_value is null then null
    when p_value ~ '^\d{4}-\d{2}-\d{2}' then p_value::timestamptz
    else null
  end;
$function$;
