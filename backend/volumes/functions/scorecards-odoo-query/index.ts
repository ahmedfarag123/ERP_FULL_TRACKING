import { corsHeaders, executeOdooKwWithCredentials, formatUnknownError, jsonResponse, requireOdooSyncAccess, requireServiceOdooPassword, requireServiceOdooUid, supabaseAdmin } from "../_shared/odoo.ts";

const DEFAULT_CODES = [
  "finance.total_payable",
  "finance.unreconciled_bills",
  "finance.pending_custodies",
  "finance.pending_loans",
  "finance.total_receivable",
  "finance.unreconciled_invoices",
  "finance.cancelled_invoices",
  "finance.invoicing_over_12h",
  "finance.invoicing_over_24h",
  "finance.orders_to_invoice",
  "finance.expenses_budget",
  "finance.journals_no_partner",
  "collection.dso_mas_credit",
];

interface ScorecardWindow {
  from?: string;
  to?: string;
}

const RECOMPUTABLE_WINDOW_KEYS = new Set([
  "finance.cancelled_invoices",
  "finance.invoicing_over_12h",
  "finance.invoicing_over_24h",
  "finance.expenses_budget",
]);

const SCORECARD_DEFS = {
  "finance.total_payable": {
    department: "Finance",
    scorecard: "Total Payable",
    module: "Accounting",
    view: "General Ledger",
    field: "Payables",
    currency: "EGP",
    odooSources: [
      {
        model: "account.move",
        role: "Posted vendor bills (in_invoice / in_refund) with residual amounts.",
        domain: [
          ["move_type", "in", ["in_invoice", "in_refund"]],
          ["state", "=", "posted"],
        ],
        fields: [
          "id",
          "name",
          "move_type",
          "partner_id",
          "invoice_date",
          "invoice_date_due",
          "amount_total",
          "amount_residual",
          "payment_state",
        ],
      },
    ],
  },
  "finance.unreconciled_bills": {
    department: "Finance",
    scorecard: "Unreconciled Bills",
    module: "Accounting",
    view: "Bills",
    field: "Invoice Has Outstanding",
    currency: "",
    odooSources: [
      {
        model: "account.move",
        role: "Posted vendor bills (in_invoice) that still have an outstanding amount.",
        domain: [
          ["move_type", "=", "in_invoice"],
          ["state", "=", "posted"],
          ["amount_residual", ">", 0],
        ],
        fields: [
          "id",
          "name",
          "move_type",
          "partner_id",
          "invoice_date",
          "invoice_date_due",
          "amount_total",
          "amount_residual",
          "payment_state",
        ],
      },
    ],
  },
  "finance.pending_custodies": {
    department: "Finance",
    scorecard: "Pending Custodies",
    module: "Accounting",
    view: "General Ledger",
    field: "Total Custody",
    currency: "EGP",
  },
  "finance.pending_loans": {
    department: "Finance",
    scorecard: "Pending Loans",
    module: "Accounting",
    view: "General Ledger",
    field: "Total Loans",
    currency: "EGP",
  },
  "finance.total_receivable": {
    department: "Finance",
    scorecard: "Total Recievable",
    module: "Accounting",
    view: "General Ledger",
    field: "Recievable",
    currency: "EGP",
  },
  "finance.unreconciled_invoices": {
    department: "Finance",
    scorecard: "Unreconciled Invoices",
    module: "Accounting",
    view: "Invoices",
    field: "Invoice Has Outstanding",
    currency: "",
  },
  "finance.cancelled_invoices": {
    department: "Finance",
    scorecard: "Cancelled Invoices",
    module: "Accounting",
    view: "Invoices",
    field: "Invoice Status",
    currency: "",
  },
  "finance.invoicing_over_12h": {
    department: "Finance",
    scorecard: "Invoicing > 12:00 AM",
    module: "Sales",
    view: "Orders",
    field: "Diff Between Delivery Date & Invoice Creation Date",
    currency: "%",
  },
  "finance.invoicing_over_24h": {
    department: "Finance",
    scorecard: "Invoicing > 24H",
    module: "Sales",
    view: "Orders",
    field: "Diff Between Delivery Date & Invoice Creation Date",
    currency: "%",
  },
  "finance.orders_to_invoice": {
    department: "Finance",
    scorecard: "Orders To Invoice",
    module: "Sales",
    view: "Orders",
    field: "To Invoice",
    currency: "",
  },
  "finance.expenses_budget": {
    department: "Finance",
    scorecard: "Expenses Budget",
    module: "Accounting",
    view: "Profit and loss",
    field: "Expenses",
    currency: "%",
  },
  "finance.journals_no_partner": {
    department: "Finance",
    scorecard: "Journals No Partner",
    module: "Accounting",
    view: "Journal Items",
    field: "(AR - AP - Custody - Loan) with no partner",
    currency: "",
  },
  "collection.dso_mas_credit": {
    department: "Collection Department",
    scorecard: "DSO MAS (Credit)",
    module: "Accounting",
    view: "Invoices",
    field: "Total Due Credit MAS / Total Sales Credit MAS 3 Months",
    currency: "",
    odooSources: [
      {
        model: "account.move",
        role: "Posted MAS customer invoices (out_invoice / out_refund) that are credit (non-cash payment terms).",
        domain: [
          ["move_type", "in", ["out_invoice", "out_refund"]],
          ["state", "=", "posted"],
          ["company_id", "=", 1],
        ],
        fields: [
          "id",
          "name",
          "move_type",
          "partner_id",
          "payment_term_id",
          "invoice_date",
          "amount_total",
          "amount_residual",
        ],
      },
    ],
  },
} as const;

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoNow(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function saturdayWeekStartIso(): string {
  const cairo = new Date(Date.now() + 3 * 60 * 60 * 1000);
  let daysBack = cairo.getUTCDay() - 6;
  if (daysBack < 0) daysBack += 7;
  cairo.setUTCDate(cairo.getUTCDate() - daysBack);
  cairo.setUTCHours(0, 0, 0, 0);
  return new Date(cairo.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

async function readableFields(uid: number, password: string, model: string, wantedFields: string[]): Promise<string[]> {
  const fieldMap = await executeOdooKwWithCredentials({
    uid,
    password,
    model,
    methodName: "fields_get",
    args: [],
    kwargs: { attributes: ["string", "type"] },
  });
  const available = new Set(Object.keys(fieldMap ?? {}));
  return wantedFields.filter((field) => available.has(field));
}

export async function calculateFinanceTotalPayable(uid: number, password: string): Promise<{ value: number | null; note: string; asOf: string; topVendors: unknown[] }> {
  const config = SCORECARD_DEFS["finance.total_payable"];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) {
    throw new Error(`No readable fields for ${source.model}.`);
  }
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [source.domain],
    kwargs: { fields, limit: 5000 },
  });
  if (!Array.isArray(rows)) {
    throw new Error("Odoo account.move returned an unexpected payload.");
  }
  let payableTotal = 0;
  let creditMemoTotal = 0;
  let openCount = 0;
  const vendorTotals = new Map<string, { name: string; total: number }>();
  for (const row of rows) {
    const moveType = String(row.move_type ?? "");
    const residual = numberValue(row.amount_residual);
    if (residual === null) continue;
    if (moveType === "in_invoice") {
      payableTotal += residual;
      if (residual > 0) openCount += 1;
    } else if (moveType === "in_refund") {
      creditMemoTotal += residual;
    }
    const partner = row.partner_id;
    const partnerId = Array.isArray(partner) ? Number(partner[0]) : Number(partner);
    const partnerName = Array.isArray(partner) ? String(partner[1] ?? "—") : "—";
    if (Number.isFinite(partnerId) && partnerId > 0) {
      const current = vendorTotals.get(String(partnerId)) ?? { name: partnerName, total: 0 };
      current.total += moveType === "in_refund" ? -residual : residual;
      if (partnerName !== "—") current.name = partnerName;
      vendorTotals.set(String(partnerId), current);
    }
  }
  const totalValue = Math.max(0, payableTotal - creditMemoTotal);
  const topVendors = Array.from(vendorTotals.entries())
    .map(([id, entry]) => ({ id: Number(id), name: entry.name, outstanding: Math.max(0, entry.total) }))
    .filter((entry) => entry.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 8);
  const asOf = isoNow();
  const note = `Σ residual of posted vendor bills (${payableTotal.toFixed(2)}) minus vendor credit memos (${creditMemoTotal.toFixed(2)}); ${openCount} open bills.`;
  return { value: totalValue, note, asOf, topVendors };
}

