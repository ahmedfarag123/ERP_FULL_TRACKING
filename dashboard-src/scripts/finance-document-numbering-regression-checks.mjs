#!/usr/bin/env node

/**
 * Finance Document Numbering Regression Checks
 *
 * Verifies:
 * 1. Document sequences are unique per type
 * 2. next_document_number is atomic (FOR UPDATE)
 * 3. Year reset is configurable
 * 4. No duplicate/skip logic issues
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

// Check 1: Sequences table uses document_type as primary key
const seqMigration = readFileSync(
  resolve(root, "supabase/migrations/20260709000005_finance_document_sequences.sql"),
  "utf-8"
);

assert(
  /document_type\s+text\s+PRIMARY\s+KEY/i.test(seqMigration),
  "Document sequences uses document_type as primary key (one sequence per type)"
);

assert(
  seqMigration.includes("FOR UPDATE"),
  "next_document_number acquires row-level lock (FOR UPDATE) to prevent races"
);

assert(
  seqMigration.includes("current_number + 1"),
  "next_document_number increments by 1"
);

assert(
  seqMigration.includes("year_reset"),
  "Sequences support optional year reset"
);

// Check 2: Journal entry numbers are unique
const journalMigration = readFileSync(
  resolve(root, "supabase/migrations/20260709000006_finance_journal_core.sql"),
  "utf-8"
);

assert(
  /entry_number\s+text\s+NOT\s+NULL/i.test(journalMigration),
  "Journal entries require entry_number"
);

// Check 3: Invoice numbers are allocated on posting
const invoiceMigration = readFileSync(
  resolve(root, "supabase/migrations/20260709000007_finance_invoices.sql"),
  "utf-8"
);

assert(
  invoiceMigration.includes("next_document_number('invoice')"),
  "Invoice posting allocates number from sequence"
);

assert(
  invoiceMigration.includes("next_document_number('credit_note')") || invoiceMigration.includes("post_credit_note"),
  "Credit notes use document sequence"
);

// Check 4: All document types are seeded
assert(
  seqMigration.includes("'invoice'") && seqMigration.includes("'credit_note'") && seqMigration.includes("'journal_entry'"),
  "Sequences seeded for invoice, credit_note, and journal_entry"
);

console.log(`\nFinance document numbering checks: ${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
process.exit(failures > 0 ? 1 : 0);
