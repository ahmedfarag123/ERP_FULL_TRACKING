CREATE OR REPLACE FUNCTION public.reverse_journal_entry(p_journal_entry_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_original   record;
  v_new_id     uuid;
  v_line       record;
  v_new_lines  jsonb := '[]';
  v_line_obj   jsonb;
BEGIN
  SELECT * INTO v_original
  FROM public.finance_journal_entries
  WHERE id = p_journal_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found.';
  END IF;

  IF v_original.status = 'reversed' THEN
    RAISE EXCEPTION 'Journal entry is already reversed.';
  END IF;

  -- Build reversal lines (swap debit/credit)
  FOR v_line IN
    SELECT * FROM public.finance_journal_lines WHERE journal_entry_id = p_journal_entry_id
  LOOP
    v_line_obj := jsonb_build_object(
      'account_id', v_line.account_id,
      'debit', v_line.credit,
      'credit', v_line.debit,
      'cost_center_id', v_line.cost_center_id,
      'customer_id', v_line.customer_id,
      'currency_code', v_line.currency_code,
      'description', v_line.description
    );
    v_new_lines := v_new_lines || jsonb_build_array(v_line_obj);
  END LOOP;

  -- Post the reversal entry
  v_new_id := public.post_journal_entry(
    v_original.entry_date,
    'reversal',
    p_journal_entry_id,
    COALESCE(p_reason, 'Reversal of ' || v_original.entry_number),
    v_new_lines
  );

  -- Mark original as reversed
  UPDATE public.finance_journal_entries
  SET status = 'reversed', reversed_by_entry_id = v_new_id
  WHERE id = p_journal_entry_id;

  RETURN v_new_id;
END;
$function$;
