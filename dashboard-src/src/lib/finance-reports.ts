import { supabase } from "./supabase";
import type {
  FinanceDashboardMetrics,
  ARAgingBucket,
  PAndLRow,
  FinanceJournalEntry,
  FinanceInvoice,
  FinanceDriverSettlement,
} from "../types/finance";

type NumericLike = number | string | null | undefined;

interface OperationalOrderRow {
  id: string;
  external_order_id: string | null;
  odoo_order_name: string | null;
  customer_name: string | null;
  order_date: string | null;
  create_date: string | null;
  created_at: string | null;
  amount_total: NumericLike;
  total_amount: NumericLike;
  status: string | null;
}

interface OperationalInvoiceRow {
  id: string;
  invoice_name: string;
  invoice_date: string | null;
  created_at: string | null;
  amount_total: NumericLike;
  payment_state: string | null;
  invoice_state: string | null;
}

export interface FinanceRecentOperationalOrder {
  id: string;
  reference: string;
  customerName: string | null;
  orderDate: string;
  amount: number;
  status: string;
}

export interface FinanceRecentOperationalInvoice {
  id: string;
  invoiceName: string;
  invoiceDate: string;
  amount: number;
  paymentState: string;
  invoiceState: string;
}

export interface FinanceRecentSettlement {
  id: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: string;
  createdAt: string;
}

function toNumber(value: NumericLike): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getOrderAmount(order: Pick<OperationalOrderRow, "amount_total" | "total_amount">): number {
  return toNumber(order.amount_total) || toNumber(order.total_amount);
}

function dateWithinPeriod(value: string | null | undefined, fromDate: string, toDate: string): boolean {
  if (!value) return false;
  const dateOnly = value.slice(0, 10);
  return dateOnly >= fromDate && dateOnly <= toDate;
}

