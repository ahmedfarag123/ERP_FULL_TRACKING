#!/bin/bash
# sync_scorecards.sh - Take a periodic snapshot of Score Cards values into scorecard_values.
# Run via crontab (e.g. */30 * * * *) so history accumulates without any view hitting Odoo.
set -euo pipefail

ANO=$(sudo docker exec supabase-edge-functions printenv SUPABASE_ANON_KEY)
SEC=$(sudo docker exec supabase-edge-functions printenv ODOO_SYNC_SECRET)

# Batch 1a: finance + collection. The single 45-code request measured
curl -s -X POST "https://horecasmartos.duckdns.org/functions/v1/scorecards-odoo-query" \
  -H "apikey: $ANO" \
  -H "Authorization: Bearer $ANO" \
  -H "x-sync-secret: $SEC" \
  -H "Content-Type: application/json" \
  -d '{"codes":["finance.total_payable","finance.unreconciled_bills","finance.pending_custodies","finance.pending_loans","finance.total_receivable","finance.unreconciled_invoices","finance.cancelled_invoices","finance.invoicing_over_12h","finance.invoicing_over_24h","finance.orders_to_invoice","finance.expenses_budget","finance.journals_no_partner","collection.dso_mas_credit","collection.unpaid_cash_mas","collection.unpaid_cash_horeca","collection.sales_approved_credit_policy","collection.dso_mas_cash","collection.dso_horeca_credit","collection.dso_horeca_cash","collection.dso_other","collection.total_collected","collection.total_visits","collection.due_over_60"]}' \
  -w "\nHTTP:%{http_code}\n"

# 55.6s against a 60s nginx proxy_read_timeout and intermittently returned 504,
# so the payload is split in two to stay far below the limit.
# Batch 1b: sales + purchase (second half of the original 45-code request).
curl -s -X POST "https://horecasmartos.duckdns.org/functions/v1/scorecards-odoo-query" \
  -H "apikey: $ANO" \
  -H "Authorization: Bearer $ANO" \
  -H "x-sync-secret: $SEC" \
  -H "Content-Type: application/json" \
  -d '{"codes":["sales.gmv_mas","sales.mas_customers","sales.mas_average_order","sales.products_sold_mas","sales.gmv_horeca","sales.horeca_customers","sales.horeca_average_order","sales.products_sold_horeca","sales.crm_activities","sales.new_customers","sales.retention_rate","sales.sales_by_app","sales.active_customers","purchase.new_products","purchase.products_purchased","purchase.purchase_orders","purchase.accuracy_of_purchase","purchase.receipts_date_24h","purchase.gross_margin_mas","purchase.gross_margin_horeca","purchase.margin_lte_1","purchase.variance_of_prices"]}' \
  -w "\nHTTP:%{http_code}\n"


# Approved Logistics KPIs are posted in a separate, short request. The nginx
# location /functions/ allows only proxy_read_timeout 60s, and a single request
# carrying every code exceeds that limit (it was truncating the snapshot before
# reaching these codes). This batch contains the 8 approved Logistics codes and stays far below 60s (measured ~5.5s).
curl -s -X POST "https://horecasmartos.duckdns.org/functions/v1/scorecards-odoo-query" \
  -H "apikey: $ANO" \
  -H "Authorization: Bearer $ANO" \
  -H "x-sync-secret: $SEC" \
  -H "Content-Type: application/json" \
  -d '{"codes":["logistics.internal_transfers","logistics.company_transfers","logistics.returns_count","logistics.returns_value","logistics.orders_to_validate","logistics.validate_over_11am","logistics.inventory_days","logistics.near_expire_products"]}' \
  -w "\nHTTP:%{http_code}\n"
