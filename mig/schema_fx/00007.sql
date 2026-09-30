CREATE OR REPLACE VIEW "public"."v_profit_and_loss" AS
 SELECT account_code,
    account_name,
    account_type,
    total_debit,
    total_credit,
    balance,
        CASE
            WHEN account_type = 'revenue'::text THEN 'Revenue'::text
            WHEN account_type = 'expense'::text THEN 'Expense'::text
            ELSE 'Other'::text
        END AS pl_category
   FROM mv_account_balances
  WHERE account_type = ANY (ARRAY['revenue'::text, 'expense'::text])
  ORDER BY account_type, account_code;
