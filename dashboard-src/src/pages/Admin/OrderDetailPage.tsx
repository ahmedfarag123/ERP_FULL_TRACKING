// Page Type: B - Detail
// Purpose: Display complete commercial and execution context for a single order
// Primary user action: Confirm delivery or create invoice
// Data source: orders/:orderId

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  MapPinIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge, { type StatusBadgeTone } from "../../components/ui/StatusBadge";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import { supabase } from "../../lib/supabase";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface OrderRecord {
  id: string;
  external_order_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  order_date: string | null;
  total_amount: number | null;
  currency_code: string;
  odoo_order_name: string | null;
  create_date: string | null;
  commitment_date: string | null;
  delivery_status: string | null;
  user_id: string | null;
  amount_to_invoice: number | null;
  amount_undiscounted: number | null;
  amount_untaxed: number | null;
  payment_term_id: string | null;
  company_id: string | null;
  invoice_status: string | null;
  margin: number | null;
  margin_percent: string | null;
  planning_initial_date: string | null;
  team_id: string | null;
  warehouse_id: string | null;
  shipping_weight: number | null;
  state: string | null;
}

interface OrderLineItem {
  id: string;
  product_name: string;
  product_code: string | null;
  product_uom: string | null;
  ordered_quantity: number;
  delivered_quantity: number;
  invoiced_quantity: number;
  unit_price: number;
  discount_percent: number;
  subtotal_amount: number;
  total_amount: number;
  display_type: string | null;
}

interface OrderDeliveryDocument {
  id: string;
  picking_name: string;
  picking_state: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
}

interface OrderInvoiceDocument {
  id: string;
  invoice_name: string;
  payment_state: string | null;
  invoice_state: string | null;
  invoice_date: string | null;
  amount_total: number;
  currency_code: string;
}

interface CustomerRecord {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  phone_number: string | null;
  governorate: string | null;
  district: string | null;
  place: string | null;
  address_line: string | null;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  customer_location: string | null;
}

interface HistoryItem {
  id: string;
  icon: typeof TruckIcon;
  label: string;
  detail: string;
  time: string;
  tone: "green" | "blue" | "yellow" | "gray";
}

