// Finance Module — TypeScript Types
// All interfaces use camelCase properties mapping to snake_case DB columns.

// ─── Chart of Accounts ─────────────────────────────────────────

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface FinanceAccount {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: AccountType;
  parentId: string | null;
  isActive: boolean;
  allowPosting: boolean;
  sortOrder: number;
  createdAt: string;
  createdBy: string | null;
}

export interface FinanceAccountTreeNode extends FinanceAccount {
  children: FinanceAccountTreeNode[];
  level: number;
}

// ─── Fiscal Periods ────────────────────────────────────────────

export type FiscalPeriodStatus = "open" | "closed" | "locked";

export interface FinanceFiscalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
}

// ─── Cost Centers ──────────────────────────────────────────────

export interface FinanceCostCenter {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Tax Rates ─────────────────────────────────────────────────

export interface FinanceTaxRate {
  id: string;
  name: string;
  rate: number;
  accountId: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Document Sequences ────────────────────────────────────────

export interface FinanceDocumentSequence {
  documentType: string;
  prefix: string;
  currentNumber: number;
  yearReset: boolean;
}

// ─── Journal Entries ───────────────────────────────────────────

export type JournalSource =
  | "invoice"
  | "credit_note"
  | "delivery"
  | "collection"
  | "warehouse_adjustment"
  | "driver_settlement"
  | "manual"
  | "reversal";

export type JournalStatus = "posted" | "reversed";

export interface FinanceJournalEntry {
  id: string;
  entryNumber: string;
  fiscalPeriodId: string;
  entryDate: string;
  sourceType: JournalSource;
  sourceId: string | null;
  description: string | null;
  status: JournalStatus;
  reversedByEntryId: string | null;
  postedAt: string;
  postedBy: string;
  createdAt: string;
}

export interface FinanceJournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  costCenterId: string | null;
  customerId: string | null;
  debit: number;
  credit: number;
  currencyCode: string;
  description: string | null;
  createdAt: string;
}

export interface FinanceJournalEntryWithLines extends FinanceJournalEntry {
  lines: FinanceJournalLine[];
}

// ─── Invoices ──────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "posted" | "paid" | "partially_paid" | "void";

export interface FinanceInvoice {
  id: string;
  invoiceNumber: string | null;
  customerId: string;
  orderId: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  currencyCode: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  notes: string | null;
  journalEntryId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceInvoiceLine {
  id: string;
  invoiceId: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRateId: string | null;
  lineTotal: number;
  sortOrder: number;
  createdAt: string;
}

export interface FinanceInvoiceWithLines extends FinanceInvoice {
  lines: FinanceInvoiceLine[];
  customerName?: string;
}

// ─── Driver Settlements ────────────────────────────────────────

export type SettlementStatus = "draft" | "approved" | "posted" | "paid";

export interface FinanceDriverSettlement {
  id: string;
  driverId: string;
  periodStart: string;
  periodEnd: string;
  commissionAmount: number;
  fuelAllowance: number;
  bonuses: number;
  penalties: number;
  cashCollected: number;
  cashRemitted: number;
  netPayable: number;
  status: SettlementStatus;
  journalEntryId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── RPC Input Types ───────────────────────────────────────────

export interface PostJournalLine {
  account_id: string;
  debit: number;
  credit: number;
  cost_center_id?: string | null;
  customer_id?: string | null;
  currency_code?: string;
  description?: string;
}

// ─── Odoo Synced Data (Real Data) ─────────────────────────────

export type OdooInvoiceState = "draft" | "posted" | "cancel";
export type OdooPaymentState = "paid" | "not_paid" | "partial" | "reversed";
export type OdooMoveType = "out_invoice" | "out_refund" | "in_invoice" | "in_refund";
export type OdooOrderStatus = "pending" | "confirmed" | "cancelled";
export type OdooInvoiceStatus = "invoiced" | "to_invoice" | "no";

export interface OdooInvoiceDocument {
  id: string;
  orderId: string | null;
  externalInvoiceId: string | null;
  externalOrderId: string | null;
  invoiceName: string;
  moveType: OdooMoveType;
  invoiceState: OdooInvoiceState;
  paymentState: OdooPaymentState;
  partnerRef: string | null;
  invoiceDate: string | null;
  amountTotal: number;
  currencyCode: string;
  rawPayload: Record<string, unknown>;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OdooOrder {
  id: string;
  externalOrderId: string | null;
  customerId: string | null;
  customerName: string | null;
  status: OdooOrderStatus;
  source: string;
  orderDate: string | null;
  deliveredAt: string | null;
  totalAmount: number;
  currencyCode: string;
  assignedUserId: string | null;
  amountTotal: number | null;
  amountUntaxed: number | null;
  amountToInvoice: number | null;
  invoiceStatus: OdooInvoiceStatus | null;
  odooOrderName: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OdooOrderLine {
  id: string;
  orderId: string;
  externalLineId: string;
  externalOrderId: string | null;
  externalProductId: string | null;
  productName: string;
  productRef: string | null;
  productCode: string | null;
  productUom: string | null;
  orderedQuantity: number;
  deliveredQuantity: number;
  invoicedQuantity: number;
  unitPrice: number;
  discountPercent: number;
  subtotalAmount: number;
  totalAmount: number;
  sortOrder: number;
  displayType: string | null;
  createdAt: string;
}

// ─── Dashboard / Report Types ──────────────────────────────────

export interface FinanceDashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashPosition: number;
  accountsReceivable: number;
  overdueInvoices: number;
  pendingSettlements: number;
  monthlyGrowth: number;
  dataSource: "accounting" | "operational";
}

export interface ARAgingBucket {
  label: string;
  amount: number;
  invoiceCount: number;
}

export interface PAndLRow {
  accountCode: string;
  accountName: string;
  accountNameAr: string | null;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  netAmount: number;
}

export interface BalanceSheetRow {
  accountCode: string;
  accountName: string;
  accountNameAr: string | null;
  accountType: AccountType;
  balance: number;
}

// ─── Settings Types ────────────────────────────────────────────

export interface FinanceSettingsTab {
  id: string;
  label: string;
  labelAr: string;
  description: string;
}

// ─── Event Mapping Types ───────────────────────────────────────

export interface JournalEventMapping {
  eventType: string;
  eventTypeAr: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  sourceTrigger: string;
}
