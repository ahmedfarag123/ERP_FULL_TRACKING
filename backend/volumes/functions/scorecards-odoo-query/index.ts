import { corsHeaders, executeOdooKwWithCredentials, fetchOdooBatches, formatUnknownError, jsonResponse, requireOdooSyncAccess, requireServiceOdooPassword, requireServiceOdooUid, supabaseAdmin } from "../_shared/odoo.ts";
import { collectionFormCsv, collectionAgingCsv } from "./collection-data/collection_snapshots.ts";

/* Intercompany transfer exclusion: for each company, the partner_id that
   represents the *other* company (i.e. intercompany sales must be excluded). */
const INTERCO_PARTNER_ID: Record<number, number> = { 1: 7, 2: 1 };

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
  "collection.unpaid_cash_mas",
  "collection.unpaid_cash_horeca",
  "collection.sales_approved_credit_policy",
  "collection.dso_mas_cash",
  "collection.dso_horeca_credit",
  "collection.dso_horeca_cash",
  "collection.dso_other",
  "collection.total_collected",
  "collection.total_visits",
  "collection.due_over_60",
  "sales.gmv_mas",
  "sales.mas_customers",
  "sales.mas_average_order",
  "sales.products_sold_mas",
  "sales.gmv_horeca",
  "sales.horeca_customers",
  "sales.horeca_average_order",
  "sales.products_sold_horeca",
  "sales.crm_activities",
  "sales.new_customers",
  "sales.retention_rate",
  "sales.sales_by_app",
  "sales.active_customers",
  "purchase.stockout_top100",
  "purchase.stockout_products",
  "purchase.available_products",
  "purchase.new_products",
  "purchase.products_purchased",
  "purchase.purchase_orders",
  "purchase.accuracy_of_purchase",
  "purchase.receipts_date_24h",
  "purchase.gross_margin_mas",
  "purchase.gross_margin_horeca",
  "purchase.margin_lte_1",
  "purchase.variance_of_prices",
  "logistics.internal_transfers",
  "logistics.company_transfers",
  "logistics.returns_count",
  "logistics.returns_value",
  "logistics.inventory_days",
  "logistics.near_expire_products",
  "logistics.orders_to_validate",
  "logistics.validate_over_11am",
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
  "collection.sales_approved_credit_policy",
  "sales.gmv_mas",
  "sales.mas_customers",
  "sales.mas_average_order",
  "sales.products_sold_mas",
  "sales.gmv_horeca",
  "sales.horeca_customers",
  "sales.horeca_average_order",
  "sales.products_sold_horeca",
  "sales.crm_activities",
  "sales.new_customers",
  "sales.retention_rate",
  "sales.sales_by_app",
  "sales.active_customers",
  "purchase.stockout_top100",
  "purchase.new_products",
  "purchase.products_purchased",
  "purchase.purchase_orders",
  "purchase.accuracy_of_purchase",
  "purchase.receipts_date_24h",
  "purchase.gross_margin_mas",
  "purchase.gross_margin_horeca",
  "purchase.variance_of_prices",
  "logistics.internal_transfers",
  "logistics.company_transfers",
  "logistics.returns_count",
  "logistics.returns_value",
  "logistics.orders_to_validate",
  "logistics.validate_over_11am",
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
        role: "Vendor bills (in_invoice) with an outstanding amount (Invoice Has Outstanding filter).",
        domain: [
          ["move_type", "=", "in_invoice"],
          ["amount_residual", ">", 0],
          ["payment_state", "!=", "in_payment"],
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
  "collection.dso_mas_cash": {
    department: "Collection Department",
    scorecard: "DSO MAS (Cash)",
    module: "Sales",
    view: "Reporting",
    field: "Total Due Cash MAS / Total Sales Cash MAS 3 Months",
    currency: "",
    odooSources: [
      {
        model: "account.move",
        role: "Posted MAS customer invoices (out_invoice / out_refund) for customers tagged cash (عملاء كاش); intercompany excluded.",
        domain: [
          ["move_type", "in", ["out_invoice", "out_refund"]],
          ["state", "=", "posted"],
          ["company_id", "=", 1],
        ],
        fields: ["id", "partner_id", "commercial_partner_id", "invoice_date", "amount_total", "amount_residual", "company_id"],
      },
    ],
  },
  "collection.dso_horeca_credit": {
    department: "Collection Department",
    scorecard: "DSO Horeca (Credit)",
    module: "Sales",
    view: "Reporting",
    field: "Total Due Credit Horeca / Total Sales Credit Horeca 3 Months",
    currency: "",
    odooSources: [
      {
        model: "account.move",
        role: "Posted Horeca customer invoices (out_invoice / out_refund) for customers tagged credit (عملاء اجل); intercompany excluded.",
        domain: [
          ["move_type", "in", ["out_invoice", "out_refund"]],
          ["state", "=", "posted"],
          ["company_id", "=", 2],
        ],
        fields: ["id", "partner_id", "commercial_partner_id", "invoice_date", "amount_total", "amount_residual", "company_id"],
      },
    ],
  },
  "collection.dso_horeca_cash": {
    department: "Collection Department",
    scorecard: "DSO Horeca (Cash)",
    module: "Sales",
    view: "Reporting",
    field: "Total Due Cash Horeca / Total Sales Cash Horeca 3 Months",
    currency: "",
    odooSources: [
      {
        model: "account.move",
        role: "Posted Horeca customer invoices (out_invoice / out_refund) for customers tagged cash (عملاء كاش); intercompany excluded.",
        domain: [
          ["move_type", "in", ["out_invoice", "out_refund"]],
          ["state", "=", "posted"],
          ["company_id", "=", 2],
        ],
        fields: ["id", "partner_id", "commercial_partner_id", "invoice_date", "amount_total", "amount_residual", "company_id"],
      },
    ],
  },
  "collection.dso_other": {
    department: "Collection Department",
    scorecard: "DSO Other",
    module: "Sales",
    view: "Reporting",
    field: "Total Due Other / Total Sales Other 3 Months",
    currency: "",
    odooSources: [
      {
        model: "account.move",
        role: "Posted customer invoices (out_invoice / out_refund) for customers not tagged as cash (6) nor credit (8), both companies; intercompany excluded.",
        domain: [
          ["move_type", "in", ["out_invoice", "out_refund"]],
          ["state", "=", "posted"],
          ["company_id", "in", [1, 2]],
        ],
        fields: ["id", "partner_id", "commercial_partner_id", "invoice_date", "amount_total", "amount_residual", "company_id"],
      },
    ],
  },
  "collection.total_collected": {
    department: "Collection Department",
    scorecard: "Total Collected",
    module: "Google Sheet",
    view: "Collection Team",
    field: "Sum of collected",
    currency: "EGP",
    odooSources: [],
    collectionData: { csvFile: "collection_form.csv", column: "اجمالي المحصل", rowFilter: "id" },
  },
  "collection.total_visits": {
    department: "Collection Department",
    scorecard: "Total Visits",
    module: "Google Sheet",
    view: "Collection Team",
    field: "Count of Visits",
    currency: "",
    odooSources: [],
    collectionData: { csvFile: "collection_form.csv", column: "اجمالي المحصل", rowFilter: "id" },
  },
  "collection.due_over_60": {
    department: "Collection Department",
    scorecard: "DUE > 60 Days",
    module: "Google Sheet",
    view: "Aged Receivable",
    field: "Total due > 60 days",
    currency: "EGP",
    odooSources: [],
    collectionData: { csvFile: "collection_aging.csv", buckets: ["61-90", "91-120", "أقدم"], rowFilter: "name" },
  },
  "collection.unpaid_cash_mas": {
    department: "Collection Department",
    scorecard: "Unpaid Cash MAS",
    module: "Accounting",
    view: "Invoices",
    field: "Total due Cash MAS",
    currency: "EGP",
    odooSources: [
      {
        model: "account.move",
        role: "Posted MAS customer invoices (out_invoice) tagged as cash customers, overdue and unpaid.",
        domain: [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
          ["company_id", "=", 1],
          ["payment_state", "in", ["not_paid", "partial"]],
        ],
        fields: ["id", "name", "partner_id", "invoice_date_due", "amount_total", "amount_residual", "payment_state"],
      },
    ],
  },
  "collection.unpaid_cash_horeca": {
    department: "Collection Department",
    scorecard: "Unpaid Cash Horeca",
    module: "Accounting",
    view: "Invoices",
    field: "Total due Cash Horeca",
    currency: "EGP",
    odooSources: [
      {
        model: "account.move",
        role: "Posted Horeca customer invoices (out_invoice) tagged as cash customers, overdue and unpaid.",
        domain: [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
          ["company_id", "=", 2],
          ["payment_state", "in", ["not_paid", "partial"]],
        ],
        fields: ["id", "name", "partner_id", "invoice_date_due", "amount_total", "amount_residual", "payment_state"],
      },
    ],
  },
  "collection.sales_approved_credit_policy": {
    department: "Collection Department",
    scorecard: "Sales Approved By Credit Policy",
    module: "Sales",
    view: "Orders",
    field: "Count of customers with due / total customers",
    currency: "%",
    odooSources: [
      {
        model: "sale.order",
        role: "Confirmed cash-customer sales orders in the period; customers are checked against posted overdue customer invoices.",
        domain: [
          ["state", "in", ["sale", "done"]],
          ["partner_id", "in", []],
        ],
        fields: ["id", "partner_id", "date_order", "amount_total", "state"],
      },
    ],
  },
  "sales.gmv_mas": {
    department: "Sales",
    scorecard: "GMV MAS",
    module: "Sales",
    view: "reporting",
    field: "Total Invoiced MAS",
    currency: "EGP",
    odooSources: [
      {
        model: "account.move",
        role: "Posted MAS customer invoices (out_invoice, company_id=1) with their total amounts, per invoice date.",
        domain: [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
          ["company_id", "=", 1],
        ],
        fields: ["id", "name", "partner_id", "invoice_date", "amount_total", "amount_untaxed"],
      },
    ],
  },
  "sales.gmv_horeca": {
    department: "Sales",
    scorecard: "GMV Horeca",
    module: "Sales",
    view: "reporting",
    field: "Total Invoiced Horeca",
    currency: "EGP",
    odooSources: [
      {
        model: "account.move",
        role: "Posted Horeca customer invoices (out_invoice, company_id=2) with their total amounts, per invoice date.",
        domain: [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
          ["company_id", "=", 2],
        ],
        fields: ["id", "name", "partner_id", "invoice_date", "amount_total", "amount_untaxed"],
      },
    ],
  },
  "sales.mas_customers": {
    department: "Sales",
    scorecard: "MAS Customers",
    module: "Sales",
    view: "reporting",
    field: "Count of Customers In MAS",
    currency: "",
    odooSources: [
      {
        model: "sale.order",
        role: "Confirmed MAS (company_id=1) sale orders; count distinct customers (partner_id) in the period.",
        domain: [
          ["state", "in", ["sale", "done"]],
          ["company_id", "=", 1],
        ],
        fields: ["id", "partner_id", "date_order"],
      },
    ],
  },
  "sales.horeca_customers": {
    department: "Sales",
    scorecard: "Horeca Customers",
    module: "Sales",
    view: "reporting",
    field: "Count of Customers In Horeca",
    currency: "",
    odooSources: [
      {
        model: "sale.order",
        role: "Confirmed Horeca (company_id=2) sale orders; count distinct customers (partner_id) in the period.",
        domain: [
          ["state", "in", ["sale", "done"]],
          ["company_id", "=", 2],
        ],
        fields: ["id", "partner_id", "date_order"],
      },
    ],
  },
  "sales.mas_average_order": {
    department: "Sales",
    scorecard: "MAS Average Order",
    module: "Sales",
    view: "reporting",
    field: "Total Invoiced / Count of Customers (MAS)",
    currency: "",
    odooSources: [
      {
        model: "sale.order",
        role: "Confirmed MAS (company_id=1) sale orders; count orders and total amount in the period.",
        domain: [
          ["state", "in", ["sale", "done"]],
          ["company_id", "=", 1],
        ],
        fields: ["id", "partner_id", "date_order", "amount_total"],
      },
    ],
  },
"sales.horeca_average_order": {
    department: "Sales",
    scorecard: "Horeca Average Order",
    module: "Sales",
    view: "reporting",
    field: "Total Invoiced / Count of Customers (Horeca)",
    currency: "",
    odooSources: [
      {
        model: "sale.order",
        role: "Confirmed Horeca (company_id=2) sale orders; count orders and total amount in the period.",
        domain: [
          ["state", "in", ["sale", "done"]],
          ["company_id", "=", 2],
        ],
        fields: ["id", "partner_id", "date_order", "amount_total"],
      },
    ],
  },
  "sales.products_sold_mas": {
    department: "Sales",
    scorecard: "Products sold MAS",
    module: "Sales",
    view: "reporting",
    field: "Count of products sold In MAS",
    currency: "",
    odooSources: [
      {
        model: "sale.order",
        role: "Confirmed MAS (company_id=1) sale orders; count distinct products sold in the period.",
        domain: [
          ["state", "in", ["sale", "done"]],
          ["company_id", "=", 1],
        ],
        fields: ["id", "date_order"],
      },
    ],
  },
  "sales.products_sold_horeca": {
    department: "Sales",
    scorecard: "Products sold Horeca",
    module: "Sales",
    view: "reporting",
    field: "Count of products sold In Horeca",
    currency: "",
    odooSources: [
      {
        model: "sale.order",
        role: "Confirmed Horeca (company_id=2) sale orders; count distinct products sold in the period.",
        domain: [
          ["state", "in", ["sale", "done"]],
          ["company_id", "=", 2],
        ],
        fields: ["id", "date_order"],
      },
    ],
  },
  "sales.crm_activities": {
    department: "Sales",
    scorecard: "CRM Activities",
    module: "CRM",
    view: "reporting",
    field: "Count of activities",
    currency: "",
    odooSources: [],
  },
  "sales.new_customers": {
    department: "Sales",
    scorecard: "New Customers",
    module: "Contacts",
    view: "List",
    field: "Count of Created on belongs to Horeca",
    currency: "",
    odooSources: [],
  },
  "sales.retention_rate": {
    department: "Sales",
    scorecard: "Retention Rate",
    module: "Sales",
    view: "reporting",
    field: "Active customers - new customers during 1 month / active customers month ago",
    currency: "%",
    odooSources: [],
  },
  "sales.sales_by_app": {
    department: "Sales",
    scorecard: "Sales By App",
    module: "Sales",
    view: "Orders",
    field: "Horeca orders by app pricelist / Horeca total orders",
    currency: "%",
    odooSources: [],
  },
  "sales.active_customers": {
    department: "Sales",
    scorecard: "Active Customers",
    module: "Sales",
    view: "reporting",
    field: "Count of customers sales during 30 days",
    currency: "",
    odooSources: [],
  },
  "purchase.stockout_top100": {
    department: "Purchase",
    scorecard: "StockOut - top 100 SKU",
    module: "Inventory",
    view: "Products",
    field: "Compare top 100 product sales to available stock",
    currency: "%",
    odooSources: [],
  },
  "purchase.stockout_products": {
    department: "Purchase",
    scorecard: "StockOut Products",
    module: "Inventory",
    view: "reporting",
    field: "Count of products out of stock (<=0)",
    currency: "",
    odooSources: [],
  },
  "purchase.available_products": {
    department: "Purchase",
    scorecard: "Available Products",
    module: "Inventory",
    view: "reporting",
    field: "Count of products in stock (>0)",
    currency: "",
    odooSources: [],
  },
  "purchase.new_products": {
    department: "Purchase",
    scorecard: "New Products",
    module: "Inventory",
    view: "Products",
    field: "Count of products created on",
    currency: "",
    odooSources: [],
  },
  "purchase.products_purchased": {
    department: "Purchase",
    scorecard: "Products Purchased",
    module: "Purchase",
    view: "reporting",
    field: "Count of products purchased",
    currency: "Product",
    odooSources: [],
  },
  "purchase.purchase_orders": {
    department: "Purchase",
    scorecard: "Purchase Orders",
    module: "Purchase",
    view: "reporting",
    field: "Count of PO Created",
    currency: "PO",
    odooSources: [],
  },
  "purchase.accuracy_of_purchase": {
    department: "Purchase",
    scorecard: "Accuracy of purchase orders",
    module: "Purchase",
    view: "reporting",
    field: "Compare ordered qty to billed qty",
    currency: "%",
    odooSources: [],
  },
  "purchase.receipts_date_24h": {
    department: "Purchase",
    scorecard: "Reciepts Date <24H",
    module: "Purchase",
    view: "reporting",
    field: "Compare creation date to receipt date",
    currency: "PO",
    odooSources: [],
  },
  "purchase.gross_margin_mas": {
    department: "Purchase",
    scorecard: "Gross Margin Horeca",
    module: "Sales",
    view: "reporting",
    field: "Horeca sales with Margin",
    currency: "%",
    odooSources: [],
  },
  "purchase.gross_margin_horeca": {
    department: "Purchase",
    scorecard: "Gross Margin MAS",
    module: "Sales",
    view: "reporting",
    field: "MAS sales with Margin",
    currency: "%",
    odooSources: [],
  },
  "purchase.margin_lte_1": {
    department: "Purchase",
    scorecard: "Margin <= 1%",
    module: "Inventory",
    view: "Products",
    field: "Compare Sale price to List Price",
    currency: "",
    odooSources: [],
  },
  "purchase.variance_of_prices": {
    department: "Purchase",
    scorecard: "Variance of Prices",
    module: "Purchase",
    view: "Orders",
    field: "PO with message created by Abdullah - Khaled",
    currency: "PO",
    odooSources: [],
  },
  "logistics.internal_transfers": {
    department: "Logistics",
    scorecard: "Internal Transfers",
    module: "Inventory",
    view: "Operations",
    field: "Count of Internal transfers",
    departmentLabel: "Logistics",
    goodWhen: "lower",
    currency: "",
    scoringMode: "recompute",
  },
  "logistics.company_transfers": {
    department: "Logistics",
    scorecard: "Company Transfers",
    module: "Sales",
    view: "Orders",
    field: "Count of orders with partner ( MAS or Horeca Smart)",
    departmentLabel: "Logistics",
    goodWhen: "lower",
    currency: "",
    scoringMode: "recompute",
  },
  "logistics.near_expire_products": {
    department: "Logistics",
    scorecard: "NearExpire Products",
    module: "Inventory",
    view: "reporting",
    field: "Count of products which is expired or near expire",
    departmentLabel: "Logistics",
    goodWhen: "lower",
    currency: "",
    scoringMode: "recompute",
  },
  "logistics.returns_count": {
    department: "Logistics",
    scorecard: "Returns Count",
    module: "Sales",
    view: "Orders",
    field: "Count of orders with invoice status (nothing to invoice)",
    departmentLabel: "Logistics",
    goodWhen: "lower",
    currency: "",
    scoringMode: "recompute",
  },
  "logistics.returns_value": {
    department: "Logistics",
    scorecard: "Returns Value",
    module: "Sales",
    view: "Orders",
    field: "Compare total ordered to total invoiced",
    departmentLabel: "Logistics",
    goodWhen: "lower",
    currency: "EGP",
    scoringMode: "recompute",
  },
  "logistics.orders_to_validate": {
    department: "Logistics",
    scorecard: "Orders To Validate",
    module: "Inventory",
    view: "operations",
    field: "Count of orders waiting or ready",
    departmentLabel: "Logistics",
    goodWhen: "lower",
    currency: "",
    scoringMode: "recompute",
  },
  "logistics.inventory_days": {
    department: "Logistics",
    scorecard: "Inventory Days",
    module: "Inventory",
    view: "reporting",
    field: "Stock valuation / cost of goods sold during 3 months",
    departmentLabel: "Logistics",
    goodWhen: "lower",
    currency: "",
    scoringMode: "recompute",
  },
  "logistics.validate_over_11am": {
    department: "Logistics",
    scorecard: "Validate > 11:00 AM",
    module: "Inventory",
    view: "operations",
    field: "Share of transfers validated at/after 11:00 AM Cairo",
    departmentLabel: "Logistics",
    goodWhen: "lower",
    currency: "%",
    scoringMode: "recompute",
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

function cairoDateParts(): { y: number; m: number; d: number; wd: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
  };
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function thursdayStartDate(): string {
  const p = cairoDateParts();
  const daysBack = (p.wd - 4 + 7) % 7;
  return isoDate(new Date(Date.UTC(p.y, p.m - 1, p.d - daysBack)));
}

function todayCairoDate(): string {
  const p = cairoDateParts();
  return isoDate(new Date(Date.UTC(p.y, p.m - 1, p.d)));
}

function salesWindow(window?: ScorecardWindow): { from: string; to: string; fromDate: string; toDate: string } {
  const today = todayCairoDate();
  const fromDate = window?.from?.trim() || shiftDateDays(today, -6);
  const toDate = window?.to?.trim() || today;
  const from = new Date(Date.UTC(Number(fromDate.slice(0, 4)), Number(fromDate.slice(5, 7)) - 1, Number(fromDate.slice(8, 10)), 0, 0, 0) - 3 * 3600 * 1000)
    .toISOString().slice(0, 19).replace("T", " ");
  const to = new Date(Date.UTC(Number(toDate.slice(0, 4)), Number(toDate.slice(5, 7)) - 1, Number(toDate.slice(8, 10)), 23, 59, 59) - 3 * 3600 * 1000)
    .toISOString().slice(0, 19).replace("T", " ");
  return { from, to, fromDate, toDate };
}

function shiftDateDays(iso: string, days: number): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return isoDate(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days)));
}

