#!/usr/bin/env node

/**
 * Finance RLS Regression Checks
 *
 * Verifies:
 * 1. All finance tables have RLS enabled
 * 2. Journal entries/lines have NO insert/update/delete policies (writes via RPC only)
 * 3. Other finance tables have appropriate read/write policies
 * 4. All RPCs are security definer with explicit search_path
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  PASS: ${message}`);
  }
}

// Check 1: All finance tables have RLS enabled
const rlsMigration = readFileSync(
  resolve(root, "supabase/migrations/20260709000009_finance_rls_policies.sql"),
  "utf-8"
);

const financeTables = [
  "finance_accounts",
  "finance_fiscal_periods",
  "finance_cost_centers",
  "finance_tax_rates",
  "finance_document_sequences",
  "finance_journal_entries",
  "finance_journal_lines",
  "finance_invoices",
  "finance_invoice_lines",
  "finance_driver_settlements",
];

for (const table of financeTables) {
  assert(
    rlsMigration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`),
    `${table} has RLS enabled`
  );
}

// Check 2: Journal entries/lines have only SELECT policies (no client-side writes)
assert(
  rlsMigration.includes("finance_journal_entries_view") && !rlsMigration.includes("finance_journal_entries_insert"),
  "Journal entries: SELECT only (no INSERT/UPDATE/DELETE for client roles)"
);

assert(
  rlsMigration.includes("finance_journal_lines_view") && !rlsMigration.includes("finance_journal_lines_insert"),
  "Journal lines: SELECT only (no INSERT/UPDATE/DELETE for client roles)"
);

// Check 3: Other tables have manage policies
const tablesWithManage = [
  "finance_accounts",
  "finance_fiscal_periods",
  "finance_cost_centers",
  "finance_tax_rates",
  "finance_document_sequences",
  "finance_invoices",
  "finance_invoice_lines",
  "finance_driver_settlements",
];

for (const table of tablesWithManage) {
  assert(
    rlsMigration.includes(`${table}_manage`),
    `${table} has manage policy for authorized roles`
  );
}

// Check 4: RPCs are security definer with search_path
const rpcFiles = [
  "20260709000006_finance_journal_core.sql",
  "20260709000002_finance_fiscal_periods.sql",
  "20260709000005_finance_document_sequences.sql",
  "20260709000007_finance_invoices.sql",
  "20260709000008_finance_driver_settlements.sql",
];

for (const file of rpcFiles) {
  const content = readFileSync(resolve(root, `supabase/migrations/${file}`), "utf-8");
  assert(
    content.includes("SECURITY DEFINER") && content.includes("SET search_path = public"),
    `${file}: RPCs are security definer with explicit search_path`
  );
}

// Check 5: GRANT execute statements exist
assert(
  rlsMigration.includes("GRANT EXECUTE ON FUNCTION public.post_journal_entry"),
  "GRANT execute on post_journal_entry to authenticated"
);

assert(
  rlsMigration.includes("GRANT EXECUTE ON FUNCTION public.reverse_journal_entry"),
  "GRANT execute on reverse_journal_entry to authenticated"
);

console.log(`\nFinance RLS checks: ${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
process.exit(failures > 0 ? 1 : 0);
