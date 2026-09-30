CREATE OR REPLACE FUNCTION public.post_credit_note(p_invoice_id uuid, p_reason text, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice record;
  v_ar_account_id uuid;
  v_returns_account_id uuid;
  v_journal_entry_id uuid;
  v_journal_lines jsonb;
BEGIN
  SELECT * INTO v_invoice FROM public.finance_invoices WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found.';
  END IF;

  IF v_invoice.status NOT IN ('posted', 'partially_paid') THEN
    RAISE EXCEPTION 'Credit note can only be issued against posted or partially paid invoices.';
  END IF;

  SELECT id INTO v_ar_account_id FROM public.finance_accounts WHERE code = '1013' AND allow_posting = true;
  SELECT id INTO v_returns_account_id FROM public.finance_accounts WHERE code = '4030' AND allow_posting = true;

  -- Credit note: Dr Sales Returns, Cr Accounts Receivable
  v_journal_lines := jsonb_build_array(
    jsonb_build_object('account_id', v_returns_account_id, 'debit', p_amount, 'credit', 0),
    jsonb_build_object('account_id', v_ar_account_id, 'debit', 0, 'credit', p_amount, 'customer_id', v_invoice.customer_id)
  );

  v_journal_entry_id := public.post_journal_entry(
    current_date,
    'credit_note',
    p_invoice_id,
    COALESCE(p_reason, 'Credit note for invoice ' || COALESCE(v_invoice.invoice_number, '')),
    v_journal_lines
  );

  RETURN v_journal_entry_id;
END;
$function$;