async function calculateFinanceUnreconciledBills(uid: number, password: string): Promise<{ value: number | null; note: string; asOf: string; topVendors: unknown[] }> {
  const config = SCORECARD_DEFS["finance.unreconciled_bills"];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) {
    throw new Error(`No readable fields for ${source.model}.`);
  }
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [source.domain],
    kwargs: { fields, limit: 5000 },
  });
  if (!Array.isArray(rows)) {
    throw new Error("Odoo account.move returned an unexpected payload.");
  }
  let count = 0;
  let totalOutstanding = 0;
  const vendorTotals = new Map<string, { name: string; total: number }>();
  for (const row of rows) {
    const residual = numberValue(row.amount_residual);
    if (residual === null || residual <= 0) continue;
    count += 1;
    totalOutstanding += residual;
    const partner = row.partner_id;
    const partnerId = Array.isArray(partner) ? Number(partner[0]) : Number(partner);
    const partnerName = Array.isArray(partner) ? String(partner[1] ?? "—") : "—";
    if (Number.isFinite(partnerId) && partnerId > 0) {
      const current = vendorTotals.get(String(partnerId)) ?? { name: partnerName, total: 0 };
      current.total += residual;
      if (partnerName !== "—") current.name = partnerName;
      vendorTotals.set(String(partnerId), current);
    }
  }
  const topVendors = Array.from(vendorTotals.entries())
    .map(([id, entry]) => ({ id: Number(id), name: entry.name, outstanding: entry.total }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 8);
  const asOf = isoNow();
  const note = `${count} posted vendor bills still have an outstanding amount; Σ outstanding ${totalOutstanding.toFixed(2)} EGP.`;
  return { value: count, note, asOf, topVendors };
}

