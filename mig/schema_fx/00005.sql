CREATE OR REPLACE VIEW "public"."v_balance_sheet" AS
 SELECT account_code,
    account_name,
    account_type,
    total_debit,
    total_credit,
    balance,
        CASE
            WHEN account_type = 'asset'::text THEN 'Assets'::text
            WHEN account_type = 'liability'::text THEN 'Liabilities'::text
            WHEN account_type = 'equity'::text THEN 'Equity'::text
            ELSE 'Other'::text
        END AS bs_category
   FROM mv_account_balances
  WHERE account_type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text])
  ORDER BY account_type, account_code;
