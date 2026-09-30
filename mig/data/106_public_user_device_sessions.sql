COPY "public"."user_device_sessions" ("id", "user_id", "device_label", "device_id", "platform", "app_version", "push_token", "last_seen_at", "revoked_at", "created_at", "user_id_full_name") FROM STDIN;
\.
