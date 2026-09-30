CREATE OR REPLACE FUNCTION public.post_invoice(p_invoice_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice record;
  v_line record;
  v_ar_account_id uuid;
  v_rev_account_id uuid;
  v_tax_account_id uuid;
  v_journal_entry_id uuid;
  v_journal_lines jsonb := '[]';
  v_line_obj jsonb;
  v_tax_amount numeric(14,2) := 0;
  v_line_tax numeric(14,2);
BEGIN
  SELECT * INTO v_invoice FROM public.finance_invoices WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found.';
  END IF;

  IF v_invoice.status != 'draft' THEN
    RAISE EXCEPTION 'Only draft invoices can be posted.';
  END IF;

  -- Get required accounts
  SELECT id INTO v_ar_account_id FROM public.finance_accounts WHERE code = '1013' AND allow_posting = true;
  SELECT id INTO v_rev_account_id FROM public.finance_accounts WHERE code = '4010' AND allow_posting = true;
  SELECT id INTO v_tax_account_id FROM public.finance_accounts WHERE code = '2030' AND allow_posting = true;

  IF v_ar_account_id IS NULL OR v_rev_account_id IS NULL THEN
    RAISE EXCEPTION 'Required accounts (AR or Revenue) not found in chart of accounts.';
  END IF;

  -- Build journal lines from invoice lines
  FOR v_line IN
    SELECT il.*, tr.rate as tax_rate_pct, tr.id as tax_rate_id
    FROM public.finance_invoice_lines il
    LEFT JOIN public.finance_tax_rates tr ON il.tax_rate_id = tr.id
    WHERE il.invoice_id = p_invoice_id
  LOOP
    -- Revenue line (credit)
    v_line_obj := jsonb_build_object(
      'account_id', v_rev_account_id,
      'debit', 0,
      'credit', v_line.line_total
    );
    v_journal_lines := v_journal_lines || jsonb_build_array(v_line_obj);

    -- Tax line (credit) if applicable
    IF v_line.tax_rate_pct IS NOT NULL AND v_line.tax_rate_pct > 0 THEN
      v_line_tax := round(v_line.line_total * v_line.tax_rate_pct / 100, 2);
      v_tax_amount := v_tax_amount + v_line_tax;

      v_line_obj := jsonb_build_object(
        'account_id', v_tax_account_id,
        'debit', 0,
        'credit', v_line_tax
      );
      v_journal_lines := v_journal_lines || jsonb_build_array(v_line_obj);
    END IF;
  END LOOP;

  -- Accounts Receivable line (debit = total + tax)
  v_line_obj := jsonb_build_object(
    'account_id', v_ar_account_id,
    'debit', v_invoice.subtotal + v_tax_amount,
    'credit', 0,
    'customer_id', v_invoice.customer_id
  );
  v_journal_lines := jsonb_build_array(v_line_obj) || v_journal_lines;

  -- Post the journal entry
  v_journal_entry_id := public.post_journal_entry(
    v_invoice.issue_date,
    'invoice',
    p_invoice_id,
    'Invoice ' || COALESCE(v_invoice.invoice_number, p_invoice_id::text),
    v_journal_lines
  );

  -- Allocate invoice number
  UPDATE public.finance_invoices
  SET invoice_number = public.next_document_number('invoice'),
      status = 'posted',
      tax_total = v_tax_amount,
      total = v_invoice.subtotal + v_tax_amount,
      journal_entry_id = v_journal_entry_id
  WHERE id = p_invoice_id;

  RETURN v_journal_entry_id;
END;
$function$;
