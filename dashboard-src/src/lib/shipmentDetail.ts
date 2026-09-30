import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Shape of public.logistics_shipment_detail(uuid) — migration 00191.
 *
 * Money rules baked into the RPC (do not recompute these on the client):
 *  - `full_order_price` is COALESCE(orders.total_amount, orders.amount_total), i.e. the
 *    FULL order price. It is NOT amount_to_invoice (populated on only 1.9% of delivered
 *    shipments) and NOT logistics_order_collections.order_total (which is the invoiced
 *    amount — on shipment SH-HS05014 it is 2852 while the order total is 3167).
 *  - `delivered_value` is Σ(unit_price × done_quantity × (1 − discount%)).
 *  - Order lines are de-duplicated per (order_id, price_key) keeping the freshest row, so
 *    duplicated lines (74 orders, worst 8) cannot multiply item rows or inflate totals.
 *  - `unpriced_items` counts item rows that found no order line. They are NEVER priced at
 *    0 — the UI surfaces the count instead.
 */
export interface ShipmentDetailItem {
  id: string;
  external_product_id: string | null;
  product_name: string | null;
  product_ref: string | null;
  product_id: string | null;
  source: string | null;
  move_state: string | null;
  requested_quantity: number | null;
  reserved_quantity: number | null;
  done_quantity: number | null;
  approved_quantity: number | null;
  forecast_quantity: number | null;
  returned_quantity: number | null;
  source_location_ref: string | null;
  destination_location_ref: string | null;
  priced: boolean;
  unit_price: number | null;
  discount_percent: number | null;
  line_total: number | null;
  order_ordered_quantity: number | null;
  delivered_value: number | null;
  /** Ordered but never delivered for this line. Not deducted from delivered_value. */
  unfulfilled_value: number | null;
  unfulfilled_qty: number | null;
  return_value: number | null;
}

export interface ShipmentDetailReturn {
  id: string;
  return_shipment_id: string | null;
  parent_shipment_id: string | null;
  parent_item_id: string | null;
  external_product_id: string | null;
  product_name: string | null;
  product_ref: string | null;
  product_id: string | null;
  return_reason: string | null;
  requested_quantity: number | null;
  approved_quantity: number | null;
  delivered_quantity: number | null;
  returned_quantity: number | null;
  received_quantity: number | null;
  priced: boolean;
  unit_price: number | null;
  discount_percent: number | null;
  return_value: number | null;
  received_value: number | null;
  /** Clamped to the line's own shortfall: LEAST(returned, requested - delivered). */
  effective_returned_qty: number | null;
  unfulfilled_value: number | null;
  /** Portion of this row's stored return_value that exceeded the shortfall and was dropped. */
  phantom_value: number | null;
  /** The physical return shipment this row hangs off, so the page can show where it is. */
  return_shipment_reference: string | null;
  return_shipment_status: string | null;
  return_shipment_phase: string | null;
}

export interface ShipmentDetailOrder {
  id: string | null;
  external_order_id: string | null;
  odoo_order_name: string | null;
  order_number: string | null;
  customer_name: string | null;
  match_source: string | null;
  full_order_price: number | null;
  total_amount: number | null;
  amount_total: number | null;
  amount_untaxed: number | null;
  amount_undiscounted: number | null;
  amount_to_invoice: number | null;
  currency_code: string | null;
  payment_method: string | null;
  invoice_status: string | null;
  state: string | null;
  shipping_cost: number | null;
  margin: number | null;
  salesperson: string | null;
}

/** logistics_shipment_collections — strictly 1:1 with a shipment. */
export interface ShipmentDetailCollection {
  exists: boolean;
  collection_status: string | null;
  pending_delivery_amount: number | null;
  collected_from_customer: number | null;
  collected_successfully_amount: number | null;
  driver_debt_amount: number | null;
  /** driver_debt > 0 while nothing was confirmed = the money is still with the driver. */
  driver_holds_money: boolean;
  outstanding_amount: number | null;
  /** Net amount actually collectible once recorded returns are taken off. */
  net_collectible: number | null;
  /** False when the stored pending_delivery_amount predates a return and no longer matches net. */
  pending_matches_net: boolean;
  /** Headline identity of the return shipment raised from this delivery, if any. */
  return_shipment: {
    id: string | null;
    reference: string | null;
    status: string | null;
    phase: string | null;
    completed_at: string | null;
  } | null;
  currency_code: string | null;
  payment_method: string | null;
  installment_count: number | null;
  accounting_status: string | null;
  transfer_responsible_name: string | null;
  cheque_reference: string | null;
  sales_rep_name: string | null;
  collected_by_name: string | null;
  admin_confirmed_by_name: string | null;
  collected_from_customer_at: string | null;
  admin_confirmed_at: string | null;
  payment_collected_at: string | null;
  driver_notes: string | null;
}

