COPY "kpi"."odoo_values" ("id", "kpi_code", "actual_value", "note", "computed_at", "period_start", "period_end") FROM STDIN;
016b80e7-c1b5-4447-95c9-fc0b783d503a	FIN-03	98.3740	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
025268ba-6dc4-4b46-a78f-2bc18bb98daf	WAR-06	2.5106	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
0318cfc4-af95-47e7-b250-8d298566b36e	PRO-02	0.1308	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
0470c8b3-d066-4e6c-bc32-d9fe43eeb31d	PRO-06	87.2881	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
06cc01fb-ffad-45f9-8a52-1e937521e098	FIN-02	1.2047	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
07559d34-e5be-4ff2-8af7-a8b10cc14b70	PRO-05	93.4783	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
0789d729-b2a5-40ad-83eb-7d53ebf46a0d	SAL-08	28441730.3400	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
086801bc-b5f4-42bf-9adf-8d39086b7046	DEL-01	59.0000	Calculated from Odoo completed pickings delivered on or before deadline.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
0ad5a9f0-9d48-4288-a6b9-5f633f6d8826	FIN-02	2.1287	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
0ea82241-4a13-4a82-b10b-faf03d5d72f1	PRO-09	10.2397	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
0f0d78c2-aa4f-4509-9c2c-069086f185a3	PRO-06	88.8889	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
170705fd-e939-4e61-b7d6-9017bafd7e75	DEL-03	22.9366	Average hours from Odoo picking creation to completion.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
17cc8592-fc00-461b-ac3c-53aeb4c7a62b	DEL-03	17.1891	Average hours from Odoo picking creation to completion.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
19d350a6-ae9a-441a-b8f2-c8862c458a43	PRO-03	0.0874	Calculated from Odoo purchase order creation to approval.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
1ee4179a-dbb7-4d68-b425-cea493def584	PRO-04	1.6393	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
21dbfdad-4f8d-4e9b-9a8c-a09da2e95092	PRO-02	0.2905	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
23c1d437-bc2c-48aa-846e-7e3bcc547830	PRO-09	10.5455	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
262122d9-dcb9-4e0d-b9d0-a727b996d16a	WAR-06	2.3145	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
29b3cf15-aaf3-4d2d-b937-a9b27ac1db74	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
2a067bc1-c049-460f-a1c2-0eea94b5cc6b	WAR-06	2.4847	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
2c17609c-90f3-4091-b3bf-32f9eeeac9bf	PRO-06	92.4324	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
2cebe6c2-b135-4212-8078-41fe93480f1d	PRO-06	90.8815	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
32f1c8dd-1b5c-48a8-969d-914340369db1	DEL-01	59.8000	Calculated from Odoo completed pickings delivered on or before deadline.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
35e7f912-9809-444a-a8e8-b661032fae05	WAR-05	75.4000	Calculated from Odoo available stock by product.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
3bc0c5b3-222f-44ce-8e17-db2835cb0670	DEL-01	54.3554	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
3e4ba536-c243-4929-83f7-3bb6253278db	WAR-06	2.9184	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
3ff71a0b-1c23-442d-ae48-5273b9b66be3	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
401c4651-b268-4dd0-a524-1c0cee1e2b08	PRO-09	11.8644	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
40c12e70-e659-4213-832e-660f5abb26bb	DEL-01	52.8000	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
436744de-5e99-4bf6-8ee2-1c940dfd8b0c	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
43c12eba-0dda-4844-a125-41149202f9f0	PRO-03	0.0025	Calculated from Odoo purchase order creation to approval.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
46335862-1d4e-4bd5-a2b7-5ad0db96ed93	SAL-08	25551658.2300	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
4682e399-e55f-4229-9aee-68215c4a26d9	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
4ae07081-017c-407a-83f4-7753961da2e8	FIN-02	4.5781	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
4b116e29-12cf-4c1e-b975-ce734f175f72	WAR-06	2.4847	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
4cbd19eb-c3f3-4512-8aa4-70218fcfd938	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
4d8d1b5b-7c03-49a5-8547-0dd3bb2bf67c	SAL-08	25595631.8200	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
4e3a909c-cb62-414d-8318-c82cf4446306	PRO-06	89.4292	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
4e7a3762-adac-40bd-bfa7-13e9b86c6775	PRO-02	0.1130	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
5042087f-56ba-4a64-84c9-fe18aa3f9a6a	FIN-02	6.3461	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
51e13099-a4b2-49e1-b838-b4815e27f1f8	WAR-05	79.2000	Calculated from Odoo available stock by product.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
52399549-574e-435d-89ec-2b40eaa24b77	PRO-05	98.5663	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
52ec05c9-5bfc-4299-8022-3a99cf7ec530	PRO-04	1.6129	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
52f9c55b-e1b7-4620-97fe-d9bf4e5c54d9	FIN-03	98.8571	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
53a59813-e7f8-46a1-b509-7b41641821b8	PRO-03	0.3248	Calculated from Odoo purchase order creation to approval.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
54905c14-1d76-4be6-aaf7-b9779b564c08	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
5784fb54-c6c2-47a7-af97-0b2ca3daf753	FIN-03	97.9545	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
586addeb-044c-4752-a3da-2d21dde3bcad	DEL-03	14.9507	Average hours from Odoo picking creation to completion.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
58d1ee71-82b3-47de-acc9-647365380286	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
59337cda-fa55-424c-abc4-9e1a4201d60a	WAR-06	2.2146	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
596e3db3-3360-4277-972d-c6e0aa79ffb5	PRO-04	3.2000	Calculated from Odoo incoming receipts completed on or before planned date.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
596fadb7-895c-4511-92df-bc5f73357faa	PRO-02	0.1055	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
59f54933-58af-4094-8522-7ab3e076c97c	PRO-06	78.3333	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
5b693e34-3c14-4333-bc6a-60e0187c1323	FIN-03	97.9545	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
5db82023-1489-49a7-9b1f-e6db2c6eac5c	DEL-01	51.8000	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
5e761193-85cd-42d7-a22a-4bf95d80d3db	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
5fa40163-2645-4970-8880-008a31e9f346	SAL-08	28615771.5900	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
61088da4-2d49-4f03-a3da-21a53e1e4729	PRO-04	2.4691	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
61d34aec-5ac4-44f1-abfb-58a4c5110db9	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
6206d2fc-e692-4173-ae98-2dfd86834591	FIN-02	6.1697	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
642d9145-b729-47e3-8be1-beeb0114a4af	WAR-06	2.8744	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
6646d3fb-acdb-45dc-a2dd-242409e4bc24	FIN-02	1.6980	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
6685a5fa-f2a6-4111-aea2-9c6be95af0a1	PRO-04	3.0000	Calculated from Odoo incoming receipts completed on or before planned date.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
67fcdd1d-d610-49f6-9b7a-f28bd183c601	DEL-03	14.9507	Average hours from Odoo picking creation to completion.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
68c3c0dc-a47b-4e03-a5f8-8440d9ae7a13	PRO-04	0.0000	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
6a00fdbc-6506-4af5-9f65-6572ee869952	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
6b659d4e-3bf2-4e3a-9f3f-d6898b3b5641	SAL-08	12308746.8600	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
6d5ec85f-541b-4ecd-b9ca-385aadc300d0	PRO-06	89.8340	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
6d8a4ca7-b19f-4846-83c1-1b47f13fb360	SAL-08	27359124.0200	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
6ecf2d94-c8eb-448c-9834-a6b081b47fda	FIN-03	98.4326	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
72c3d9fd-a1c8-4321-b51d-bbcd6519770b	DEL-03	14.2591	Average hours from Odoo picking creation to completion.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
75086185-dbd1-4c30-b195-f52a8433a43d	PRO-02	0.1563	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
7535e276-cb70-4fc3-b463-a6c4b966b687	PRO-04	1.9608	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
755077f9-ea52-4563-8fc1-4b032af87e86	PRO-04	1.6129	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
76baddeb-8374-4002-afab-dbb5e8484352	PRO-04	0.0000	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
77d154a2-2e35-4e72-a793-2d058101ece9	PRO-05	100.0000	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
799c18be-eaef-492c-b985-e84ea378bfe7	WAR-06	2.2146	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
79ae901c-4c75-4e14-9cdb-d639154a3073	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
7b071292-515a-4efd-ad63-e920362aa266	FIN-03	98.2906	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
7b389d01-7b00-479d-a838-2c5babbba6bd	PRO-06	89.0547	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
7ca272b3-8045-4909-a876-96c4d48ca91f	FIN-02	5.5339	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
7ccd8663-9632-4ba8-b938-6c3e60aa4f56	DEL-03	13.3037	Average hours from Odoo picking creation to completion.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
7df1d54b-10a6-4d1e-a0d1-da31d6949b9e	PRO-02	0.0981	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
7ec3add4-cc22-4e05-bdc6-3908b2c4708b	WAR-05	80.8000	Calculated from Odoo available stock by product.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
7ffeeac7-0007-471e-8ac6-75e557ca03e3	FIN-02	3.2222	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
8096cd5b-8724-4455-994b-c7c210c247fe	TEST-99	42.0000	Direct SQL test	2026-07-29 01:27:03.419781+00	2026-07-01	2026-07-29
82aeee22-16c0-4ca2-bf47-9a154ac6478c	DEL-01	45.4545	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
84346fd7-09ce-48da-910e-b1486463cec2	PRO-05	94.5455	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
85009aed-ee0d-402c-b554-98e2fae70bc1	PRO-02	0.1454	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
85cae14f-d755-4523-996e-ddb72e316dab	PRO-03	0.2721	Calculated from Odoo purchase order creation to approval.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
87e72c0a-bdf0-4735-a37e-d917b2b1e642	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
8820a23f-c9f1-4f6c-8f28-cfcc9cea4284	SAL-08	3866270.1800	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
88e60c3c-9a5c-45aa-808a-ccf6aae7c1cc	PRO-03	0.0878	Calculated from Odoo purchase order creation to approval.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
8929e635-5f6a-44e4-82ff-d362f84e7681	DEL-01	55.9367	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
8e8537bf-32da-4fc2-b6a7-b037ac53cc11	WAR-05	77.8000	Calculated from Odoo available stock by product.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
8f141f86-ef50-4d32-bd6e-68ee34b7efbd	DEL-06	0.2000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
8fd0e376-bafa-42f2-af6f-cbb747aef34e	WAR-05	81.4000	Calculated from Odoo available stock by product.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
907b8097-4ee7-4538-94fa-c584e2994d85	DEL-03	14.2336	Average hours from Odoo picking creation to completion.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
9384cabb-3da9-4e1e-8e19-9440a91df4fb	FIN-02	2.6222	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
93ddc726-118a-41a2-8ba1-e98ae4361d28	DEL-01	59.4000	Calculated from Odoo completed pickings delivered on or before deadline.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
95eee8c5-ef05-4db7-bfd0-eea54184b5c7	PRO-03	0.0443	Calculated from Odoo purchase order creation to approval.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
98855dd0-6eb7-45f5-90f5-c7173484596a	WAR-05	78.8000	Calculated from Odoo available stock by product.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
9f0927d9-4dab-41e2-a2e7-c5222c759596	PRO-09	16.2393	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
9f3b9c72-da97-4e83-8499-203dc2745378	WAR-06	3.5091	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
9f40c020-2e08-413f-a898-a69c8bbfd086	FIN-02	0.7501	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
a0a1287e-dbb9-4ba1-af68-a2e79968a87f	PRO-03	0.0878	Calculated from Odoo purchase order creation to approval.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
a0b974f5-19e1-4b37-a3d2-3c71f8438b36	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
a1c95ad8-b4fd-4c39-a85e-e9097b51bf09	DEL-06	0.2000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
a1ca9552-e400-4239-8538-cbf78b3b5faa	PRO-05	96.0526	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
a1e1460c-71a9-41d4-9c57-6ec37348776d	PRO-05	99.2337	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
a25fb02c-e339-4e06-a42c-0d96995c4490	PRO-05	100.0000	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
a6a589c1-3ad6-4112-a8cc-3a69d1b8acd1	PRO-09	7.9027	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
a734428e-ed5a-4735-9b63-7758d7b66f99	PRO-04	2.0202	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
a994acd6-5356-492b-a992-6a203bcdd9de	WAR-05	81.6000	Calculated from Odoo available stock by product.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
aaf33f53-9885-4660-8c9e-8b3d6acfaed3	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
ae35d501-5977-4baa-84bf-c4e4ade28a49	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
af9a9b41-2575-4e85-bad5-100716e36bff	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
afa5d1b4-18bb-42d7-8ac0-06de4c29569f	DEL-03	17.2813	Average hours from Odoo picking creation to completion.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
b2993737-3b8c-4728-9b7b-0c30c9c94ea2	SAL-08	22030513.2300	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
b4616f0b-7a1c-4eb5-a831-065814a5caeb	SAL-08	15515495.5000	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
b54b474d-49fe-490d-b6bb-d4bd26a48964	PRO-09	6.4865	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
b598de86-7dd0-427e-ba81-7679f3fefeb8	PRO-05	96.0526	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
b5b22759-6ad4-480d-a7ee-2c56536817a7	WAR-05	79.2000	Calculated from Odoo available stock by product.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
b6967130-ecce-457c-aa3a-7f92644ba6be	FIN-03	98.7854	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
b875249f-27d0-46b0-b063-16334097b99b	DEL-01	53.8922	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
b9ad9669-c7f7-4e7f-8236-ad06f049bcb9	PRO-02	0.2941	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
b9dec2fe-dfe1-45ab-b19c-be205c7cf024	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
bc79109e-a6ed-4e18-a199-0114496c4e90	WAR-05	80.4000	Calculated from Odoo available stock by product.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
be74e016-e882-411e-aa3e-5c5c88051dc4	FIN-03	98.4127	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
bf57047f-e91d-4e9e-b07f-7d3d77b87fe4	WAR-06	3.1591	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
bfa1d73d-51ff-4033-9f56-47ac16e1f4e9	FIN-03	96.3636	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
c10d94ec-a8c6-4ecd-8620-eb312ca9219b	FIN-02	4.2222	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
c19dff3d-66d4-4c87-a6c5-3929910cb11b	DEL-01	55.3879	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
c3ab6863-8bfd-4e4d-ab3c-fd5c961c25dd	PRO-04	1.9608	Calculated from Odoo incoming receipts completed on or before planned date.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
c4f6f154-cceb-484c-acbc-ec4f948c904a	PRO-02	0.1108	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
c96571da-91dd-424d-a7ff-9701b6347026	PRO-03	0.0322	Calculated from Odoo purchase order creation to approval.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
c996444f-1ddf-4e36-80f9-69a08ad10381	DEL-01	53.2000	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
cb128028-cd00-446d-b244-bc1bbbf4afaf	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
ccaa2272-8a6d-44a9-aed1-c75568c5d129	PRO-03	0.0017	Calculated from Odoo purchase order creation to approval.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
cd2e14a7-0264-4fbc-a6ff-e4548127c32b	DEL-03	13.3964	Average hours from Odoo picking creation to completion.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
cd3a80c5-6f92-4d53-b0e4-e2d2d50430a6	PRO-09	9.9502	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
cdffcfbb-4d09-4f48-9935-73ea04d4bbff	WAR-06	2.4456	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
ce866c20-3318-4a35-8fb2-fe4fb60c9e2e	FIN-03	98.7854	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
d135586b-7233-48c3-9dbf-15a6a415041d	DEL-03	17.6297	Average hours from Odoo picking creation to completion.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
d3b60ee9-5235-4d3e-88ac-7c223224d848	PRO-09	10.2397	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
d4559624-aba4-40bb-9e38-bab9c6d0d99f	PRO-05	94.5455	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
d638b02b-7ef2-4410-b150-003d35281c49	WAR-05	74.6000	Calculated from Odoo available stock by product.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
d806151e-6cfd-4186-a735-c83d238d32b5	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
da0168e6-a48c-4be3-acb9-2d7bb9af4176	PRO-04	3.0000	Calculated from Odoo incoming receipts completed on or before planned date.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
da780db6-aee9-4167-940e-7e3f387d2aa2	PRO-05	94.7368	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
daac8105-a51f-4b6b-bcf4-e49f11b08557	FIN-03	98.8462	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
dd9052d2-3688-4477-aa10-4a36ad6591ca	PRO-09	20.0000	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
dfd09c9b-1274-4f4f-9d7d-24af1b14e97e	WAR-06	3.5965	Calculated from Odoo incoming receipt creation/scheduled time to completion.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
e2c1faf4-ce5e-4833-a028-9df97496475f	PRO-02	0.2658	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
e325ac8b-1fb6-43c4-babf-d8f512ddabe9	SAL-08	24387842.5300	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
e339c191-3532-4a25-a362-34e69bebe239	DEL-06	0.2000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
e422e0c8-3dcf-4048-8bfa-a11882054238	DEL-06	0.0000	Calculated from Odoo completed pickings flagged as returns. Explicit return picking type code may differ by installation.	2026-08-08 18:00:24.449351+00	2026-08-01	2026-08-08
e55f743b-b7c2-40e1-8cc1-4c8a33c0fa26	PRO-05	98.5560	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
e7520239-ed5d-42bc-af49-58894912db52	SAL-08	19544874.6400	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
e7575e70-f16e-478f-a165-4093a34a2faa	PRO-09	9.3361	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
e8d8fcc2-f294-4314-90cf-f77e5cbffb42	WAR-05	80.6000	Calculated from Odoo available stock by product.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
e9772c84-c5a3-461e-b433-a669f843d605	FIN-02	4.8280	Calculated from Odoo posted customer invoices with outstanding residual amounts.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
e9a5a1a7-feb1-4551-aea0-3b6e379bb6e5	DEL-01	51.8000	Calculated from Odoo completed pickings delivered on or before deadline.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
e9f0166b-55cc-4906-b55d-53dda4d1c386	PRO-06	82.0513	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-02 18:00:19.96731+00	2026-08-01	2026-08-02
eda5e67a-140e-4843-af13-8d7fa54e2d67	PRO-05	100.0000	Calculated from Odoo POs using short requested lead time as emergency proxy. Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
ee3f6302-523b-4e8c-912e-6eb739a64fd3	DEL-03	17.1043	Average hours from Odoo picking creation to completion.	2026-08-04 18:00:19.790809+00	2026-08-01	2026-08-04
ee5e85a1-9b15-4040-8d46-17aac22308f7	PRO-03	0.0025	Calculated from Odoo purchase order creation to approval.	2026-08-01 18:00:14.607119+00	2026-08-01	2026-08-01
eed3d50a-61cc-4375-b457-ccb5ea1960b9	WAR-02	0.0000	Calculated from Odoo completed stock moves where done qty matches ordered qty. Needs comparison of ordered vs done quantities at picking level.	2026-08-03 18:00:20.226682+00	2026-08-01	2026-08-03
ef2edcb4-e758-4b8a-8aaa-8d62a86251f2	PRO-06	88.0000	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
f4792f56-5f45-4025-a28b-6680ec89f872	PRO-06	89.5966	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
f5c485c2-5817-4db3-9993-005948ae0e80	DEL-03	13.5668	Average hours from Odoo picking creation to completion.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
f763996a-317b-4890-b939-e02df7f5f3ff	PRO-02	0.1108	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-06 18:00:18.805786+00	2026-08-01	2026-08-06
f8325228-641a-4c7f-9c6c-ffc2978f6481	PRO-06	88.8889	Calculated from Odoo PO lines where received quantity matches ordered quantity.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
f852cb21-e77f-4a1d-8cdc-bb3be28e2be3	PRO-03	0.3259	Calculated from Odoo purchase order creation to approval.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
f99dc5ab-d9a3-4c4d-86d2-2b8fec295968	FIN-03	98.4127	Calculated from Odoo customer invoices and refunds as correction proxy. Explicit invoice correction reason if refunds are not enough to define inaccuracy.	2026-08-07 18:00:17.432418+00	2026-08-01	2026-08-07
f9b1f4b1-420b-4dff-91f1-36308f140263	PRO-09	9.7252	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-07-31 18:00:17.962592+00	2026-07-01	2026-07-31
fa342dc0-c30c-42da-8699-adaa19f0eba4	SAL-08	24800659.2900	Sum of confirmed Odoo sale order amounts. Divide by target on the client side.	2026-07-29 18:00:14.450425+00	2026-07-01	2026-07-29
fc4271bd-48e3-414e-a547-e8de9f76441f	PRO-03	0.0295	Calculated from Odoo purchase order creation to approval.	2026-08-05 18:00:18.340638+00	2026-08-01	2026-08-05
fc9e1053-0552-4375-8541-aafa87ac2d82	PRO-02	0.0981	Calculated from Odoo purchase orders and incoming receipt completion dates.	2026-08-09 00:00:17.288222+00	2026-08-01	2026-08-09
fddab950-f9f7-48d8-9a11-2deb1c3219f2	WAR-05	83.2000	Calculated from Odoo available stock by product.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
ffe228e5-86d8-4413-a6ce-6f2207a096e4	PRO-09	9.5541	Calculated from Odoo PO lines using short received quantity as rejection proxy. Explicit quality rejection reason is not exposed; current value uses short received closed lines.	2026-07-30 18:00:15.936683+00	2026-07-01	2026-07-30
\.
