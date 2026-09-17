#!/bin/bash
# sync_scorecards.sh - Take a periodic snapshot of Score Cards values into scorecard_values.
# Run via crontab (e.g. */30 * * * *) so history accumulates without any view hitting Odoo.
set -euo pipefail

ANO=$(sudo docker exec supabase-edge-functions printenv SUPABASE_ANON_KEY)
SEC=$(sudo docker exec supabase-edge-functions printenv ODOO_SYNC_SECRET)

curl -s -X POST "https://horecasmartos.duckdns.org/functions/v1/scorecards-odoo-query" \
  -H "apikey: $ANO" \
  -H "Authorization: Bearer $ANO" \
  -H "x-sync-secret: $SEC" \
  -H "Content-Type: application/json" \
  -d '{"codes":["finance.total_payable","finance.unreconciled_bills","finance.pending_custodies","finance.pending_loans","finance.total_receivable","finance.unreconciled_invoices","finance.cancelled_invoices","finance.invoicing_over_12h","finance.invoicing_over_24h","finance.orders_to_invoice","finance.expenses_budget","finance.journals_no_partner","collection.dso_mas_credit"]}' \
  -w "\nHTTP:%{http_code}\n"