async function findAccountIds(uid: number, password: string, namePattern: string): Promise<number[]> {
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.account",
    methodName: "search_read",
    args: [[["name", "ilike", namePattern]]],
    kwargs: { fields: ["id"], limit: 50 },
  });
  return Array.isArray(rows) ? rows.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite) : [];
}

async function findAccountIdsByCode(uid: number, password: string, codes: string[]): Promise<number[]> {
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.account",
    methodName: "search_read",
    args: [[["code", "in", codes]]],
    kwargs: { fields: ["id", "code", "name"], limit: 50 },
  });
  return Array.isArray(rows) ? rows.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite) : [];
}

async function findAccountIdsByExactName(uid: number, password: string, names: string[]): Promise<number[]> {
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.account",
    methodName: "search_read",
    args: [[["name", "in", names]]],
    kwargs: { fields: ["id", "code", "name"], limit: 50 },
  });
  return Array.isArray(rows) ? rows.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite) : [];
}

async function findArApAccountIds(uid: number, password: string): Promise<number[]> {
  const ar = await executeOdooKwWithCredentials({
    uid, password, model: "account.account", methodName: "search_read",
    args: [[["account_type", "=", "asset_receivable"]]],
    kwargs: { fields: ["id"], limit: 50 },
  });
  const ap = await executeOdooKwWithCredentials({
    uid, password, model: "account.account", methodName: "search_read",
    args: [[["account_type", "=", "liability_payable"]]],
    kwargs: { fields: ["id"], limit: 50 },
  });
  const arIds = Array.isArray(ar) ? ar.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite) : [];
  const apIds = Array.isArray(ap) ? ap.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite) : [];
  return [...new Set([...arIds, ...apIds])];
}

