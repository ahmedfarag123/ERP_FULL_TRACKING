COPY "public"."driver_plan_settlement_requests" ("id", "driver_profile_id", "plan_id", "total_debt_amount", "currency_code", "proof_photo_url", "status", "driver_notes", "admin_notes", "reviewed_by_profile_id", "reviewed_at", "paid_at", "created_at", "updated_at", "driver_profile_id_full_name", "reviewed_by_profile_id_full_name") FROM STDIN;
\.
