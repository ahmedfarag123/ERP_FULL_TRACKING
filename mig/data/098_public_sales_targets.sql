COPY "public"."sales_targets" ("id", "user_id", "target_month", "target_visits", "target_calls", "target_reachability", "target_gmv", "target_quotations", "working_days", "assigned_by", "created_at", "updated_at", "user_id_full_name", "assigned_by_full_name") FROM STDIN;
\.
