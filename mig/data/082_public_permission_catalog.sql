COPY "public"."permission_catalog" ("permission_key", "module_key", "module_label", "label", "description", "route_path", "risk_level", "is_navigation", "is_active", "sort_order", "created_at", "updated_at") FROM STDIN;
audit_logs.view	audit	Audit Log	View Audit Log	Inspect sensitive operational and administrative audit trails.	/audit-log	critical	true	true	270	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
calls.audit	calls	Calls	Audit Calls	Audit call outcomes, notes, and follow-up quality.	/calls	high	false	true	110	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
calls.view	calls	Calls	View Calls	Read call activity and telesales communication history.	/calls	medium	true	true	100	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
customers.assign	customers	Customers	Assign Customers	Move customer ownership between active users and teams.	/customers	high	false	true	60	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
customers.manage	customers	Customers	Manage Customers	Create and update customer records and relationship data.	/customers	high	false	true	70	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
customers.view	customers	Customers	View Customers	Read customer lists, profiles, and relationship history.	/customers	medium	true	true	50	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
dashboard.view	dashboard	Dashboard	View Dashboard KPIs	Read KPI summaries, charts, and executive scorecards.	/	low	false	true	20	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
departments.manage	departments	Departments	Manage Departments	Create or update departments and allowed role coverage.	/roles-permissions/department	high	false	true	240	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
departments.view	departments	Departments	View Departments	Read department ownership, members, and role coverage.	/roles-permissions/department	medium	true	true	230	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
dynamic_fields.manage	dynamic-fields	Dynamic Fields	Manage Dynamic Fields	Edit dynamic field configurations used in live workflows.	/user-management	high	false	true	290	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
finance.approve	finance	المالية	اعتماد المعاملات المالية	اعتماد المعاملات المالية والتسويات فوق حد معيّن (فصل الصلاحيات).	/finance	high	true	true	902	2026-07-18 18:01:49.563543+00	2026-07-18 18:01:49.563543+00
finance.close_period	finance	المالية	إغلاق الفترة المالية	قفل أو إعادة فتح الفترة المالية — إجراء لا رجعة فيه.	/finance	critical	true	true	903	2026-07-18 18:01:49.563543+00	2026-07-18 18:01:49.563543+00
finance.manage	finance	المالية	إدارة المالية	إنشاء وتعديل القيود اليومية والفواتير وإعدادات الحسابات.	/finance	high	true	true	901	2026-07-18 18:01:49.563543+00	2026-07-18 18:01:49.563543+00
finance.view	finance	المالية	عرض المالية	قراءة لوحة التحكم المالية والتقارير والقيود.	/finance	high	true	true	900	2026-07-18 18:01:49.563543+00	2026-07-18 18:01:49.563543+00
logistics.manage	logistics	Logistics	Manage Logistics	Update logistics operations, shipment handling, and field execution.	/logistics	high	false	true	150	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
logistics.view	logistics	Logistics	View Logistics	Read logistics users, warehouses, and shipment data.	/logistics	medium	true	true	140	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
map.view	map	Map Tracking	View Maps	Open map-based operational and movement views.	/logistics/map	medium	true	true	130	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
notifications.send	notifications	Notifications	Send Notifications	Send broadcast, role-based, or direct notifications.	/notifications	high	false	true	260	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
notifications.view	notifications	Notifications	View Notifications	Read notification history and audience resolution.	/notifications	medium	true	true	250	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
orders.manage	orders	Orders	Manage Orders	Update order workflows or operational handling where enabled.	/orders	high	false	true	40	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
orders.view	orders	Orders	View Orders	Read order lists, statuses, and commercial totals.	/orders	medium	true	true	30	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
overview.view	overview	Overview	View Overview	Access the primary operational landing experience.	/	low	true	true	10	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
reports.view	reporting	Reporting	View Reports	Access reporting exports, filtered reports, and analytics surfaces.	/reporting-center	high	true	true	160	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
routes.view	routes	Rep Routes	View Rep Routes	Inspect route reconstruction, suspicious movement, and team tracking.	/rep-routes	high	true	true	120	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
targets.manage	targets	Targets	Manage Targets	Assign and revise target planning for field users.	/user-management	high	false	true	280	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
tickets.manage	tickets	خدمة العملاء	إدارة تذاكر خدمة العملاء	إنشاء وتعديل وإغلاق تذاكر الدعم وتعيينها.	\N	medium	false	true	71	2026-07-18 17:55:56.93434+00	2026-07-18 17:55:56.93434+00
tickets.view	tickets	خدمة العملاء	عرض تذاكر خدمة العملاء	قراءة تذاكر الدعم والتعليقات المرتبطة بالطلبات.	\N	low	true	true	70	2026-07-18 17:55:56.93434+00	2026-07-18 17:55:56.93434+00
users.auth-controls	users	Users	Manage Auth Controls	Approve accounts, manage OTP, password flags, and force logout.	/admin/users	critical	false	true	220	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
users.customer-assignment	users	Users	Assign Customer Ownership	Move customer ownership between users.	/admin/users	high	false	true	210	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
users.invite	users	Users	Invite Users	Create users and send invites or temporary passwords.	/admin/users/new	critical	false	true	180	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
users.password-reset	users	Users	Reset Passwords	Generate recovery links and force password changes.	/admin/users	critical	false	true	200	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
users.role-change	users	Users	Change User Roles	Change role access, account status, and role-governance settings.	/admin/access-control	critical	false	true	190	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
users.view	users	Users	View Users	Read user access records, status, and profile assignments.	/admin/users	high	true	true	170	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
visits.audit	visits	Visits	Audit Visits	Audit visit execution quality and consistency.	/visits	high	false	true	90	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:31.169724+00
visits.view	visits	Visits	View Visits	Read visit history, statuses, and associated visit metadata.	/visits	medium	true	true	80	2026-07-18 17:54:28.463616+00	2026-07-18 17:54:28.463616+00
\.
