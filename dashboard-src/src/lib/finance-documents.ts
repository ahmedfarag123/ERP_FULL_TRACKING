import { supabase } from "./supabase";
import type {
  OdooInvoiceDocument,
  OdooOrder,
  OdooOrderLine,
} from "../types/finance";

// Columns to select (avoids jsonb issues with select=*)
const INVOICE_COLS = "id, order_id, external_invoice_id, external_order_id, invoice_name, move_type, invoice_state, payment_state, partner_ref, invoice_date, amount_total, currency_code, last_sync_at, created_at, updated_at";
const ORDER_COLS = "id, external_order_id, customer_id, customer_name, status, source, order_date, delivered_at, total_amount, currency_code, assigned_user_id, amount_total, amount_untaxed, amount_to_invoice, invoice_status, odoo_order_name, state, created_at, updated_at";
const ORDER_LINE_COLS = "id, order_id, external_line_id, external_order_id, external_product_id, product_name, product_ref, product_code, product_uom, ordered_quantity, delivered_quantity, invoiced_quantity, unit_price, discount_percent, subtotal_amount, total_amount, sort_order, display_type, created_at";
function mapInvoice(row: Record<string, unknown>): OdooInvoiceDocument {
  return {
    id: row.id as string,
    orderId: row.order_id as string | null,
    externalInvoiceId: row.external_invoice_id as string | null,
    externalOrderId: row.external_order_id as string | null,
    invoiceName: row.invoice_name as string,
    moveType: row.move_type as OdooInvoiceDocument["moveType"],
    invoiceState: row.invoice_state as OdooInvoiceDocument["invoiceState"],
    paymentState: row.payment_state as OdooInvoiceDocument["paymentState"],
    partnerRef: row.partner_ref as string | null,
    invoiceDate: row.invoice_date as string | null,
    amountTotal: Number(row.amount_total ?? 0),
    currencyCode: row.currency_code as string,
    rawPayload: (row.raw_payload as Record<string, unknown>) ?? {},
    lastSyncAt: row.last_sync_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapOrder(row: Record<string, unknown>): OdooOrder {
  return {
    id: row.id as string,
    externalOrderId: row.external_order_id as string | null,
    customerId: row.customer_id as string | null,
    customerName: row.customer_name as string | null,
    status: row.status as OdooOrder["status"],
    source: row.source as string,
    orderDate: row.order_date as string | null,
    deliveredAt: row.delivered_at as string | null,
    totalAmount: Number(row.total_amount ?? 0),
    currencyCode: row.currency_code as string,
    assignedUserId: row.assigned_user_id as string | null,
    amountTotal: Number(row.amount_total ?? 0),
    amountUntaxed: Number(row.amount_untaxed ?? 0),
    amountToInvoice: Number(row.amount_to_invoice ?? 0),
    invoiceStatus: row.invoice_status as OdooOrder["invoiceStatus"],
    odooOrderName: row.odoo_order_name as string | null,
    state: row.state as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapOrderLine(row: Record<string, unknown>): OdooOrderLine {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    externalLineId: row.external_line_id as string,
    externalOrderId: row.external_order_id as string | null,
    externalProductId: row.external_product_id as string | null,
    productName: row.product_name as string,
    productRef: row.product_ref as string | null,
    productCode: row.product_code as string | null,
    productUom: row.product_uom as string | null,
    orderedQuantity: Number(row.ordered_quantity ?? 0),
    deliveredQuantity: Number(row.delivered_quantity ?? 0),
    invoicedQuantity: Number(row.invoiced_quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    discountPercent: Number(row.discount_percent ?? 0),
    subtotalAmount: Number(row.subtotal_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    displayType: row.display_type as string | null,
    createdAt: row.created_at as string,
  };
}

// ─── Invoice Documents (from order_invoice_documents) ─────────

export async function fetchInvoices(params?: {
  status?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ invoices: OdooInvoiceDocument[]; count: number }> {
  let query = supabase
    .from("order_invoice_documents")
    .select(INVOICE_COLS, { count: "exact" })
    .order("created_at", { ascending: false });

  if (params?.status) {
    if (params.status === "paid") {
      query = query.eq("payment_state", "paid");
    } else if (params.status === "not_paid") {
      query = query.eq("payment_state", "not_paid");
    } else if (params.status === "partial") {
      query = query.eq("payment_state", "partial");
    } else if (params.status === "cancelled") {
      query = query.eq("invoice_state", "cancel");
    } else if (params.status === "reversed") {
      query = query.eq("payment_state", "reversed");
    } else if (params.status === "posted") {
      query = query.eq("invoice_state", "posted");
    }
  }

  if (params?.fromDate) query = query.gte("invoice_date", params.fromDate);
  if (params?.toDate) query = query.lte("invoice_date", params.toDate);

  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    invoices: (data ?? []).map(mapInvoice),
    count: count ?? 0,
  };
}

export async function fetchInvoiceById(invoiceId: string): Promise<OdooInvoiceDocument | null> {
  const { data, error } = await supabase
    .from("order_invoice_documents")
    .select(INVOICE_COLS)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapInvoice(data as Record<string, unknown>) : null;
}

export async function fetchInvoiceWithOrder(invoiceId: string): Promise<{
  invoice: OdooInvoiceDocument;
  order: OdooOrder | null;
  lines: OdooOrderLine[];
}> {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  let order: OdooOrder | null = null;
  let lines: OdooOrderLine[] = [];

  if (invoice.orderId) {
    const { data: orderData } = await supabase
      .from("orders")
      .select(ORDER_COLS)
      .eq("id", invoice.orderId)
      .maybeSingle();
    order = orderData ? mapOrder(orderData as Record<string, unknown>) : null;

    if (order) {
      const { data: linesData } = await supabase
        .from("order_line_items")
        .select(ORDER_LINE_COLS)
        .eq("order_id", order.id)
        .gte("ordered_quantity", 1)
        .order("sort_order");
      lines = (linesData ?? []).map(mapOrderLine);
    }
  }

  return { invoice, order, lines };
}

// ─── Orders (from orders table) ──────────────────────────────

export async function fetchOrders(params?: {
  status?: string;
  invoiceStatus?: string;
  limit?: number;
  offset?: number;
}): Promise<{ orders: OdooOrder[]; count: number }> {
  let query = supabase
    .from("orders")
    .select(ORDER_COLS, { count: "exact" })
    .order("created_at", { ascending: false });

  if (params?.status) query = query.eq("status", params.status);
  if (params?.invoiceStatus) query = query.eq("invoice_status", params.invoiceStatus);

  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    orders: (data ?? []).map(mapOrder),
    count: count ?? 0,
  };
}

export async function fetchOrderWithLines(orderId: string): Promise<{
  order: OdooOrder;
  lines: OdooOrderLine[];
  invoices: OdooInvoiceDocument[];
}> {
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(ORDER_COLS)
    .eq("id", orderId)
    .single();

  if (orderErr) throw new Error(orderErr.message);

  const { data: lines } = await supabase
    .from("order_line_items")
    .select(ORDER_LINE_COLS)
    .eq("order_id", orderId)
    .gte("ordered_quantity", 1)
    .order("sort_order");

  const { data: invoices } = await supabase
    .from("order_invoice_documents")
    .select(INVOICE_COLS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  return {
    order: mapOrder(order as Record<string, unknown>),
    lines: (lines ?? []).map(mapOrderLine),
    invoices: (invoices ?? []).map(mapInvoice),
  };
}

// ─── Metrics ──────────────────────────────────────────────────

export async function fetchInvoiceMetrics(): Promise<{
  totalOutstanding: number;
  totalPaid: number;
  totalRevenue: number;
  outstandingCount: number;
  paidCount: number;
  draftCount: number;
  cancelledCount: number;
  partialCount: number;
  reversedCount: number;
}> {
  const { data } = await supabase
    .from("order_invoice_documents")
    .select("amount_total, invoice_state, payment_state");

  if (!data) {
    return {
      totalOutstanding: 0, totalPaid: 0, totalRevenue: 0,
      outstandingCount: 0, paidCount: 0, draftCount: 0,
      cancelledCount: 0, partialCount: 0, reversedCount: 0,
    };
  }

  let totalOutstanding = 0;
  let totalPaid = 0;
  let totalRevenue = 0;
  let outstandingCount = 0;
  let paidCount = 0;
  let draftCount = 0;
  let cancelledCount = 0;
  let partialCount = 0;
  let reversedCount = 0;

  for (const inv of data as Array<{
    amount_total: number;
    invoice_state: string;
    payment_state: string;
  }>) {
    totalRevenue += inv.amount_total ?? 0;

    if (inv.invoice_state === "cancel") {
      cancelledCount++;
    } else if (inv.payment_state === "paid") {
      totalPaid += inv.amount_total;
      paidCount++;
    } else if (inv.payment_state === "not_paid") {
      totalOutstanding += inv.amount_total;
      outstandingCount++;
    } else if (inv.payment_state === "partial") {
      totalOutstanding += inv.amount_total * 0.5;
      partialCount++;
    } else if (inv.payment_state === "reversed") {
      reversedCount++;
    } else if (inv.invoice_state === "draft") {
      draftCount++;
    }
  }

  return {
    totalOutstanding, totalPaid, totalRevenue,
    outstandingCount, paidCount, draftCount,
    cancelledCount, partialCount, reversedCount,
  };
}

export async function fetchARAging(): Promise<
  { label: string; amount: number; invoiceCount: number }[]
> {
  const now = new Date();
  const buckets = [
    { label: "Current", amount: 0, invoiceCount: 0 },
    { label: "1-30 Days", amount: 0, invoiceCount: 0 },
    { label: "31-60 Days", amount: 0, invoiceCount: 0 },
    { label: "61-90 Days", amount: 0, invoiceCount: 0 },
    { label: "90+ Days", amount: 0, invoiceCount: 0 },
  ];

  const { data } = await supabase
    .from("order_invoice_documents")
    .select("amount_total, invoice_date, payment_state, invoice_state")
    .eq("invoice_state", "posted")
    .neq("payment_state", "paid");

  if (!data) return buckets;

  for (const inv of data as Array<{
    amount_total: number;
    invoice_date: string;
    payment_state: string;
  }>) {
    if (!inv.invoice_date) continue;
    const invoiceDate = new Date(inv.invoice_date);
    const diffDays = Math.floor(
      (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let bucketIndex = 0;
    if (diffDays <= 0) bucketIndex = 0;
    else if (diffDays <= 30) bucketIndex = 1;
    else if (diffDays <= 60) bucketIndex = 2;
    else if (diffDays <= 90) bucketIndex = 3;
    else bucketIndex = 4;

    buckets[bucketIndex].amount += inv.amount_total;
    buckets[bucketIndex].invoiceCount += 1;
  }

  return buckets;
}
