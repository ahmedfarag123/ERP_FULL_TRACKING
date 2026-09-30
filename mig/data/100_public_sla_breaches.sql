COPY "public"."sla_breaches" ("id", "sla_definition_id", "entity_type", "entity_id", "breach_type", "breached_at", "resolved_at", "notified", "created_at") FROM STDIN;
\.
