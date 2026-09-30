CREATE OR REPLACE FUNCTION public.is_reachable_call(p_call_outcome text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_call_outcome is null then false
    when lower(p_call_outcome) like '%تم الوصول%' then true
    when lower(p_call_outcome) like '%answered%' then true
    when lower(p_call_outcome) like '%connected%' then true
    when lower(p_call_outcome) like '%reached%' then true
    else false
  end
$function$;
