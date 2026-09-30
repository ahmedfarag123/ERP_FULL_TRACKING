CREATE OR REPLACE FUNCTION public.post_journal_entry(p_entry_date date DEFAULT NULL::date, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_lines jsonb DEFAULT '[]'::jsonb, p_fiscal_period_id uuid DEFAULT NULL::uuid, p_source_document_type text DEFAULT NULL::text, p_source_document_id uuid DEFAULT NULL::uuid, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_entry_id      uuid;
  v_period_id     uuid;
  v_entry_number  text;
  v_line          jsonb;
  v_total_debit   numeric(14,2) := 0;
  v_total_credit  numeric(14,2) := 0;
  v_line_debit    numeric(14,2);
  v_line_credit   numeric(14,2);
  v_desc          text;
  v_src_type      text;
  v_src_id        uuid;
  v_date          date;
begin
  v_date     := coalesce(p_entry_date, current_date);
  v_src_type := coalesce(p_source_type, p_source_document_type);
  v_src_id   := coalesce(p_source_id, p_source_document_id);
  v_desc     := coalesce(p_description, p_reference, p_notes);

  if p_fiscal_period_id is not null then
    v_period_id := p_fiscal_period_id;
  else
    select id into v_period_id
    from public.finance_fiscal_periods
    where v_date between start_date and end_date and status = 'open';
    if not found then
      raise exception 'No open fiscal period found for date %.', v_date;
    end if;
  end if;

  if jsonb_array_length(p_lines) < 2 then
    raise exception 'A journal entry requires at least 2 lines.';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_line_debit  := coalesce((v_line->>'debit')::numeric, 0);
    v_line_credit := coalesce((v_line->>'credit')::numeric, 0);

    if not exists (
      select 1 from public.finance_accounts
      where id = (v_line->>'account_id')::uuid and allow_posting = true and is_active = true
    ) then
      raise exception 'Account % does not exist or does not allow posting.', v_line->>'account_id';
    end if;

    if (v_line_debit > 0 and v_line_credit > 0) then
      raise exception 'A line cannot have both debit and credit.';
    end if;

    if v_line_debit = 0 and v_line_credit = 0 then
      raise exception 'A line must have either debit or credit.';
    end if;

    v_total_debit  := v_total_debit + v_line_debit;
    v_total_credit := v_total_credit + v_line_credit;
  end loop;

  if v_total_debit != v_total_credit then
    raise exception 'Journal entry not balanced. Debit: %, Credit: %', v_total_debit, v_total_credit;
  end if;

  v_entry_number := public.next_document_number('journal_entry');

  insert into public.finance_journal_entries
    (entry_number, fiscal_period_id, entry_date, source_type, source_id, description, posted_by)
  values
    (v_entry_number, v_period_id, v_date, v_src_type, v_src_id, v_desc, auth.uid())
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.finance_journal_lines
      (journal_entry_id, account_id, cost_center_id, customer_id, debit, credit, currency_code, description)
    values (
      v_entry_id,
      (v_line->>'account_id')::uuid,
      case when v_line ? 'cost_center_id' and v_line->>'cost_center_id' is not null
           then (v_line->>'cost_center_id')::uuid else null end,
      case when v_line ? 'customer_id' and v_line->>'customer_id' is not null
           then (v_line->>'customer_id')::uuid else null end,
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'credit')::numeric, 0),
      coalesce(v_line->>'currency_code', 'EGP'),
      v_line->>'description'
    );
  end loop;

  return v_entry_id;
end;
$function$;
