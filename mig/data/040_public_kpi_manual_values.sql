COPY "public"."kpi_manual_values" ("id", "batch_id", "department_slug", "kpi_code", "period_start", "period_end", "actual_value", "target_value", "notes", "source_label", "uploaded_by", "uploaded_at", "created_at") FROM STDIN;
\.