interface SalesWeekBin {
  label: string;
  dayLabel: string;
  from: string;
  to: string;
}

function salesWeeklyBins(win: { from: string }, count: number): SalesWeekBin[] {
  const bins: SalesWeekBin[] = [];
  const start = new Date(win.from.replace(" ", "T") + "Z");
  for (let i = 0; i < count; i += 1) {
    const wFrom = new Date(start.getTime() - i * 7 * 24 * 3600 * 1000);
    const wToExclusive = new Date(wFrom.getTime() + 7 * 24 * 3600 * 1000);
    const wTo = new Date(wToExclusive.getTime() - 1000);
    const fromIso = wFrom.toISOString().slice(0, 19).replace("T", " ");
    const toIso = wTo.toISOString().slice(0, 19).replace("T", " ");
    bins.push({
      label: `${wFrom.toISOString().slice(0, 10)} → ${wTo.toISOString().slice(0, 10)}`,
      dayLabel: `${wFrom.toISOString().slice(5, 10)} → ${wTo.toISOString().slice(5, 10)}`,
      from: fromIso,
      to: toIso,
    });
  }
  return bins;
}

async function collectWeeklyActive(uid: number, password: string, bins: SalesWeekBin[]): Promise<Set<number>[]> {
  const sets = bins.map(() => new Set<number>());
  const fromIso = bins[bins.length - 1].from;
  const toIso = bins[0].to;
  const rows = await executeOdooKwWithCredentials({
    uid, password, model: "sale.order", methodName: "search_read",
    args: [[["state", "in", ["sale", "done"]], ["company_id", "=", 2], ["date_order", ">=", fromIso], ["date_order", "<=", toIso]]],
    kwargs: { fields: ["partner_id", "date_order"], limit: 60000 },
  });
  if (Array.isArray(rows)) {
    for (const r of rows) {
      const pid = Array.isArray(r.partner_id) ? Number(r.partner_id[0]) : Number(r.partner_id);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const dt = typeof r.date_order === "string" ? r.date_order : "";
      for (let i = 0; i < bins.length; i += 1) {
        if (dt >= bins[i].from && dt <= bins[i].to) {
          sets[i].add(pid);
          break;
        }
      }
    }
  }
  return sets;
}

