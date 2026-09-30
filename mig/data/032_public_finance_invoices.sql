COPY "public"."finance_invoices" ("id", "invoice_number", "customer_id", "order_id", "status", "issue_date", "due_date", "currency_code", "subtotal", "tax_total", "discount_total", "total", "notes", "journal_entry_id", "created_by", "created_at", "updated_at") FROM STDIN;
\.