export async function fetchDashboardMetrics(): Promise<FinanceDashboardMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const monthStartIso = `${monthStart}T00:00:00`;
  const monthEndIso = `${monthEnd}T23:59:59`;

  // Fetch revenue (sum of credits to revenue accounts this month)
  const { data: revenueData } = await supabase
    .from("finance_journal_lines")
    .select("credit, account_id, finance_accounts!inner(type)")
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd + "T23:59:59")
    .eq("finance_accounts.type", "revenue");

  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, line: Record<string, unknown>) => sum + Number(line.credit ?? 0),
    0
  );

  // Fetch expenses (sum of debits to expense accounts this month)
  const { data: expenseData } = await supabase
    .from("finance_journal_lines")
    .select("debit, account_id, finance_accounts!inner(type)")
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd + "T23:59:59")
    .eq("finance_accounts.type", "expense");

  const totalExpenses = (expenseData ?? []).reduce(
    (sum: number, line: Record<string, unknown>) => sum + Number(line.debit ?? 0),
    0
  );

  // Fetch AR balance (sum of debits to accounts receivable minus credits)
  const { data: arData } = await supabase
    .from("finance_journal_lines")
    .select("debit, credit, account_id, finance_accounts!inner(code)")
    .eq("finance_accounts.code", "1013");

  const accountsReceivable = (arData ?? []).reduce(
    (sum: number, line: Record<string, unknown>) =>
      sum + Number(line.debit ?? 0) - Number(line.credit ?? 0),
    0
  );

  // Count overdue invoices
  const { count: overdueCount } = await supabase
    .from("finance_invoices")
    .select("id", { count: "exact", head: true })
    .eq("status", "posted")
    .lt("due_date", now.toISOString().split("T")[0]);

  // Pending settlements
  const { count: pendingSettlements } = await supabase
    .from("finance_driver_settlements")
    .select("id", { count: "exact", head: true })
    .in("status", ["draft", "approved"]);

  // Cash position (bank + cash accounts balance)
  const { data: cashData } = await supabase
    .from("finance_journal_lines")
    .select("debit, credit, account_id, finance_accounts!inner(code)")
    .in("finance_accounts.code", ["1011", "1012"]);

  const cashPosition = (cashData ?? []).reduce(
    (sum: number, line: Record<string, unknown>) =>
      sum + Number(line.debit ?? 0) - Number(line.credit ?? 0),
    0
  );

  const { data: orderData } = await supabase
    .from("orders")
    .select("id, external_order_id, odoo_order_name, customer_name, order_date, create_date, created_at, amount_total, total_amount, status")
    .or(`created_at.gte.${monthStartIso},order_date.gte.${monthStart},create_date.gte.${monthStart}`)
    .limit(5000);

  const monthlyOrders = ((orderData ?? []) as OperationalOrderRow[]).filter(
    (order) =>
      dateWithinPeriod(order.order_date, monthStart, monthEnd) ||
      dateWithinPeriod(order.create_date, monthStart, monthEnd) ||
      dateWithinPeriod(order.created_at, monthStart, monthEnd)
  );

  const monthlyOrderValue = monthlyOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);

  const { data: invoiceDocumentData } = await supabase
    .from("order_invoice_documents")
    .select("id, invoice_name, invoice_date, created_at, amount_total, payment_state, invoice_state")
    .or(`created_at.gte.${monthStartIso},invoice_date.gte.${monthStart}`)
    .limit(5000);

  const monthlyInvoiceDocuments = ((invoiceDocumentData ?? []) as OperationalInvoiceRow[]).filter(
    (invoice) =>
      dateWithinPeriod(invoice.invoice_date, monthStart, monthEnd) ||
      dateWithinPeriod(invoice.created_at, monthStart, monthEnd)
  );

  const monthlyInvoiceValue = monthlyInvoiceDocuments.reduce(
    (sum, invoice) => sum + toNumber(invoice.amount_total),
    0
  );

  const monthlyPaidInvoiceValue = monthlyInvoiceDocuments
    .filter((invoice) => invoice.payment_state === "paid")
    .reduce((sum, invoice) => sum + toNumber(invoice.amount_total), 0);

  const monthlyUnpaidInvoiceValue = monthlyInvoiceDocuments
    .filter((invoice) => invoice.payment_state !== "paid" && invoice.invoice_state !== "cancel")
    .reduce((sum, invoice) => sum + toNumber(invoice.amount_total), 0);

  const { data: collectionData } = await supabase
    .from("logistics_shipment_collections")
    .select("pending_delivery_amount, collected_successfully_amount, collected_from_customer, collection_status");

  const operationalReceivable = ((collectionData ?? []) as Array<Record<string, unknown>>).reduce(
    (sum, collection) =>
      sum +
      Math.max(
        toNumber(collection.pending_delivery_amount as NumericLike) -
          toNumber(collection.collected_successfully_amount as NumericLike),
        0
      ),
    0
  );

  const operationalCash = ((collectionData ?? []) as Array<Record<string, unknown>>).reduce(
    (sum, collection) => sum + toNumber(collection.collected_successfully_amount as NumericLike),
    0
  );

  const { data: monthlySettlementData } = await supabase
    .from("finance_driver_settlements")
    .select("cash_collected, net_payable, created_at")
    .gte("created_at", monthStartIso)
    .lte("created_at", monthEndIso);

  const monthlySettlementValue = ((monthlySettlementData ?? []) as Array<Record<string, unknown>>).reduce(
    (sum, settlement) =>
      sum +
      (toNumber(settlement.cash_collected as NumericLike) ||
        toNumber(settlement.net_payable as NumericLike)),
    0
  );

  const hasAccountingRevenue = Math.abs(totalRevenue) > 0.01;
  const hasAccountingReceivable = Math.abs(accountsReceivable) > 0.01;
  const hasAccountingCash = Math.abs(cashPosition) > 0.01;
  const operationalRevenue = monthlyInvoiceValue || monthlyOrderValue || monthlySettlementValue;
  const displayedRevenue = hasAccountingRevenue ? totalRevenue : operationalRevenue;
  const displayedAccountsReceivable = hasAccountingReceivable
    ? accountsReceivable
    : operationalReceivable || monthlyUnpaidInvoiceValue;
  const displayedCashPosition = hasAccountingCash
    ? cashPosition
    : operationalCash || monthlyPaidInvoiceValue;
  const dataSource =
    hasAccountingRevenue && hasAccountingReceivable && hasAccountingCash ? "accounting" : "operational";

  return {
    totalRevenue: displayedRevenue,
    totalExpenses,
    netProfit: displayedRevenue - totalExpenses,
    cashPosition: displayedCashPosition,
    accountsReceivable: displayedAccountsReceivable,
    overdueInvoices: overdueCount ?? 0,
    pendingSettlements: pendingSettlements ?? 0,
    monthlyGrowth: 0,
    dataSource,
  };
}

