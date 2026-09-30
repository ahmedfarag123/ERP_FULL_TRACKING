COPY "kpi"."manual_upload_batches" ("id", "department_slug", "period_start", "period_end", "file_name", "row_count", "status", "uploaded_by", "uploaded_at", "created_at") FROM STDIN;
\.
