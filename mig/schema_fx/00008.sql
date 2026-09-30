CREATE OR REPLACE VIEW "public"."v_trial_balance" AS
 SELECT account_code,
    account_name,
    account_type,
        CASE
            WHEN balance >= 0::numeric THEN balance
            ELSE 0::numeric
        END AS debit_balance,
        CASE
            WHEN balance < 0::numeric THEN abs(balance)
            ELSE 0::numeric
        END AS credit_balance
   FROM mv_account_balances
  WHERE abs(balance) > 0.01
  ORDER BY account_code;
