// Page Type: B - Detail
// Purpose: View full contact profile, order history, and field activity for one customer
// Primary user action: Log a call, schedule a visit, or create a new order
// Data source: customers/:customerId

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDaysIcon, PhoneIcon, PlusIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { Link, useParams, useSearchParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import DetailPageLayout from "../../components/layout/DetailPageLayout";
import { AdminPageFrame, AdminSection } from "../../components/admin/AdminPageElements";
import CallActivityModal from "../../components/customer-activity/CallActivityModal";
import VisitActivityModal from "../../components/customer-activity/VisitActivityModal";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  buildCallSummaryLines,
  buildVisitSummaryLines,
  resolveCallDirection,
  resolveVisitStatus,
  resolveVisitType,
} from "../../lib/customer-activity";
import { isGoogleMapsUrl, parseCoordinateText, resolveCustomerLocation } from "../../lib/customer-location";
import { getCustomerInsightSignals } from "../../lib/customer-insight-signals";
import { supabase } from "../../lib/supabase";
import type { SelectedCustomerProfile } from "../../lib/customerProfileSelection";

interface Customer {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_location: string | null;
  google_maps_url: string | null;
  lat: number | null;
  lng: number | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  governorate: string | null;
  district: string | null;
  place: string | null;
  address_line: string | null;
  status: string;
  priority: string;
  last_visit_at: string | null;
  product_interests: string[] | null;
  created_at: string;
}

interface Visit {
  id: string;
  user_id: string;
  started_at: string | null;
  checked_in_at: string;
  completed_at: string | null;
  visit_mode: string | null;
  visit_result: string | null;
  note: string | null;
  raw_payload: Record<string, unknown> | null;
  raw_form_payload: Record<string, unknown> | null;
}

interface CallRecord {
  id: string;
  user_id: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  call_duration_seconds: number | null;
  call_status: string | null;
  call_reason: string | null;
  customer_response: string | null;
  call_outcome: string | null;
  customer_disposition: string | null;
  customer_objection: string | null;
  requested_actions: string[] | null;
  next_action: string | null;
  call_notes: string | null;
  callback_at: string | null;
  follow_up_sla_status: string | null;
  raw_form_payload: Record<string, unknown> | null;
}

interface Order {
  id: string;
  external_order_id: string | null;
  odoo_order_name: string | null;
  total_amount: number | null;
  currency_code: string | null;
  order_date: string | null;
  created_at: string;
  delivery_status: string | null;
  invoice_status: string | null;
}

interface ProfileLookup {
  id: string;
  full_name: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(parsed);
}

function formatAmount(value: number | null | undefined, currency = "EGP") {
  if (value == null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active") return { tone: "green" as const, label: "نشط" };
  if (normalized === "inactive") return { tone: "gray" as const, label: "غير نشط" };
  return { tone: "gray" as const, label: status || "غير معروف" };
}

function priorityBadge(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "high") return { tone: "orange" as const, label: "أولوية عالية" };
  if (normalized === "medium") return { tone: "yellow" as const, label: "أولوية متوسطة" };
  return { tone: "green" as const, label: "أولوية منخفضة" };
}

function orderStatusBadge(status: string | null | undefined, type: "delivery" | "invoice") {
  const normalized = String(status ?? "").toLowerCase();
  if (type === "delivery") {
    if (normalized === "full" || normalized === "done") return { tone: "green" as const, label: "مكتمل" };
    if (normalized === "partial") return { tone: "blue" as const, label: "جزئي" };
    if (normalized === "cancelled") return { tone: "red" as const, label: "ملغي" };
    return { tone: "yellow" as const, label: "معلق" };
  }

  if (normalized === "invoiced" || normalized === "yes") return { tone: "green" as const, label: "نعم" };
  if (normalized === "partial") return { tone: "yellow" as const, label: "جزئي" };
  return { tone: "gray" as const, label: "لا" };
}