// ============================================================================
// Utility & Helper Functions
// ============================================================================

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(parsed);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatAmount(value: number | null | undefined, currency = "EGP") {
  if (value == null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function numericAmount(value: number | string | null | undefined) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function compactReference(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "--";
  const parts = raw.split("|").map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? raw;
}

function resolveBadge(
  type: "delivery" | "invoice" | "sale",
  value: string | null | undefined,
): { tone: StatusBadgeTone; label: string } {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (type === "delivery") {
    if (normalized === "full" || normalized === "done" || normalized === "delivered") {
      return { tone: "green", label: "مكتمل" };
    }
    if (normalized === "partial") return { tone: "blue", label: "قيد التنفيذ" };
    if (normalized === "cancelled" || normalized === "cancel") {
      return { tone: "red", label: "فشل" };
    }
    return { tone: "yellow", label: "معلق" };
  }

  if (type === "invoice") {
    if (normalized === "invoiced" || normalized === "yes" || normalized === "paid") {
      return { tone: "green", label: "تمت الفوترة" };
    }
    if (normalized === "partial") return { tone: "yellow", label: "جزئي" };
    if (normalized === "to invoice") return { tone: "blue", label: "جاهز للفوترة" };
    return { tone: "gray", label: value ? String(value) : "بدون فاتورة" };
  }

  if (normalized === "sale" || normalized === "posted") return { tone: "green", label: "بيع مؤكد" };
  if (normalized === "draft") return { tone: "yellow", label: "مسودة" };
  if (normalized === "cancel") return { tone: "red", label: "ملغي" };
  return { tone: "gray", label: value ? String(value) : "غير معروف" };
}

function formatLocation(customer: CustomerRecord | null) {
  if (!customer) return "--";
  const parts = [customer.address_line, customer.place, customer.district, customer.governorate].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "--";
}

function getCustomerMapUrl(customer: CustomerRecord | null): string | null {
  if (!customer) return null;
  if (customer.google_maps_url) return customer.google_maps_url;
  if (customer.lat != null && customer.lng != null) {
    return `https://www.google.com/maps?q=${customer.lat},${customer.lng}`;
  }
  if (customer.customer_location && /^https?:\/\//i.test(customer.customer_location)) {
    return customer.customer_location;
  }
  const address = [customer.customer_name, customer.district, customer.governorate].filter(Boolean).join(", ");
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

function toneClasses(tone: HistoryItem["tone"]) {
  if (tone === "green") return "bg-emerald-50 text-emerald-600";
  if (tone === "blue") return "bg-blue-50 text-blue-600";
  if (tone === "yellow") return "bg-amber-50 text-amber-600";
  return "bg-brand-25 text-gray-500";
}

// ============================================================================
// UI Components
// ============================================================================

function DetailField({
  label,
  value,
  dir = "auto",
}: {
  label: string;
  value: string;
  dir?: "auto" | "ltr" | "rtl";
}) {
  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] gap-4 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span dir={dir} className="min-w-0 break-words font-medium text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

// ─── Wrapper Components for Layout Pattern ─────────────────────────────────────

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-[22px] border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}>
      {children}
    </section>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [deliveries, setDeliveries] = useState<OrderDeliveryDocument[]>([]);
  const [invoices, setInvoices] = useState<OrderInvoiceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========================================================================
  // Data Loading & Initialization
  // ========================================================================

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [orderRes, linesRes, deliveriesRes, invoicesRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, external_order_id, customer_id, customer_name, order_date, total_amount, currency_code, odoo_order_name, create_date, commitment_date, delivery_status, user_id, amount_to_invoice, amount_undiscounted, amount_untaxed, payment_term_id, company_id, invoice_status, margin, margin_percent, planning_initial_date, team_id, warehouse_id, shipping_weight, state",
          )
          .eq("id", orderId)
          .single(),
        supabase
          .from("order_line_items")
          .select(
            "id, product_name, product_code, product_uom, ordered_quantity, delivered_quantity, invoiced_quantity, unit_price, discount_percent, subtotal_amount, total_amount, display_type",
          )
          .eq("order_id", orderId)
          .is("display_type", null)
          .gte("ordered_quantity", 1)
          .order("sort_order", { ascending: true }),
        supabase
          .from("order_delivery_documents")
          .select("id, picking_name, picking_state, scheduled_at, completed_at")
          .eq("order_id", orderId)
          .order("scheduled_at", { ascending: false }),
        supabase
          .from("order_invoice_documents")
          .select(
            "id, invoice_name, payment_state, invoice_state, invoice_date, amount_total, currency_code",
          )
          .eq("order_id", orderId)
          .order("invoice_date", { ascending: false }),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (linesRes.error) throw linesRes.error;
      if (deliveriesRes.error) throw deliveriesRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      const orderRecord = orderRes.data as OrderRecord;
      setOrder(orderRecord);
      setLineItems((linesRes.data ?? []) as OrderLineItem[]);
      setDeliveries((deliveriesRes.data ?? []) as OrderDeliveryDocument[]);
      setInvoices((invoicesRes.data ?? []) as OrderInvoiceDocument[]);

      if (orderRecord.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select(
            "id, customer_name, customer_email, phone_number, governorate, district, place, address_line, lat, lng, google_maps_url, customer_location",
          )
          .eq("id", orderRecord.customer_id)
          .maybeSingle();

        if (customerError) throw customerError;
        setCustomer((customerData as CustomerRecord | null) ?? null);
      } else {
        setCustomer(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل تفاصيل الطلب.");
      setOrder(null);
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!orderId) return;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        void loadOrder();
      }, 300);
    };

    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      void supabase.removeChannel(channel);
    };
  }, [orderId, loadOrder]);

  // ========================================================================
  // Computed Values & Status Mappings
  // ========================================================================

  const totalSubtotal = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) => sum + Number(item.subtotal_amount ?? item.total_amount ?? 0),
        0,
      ),
    [lineItems],
  );

  const itemCount = lineItems.length;
  const unitsCount = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.ordered_quantity, 0),
    [lineItems],
  );

  if (isLoading) {
    return (
      <>
        <PageMeta title="تفاصيل الطلب" description="جاري تحميل تفاصيل الطلب" />
        <AdminPageFrame>
          <div className="space-y-5">
            <div className="h-24 animate-pulse rounded-[22px] bg-brand-25 dark:bg-white/[0.02]" />
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_320px]">
              <div className="h-[520px] animate-pulse rounded-[22px] bg-brand-25 dark:bg-white/[0.02]" />
              <div className="space-y-5">
                <div className="h-72 animate-pulse rounded-[22px] bg-brand-25 dark:bg-white/[0.02]" />
                <div className="h-72 animate-pulse rounded-[22px] bg-brand-25 dark:bg-white/[0.02]" />
              </div>
            </div>
          </div>
        </AdminPageFrame>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <PageMeta title="تفاصيل الطلب" description="لم يتم العثور على الطلب" />
        <AdminPageFrame>
          <EmptyState
            title={error || "لم يتم العثور على الطلب"}
            description="تعذر تحميل الطلب من بيانات أودو المتزامنة."
            action={
              <Link
                to="/orders"
                className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
              >
                العودة للطلبات
              </Link>
            }
          />
        </AdminPageFrame>
      </>
    );
  }

  const orderNumber = order.odoo_order_name || order.external_order_id || order.id.slice(0, 8);
  const deliveryBadge = resolveBadge("delivery", order.delivery_status);
  const invoiceBadge = resolveBadge("invoice", order.invoice_status);
  const saleBadge = resolveBadge("sale", order.state);
  const subtotalAmount = order.amount_untaxed ?? totalSubtotal;
  const vatAmount = Math.max(Number(order.total_amount ?? 0) - Number(subtotalAmount ?? 0), 0);
  const totalAmount = order.total_amount ?? totalSubtotal;

  const historyItems: HistoryItem[] = [
    {
      id: "placed",
      icon: DocumentTextIcon,
      label: "تم إنشاء الطلب",
      detail: order.customer_name ? `للعميل ${order.customer_name}` : "تم فتح الطلب",
      time: formatDateTime(order.order_date || order.create_date),
      tone: "blue",
    },
    {
      id: "scheduled",
      icon: CalendarDaysIcon,
      label: "تمت جدولة التسليم",
      detail: compactReference(order.warehouse_id),
      time: formatDateTime(order.commitment_date),
      tone: order.commitment_date ? "yellow" : "gray",
    },
    {
      id: "delivery",
      icon: TruckIcon,
      label: deliveryBadge.label,
      detail: deliveries[0]?.picking_name || compactReference(order.warehouse_id),
      time: formatDateTime(deliveries[0]?.completed_at || deliveries[0]?.scheduled_at),
      tone:
        deliveryBadge.tone === "green"
          ? "green"
          : deliveryBadge.tone === "blue"
            ? "blue"
            : deliveryBadge.tone === "yellow"
              ? "yellow"
              : "gray",
    },
    {
      id: "invoice",
      icon: CheckCircleIcon,
      label: invoiceBadge.label,
      detail: invoices[0]?.invoice_name || compactReference(order.company_id),
      time: formatDateTime(invoices[0]?.invoice_date),
      tone:
        invoiceBadge.tone === "green"
          ? "green"
          : invoiceBadge.tone === "blue"
            ? "blue"
            : invoiceBadge.tone === "yellow"
              ? "yellow"
              : "gray",
    },
  ];

  // ========================================================================
  // Event Handlers
  // ========================================================================

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <>
      <PageMeta title={`${orderNumber} | طلب`} description="المعلومات الكاملة للطلب." />

      <AdminPageFrame>
        <Card>
          <div className="px-5 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-3">
                <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                  <ChevronRightIcon className="h-4 w-4" aria-hidden />
                  العودة للطلبات
                </Link>

                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    طلب <span dir="ltr">#{orderNumber}</span>
                  </h1>
                  <StatusBadge label={deliveryBadge.label} tone={deliveryBadge.tone} />
                  <StatusBadge label={invoiceBadge.label} tone={invoiceBadge.tone} />
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>العميل: <strong className="font-semibold text-gray-800 dark:text-gray-100">{customer?.customer_name || order.customer_name || "--"}</strong></span>
                  <span>الاستحقاق: <strong className="font-semibold text-gray-800 dark:text-gray-100">{formatDate(order.commitment_date)}</strong></span>
                  <span>المخزن: <strong className="font-semibold text-gray-800 dark:text-gray-100">{compactReference(order.warehouse_id)}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.02]">
                  <DocumentTextIcon className="ml-2 h-4 w-4" aria-hidden />
                  إنشاء فاتورة
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-gray-800">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">إجمالي الطلب</p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {formatAmount(totalAmount, order.currency_code)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">الأصناف</p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {itemCount.toLocaleString("ar-EG")} صنف / {unitsCount.toLocaleString("ar-EG")} وحدة
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">التسليم</p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDateTime(order.commitment_date)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 border-t border-gray-200 pt-5 xl:grid-cols-3 dark:border-gray-800">
              <section aria-label="Fulfillment Context" className="rounded-2xl border border-gray-200 bg-brand-25/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">سجل خطوات الطلب</h2>
                  <span className="text-xs text-gray-400">
                    {deliveries.length.toLocaleString("ar-EG")} تسليم / {invoices.length.toLocaleString("ar-EG")} فاتورة
                  </span>
                </div>
                <div className="space-y-3">
                  {historyItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${toneClasses(item.tone)}`}>
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          {index < historyItems.length - 1 ? <span className="my-1 h-5 w-px bg-gray-200 dark:bg-white/[0.04]" aria-hidden /> : null}
                        </div>
                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400" dir="auto">{item.detail}</p>
                            </div>
                            <span className="shrink-0 text-[11px] text-gray-400" dir="ltr">{item.time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-brand-25/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">تفاصيل العميل</h2>
                  <div className="flex items-center gap-2">
                    {getCustomerMapUrl(customer) ? (
                      <a
                        href={getCustomerMapUrl(customer)!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <MapPinIcon className="h-3.5 w-3.5" />
                        فتح على الخريطة
                      </a>
                    ) : null}
                    {order.customer_id ? (
                      <Link to={`/customers/${order.customer_id}`} className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        ملف العميل
                      </Link>
                    ) : null}
                  </div>
                </div>
                <DetailField label="الاسم" value={customer?.customer_name || order.customer_name || "--"} />
                <DetailField label="الهاتف" value={customer?.phone_number || "--"} dir="ltr" />
                <DetailField label="المنطقة" value={[customer?.district, customer?.governorate].filter(Boolean).join("، ") || "--"} />
                <DetailField label="العنوان" value={formatLocation(customer)} />
                {customer?.lat != null && customer?.lng != null ? (
                  <DetailField label="الإحداثيات" value={`${customer.lat}, ${customer.lng}`} dir="ltr" />
                ) : null}
                <DetailField label="الدفع" value={compactReference(order.payment_term_id)} />
              </section>

              <section className="rounded-2xl border border-gray-200 bg-brand-25/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">تفاصيل أودو</h2>
                  <StatusBadge label={saleBadge.label} tone={saleBadge.tone} />
                </div>
                <DetailField label="الحالة" value={order.state || "--"} dir="ltr" />
                <DetailField label="الفوترة" value={order.invoice_status || invoiceBadge.label} dir="ltr" />
                <DetailField label="To Invoice" value={formatAmount(order.amount_to_invoice, order.currency_code)} />
                <DetailField label="Untaxed" value={formatAmount(order.amount_untaxed, order.currency_code)} />
                <DetailField label="Margin" value={formatAmount(order.margin, order.currency_code)} />
                <DetailField label="المخزن" value={compactReference(order.warehouse_id)} />
              </section>
            </div>
          </div>
        </Card>

        <div className="grid gap-5">
          <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader
              title="أصناف الطلب"
              subtitle="الكميات، الأسعار، الخصومات، والإجمالي لكل صنف."
              action={<span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatAmount(totalAmount, order.currency_code)}</span>}
            />

            {lineItems.length === 0 ? (
              <div className="flex min-h-[320px] items-center px-5 py-16">
                <EmptyState title="لا توجد أصناف" description="هذا الطلب موجود، لكن لم تصل له أصناف متزامنة حتى الآن." />
              </div>
            ) : (
              <>
                <div className="px-5 py-5">
                  <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                    <table className="min-w-full text-right text-sm" dir="rtl">
                      <thead className="bg-brand-25/80 dark:bg-white/[0.02]">
                        <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                          <th className="w-12 px-4 py-4 text-right">#</th>
                          <th className="min-w-[320px] px-4 py-4 text-right">الصنف</th>
                          <th className="px-4 py-4 text-center">المطلوب</th>
                          <th className="px-4 py-4 text-center">تم التسليم</th>
                          <th className="px-4 py-4 text-right">سعر الوحدة</th>
                          <th className="px-4 py-4 text-center">الخصم</th>
                          <th className="px-4 py-4 text-right">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {lineItems.map((item, index) => (
                          <tr key={item.id} className="transition hover:bg-brand-25/70 dark:hover:bg-white/[0.02]">
                            <td className="px-4 py-4 text-gray-500 dark:text-gray-400">{index + 1}</td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-gray-900 dark:text-white" dir="auto">{item.product_name}</p>
                              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500" dir="auto">
                                {item.product_code || item.product_uom || "--"}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-center font-medium text-gray-800 dark:text-gray-200">{item.ordered_quantity.toLocaleString("ar-EG")}</td>
                            <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">{item.delivered_quantity.toLocaleString("ar-EG")}</td>
                            <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">{formatAmount(item.unit_price, order.currency_code)}</td>
                            <td className="px-4 py-4 text-center text-gray-700 dark:text-gray-300" dir="ltr">{Number(item.discount_percent ?? 0).toFixed(0)}%</td>
                            <td className="px-4 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatAmount(item.total_amount, order.currency_code)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-gray-200 px-5 py-5 dark:border-gray-800">
                  <div className="mr-auto w-full max-w-sm rounded-2xl bg-brand-25 p-4 dark:bg-white/[0.04]">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-semibold text-gray-900 dark:text-white">ملخص الطلب</p>
                      <StatusBadge label={saleBadge.label} tone={saleBadge.tone} />
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                        <span>الإجمالي الفرعي</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatAmount(subtotalAmount, order.currency_code)}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                        <span>ضريبة القيمة المضافة</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatAmount(vatAmount, order.currency_code)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
                        <span>الإجمالي</span>
                        <span>{formatAmount(totalAmount, order.currency_code)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        </div>
      </AdminPageFrame>
    </>
  );
}