async function sumGlBalances(uid: number, password: string, accountIds: number[]): Promise<number> {
  if (accountIds.length === 0) return 0;
  const lines = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move.line",
    methodName: "search_read",
    args: [[["account_id", "in", accountIds], ["move_id.state", "=", "posted"]]],
    kwargs: { fields: ["debit", "credit"], limit: 10000 },
  });
  if (!Array.isArray(lines)) return 0;
  let total = 0;
  for (const line of lines) {
    total += Number(line.debit ?? 0) - Number(line.credit ?? 0);
  }
  return total;
}

function buildPartnerTop(vendors: Map<string, { name: string; total: number }>, limit = 8) {
  return Array.from(vendors.entries())
    .map(([id, entry]) => ({ id: Number(id), name: entry.name, outstanding: entry.total }))
    .filter((e) => e.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, limit);
}

async function calculatePendingCustodies(uid: number, password: string) {
  const accountIds = await findAccountIdsByExactName(uid, password, ["العهد"]);
  if (accountIds.length === 0) return { value: 0, note: "Custody account (العهد) not found.", asOf: isoNow(), topVendors: [] as unknown[] };
  const total = await sumGlBalances(uid, password, accountIds);
  const absTotal = Math.abs(total);
  return { value: absTotal, note: `Total custody GL balance (account العهد): ${absTotal.toFixed(2)} EGP across ${accountIds.length} account(s).`, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculatePendingLoans(uid: number, password: string) {
  const accountIds = await findAccountIdsByExactName(uid, password, ["سلف"]);
  if (accountIds.length === 0) return { value: 0, note: "Loan account (سلف) not found.", asOf: isoNow(), topVendors: [] as unknown[] };
  const total = await sumGlBalances(uid, password, accountIds);
  const absTotal = Math.abs(total);
  return { value: absTotal, note: `Total loans GL balance (account سلف): ${absTotal.toFixed(2)} EGP across ${accountIds.length} account(s).`, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateTotalReceivable(uid: number, password: string) {
  const arAccounts = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.account",
    methodName: "search_read",
    args: [[["account_type", "=", "asset_receivable"]]],
    kwargs: { fields: ["id"], limit: 50 },
  });
  const arIds = Array.isArray(arAccounts) ? arAccounts.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite) : [];

  if (arIds.length > 0) {
    const total = await sumGlBalances(uid, password, arIds);
    return { value: Math.abs(total), note: `Σ receivable GL balance: ${Math.abs(total).toFixed(2)} EGP across ${arIds.length} account(s).`, asOf: isoNow(), topVendors: [] as unknown[] };
  }

  const invoices = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move",
    methodName: "search_read",
    args: [[["move_type", "in", ["out_invoice", "out_refund"]], ["state", "=", "posted"]]],
    kwargs: { fields: ["id", "move_type", "amount_residual", "partner_id"], limit: 5000 },
  });
  if (!Array.isArray(invoices)) return { value: 0, note: "No receivable data found.", asOf: isoNow(), topVendors: [] as unknown[] };
  let arTotal = 0;
  let creditTotal = 0;
  const partners = new Map<string, { name: string; total: number }>();
  for (const inv of invoices) {
    const moveType = String(inv.move_type ?? "");
    const residual = numberValue(inv.amount_residual);
    if (residual === null) continue;
    if (moveType === "out_invoice") arTotal += residual;
    else if (moveType === "out_refund") creditTotal += residual;
    const partner = inv.partner_id;
    const pid = Array.isArray(partner) ? Number(partner[0]) : Number(partner);
    const pname = Array.isArray(partner) ? String(partner[1] ?? "—") : "—";
    if (Number.isFinite(pid) && pid > 0) {
      const cur = partners.get(String(pid)) ?? { name: pname, total: 0 };
      cur.total += moveType === "out_refund" ? -residual : residual;
      if (pname !== "—") cur.name = pname;
      partners.set(String(pid), cur);
    }
  }
  const value = Math.max(0, arTotal - creditTotal);
  const note = `Σ receivable: invoices ${arTotal.toFixed(2)} minus credit memos ${creditTotal.toFixed(2)} EGP.`;
  return { value, note, asOf: isoNow(), topVendors: buildPartnerTop(partners) };
}

