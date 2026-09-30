COPY "public"."finance_credit_notes" ("id", "credit_note_number", "customer_id", "original_invoice_id", "credit_note_date", "due_date", "journal_id", "currency_code", "subtotal", "discount_total", "tax_total", "total", "status", "posted_at", "voided_at", "posted_by", "journal_entry_id", "notes", "created_at", "updated_at") FROM STDIN;
\.