async function collectWeeklyCreated(uid: number, password: string, bins: SalesWeekBin[]): Promise<Set<number>[]> {
  const sets = bins.map(() => new Set<number>());
  const fromIso = bins[bins.length - 1].from;
  const toIso = bins[0].to;
  const rows = await executeOdooKwWithCredentials({
    uid, password, model: "res.partner", methodName: "search_read",
    args: [[["company_id", "=", 2], ["is_company", "=", true], ["create_date", ">=", fromIso], ["create_date", "<=", toIso]]],
    kwargs: { fields: ["id", "create_date"], limit: 60000 },
  });
  if (Array.isArray(rows)) {
    for (const r of rows) {
      const pid = Number(r.id);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const dt = typeof r.create_date === "string" ? r.create_date : "";
      for (let i = 0; i < bins.length; i += 1) {
        if (dt >= bins[i].from && dt <= bins[i].to) {
          sets[i].add(pid);
          break;
        }
      }
    }
  }
  return sets;
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
  const payableAccounts = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.account",
    methodName: "search_read",
    args: [[["account_type", "=", "liability_payable"]]],
    kwargs: { fields: ["id", "code", "name"], limit: 50 },
  });
  if (!Array.isArray(payableAccounts) || payableAccounts.length === 0) {
    return { value: 0, note: "No payable accounts (account_type=liability_payable) found.", asOf: isoNow(), topVendors: [] as unknown[] };
  }
  const payableIds = payableAccounts.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite);
  const total = await sumGlBalances(uid, password, payableIds);
  const absTotal = Math.abs(total);
  const note = `Payables GL balance: ${absTotal.toFixed(2)} EGP across ${payableIds.length} account(s).`;
  return { value: absTotal, note, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateFinanceUnreconciledBills(uid: number, password: string): Promise<{ value: number | null; note: string; asOf: string; topVendors: unknown[] }> {
  const rows = await fetchOdooBatches({
    model: "account.move",
    fields: ["id", "name", "partner_id", "invoice_date", "amount_total", "amount_residual", "invoice_has_outstanding"],
    domain: [["move_type", "=", "in_invoice"], ["state", "=", "posted"]],
    batchSize: 500,
    order: "id desc",
  });
  if (!Array.isArray(rows)) {
    throw new Error("Odoo account.move returned an unexpected payload.");
  }
  const outstanding = rows.filter((r: Record<string, unknown>) => Boolean(r.invoice_has_outstanding));
  let count = outstanding.length;
  let totalOutstanding = 0;
  const vendorTotals = new Map<string, { name: string; total: number }>();
  for (const row of outstanding) {
    const residual = numberValue(row.amount_residual) ?? 0;
    totalOutstanding += Math.max(0, residual);
    const partner = row.partner_id;
    const partnerId = Array.isArray(partner) ? Number(partner[0]) : Number(partner);
    const partnerName = Array.isArray(partner) ? String(partner[1] ?? "\u2014") : "\u2014";
    if (Number.isFinite(partnerId) && partnerId > 0) {
      const current = vendorTotals.get(String(partnerId)) ?? { name: partnerName, total: 0 };
      current.total += Math.max(0, residual);
      if (partnerName !== "\u2014") current.name = partnerName;
      vendorTotals.set(String(partnerId), current);
    }
  }
  const topVendors = Array.from(vendorTotals.entries())
    .map(([id, entry]) => ({ id: Number(id), name: entry.name, outstanding: entry.total }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 8);
  const asOf = isoNow();
  const note = `${count} vendor bills with outstanding credits (invoice_has_outstanding); \u03a3 outstanding ${totalOutstanding.toFixed(2)} EGP.`;
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
  const lines = await fetchOdooBatches({
    model: "account.move.line",
    fields: ["debit", "credit"],
    domain: [["account_id", "in", accountIds], ["move_id.state", "=", "posted"]],
    batchSize: 500,
  });
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
  const invoices = await fetchOdooBatches({
    model: "account.move",
    fields: ["id", "name", "partner_id", "amount_residual", "invoice_date", "invoice_has_outstanding"],
    domain: [["move_type", "=", "out_invoice"], ["state", "=", "posted"]],
    batchSize: 500,
    order: "id desc",
  });
  if (!Array.isArray(invoices)) return { value: 0, note: "No data.", asOf: isoNow(), topVendors: [] as unknown[] };
  const outstanding = invoices.filter((inv: Record<string, unknown>) => Boolean(inv.invoice_has_outstanding));
  let count = 0;
  let totalOutstanding = 0;
  const partners = new Map<string, { name: string; total: number }>();
  for (const inv of outstanding) {
    const residual = numberValue(inv.amount_residual) ?? 0;
    count++;
    totalOutstanding += Math.max(0, residual);
    const partner = inv.partner_id;
    const pid = Array.isArray(partner) ? Number(partner[0]) : Number(partner);
    const pname = Array.isArray(partner) ? String(partner[1] ?? "—") : "—";
    if (Number.isFinite(pid) && pid > 0) {
      const cur = partners.get(String(pid)) ?? { name: pname, total: 0 };
      cur.total += Math.max(0, residual);
      if (pname !== "—") cur.name = pname;
      partners.set(String(pid), cur);
    }
  }
  const partnerCount = partners.size;
  const note = `${count} posted customer invoices with outstanding credits (invoice_has_outstanding); ${partnerCount} customers; Σ outstanding ${totalOutstanding.toFixed(2)} EGP.`;
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

function businessHoursExcludingFridays(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0 || Number.isNaN(totalMs)) return 0;
  let fridayMs = 0;
  const firstDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const lastDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  for (let day = firstDay; day <= lastDay; day += msPerDay) {
    if (new Date(day).getUTCDay() !== 5) continue;
    const oStart = Math.max(day, start.getTime());
    const oEnd = Math.min(day + msPerDay, end.getTime());
    if (oEnd > oStart) fridayMs += oEnd - oStart;
  }
  return (totalMs - fridayMs) / (1000 * 60 * 60);
}

async function calculateInvoicingDelay(uid: number, password: string, thresholdHours: number, window?: ScorecardWindow, excludeFridays?: boolean) {
  const pickings = await fetchOdooBatches({
    model: "stock.picking",
    fields: ["id", "date_done", "origin", "sale_id"],
    domain: [["state", "=", "done"], ["date_done", "!=", false]],
    batchSize: 500,
  });
  const invoiceDomain: unknown[] = [["move_type", "=", "out_invoice"], ["state", "=", "posted"]];
  if (window?.from) invoiceDomain.push(["create_date", ">=", `${window.from}T00:00:00`]);
  if (window?.to) invoiceDomain.push(["create_date", "<=", `${window.to}T23:59:59.999`]);
  const invoices = await fetchOdooBatches({
    model: "account.move",
    fields: ["id", "create_date", "invoice_origin"],
    domain: invoiceDomain,
    batchSize: 500,
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
    const diffHours = excludeFridays
      ? businessHoursExcludingFridays(deliveryDate, invoiceCreated)
      : (invoiceCreated.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60);
    if (diffHours > thresholdHours) lateCount++;
  }
  const pct = totalWithDelivery > 0 ? Math.round((lateCount / totalWithDelivery) * 100) : 0;
  const range = window && (window.from || window.to) ? ` (${window.from || "…"} → ${window.to || "…"})` : "";
  const note = `${lateCount} of ${totalWithDelivery} invoices created > ${thresholdHours}${excludeFridays ? " business" : ""} hours after delivery (${pct}%${excludeFridays ? ", Fridays excluded" : ""})${range}.`;
  return { value: pct, note, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateInvoicingOver12h(uid: number, password: string, window?: ScorecardWindow) {
  return calculateInvoicingDelay(uid, password, 12, window);
}

async function calculateInvoicingOver24h(uid: number, password: string, window?: ScorecardWindow) {
  return calculateInvoicingDelay(uid, password, 24, window, true);
}

async function calculateOrdersToInvoice(uid: number, password: string) {
  const cairoParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const cy = cairoParts.find(p => p.type === "year")?.value ?? "2020";
  const cm = cairoParts.find(p => p.type === "month")?.value ?? "01";
  const cd = cairoParts.find(p => p.type === "day")?.value ?? "01";
  const cairoClock = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const cairoClockUtcMinutes = (Number(cairoClock.find(p => p.type === "hour")?.value ?? 0) * 60) + Number(cairoClock.find(p => p.type === "minute")?.value ?? 0) + (Number(cairoClock.find(p => p.type === "second")?.value ?? 0) / 60);
  const utcMinutes = (new Date().getUTCHours() * 60) + new Date().getUTCMinutes() + (new Date().getUTCSeconds() / 60);
  const cairoOffsetMin = (cairoClockUtcMinutes - utcMinutes + 1440) % 1440;
  const todayStartUtcMs = new Date(`${cy}-${cm}-${cd}T00:00:00Z`).getTime() - cairoOffsetMin * 60000;
  const todayStr = new Date(todayStartUtcMs).toISOString().slice(0, 19).replace("T", " ");
  const saleCount = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "sale.order",
    methodName: "search_count",
    args: [[["invoice_status", "=", "to invoice"], ["state", "=", "sale"], ["date_order", "<", todayStr]]],
    kwargs: {},
  });
  let purchaseCount = 0;
  try {
    const poRows = await executeOdooKwWithCredentials({
      uid,
      password,
      model: "purchase.order",
      methodName: "search_read",
      args: [[["invoice_status", "=", "to invoice"]]],
      kwargs: { fields: ["id", "date_order"], limit: 5000 },
    });
    if (Array.isArray(poRows)) {
      const nowMs = Date.now();
      purchaseCount = poRows.filter((r: Record<string, unknown>) => {
        if (!r.date_order) return false;
        const t = new Date(`${String(r.date_order).replace(" ", "T")}Z`);
        if (Number.isNaN(t.getTime())) return false;
        return nowMs - t.getTime() > 48 * 60 * 60 * 1000;
      }).length;
    }
  } catch { /* model may not exist */ }
  const draftCount = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move",
    methodName: "search_count",
    args: [[["state", "=", "draft"], ["move_type", "=", "out_invoice"], ["create_date", "<", todayStr]]],
    kwargs: {},
  });
  const count = (Number.isFinite(saleCount) ? Number(saleCount) : 0) + purchaseCount + (Number.isFinite(draftCount) ? Number(draftCount) : 0);
  return { value: count, note: `${count} orders/invoices awaiting billing (excl. today, Cairo): ${Number.isFinite(saleCount) ? saleCount : 0} sale orders, ${purchaseCount} purchase orders (over 48h), ${Number.isFinite(draftCount) ? draftCount : 0} draft customer invoices.`, asOf: isoNow(), topVendors: [] as unknown[] };
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
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.account",
    methodName: "search_read",
    args: [["|", ["code", "in", ["1204001", "2201001", "1209001", "1209002"]], ["name", "in", ["Accounts Receivable", "Payables Local", "العهد", "سلف"]]]],
    kwargs: { fields: ["id", "code", "name"], limit: 50, context: { lang: "en_US" } },
  });
  const accountIds = Array.isArray(rows)
    ? rows.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite)
    : [];
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
  return { value: count, note: `${count} posted journal items on AR/AP/custody/loan accounts with no partner.`, asOf: isoNow(), topVendors: [] as unknown[] };
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

type CollectionDsoMode = "cash" | "credit" | "other";

function refIdOrNull(value: unknown): number | null {
  if (Array.isArray(value)) return Number(value[0]);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return null;
}

async function calculateDsoReport(
  uid: number,
  password: string,
  opts: { label: string; companies: number[]; mode: CollectionDsoMode },
): Promise<{ value: number | null; note: string; asOf: string; topVendors?: unknown[] }> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const cutoff = threeMonthsAgo.toISOString().slice(0, 10);
  const rows = await fetchOdooBatches({
    model: "account.move",
    fields: ["id", "partner_id", "commercial_partner_id", "invoice_date", "amount_total", "amount_residual", "company_id"],
    domain: [
      ["move_type", "in", ["out_invoice", "out_refund"]],
      ["state", "=", "posted"],
      ["company_id", "in", opts.companies],
    ],
    batchSize: 1000,
  });
  const partnerIds = [...new Set(rows.map((r) => refIdOrNull(r.commercial_partner_id)).filter((v): v is number => v !== null))];
  const tagsByPartner = new Map<number, Set<number>>();
  for (let i = 0; i < partnerIds.length; i += 500) {
    const chunk = partnerIds.slice(i, i + 500);
    const partners = await fetchOdooBatches({ model: "res.partner", fields: ["id", "category_id"], domain: [["id", "in", chunk]], batchSize: 500 });
    for (const partner of Array.isArray(partners) ? partners : []) {
      const pid = refIdOrNull(partner.id);
      if (pid === null) continue;
      const raw = Array.isArray(partner.category_id) ? partner.category_id : [];
      tagsByPartner.set(pid, new Set(raw.map((c) => refIdOrNull(c)).filter((v): v is number => v !== null)));
    }
  }
  let totalDue = 0;
  let totalSales3m = 0;
  let openCount = 0;
  let matched = 0;
  for (const row of rows) {
    const companyId = refIdOrNull(row.company_id);
    const partnerId = refIdOrNull(row.partner_id);
    if (companyId === null || partnerId === null) continue;
    if ((companyId === 1 && partnerId === 7) || (companyId === 2 && partnerId === 1)) continue;
    const cp = refIdOrNull(row.commercial_partner_id);
    const tags = tagsByPartner.get(cp ?? -1) ?? new Set<number>();
    const isCredit = tags.has(8) && !tags.has(6);
    const isCash = tags.has(6) && !tags.has(8);
    const bucket: CollectionDsoMode = isCredit ? "credit" : isCash ? "cash" : "other";
    if (bucket !== opts.mode) continue;
    matched += 1;
    const residual = numberValue(row.amount_residual);
    const total = numberValue(row.amount_total);
    if (residual === null || total === null) continue;
    if (residual > 0) {
      openCount += 1;
      totalDue += residual;
    }
    const invoiceDate = String(row.invoice_date ?? "").slice(0, 10);
    if (invoiceDate >= cutoff) {
      totalSales3m += total;
    }
  }
  let value: number | null;
  let note: string;
  if (totalSales3m > 0) {
    const ratio = totalDue / totalSales3m;
    value = +(ratio * 90);
    note = `DSO ${opts.label} (days) = (total due ${totalDue.toFixed(2)} / total sales 3 months ${totalSales3m.toFixed(2)}) × 90 = ${value.toFixed(2)} days; ${openCount} open of ${matched} matched invoices (customer tag split, intercompany excluded).`;
  } else {
    value = null;
    note = `No ${opts.label} sales in the last 3 months (cutoff ${cutoff}); cannot compute DSO.`;
  }
  return { value, note, asOf: isoNow(), topVendors: [] as unknown[] };
}

const COLLECTION_SNAPSHOTS: Record<string, string> = {
  "collection_form.csv": collectionFormCsv,
  "collection_aging.csv": collectionAgingCsv,
};

