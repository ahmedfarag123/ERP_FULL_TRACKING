CREATE OR REPLACE FUNCTION public.raise_logistics_error(p_code text, p_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '[LOGISTICS_%] %', p_code, p_message;
end;
$function$;
