COPY "public"."cart_items" ("id", "tenant_id", "product_id", "quantity", "customer_id", "session_id", "created_at", "updated_at") FROM STDIN;
\.