function displayOrMuted(value: string) {
  if (!value || value === "--") {
    return <span className="text-gray-300 dark:text-gray-600">غير متوفر</span>;
  }
  return value;
}

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { authUser } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activityProfiles, setActivityProfiles] = useState<SelectedCustomerProfile[]>([]);
  const [salesRepNames, setSalesRepNames] = useState<Record<string, string>>({});
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;
    try {
      setIsLoading(true);
      setError(null);

      const [customerRes, visitsRes, callsRes, ordersRes] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, customer_name, customer_email, customer_location, google_maps_url, lat, lng, phone_number, whatsapp_number, governorate, district, place, address_line, status, priority, last_visit_at, product_interests, created_at",
          )
          .eq("id", customerId)
          .single(),
        supabase
          .from("visits")
          .select(
            "id, user_id, started_at, checked_in_at, completed_at, visit_mode, visit_result, note, raw_payload, raw_form_payload",
          )
          .eq("customer_id", customerId)
          .order("checked_in_at", { ascending: false })
          .limit(20),
        supabase
          .from("calls")
          .select(
            "id, user_id, created_at, started_at, completed_at, call_duration_seconds, call_status, call_reason, customer_response, call_outcome, next_action, call_notes, callback_at, follow_up_sla_status, raw_form_payload",
          )
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("orders")
          .select(
            "id, external_order_id, odoo_order_name, total_amount, currency_code, order_date, created_at, delivery_status, invoice_status",
          )
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (customerRes.error) throw customerRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (callsRes.error) throw callsRes.error;
      if (ordersRes.error) throw ordersRes.error;

      setCustomer(customerRes.data as Customer);
      const visitRows = (visitsRes.data ?? []) as Visit[];
      const callRows = (callsRes.data ?? []) as CallRecord[];
      const orderRows = (ordersRes.data ?? []) as Order[];
      setVisits(visitRows);
      setCalls(callRows);
      setOrders(orderRows);

      const profileIds = Array.from(
        new Set([...visitRows.map((visit) => visit.user_id), ...callRows.map((call) => call.user_id)].filter(Boolean)),
      );

      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);

        if (profilesError) throw profilesError;
        const profileMap = ((profilesData ?? []) as ProfileLookup[]).reduce<Record<string, string>>(
          (accumulator, profile) => {
            accumulator[profile.id] = profile.full_name || profile.id.slice(0, 8);
            return accumulator;
          },
          {},
        );
        setSalesRepNames(profileMap);
      } else {
        setSalesRepNames({});
      }

      const profiles: SelectedCustomerProfile[] = [];
      for (const call of callRows) {
        const payload = call.raw_form_payload as Record<string, unknown> | null;
        if (!payload) continue;
        const list = payload.selected_customer_profiles;
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && typeof item === "object" && "category_key" in item) profiles.push(item as SelectedCustomerProfile);
          }
        }
        const single = payload.selected_customer_profile;
        if (single && typeof single === "object" && "category_key" in single) profiles.push(single as SelectedCustomerProfile);
      }
      for (const visit of visitRows) {
        const payload = visit.raw_form_payload as Record<string, unknown> | null;
        if (!payload) continue;
        const single = payload.selected_customer_profile;
        if (single && typeof single === "object" && "category_key" in single) profiles.push(single as SelectedCustomerProfile);
      }
      setActivityProfiles(profiles);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "فشل تحميل العميل.");
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

  useEffect(() => {
    if (!customerId) return;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        void loadCustomer();
      }, 300);
    };

    const channel = supabase
      .channel(`customer-orders-${customerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      void supabase.removeChannel(channel);
    };
  }, [customerId, loadCustomer]);

  const overdueFollowUps = useMemo(() => {
    const now = Date.now();
    return calls.filter((call) => {
      if (!call.callback_at) return false;
      const status = String(call.follow_up_sla_status ?? "").toLowerCase();
      if (status.includes("done")) return false;
      return new Date(call.callback_at).getTime() < now;
    });
  }, [calls]);

  const customerProfile = useMemo(() => {
    const types = new Map<string, number>();
    const specialities = new Map<string, number>();
    const categories = new Map<string, { count: number; subcategories: Set<string> }>();
    const brands = new Map<string, number>();
    const products = new Set<string>();

    for (const p of activityProfiles) {
      if (p.customer_type_name_ar) types.set(p.customer_type_name_ar, (types.get(p.customer_type_name_ar) || 0) + 1);
      if (p.speciality_name_ar) specialities.set(p.speciality_name_ar, (specialities.get(p.speciality_name_ar) || 0) + 1);
      if (p.brand_name_ar) brands.set(p.brand_name_ar, (brands.get(p.brand_name_ar) || 0) + 1);
      if (p.product_name) products.add(p.product_name);

      const cat = p.category_name_ar;
      if (cat) {
        const existing = categories.get(cat);
        if (existing) {
          existing.count += 1;
          if (p.subcategory_name_ar) existing.subcategories.add(p.subcategory_name_ar);
        } else {
          const subs = new Set<string>();
          if (p.subcategory_name_ar) subs.add(p.subcategory_name_ar);
          categories.set(cat, { count: 1, subcategories: subs });
        }
      }
    }

    const conversationSignals = getCustomerInsightSignals(calls);

    return {
      types: Array.from(types.entries()).sort((a, b) => b[1] - a[1]),
      specialities: Array.from(specialities.entries()).sort((a, b) => b[1] - a[1]),
      categories: Array.from(categories.entries()).sort((a, b) => b[1].count - a[1].count),
      brands: Array.from(brands.entries()).sort((a, b) => b[1] - a[1]),
      products: Array.from(products),
      conversationSignals,
    };
  }, [activityProfiles, calls]);

  // Auto-scroll to highlighted visit or call from ?highlight=visit-{id} or ?highlight=call-{id}
  useEffect(() => {
    if (!highlightId || isLoading) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(highlightId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-blue-400", "ring-offset-2", "rounded-xl");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-blue-400", "ring-offset-2", "rounded-xl");
        }, 2000);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightId, isLoading]);

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0),
    [orders],
  );

  if (isLoading) {
    return (
      <>
        <PageMeta title="تفاصيل العميل" description="جار تحميل ملف العميل" />
        <AdminPageFrame>
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
              <div className="space-y-6">
                <div className="h-56 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
                <div className="h-64 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
              </div>
              <div className="space-y-6">
                <div className="h-48 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
                <div className="h-48 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
              </div>
            </div>
          </div>
        </AdminPageFrame>
      </>
    );
  }

  if (error || !customer) {
    return (
      <>
        <PageMeta title="تفاصيل العميل" description="لم يتم العثور على العميل" />
        <AdminPageFrame>
          <EmptyState
            title={error || "لم يتم العثور على العميل"}
            description="تعذر تحميل ملف العميل من المسار الحالي."
            action={
              <Link
                to="/customers"
                className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
              >
                العودة إلى العملاء
              </Link>
            }
          />
        </AdminPageFrame>
      </>
    );
  }

  const status = statusBadge(customer.status);
  const priority = priorityBadge(customer.priority);
  const location = resolveCustomerLocation(customer);
  const emailIsLocation = Boolean(parseCoordinateText(customer.customer_email) || isGoogleMapsUrl(customer.customer_email));
  const customerEmail = emailIsLocation ? null : customer.customer_email;
  const modalCustomer = {
    id: customer.id,
    customer_name: customer.customer_name,
    phone_number: customer.phone_number,
  };

  return (
    <>
      <PageMeta title={`${customer.customer_name} | العميل`} description="ملف العميل والنشاط الأخير." />

      <AdminPageFrame>
        <DetailPageLayout
          header={
            <PageHeader
              variant="detail"
              backHref="/customers"
              backLabel="العودة إلى العملاء"
              title={<span dir="auto">{customer.customer_name}</span>}
              subtitle={<span dir="ltr">{customer.phone_number || "--"}</span>}
              badges={
                <>
                  <StatusBadge label={status.label} tone={status.tone} />
                  <StatusBadge label={priority.label} tone={priority.tone} />
                </>
              }
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => setIsCallModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                  >
                    <PhoneIcon className="h-4 w-4" aria-hidden />
                    تسجيل مكالمة
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVisitModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                  >
                    <CalendarDaysIcon className="h-4 w-4" aria-hidden />
                    جدولة زيارة
                  </button>
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4" aria-hidden />
                    طلب جديد
                  </Link>
                </>
              }
            />
          }
          main={
            <>
              <AdminSection
                title="معلومات التواصل"
                description="بيانات التواصل المباشرة والعنوان المخزن لهذا العميل."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { label: "الهاتف", value: customer.phone_number, dir: "ltr" as const, mono: true },
                    { label: "واتساب", value: customer.whatsapp_number, dir: "ltr" as const, mono: true },
                    { label: "البريد الإلكتروني", value: customerEmail, dir: "auto" as const, mono: false },
                    {
                      label: location.mapUrl ? "الموقع الجغرافي" : "الموقع",
                      value: location.displayText,
                      dir: location.mapUrl ? "ltr" as const : "auto" as const,
                      mono: location.lat != null && location.lng != null,
                      mapUrl: location.mapUrl,
                      sourceText: location.sourceText,
                    },
                    { label: "العنوان", value: customer.address_line, dir: "auto" as const, mono: false },
                  ].map((field) => (
                    <div key={field.label}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{field.label}</p>
                      <p
                        dir={field.dir}
                        className={`text-sm font-medium text-gray-900 dark:text-white ${field.mono ? "font-mono" : ""}`}
                      >
                        {"mapUrl" in field && field.mapUrl ? (
                          <a
                            href={field.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={field.sourceText ?? field.value ?? "فتح الخريطة"}
                            className="text-blue-600 transition hover:text-blue-800 dark:text-blue-400"
                          >
                            فتح الخريطة{field.value && field.value !== "Google Maps" ? ` - ${field.value}` : ""}
                          </a>
                        ) : field.value ? (
                          field.value
                        ) : (
                          displayOrMuted("--")
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </AdminSection>

              <AdminSection
                title="آخر الطلبات"
                description="أحدث نشاط تجاري لهذا العميل."
                actions={
                  <Link to="/orders" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                    عرض كل الطلبات &larr;
                  </Link>
                }
              >
                {orders.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-300" />}
                    title="لا توجد طلبات بعد"
                    description="ستظهر هنا الطلبات المسجلة لهذا العميل."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-right text-sm" dir="rtl">
                      <thead className="border-b border-gray-100 bg-brand-25/80 dark:border-gray-800 dark:bg-white/[0.02]">
                        <tr>
                          {["رقم الطلب", "التاريخ", "الإجمالي", "التسليم", "الفاتورة"].map((label) => (
                            <th
                              key={label}
                              className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {orders.slice(0, 5).map((order) => {
                          const delivery = orderStatusBadge(order.delivery_status, "delivery");
                          const invoice = orderStatusBadge(order.invoice_status, "invoice");
                          return (
                            <tr key={order.id}>
                              <td className="px-4 py-4">
                                <Link
                                  to={`/orders/${order.id}`}
                                  dir="ltr"
                                  className="font-semibold text-blue-600 transition hover:text-blue-800"
                                >
                                  {order.odoo_order_name || order.external_order_id || order.id.slice(0, 8)}
                                </Link>
                              </td>
                              <td className="px-4 py-4 text-gray-700 dark:text-gray-300" dir="ltr">
                                {formatDate(order.order_date || order.created_at)}
                              </td>
                              <td className="px-4 py-4 text-right font-mono text-gray-900 dark:text-white" dir="ltr">
                                {formatAmount(order.total_amount, order.currency_code || "EGP")}
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge label={delivery.label} tone={delivery.tone} />
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge label={invoice.label} tone={invoice.tone} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </AdminSection>

              <AdminSection
                title="المتابعات المتأخرة"
                description="مكالمات مجدولة متأخرة تحتاج متابعة."
              >
                {overdueFollowUps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">لا توجد متابعات متأخرة</p>
                ) : (
                  <div className="space-y-3">
                    {overdueFollowUps.map((call) => {
                      const direction = resolveCallDirection(call);
                      const callLines = buildCallSummaryLines(call);
                      return (
                        <div key={call.id} id={`follow-up-${call.id}`} className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/10">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span dir="ltr" className="text-sm font-semibold text-gray-900 dark:text-white">
                              معاودة: {formatDate(call.callback_at)}
                            </span>
                            <div className="flex items-center gap-2">
                              <StatusBadge label="متأخرة" tone="red" />
                              <StatusBadge label={direction.label} tone={direction.tone} />
                            </div>
                          </div>
                          <p dir="auto" className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            {salesRepNames[call.user_id] || call.user_id.slice(0, 8)}
                          </p>
                          {callLines.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {callLines.slice(0, 2).map((line) => (
                                <p key={line} dir="auto" className="text-xs text-gray-500 dark:text-gray-400">
                                  {line}
                                </p>
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsCallModalOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                            >
                              <PhoneIcon className="h-3.5 w-3.5" />
                              تسجيل مكالمة متابعة
                            </button>
                            <Link
                              to={`/calls/activity/${call.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                            >
                              عرض التفاصيل
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AdminSection>

              {activityProfiles.length > 0 && (
                <AdminSection
                  title="ملفي التجاري"
                  description="ملخص هذا العميل من سجلات النشاط."
                >
                  <div className="space-y-5">

                    {customerProfile.types.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">نوع العميل</h4>
                        <div className="flex flex-wrap gap-2">
                          {customerProfile.types.map(([type, count]) => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                            >
                              {type}
                              {count > 1 && <span className="text-xs opacity-60">({count})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {customerProfile.specialities.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">التخصص</h4>
                        <div className="flex flex-wrap gap-2">
                          {customerProfile.specialities.map(([spec, count]) => (
                            <span
                              key={spec}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                            >
                              {spec}
                              {count > 1 && <span className="text-xs opacity-60">({count})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {customerProfile.categories.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">الفئات</h4>
                        <div className="space-y-2">
                          {customerProfile.categories.map(([cat, data]) => (
                            <div key={cat}>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cat}</span>
                              {data.subcategories.size > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {Array.from(data.subcategories).map((sub) => (
                                    <span
                                      key={sub}
                                      className="inline-flex items-center rounded-md bg-brand-25 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-400"
                                    >
                                      {sub}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {customerProfile.brands.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">العلامات التجارية</h4>
                        <div className="flex flex-wrap gap-2">
                          {customerProfile.brands.map(([brand, count]) => (
                            <span
                              key={brand}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
                            >
                              {brand}
                              {count > 1 && <span className="text-xs opacity-60">({count})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {customerProfile.products.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">المنتجات</h4>
                        <div className="flex flex-wrap gap-2">
                          {customerProfile.products.map((product) => (
                            <span
                              key={product}
                              className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            >
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {customerProfile.conversationSignals.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">إشارات مهمة من المحادثات</h4>
                        <div className="flex flex-wrap gap-2">
                          {customerProfile.conversationSignals.map(([signal, count]) => (
                            <span
                              key={signal}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                            >
                              {signal}
                              {count > 1 && <span className="text-xs opacity-60">({count})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </AdminSection>
              )}
            </>
          }
          side={
            <>
              <AdminSection title="ملخص الحساب" description="ملخص تجاري ودورة حياة عالي المستوى.">
                <div>
                  {[
                    { label: "عضو منذ", value: formatDate(customer.created_at), dir: "ltr" as const },
                    { label: "إجمالي الطلبات", value: orders.length.toLocaleString("ar-EG"), dir: "ltr" as const },
                    {
                      label: "إجمالي الإنفاق",
                      value: formatAmount(totalSpent),
                      dir: "ltr" as const,
                      valueClass:
                        totalSpent > 0 ? "text-emerald-600 font-bold dark:text-emerald-400" : "text-gray-400",
                    },
                    {
                      label: "تاريخ آخر طلب",
                      value: orders[0] ? formatDate(orders[0].order_date || orders[0].created_at) : "--",
                      dir: "ltr" as const,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between border-b border-gray-50 py-3 text-sm last:border-0 dark:border-gray-800"
                    >
                      <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                      <span
                        dir={row.dir}
                        className={`font-semibold text-gray-900 dark:text-white ${"valueClass" in row && row.valueClass ? row.valueClass : ""}`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </AdminSection>

              <AdminSection
                title="آخر الزيارات"
                actions={
                  <Link to="/visits" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                    عرض الكل &larr;
                  </Link>
                }
              >
                {visits.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">لا توجد زيارات مسجلة بعد</p>
                ) : (
                  <div className="space-y-3">
                    {visits.slice(0, 3).map((visit) => {
                      const visitStatus = resolveVisitStatus(visit);
                      const visitType = resolveVisitType(visit);
                      const visitLines = buildVisitSummaryLines(visit);
                      return (
                        <div key={visit.id} id={`visit-${visit.id}`} className="rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span dir="ltr" className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatDate(visit.checked_in_at || visit.started_at)}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              <StatusBadge label={visitType.label} tone={visitType.tone} />
                              <StatusBadge label={visitStatus.label} tone={visitStatus.tone} />
                            </div>
                          </div>
                          <p dir="auto" className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            {salesRepNames[visit.user_id] || visit.user_id.slice(0, 8)}
                          </p>
                          {visitLines.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {visitLines.slice(0, 2).map((line) => (
                                <p key={line} dir="auto" className="text-xs text-gray-500 dark:text-gray-400">
                                  {line}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </AdminSection>

              <AdminSection
                title="آخر المكالمات"
                actions={
                  <Link to="/calls" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                    عرض الكل &larr;
                  </Link>
                }
              >
                {calls.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">لا توجد مكالمات مسجلة بعد</p>
                ) : (
                  <div className="space-y-3">
                    {calls.slice(0, 3).map((call) => {
                      const direction = resolveCallDirection(call);
                      const callLines = buildCallSummaryLines(call);
                      return (
                        <div key={call.id} id={`call-${call.id}`} className="rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span dir="ltr" className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatDate(call.completed_at || call.created_at)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span dir="ltr" className="font-mono text-sm text-gray-500 dark:text-gray-400">
                                {formatDuration(call.call_duration_seconds)}
                              </span>
                              <StatusBadge label={direction.label} tone={direction.tone} />
                            </div>
                          </div>
                          <p dir="auto" className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            {salesRepNames[call.user_id] || call.user_id.slice(0, 8)}
                          </p>
                          {callLines.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {callLines.slice(0, 2).map((line) => (
                                <p key={line} dir="auto" className="text-xs text-gray-500 dark:text-gray-400">
                                  {line}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </AdminSection>
            </>
          }
        />
      </AdminPageFrame>

      <CallActivityModal
        isOpen={isCallModalOpen}
        customer={modalCustomer}
        actorUserId={authUser?.id ?? null}
        onClose={() => setIsCallModalOpen(false)}
        onSaved={loadCustomer}
      />
      <VisitActivityModal
        isOpen={isVisitModalOpen}
        customer={modalCustomer}
        actorUserId={authUser?.id ?? null}
        onClose={() => setIsVisitModalOpen(false)}
        onSaved={loadCustomer}
      />
    </>
  );
}
