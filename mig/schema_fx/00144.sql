CREATE OR REPLACE FUNCTION public.odoo_ref_id(p_value text)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_value is null then null
    when p_value ~ '^[0-9]+$' then p_value::bigint
    when p_value ~ '^[0-9]+\s*\|' then split_part(p_value, '|', 1)::bigint
    else null
  end;
$function$;
