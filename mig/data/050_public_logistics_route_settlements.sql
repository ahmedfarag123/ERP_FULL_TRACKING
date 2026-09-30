COPY "public"."logistics_route_settlements" ("id", "plan_id", "driver_id", "settlement_method", "total_cash_amount", "currency_code", "receipt_image_url", "driver_notes", "finance_notes", "status", "approved_by", "approved_at", "created_at", "updated_at", "driver_id_full_name", "approved_by_full_name") FROM STDIN;
\.
