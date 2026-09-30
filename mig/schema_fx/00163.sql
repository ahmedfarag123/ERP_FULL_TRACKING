CREATE OR REPLACE FUNCTION public.reverse_journal_entry(p_journal_entry_id uuid DEFAULT NULL::uuid, p_entry_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_original record;
  v_new_id   uuid;
  v_line     record;
  v_entry_id uuid;
begin
  v_entry_id := coalesce(p_journal_entry_id, p_entry_id);
  if v_entry_id is null then
    raise exception 'Must provide p_journal_entry_id or p_entry_id';
  end if;

  select * into v_original
  from public.finance_journal_entries where id = v_entry_id;

  if not found then
    raise exception 'Journal entry % not found.', v_entry_id;
  end if;

  if v_original.reversed_by_entry_id is not null then
    raise exception 'Journal entry % is already reversed.', v_entry_id;
  end if;

  insert into public.finance_journal_entries
    (entry_number, fiscal_period_id, entry_date, source_type, source_id, description, posted_by)
  values (
    public.next_document_number('journal_entry'),
    v_original.fiscal_period_id,
    current_date,
    'reversal',
    v_entry_id,
    coalesce(p_reason, 'Reversal of ' || v_original.entry_number),
    auth.uid()
  ) returning id into v_new_id;

  update public.finance_journal_entries
  set reversed_by_entry_id = v_new_id where id = v_entry_id;

  for v_line in
    select * from public.finance_journal_lines where journal_entry_id = v_entry_id
  loop
    insert into public.finance_journal_lines
      (journal_entry_id, account_id, cost_center_id, customer_id, debit, credit, currency_code, description)
    values (
      v_new_id, v_line.account_id, v_line.cost_center_id, v_line.customer_id,
      v_line.credit, v_line.debit, v_line.currency_code,
      'Reversal: ' || coalesce(v_line.description, '')
    );
  end loop;

  return v_new_id;
end;
$function$;
