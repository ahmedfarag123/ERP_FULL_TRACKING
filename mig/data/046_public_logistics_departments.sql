COPY "public"."logistics_departments" ("id", "external_department_id", "department_name", "complete_name", "parent_department_ref", "manager_external_employee_id", "manager_name", "company_name", "status", "source", "raw_payload", "last_sync_at", "created_at", "updated_at") FROM STDIN;
\.
