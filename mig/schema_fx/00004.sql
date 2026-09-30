CREATE OR REPLACE VIEW "public"."v_ar_aging" AS
 SELECT customer_id,
    id AS invoice_id,
    invoice_number,
    issue_date,
    due_date,
    total AS invoice_total,
        CASE
            WHEN due_date IS NULL THEN 'Not Due'::text
            WHEN due_date >= CURRENT_DATE THEN 'Current'::text
            WHEN due_date >= (CURRENT_DATE - '30 days'::interval) THEN '1-30 Days'::text
            WHEN due_date >= (CURRENT_DATE - '60 days'::interval) THEN '31-60 Days'::text
            WHEN due_date >= (CURRENT_DATE - '90 days'::interval) THEN '61-90 Days'::text
            ELSE '90+ Days'::text
        END AS aging_bucket,
    CURRENT_DATE - due_date AS days_overdue
   FROM finance_invoices i
  WHERE status = 'posted'::text AND total > 0::numeric
  ORDER BY customer_id, due_date;
