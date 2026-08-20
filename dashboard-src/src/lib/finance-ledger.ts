import { supabase } from "./supabase";
import type {
  FinanceJournalEntry,
  FinanceJournalLine,
  FinanceJournalEntryWithLines,
  PostJournalLine,
} from "../types/finance";

const ENTRY_SELECT = `
  id, entry_number, fiscal_period_id, entry_date, source_type, source_id,
  description, status, reversed_by_entry_id, posted_at, posted_by, created_at
`;

const LINE_SELECT = `
  id, journal_entry_id, account_id, cost_center_id, customer_id,
  debit, credit, currency_code, description, created_at
`;

export async function postJournalEntry(
  entryDate: string,
  sourceType: string,
  sourceId: string | null,
  description: string,
  lines: PostJournalLine[]
): Promise<string> {
  const { data, error } = await supabase.rpc("post_journal_entry", {
    p_entry_date: entryDate,
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_description: description,
    p_lines: lines,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function reverseJournalEntry(
  journalEntryId: string,
  reason: string
): Promise<string> {
  const { data, error } = await supabase.rpc("reverse_journal_entry", {
    p_journal_entry_id: journalEntryId,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function fetchJournalEntries(params?: {
  status?: string;
  sourceType?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: FinanceJournalEntry[]; count: number }> {
  let query = supabase
    .from("finance_journal_entries")
    .select(ENTRY_SELECT, { count: "exact" })
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (params?.status) query = query.eq("status", params.status);
  if (params?.sourceType) query = query.eq("source_type", params.sourceType);
  if (params?.fromDate) query = query.gte("entry_date", params.fromDate);
  if (params?.toDate) query = query.lte("entry_date", params.toDate);

  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    entries: (data ?? []) as unknown as FinanceJournalEntry[],
    count: count ?? 0,
  };
}

export async function fetchJournalEntryWithLines(
  entryId: string
): Promise<FinanceJournalEntryWithLines> {
  const { data: entry, error: entryError } = await supabase
    .from("finance_journal_entries")
    .select(ENTRY_SELECT)
    .eq("id", entryId)
    .single();

  if (entryError) throw new Error(entryError.message);

  const { data: lines, error: linesError } = await supabase
    .from("finance_journal_lines")
    .select(LINE_SELECT)
    .eq("journal_entry_id", entryId)
    .order("debit", { ascending: false });

  if (linesError) throw new Error(linesError.message);

  return {
    ...(entry as unknown as FinanceJournalEntry),
    lines: (lines ?? []) as unknown as FinanceJournalLine[],
  };
}

export function formatJournalNumber(entry: FinanceJournalEntry): string {
  return entry.entryNumber;
}
