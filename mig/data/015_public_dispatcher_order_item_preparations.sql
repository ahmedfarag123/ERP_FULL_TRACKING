COPY "public"."dispatcher_order_item_preparations" ("id", "preparation_id", "order_id", "order_line_item_id", "product_id", "dataset_id", "requested_quantity", "approved_quantity", "status", "shortage_reason", "note", "barcode", "barcode_validated_at", "confirmed_at", "confirmed_by_profile_id", "created_at", "updated_at", "confirmed_by_profile_id_full_name") FROM STDIN;
\.
