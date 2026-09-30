COPY "public"."finance_driver_settlements" ("id", "driver_id", "period_start", "period_end", "commission_amount", "fuel_allowance", "bonuses", "penalties", "cash_collected", "cash_remitted", "status", "journal_entry_id", "approved_by", "approved_at", "notes", "created_by", "created_at", "updated_at") FROM STDIN;
\.