/** logistics_order_collections — a small parallel record (86 rows). Its `order_total` is
 *  the INVOICED amount, so it is shown as supporting detail, never as the order price. */
export interface ShipmentDetailOrderCollection {
  exists: boolean;
  /** How many logistics_order_collections rows share this shipment_id. The table is unique
   *  on (shipment_id, order_id) only, so a shipment can own several (measured: 3). The RPC
   *  returns the row matching the resolved order and reports the total here. */
  sibling_rows: number | null;
  order_number: string | null;
  order_total: number | null;
  collected_amount: number | null;
  driver_debt_amount: number | null;
  collection_status: string | null;
  payment_method: string | null;
  installment_count: number | null;
  accounting_status: string | null;
  transfer_responsible_name: string | null;
  cheque_reference: string | null;
  sales_rep_name: string | null;
  collected_at: string | null;
  confirmed_at: string | null;
  legs: Array<{
    id: string;
    payment_method: string | null;
    amount: number | null;
    installment_count: number | null;
    transfer_responsible_name: string | null;
    cheque_reference: string | null;
  }>;
}

export interface ShipmentDetailPlanCheck {
  exists: boolean;
  check_status: string | null;
  review_status: string | null;
  payment_method: string | null;
  reason: string | null;
  driver_notes: string | null;
  admin_notes: string | null;
  sales_rep_name: string | null;
  /** The driver who submitted the collection check. */
  driver_name: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  proof_photo_url: string | null;
}

/** logistics_shipment_events — the shipment timeline, newest first. */
export interface ShipmentDetailEvent {
  id: string;
  created_at: string | null;
  previous_phase: string | null;
  next_phase: string | null;
  note: string | null;
  actor_name: string | null;
  proof_photo_path: string | null;
  payload: Record<string, unknown> | null;
}

export interface ShipmentDetailJournalEntry {
  id: string;
  entry_number: string | null;
  source_type: string | null;
  status: string | null;
  entry_date: string | null;
  description: string | null;
  posted_total: number | null;
  posted_at: string | null;
}

export interface ShipmentDetailDriver {
  names: string[];
  primary: string | null;
  co_drivers: string[];
  co_driver_count: number;
  /** Which of the five sources resolved, so the UI never presents a guess as fact. */
  source: string | null;
}

export interface ShipmentDetailPricing {
  currency: string;
  full_order_price: number | null;
  delivered_value: number;
  /** Net amount owed by the customer. Equals delivered_value: a "return" here means goods
   *  the driver never handed over, which were never part of the delivered total, so they
   *  must not be subtracted from it. */
  net_value: number;
  /** Value of the clamped, physically-plausible returns (subset of the shortfall). */
  returns_value: number;
  /** Ordered but never delivered (authoritative, from shipment items). Not deducted. */
  unfulfilled_value: number;
  /** The return-row shortfall value, kept for reconciliation against unfulfilled_value. */
  returns_unfulfilled_value: number;
  /** Value that 00191 wrongly treated as a return and has now been removed. Shown so the
   *  page can explain where a previously-inflated number went. */
  phantom_value: number;
  received_value: number;
  unpriced_items: number;
  unpriced_returns: number;
  price_dupes: number;
  item_count: number;
  priced_count: number;
  requested_qty: number;
  /** Quantity actually delivered, i.e. requested minus recorded returns. */
  done_qty: number;
  /** Quantity the driver confirmed on the road, before returns are deducted. */
  loaded_qty: number;
  delivered_qty: number;
  reserved_qty: number;
  unfulfilled_qty: number;
  /** Authoritative return quantity (sum of effective per-row returns). */
  returned_qty: number;
  /** Raw stored returned_quantity (equals the authoritative amount after migration 00194). */
  returned_qty_raw: number;
  returns_returned_qty_raw: number;
  return_count: number;
  returns_received_qty: number;
  has_order: boolean;
  has_prices: boolean;
  gmv: number | null;
  delivered_invoice_amount: number | null;
}