function parseCsvDocument(text: string): string[][] {
  const cleaned = text.split(/\r?\n/).filter((line) => !line.trimStart().startsWith("#")).join("\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else if (ch !== "\r") {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((record) => record.some((cell) => cell !== ""));
}

async function loadCollectionFile(fileName: string): Promise<{ rows: string[][]; meta: string }> {
  const text = COLLECTION_SNAPSHOTS[fileName];
  if (!text) {
    throw new Error(`Collection snapshot not embedded: ${fileName}; regenerate collection-data/collection_snapshots.ts from the latest xlsx and deploy the edge function.`);
  }
  const metaLine = text.split(/\r?\n/).find((line) => line.trimStart().startsWith("#"))?.trim().replace(/^#\s*/, "") ?? "";
  return { rows: parseCsvDocument(text), meta: metaLine };
}

function columnIndex(header: string[], columnName: string): number {
  const idx = header.findIndex((cell) => String(cell).trim() === columnName);
  if (idx < 0) {
    throw new Error(`Column "${columnName}" not found in collection CSV header: ${header.join(" | ")}`);
  }
  return idx;
}

function cellNumber(cell: unknown): number {
  const n = Number(String(cell ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

async function calculateCollectionTotalCollected(): Promise<{ value: number | null; note: string; asOf: string; topVendors?: unknown[] }> {
  const { rows, meta } = await loadCollectionFile("collection_form.csv");
  const header = rows[0];
  const idIdx = columnIndex(header, "ID");
  const amountIdx = columnIndex(header, "اجمالي المحصل");
  let visits = 0;
  let total = 0;
  for (const record of rows.slice(1)) {
    if (!String(record[idIdx] ?? "").trim()) continue;
    visits += 1;
    total += cellNumber(record[amountIdx]);
  }
  const value = total > 0 ? Math.round(total * 100) / 100 : 0;
  return { value, note: `Sum of "اجمالي المحصل" across ${visits} collection team submissions. ${meta}`, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateCollectionTotalVisits(): Promise<{ value: number | null; note: string; asOf: string; topVendors?: unknown[] }> {
  const { rows, meta } = await loadCollectionFile("collection_form.csv");
  const header = rows[0];
  const idIdx = columnIndex(header, "ID");
  let visits = 0;
  for (const record of rows.slice(1)) {
    if (String(record[idIdx] ?? "").trim()) visits += 1;
  }
  return { value: visits, note: `${visits} collection team visits recorded (Form submissions). ${meta}`, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function calculateCollectionDueOver60(): Promise<{ value: number | null; note: string; asOf: string; topVendors?: unknown[] }> {
  const { rows, meta } = await loadCollectionFile("collection_aging.csv");
  const header = rows[0];
  const nameIdx = columnIndex(header, "المتأخر المدين");
  const bucketIndexes = ["61-90", "91-120", "أقدم"].map((bucket) => columnIndex(header, bucket));
  let customers = 0;
  let total = 0;
  for (const record of rows.slice(1)) {
    if (!String(record[nameIdx] ?? "").trim()) continue;
    customers += 1;
    for (const idx of bucketIndexes) {
      total += cellNumber(record[idx]);
    }
  }
  const value = total > 0 ? Math.round(total * 100) / 100 : 0;
  return { value, note: `Total due > 60 days = (61-90 + 91-120 + أقدم) across ${customers} customers (Aged Receivable). ${meta}`, asOf: isoNow(), topVendors: [] as unknown[] };
}

async function fetchCashCustomerIds(uid: number, password: string): Promise<number[]> {
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "res.partner",
    methodName: "search_read",
    args: [[["category_id", "in", [6]]]],
    kwargs: { fields: ["id"], limit: 10000 },
  });
  if (!Array.isArray(rows)) return [];
  return rows.map((r: Record<string, unknown>) => {
    const v = r.id;
    return Array.isArray(v) ? (v[0] as number) : (v as number);
  }).filter((id) => Number.isFinite(id));
}

async function calculateUnpaidCash(uid: number, password: string, companyId: number, companyKey: string, companyLabel: string) {
  const config = SCORECARD_DEFS[companyKey];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) throw new Error(`No readable fields for ${source.model}.`);
  const cashIds = await fetchCashCustomerIds(uid, password);
  if (cashIds.length === 0) {
    return { value: 0, note: `No cash customers found (tag "عملاء كاش").`, asOf: isoNow(), topVendors: [] as unknown[] };
  }
  const today = new Date().toISOString().slice(0, 10);
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [[
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
      ["company_id", "=", companyId],
      ["partner_id", "in", cashIds],
      ["payment_state", "in", ["not_paid", "partial"]],
      ["invoice_date_due", "<", today],
    ]],
    kwargs: { fields, limit: 10000 },
  });
  if (!Array.isArray(rows)) throw new Error("Odoo account.move returned an unexpected payload.");
  const byPartner = new Map<number, { name: string; count: number; total: number }>();
  let totalDue = 0;
  let invoiceCount = 0;
  for (const row of rows) {
    const residual = numberValue(row.amount_residual);
    if (residual === null || residual <= 0) continue;
    totalDue += residual;
    invoiceCount += 1;
    const pid = Array.isArray(row.partner_id) ? (row.partner_id[0] as number) : (row.partner_id as number);
    if (!Number.isFinite(pid)) continue;
    const name = Array.isArray(row.partner_id) && row.partner_id.length > 1 ? String(row.partner_id[1]) : `#${pid}`;
    const entry = byPartner.get(pid) ?? { name, count: 0, total: 0 };
    entry.name = name;
    entry.count += 1;
    entry.total += residual;
    byPartner.set(pid, entry);
  }
  const customerCount = byPartner.size;
  const note = `${customerCount} cash customers (${companyLabel}) · ${invoiceCount} overdue invoices · Σ ${totalDue.toFixed(2)} EGP.`;
  return {
    value: totalDue,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, customerCount, topVendors: [] as unknown[] },
  };
}

async function calculateUnpaidCashMas(uid: number, password: string) {
  return calculateUnpaidCash(uid, password, 1, "collection.unpaid_cash_mas", "MAS");
}

async function calculateUnpaidCashHoreca(uid: number, password: string) {
  return calculateUnpaidCash(uid, password, 2, "collection.unpaid_cash_horeca", "Horeca");
}

async function calculateSalesApprovedCreditPolicy(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["collection.sales_approved_credit_policy"];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) throw new Error(`No readable fields for ${source.model}.`);
  const cashIds = await fetchCashCustomerIds(uid, password);
  if (cashIds.length === 0) {
    return { value: null, note: `No cash customers found (tag "عملاء كاش").`, asOf: isoNow(), topVendors: [] as unknown[] };
  }
  const today = new Date().toISOString().slice(0, 10);
  const orderDomain: unknown[] = [
    ["state", "in", ["sale", "done"]],
    ["partner_id", "in", cashIds],
  ];
  if (window?.from) orderDomain.push(["date_order", ">=", `${window.from}T00:00:00`]);
  if (window?.to) orderDomain.push(["date_order", "<=", `${window.to}T23:59:59.999`]);
  const orders = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "sale.order",
    methodName: "search_read",
    args: [orderDomain],
    kwargs: { fields: ["id", "partner_id"], limit: 20000 },
  });
  if (!Array.isArray(orders)) throw new Error("Odoo sale.order returned an unexpected payload.");
  const orderedPartnerIds = new Set<number>();
  for (const row of orders) {
    const pid = Array.isArray(row.partner_id) ? (row.partner_id[0] as number) : (row.partner_id as number);
    if (Number.isFinite(pid)) orderedPartnerIds.add(pid);
  }
  const totalCustomers = orderedPartnerIds.size;
  if (totalCustomers === 0) {
    const label = window ? (window.from && window.to ? `${window.from} → ${window.to}` : window.from || window.to) : "period";
    return { value: 0, note: `No confirmed cash-customer orders in the selected ${label}.`, asOf: isoNow(), topVendors: [] as unknown[] };
  }
  const overdueInvoices = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "account.move",
    methodName: "search_read",
    args: [[
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
      ["partner_id", "in", Array.from(orderedPartnerIds)],
      ["payment_state", "in", ["not_paid", "partial"]],
      ["invoice_date_due", "<", today],
    ]],
    kwargs: { fields: ["id", "partner_id"], limit: 20000 },
  });
  const overduePartnerIds = new Set<number>();
  if (Array.isArray(overdueInvoices)) {
    for (const row of overdueInvoices) {
      const pid = Array.isArray(row.partner_id) ? (row.partner_id[0] as number) : (row.partner_id as number);
      if (Number.isFinite(pid)) overduePartnerIds.add(pid);
    }
  }
  const overdueTotal = overduePartnerIds.size;
  const approved = totalCustomers - overdueTotal;
  const pct = (approved / totalCustomers) * 100;
  const label = window ? (window.from && window.to ? `${window.from} → ${window.to}` : window.from || window.to) : "selected period";
  const note = `${totalCustomers} cash customers had confirmed orders (${label}); ${overdueTotal} of them currently have overdue invoices; ${approved} approved → ${pct.toFixed(2)}%.`;
  return {
    value: Math.round(pct * 100) / 100,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, totalCustomers, overdueCustomers: overdueTotal, approvedCustomers: approved, topVendors: [] as unknown[] },
  };
}

async function calculateGmvMas(uid: number, password: string, window?: ScorecardWindow) {
  return calculateGmv(uid, password, "sales.gmv_mas", 1, "MAS", window);
}

async function calculateGmvHoreca(uid: number, password: string, window?: ScorecardWindow) {
  return calculateGmv(uid, password, "sales.gmv_horeca", 2, "Horeca", window);
}

async function calculateGmv(uid: number, password: string, configKey: string, companyId: number, label: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS[configKey as keyof typeof SCORECARD_DEFS];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) throw new Error(`No readable fields for ${source.model}.`);
  const salesWin = salesWindow(window);
  const domain: unknown[] = [
    ["move_type", "=", "out_invoice"],
    ["state", "=", "posted"],
    ["company_id", "=", companyId],
  ];
  const intercoPartner = INTERCO_PARTNER_ID[companyId];
  if (intercoPartner) domain.push(["partner_id", "!=", intercoPartner]);
  domain.push(["invoice_date", ">=", salesWin.fromDate]);
  domain.push(["invoice_date", "<=", salesWin.toDate]);
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [domain],
    kwargs: { fields, limit: 40000 },
  });
  if (!Array.isArray(rows)) throw new Error("Odoo account.move returned an unexpected payload.");
  let total = 0;
  let untaxed = 0;
  let invoiceCount = 0;
  const customers = new Set<number>();
  for (const row of rows) {
    const amount = numberValue(row.amount_total);
    if (amount === null) continue;
    total += amount;
    invoiceCount += 1;
    const gpidv = row.partner_id;
    const gpid = Array.isArray(gpidv) ? (gpidv[0] as number) : (gpidv as number);
    if (Number.isFinite(gpid)) customers.add(gpid);
    const utx = numberValue(row.amount_untaxed);
    if (utx !== null) untaxed += utx;
  }
  const periodLabel = `${salesWin.fromDate} → ${salesWin.toDate}`;
  const note = `${invoiceCount} posted ${label} invoices (${periodLabel}) · Σ ${total.toFixed(2)} EGP (untaxed ${untaxed.toFixed(2)}).`;
  return {
    value: Math.round(total * 100) / 100,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, invoiceCount, customerCount: customers.size, average: customers.size > 0 ? Math.round((total / customers.size) * 100) / 100 : null, untaxed: Math.round(untaxed * 100) / 100, topVendors: [] as unknown[] },
  };
}

async function calculateMasCustomers(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  return calculateCustomers(uid, password, "sales.mas_customers", 1, "MAS", window);
}

async function calculateHorecaCustomers(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  return calculateCustomers(uid, password, "sales.horeca_customers", 2, "Horeca", window);
}

async function calculateCustomers(uid: number, password: string, configKey: "sales.mas_customers" | "sales.horeca_customers", companyId: number, label: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  const config = SCORECARD_DEFS[configKey];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) throw new Error(`No readable fields for ${source.model}.`);
  const win = salesWindow(window);
  const domain: unknown[] = [
    ["state", "in", ["sale", "done"]],
    ["company_id", "=", companyId],
  ];
  const intercoPartner = INTERCO_PARTNER_ID[companyId];
  if (intercoPartner) domain.push(["partner_id", "!=", intercoPartner]);
  domain.push(["date_order", ">=", win.from]);
  domain.push(["date_order", "<=", win.to]);
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [domain],
    kwargs: { fields, limit: 40000 },
  });
  if (!Array.isArray(rows)) throw new Error("Odoo sale.order returned an unexpected payload.");
  const customers = new Set<number>();
  for (const row of rows) {
    const pid = Array.isArray(row.partner_id) ? (row.partner_id[0] as number) : (row.partner_id as number);
    if (Number.isFinite(pid)) customers.add(pid);
  }
  const label2 = `${win.fromDate} → ${win.toDate}`;
  const note = `${customers.size} distinct ${label} customers with confirmed orders (${label2}).`;
  return {
    value: customers.size,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, topVendors: [] as unknown[] },
  };
}

async function calculateMasOrders(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  return calculateOrders(uid, password, "sales.mas_average_order", 1, "MAS", window);
}

async function calculateHorecaOrders(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  return calculateOrders(uid, password, "sales.horeca_average_order", 2, "Horeca", window);
}

async function calculateOrders(uid: number, password: string, configKey: "sales.mas_average_order" | "sales.horeca_average_order", companyId: number, label: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  const config = SCORECARD_DEFS[configKey];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) throw new Error(`No readable fields for ${source.model}.`);
  const win = salesWindow(window);
  const domain: unknown[] = [
    ["state", "in", ["sale", "done"]],
    ["company_id", "=", companyId],
  ];
  const intercoPartner = INTERCO_PARTNER_ID[companyId];
  if (intercoPartner) domain.push(["partner_id", "!=", intercoPartner]);
  domain.push(["date_order", ">=", win.from]);
  domain.push(["date_order", "<=", win.to]);
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [domain],
    kwargs: { fields, limit: 40000 },
  });
  if (!Array.isArray(rows)) throw new Error("Odoo sale.order returned an unexpected payload.");
  let orderCount = 0;
  let customerCount = 0;
  let totalAmount = 0;
  const customers = new Set<number>();
  for (const row of rows) {
    orderCount += 1;
    const amt = numberValue(row.amount_total);
    if (amt !== null) totalAmount += amt;
    const pid = Array.isArray(row.partner_id) ? (row.partner_id[0] as number) : (row.partner_id as number);
    if (Number.isFinite(pid)) customers.add(pid);
  }
  customerCount = customers.size;
  const avg = customerCount > 0 ? totalAmount / customerCount : 0;
  const label2 = `${win.fromDate} → ${win.toDate}`;
  const note = `${orderCount} confirmed ${label} orders by ${customerCount} customers (${label2}) · GMV ${totalAmount.toFixed(2)} EGP ÷ ${customerCount} customers = ${avg.toFixed(2)} EGP avg order.`;
  return {
    value: orderCount,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, orderCount, customerCount, average: customerCount > 0 ? Math.round((orderCount / customerCount) * 100) / 100 : null, gmvTotal: Math.round(totalAmount * 100) / 100, topVendors: [] as unknown[] },
  };
}

async function calculateProductsSoldMas(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  return calculateProductsSold(uid, password, "sales.products_sold_mas", 1, "MAS", window);
}

async function calculateProductsSoldHoreca(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  return calculateProductsSold(uid, password, "sales.products_sold_horeca", 2, "Horeca", window);
}

