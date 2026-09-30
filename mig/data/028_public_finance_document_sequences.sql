COPY "public"."finance_document_sequences" ("document_type", "prefix", "current_number", "year_reset") FROM STDIN;
credit_note	CN	0	true
driver_settlement	DS	0	true
invoice	INV	0	true
journal_entry	JE	30	true
payment	PAY	0	true
receipt	REC	0	true
\.
