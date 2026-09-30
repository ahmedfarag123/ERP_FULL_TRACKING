COPY "public"."order_cancellations" ("id", "order_id", "reason", "cancelled_by", "cancelled_at", "inventory_reversed", "journal_entry_id", "notes", "created_at") FROM STDIN;
\.