async function calculateProductsSold(uid: number, password: string, configKey: "sales.products_sold_mas" | "sales.products_sold_horeca", companyId: number, companyLabel: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  const config = SCORECARD_DEFS[configKey];
  const source = config.odooSources[0];
  const fields = await readableFields(uid, password, source.model, ["id", "date_order"]);
  if (fields.includes("id") === false) throw new Error(`No readable fields for ${source.model}.`);
  const win = salesWindow(window);
  const domain: unknown[] = [
    ["state", "in", ["sale", "done"]],
    ["company_id", "=", companyId],
  ];
  const intercoPartner = INTERCO_PARTNER_ID[companyId];
  if (intercoPartner) domain.push(["partner_id", "!=", intercoPartner]);
  domain.push(["date_order", ">=", win.from]);
  domain.push(["date_order", "<=", win.to]);
  const orders = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [domain],
    kwargs: { fields: ["id"], limit: 40000 },
  });
  if (!Array.isArray(orders)) throw new Error("Odoo sale.order returned an unexpected payload.");
  const orderIds = orders.map((r: Record<string, unknown>) => Number(r.id)).filter(Number.isFinite);
  let distinctProducts = 0;
  let totalLines = 0;
  if (orderIds.length > 0) {
    const lines = await executeOdooKwWithCredentials({
      uid,
      password,
      model: "sale.order.line",
      methodName: "search_read",
      args: [[["order_id", "in", orderIds], ["product_id", "!=", false]]],
      kwargs: { fields: ["product_id"], limit: 40000 },
    });
    if (!Array.isArray(lines)) throw new Error("Odoo sale.order.line returned an unexpected payload.");
    const productIds = new Set<number>();
    for (const line of lines) {
      const pid = line.product_id;
      const productId = Array.isArray(pid) ? Number(pid[0]) : Number(pid);
      if (Number.isFinite(productId) && productId > 0) productIds.add(productId);
      totalLines += 1;
    }
    distinctProducts = productIds.size;
  }
  const label = `${win.fromDate} → ${win.toDate}`;
  const note = `${distinctProducts} distinct products sold in ${orderIds.length} confirmed ${companyLabel} orders (${label}); ${totalLines} order line(s).`;
  return {
    value: distinctProducts,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, distinctProducts, orderCount: orderIds.length, topVendors: [] as unknown[] },
  };
}

async function calculateCrmActivities(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  const config = SCORECARD_DEFS["sales.crm_activities"];
  const win = salesWindow(window);
  const { count: callsCount, error: callsError } = await supabaseAdmin
    .from("calls")
    .select("id", { count: "exact", head: true })
    .gte("started_at", win.from)
    .lte("started_at", win.to);
  if (callsError) throw new Error(`CRM calls query failed: ${callsError.message}`);
  const { count: odooActivities, error: odooError } = await supabaseAdmin
    .from("odoo_crm_activity_reports")
    .select("id", { count: "exact", head: true })
    .neq("state", "cancel")
    .gte("odoo_created_at", win.from)
    .lte("odoo_created_at", win.to);
  if (odooError) throw new Error(`CRM odoo activities query failed: ${odooError.message}`);
  const calls = callsCount ?? 0;
  const odoo = odooActivities ?? 0;
  const label = `${win.fromDate} → ${win.toDate}`;
  const note = `${calls} calls logged in our system (${label}) · ${odoo} activities from Odoo CRM (${label}).`;
  return {
    value: calls,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, callsCount: calls, odooActivities: odoo, topVendors: [] as unknown[] },
  };
}

async function calculateNewCustomers(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  const config = SCORECARD_DEFS["sales.new_customers"];
  const win = salesWindow(window);
  const count = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "res.partner",
    methodName: "search_count",
    args: [[["company_id", "=", 2], ["is_company", "=", true], ["create_date", ">=", win.from], ["create_date", "<=", win.to]]],
    kwargs: {},
  });
  const currentCount = typeof count === "number" ? count : 0;
  const label = `${win.fromDate} → ${win.toDate}`;
  const weekly: { label: string; dayLabel: string; from: string; to: string; count: number }[] = [];
  const start = new Date(win.from.replace(" ", "T") + "Z");
  for (let i = 0; i < 3; i += 1) {
    const wFrom = new Date(start.getTime() - i * 7 * 24 * 3600 * 1000);
    const wToExclusive = new Date(wFrom.getTime() + 7 * 24 * 3600 * 1000);
    const wTo = new Date(wToExclusive.getTime() - 1000);
    const fromIso = wFrom.toISOString().slice(0, 19).replace("T", " ");
    const toIso = wTo.toISOString().slice(0, 19).replace("T", " ");
    const wCount = await executeOdooKwWithCredentials({
      uid,
      password,
      model: "res.partner",
      methodName: "search_count",
      args: [[["company_id", "=", 2], ["is_company", "=", true], ["create_date", ">=", fromIso], ["create_date", "<=", toIso]]],
      kwargs: {},
    });
    weekly.push({
      label: `${wFrom.toISOString().slice(0, 10)} → ${wTo.toISOString().slice(0, 10)}`,
      dayLabel: `${wFrom.toISOString().slice(5, 10)} → ${wTo.toISOString().slice(5, 10)}`,
      from: fromIso,
      to: toIso,
      count: typeof wCount === "number" ? wCount : 0,
    });
  }
  const weekStartCollapse = !window && win.fromDate === win.toDate;
  const value = weekStartCollapse && currentCount === 0 && weekly[1]?.count != null ? weekly[1].count : currentCount;
  const note = weekStartCollapse && currentCount === 0 && weekly[1] != null
    ? `Week just started (Thursday) — showing last completed week (${weekly[1].label}): ${weekly[1].count} new Horeca customers. Current week-to-date: ${currentCount}.`
    : `${value} new Horeca customers created (${label}).`;
  return {
    value,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, weekly, weeklyAligned: true, topVendors: [] as unknown[] },
  };
}


async function calculateRetentionRate(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  const config = SCORECARD_DEFS["sales.retention_rate"];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthEnd = now;
  const iso = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Active customers this month: distinct partners with confirmed Horeca orders
  const activeOrdersThisMonth = await executeOdooKwWithCredentials({
    uid, password, model: "sale.order", methodName: "search_read",
    args: [[["state", "in", ["sale", "done"]], ["company_id", "=", 2], ["date_order", ">=", iso(monthStart)], ["date_order", "<=", iso(monthEnd)]]],
    kwargs: { fields: ["partner_id"], limit: 40000 },
  });
  const activePartnersThisMonth = new Set<number>();
  if (Array.isArray(activeOrdersThisMonth)) {
    for (const r of activeOrdersThisMonth) {
      const pid = Array.isArray(r.partner_id) ? Number(r.partner_id[0]) : Number(r.partner_id);
      if (Number.isFinite(pid) && pid > 0) activePartnersThisMonth.add(pid);
    }
  }

  // New customers this month: partners created this month that have Horeca orders
  const newPartners = await executeOdooKwWithCredentials({
    uid, password, model: "res.partner", methodName: "search_read",
    args: [[["company_id", "=", 2], ["is_company", "=", true], ["create_date", ">=", iso(monthStart)], ["create_date", "<=", iso(monthEnd)]]],
    kwargs: { fields: ["id"], limit: 40000 },
  });
  const newPartnerIds = new Set<number>();
  if (Array.isArray(newPartners)) {
    for (const r of newPartners) {
      const pid = Number(r.id);
      if (Number.isFinite(pid) && pid > 0) newPartnerIds.add(pid);
    }
  }

  // Active customers last month
  const activeOrdersLastMonth = await executeOdooKwWithCredentials({
    uid, password, model: "sale.order", methodName: "search_read",
    args: [[["state", "in", ["sale", "done"]], ["company_id", "=", 2], ["date_order", ">=", iso(prevMonthStart)], ["date_order", "<", iso(monthStart)]]],
    kwargs: { fields: ["partner_id"], limit: 40000 },
  });
  const activePartnersLastMonth = new Set<number>();
  if (Array.isArray(activeOrdersLastMonth)) {
    for (const r of activeOrdersLastMonth) {
      const pid = Array.isArray(r.partner_id) ? Number(r.partner_id[0]) : Number(r.partner_id);
      if (Number.isFinite(pid) && pid > 0) activePartnersLastMonth.add(pid);
    }
  }

  const activeCount = activePartnersThisMonth.size;
  const newCount = activePartnersThisMonth.size > 0
    ? [...activePartnersThisMonth].filter(p => newPartnerIds.has(p)).length
    : 0;
  const retainedCount = activeCount - newCount;
  const prevActiveCount = activePartnersLastMonth.size;
  const value = prevActiveCount > 0 ? Math.round((retainedCount / prevActiveCount) * 10000) / 100 : null;
  const label = `${fmt(monthStart)} → ${fmt(monthEnd)}`;
  const note = `${activeCount} active customers this month, ${newCount} new, ${retainedCount} retained / ${prevActiveCount} active last month = ${value !== null ? value + "%" : "N/A"} (${label}).`;

  const win = salesWindow(window);
  const bins = salesWeeklyBins(win, 4);
  const activeSets = await collectWeeklyActive(uid, password, bins);
  const createdSets = await collectWeeklyCreated(uid, password, bins);
  const weekly: { label: string; dayLabel: string; from: string; to: string; count: number }[] = bins.slice(0, 3).map((b, i) => {
    let newW = 0;
    if (activeSets[i].size > 0 && createdSets[i].size > 0) {
      for (const pid of activeSets[i]) if (createdSets[i].has(pid)) newW++;
    }
    const retainedW = activeSets[i].size - newW;
    const prevW = activeSets[i + 1]?.size ?? 0;
    const wv = prevW > 0 ? Math.round((retainedW / prevW) * 10000) / 100 : 0;
    return { label: b.label, dayLabel: b.dayLabel, from: b.from, to: b.to, count: wv };
  });

  return { value, note, asOf: isoNow(), metadata: { module: config.module, view: config.view, field: config.field, activeCount, newCount, retainedCount, prevActiveCount, weekly, topVendors: [] as unknown[] } };
}

async function calculateSalesByApp(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  const config = SCORECARD_DEFS["sales.sales_by_app"];
  const win = salesWindow(window);
  const weekStartCollapse = !window && win.fromDate === win.toDate;
  const effWin = weekStartCollapse
    ? salesWindow({ from: shiftDateDays(win.fromDate, -7), to: shiftDateDays(win.toDate, -1) })
    : win;
  const domain: unknown[] = [
    ["state", "in", ["sale", "done"]],
    ["company_id", "=", 2],
  ];
  domain.push(["date_order", ">=", effWin.from]);
  domain.push(["date_order", "<=", effWin.to]);
  const rows = await executeOdooKwWithCredentials({
    uid, password, model: "sale.order", methodName: "search_read",
    args: [domain],
    kwargs: { fields: ["id", "pricelist_id"], limit: 40000 },
  });
  let totalCount = 0;
  let appCount = 0;
  if (Array.isArray(rows)) {
    totalCount = rows.length;
    for (const r of rows) {
      const pl = r.pricelist_id;
      const plId = Array.isArray(pl) ? Number(pl[0]) : Number(pl);
      if (plId === 14) appCount++;
    }
  }
  const value = totalCount > 0 ? Math.round((appCount / totalCount) * 10000) / 100 : null;
  const label = `${effWin.fromDate} → ${effWin.toDate}`;
  const note = weekStartCollapse
    ? `Week just started (Thursday) — showing last completed week (${effWin.fromDate} → ${effWin.toDate}): ${appCount} of ${totalCount} Horeca orders via App Pricelist (${value !== null ? value + "%" : "N/A"}).`
    : `${appCount} of ${totalCount} Horeca orders via App Pricelist (${value !== null ? value + "%" : "N/A"}) (${label}).`;

  const bins = salesWeeklyBins(win, 3);
  const weekly: { label: string; dayLabel: string; from: string; to: string; count: number }[] = [];
  const wkRows = await executeOdooKwWithCredentials({
    uid, password, model: "sale.order", methodName: "search_read",
    args: [[["state", "in", ["sale", "done"]], ["company_id", "=", 2], ["date_order", ">=", bins[2].from], ["date_order", "<=", bins[0].to]]],
    kwargs: { fields: ["id", "pricelist_id", "date_order"], limit: 60000 },
  });
  const totalByBin = [0, 0, 0];
  const appByBin = [0, 0, 0];
  if (Array.isArray(wkRows)) {
    for (const r of wkRows) {
      const pl = r.pricelist_id;
      const plId = Array.isArray(pl) ? Number(pl[0]) : Number(pl);
      const dt = typeof r.date_order === "string" ? r.date_order : "";
      for (let i = 0; i < 3; i += 1) {
        if (dt >= bins[i].from && dt <= bins[i].to) {
          totalByBin[i]++;
          if (plId === 14) appByBin[i]++;
          break;
        }
      }
    }
  }
  for (let i = 0; i < 3; i += 1) {
    weekly.push({
      label: bins[i].label,
      dayLabel: bins[i].dayLabel,
      from: bins[i].from,
      to: bins[i].to,
      count: totalByBin[i] > 0 ? Math.round((appByBin[i] / totalByBin[i]) * 10000) / 100 : 0,
    });
  }

  return { value, note, asOf: isoNow(), metadata: { module: config.module, view: config.view, field: config.field, appCount, totalCount, weekly, weeklyAligned: true, topVendors: [] as unknown[] } };
}

