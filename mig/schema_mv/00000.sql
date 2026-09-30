DROP MATERIALIZED VIEW IF EXISTS "public"."mv_account_balances";
CREATE MATERIALIZED VIEW "public"."mv_account_balances" AS
 SELECT a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.type AS account_type,
    COALESCE(sum(l.debit), 0::numeric) AS total_debit,
    COALESCE(sum(l.credit), 0::numeric) AS total_credit,
        CASE
            WHEN a.type = ANY (ARRAY['asset'::text, 'expense'::text]) THEN COALESCE(sum(l.debit), 0::numeric) - COALESCE(sum(l.credit), 0::numeric)
            ELSE COALESCE(sum(l.credit), 0::numeric) - COALESCE(sum(l.debit), 0::numeric)
        END AS balance,
    now() AS refreshed_at
   FROM finance_accounts a
     LEFT JOIN finance_journal_lines l ON l.account_id = a.id
     LEFT JOIN finance_journal_entries e ON e.id = l.journal_entry_id AND e.status = 'posted'::text
  WHERE a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type WITH NO DATA;
