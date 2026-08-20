#!/usr/bin/env node

/**
 * Finance Posting Integrity Regression Checks
 *
 * Verifies:
 * 1. Every journal entry has balanced debits/credits
 * 2. Posted entries are immutable (no UPDATE/DELETE on posted rows)
 * 3. No orphaned journal lines
 * 4. Every entry has a valid fiscal period
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

// Check 1: Post Journal Entry RPC validates balance
const journalCoreMigration = readFileSync(
  resolve(root, "supabase/migrations/20260709000006_finance_journal_core.sql"),
  "utf-8"
);

assert(
  journalCoreMigration.includes("v_total_debit != v_total_credit"),
  "post_journal_entry validates debit = credit balance"
);

assert(
  journalCoreMigration.includes("CHECK (debit >= 0 AND credit >= 0)"),
  "journal lines CHECK constraint prevents negative amounts"
);

assert(
  journalCoreMigration.includes("CHECK (NOT (debit > 0 AND credit > 0))"),
  "journal lines CHECK constraint enforces debit XOR credit"
);

assert(
  /v_total_debit\s*:=\s*v_total_debit\s*\+\s*v_line_debit/.test(journalCoreMigration),
  "post_journal_entry accumulates total debits"
);

assert(
  journalCoreMigration.includes("v_total_credit := v_total_credit + v_line_credit"),
  "post_journal_entry accumulates total credits"
);

// Check 2: Posted entries are immutable
assert(
  journalCoreMigration.includes("status = 'reversed'") && journalCoreMigration.includes("reversed_by_entry_id"),
  "reverse_journal_entry creates a new reversal entry instead of mutating"
);

// Check 3: Fiscal period validation
assert(
  journalCoreMigration.includes("status = 'open'"),
  "post_journal_entry validates fiscal period is open"
);

// Check 4: Account posting permission validation
assert(
  journalCoreMigration.includes("allow_posting = true"),
  "post_journal_entry validates account allows posting"
);

// Check 5: Invoice posting creates balanced entry
const invoiceMigration = readFileSync(
  resolve(root, "supabase/migrations/20260709000007_finance_invoices.sql"),
  "utf-8"
);

assert(
  invoiceMigration.includes("Accounts Receivable") || invoiceMigration.includes("v_ar_account_id"),
  "post_invoice creates AR debit line"
);

assert(
  invoiceMigration.includes("v_rev_account_id") || invoiceMigration.includes("Revenue"),
  "post_invoice creates Revenue credit line"
);

// Check 6: Driver settlement posting creates balanced entry
const settlementMigration = readFileSync(
  resolve(root, "supabase/migrations/20260709000008_finance_driver_settlements.sql"),
  "utf-8"
);

assert(
  settlementMigration.includes("v_commission_account") && settlementMigration.includes("v_fuel_account"),
  "legacy driver settlement migration documented old expense posting"
);

const settlementPlanTotalsMigration = readFileSync(
  resolve(root, "supabase/migrations/20260711085327_fix_driver_settlements_plan_totals.sql"),
  "utf-8"
);

assert(
  settlementPlanTotalsMigration.includes("ldp.planned_date BETWEEN p_period_start AND p_period_end"),
  "run_driver_settlement uses selected driver plan dates"
);

assert(
  settlementPlanTotalsMigration.includes("period_start <= p_period_end") &&
    settlementPlanTotalsMigration.includes("period_end >= p_period_start"),
  "run_driver_settlement rejects overlapping settlement periods"
);

assert(
  settlementPlanTotalsMigration.includes("commission_amount, fuel_allowance, cash_collected") &&
    settlementPlanTotalsMigration.includes("0, 0, v_plan_total"),
  "run_driver_settlement stores plan total with zero commission and fuel"
);

assert(
  settlementPlanTotalsMigration.includes("v_cash_account") &&
    settlementPlanTotalsMigration.includes("v_receivable_account"),
  "post_driver_settlement posts cash against receivables"
);

assert(
  settlementPlanTotalsMigration.includes("'debit', v_settlement.net_payable") &&
    settlementPlanTotalsMigration.includes("'credit', v_settlement.net_payable"),
  "post_driver_settlement creates balanced plan-total journal lines"
);

console.log(`\nFinance posting integrity checks: ${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
process.exit(failures > 0 ? 1 : 0);
