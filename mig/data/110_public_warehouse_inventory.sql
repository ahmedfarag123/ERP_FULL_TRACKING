COPY "public"."warehouse_inventory" ("id", "warehouse_id", "product_id", "external_product_id", "product_name", "product_ref", "quantity_on_hand", "incoming_quantity", "outgoing_quantity", "reserved_quantity", "average_cost", "sales_price", "unit_of_measure", "source", "raw_payload", "last_sync_at", "created_at", "updated_at") FROM STDIN;
\.
