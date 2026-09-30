COPY "public"."quotation_items" ("id", "quotation_id", "company_name", "product_name", "product_code", "quantity", "unit_price", "discount_percent", "line_total", "metadata", "created_at") FROM STDIN;
\.
