COPY "public"."logistics_vehicle_profiles" ("id", "vehicle_type", "avg_speed_kmh", "max_speed_kmh", "description", "created_at") FROM STDIN;
43eb15d1-37c6-4771-b45a-37bd5629fe37	van	40	80	Standard delivery van	2026-07-18 17:59:54.146043+00
7c37ef0c-39c8-4fec-afaf-7d397ae782d2	car	45	120	Passenger car	2026-07-18 17:59:54.146043+00
82691162-0841-44f5-bc07-f5b08f85f058	heavy	30	60	Heavy truck	2026-07-18 17:59:54.146043+00
\.
