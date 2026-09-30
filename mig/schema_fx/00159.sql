CREATE OR REPLACE FUNCTION public.resolve_sla_breach(p_breach_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_management_role() THEN
    RAISE EXCEPTION 'Only management can resolve SLA breaches.';
  END IF;

  UPDATE public.sla_breaches
  SET resolved_at = timezone('utc', now())
  WHERE id = p_breach_id AND resolved_at IS NULL;
END;
$function$;
