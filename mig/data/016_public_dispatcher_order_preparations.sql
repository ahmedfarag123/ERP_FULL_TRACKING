COPY "public"."dispatcher_order_preparations" ("id", "order_id", "status", "started_at", "completed_at", "duration_seconds", "dispatcher_profile_id", "notes", "photos", "created_at", "updated_at", "dispatcher_profile_id_full_name") FROM STDIN;
\.