export async function fetchARAging(): Promise<ARAgingBucket[]> {
  const now = new Date();

  const buckets: ARAgingBucket[] = [
    { label: "Current", amount: 0, invoiceCount: 0 },
    { label: "1-30 Days", amount: 0, invoiceCount: 0 },
    { label: "31-60 Days", amount: 0, invoiceCount: 0 },
    { label: "61-90 Days", amount: 0, invoiceCount: 0 },
    { label: "90+ Days", amount: 0, invoiceCount: 0 },
  ];

  const { data: invoices } = await supabase
    .from("finance_invoices")
    .select("id, total, due_date, status")
    .eq("status", "posted");

  if (!invoices) return buckets;

  for (const inv of invoices as Array<{ id: string; total: number; due_date: string }>) {
    const dueDate = new Date(inv.due_date);
    const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let bucketIndex = 0;
    if (diffDays <= 0) bucketIndex = 0;
    else if (diffDays <= 30) bucketIndex = 1;
    else if (diffDays <= 60) bucketIndex = 2;
    else if (diffDays <= 90) bucketIndex = 3;
    else bucketIndex = 4;

    buckets[bucketIndex].amount += inv.total;
    buckets[bucketIndex].invoiceCount += 1;
  }

  return buckets;
}

export async function fetchProfitAndLoss(
  fromDate: string,
  toDate: string
): Promise<PAndLRow[]> {
  const { data, error } = await supabase
    .from("finance_journal_lines")
    .select(`
      debit, credit,
      finance_accounts!inner(id, code, name, name_ar, type)
    `)
    .gte("created_at", fromDate)
    .lte("created_at", toDate + "T23:59:59")
    .in("finance_accounts.type", ["revenue", "expense"]);

  if (error) throw new Error(error.message);

  const accountMap = new Map<string, PAndLRow>();

  for (const line of (data ?? []) as unknown as Array<{
    debit: number;
    credit: number;
    finance_accounts: { id: string; code: string; name: string; name_ar: string | null; type: string };
  }>) {
    const acct = line.finance_accounts;
    if (!accountMap.has(acct.id)) {
      accountMap.set(acct.id, {
        accountCode: acct.code,
        accountName: acct.name,
        accountNameAr: acct.name_ar,
        accountType: acct.type as PAndLRow["accountType"],
        totalDebit: 0,
        totalCredit: 0,
        netAmount: 0,
      });
    }
    const row = accountMap.get(acct.id)!;
    row.totalDebit += Number(line.debit ?? 0);
    row.totalCredit += Number(line.credit ?? 0);
    row.netAmount = row.totalCredit - row.totalDebit;
  }

  return Array.from(accountMap.values()).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

export async function fetchRecentJournalEntries(limit = 20): Promise<FinanceJournalEntry[]> {
  const { data, error } = await supabase
    .from("finance_journal_entries")
    .select("id, entry_number, fiscal_period_id, entry_date, source_type, source_id, description, status, reversed_by_entry_id, posted_at, posted_by, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    entryNumber: row.entry_number as string,
    fiscalPeriodId: row.fiscal_period_id as string,
    entryDate: row.entry_date as string,
    sourceType: row.source_type as FinanceJournalEntry["sourceType"],
    sourceId: (row.source_id as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    status: row.status as FinanceJournalEntry["status"],
    reversedByEntryId: (row.reversed_by_entry_id as string | null) ?? null,
    postedAt: row.posted_at as string,
    postedBy: (row.posted_by as string | null) ?? "",
    createdAt: row.created_at as string,
  }));
}

export async function fetchRecentInvoices(limit = 20): Promise<FinanceInvoice[]> {
  const { data, error } = await supabase
    .from("finance_invoices")
    .select("id, invoice_number, customer_id, order_id, status, issue_date, due_date, currency_code, subtotal, tax_total, discount_total, total, notes, journal_entry_id, created_by, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    invoiceNumber: (row.invoice_number as string | null) ?? null,
    customerId: row.customer_id as string,
    orderId: (row.order_id as string | null) ?? null,
    status: row.status as FinanceInvoice["status"],
    issueDate: row.issue_date as string,
    dueDate: (row.due_date as string | null) ?? null,
    currencyCode: row.currency_code as string,
    subtotal: toNumber(row.subtotal as NumericLike),
    taxTotal: toNumber(row.tax_total as NumericLike),
    discountTotal: toNumber(row.discount_total as NumericLike),
    total: toNumber(row.total as NumericLike),
    notes: (row.notes as string | null) ?? null,
    journalEntryId: (row.journal_entry_id as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function fetchRecentSettlements(limit = 20): Promise<FinanceDriverSettlement[]> {
  const { data, error } = await supabase
    .from("finance_driver_settlements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceDriverSettlement[];
}

export async function fetchRecentOperationalInvoices(
  limit = 10
): Promise<FinanceRecentOperationalInvoice[]> {
  const { data, error } = await supabase
    .from("order_invoice_documents")
    .select("id, invoice_name, invoice_date, created_at, amount_total, payment_state, invoice_state")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as OperationalInvoiceRow[]).map((row) => ({
    id: row.id,
    invoiceName: row.invoice_name,
    invoiceDate: row.invoice_date ?? row.created_at ?? "",
    amount: toNumber(row.amount_total),
    paymentState: row.payment_state ?? "unknown",
    invoiceState: row.invoice_state ?? "unknown",
  }));
}

export async function fetchRecentOperationalOrders(limit = 10): Promise<FinanceRecentOperationalOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, external_order_id, odoo_order_name, customer_name, order_date, create_date, created_at, amount_total, total_amount, status")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as OperationalOrderRow[]).map((row) => ({
    id: row.id,
    reference: row.odoo_order_name || row.external_order_id || row.id.slice(0, 8),
    customerName: row.customer_name,
    orderDate: row.order_date ?? row.create_date ?? row.created_at ?? "",
    amount: getOrderAmount(row),
    status: row.status ?? "unknown",
  }));
}

