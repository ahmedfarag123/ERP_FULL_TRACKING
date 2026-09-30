COPY "public"."odoo_crm_activity_dispatches" ("id", "request_id", "requester_id", "mapped_odoo_user_id", "lead_external_id", "activity_type_id", "payload", "mode", "status", "attempt_count", "remote_activity_id", "error_code", "error_message", "created_at", "updated_at", "sent_at", "requester_id_full_name") FROM STDIN;
\.