async function calculateActiveCustomers(uid: number, password: string, window?: ScorecardWindow): Promise<{ value: number | null; note: string; asOf: string; metadata?: Record<string, unknown> }> {
  const config = SCORECARD_DEFS["sales.active_customers"];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  const rows = await executeOdooKwWithCredentials({
    uid, password, model: "sale.order", methodName: "search_read",
    args: [[["state", "in", ["sale", "done"]], ["company_id", "=", 2], ["date_order", ">=", iso(thirtyDaysAgo)], ["date_order", "<=", iso(now)]]],
    kwargs: { fields: ["partner_id"], limit: 40000 },
  });
  const partners = new Set<number>();
  if (Array.isArray(rows)) {
    for (const r of rows) {
      const pid = Array.isArray(r.partner_id) ? Number(r.partner_id[0]) : Number(r.partner_id);
      if (Number.isFinite(pid) && pid > 0) partners.add(pid);
    }
  }
  const value = partners.size;
  const note = `${value} distinct Horeca customers with confirmed orders in the last 30 days.`;

  const bins = salesWeeklyBins(salesWindow(window), 3);
  const activeSets = await collectWeeklyActive(uid, password, bins);
  const weekly: { label: string; dayLabel: string; from: string; to: string; count: number }[] = bins.map((b, i) => ({
    label: b.label,
    dayLabel: b.dayLabel,
    from: b.from,
    to: b.to,
    count: activeSets[i]?.size ?? 0,
  }));

  return { value, note, asOf: isoNow(), metadata: { module: config.module, view: config.view, field: config.field, customerCount: value, weekly, topVendors: [] as unknown[] } };
}

function purchaseRecordId(value: unknown): number | null {
  const id = Array.isArray(value) ? Number(value[0]) : Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function calculateStockOutTop100(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["purchase.stockout_top100"];
  const toDate = todayCairoDate();
  const fromDate = shiftDateDays(toDate, -365);
  const win = salesWindow({ from: fromDate, to: toDate });
  const orders = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "sale.order",
    methodName: "search_read",
    args: [[["state", "in", ["sale", "done"]], ["date_order", ">=", win.from], ["date_order", "<=", win.to], ["partner_id", "not in", [1, 7]]]],
    kwargs: { fields: ["id"], limit: 100000 },
  });
  const orderIds = (Array.isArray(orders) ? orders : []).map((row) => Number(row.id)).filter(Number.isFinite);
  const qtyByProduct = new Map<number, number>();
  if (orderIds.length > 0) {
    const lines = await executeOdooKwWithCredentials({
      uid,
      password,
      model: "sale.order.line",
      methodName: "search_read",
      args: [[["order_id", "in", orderIds], ["product_id", "!=", false], ["product_uom_qty", ">", 0]]],
      kwargs: { fields: ["product_id", "product_uom_qty"], limit: 200000 },
    });
    if (Array.isArray(lines)) {
      for (const line of lines) {
        const productId = purchaseRecordId(line.product_id);
        const qty = numberValue(line.product_uom_qty);
        if (productId === null || qty === null) continue;
        qtyByProduct.set(productId, (qtyByProduct.get(productId) ?? 0) + qty);
      }
    }
  }
  const top = Array.from(qtyByProduct.entries()).sort((a, b) => b[1] - a[1]).slice(0, 100);
  let stockoutCount = 0;
  const stockoutProducts: unknown[] = [];
  if (top.length > 0) {
    const products = await executeOdooKwWithCredentials({
      uid,
      password,
      model: "product.product",
      methodName: "search_read",
      args: [[["id", "in", top.map(([productId]) => productId)]]],
      kwargs: { fields: ["id", "name", "qty_available"], limit: 500 },
    });
    const availableById = new Map<number, number>();
    const nameById = new Map<number, string>();
    if (Array.isArray(products)) {
      for (const product of products) {
        const productId = Number(product.id);
        const available = numberValue(product.qty_available);
        if (available !== null) availableById.set(productId, available);
        nameById.set(productId, String(product.name ?? productId));
      }
    }
    for (const [productId, soldQty] of top) {
      const available = availableById.get(productId) ?? 0;
      if (available <= 0) {
        stockoutCount += 1;
        if (stockoutProducts.length < 8) {
          stockoutProducts.push({ id: productId, name: nameById.get(productId) ?? String(productId), outstanding: Math.round(available * 100) / 100 });
        }
      }
    }
  }
  const stockOutPct = top.length > 0 ? Math.round((stockoutCount / top.length) * 1000) / 10 : 0;
  const note = `${stockOutPct}% of our top ${top.length} best-sellers (ranked by units sold over the last 12 months) are currently out of stock (qty_available <= 0).`;
  return {
    value: stockOutPct,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, topVendors: [] as unknown[] },
  };
}

async function calculateStockOutProducts(uid: number, password: string) {
  const config = SCORECARD_DEFS["purchase.stockout_products"];
  const count = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "product.product",
    methodName: "search_count",
    args: [[["active", "=", true], ["qty_available", "<=", 0]]],
    kwargs: {},
  });
  const currentCount = typeof count === "number" ? count : 0;
  const note = `${currentCount} products out of stock (qty_available <= 0).`;
  return {
    value: currentCount,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, topVendors: [] as unknown[] },
  };
}

async function calculateAvailableProducts(uid: number, password: string) {
  const config = SCORECARD_DEFS["purchase.available_products"];
  const count = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "product.product",
    methodName: "search_count",
    args: [[["active", "=", true], ["qty_available", ">", 0]]],
    kwargs: {},
  });
  const currentCount = typeof count === "number" ? count : 0;
  const note = `${currentCount} products in stock (qty_available > 0).`;
  return {
    value: currentCount,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, topVendors: [] as unknown[] },
  };
}

async function calculateNewProducts(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["purchase.new_products"];
  const win = salesWindow(window);
  const effFromDate = window?.from?.trim() ? win.fromDate : `${win.toDate.slice(0, 8)}01`;
  const weekWin = salesWindow({ from: effFromDate, to: win.toDate });
  const count = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "product.template",
    methodName: "search_count",
    args: [[["create_date", ">=", weekWin.from], ["create_date", "<=", weekWin.to]]],
    kwargs: {},
  });
  const currentCount = typeof count === "number" ? count : 0;
  const note = `${currentCount} new products created (${weekWin.fromDate} → ${weekWin.toDate}).`;
  return {
    value: currentCount,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, topVendors: [] as unknown[] },
  };
}

async function calculateProductsPurchased(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["purchase.products_purchased"];
  const win = salesWindow(window);
  const orders = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "purchase.order",
    methodName: "search_read",
    args: [[["state", "in", ["purchase", "done"]], ["date_order", ">=", win.from], ["date_order", "<=", win.to]]],
    kwargs: { fields: ["id"], limit: 40000 },
  });
  const orderIds = (Array.isArray(orders) ? orders : []).map((row) => Number(row.id)).filter(Number.isFinite);
  let distinctProducts = 0;
  let totalLines = 0;
  if (orderIds.length > 0) {
    const lines = await executeOdooKwWithCredentials({
      uid,
      password,
      model: "purchase.order.line",
      methodName: "search_read",
      args: [[["order_id", "in", orderIds], ["product_id", "!=", false]]],
      kwargs: { fields: ["product_id"], limit: 40000 },
    });
    if (Array.isArray(lines)) {
      const productIds = new Set<number>();
      for (const line of lines) {
        const productId = purchaseRecordId(line.product_id);
        if (productId !== null) productIds.add(productId);
        totalLines += 1;
      }
      distinctProducts = productIds.size;
    }
  }
  const label = `${win.fromDate} → ${win.toDate}`;
  const note = `${distinctProducts} distinct products purchased in ${orderIds.length} confirmed purchase orders (${label}); ${totalLines} line(s).`;
  return {
    value: distinctProducts,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, distinctProducts, orderCount: orderIds.length, topVendors: [] as unknown[] },
  };
}

async function calculatePurchaseOrders(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["purchase.purchase_orders"];
  const win = salesWindow(window);
  const count = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "purchase.order",
    methodName: "search_count",
    args: [[["state", "in", ["purchase", "done"]], ["date_order", ">=", win.from], ["date_order", "<=", win.to]]],
    kwargs: {},
  });
  const currentCount = typeof count === "number" ? count : 0;
  const label = `${win.fromDate} → ${win.toDate}`;
  const note = `${currentCount} confirmed purchase orders (purchase/done) created (${label}).`;
  return {
    value: currentCount,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, orderCount: currentCount, topVendors: [] as unknown[] },
  };
}

async function calculateAccuracyOfPurchase(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["purchase.accuracy_of_purchase"];
  const win = salesWindow(window);
  const orders = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "purchase.order",
    methodName: "search_read",
    args: [[["state", "in", ["purchase", "done"]], ["date_order", ">=", win.from], ["date_order", "<=", win.to]]],
    kwargs: { fields: ["id"], limit: 40000 },
  });
  const orderIds = (Array.isArray(orders) ? orders : []).map((row) => Number(row.id)).filter(Number.isFinite);
  let ordered = 0;
  let billed = 0;
  let lines = 0;
  if (orderIds.length > 0) {
    const raw = await fetchOdooBatches({
      model: "purchase.order.line",
      domain: [["order_id", "in", orderIds], ["product_qty", ">", 0]],
      fields: ["product_qty", "qty_invoiced"],
      maxRows: 100000,
    });
    for (const row of raw) {
      const orderQty = numberValue(row.product_qty);
      const invoiceQty = numberValue(row.qty_invoiced);
      if (orderQty !== null) ordered += orderQty;
      if (invoiceQty !== null) billed += invoiceQty;
      lines += 1;
    }
  }
  const accuracy = ordered > 0 ? Math.round((billed / ordered) * 10000) / 100 : null;
  const label = `${win.fromDate} → ${win.toDate}`;
  const note = `${accuracy ?? 0}% billed vs ordered across ${lines} line(s) of ${orderIds.length} confirmed purchase orders (${label}).`;
  return {
    value: accuracy,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, orderCount: orderIds.length, topVendors: [] as unknown[] },
  };
}

async function calculateReceiptsDate24h(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["purchase.receipts_date_24h"];
  const win = salesWindow(window);
  const orders = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "purchase.order",
    methodName: "search_read",
    args: [[["state", "in", ["purchase", "done"]], ["date_order", ">=", win.from], ["date_order", "<=", win.to]]],
    kwargs: { fields: ["id", "name", "date_order"], limit: 40000 },
  });
  const orderRows = Array.isArray(orders) ? orders : [];
  const poById = new Map<number, Record<string, unknown>>();
  for (const row of orderRows) poById.set(Number(row.id), row);
  let late = 0;
  let onTime = 0;
  const lateRows: unknown[] = [];
  const onTimeRows: unknown[] = [];
  if (poById.size > 0) {
    const pickings = await fetchOdooBatches({
      model: "stock.picking",
      domain: [["picking_type_code", "=", "incoming"], ["state", "=", "done"], ["purchase_id", "in", Array.from(poById.keys())]],
      fields: ["id", "name", "origin", "purchase_id", "date_done"],
      maxRows: 100000,
    });
    const earliestByPo = new Map<number, string>();
    for (const picking of pickings) {
      const poId = purchaseRecordId(picking.purchase_id);
      if (poId === null) continue;
      const po = poById.get(poId);
      const origin = String(picking.origin ?? "").trim();
      if (!po || !origin || origin !== String(po.name ?? "").trim()) continue;
      const dateDone = String(picking.date_done ?? "");
      if (!dateDone) continue;
      const current = earliestByPo.get(poId);
      if (!current || dateDone < current) earliestByPo.set(poId, dateDone);
    }
    const HOUR = 3600 * 1000;
    for (const [poId, dateDone] of earliestByPo) {
      const po = poById.get(poId);
      const dateOrder = String(po?.date_order ?? "");
      if (!dateOrder) continue;
      const start = new Date(dateOrder.replace(" ", "T")).getTime();
      const end = new Date(dateDone.replace(" ", "T")).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      const hours = (end - start) / HOUR;
      if (hours < 24) {
        onTime += 1;
        if (onTimeRows.length < 8) {
          onTimeRows.push({ id: poId, name: String(po?.name ?? poId), outstanding: Math.round(hours * 10) / 10 });
        }
      } else if (hours >= 24) {
        late += 1;
        if (lateRows.length < 8) {
          lateRows.push({ id: poId, name: String(po?.name ?? poId), outstanding: Math.round(hours * 10) / 10 });
        }
      }
    }
  }
  const label = `${win.fromDate} → ${win.toDate}`;
  const pct = poById.size > 0 ? Math.round((onTime / poById.size) * 1000) / 10 : 0;
  const note = `${onTime} of ${poById.size} confirmed purchase orders (${pct}%) received within 24 hours of creation (${label}).`;
  return {
    value: onTime,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, onTimeCount: onTime, orderCount: poById.size, average: pct, averageSuffix: "%", topVendors: [] as unknown[] },
  };
}

async function calculateGrossMarginMas(uid: number, password: string, window?: ScorecardWindow) {
  return calculateGrossMargin(uid, password, "purchase.gross_margin_mas", 2, "Horeca", window);
}

async function calculateGrossMarginHoreca(uid: number, password: string, window?: ScorecardWindow) {
  return calculateGrossMargin(uid, password, "purchase.gross_margin_horeca", 1, "MAS", window);
}