export interface ShipmentDetailResult {
  shipment: Record<string, unknown> | null;
  order: ShipmentDetailOrder | null;
  customer: Record<string, unknown> | null;
  driver: ShipmentDetailDriver | null;
  items: ShipmentDetailItem[];
  returns: ShipmentDetailReturn[];
  collection: ShipmentDetailCollection | null;
  order_collection: ShipmentDetailOrderCollection | null;
  plan_check: ShipmentDetailPlanCheck | null;
  journal: ShipmentDetailJournalEntry[];
  events: ShipmentDetailEvent[];
  pricing: ShipmentDetailPricing | null;
}

// ─── Labels ──────────────────────────────────────────────────────────────────

/** The three real collection states, under their own names. */
export const COLLECTION_STATUS_LABELS: Record<string, string> = {
  pending_delivery_amount: "مبلغ مستحق للتحصيل",
  collected_successfully: "تم تحصيله بنجاح",
  collected_from_customer: "محصّل من العميل",
  not_collected_by_courier: "لم يحصّله المندوب",
};

/** Order-level states (logistics_order_collections.collection_status). */
export const ORDER_COLLECTION_STATUS_LABELS: Record<string, string> = {
  pending: "مستحق للتحصيل",
  collected: "تم تحصيله",
  confirmed: "مؤكَّد محاسبيًا",
  exempt: "معفى من التحصيل",
};

/** driver_plan_collection_checks.review_status. */
export const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار مراجعة الإدارة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
};

/** Collection check status. */
export const CHECK_STATUS_LABELS: Record<string, string> = {
  collected: "تم التحصيل",
  not_collected: "لم يتم التحصيل",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  cash_on_delivery: "نقدي عند التسليم",
  cheque: "شيك",
  bank_transfer: "تحويل بنكي",
  wallet: "محفظة إلكترونية",
  credit: "آجل",
  cod: "نقدي عند التسليم",
};

export const ACCOUNTING_STATUS_LABELS: Record<string, string> = {
  pending_accounting_review: "بانتظار المراجعة المحاسبية",
  accounted: "تمت المحاسبة",
  confirmed: "مؤكَّد محاسبيًا",
  rejected: "مرفوض",
};

export const ORDER_MATCH_SOURCE_LABELS: Record<string, string> = {
  odoo_order_name: "ربط باسم الطلب في أودو",
  linked_order_id: "ربط بالطلب المرتبط",
  external_order_id: "ربط بمعرف الطلب الخارجي",
};

export const RETURN_REASON_LABELS: Record<string, string> = {
  driver_partial_delivery: "تسليم جزئي من السائق",
  customer_refused: "رفض العميل الاستلام",
  customer_absent: "العميل غير متواجد",
  damaged: "بضاعة تالفة",
  wrong_product: "منتج غير مطابق",
  expired: "منتهي الصلاحية",
  other: "سبب آخر",
};

export const JOURNAL_SOURCE_LABELS: Record<string, string> = {
  delivery: "قيد تسليم طلب",
  reversal: "قيد عكسي لشحنة",
};

export const DRIVER_SOURCE_LABELS: Record<string, string> = {
  "ملف الشحنة": "من ملف الشحنة",
  "مستخدم الشحنة": "من مستخدم الشحنة",
  "خطة التوصيل": "من خطة التوصيل",
  "مسؤول الخطة": "من مسؤول الخطة",
  "سائق الشحنة": "من سجل سائق الشحنة",
};

/**
 * Delivery phases plus the two event-only pseudo-phases. The timeline reads far better
 * as "من X → إلى Y" than as raw snake_case keys.
 */
export const PHASE_LABELS: Record<string, string> = {
  pending: "بانتظار الإسناد",
  ready: "جاهزة للتحميل",
  assigned: "مسندة لمندوب",
  arrived_pickup: "وصلت لنقطة التحميل",
  picked_up: "تم الاستلام من المندوب",
  in_transit: "في الطريق",
  arrived_delivery: "وصلت لعميل",
  delivered: "تم التسليم",
  settled: "مُسوّاة",
  cancelled: "ملغاة",
  failed: "فشل التسليم",
  return_created: "تم إنشاء شحنة مرتجع",
  collection_submitted: "تم إرسال التحصيل",
};

/** logistics_shipments.shipment_status. */
export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGN: "بانتظار إسناد مندوب",
  ASSIGNED: "مسندة لمندوب",
  PICKUP: "قيد الاستلام",
  OUT_FOR_DELIVERY: "خرجت للتوصيل",
  DELIVERED: "تم التسليم",
  SETTLED: "مُسوّاة",
  CANCELLED: "ملغاة",
};

/** finance_journal_entries.status. */
export const JOURNAL_STATUS_LABELS: Record<string, string> = {
  posted: "مرحّل",
  draft: "مسودة",
};

