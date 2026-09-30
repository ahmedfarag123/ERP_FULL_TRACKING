CREATE OR REPLACE FUNCTION public.check_sla_breaches()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_sla RECORD;
  v_inserted integer;
BEGIN
  FOR v_sla IN
    SELECT * FROM public.sla_definitions WHERE is_active = true
  LOOP
    IF v_sla.entity_type = 'shipment' THEN
      INSERT INTO public.sla_breaches (sla_definition_id, entity_type, entity_id, breach_type)
      SELECT v_sla.id, 'shipment', ls.id, 'warning'
      FROM public.logistics_shipments ls
      WHERE ls.delivery_phase NOT IN ('delivered', 'finished', 'settled', 'cancelled')
        AND ls.scheduled_at < now() - (v_sla.warning_hours || ' hours')::interval
        AND ls.scheduled_at > now() - (v_sla.target_hours || ' hours')::interval
        AND NOT EXISTS (
          SELECT 1 FROM public.sla_breaches sb
          WHERE sb.entity_type = 'shipment' AND sb.entity_id = ls.id
            AND sb.sla_definition_id = v_sla.id AND sb.breach_type = 'warning'
        )
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      v_count := v_count + v_inserted;

      INSERT INTO public.sla_breaches (sla_definition_id, entity_type, entity_id, breach_type)
      SELECT v_sla.id, 'shipment', ls.id, 'breach'
      FROM public.logistics_shipments ls
      WHERE ls.delivery_phase NOT IN ('delivered', 'finished', 'settled', 'cancelled')
        AND ls.scheduled_at < now() - (v_sla.target_hours || ' hours')::interval
        AND NOT EXISTS (
          SELECT 1 FROM public.sla_breaches sb
          WHERE sb.entity_type = 'shipment' AND sb.entity_id = ls.id
            AND sb.sla_definition_id = v_sla.id AND sb.breach_type = 'breach'
        )
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      v_count := v_count + v_inserted;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;
