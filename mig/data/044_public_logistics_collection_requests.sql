COPY "public"."logistics_collection_requests" ("id", "driver_profile_id", "plan_id", "collected_amount", "currency_code", "proof_photo_url", "driver_notes", "status", "admin_notes", "reviewed_by_profile_id", "reviewed_at", "created_at", "updated_at", "driver_profile_id_full_name", "reviewed_by_profile_id_full_name") FROM STDIN;
\.
