COPY "public"."finance_accounts" ("id", "code", "name", "name_ar", "type", "parent_id", "is_active", "allow_posting", "sort_order", "created_at", "created_by") FROM STDIN;
03402020-80cd-4c62-ba2c-8d68b7204ecf	5140	Inventory Adjustment	تسوية المخزون	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	740	2026-07-18 18:01:45.130378+00	\N
04f31bab-3315-42bd-a802-8943fbe0e93a	4040	Discount Income	إيرادات الخصومات	revenue	af05a79b-242c-48ae-bd94-83109ee987d8	true	true	540	2026-07-18 18:01:45.130378+00	\N
11627180-db27-43af-a074-c5aae73a8311	5080	Marketing Expense	مصروف التسويق	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	680	2026-07-18 18:01:45.130378+00	\N
12854283-5627-44d6-a4bb-0fd59116c0db	1012	Bank	البنك	asset	d71d5571-a4aa-4a39-9154-f97f99c5136e	true	true	112	2026-07-18 18:01:45.130378+00	\N
219144cb-b71a-4823-ab66-fdea4b780ec3	5090	Rent Expense	مصروف الإيجار	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	690	2026-07-18 18:01:45.130378+00	\N
2a2526ae-ad63-4000-b2d8-09f1c08e0f59	5120	Miscellaneous Expense	مصروفات متنوعة	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	720	2026-07-18 18:01:45.130378+00	\N
3dbc7e53-358c-42c6-aba6-207a78128ad6	1011	Cash	النقد	asset	d71d5571-a4aa-4a39-9154-f97f99c5136e	true	true	111	2026-07-18 18:01:45.130378+00	\N
45a30804-67fb-4cc6-8dd5-a381ddd03d4f	1030	Prepaid Expenses	مصروفات مقدمة	asset	d71d5571-a4aa-4a39-9154-f97f99c5136e	true	true	130	2026-07-18 18:01:45.130378+00	\N
4785b527-4730-4495-93f1-e624528285d2	5020	Fuel Expense	مصروف الوقود	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	620	2026-07-18 18:01:45.130378+00	\N
4c4c1d82-eb11-4d05-8516-05d548fbf608	2040	Accrued Expenses	مصروفات مستحقة	liability	7f261232-5ef5-4704-b838-f18db5c1656e	true	true	340	2026-07-18 18:01:45.130378+00	\N
5346506a-0db2-4469-bff1-4d44fafbf8e0	2010	Accounts Payable	الدائنون	liability	7f261232-5ef5-4704-b838-f18db5c1656e	true	true	310	2026-07-18 18:01:45.130378+00	\N
5ca5d246-0f77-48b9-b5cc-159831ed0b8d	1102	Equipment	المعدات	asset	b6e9e8ef-f639-4479-a616-315e57e22b33	true	true	202	2026-07-18 18:01:45.130378+00	\N
5ff418ce-2532-4f84-aac8-71706dc3ccbb	1103	Accumulated Depreciation	إهلاك متراكم	asset	b6e9e8ef-f639-4479-a616-315e57e22b33	true	true	203	2026-07-18 18:01:45.130378+00	\N
69b32687-075e-4c86-9468-73f1b9b027d4	1020	Inventory	المخزون	asset	d71d5571-a4aa-4a39-9154-f97f99c5136e	true	true	120	2026-07-18 18:01:45.130378+00	\N
6c8d3578-1199-4ce6-a77e-6f334877ba73	5040	Delivery Expense	مصروف التوصيل	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	640	2026-07-18 18:01:45.130378+00	\N
7f261232-5ef5-4704-b838-f18db5c1656e	2000	Liabilities	الخصوم	liability	\N	true	false	300	2026-07-18 18:01:45.130378+00	\N
843f19ef-55e3-44bd-8b98-17817a2388d8	3000	Equity	رأس المال	equity	\N	true	false	400	2026-07-18 18:01:45.130378+00	\N
858343bd-524d-424e-b01b-499298525ac0	5130	Refrigeration Cost	مصروف التبريد	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	730	2026-07-18 18:01:45.130378+00	\N
870915b2-8e87-4997-bb96-2fb68b8b5538	5110	Depreciation Expense	مصروف الإهلاك	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	710	2026-07-18 18:01:45.130378+00	\N
98b2c878-2052-4a06-b98e-36f6e3254b2a	2020	Tax Payable	ضريبة مستحقة الدفع	liability	7f261232-5ef5-4704-b838-f18db5c1656e	true	true	320	2026-07-18 18:01:45.130378+00	\N
9c5060ba-6abf-449d-9858-8eab00a8d5c4	3020	Retained Earnings	أرباح محتجزة	equity	843f19ef-55e3-44bd-8b98-17817a2388d8	true	true	420	2026-07-18 18:01:45.130378+00	\N
9ca15a22-c301-4323-9750-13c4d2c3160c	3010	Capital	رأس المال	equity	843f19ef-55e3-44bd-8b98-17817a2388d8	true	true	410	2026-07-18 18:01:45.130378+00	\N
9da49cb7-5f70-4f82-9dd0-a2d6f8eb8739	5010	Cost of Goods Sold	تكلفة البضاعة المباعة	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	610	2026-07-18 18:01:45.130378+00	\N
a1f31d98-c468-488b-b7cc-d71267d3ac9d	4010	Sales Revenue	إيرادات المبيعات	revenue	af05a79b-242c-48ae-bd94-83109ee987d8	true	true	510	2026-07-18 18:01:45.130378+00	\N
a59a1a54-a522-4d84-bafa-613914cac21e	2030	VAT Payable	ضريبة القيمة المضافة	liability	7f261232-5ef5-4704-b838-f18db5c1656e	true	true	330	2026-07-18 18:01:45.130378+00	\N
af05a79b-242c-48ae-bd94-83109ee987d8	4000	Revenue	الإيرادات	revenue	\N	true	false	500	2026-07-18 18:01:45.130378+00	\N
b512ab58-5020-4b07-a689-edd3e65ae1b5	1000	Assets	الأصول	asset	\N	true	false	100	2026-07-18 18:01:45.130378+00	\N
b6e9e8ef-f639-4479-a616-315e57e22b33	1100	Fixed Assets	الأصول الثابتة	asset	b512ab58-5020-4b07-a689-edd3e65ae1b5	true	false	200	2026-07-18 18:01:45.130378+00	\N
b9e566e8-5433-4448-8483-d34961939b9d	5050	Maintenance Expense	مصروف الصيانة	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	650	2026-07-18 18:01:45.130378+00	\N
be991db1-0c5b-4bda-b13a-0e3103405093	5070	Salary Expense	مصروف الرواتب	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	670	2026-07-18 18:01:45.130378+00	\N
c24dd983-1c1a-4028-9009-482950583992	3030	Current Year Earnings	أرباح السنة الحالية	equity	843f19ef-55e3-44bd-8b98-17817a2388d8	true	true	430	2026-07-18 18:01:45.130378+00	\N
c3951ebc-279c-480e-a075-0285d62ecbb6	4030	Sales Returns	مرتجعات المبيعات	revenue	af05a79b-242c-48ae-bd94-83109ee987d8	true	true	530	2026-07-18 18:01:45.130378+00	\N
d1d25eec-78fe-4320-9eb4-4babd59df30f	4020	Service Revenue	إيرادات الخدمات	revenue	af05a79b-242c-48ae-bd94-83109ee987d8	true	true	520	2026-07-18 18:01:45.130378+00	\N
d3b0ad19-456d-4d74-9171-de35c306a89d	1101	Vehicles	المركبات	asset	b6e9e8ef-f639-4479-a616-315e57e22b33	true	true	201	2026-07-18 18:01:45.130378+00	\N
d71d5571-a4aa-4a39-9154-f97f99c5136e	1010	Current Assets	الأصول المتداولة	asset	b512ab58-5020-4b07-a689-edd3e65ae1b5	true	false	110	2026-07-18 18:01:45.130378+00	\N
dd8e1ecb-cb67-47b9-8281-17a799e55d33	5060	Insurance Expense	مصروف التأمين	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	660	2026-07-18 18:01:45.130378+00	\N
e908e9de-4dee-4766-8ee3-3f369b49975d	5100	Utilities Expense	مصروف المرافق	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	700	2026-07-18 18:01:45.130378+00	\N
eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	5000	Expenses	المصروفات	expense	\N	true	false	600	2026-07-18 18:01:45.130378+00	\N
ebf6eb00-47dd-4c4a-a80a-103adee8ed16	5200	Tax Expense	مصروفات الضريبة	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	800	2026-07-18 18:01:45.130378+00	\N
f38988a3-b8d5-495f-a266-45990718108a	5030	Driver Commission Expense	مصروف عمولة السائق	expense	eb9be46f-88d0-4e7a-8daa-cf7d2a8157da	true	true	630	2026-07-18 18:01:45.130378+00	\N
fab2767d-b896-465a-af37-81897bde1793	1013	Accounts Receivable	المدينون	asset	d71d5571-a4aa-4a39-9154-f97f99c5136e	true	true	113	2026-07-18 18:01:45.130378+00	\N
\.
