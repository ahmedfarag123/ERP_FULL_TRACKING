CREATE OR REPLACE FUNCTION public.map_delivery_phase_from_odoo_state(p_state text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE lower(trim(COALESCE(p_state, '')))
    WHEN 'done' THEN 'ready'
    WHEN 'cancel' THEN 'cancelled'
    WHEN 'assigned' THEN 'ready'
    WHEN 'ready' THEN 'ready'
    WHEN 'waiting' THEN 'pending'
    WHEN 'confirmed' THEN 'pending'
    WHEN 'draft' THEN 'pending'
    ELSE 'pending'
  END;
$function$;
