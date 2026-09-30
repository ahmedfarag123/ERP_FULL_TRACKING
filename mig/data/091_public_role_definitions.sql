COPY "public"."role_definitions" ("role", "label", "description", "default_home_path", "is_management", "is_assignable", "sort_order", "created_at", "updated_at") FROM STDIN;
admin	Admin	Full administrative control over users, configuration, and audit surfaces.	/	true	true	10	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
dispatcher	Dispatcher	Dispatch access for logistics planning, route assignment, and order fulfillment.	/logistics/plans	true	true	35	2026-07-18 17:54:44.233149+00	2026-07-18 17:54:44.233149+00
driver	Driver	Driver app access for assigned delivery work.	/driver/	false	true	60	2026-07-18 17:54:44.233149+00	2026-07-18 17:54:44.233149+00
manager	Manager	Management visibility across field execution, reporting, and team coordination.	/	true	true	20	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
sales_agent	Sales Agent	Field-selling role focused on customers, visits, calls, and assigned commercial work.	/	false	true	40	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
spv	SPV	Supervisor access over dispatch, logistics operations, orders, customers, visits, and calls.	/logistics	true	true	25	2026-07-18 17:54:44.233149+00	2026-07-18 17:54:44.233149+00
supervisor	Supervisor	Operational supervision across customers, routes, visits, and monitoring surfaces.	/	true	true	30	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
telesales	Telesales	Remote sales role for pipeline follow-up, call handling, and customer communication.	/	false	true	50	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
\.