async function calculateUnreconciledInvoices(uid: number, password: string) {
  const invoices = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move",
    methodName: "search_read",
    args: [[["move_type", "=", "out_invoice"], ["state", "=", "posted"], ["amount_residual", ">", 0]]],
    kwargs: { fields: ["id", "partner_id", "amount_residual", "invoice_date"], limit: 5000 },
  });
  if (!Array.isArray(invoices)) return { value: 0, note: "No data.", asOf: isoNow(), topVendors: [] as unknown[] };
  let count = 0;
  let totalOutstanding = 0;
  const partners = new Map<string, { name: string; total: number }>();
  for (const inv of invoices) {
    const residual = numberValue(inv.amount_residual);
    if (residual === null || residual <= 0) continue;
    count++;
    totalOutstanding += residual;
    const partner = inv.partner_id;
    const pid = Array.isArray(partner) ? Number(partner[0]) : Number(partner);
    const pname = Array.isArray(partner) ? String(partner[1] ?? "—") : "—";
    if (Number.isFinite(pid) && pid > 0) {
      const cur = partners.get(String(pid)) ?? { name: pname, total: 0 };
      cur.total += residual;
      if (pname !== "—") cur.name = pname;
      partners.set(String(pid), cur);
    }
  }
  const partnerCount = partners.size;
  const note = `${count} posted customer invoices with outstanding amount; ${partnerCount} customers; Σ outstanding ${totalOutstanding.toFixed(2)} EGP.`;
  return { value: count, note, asOf: isoNow(), topVendors: buildPartnerTop(partners) };
}