async function calculateGrossMargin(uid: number, password: string, configKey: string, companyId: number, label: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS[configKey as keyof typeof SCORECARD_DEFS];
  const win = salesWindow(window);
  const domain: unknown[] = [
    ["state", "in", ["sale", "done"]],
    ["company_id", "=", companyId],
    ["date_order", ">=", win.from],
    ["date_order", "<=", win.to],
  ];
  const intercoPartner = INTERCO_PARTNER_ID[companyId];
  if (intercoPartner) domain.push(["partner_id", "!=", intercoPartner]);
  const orders = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "sale.order",
    methodName: "search_read",
    args: [domain],
    kwargs: { fields: ["id"], limit: 40000 },
  });
  const orderIds = (Array.isArray(orders) ? orders : []).map((row) => Number(row.id)).filter(Number.isFinite);
  let subtotal = 0;
  let margin = 0;
  let lines = 0;
  if (orderIds.length > 0) {
    const raw = await fetchOdooBatches({
      model: "sale.order.line",
      domain: [["order_id", "in", orderIds]],
      fields: ["price_subtotal", "margin"],
      maxRows: 120000,
    });
    for (const row of raw) {
      const subtotalValue = numberValue(row.price_subtotal);
      const marginValue = numberValue(row.margin);
      if (subtotalValue !== null) subtotal += subtotalValue;
      if (marginValue !== null) margin += marginValue;
      lines += 1;
    }
  }
  const ratio = subtotal > 0 ? Math.round((margin / subtotal) * 10000) / 100 : null;
  const label2 = `${win.fromDate} → ${win.toDate}`;
  const basis = "Ordered Sales Basis (default; NOT Delivered-only, NOT GL basis). Revenue = Σ sale.order.line.price_subtotal; COGS = Σ sale.order.line.purchase_price × product_uom_qty; Gross Profit = Revenue − COGS; Gross Margin % = Gross Profit / Revenue × 100.";
  const note = `${basis} | ${label}: ${ratio ?? 0}% across ${lines} line(s) of ${orderIds.length} confirmed orders (${label2}); subtotal ${subtotal.toFixed(2)} EGP.`;
  return {
    value: ratio,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, orderCount: orderIds.length, gmvTotal: Math.round(subtotal * 100) / 100, topVendors: [] as unknown[] },
  };
}

async function calculateMarginLte1(uid: number, password: string) {
  const config = SCORECARD_DEFS["purchase.margin_lte_1"];
  const rows = await fetchOdooBatches({
    model: "product.template",
    domain: [["list_price", ">", 0], ["standard_price", ">", 0]],
    fields: ["id", "name", "list_price", "standard_price"],
    maxRows: 5000,
  });
  let count = 0;
  for (const row of rows) {
    const list = numberValue(row.list_price);
    const cost = numberValue(row.standard_price);
    if (list === null || cost === null || list <= 0 || cost <= 0) continue;
    const marginPct = ((list - cost) / list) * 100;
    if (marginPct <= 1) {
      count += 1;
    }
  }
  const note = `${count} products with gross margin <= 1% (list price vs cost).`;
  return {
    value: count,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, topVendors: [] as unknown[] },
  };
}

async function calculateVarianceOfPrices(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["purchase.variance_of_prices"];
  const win = salesWindow(window);
  const orders = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "purchase.order",
    methodName: "search_read",
    args: [[["state", "in", ["purchase", "done"]], ["date_order", ">=", win.from], ["date_order", "<=", win.to]]],
    kwargs: { fields: ["id", "name"], limit: 40000 },
  });
  const orderRows = Array.isArray(orders) ? orders : [];
  const orderIds = orderRows.map((row) => Number(row.id)).filter(Number.isFinite);
  const orderNameById = new Map<number, string>();
  for (const row of orderRows) orderNameById.set(Number(row.id), String(row.name ?? row.id));
  let count = 0;
  const flagged: unknown[] = [];
  const flaggedPoIds = new Set<number>();
  if (orderIds.length > 0) {
    const lines = await fetchOdooBatches({
      model: "purchase.order.line",
      domain: [["order_id", "in", orderIds], ["product_id", "!=", false], ["price_unit", ">", 0]],
      fields: ["id", "order_id", "product_id", "price_unit"],
      maxRows: 100000,
    });
    const productIds = new Set<number>();
    for (const line of lines) {
      const productId = purchaseRecordId(line.product_id);
      if (productId !== null) productIds.add(productId);
    }
    const listPriceById = new Map<number, number>();
    const nameById = new Map<number, string>();
    if (productIds.size > 0) {
      const products = await fetchOdooBatches({
        model: "product.template",
        domain: [["id", "in", Array.from(productIds)]],
        fields: ["id", "name", "list_price"],
        maxRows: 10000,
      });
      for (const product of products) {
        const productId = Number(product.id);
        const listPrice = numberValue(product.list_price);
        if (listPrice !== null) listPriceById.set(productId, listPrice);
        nameById.set(productId, String(product.name ?? productId));
      }
    }
    for (const line of lines) {
      const productId = purchaseRecordId(line.product_id);
      if (productId === null) continue;
      const listPrice = listPriceById.get(productId);
      if (listPrice === undefined || listPrice <= 0) continue;
      const price = numberValue(line.price_unit);
      if (price === null) continue;
      const variance = Math.abs(price - listPrice) / listPrice;
      if (variance > 0.1) {
        count += 1;
        const orderId = purchaseRecordId(line.order_id) ?? 0;
        flaggedPoIds.add(orderId);
        if (flagged.length < 20) {
          flagged.push({
            id: Number(line.id),
            name: `PO ${orderNameById.get(orderId) ?? orderId} · ${nameById.get(productId) ?? productId}`,
            outstanding: Math.round(variance * 1000) / 10,
          });
        }
      }
    }
  }
  const label = `${win.fromDate} → ${win.toDate}`;
  const details = flagged.map((item) => `${item.name}: ${item.outstanding}%`).join(", ");
  const poCount = flaggedPoIds.size;
  const pct = orderIds.length > 0 ? Math.round((poCount / orderIds.length) * 1000) / 10 : 0;
  const note = `${poCount} of ${orderIds.length} POs have line(s) differing >10% from list price (${pct}%); ${count} line(s) flagged (${label}).${details ? ` ${details}.` : ""}`;
  return {
    value: poCount,
    note,
    asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, orderCount: orderIds.length, flaggedLines: count, average: pct, averageSuffix: "%", averageNoParen: true, topVendors: [] as unknown[] },
  };
}


function shiftDay(ts: number, days: number): number {
  const d = new Date(ts);
  d.setUTCDate(d.getUTCDate() + days);
  return d.getTime();
}


async function calculateLogisticsInternalTransfers(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["logistics.internal_transfers"];
  const win = salesWindow(window);
  const rows = await executeOdooKwWithCredentials({ uid, password, model: "stock.picking", methodName: "search_read",
    args: [[["picking_type_code", "=", "internal"], ["state", "=", "done"], ["date_done", ">=", win.from], ["date_done", "<=", win.to]]],
    kwargs: { fields: ["id", "name", "date_done", "company_id"], limit: 40000 } });
  const arr = Array.isArray(rows) ? rows : [];
  let mas = 0;
  let horeca = 0;
  for (const pick of arr) {
    const cid = Array.isArray(pick.company_id) && pick.company_id[0] ? Number(pick.company_id[0]) : Number(pick.company_id);
    if (cid === 1) mas += 1;
    else if (cid === 2) horeca += 1;
  }
  const value = arr.length;
  const note = `Internal transfers (${win.fromDate} -> ${win.toDate}): ${value} | MAS ${mas} | Horeca ${horeca}`;
  return { value, note, asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, window: win, byCompany: { mas, horeca } } };
}

async function calculateLogisticsCompanyTransfers(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["logistics.company_transfers"];
  const win = salesWindow(window);
  const rows = await executeOdooKwWithCredentials({ uid, password, model: "sale.order", methodName: "search_read",
    args: [[["partner_id", "in", [1, 7]], ["state", "=", "sale"], ["date_order", ">=", win.from], ["date_order", "<=", win.to]]],
    kwargs: { fields: ["id", "name", "partner_id", "company_id", "date_order"], limit: 40000 } });
  const arr = Array.isArray(rows) ? rows : [];
  let mas = 0;
  let horeca = 0;
  for (const order of arr) {
    const cid = Array.isArray(order.company_id) && order.company_id[0] ? Number(order.company_id[0]) : Number(order.company_id);
    if (cid === 1) mas += 1;
    else if (cid === 2) horeca += 1;
  }
  const value = arr.length;
  const note = `Company transfers (${win.fromDate} -> ${win.toDate}): ${value} | MAS ${mas} | Horeca ${horeca}`;
  return { value, note, asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, window: win, byCompany: { mas, horeca } } };
}

async function calculateLogisticsNearExpireProducts(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["logistics.near_expire_products"];
  const win = salesWindow(window);
  const cairoOffsetMs = 180 * 60000;
  const now = Date.now();
  const to60Cairo = isoDate(new Date(now + 60 * 86400000 + cairoOffsetMs));
  const lots = await executeOdooKwWithCredentials({ uid, password, model: "stock.lot", methodName: "search_read",
    args: [[["expiration_date", "!=", false], ["expiration_date", "<=", `${to60Cairo} 23:59:59`], ["product_qty", ">", 0]]],
    kwargs: { fields: ["id", "expiration_date", "product_qty", "product_id", "location_id"], limit: 60000 } });
  const locations = await executeOdooKwWithCredentials({ uid, password, model: "stock.location", methodName: "search_read",
    args: [[["usage", "=", "internal"]]],
    kwargs: { fields: ["id", "company_id"], limit: 5000 } });
  const locCompany: Record<number, number> = {};
  for (const loc of Array.isArray(locations) ? locations : []) {
    const locId = Number(loc.id) || 0;
    const raw = Array.isArray(loc.company_id) && loc.company_id[0] ? loc.company_id[0] : loc.company_id;
    if (locId > 0) locCompany[locId] = Number(raw) || 0;
  }
  const groups = await executeOdooKwWithCredentials({ uid, password, model: "stock.quant", methodName: "read_group",
    args: [],
    kwargs: {
      domain: [["location_id.usage", "=", "internal"], ["quantity", ">", 0]],
      groupby: ["company_id", "product_id"],
      fields: ["quantity:sum"],
      lazy: false,
      limit: 0,
    } });
  const productCompany: Record<number, number> = {};
  const productQty: Record<number, number> = {};
  for (const g of Array.isArray(groups) ? groups : []) {
    const pidRaw = Array.isArray(g.product_id) && g.product_id[0] ? g.product_id[0] : g.product_id;
    const cidRaw = Array.isArray(g.company_id) && g.company_id[0] ? g.company_id[0] : g.company_id;
    const pid = Number(pidRaw) || 0;
    const cid = Number(cidRaw) || 0;
    if (pid <= 0) continue;
    const qty = Number(g.quantity) || 0;
    if (!(pid in productQty) || qty > productQty[pid]) {
      productQty[pid] = qty;
      productCompany[pid] = cid;
    }
  }

  const arr = Array.isArray(lots) ? lots : [];
  const expiredByProduct: Record<number, boolean> = {};
  const lotCompany: Record<number, number> = {};
  for (const lot of arr) {
    const pidRaw = Array.isArray(lot.product_id) && lot.product_id[0] ? lot.product_id[0] : lot.product_id;
    const pid = Number(pidRaw) || 0;
    if (pid <= 0) continue;
    const rawExp = String(lot.expiration_date || "");
    const normExp = rawExp.includes("T") ? rawExp : rawExp.replace(" ", "T");
    const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normExp) ? normExp : `${normExp}Z`;
    const parsed = Date.parse(withZone);
    const isExpired = Number.isNaN(parsed) ? false : parsed + cairoOffsetMs < now;
    if (!(pid in expiredByProduct)) expiredByProduct[pid] = false;
    if (isExpired) expiredByProduct[pid] = true;
    if (!(pid in lotCompany)) {
      const locRaw = Array.isArray(lot.location_id) && lot.location_id[0] ? lot.location_id[0] : lot.location_id;
      lotCompany[pid] = locCompany[Number(locRaw) || 0] || 0;
    }
  }

  const pids = Object.keys(expiredByProduct).map((k) => Number(k));
  let expired = 0;
  let mas = 0;
  let horeca = 0;
  let unattributed = 0;
  for (const pid of pids) {
    if (expiredByProduct[pid]) expired += 1;
    const cid = productCompany[pid] || lotCompany[pid] || 0;
    if (cid === 1) mas += 1;
    else if (cid === 2) horeca += 1;
    else unattributed += 1;
  }
  const value = pids.length;
  return {
    value,
    note: `Near/expired products (qty > 0, exp <= ${to60Cairo} Cairo): ${value} | MAS ${mas} | Horeca ${horeca} (expired ${expired}, unattributed ${unattributed})`,
    asOf: isoNow(),
    metadata: {
      module: config.module, view: config.view, field: config.field, window: win,
      byCompany: { mas, horeca },
      expired,
      nearExpire: value - expired,
      unattributed,
      cutoff: to60Cairo,
      timezone: "Africa/Cairo (UTC+3)",
      attribution: "stock.quant primary company, lot location fallback",
      products: pids.slice(0, 20),
    },
  }
}

async function calculateLogisticsReturnsCount(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["logistics.returns_count"];
  const win = salesWindow(window);
  const rows = await executeOdooKwWithCredentials({ uid, password, model: "sale.order", methodName: "search_read",
    args: [[["invoice_status", "=", "no"], ["state", "!=", "cancel"], ["date_order", ">=", win.from], ["date_order", "<=", win.to]]],
    kwargs: { fields: ["id", "name", "invoice_status", "company_id"], limit: 80000 } });
  const arr = Array.isArray(rows) ? rows : [];
  let mas = 0;
  let horeca = 0;
  for (const order of arr) {
    const cid = Array.isArray(order.company_id) && order.company_id[0] ? Number(order.company_id[0]) : Number(order.company_id);
    if (cid === 1) mas += 1;
    else if (cid === 2) horeca += 1;
  }
  const value = arr.length;
  const note = `Returns count - orders with invoice status "Nothing to Invoice" (${win.fromDate} -> ${win.toDate}): ${value} | MAS ${mas} | Horeca ${horeca}`;
  return { value, note, asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, window: win, byCompany: { mas, horeca } } };
}

