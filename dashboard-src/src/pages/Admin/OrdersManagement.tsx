import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Layers,
  Mail,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  User as UserIcon,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge, { type StatusBadgeTone } from "../../components/ui/StatusBadge";
import {
  crmLogin,
  clearCrmToken,
  getStoredCrmToken,
  fetchOdooOrders,
  fetchOdooOrderDetail,
  confirmOdooOrderAction,
  fetchLocalOrders,
  fetchLocalOrderDetail,
  getOdooOrdersExportUrl,
  type OdooOrder,
  type OdooOrderDetail,
  type LocalOrder,
} from "../../lib/crm-orders-api";

// ── Helpers ──────────────────────────────────────────────────────

function formatEGP(amount: number): string {
  return `EGP ${amount.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

function odooStateBadge(state: string): { label: string; tone: StatusBadgeTone } {
  const s = state.toLowerCase();
  if (s === "sale" || s === "done") return { label: "بيع مؤكد", tone: "green" };
  if (s === "draft") return { label: "مسودة", tone: "yellow" };
  if (s === "sent") return { label: "مرسل", tone: "blue" };
  if (s === "cancel") return { label: "ملغي", tone: "red" };
  return { label: state, tone: "gray" };
}

function localStatusBadge(order: { status: string; rejection_category?: string | null }): {
  label: string;
  tone: StatusBadgeTone;
  category?: string;
} {
  const s = order.status;
  if (s === "pushed") return { label: "تم الرفع", tone: "green" };
  if (s === "failed") return {
    label: "مرفوض",
    tone: "red",
    category: order.rejection_category ?? undefined,
  };
  if (s === "sync_failed") return { label: "فشل المزامنة", tone: "red" };
  if (s === "pending_odoo_sync" || s === "processing") return { label: "جاري المزامنة", tone: "yellow" };
  if (s === "cancelled") return { label: "ملغي", tone: "gray" };
  return { label: s, tone: "gray" };
}

type TabId = "odoo" | "local";
const PAGE_SIZE = 20;

// ── Login Dialog ─────────────────────────────────────────────────

function LoginDialog({
  open,
  onLogin,
  onClose,
}: {
  open: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await onLogin(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">تسجيل الدخول لنظام الطلبات</h3>
        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-2 h-10 w-full rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
          className="mb-4 h-10 w-full rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || !email || !password}
            className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function OrdersManagement() {
  const [tab, setTab] = useState<TabId>("odoo");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [selectedOdooOrderId, setSelectedOdooOrderId] = useState<number | null>(null);
  const [selectedLocalOrderId, setSelectedLocalOrderId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const didMountRef = useRef(false);

  const handleLogin = useCallback(async (email: string, password: string) => {
    await crmLogin(email, password);
    setShowLogin(false);
  }, []);

  // ── Reset page on filter change ──────────────────────────────
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setPage(1);
    setSelectedOdooOrderId(null);
    setSelectedLocalOrderId(null);
  }, [searchQuery, stateFilter, monthFilter, tab]);

  // ── Odoo Orders data ─────────────────────────────────────────
  const [odooOrders, setOdooOrders] = useState<OdooOrder[]>([]);
  const [odooTotal, setOdooTotal] = useState(0);
  const [odooLoading, setOdooLoading] = useState(true);
  const [odooError, setOdooError] = useState<string | null>(null);

  const loadOdooOrders = useCallback(async () => {
    if (tab !== "odoo") return;
    setOdooLoading(true);
    setOdooError(null);
    try {
      const dateFrom = monthFilter ? `${monthFilter}-01` : undefined;
      let dateTo: string | undefined;
      if (monthFilter) {
        const [y, m] = monthFilter.split("-").map(Number);
        const d = new Date(y, m, 0);
        dateTo = `${monthFilter}-${String(d.getDate()).padStart(2, "0")}`;
      }
      const data = await fetchOdooOrders(page, PAGE_SIZE, searchQuery || undefined, stateFilter !== "all" ? stateFilter : undefined, dateFrom, dateTo);
      setOdooOrders(data.orders);
      setOdooTotal(data.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      setOdooError(msg);
    } finally {
      setOdooLoading(false);
    }
  }, [page, searchQuery, stateFilter, monthFilter, tab]);

  useEffect(() => {
    void loadOdooOrders();
  }, [loadOdooOrders]);

  // ── Odoo Order Detail ────────────────────────────────────────
  const [odooDetail, setOdooDetail] = useState<OdooOrderDetail | null>(null);
  const [odooDetailLoading, setOdooDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedOdooOrderId) {
      setOdooDetail(null);
      return;
    }
    let cancelled = false;
    setOdooDetailLoading(true);
    fetchOdooOrderDetail(selectedOdooOrderId)
      .then((d) => { if (!cancelled) setOdooDetail(d); })
      .catch(() => { if (!cancelled) setOdooDetail(null); })
      .finally(() => { if (!cancelled) setOdooDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedOdooOrderId]);

  // ── Local Orders data ────────────────────────────────────────
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [localTotal, setLocalTotal] = useState(0);
  const [localLoading, setLocalLoading] = useState(true);

  const loadLocalOrders = useCallback(async () => {
    if (tab !== "local") return;
    setLocalLoading(true);
    try {
      const data = await fetchLocalOrders(page, PAGE_SIZE);
      setLocalOrders(data.orders);
      setLocalTotal(data.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "AUTH_REQUIRED") setShowLogin(true);
    } finally {
      setLocalLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    void loadLocalOrders();
  }, [loadLocalOrders]);

  // ── Local Order Detail ───────────────────────────────────────
  const [localDetail, setLocalDetail] = useState<LocalOrder | null>(null);
  const [localDetailLoading, setLocalDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedLocalOrderId) {
      setLocalDetail(null);
      return;
    }
    let cancelled = false;
    setLocalDetailLoading(true);
    fetchLocalOrderDetail(selectedLocalOrderId)
      .then((d) => { if (!cancelled) setLocalDetail(d); })
      .catch(() => { if (!cancelled) setLocalDetail(null); })
      .finally(() => { if (!cancelled) setLocalDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedLocalOrderId]);

  // ── Confirm handler ──────────────────────────────────────────
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleConfirm = useCallback(async (orderId: number) => {
    if (!getStoredCrmToken()) {
      setShowLogin(true);
      return;
    }
    setConfirming(true);
    setConfirmError(null);
    try {
      await confirmOdooOrderAction(orderId);
      void loadOdooOrders();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل التأكيد";
      if (msg === "AUTH_REQUIRED") setShowLogin(true);
      else setConfirmError(msg);
    } finally {
      setConfirming(false);
    }
  }, [loadOdooOrders]);

  // ── Computed ──────────────────────────────────────────────────
  const failedCount = useMemo(
    () => localOrders.filter((o) => o.status === "sync_failed" || o.status === "failed").length,
    [localOrders],
  );
  const isOdooTab = tab === "odoo";

  // ── Tabs config ──────────────────────────────────────────────
  const tabs = [
    { id: "odoo" as const, label: "أوردرات أودو", icon: ShoppingBag },
    { id: "local" as const, label: "قائمة المزامنة", icon: Layers },
  ];

  return (
    <>
      <PageMeta title="الأوردرات | إدارة المبيعات" description="تصفح وتصفية أوردرات المبيعات." />

      <AdminPageFrame>
        <div className="space-y-6">
          {/* ── HEADER ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/[0.03]">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                <ShoppingBag className="h-5 w-5 text-gray-400" />
                الأوردرات
                <span className="text-sm font-normal text-gray-400">
                  ({isOdooTab ? odooTotal : localTotal})
                </span>
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isOdooTab
                  ? "الأوردرات المزامنة مع أودو — اضغط على أي أوردر لعرض التفاصيل"
                  : "الأوردرات المحلية في انتظار المزامنة — راقب حالة الدفع والأخطاء"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => isOdooTab ? void loadOdooOrders() : void loadLocalOrders()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.02]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </button>
          </div>

          {/* ── TABS ────────────────────────────────────────────── */}
          <div className="flex w-fit gap-1 rounded-xl border border-gray-200 bg-brand-25/60 p-1 dark:border-gray-800 dark:bg-white/[0.02]">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setPage(1); }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${
                  tab === t.id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
            {failedCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertCircle className="h-3 w-3" />
                {failedCount} فاشل
              </span>
            )}
          </div>

          {/* ── SEARCH + FILTER ─────────────────────────────────── */}
          {isOdooTab && (
            <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث برقم الأوردر أو العميل أو كود العميل..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="relative w-full sm:w-52">
                <Filter className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
                <select
                  value={stateFilter}
                  onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
                  className="h-10 w-full appearance-none rounded-xl border border-gray-300 bg-white pl-10 pr-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="all">الكل</option>
                  <option value="draft">الكوتيشنات</option>
                  <option value="sent">المرسلة</option>
                  <option value="sale">أوامر البيع</option>
                  <option value="cancel">الملغية</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">▼</span>
              </div>
              <div className="relative w-full sm:w-52">
                <Calendar className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
                  className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const params = new URLSearchParams();
                  if (searchQuery) params.set("search", searchQuery);
                  if (stateFilter !== "all") params.set("state", stateFilter);
                  if (monthFilter) {
                    params.set("date_from", `${monthFilter}-01`);
                    const [y, m] = monthFilter.split("-").map(Number);
                    params.set("date_to", `${monthFilter}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`);
                  }
                  const base = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
                  const url = `${base}/crm/api/odoo/orders/export?${params}`;
                  try {
                    const token = getStoredCrmToken();
                    const headers: Record<string, string> = {};
                    if (token) headers["Authorization"] = `Bearer ${token}`;
                    const res = await fetch(url, { headers });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const blob = await res.blob();
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `orders_${new Date().toISOString().slice(0, 10)}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  } catch (e) {
                    console.error("Export failed:", e);
                  }
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Download className="h-4 w-4" />
                تصدير Excel
              </button>
            </div>
          )}

          {/* ── LOGIN DIALOG ────────────────────────────────────── */}
          <LoginDialog open={showLogin} onLogin={handleLogin} onClose={() => setShowLogin(false)} />

          {/* ── ODOO ORDERS TAB ─────────────────────────────────── */}
          {isOdooTab && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              {/* Table */}
              <div className="space-y-4 lg:col-span-2">
                {odooLoading ? (
                  <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                    <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">جاري جلب الأوردرات من أودو...</span>
                  </div>
                ) : odooError ? (
                  <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
                    <AlertCircle className="h-10 w-10 text-rose-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white">فشل جلب الأوردرات</h3>
                    <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{odooError}</p>
                    <button
                      type="button"
                      onClick={() => void loadOdooOrders()}
                      className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      إعادة المحاولة
                    </button>
                  </div>
                ) : odooOrders.length === 0 ? (
                  <div className="flex h-96 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                    <ShoppingBag className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">لا توجد أوردرات</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">لا توجد أوامر بيع مطابقة لمعايير البحث</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                      <table className="min-w-full text-right text-sm" dir="rtl">
                        <thead className="border-b border-gray-200 bg-brand-25/80 dark:border-gray-800 dark:bg-white/[0.02]">
                          <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                            <th className="w-[120px] px-4 py-4 text-right">الأوردر</th>
                            <th className="px-4 py-4 text-right">العميل</th>
                            <th className="w-[120px] px-4 py-4 text-right">كود العميل</th>
                            <th className="w-[140px] px-4 py-4 text-right">مندوب المبيعات</th>
                            <th className="w-[130px] px-4 py-4 text-right">تم الإنشاء</th>
                            <th className="w-[150px] px-4 py-4 text-right">الإجمالي</th>
                            <th className="w-[90px] px-4 py-4 text-right">الحالة</th>
                            <th className="w-[90px] px-4 py-4 text-right">الفاتورة</th>
                            <th className="w-[120px] px-4 py-4 text-right">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          {odooOrders.map((order) => {
                            const st = odooStateBadge(order.state);
                            const isSelected = selectedOdooOrderId === order.id;
                            return (
                              <tr
                                key={order.id}
                                onClick={() => setSelectedOdooOrderId(order.id)}
                                className={`cursor-pointer transition hover:bg-brand-25 dark:hover:bg-white/[0.02] ${
                                  isSelected ? "bg-blue-50/60 dark:bg-blue-500/5" : "bg-white dark:bg-transparent"
                                }`}
                              >
                                <td className="px-4 py-4 font-mono text-xs font-bold text-gray-900 dark:text-white">
                                  {order.name}
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {order.partner_name || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                                  {order.partner_code || "—"}
                                </td>
                                <td className="px-4 py-4">
                                  <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <UserIcon className="h-3 w-3" />
                                    {order.user_name || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                                  {formatDateTime(order.create_date)}
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                                  {formatEGP(order.amount_total)}
                                </td>
                                <td className="px-4 py-4">
                                  <StatusBadge label={st.label} tone={st.tone} />
                                </td>
                                <td className="px-4 py-4 text-[10px] capitalize">
                                  {order.invoice_status === "invoiced" ? (
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">تمت الفوترة</span>
                                  ) : order.invoice_status === "to invoice" ? (
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">للحساب</span>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400">لا</span>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  {(order.state === "draft" || order.state === "sent") && (
                                    <button
                                      type="button"
                                      disabled={confirming}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleConfirm(order.id);
                                      }}
                                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                                    >
                                      {confirming ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3 w-3" />
                                      )}
                                      {confirming ? "جاري..." : "تأكيد"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        عرض {odooOrders.length} من {odooTotal}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          السابق
                        </button>
                        <span className="px-2 text-xs text-gray-900 dark:text-white">صفحة {page}</span>
                        <button
                          type="button"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={page >= Math.ceil(odooTotal / PAGE_SIZE)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          التالي
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Detail Panel */}
              <div className="lg:col-span-1">
                {selectedOdooOrderId ? (
                  odooDetailLoading ? (
                    <div className="flex h-[520px] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                      <RefreshCw className="h-7 w-7 text-gray-400 animate-spin" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">جاري تحميل تفاصيل الأوردر...</span>
                    </div>
                  ) : odooDetail ? (
                    <div className="max-h-[700px] space-y-5 overflow-y-auto rounded-2xl border border-gray-200 bg-white/80 p-5 backdrop-blur dark:border-gray-800 dark:bg-white/[0.03]">
                      {/* Header */}
                      <div className="space-y-1 border-b border-gray-200 pb-3 dark:border-gray-800">
                        <h3 className="flex items-center gap-2 text-md font-bold text-gray-900 dark:text-white">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {odooDetail.name}
                        </h3>
                        <p className="text-[10px] text-gray-400">المعرف: {odooDetail.id}</p>
                      </div>

                      {/* Customer */}
                      <div className="space-y-2 rounded-lg border border-gray-200 bg-brand-25/60 p-3 text-xs dark:border-gray-800 dark:bg-white/[0.02]">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                          تفاصيل العميل
                        </h4>
                        <p className="font-semibold text-gray-900 dark:text-white">{odooDetail.partner_name}</p>
                        {odooDetail.partner_email && (
                          <p className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                            <Mail className="h-3 w-3" /> {odooDetail.partner_email}
                          </p>
                        )}
                        {odooDetail.partner_phone && (
                          <p className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400" dir="ltr">
                            <Phone className="h-3 w-3" /> {odooDetail.partner_phone}
                          </p>
                        )}
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="block text-gray-400">التاريخ</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatDateTime(odooDetail.date_order)}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400">مندوب المبيعات</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{odooDetail.user_name || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400">الحالة</span>
                          <StatusBadge label={odooStateBadge(odooDetail.state).label} tone={odooStateBadge(odooDetail.state).tone} />
                        </div>
                        <div>
                          <span className="block text-gray-400">الفاتورة</span>
                          <span className="font-semibold capitalize">
                            {odooDetail.invoice_status === "invoiced" ? (
                              <span className="text-emerald-600 dark:text-emerald-400">تمت الفوترة</span>
                            ) : odooDetail.invoice_status === "to invoice" ? (
                              <span className="text-amber-600 dark:text-amber-400">للحساب</span>
                            ) : (
                              "لا"
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Products */}
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                          <Package className="h-3.5 w-3.5" />
                          المنتجات ({odooDetail.lines.length})
                        </h4>
                        <div className="space-y-1.5">
                          {odooDetail.lines.map((line) => (
                            <div key={line.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 text-xs dark:border-gray-800 dark:bg-white/[0.03]">
                              <div className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-gray-900 dark:text-white">{line.product_name}</span>
                                <span className="text-[10px] text-gray-400">
                                  {line.qty} &times; {formatEGP(line.price_unit)}
                                </span>
                              </div>
                              <span className="mr-2 shrink-0 font-bold font-mono text-gray-900/80 dark:text-white/80">
                                {formatEGP(line.price_subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totals */}
                      <div className="space-y-1.5 border-t border-gray-200 pt-3 text-xs dark:border-gray-800">
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>المجموع الفرعي</span>
                          <span className="font-mono">{formatEGP(odooDetail.amount_untaxed)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>الضريبة</span>
                          <span className="font-mono">{formatEGP(odooDetail.amount_tax)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-1.5 text-sm font-bold text-gray-900 dark:border-gray-800 dark:text-white">
                          <span>الإجمالي</span>
                          <span className="font-mono">{formatEGP(odooDetail.amount_total)}</span>
                        </div>
                      </div>

                      {/* Confirm */}
                      {(odooDetail.state === "draft" || odooDetail.state === "sent") && (
                        <div className="pt-2">
                          {confirmError && (
                            <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                              {confirmError}
                            </div>
                          )}
                          <button
                            type="button"
                            disabled={confirming}
                            onClick={() => void handleConfirm(odooDetail.id)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {confirming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {confirming ? "جاري التأكيد..." : "تأكيد الأوردر في أودو"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
                      <AlertCircle className="mb-2 h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">تعذر تحميل التفاصيل</span>
                    </div>
                  )
                ) : (
                  <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 p-6 text-center bg-brand-25/30 dark:border-gray-700 dark:bg-white/[0.01]">
                    <ShoppingBag className="mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900/60 dark:text-white/60">اختر أوردر</h3>
                    <p className="mt-1 max-w-[200px] text-xs leading-normal text-gray-400">
                      اضغط على أي صف أوردر لعرض التفاصيل الكاملة والمنتجات والأسعار.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LOCAL ORDERS TAB ────────────────────────────────── */}
          {!isOdooTab && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              {/* Table */}
              <div className="space-y-4 lg:col-span-2">
                {localLoading ? (
                  <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                    <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل قائمة المزامنة...</span>
                  </div>
                ) : localOrders.length === 0 ? (
                  <div className="flex h-96 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                    <Layers className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">قائمة المزامنة فارغة</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">تم رفع جميع الأوردرات إلى أودو بنجاح</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                      <table className="min-w-full text-right text-sm" dir="rtl">
                        <thead className="border-b border-gray-200 bg-brand-25/80 dark:border-gray-800 dark:bg-white/[0.02]">
                          <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                            <th className="px-4 py-4 text-right">معرف الأوردر</th>
                            <th className="px-4 py-4 text-right">الشركة</th>
                            <th className="px-4 py-4 text-right">العميل</th>
                            <th className="px-4 py-4 text-right">الحالة</th>
                            <th className="px-4 py-4 text-right">الأخطاء</th>
                            <th className="px-4 py-4 text-right">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          {localOrders.map((order) => {
                            const badge = localStatusBadge(order);
                            const isSelected = selectedLocalOrderId === order.id;
                            return (
                              <tr
                                key={order.id}
                                onClick={() => setSelectedLocalOrderId(order.id)}
                                className={`cursor-pointer transition hover:bg-brand-25 dark:hover:bg-white/[0.02] ${
                                  isSelected ? "bg-blue-50/60 dark:bg-blue-500/5" : "bg-white dark:bg-transparent"
                                }`}
                              >
                                <td className="px-4 py-4 font-mono text-[10px] font-bold text-gray-900 dark:text-white">
                                  {order.id.slice(0, 8)}...
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                    order.company === "MAS"
                                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
                                      : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400"
                                  }`}>
                                    {order.company}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {order.partner_name || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <StatusBadge label={badge.label} tone={badge.tone} />
                                  {badge.category && (
                                    <span className="mr-1 inline-block rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                                      {badge.category === "CREDIT_LIMIT_EXCEEDED" ? "ائتمان" :
                                       badge.category === "CUSTOMER_BLOCKED" ? "محظور" :
                                       badge.category === "PRODUCT_BLOCKED" ? "منتج" : badge.category}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  {order.error_message ? (
                                    <span className="group relative inline cursor-help text-[10px] text-rose-600 dark:text-rose-400">
                                      <AlertCircle className="inline h-3 w-3" />{" "}
                                      {order.error_message.slice(0, 40)}...
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(order.created_at)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        عرض {localOrders.length} من {localTotal}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          السابق
                        </button>
                        <span className="px-2 text-xs text-gray-900 dark:text-white">صفحة {page}</span>
                        <button
                          type="button"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={page >= Math.ceil(localTotal / PAGE_SIZE)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          التالي
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Local Detail Panel */}
              <div className="lg:col-span-1">
                {selectedLocalOrderId ? (
                  localDetailLoading ? (
                    <div className="flex h-[520px] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                      <RefreshCw className="h-7 w-7 text-gray-400 animate-spin" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">جاري تحميل التفاصيل...</span>
                    </div>
                  ) : localDetail ? (
                    <div className="max-h-[700px] space-y-5 overflow-y-auto rounded-2xl border border-gray-200 bg-white/80 p-5 backdrop-blur dark:border-gray-800 dark:bg-white/[0.03]">
                      {/* Header */}
                      <div className="space-y-1 border-b border-gray-200 pb-3 dark:border-gray-800">
                        <h3 className="flex items-center gap-2 text-md font-bold text-gray-900 dark:text-white">
                          <FileText className="h-4 w-4 text-gray-400" />
                          أوردر محلي
                        </h3>
                        <p className="break-all text-[10px] text-gray-400">المعرف: {localDetail.id}</p>
                      </div>

                      {/* Sync Status */}
                      <div className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                        localDetail.status === "sync_failed" || localDetail.status === "failed"
                          ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
                          : localDetail.status === "pushed"
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                          : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-gray-400">حالة المزامنة</span>
                          <StatusBadge label={localStatusBadge(localDetail).label} tone={localStatusBadge(localDetail).tone} />
                        </div>
                        {localDetail.rejection_category && (
                          <div className="mt-2 space-y-2 border-t border-rose-200 pt-2 dark:border-rose-500/30">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">تعذر إنشاء الأوردر</span>
                            </div>
                            <div className="whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-[11px] leading-relaxed text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                              {localDetail.rejection_message}
                            </div>
                          </div>
                        )}
                        {localDetail.error_message && !localDetail.rejection_category && (
                          <div className="mt-2 border-t border-rose-200 pt-2 dark:border-rose-500/30">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">رسالة الخطأ</div>
                            <div className="whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50/50 p-2 text-[11px] text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                              {localDetail.error_message}
                            </div>
                          </div>
                        )}
                        {localDetail.retry_count > 0 && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            محاولات إعادة: {localDetail.retry_count}
                          </div>
                        )}
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="block text-gray-400">الشركة</span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            localDetail.company === "MAS"
                              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
                              : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400"
                          }`}>
                            {localDetail.company}
                          </span>
                        </div>
                        <div>
                          <span className="block text-gray-400">معرف أودو</span>
                          <span className="font-semibold font-mono text-gray-900 dark:text-white">
                            {localDetail.odoo_order_id || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Customer */}
                      <div className="space-y-2 rounded-lg border border-gray-200 bg-brand-25/60 p-3 text-xs dark:border-gray-800 dark:bg-white/[0.02]">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">تفاصيل العميل</h4>
                        <p className="font-semibold text-gray-900 dark:text-white">{localDetail.partner_name || "—"}</p>
                        <p className="text-gray-500 dark:text-gray-400">معرف الشريك: {localDetail.partner_id}</p>
                      </div>

                      {/* Order Lines */}
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                          <Package className="h-3.5 w-3.5" />
                          بنود الأوردر ({localDetail.order_lines.length})
                        </h4>
                        <div className="space-y-1.5">
                          {localDetail.order_lines.map((line: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 text-xs dark:border-gray-800 dark:bg-white/[0.03]">
                              <div className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-gray-900 dark:text-white">{line.product_name || "منتج"}</span>
                                <span className="text-[10px] text-gray-400">
                                  {line.qty} &times; {formatEGP(line.price || line.price_unit || 0)}
                                </span>
                              </div>
                              <span className="mr-2 shrink-0 font-bold font-mono text-gray-900/80 dark:text-white/80">
                                {formatEGP((line.price || line.price_unit || 0) * (line.qty || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-0.5 border-t border-gray-200 pt-3 text-[10px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>تم الإنشاء</span>
                          <span>{formatDateTime(localDetail.created_at)}</span>
                        </div>
                        {localDetail.pushed_at && (
                          <div className="flex justify-between">
                            <span>تم الرفع</span>
                            <span>{formatDateTime(localDetail.pushed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
                      <AlertCircle className="mb-2 h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">تعذر تحميل التفاصيل</span>
                    </div>
                  )
                ) : (
                  <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 p-6 text-center bg-brand-25/30 dark:border-gray-700 dark:bg-white/[0.01]">
                    <Layers className="mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900/60 dark:text-white/60">اختر أوردر محلي</h3>
                    <p className="mt-1 max-w-[200px] text-xs leading-normal text-gray-400">
                      اضغط على أي أوردر محلي لعرض حالة المزامنة وتفاصيل الخطأ والبنود.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AdminPageFrame>
    </>
  );
}