async function calculateCancelledInvoices(uid: number, password: string, window?: ScorecardWindow) {
  const fromDate = window?.from ? `${window.from}T00:00:00` : saturdayWeekStartIso();
  const toDate = window?.to ? `${window.to}T23:59:59.999` : null;
  const domain: unknown[] = [["move_type", "=", "out_invoice"], ["state", "=", "cancel"], ["create_date", ">=", fromDate]];
  if (toDate) domain.push(["create_date", "<=", toDate]);
  const invoices = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move",
    methodName: "search_count",
    args: [domain],
    kwargs: {},
  });
  const count = Number.isFinite(invoices) ? Number(invoices) : 0;
  const label = window ? (window.from && window.to ? `${window.from} → ${window.to}` : window.from || window.to) : `since Saturday (${fromDate.slice(0, 10)}) (Cairo)`;
  return { value: count, note: `${count} customer invoices cancelled (${label}).`, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateInvoicingDelay(uid: number, password: string, thresholdHours: number, window?: ScorecardWindow) {
  const pickings = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "stock.picking",
    methodName: "search_read",
    args: [[["state", "=", "done"], ["date_done", "!=", false]]],
    kwargs: { fields: ["id", "date_done", "origin", "sale_id"], limit: 5000 },
  });
  const invoiceDomain: unknown[] = [["move_type", "=", "out_invoice"], ["state", "=", "posted"]];
  if (window?.from) invoiceDomain.push(["create_date", ">=", `${window.from}T00:00:00`]);
  if (window?.to) invoiceDomain.push(["create_date", "<=", `${window.to}T23:59:59.999`]);
  const invoices = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move",
    methodName: "search_read",
    args: [invoiceDomain],
    kwargs: { fields: ["id", "create_date", "invoice_origin"], limit: 5000 },
  });
  if (!Array.isArray(pickings) || !Array.isArray(invoices)) {
    return { value: 0, note: "Unable to fetch delivery or invoice data.", asOf: isoNow(), topVendors: [] as unknown[] };
  }
  const pickingBySale = new Map<string, Date>();
  for (const p of pickings) {
    if (!p.date_done) continue;
    const saleName = p.sale_id ? (Array.isArray(p.sale_id) ? String(p.sale_id[1] ?? "") : "") : String(p.origin ?? "");
    if (!saleName) continue;
    const doneDate = new Date(p.date_done);
    if (Number.isNaN(doneDate.getTime())) continue;
    const existing = pickingBySale.get(saleName);
    if (!existing || doneDate > existing) pickingBySale.set(saleName, doneDate);
  }
  let totalWithDelivery = 0;
  let lateCount = 0;
  for (const inv of invoices) {
    if (!inv.invoice_origin || !inv.create_date) continue;
    const saleName = String(inv.invoice_origin).trim();
    const deliveryDate = pickingBySale.get(saleName);
    if (!deliveryDate) continue;
    const invoiceCreated = new Date(inv.create_date);
    if (Number.isNaN(invoiceCreated.getTime())) continue;
    totalWithDelivery++;
    const diffHours = (invoiceCreated.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60);
    if (diffHours > thresholdHours) lateCount++;
  }
  const pct = totalWithDelivery > 0 ? Math.round((lateCount / totalWithDelivery) * 100) : 0;
  const range = window && (window.from || window.to) ? ` (${window.from || "…"} → ${window.to || "…"})` : "";
  const note = `${lateCount} of ${totalWithDelivery} invoices created > ${thresholdHours}h after delivery (${pct}%)${range}.`;
  return { value: pct, note, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateInvoicingOver12h(uid: number, password: string, window?: ScorecardWindow) {
  return calculateInvoicingDelay(uid, password, 12, window);
}

async function calculateInvoicingOver24h(uid: number, password: string, window?: ScorecardWindow) {
  return calculateInvoicingDelay(uid, password, 24, window);
}

async function calculateOrdersToInvoice(uid: number, password: string) {
  const saleCount = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "sale.order",
    methodName: "search_count",
    args: [[["invoice_status", "=", "to invoice"], ["state", "=", "sale"]]],
    kwargs: {},
  });
  let purchaseCount = 0;
  try {
    const r = await executeOdooKwWithCredentials({
      uid, password, model: "purchase.order", methodName: "search_count",
      args: [[["invoice_status", "=", "to invoice"]]], kwargs: {},
    });
    purchaseCount = Number.isFinite(r) ? Number(r) : 0;
  } catch { /* model may not exist */ }
  const draftCount = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move",
    methodName: "search_count",
    args: [[["state", "=", "draft"], ["move_type", "in", ["out_invoice", "in_invoice"]]]],
    kwargs: {},
  });
  const count = (Number.isFinite(saleCount) ? Number(saleCount) : 0) + purchaseCount + (Number.isFinite(draftCount) ? Number(draftCount) : 0);
  return { value: count, note: `${count} orders/invoices awaiting billing: ${Number.isFinite(saleCount) ? saleCount : 0} sale orders, ${purchaseCount} purchase orders, ${Number.isFinite(draftCount) ? draftCount : 0} draft invoices/bills.`, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateExpensesBudget(uid: number, password: string, window?: ScorecardWindow) {
  let budgetTarget = 0;
  let monthStart: string;
  let monthEnd: string;
  if (window && window.from) {
    const from = new Date(`${window.from}T12:00:00Z`);
    if (!Number.isNaN(from.getTime())) {
      monthStart = new Date(from.getUTCFullYear(), from.getUTCMonth(), 1).toISOString().slice(0, 10);
      monthEnd = new Date(from.getUTCFullYear(), from.getUTCMonth() + 1, 0).toISOString().slice(0, 10);
    } else {
      const now = new Date();
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    }
  } else {
    const now = new Date();
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
  try {
    const budgetLines = await executeOdooKwWithCredentials({
      uid,
      password,
      model: "crossovered.budget.lines",
      methodName: "search_read",
      args: [[["date_from", "<=", monthEnd], ["date_to", ">=", monthStart]]],
      kwargs: { fields: ["id", "planned_amount", "account_id", "date_from", "date_to"], limit: 500 },
    });
    if (Array.isArray(budgetLines)) {
      for (const line of budgetLines) budgetTarget += Number(line.planned_amount ?? 0);
    }
  } catch {
    // budget model might not exist
  }
  if (budgetTarget <= 0) {
    const envBudget = Number(Deno.env.get("SCORECARD_EXPENSES_MONTHLY_BUDGET")?.trim() ?? "");
    budgetTarget = Number.isFinite(envBudget) && envBudget > 0 ? envBudget : 1_000_000;
  }

  const expenseAccounts = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.account",
    methodName: "search_read",
    args: [[["account_type", "in", ["expense", "expense_direct_cost"]]]],
    kwargs: { fields: ["id"], limit: 50 },
  });
  const accountIds = Array.isArray(expenseAccounts) ? expenseAccounts.map((a: Record<string, unknown>) => Number(a.id)).filter(Number.isFinite) : [];

  let actualExpenses = 0;
  if (accountIds.length > 0) {
    const lines = await executeOdooKwWithCredentials({
      uid,
      password,
      model: "account.move.line",
      methodName: "search_read",
      args: [[["account_id", "in", accountIds], ["move_id.state", "=", "posted"], ["date", ">=", monthStart], ["date", "<=", monthEnd]]],
      kwargs: { fields: ["debit", "credit"], limit: 10000 },
    });
    if (Array.isArray(lines)) {
      for (const line of lines) actualExpenses += Number(line.debit ?? 0) - Number(line.credit ?? 0);
    }
  }
  const actual = Math.abs(actualExpenses);
  const pct = budgetTarget > 0 ? Math.round((actual / budgetTarget) * 100) : 0;
  const note = `Actual expenses ${actual.toFixed(2)} EGP vs budget ${budgetTarget.toFixed(2)} EGP (${pct}%) for ${monthStart} → ${monthEnd}.`;
  return { value: pct, note, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateJournalsNoPartner(uid: number, password: string) {
  const arApIds = await findArApAccountIds(uid, password);
  const cloanIds = await findAccountIdsByExactName(uid, password, ["العهد", "سلف"]);
  const accountIds = [...new Set([...arApIds, ...cloanIds])];
  if (accountIds.length === 0) {
    return { value: 0, note: "No AR/AP/custody/loan accounts found.", asOf: isoNow(), topVendors: [] as unknown[] };
  }
  const lines = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move.line",
    methodName: "search_count",
    args: [[["account_id", "in", accountIds], ["partner_id", "=", false], ["move_id.state", "=", "posted"]]],
    kwargs: {},
  });
  const count = Number.isFinite(lines) ? Number(lines) : 0;
  return { value: count, note: `${count} journal items on AR/AP/custody/loan accounts without a partner assigned.`, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateDsoMasCredit(uid: number, password: string): Promise<{ value: number | null; note: string; asOf: string; topVendors?: unknown[] }> {
  const config = SCORECARD_DEFS["collection.dso_mas_credit"];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) {
    throw new Error(`No readable fields for ${source.model}.`);
  }
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [source.domain],
    kwargs: { fields, limit: 10000 },
  });
  if (!Array.isArray(rows)) {
    throw new Error("Odoo account.move returned an unexpected payload.");
  }
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const cutoff = threeMonthsAgo.toISOString().slice(0, 10);
  let totalDueCredit = 0;
  let totalSalesCredit3m = 0;
  let creditCount = 0;
  for (const row of rows) {
    const paymentTerm = Array.isArray(row.invoice_payment_term_id) ? row.invoice_payment_term_id[0] : row.invoice_payment_term_id;
    if (Number(paymentTerm) === 1) continue;
    const residual = numberValue(row.amount_residual);
    const total = numberValue(row.amount_total);
    if (residual === null || total === null) continue;
    if (residual > 0) {
      creditCount += 1;
      totalDueCredit += residual;
    }
    const invoiceDate = String(row.invoice_date ?? "").slice(0, 10);
    if (invoiceDate >= cutoff) {
      totalSalesCredit3m += total;
    }
  }
  let value: number | null;
  let note: string;
  if (totalSalesCredit3m > 0) {
    const ratio = totalDueCredit / totalSalesCredit3m;
    value = +(ratio * 90);
    note = `DSO (days) = (total due credit MAS ${totalDueCredit.toFixed(2)} / total sales credit MAS 3 months ${totalSalesCredit3m.toFixed(2)}) × 90 = ${value.toFixed(2)} days; ${creditCount} open credit invoices.`;
  } else {
    value = null;
    note = `No credit sales in the last 3 months (cutoff ${cutoff}); cannot compute DSO.`;
  }
  return { value, note, asOf: isoNow(), topVendors: [] as unknown[] };
}

