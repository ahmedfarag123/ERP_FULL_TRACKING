import { corsHeaders, executeOdooKwWithCredentials, formatUnknownError, jsonResponse, requireOdooSyncAccess, requireServiceOdooPassword, requireServiceOdooUid, supabaseAdmin } from "../_shared/odoo.ts";
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 500;
const KPI_CONFIGS = {
  "SAL-02": {
    code: "SAL-02",
    status: "partial",
    formula: "(sales revenue - COGS) / sales revenue. Revenue is direct; COGS needs margin/cost or account classification.",
    sources: [
      {
        model: "sale.order.line",
        dateField: "order_id.date_order",
        role: "Sales line revenue and possible product margin/cost fields.",
        fields: [
          "id",
          "order_id",
          "product_id",
          "product_uom_qty",
          "price_subtotal",
          "price_total",
          "purchase_price",
          "margin",
          "margin_percent"
        ]
      },
      {
        model: "account.move.line",
        dateField: "date",
        role: "Readable journal-line substitute when chart of accounts is blocked.",
        fields: [
          "id",
          "date",
          "move_id",
          "partner_id",
          "product_id",
          "account_id",
          "account_code",
          "account_name",
          "debit",
          "credit",
          "balance"
        ]
      }
    ],
    substitutions: [
      "Use account.move.line account_code/account_name when account.account is denied."
    ],
    missing: [
      "Approved COGS account/product-cost policy if margin fields are not available."
    ]
  },
  "PRO-01": {
    code: "PRO-01",
    status: "partial",
    formula: "(supplier baseline price - actual PO price) / supplier baseline price.",
    sources: [
      {
        model: "purchase.order.line",
        dateField: "order_id.date_order",
        role: "Actual PO unit prices and quantities.",
        fields: [
          "id",
          "order_id",
          "partner_id",
          "product_id",
          "product_qty",
          "qty_received",
          "price_unit",
          "price_subtotal",
          "date_planned"
        ]
      },
      {
        model: "product.supplierinfo",
        role: "Supplier baseline price and lead-time reference.",
        fields: [
          "id",
          "partner_id",
          "product_tmpl_id",
          "product_id",
          "min_qty",
          "price",
          "delay",
          "date_start",
          "date_end"
        ]
      }
    ],
    missing: [
      "Business rule for which supplierinfo price is the approved baseline."
    ]
  },
  "PRO-02": {
    code: "PRO-02",
    status: "ready",
    formula: "Average days from PO confirmation/order date to receipt completion.",
    sources: [
      {
        model: "purchase.order",
        dateField: "date_order",
        role: "PO confirmation/order date.",
        fields: [
          "id",
          "name",
          "partner_id",
          "state",
          "date_order",
          "date_approve",
          "date_planned",
          "effective_date"
        ]
      },
      {
        model: "stock.picking",
        dateField: "date_done",
        domain: [
          [
            "picking_type_code",
            "=",
            "incoming"
          ]
        ],
        role: "Completed incoming receipts.",
        fields: [
          "id",
          "name",
          "origin",
          "partner_id",
          "state",
          "scheduled_date",
          "date_deadline",
          "date_done",
          "picking_type_id",
          "picking_type_code"
        ]
      }
    ]
  },
  "PRO-03": {
    code: "PRO-03",
    status: "ready",
    formula: "Average days from purchase order creation to approval.",
    sources: [
      {
        model: "purchase.order",
        dateField: "date_order",
        role: "PO creation and approval timestamps.",
        fields: [
          "id",
          "name",
          "state",
          "date_order",
          "date_approve",
          "effective_date",
          "write_date"
        ]
      }
    ]
  },
  "PRO-04": {
    code: "PRO-04",
    status: "ready",
    formula: "Completed receipts on or before planned date / completed purchase receipts.",
    sources: [
      {
        model: "purchase.order.line",
        dateField: "date_planned",
        role: "Planned receipt date per PO line.",
        fields: [
          "id",
          "order_id",
          "partner_id",
          "product_id",
          "product_qty",
          "qty_received",
          "date_planned"
        ]
      },
      {
        model: "stock.picking",
        dateField: "date_done",
        domain: [
          [
            "picking_type_code",
            "=",
            "incoming"
          ],
          [
            "state",
            "=",
            "done"
          ]
        ],
        role: "Actual done date for receipts.",
        fields: [
          "id",
          "name",
          "origin",
          "partner_id",
          "state",
          "scheduled_date",
          "date_deadline",
          "date_done",
          "picking_type_code"
        ]
      }
    ]
  },
  "PRO-05": {
    code: "PRO-05",
    status: "partial",
    formula: "Emergency POs / total POs. Uses short requested lead time as the current proxy.",
    sources: [
      {
        model: "purchase.order",
        dateField: "date_order",
        role: "PO requested and planned dates.",
        fields: [
          "id",
          "name",
          "state",
          "date_order",
          "date_planned",
          "effective_date",
          "priority"
        ]
      }
    ],
    missing: [
      "Explicit emergency flag is not exposed; current value uses planned lead time <= 2 days."
    ]
  },
  "PRO-06": {
    code: "PRO-06",
    status: "ready",
    formula: "Received quantity matching ordered quantity / closed PO lines.",
    sources: [
      {
        model: "purchase.order.line",
        dateField: "write_date",
        role: "Ordered, received, and billed quantities.",
        fields: [
          "id",
          "order_id",
          "partner_id",
          "product_id",
          "product_qty",
          "qty_received",
          "qty_invoiced",
          "price_unit",
          "state",
          "write_date"
        ]
      }
    ]
  },
  "PRO-07": {
    code: "PRO-07",
    status: "partial",
    formula: "Actual purchase spend / budget.",
    sources: [
      {
        model: "purchase.order.line",
        dateField: "write_date",
        role: "Actual PO spend.",
        fields: [
          "id",
          "order_id",
          "partner_id",
          "product_id",
          "product_qty",
          "qty_received",
          "price_subtotal",
          "state",
          "write_date"
        ]
      }
    ],
    missing: [
      "Budget source is not exposed yet, so the dashboard can show actual spend but not adherence percentage."
    ]
  },
  "PRO-09": {
    code: "PRO-09",
    status: "partial",
    formula: "Rejected/short received purchase lines / closed purchase lines.",
    sources: [
      {
        model: "purchase.order.line",
        dateField: "write_date",
        role: "Ordered and received quantities.",
        fields: [
          "id",
          "order_id",
          "partner_id",
          "product_id",
          "product_qty",
          "qty_received",
          "state",
          "write_date"
        ]
      }
    ],
    missing: [
      "Explicit quality rejection reason is not exposed; current value uses short received closed lines."
    ]
  },
  "FIN-02": {
    code: "FIN-02",
    status: "ready",
    formula: "AR balance / average daily credit sales, or invoice-level outstanding days.",
    sources: [
      {
        model: "account.move",
        dateField: "invoice_date",
        domain: [
          [
            "move_type",
            "in",
            [
              "out_invoice",
              "out_refund"
            ]
          ],
          [
            "state",
            "=",
            "posted"
          ]
        ],
        role: "Customer invoices, residuals, due dates, and payment state.",
        fields: [
          "id",
          "name",
          "move_type",
          "state",
          "partner_id",
          "invoice_date",
          "invoice_date_due",
          "amount_total",
          "amount_residual",
          "payment_state"
        ]
      },
      {
        model: "account.move.line",
        dateField: "date",
        role: "AR journal-line backup.",
        fields: [
          "id",
          "date",
          "move_id",
          "partner_id",
          "account_id",
          "account_code",
          "account_name",
          "debit",
          "credit",
          "balance",
          "amount_residual"
        ]
      }
    ]
  },
  "FIN-03": {
    code: "FIN-03",
    status: "partial",
    formula: "Invoices without corrections/refunds divided by total invoices.",
    sources: [
      {
        model: "account.move",
        dateField: "invoice_date",
        domain: [
          [
            "move_type",
            "in",
            [
              "out_invoice",
              "out_refund"
            ]
          ],
          [
            "state",
            "=",
            "posted"
          ]
        ],
        role: "Invoices and refunds/corrections.",
        fields: [
          "id",
          "name",
          "move_type",
          "state",
          "partner_id",
          "invoice_date",
          "amount_total",
          "reversed_entry_id",
          "payment_state"
        ]
      }
    ],
    missing: [
      "Explicit invoice correction reason if refunds are not enough to define inaccuracy."
    ]
  },
  "FIN-04": {
    code: "FIN-04",
    status: "partial",
    formula: "(actual - budget) / budget.",
    sources: [
      {
        model: "account.move.line",
        dateField: "date",
        role: "Actuals by readable account code/name.",
        fields: [
          "id",
          "date",
          "move_id",
          "partner_id",
          "account_id",
          "account_code",
          "account_name",
          "debit",
          "credit",
          "balance"
        ]
      }
    ],
    substitutions: [
      "Use account.move.line account_code/account_name when account.account is denied."
    ],
    missing: [
      "Budget model/table or manual budget upload."
    ]
  },
  "FIN-08": {
    code: "FIN-08",
    status: "partial",
    formula: "Approximate days from vendor bill date/due date to paid state; exact payment date needs payment access.",
    sources: [
      {
        model: "account.move",
        dateField: "invoice_date",
        domain: [
          [
            "move_type",
            "in",
            [
              "in_invoice",
              "in_refund"
            ]
          ],
          [
            "state",
            "=",
            "posted"
          ]
        ],
        role: "Vendor bills with payment state and residual amount.",
        fields: [
          "id",
          "name",
          "move_type",
          "state",
          "partner_id",
          "invoice_date",
          "invoice_date_due",
          "amount_total",
          "amount_residual",
          "payment_state"
        ]
      },
      {
        model: "account.move.line",
        dateField: "date",
        role: "Reconciliation-line substitute when account.payment is denied.",
        fields: [
          "id",
          "date",
          "move_id",
          "partner_id",
          "account_id",
          "account_code",
          "account_name",
          "debit",
          "credit",
          "balance",
          "matching_number",
          "reconciled"
        ]
      }
    ],
    substitutions: [
      "Use bill payment_state/amount_residual and reconciled journal lines when account.payment is denied."
    ],
    missing: [
      "Exact payment transaction date if account.payment remains denied."
    ]
  },
  "FIN-09": {
    code: "FIN-09",
    status: "partial",
    formula: "Bank/cash ledger proxy; exact reconciliation timeliness needs statement/reconciliation dates.",
    sources: [
      {
        model: "account.journal",
        role: "Bank/cash journal identity.",
        fields: [
          "id",
          "name",
          "code",
          "type",
          "company_id",
          "currency_id"
        ]
      },
      {
        model: "account.move.line",
        dateField: "date",
        role: "Posted bank/cash journal lines.",
        fields: [
          "id",
          "date",
          "journal_id",
          "move_id",
          "partner_id",
          "account_id",
          "account_code",
          "account_name",
          "debit",
          "credit",
          "balance",
          "matching_number",
          "reconciled"
        ]
      }
    ],
    substitutions: [
      "Use account.journal + account.move.line when account.bank.statement is denied."
    ],
    missing: [
      "Statement import date and reconciliation timestamp."
    ]
  },
  "WAR-03": {
    code: "WAR-03",
    status: "partial",
    formula: "COGS / average inventory value.",
    sources: [
      {
        model: "stock.quant",
        role: "On-hand and reserved quantities by product/location.",
        fields: [
          "id",
          "product_id",
          "location_id",
          "quantity",
          "reserved_quantity",
          "available_quantity",
          "company_id",
          "write_date"
        ]
      },
      {
        model: "stock.move",
        dateField: "date",
        role: "Inventory movement volume.",
        fields: [
          "id",
          "name",
          "product_id",
          "product_uom_qty",
          "quantity_done",
          "location_id",
          "location_dest_id",
          "state",
          "date"
        ]
      }
    ],
    missing: [
      "Approved valuation/COGS policy."
    ]
  },
  "WAR-05": {
    code: "WAR-05",
    status: "ready",
    formula: "Sellable products at/below threshold / active sellable products.",
    sources: [
      {
        model: "stock.quant",
        role: "Available/on-hand quantity by product/location.",
        fields: [
          "id",
          "product_id",
          "location_id",
          "quantity",
          "reserved_quantity",
          "available_quantity",
          "company_id",
          "write_date"
        ]
      },
      {
        model: "product.product",
        role: "Active sellable product list.",
        fields: [
          "id",
          "display_name",
          "default_code",
          "barcode",
          "active",
          "sale_ok",
          "purchase_ok",
          "type",
          "categ_id"
        ]
      }
    ]
  },
  "WAR-06": {
    code: "WAR-06",
    status: "ready",
    formula: "Average hours from incoming receipt create/scheduled date to done date.",
    sources: [
      {
        model: "stock.picking",
        dateField: "date_done",
        domain: [
          [
            "picking_type_code",
            "=",
            "incoming"
          ],
          [
            "state",
            "=",
            "done"
          ]
        ],
        role: "Incoming receipt timestamps.",
        fields: [
          "id",
          "name",
          "origin",
          "state",
          "scheduled_date",
          "date_deadline",
          "date_done",
          "create_date",
          "picking_type_code"
        ]
      }
    ]
  },
  "HR-01": {
    code: "HR-01",
    status: "partial",
    formula: "Employees who left during period / average active employees.",
    sources: [
      {
        model: "hr.employee",
        role: "Employee master; department/job names may be available as many2one display values.",
        fields: [
          "id",
          "name",
          "active",
          "department_id",
          "job_id",
          "job_title",
          "user_id",
          "work_email",
          "create_date",
          "write_date"
        ]
      }
    ],
    substitutions: [
      "Use department/job display fields on hr.employee when hr.department/hr.job are denied."
    ],
    missing: [
      "Confirmed termination date/status convention."
    ]
  },
  "MKT-01": {
    code: "MKT-01",
    status: "partial",
    formula: "(campaign revenue - campaign cost) / campaign cost.",
    sources: [
      {
        model: "crm.lead",
        dateField: "create_date",
        role: "Leads/opportunities by campaign/source.",
        fields: [
          "id",
          "name",
          "type",
          "stage_id",
          "campaign_id",
          "medium_id",
          "source_id",
          "expected_revenue",
          "probability",
          "team_id",
          "user_id",
          "create_date"
        ]
      },
      {
        model: "sale.order",
        dateField: "date_order",
        role: "Revenue that may carry campaign/source fields.",
        fields: [
          "id",
          "name",
          "state",
          "partner_id",
          "user_id",
          "team_id",
          "campaign_id",
          "medium_id",
          "source_id",
          "amount_total",
          "date_order"
        ]
      }
    ],
    missing: [
      "Campaign spend source."
    ]
  },
  "MKT-02": {
    code: "MKT-02",
    status: "partial",
    formula: "Campaign spend / lead count.",
    sources: [
      {
        model: "crm.lead",
        dateField: "create_date",
        role: "Lead count by campaign/source.",
        fields: [
          "id",
          "name",
          "type",
          "stage_id",
          "campaign_id",
          "medium_id",
          "source_id",
          "expected_revenue",
          "probability",
          "team_id",
          "user_id",
          "create_date"
        ]
      }
    ],
    missing: [
      "Campaign spend source."
    ]
  },
  "SAL-08": {
    code: "SAL-08",
    status: "ready",
    formula: "Total actual GMV from Odoo sale orders / total target from sales_targets.",
    sources: [
      {
        model: "sale.order",
        dateField: "date_order",
        domain: [
          [
            "state",
            "in",
            [
              "sale",
              "done"
            ]
          ]
        ],
        role: "Confirmed sale orders with amounts.",
        fields: [
          "id",
          "name",
          "state",
          "partner_id",
          "user_id",
          "team_id",
          "amount_total",
          "date_order",
          "currency_id"
        ]
      }
    ]
  },
  "DEL-01": {
    code: "DEL-01",
    status: "ready",
    formula: "Incoming pickings done on/before deadline / total done incoming pickings.",
    sources: [
      {
        model: "stock.picking",
        dateField: "date_done",
        domain: [
          [
            "state",
            "=",
            "done"
          ]
        ],
        role: "Completed pickings with scheduling data.",
        fields: [
          "id",
          "name",
          "origin",
          "state",
          "scheduled_date",
          "date_deadline",
          "date_done",
          "picking_type_id",
          "picking_type_code",
          "create_date"
        ]
      }
    ]
  },
  "DEL-03": {
    code: "DEL-03",
    status: "ready",
    formula: "Average hours from picking create_date to date_done for completed pickings.",
    sources: [
      {
        model: "stock.picking",
        dateField: "date_done",
        domain: [
          [
            "state",
            "=",
            "done"
          ]
        ],
        role: "Completed pickings for delivery time calculation.",
        fields: [
          "id",
          "name",
          "state",
          "create_date",
          "scheduled_date",
          "date_done",
          "picking_type_code"
        ]
      }
    ]
  },
  "DEL-06": {
    code: "DEL-06",
    status: "partial",
    formula: "Returned pickings / total pickings. Uses incoming pickings as proxy.",
    sources: [
      {
        model: "stock.picking",
        dateField: "date_done",
        domain: [
          [
            "state",
            "=",
            "done"
          ]
        ],
        role: "All completed pickings for return rate.",
        fields: [
          "id",
          "name",
          "state",
          "picking_type_code",
          "origin",
          "date_done",
          "create_date"
        ]
      }
    ],
    missing: [
      "Explicit return picking type code may differ by installation."
    ]
  },
  "WAR-02": {
    code: "WAR-02",
    status: "partial",
    formula: "Picking accuracy: pickings with no quantity variance / total done pickings.",
    sources: [
      {
        model: "stock.move",
        dateField: "write_date",
        domain: [
          [
            "state",
            "=",
            "done"
          ]
        ],
        role: "Completed stock moves for picking accuracy.",
        fields: [
          "id",
          "product_id",
          "product_uom_qty",
          "quantity_done",
          "state",
          "picking_id",
          "write_date"
        ]
      }
    ],
    missing: [
      "Needs comparison of ordered vs done quantities at picking level."
    ]
  },
  "WAR-05": {
    code: "WAR-05",
    status: "ready",
    formula: "Sellable products at/below threshold / active sellable products.",
    sources: [
      {
        model: "stock.quant",
        role: "Available/on-hand quantity by product/location.",
        fields: [
          "id",
          "product_id",
          "location_id",
          "quantity",
          "reserved_quantity",
          "available_quantity",
          "company_id",
          "write_date"
        ]
      },
      {
        model: "product.product",
        role: "Active sellable product list.",
        fields: [
          "id",
          "display_name",
          "default_code",
          "barcode",
          "active",
          "sale_ok",
          "purchase_ok",
          "type",
          "categ_id"
        ]
      }
    ]
  }
};
function parsePeriod(value, fallback) {
  if (!value) {
    return fallback.toISOString().slice(0, 19).replace("T", " ");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid period date: ${value}`);
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}
function boundedLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}
function normalizeCodes(codes) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return Object.keys(KPI_CONFIGS);
  }
  return Array.from(new Set(codes.map((code)=>String(code ?? "").trim().toUpperCase()).filter(Boolean)));
}
async function readableFields(uid, password, model, wantedFields) {
  const fieldMap = await executeOdooKwWithCredentials({
    uid,
    password,
    model,
    methodName: "fields_get",
    args: [],
    kwargs: {
      attributes: [
        "string",
        "type"
      ]
    }
  });
  const available = new Set(Object.keys(fieldMap ?? {}));
  return wantedFields.filter((field)=>available.has(field));
}
async function fetchSource({ uid, password, source, periodStart, periodEnd, limit }) {
  const fields = await readableFields(uid, password, source.model, source.fields);
  if (fields.length === 0) {
    throw new Error(`No configured fields are readable for ${source.model}.`);
  }
  const domain = [
    ...source.domain ?? []
  ];
  if (source.dateField) {
    domain.push([
      source.dateField,
      ">=",
      periodStart
    ], [
      source.dateField,
      "<=",
      periodEnd
    ]);
  }
  const rows = await executeOdooKwWithCredentials({
    uid,
    password,
    model: source.model,
    methodName: "search_read",
    args: [
      domain
    ],
    kwargs: {
      fields,
      limit,
      order: source.order ?? (fields.includes("write_date") ? "write_date desc" : fields.includes("date") ? "date desc" : "id desc")
    }
  });
  return {
    model: source.model,
    role: source.role,
    status: "readable",
    fields,
    rowCount: Array.isArray(rows) ? rows.length : 0,
    rows: Array.isArray(rows) ? rows : []
  };
}
function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
function dateValue(value) {
  if (!value || value === false) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function daysBetween(start, end) {
  if (!start || !end || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end.getTime() < start.getTime()) {
    return undefined;
  }
  return (end.getTime() - start.getTime()) / 86_400_000;
}
function hoursBetween(start, end) {
  const days = daysBetween(start, end);
  return days === undefined ? undefined : days * 24;
}
function referenceId(value) {
  if (Array.isArray(value) && value.length > 0) return String(value[0] ?? "").trim() || null;
  const raw = String(value ?? "").trim();
  return raw && raw !== "false" ? raw : null;
}
function average(values) {
  const clean = values.filter((value)=>Number.isFinite(value));
  if (clean.length === 0) return undefined;
  return clean.reduce((sum, value)=>sum + value, 0) / clean.length;
}
function percent(numerator, denominator) {
  return denominator > 0 ? numerator / denominator * 100 : undefined;
}
function rowsFor(sources, model) {
  const source = sources.find((item)=>item.model === model && item.status === "readable");
  return "rows" in (source ?? {}) && Array.isArray(source.rows) ? source.rows : [];
}
function sourceNote(config, fallback) {
  const missing = config.missing?.length ? ` ${config.missing.join(" ")}` : "";
  return `${fallback}${missing}`;
}
function calculateKpiValue(code, config, sources) {
  const purchaseOrders = rowsFor(sources, "purchase.order");
  const purchaseLines = rowsFor(sources, "purchase.order.line");
  const supplierInfo = rowsFor(sources, "product.supplierinfo");
  const pickings = rowsFor(sources, "stock.picking");
  const invoices = rowsFor(sources, "account.move");
  const quants = rowsFor(sources, "stock.quant");
  const products = rowsFor(sources, "product.product");
  const saleOrders = rowsFor(sources, "sale.order");
  const stockMoves = rowsFor(sources, "stock.move");
  switch(code){
    case "PRO-01":
      {
        const baselineByProduct = new Map();
        for (const row of supplierInfo){
          const productId = referenceId(row.product_id);
          const price = numberValue(row.price);
          if (!productId || !price || price <= 0) continue;
          const current = baselineByProduct.get(productId);
          if (current === undefined || price < current) baselineByProduct.set(productId, price);
        }
        let baselineTotal = 0;
        let actualTotal = 0;
        for (const row of purchaseLines){
          const productId = referenceId(row.product_id);
          const baseline = productId ? baselineByProduct.get(productId) : undefined;
          const qty = numberValue(row.product_qty) ?? 0;
          const unitPrice = numberValue(row.price_unit);
          if (!baseline || !unitPrice || qty <= 0) continue;
          baselineTotal += baseline * qty;
          actualTotal += unitPrice * qty;
        }
        return {
          actualValue: baselineTotal > 0 ? (baselineTotal - actualTotal) / baselineTotal * 100 : undefined,
          note: sourceNote(config, "Calculated from Odoo purchase prices against supplier price list baseline.")
        };
      }
    case "PRO-02":
      {
        const orderDateByName = new Map();
        for (const order of purchaseOrders){
          const name = String(order.name ?? "").trim();
          const orderDate = dateValue(order.date_approve) ?? dateValue(order.date_order) ?? dateValue(order.create_date);
          if (name && orderDate) orderDateByName.set(name, orderDate);
        }
        const values = pickings.map((picking)=>{
          const origin = String(picking.origin ?? "").trim();
          const start = orderDateByName.get(origin) ?? dateValue(picking.scheduled_date);
          return daysBetween(start ?? null, dateValue(picking.date_done));
        });
        return {
          actualValue: average(values),
          note: "Calculated from Odoo purchase orders and incoming receipt completion dates."
        };
      }
    case "PRO-03":
      return {
        actualValue: average(purchaseOrders.map((order)=>daysBetween(dateValue(order.date_order), dateValue(order.date_approve) ?? dateValue(order.effective_date) ?? dateValue(order.write_date)))),
        note: "Calculated from Odoo purchase order creation to approval."
      };
    case "PRO-04":
      {
        const completed = pickings.filter((picking)=>dateValue(picking.date_done));
        const onTime = completed.filter((picking)=>{
          const planned = dateValue(picking.date_deadline) ?? dateValue(picking.scheduled_date);
          const done = dateValue(picking.date_done);
          return planned && done && done.getTime() <= planned.getTime();
        }).length;
        return {
          actualValue: percent(onTime, completed.length),
          note: "Calculated from Odoo incoming receipts completed on or before planned date."
        };
      }
    case "PRO-05":
      {
        const counted = purchaseOrders.filter((order)=>dateValue(order.date_order) && dateValue(order.date_planned));
        const emergency = counted.filter((order)=>{
          const leadDays = daysBetween(dateValue(order.date_order), dateValue(order.date_planned));
          const priority = String(order.priority ?? "").trim();
          return leadDays !== undefined && leadDays <= 2 || priority === "1";
        }).length;
        return {
          actualValue: percent(emergency, counted.length),
          note: sourceNote(config, "Calculated from Odoo POs using short requested lead time as emergency proxy.")
        };
      }
    case "PRO-06":
      {
        const closedLines = purchaseLines.filter((row)=>{
          const qty = numberValue(row.product_qty) ?? 0;
          return qty > 0 && [
            "purchase",
            "done"
          ].includes(String(row.state ?? "").trim());
        });
        const accurate = closedLines.filter((row)=>{
          const ordered = numberValue(row.product_qty) ?? 0;
          const received = numberValue(row.qty_received) ?? 0;
          return Math.abs(ordered - received) <= 0.001;
        }).length;
        return {
          actualValue: percent(accurate, closedLines.length),
          note: "Calculated from Odoo PO lines where received quantity matches ordered quantity."
        };
      }
    case "PRO-07":
      return {
        actualValue: undefined,
        note: sourceNote(config, "Odoo purchase spend is available, but budget adherence needs a budget source before a percent can be shown.")
      };
    case "PRO-09":
      {
        const closedLines = purchaseLines.filter((row)=>{
          const qty = numberValue(row.product_qty) ?? 0;
          return qty > 0 && [
            "purchase",
            "done"
          ].includes(String(row.state ?? "").trim());
        });
        const shortReceived = closedLines.filter((row)=>(numberValue(row.qty_received) ?? 0) < (numberValue(row.product_qty) ?? 0)).length;
        return {
          actualValue: percent(shortReceived, closedLines.length),
          note: sourceNote(config, "Calculated from Odoo PO lines using short received quantity as rejection proxy.")
        };
      }
    case "FIN-02":
      {
        const today = new Date();
        const openInvoices = invoices.filter((invoice)=>(numberValue(invoice.amount_residual) ?? 0) > 0);
        return {
          actualValue: average(openInvoices.map((invoice)=>daysBetween(dateValue(invoice.invoice_date), today))),
          note: "Calculated from Odoo posted customer invoices with outstanding residual amounts."
        };
      }
    case "FIN-03":
      {
        const regularInvoices = invoices.filter((invoice)=>String(invoice.move_type ?? "") === "out_invoice").length;
        const refunds = invoices.filter((invoice)=>String(invoice.move_type ?? "") === "out_refund").length;
        return {
          actualValue: regularInvoices > 0 ? (regularInvoices - refunds) / regularInvoices * 100 : undefined,
          note: sourceNote(config, "Calculated from Odoo customer invoices and refunds as correction proxy.")
        };
      }
    case "WAR-05":
      {
        const qtyByProduct = new Map();
        for (const quant of quants){
          const productId = referenceId(quant.product_id);
          if (!productId) continue;
          qtyByProduct.set(productId, (qtyByProduct.get(productId) ?? 0) + (numberValue(quant.available_quantity) ?? numberValue(quant.quantity) ?? 0));
        }
        const productIds = products.length > 0 ? products.map((product)=>referenceId(product.id)).filter((id)=>Boolean(id)) : Array.from(qtyByProduct.keys());
        const stockouts = productIds.filter((productId)=>(qtyByProduct.get(productId) ?? 0) <= 0).length;
        return {
          actualValue: percent(stockouts, productIds.length),
          note: "Calculated from Odoo available stock by product."
        };
      }
    case "WAR-06":
      return {
        actualValue: average(pickings.map((picking)=>hoursBetween(dateValue(picking.create_date) ?? dateValue(picking.scheduled_date), dateValue(picking.date_done)))),
        note: "Calculated from Odoo incoming receipt creation/scheduled time to completion."
      };
    case "SAL-08":
      {
        const totalActual = saleOrders.reduce((sum, order)=>sum + (numberValue(order.amount_total) ?? 0), 0);
        return {
          actualValue: totalActual > 0 ? totalActual : undefined,
          note: "Sum of confirmed Odoo sale order amounts. Divide by target on the client side."
        };
      }
    case "DEL-01":
      {
        const completedPickings = pickings.filter((picking)=>dateValue(picking.date_done));
        const onTimePickings = completedPickings.filter((picking)=>{
          const deadline = dateValue(picking.date_deadline) ?? dateValue(picking.scheduled_date);
          const done = dateValue(picking.date_done);
          return deadline && done && done.getTime() <= deadline.getTime();
        }).length;
        return {
          actualValue: percent(onTimePickings, completedPickings.length),
          note: "Calculated from Odoo completed pickings delivered on or before deadline."
        };
      }
    case "DEL-03":
      {
        const deliveryTimes = pickings.filter((picking)=>dateValue(picking.date_done)).map((picking)=>hoursBetween(dateValue(picking.create_date) ?? dateValue(picking.scheduled_date), dateValue(picking.date_done)));
        return {
          actualValue: average(deliveryTimes),
          note: "Average hours from Odoo picking creation to completion."
        };
      }
    case "DEL-06":
      {
        const allDone = pickings.filter((picking)=>dateValue(picking.date_done));
        const returns = allDone.filter((picking)=>{
          const name = String(picking.name ?? "").toLowerCase();
          const origin = String(picking.origin ?? "").toLowerCase();
          const pickingType = String(picking.picking_type_code ?? "").toLowerCase();
          return name.includes("return") || origin.includes("return") || pickingType === "return";
        }).length;
        return {
          actualValue: percent(returns, allDone.length),
          note: sourceNote(config, "Calculated from Odoo completed pickings flagged as returns.")
        };
      }
    case "WAR-02":
      {
        const doneMoves = stockMoves.filter((move)=>String(move.state ?? "").trim() === "done");
        const accurateMoves = doneMoves.filter((move)=>{
          const ordered = numberValue(move.product_uom_qty) ?? 0;
          const done = numberValue(move.quantity_done) ?? 0;
          return Math.abs(ordered - done) <= 0.001;
        }).length;
        return {
          actualValue: percent(accurateMoves, doneMoves.length),
          note: sourceNote(config, "Calculated from Odoo completed stock moves where done qty matches ordered qty.")
        };
      }
    default:
      return {
        actualValue: undefined,
        note: sourceNote(config, "Odoo source checked, but this KPI still needs a confirmed calculation rule.")
      };
  }
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  if (req.method !== "POST") {
    return jsonResponse({
      success: false,
      error: "Method not allowed."
    }, 405);
  }
  const accessError = await requireOdooSyncAccess(req);
  if (accessError) return accessError;
  try {
    const body = await req.json();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart = parsePeriod(body.periodStart, monthStart);
    const periodEnd = parsePeriod(body.periodEnd, now);
    const limit = boundedLimit(body.limit);
    const uid = requireServiceOdooUid();
    const password = requireServiceOdooPassword();
    const codes = normalizeCodes(body.kpiCodes);
    const results = [];
    const values = [];
    for (const code of codes){
      const config = KPI_CONFIGS[code];
      if (!config) {
        results.push({
          code,
          status: "unsupported",
          error: "This KPI is Supabase/manual only or has no Odoo source mapping yet."
        });
        continue;
      }
      const sources = [];
      for (const source of config.sources){
        try {
          sources.push(await fetchSource({
            uid,
            password,
            source,
            periodStart,
            periodEnd,
            limit
          }));
        } catch (error) {
          sources.push({
            model: source.model,
            role: source.role,
            status: "access_denied_or_unavailable",
            error: formatUnknownError(error)
          });
        }
      }
      const calculated = calculateKpiValue(code, config, sources);
      results.push({
        code,
        status: config.status,
        formula: config.formula,
        substitutions: config.substitutions ?? [],
        missing: config.missing ?? [],
        actualValue: calculated.actualValue ?? null,
        note: calculated.note,
        sources: sources.map((source)=>({
            model: source.model,
            role: source.role,
            status: source.status,
            rowCount: "rowCount" in source ? source.rowCount : 0,
            error: "error" in source ? source.error : undefined
          }))
      });
      values.push({
        code,
        actualValue: calculated.actualValue ?? null,
        note: calculated.note
      });
    }
    // Auto-cache computed values to kpi.odoo_values for RPC consumption
    try {
      const cacheStart = periodStart.slice(0, 10);
      const cacheEnd = periodEnd.slice(0, 10);
      const cacheableValues = values.filter((v)=>v.actualValue !== null && v.actualValue !== undefined);
      if (cacheableValues.length > 0) {
        const rpcValues = cacheableValues.map((v)=>({
            code: v.code,
            actual_value: Number(v.actualValue),
            note: v.note ?? "Calculated from Odoo integration."
          }));
        await supabaseAdmin.rpc("upsert_odoo_kpi_values", {
          p_values: rpcValues,
          p_period_start: cacheStart,
          p_period_end: cacheEnd
        });
      }
    } catch  {
    // cache errors are non-fatal
    }
    return jsonResponse({
      success: true,
      authenticated: true,
      authMode: "supabase_function_secrets",
      period: {
        start: periodStart,
        end: periodEnd
      },
      limit,
      values,
      results
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: formatUnknownError(error)
    }, 400);
  }
});
