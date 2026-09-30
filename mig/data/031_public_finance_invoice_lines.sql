COPY "public"."finance_invoice_lines" ("id", "invoice_id", "product_id", "description", "quantity", "unit_price", "discount_pct", "tax_rate_id", "line_total", "sort_order", "created_at") FROM STDIN;
\.
