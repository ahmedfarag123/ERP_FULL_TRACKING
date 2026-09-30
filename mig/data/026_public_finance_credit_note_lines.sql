COPY "public"."finance_credit_note_lines" ("id", "credit_note_id", "product_id", "description", "quantity", "unit_price", "discount_percent", "tax_rate_id", "tax_amount", "line_total", "sort_order", "created_at") FROM STDIN;
\.
