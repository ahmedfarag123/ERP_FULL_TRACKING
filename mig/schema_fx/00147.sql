CREATE OR REPLACE FUNCTION public.post_credit_note(p_credit_note_id uuid, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cn record;
  v_entry_id uuid;
  v_total numeric := 0;
  v_line jsonb;
  v_ar_account_id uuid;
BEGIN
  SELECT * INTO v_cn FROM public.finance_credit_notes
    WHERE id = p_credit_note_id AND status = 'draft'
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit note not found or not in draft status';
  END IF;

  -- Validate fiscal period is open for the credit note date
  IF NOT EXISTS (
    SELECT 1 FROM public.finance_fiscal_periods
    WHERE status = 'open'
      AND start_date <= v_cn.credit_note_date
      AND end_date >= v_cn.credit_note_date
  ) THEN
    RAISE EXCEPTION 'No open fiscal period found for credit note date %', v_cn.credit_note_date;
  END IF;

  -- Validate lines balance
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_total := v_total + (v_line->>'debit')::numeric - (v_line->>'credit')::numeric;
  END LOOP;
  IF abs(v_total) > 0.01 THEN
    RAISE EXCEPTION 'Credit note journal entry must be balanced';
  END IF;

  -- Get AR account
  SELECT id INTO v_ar_account_id FROM public.finance_accounts
    WHERE account_code = '1200';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AR account (1200) not found';
  END IF;

  -- Create journal entry
  INSERT INTO public.finance_journal_entries (
    fiscal_period_id, source_document_type, source_document_id,
    reference, notes, created_by
  ) VALUES (
    (SELECT id FROM public.finance_fiscal_periods
      WHERE status = 'open'
      AND start_date <= v_cn.credit_note_date
      AND end_date >= v_cn.credit_note_date
      LIMIT 1),
    'credit_note',
    p_credit_note_id,
    'CN-' || v_cn.credit_note_number,
    'Credit note posted',
    auth.uid()
  ) RETURNING id INTO v_entry_id;

  -- Insert journal lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO public.finance_journal_lines (
      journal_entry_id, account_id, debit, credit,
      description, cost_center_id
    ) VALUES (
      v_entry_id,
      (v_line->>'account_id')::uuid,
      (v_line->>'debit')::numeric,
      (v_line->>'credit')::numeric,
      v_line->>'description',
      NULLIF(v_line->>'cost_center_id', '')::uuid
    );
  END LOOP;

  -- Update credit note
  UPDATE public.finance_credit_notes
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid(),
      journal_entry_id = v_entry_id,
      total = v_cn.total
  WHERE id = p_credit_note_id;

  -- Update original invoice amount_to_invoice if linked
  IF v_cn.original_invoice_id IS NOT NULL THEN
    UPDATE public.finance_invoices
    SET amount_to_invoice = GREATEST(0, total - v_cn.total)
    WHERE id = v_cn.original_invoice_id;
  END IF;

  RETURN v_entry_id;
END;
$function$;
