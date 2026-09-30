COPY "public"."finance_payments" ("id", "payment_number", "customer_id", "invoice_id", "order_id", "payment_method", "payment_date", "amount", "currency_code", "reference_number", "bank_name", "cheque_number", "notes", "status", "journal_entry_id", "confirmed_by", "confirmed_at", "reconciled_by", "reconciled_at", "created_by", "created_at", "updated_at") FROM STDIN;
\.
