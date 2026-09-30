CREATE OR REPLACE VIEW "public"."v_general_ledger" AS
 SELECT e.id AS entry_id,
    e.entry_number,
    e.entry_date,
    e.source_type,
    e.source_id,
    e.description AS entry_description,
    e.status,
    l.id AS line_id,
    a.code AS account_code,
    a.name AS account_name,
    l.debit,
    l.credit,
    l.description AS line_description,
    l.cost_center_id,
    cc.name AS cost_center_name,
    e.posted_by,
    e.created_at
   FROM finance_journal_entries e
     JOIN finance_journal_lines l ON l.journal_entry_id = e.id
     JOIN finance_accounts a ON a.id = l.account_id
     LEFT JOIN finance_cost_centers cc ON cc.id = l.cost_center_id
  ORDER BY e.entry_date, e.entry_number, l.id;
