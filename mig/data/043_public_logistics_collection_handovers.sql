COPY "public"."logistics_collection_handovers" ("id", "driver_profile_id", "plan_id", "handed_to_manager", "reason", "total_amount", "currency_code", "metadata", "created_at", "driver_profile_id_full_name") FROM STDIN;
\.
