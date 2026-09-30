CREATE OR REPLACE FUNCTION public.upsert_odoo_kpi_values(p_values jsonb, p_period_start date, p_period_end date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_inserted integer := 0;
  v_item jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_values)
  LOOP
    INSERT INTO kpi.odoo_values (kpi_code, actual_value, note, period_start, period_end, computed_at)
    VALUES (
      v_item->>'code',
      (v_item->>'actual_value')::numeric,
      v_item->>'note',
      p_period_start,
      p_period_end,
      now()
    )
    ON CONFLICT (kpi_code, period_start, period_end)
    DO UPDATE SET
      actual_value = EXCLUDED.actual_value,
      note = EXCLUDED.note,
      computed_at = now();

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$function$;