const CALCULATORS: Record<string, (uid: number, password: string, window?: ScorecardWindow) => Promise<{ value: number | null; note: string; asOf: string; topVendors?: unknown[] }>> = {
  "finance.total_payable": calculateFinanceTotalPayable,
  "finance.unreconciled_bills": calculateFinanceUnreconciledBills,
  "finance.pending_custodies": calculatePendingCustodies,
  "finance.pending_loans": calculatePendingLoans,
  "finance.total_receivable": calculateTotalReceivable,
  "finance.unreconciled_invoices": calculateUnreconciledInvoices,
  "finance.cancelled_invoices": calculateCancelledInvoices,
  "finance.invoicing_over_12h": calculateInvoicingOver12h,
  "finance.invoicing_over_24h": calculateInvoicingOver24h,
  "finance.orders_to_invoice": calculateOrdersToInvoice,
  "finance.expenses_budget": calculateExpensesBudget,
  "finance.journals_no_partner": calculateJournalsNoPartner,
  "collection.dso_mas_credit": calculateDsoMasCredit,
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405);
  }
  const accessError = await requireOdooSyncAccess(req);
  if (accessError) return accessError;
  try {
    const body = await req.json();
    const requested = Array.isArray(body.codes) ? body.codes.map((code: unknown) => String(code ?? "").trim().toLowerCase()).filter(Boolean) : DEFAULT_CODES;
    const codes = requested.length > 0 ? requested : DEFAULT_CODES;
    const windowFrom = typeof body.from === "string" && body.from.trim() ? body.from.trim() : undefined;
    const windowTo = typeof body.to === "string" && body.to.trim() ? body.to.trim() : undefined;
    const window: ScorecardWindow | undefined = windowFrom || windowTo ? { from: windowFrom, to: windowTo } : undefined;
    const queryOnly = Boolean(window);
    const uid = requireServiceOdooUid();
    const password = requireServiceOdooPassword();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const periodEnd = now.toISOString().slice(0, 10);
    const values = [];
    const results = [];
    for (const code of codes) {
      const def = SCORECARD_DEFS[code];
      if (!def || !CALCULATORS[code]) {
        results.push({ code, status: "unsupported", error: "No calculation rule registered yet." });
        continue;
      }
      try {
        if (queryOnly && !RECOMPUTABLE_WINDOW_KEYS.has(code)) {
          results.push({ code, status: "window-unsupported", error: "Point-in-time metric cannot be recomputed for a historical window; only snapshot history is available." });
          continue;
        }
        const calculated = await CALCULATORS[code](uid, password, window);
        const payload = {
          scorecard_key: code,
          department: def.department,
          scorecard: def.scorecard,
          value: calculated.value,
          currency: def.currency,
          note: calculated.note,
          metadata: { module: def.module, view: def.view, field: def.field, topVendors: calculated.topVendors ?? [] },
          period_start: monthStart,
          period_end: periodEnd,
        };
        results.push({
          code,
          status: "ok",
          module: def.module,
          view: def.view,
          field: def.field,
          value: calculated.value,
          note: calculated.note,
        });
        values.push(payload);
        if (!queryOnly) {
          try {
            await supabaseAdmin.from("scorecard_values").insert(payload);
          } catch {
            // cache failures are non-fatal
          }
        }
      } catch (error) {
        results.push({ code, status: "error", error: formatUnknownError(error) });
      }
    }
    return jsonResponse({ success: true, asOf: isoNow(), values, results });
  } catch (error) {
    return jsonResponse({ success: false, error: formatUnknownError(error) }, 400);
  }
});