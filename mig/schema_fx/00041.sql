CREATE OR REPLACE FUNCTION public.build_products_odoo_insert(p_row products)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'name', p_row.product_name,
    'default_code', nullif(btrim(coalesce(
      p_row.internal_reference,
      p_row.raw_payload->>'default_code',
      p_row.raw_payload->>'code'
    )), ''),
    'list_price', p_row.sales_price,
    'standard_price', p_row.average_cost
  ));
$function$;
