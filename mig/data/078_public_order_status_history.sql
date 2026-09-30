COPY "public"."order_status_history" ("id", "order_id", "status", "note", "actor_id", "created_at") FROM STDIN;
\.