/**
 * System-generated event notes, matched EXACTLY. Anything not in this map is real
 * free text typed by a driver or admin and is rendered verbatim, because those notes
 * are frequently already Arabic and must never be rewritten.
 */
export const SYSTEM_EVENT_NOTE_LABELS: Record<string, string> = {
  "Driver picked up all assigned shipments": "استلم المندوب كل الشحنات المسندة",
  "Driver checked in at pickup point": "سجّل المندوب الحضور في نقطة التحميل",
  "Driver started delivery route": "بدأ المندوب خط التسليم",
  "Driver confirmed full load": "أكّد المندوب التحميل بالكامل",
  "Order collections submitted": "تم إرسال تحصيلات الطلبات",
  "Return shipment created from delivery": "تم إنشاء شحنة مرتجع من شحنة التسليم",
  "Auto-created return shipment": "تم إنشاء شحنة مرتجع تلقائيًا",
  "Driver arrived at customer": "وصل المندوب للعميل",
  "other": "أخرى",
};

function labelFrom(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "--";
  return map[key] ?? key;
}

export function phaseLabel(key: string | null | undefined): string {
  return labelFrom(PHASE_LABELS, key);
}
export function shipmentStatusLabel(key: string | null | undefined): string {
  return labelFrom(SHIPMENT_STATUS_LABELS, key);
}
export function journalStatusLabel(key: string | null | undefined): string {
  return labelFrom(JOURNAL_STATUS_LABELS, key);
}
/** Returns a translated string only for known system notes; null means "render verbatim". */
export function systemEventNoteLabel(note: string | null | undefined): string | null {
  if (!note) return null;
  return SYSTEM_EVENT_NOTE_LABELS[note] ?? null;
}
/**
 * The loaded→shortfall pattern of a load note ("Partial load confirmed. Driver loaded
 * 6 items.") is also a template, so it can be Arabicised without losing the real number.
 */
export function partialLoadNoteLabel(note: string): string | null {
  const m = /^Partial load confirmed\. Driver loaded (\d+) items\.$/.exec(note);
  return m ? `تم تأكيد تحميل جزئي. حمّل المندوب ${m[1]} صنف.` : null;
}

export function collectionStatusLabel(key: string | null | undefined): string {
  return labelFrom(COLLECTION_STATUS_LABELS, key);
}
export function orderCollectionStatusLabel(key: string | null | undefined): string {
  return labelFrom(ORDER_COLLECTION_STATUS_LABELS, key);
}
export function reviewStatusLabel(key: string | null | undefined): string {
  return labelFrom(REVIEW_STATUS_LABELS, key);
}
export function checkStatusLabel(key: string | null | undefined): string {
  return labelFrom(CHECK_STATUS_LABELS, key);
}
export function paymentMethodLabel(key: string | null | undefined): string {
  return labelFrom(PAYMENT_METHOD_LABELS, key);
}
export function accountingStatusLabel(key: string | null | undefined): string {
  return labelFrom(ACCOUNTING_STATUS_LABELS, key);
}
export function orderMatchSourceLabel(key: string | null | undefined): string {
  return labelFrom(ORDER_MATCH_SOURCE_LABELS, key);
}
export function returnReasonLabel(key: string | null | undefined): string {
  return labelFrom(RETURN_REASON_LABELS, key);
}
export function journalSourceLabel(key: string | null | undefined): string {
  return labelFrom(JOURNAL_SOURCE_LABELS, key);
}
export function driverSourceLabel(key: string | null | undefined): string {
  return labelFrom(DRIVER_SOURCE_LABELS, key);
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

/**
 * One RPC replaces the five PostgREST queries the page used to run. RLS still applies
 * (the function is SECURITY INVOKER), so a driver-role account can only resolve a
 * shipment it is already allowed to see.
 */
export async function fetchShipmentDetail(shipmentId: string): Promise<ShipmentDetailResult> {
  const { data, error } = await supabase.rpc("logistics_shipment_detail", {
    p_shipment_id: shipmentId,
  });
  if (error) throw error;
  const result = (data ?? {}) as Partial<ShipmentDetailResult>;
  return {
    shipment: result.shipment ?? null,
    order: result.order ?? null,
    customer: result.customer ?? null,
    driver: result.driver ?? null,
    items: result.items ?? [],
    returns: result.returns ?? [],
    collection: result.collection ?? null,
    order_collection: result.order_collection ?? null,
    plan_check: result.plan_check ?? null,
    journal: result.journal ?? [],
    events: result.events ?? [],
    pricing: result.pricing ?? null,
  };
}