async function calculateLogisticsReturnsValue(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["logistics.returns_value"];
  const win = salesWindow(window);
  const rows = await executeOdooKwWithCredentials({ uid, password, model: "sale.order", methodName: "search_read",
    args: [[["invoice_status", "=", "no"], ["state", "!=", "cancel"], ["date_order", ">=", win.from], ["date_order", "<=", win.to]]],
    kwargs: { fields: ["id", "name", "company_id", "amount_total", "amount_invoiced"], limit: 80000 } });
  const arr = Array.isArray(rows) ? rows : [];
  let total = 0;
  let mas = 0;
  let horeca = 0;
  for (const order of arr) {
    const gap = (Number(order.amount_total) || 0) - (Number(order.amount_invoiced) || 0);
    total += gap;
    const cid = Array.isArray(order.company_id) && order.company_id[0] ? Number(order.company_id[0]) : Number(order.company_id);
    if (cid === 1) mas += gap;
    else if (cid === 2) horeca += gap;
  }
  const value = Math.round(total * 100) / 100;
  const masRounded = Math.round(mas * 100) / 100;
  const horecaRounded = Math.round(horeca * 100) / 100;
  const note = `Returns value (ordered - invoiced) (${win.fromDate} -> ${win.toDate}): ${value} EGP | MAS ${masRounded} | Horeca ${horecaRounded}`;
  return { value, note, asOf: isoNow(),
    metadata: { module: config.module, view: config.view, field: config.field, window: win, byCompany: { mas: masRounded, horeca: horecaRounded } } };
}

async function calculateLogisticsOrdersToValidate(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["logistics.orders_to_validate"];
  const win = salesWindow(window);
  const rows = await executeOdooKwWithCredentials({ uid, password, model: "stock.picking", methodName: "search_read",
    args: [[["picking_type_code", "in", ["outgoing", "internal", "incoming"]], ["state", "in", ["confirmed", "assigned"]],
      ["scheduled_date", ">=", win.from], ["scheduled_date", "<=", win.to]]],
    kwargs: { fields: ["id", "name", "state", "scheduled_date", "company_id"], limit: 40000 } });
  const arr = Array.isArray(rows) ? rows : [];
  const value = arr.length;
  let mas = 0;
  let horeca = 0;
  const byState: Record<string, number> = { confirmed: 0, assigned: 0 };
  for (const row of arr) {
    const cid = Array.isArray(row.company_id) && row.company_id[0] ? Number(row.company_id[0]) : Number(row.company_id);
    if (cid === 1) mas += 1;
    else if (cid === 2) horeca += 1;
    const state = String(row.state || "");
    if (state === "confirmed" || state === "assigned") byState[state] += 1;
  }
  return {
    value,
    note: `Orders to validate - waiting or ready (${win.fromDate} -> ${win.toDate}): ${value} | MAS ${mas} | Horeca ${horeca} (waiting ${byState.confirmed}, ready ${byState.assigned})`,
    asOf: isoNow(),
    metadata: {
      module: config.module, view: config.view, field: config.field, window: win,
      byCompany: { mas, horeca },
      byState,
    },
  }
}

async function calculateLogisticsInventoryDays(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["logistics.inventory_days"];
  const win = salesWindow(window);
  const products = await executeOdooKwWithCredentials({ uid, password, model: "product.product", methodName: "search_read",
    args: [[["qty_available", ">", 0]]],
    kwargs: { fields: ["id", "qty_available", "standard_price"], limit: 60000 } });
  const parr = Array.isArray(products) ? products : [];
  const priceById: Record<number, number> = {};
  for (const p of parr) {
    const pid = Number(p.id) || 0;
    if (pid > 0) priceById[pid] = Number(p.standard_price) || 0;
  }

  const cogsAccounts = await executeOdooKwWithCredentials({ uid, password, model: "account.account", methodName: "search_read",
    args: [[["account_type", "=", "expense_direct_cost"], ["name", "ilike", "Cost of Goods Sold"]]],
    kwargs: { fields: ["id", "code", "name"], limit: 200, context: { lang: "en_US" } } });
  const accArr = Array.isArray(cogsAccounts) ? cogsAccounts : [];
  const accountIds: number[] = [];
  for (const acc of accArr) {
    const accId = Number(acc.id) || 0;
    if (accId > 0) accountIds.push(accId);
  }

  const from90 = isoDate(new Date(Date.now() - 90 * 86400000));
  let cogsTotal = 0;
  const cogsByCompany: Record<string, number> = { mas: 0, horeca: 0 };
  if (accountIds.length > 0) {
    const cogs = await executeOdooKwWithCredentials({ uid, password, model: "account.move.line", methodName: "search_read",
      args: [[["account_id", "in", accountIds], ["move_id.state", "=", "posted"], ["date", ">=", from90]]],
      kwargs: { fields: ["debit", "credit", "company_id"], limit: 200000 } });
    const carr = Array.isArray(cogs) ? cogs : [];
    for (const line of carr) {
      const net = (Number(line.debit) || 0) - (Number(line.credit) || 0);
      cogsTotal += net;
      const cid = Array.isArray(line.company_id) && line.company_id[0] ? Number(line.company_id[0]) : Number(line.company_id);
      if (cid === 1) cogsByCompany.mas += net;
      else if (cid === 2) cogsByCompany.horeca += net;
    }
  }

  const groups = await executeOdooKwWithCredentials({ uid, password, model: "stock.quant", methodName: "read_group",
    args: [],
    kwargs: {
      domain: [["location_id.usage", "=", "internal"], ["quantity", ">", 0]],
      groupby: ["company_id", "product_id"],
      fields: ["quantity:sum"],
      lazy: false,
      limit: 0,
    } });
  const grArr = Array.isArray(groups) ? groups : [];
  let valuation = 0;
  const valuationByCompany: Record<string, number> = { mas: 0, horeca: 0 };
  for (const g of grArr) {
    const qty = Number(g.quantity) || 0;
    const pidRaw = Array.isArray(g.product_id) && g.product_id[0] ? g.product_id[0] : g.product_id;
    const cidRaw = Array.isArray(g.company_id) && g.company_id[0] ? g.company_id[0] : g.company_id;
    const pid = Number(pidRaw) || 0;
    const cid = Number(cidRaw) || 0;
    const amount = qty * (priceById[pid] || 0);
    valuation += amount;
    if (cid === 1) valuationByCompany.mas += amount;
    else if (cid === 2) valuationByCompany.horeca += amount;
  }

  const daily = cogsTotal > 0 ? cogsTotal / 90 : 0;
  const value = daily > 0 ? Math.round((valuation / daily) * 10) / 10 : null;
  const daysFor = (v: number, c: number) => (c > 0 ? Math.round((v / (c / 90)) * 10) / 10 : null);
  const masDays = daysFor(valuationByCompany.mas, cogsByCompany.mas);
  const horecaDays = daysFor(valuationByCompany.horeca, cogsByCompany.horeca);
  return {
    value,
    note: `Inventory days = valuation ${Math.round(valuation)} / daily COGS ${Math.round(daily)} (90d from ${from90}) | MAS ${masDays === null ? "-" : masDays} | Horeca ${horecaDays === null ? "-" : horecaDays}`,
    asOf: isoNow(),
    metadata: {
      module: config.module, view: config.view, field: config.field, window: win,
      byCompany: { mas: masDays, horeca: horecaDays },
      valuation: Math.round(valuation),
      valuationByCompany: { mas: Math.round(valuationByCompany.mas), horeca: Math.round(valuationByCompany.horeca) },
      cogs90: Math.round(cogsTotal),
      cogsByCompany: { mas: Math.round(cogsByCompany.mas), horeca: Math.round(cogsByCompany.horeca) },
      cogsAccounts: accountIds,
      from90,
    },
  }
}

async function calculateLogisticsValidateOver11Am(uid: number, password: string, window?: ScorecardWindow) {
  const config = SCORECARD_DEFS["logistics.validate_over_11am"];
  const win = salesWindow(window);
  const cairoOffsetMs = 180 * 60000;
  const thresholdMs = 11 * 60 * 60000;
  const rows = await executeOdooKwWithCredentials({ uid, password, model: "stock.picking", methodName: "search_read",
    args: [[["picking_type_code", "in", ["outgoing", "internal"]], ["state", "=", "done"],
      ["date_done", ">=", win.from], ["date_done", "<=", win.to]]],
    kwargs: { fields: ["id", "name", "date_done", "company_id"], limit: 120000 } });
  const arr = Array.isArray(rows) ? rows : [];
  const total = arr.length;
  let late = 0;
  let lateMas = 0;
  let lateHoreca = 0;
  let skipped = 0;
  for (const pick of arr) {
    const raw = String(pick.date_done || "");
    const norm = raw.includes("T") ? raw : raw.replace(" ", "T");
    const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(norm) ? norm : `${norm}Z`;
    const parsed = Date.parse(withZone);
    if (Number.isNaN(parsed)) {
      skipped += 1;
      continue;
    }
    const cairoNow = parsed + cairoOffsetMs;
    const cairoDayStart = Math.floor(cairoNow / 86400000) * 86400000;
    if (cairoNow - cairoDayStart >= thresholdMs) {
      late += 1;
      const cid = Array.isArray(pick.company_id) && pick.company_id[0] ? Number(pick.company_id[0]) : Number(pick.company_id);
      if (cid === 1) lateMas += 1;
      else if (cid === 2) lateHoreca += 1;
    }
  }
  const value = total > 0 ? Math.round((late / total) * 1000) / 10 : null;
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
  return {
    value,
    note: `Validate >11:00 AM Cairo: ${late}/${total} after 11:00 (${value === null ? "-" : value}%) | MAS ${lateMas} | Horeca ${lateHoreca}`,
    asOf: isoNow(),
    metadata: {
      module: config.module, view: config.view, field: config.field, window: win,
      byCompany: { mas: lateMas, horeca: lateHoreca },
      latePctByCompany: { mas: pct(lateMas, total), horeca: pct(lateHoreca, total) },
      late,
      total,
      lateByCompany: { mas: lateMas, horeca: lateHoreca },
      threshold: "11:00 Africa/Cairo",
      utcOffsetMin: 180,
      skipped,
    },
  }
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
  "collection.dso_mas_credit": (uid, password) => calculateDsoReport(uid, password, { label: "MAS Credit", companies: [1], mode: "credit" }),
  "collection.unpaid_cash_mas": calculateUnpaidCashMas,
  "collection.unpaid_cash_horeca": calculateUnpaidCashHoreca,
  "collection.sales_approved_credit_policy": calculateSalesApprovedCreditPolicy,
  "collection.dso_mas_cash": (uid, password) => calculateDsoReport(uid, password, { label: "MAS Cash", companies: [1], mode: "cash" }),
  "collection.dso_horeca_credit": (uid, password) => calculateDsoReport(uid, password, { label: "Horeca Credit", companies: [2], mode: "credit" }),
  "collection.dso_horeca_cash": (uid, password) => calculateDsoReport(uid, password, { label: "Horeca Cash", companies: [2], mode: "cash" }),
  "collection.dso_other": (uid, password) => calculateDsoReport(uid, password, { label: "Other", companies: [1, 2], mode: "other" }),
  "collection.total_collected": () => calculateCollectionTotalCollected(),
  "collection.total_visits": () => calculateCollectionTotalVisits(),
  "collection.due_over_60": () => calculateCollectionDueOver60(),
  "sales.gmv_mas": calculateGmvMas,
  "sales.mas_customers": calculateMasCustomers,
  "sales.mas_average_order": calculateMasOrders,
  "sales.products_sold_mas": calculateProductsSoldMas,
  "sales.gmv_horeca": calculateGmvHoreca,
  "sales.horeca_customers": calculateHorecaCustomers,
  "sales.horeca_average_order": calculateHorecaOrders,
  "sales.products_sold_horeca": calculateProductsSoldHoreca,
  "sales.crm_activities": calculateCrmActivities,
  "sales.new_customers": calculateNewCustomers,
  "sales.retention_rate": calculateRetentionRate,
  "sales.sales_by_app": calculateSalesByApp,
  "sales.active_customers": calculateActiveCustomers,
  "purchase.stockout_top100": calculateStockOutTop100,
  "purchase.stockout_products": calculateStockOutProducts,
  "purchase.available_products": calculateAvailableProducts,
  "purchase.new_products": calculateNewProducts,
  "purchase.products_purchased": calculateProductsPurchased,
  "purchase.purchase_orders": calculatePurchaseOrders,
  "purchase.accuracy_of_purchase": calculateAccuracyOfPurchase,
  "purchase.receipts_date_24h": calculateReceiptsDate24h,
  "purchase.gross_margin_mas": calculateGrossMarginMas,
  "purchase.gross_margin_horeca": calculateGrossMarginHoreca,
  "purchase.margin_lte_1": calculateMarginLte1,
  "purchase.variance_of_prices": calculateVarianceOfPrices,
  "logistics.internal_transfers": calculateLogisticsInternalTransfers,
  "logistics.company_transfers": calculateLogisticsCompanyTransfers,
  "logistics.near_expire_products": calculateLogisticsNearExpireProducts,
  "logistics.returns_count": calculateLogisticsReturnsCount,
  "logistics.returns_value": calculateLogisticsReturnsValue,
  "logistics.orders_to_validate": calculateLogisticsOrdersToValidate,
  "logistics.inventory_days": calculateLogisticsInventoryDays,
  "logistics.validate_over_11am": calculateLogisticsValidateOver11Am,
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
          metadata: (calculated.metadata as Record<string, unknown> | undefined) ?? { module: def.module, view: def.view, field: def.field, topVendors: calculated.topVendors ?? [] },
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