export async function fetchRecentSettlementSummaries(limit = 10): Promise<FinanceRecentSettlement[]> {
  const { data, error } = await supabase
    .from("finance_driver_settlements")
    .select("id, period_start, period_end, cash_collected, net_payable, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    amount:
      toNumber(row.cash_collected as NumericLike) || toNumber(row.net_payable as NumericLike),
    status: (row.status as string | null) ?? "draft",
    createdAt: row.created_at as string,
  }));
}

// ─── Views-based Reports ──────────────────────────────────────

export interface BalanceSheetRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  bsCategory: string;
}

export async function fetchBalanceSheet(): Promise<BalanceSheetRow[]> {
  const { data, error } = await supabase
    .from("v_balance_sheet")
    .select("*")
    .order("account_code");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    accountCode: r.account_code as string,
    accountName: r.account_name as string,
    accountType: r.account_type as string,
    totalDebit: Number(r.total_debit ?? 0),
    totalCredit: Number(r.total_credit ?? 0),
    balance: Number(r.balance ?? 0),
    bsCategory: r.bs_category as string,
  }));
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

export async function fetchTrialBalance(): Promise<TrialBalanceRow[]> {
  const { data, error } = await supabase
    .from("v_trial_balance")
    .select("*")
    .order("account_code");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    accountCode: r.account_code as string,
    accountName: r.account_name as string,
    accountType: r.account_type as string,
    debitBalance: Number(r.debit_balance ?? 0),
    creditBalance: Number(r.credit_balance ?? 0),
  }));
}

export interface ARAgingRow {
  customerId: string;
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  invoiceTotal: number;
  agingBucket: string;
  daysOverdue: number;
}

export async function fetchARAgingDetailed(): Promise<ARAgingRow[]> {
  const { data, error } = await supabase
    .from("v_ar_aging")
    .select("*")
    .order("customer_id");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    customerId: r.customer_id as string,
    invoiceId: r.invoice_id as string,
    invoiceNumber: r.invoice_number as string,
    issueDate: r.issue_date as string,
    dueDate: r.due_date as string,
    invoiceTotal: Number(r.invoice_total ?? 0),
    agingBucket: r.aging_bucket as string,
    daysOverdue: Number(r.days_overdue ?? 0),
  }));
}

export interface GeneralLedgerRow {
  entryId: string;
  entryNumber: string;
  entryDate: string;
  sourceType: string;
  entryDescription: string;
  status: string;
  lineId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  lineDescription: string;
  costCenterName: string | null;
}

export async function fetchGeneralLedger(): Promise<GeneralLedgerRow[]> {
  const { data, error } = await supabase
    .from("v_general_ledger")
    .select("*")
    .order("entry_date", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    entryId: r.entry_id as string,
    entryNumber: r.entry_number as string,
    entryDate: r.entry_date as string,
    sourceType: r.source_type as string,
    entryDescription: r.entry_description as string,
    status: r.status as string,
    lineId: r.line_id as string,
    accountCode: r.account_code as string,
    accountName: r.account_name as string,
    debit: Number(r.debit ?? 0),
    credit: Number(r.credit ?? 0),
    lineDescription: r.line_description as string,
    costCenterName: r.cost_center_name as string | null,
  }));
}

export async function refreshAccountBalances(): Promise<void> {
  const { error } = await supabase.rpc("refresh_mv_account_balances");
  if (error) throw new Error(error.message);
}
