// Page Type: A — List
// Purpose: Browse, search, and filter the full customer directory
// Primary user action: Find a customer and navigate to their profile
// Data source: customers collection

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  CalendarDaysIcon,
  EyeIcon,
  FlagIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import ListPageLayout from "../../components/layout/ListPageLayout";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import BulkAssignWizard from "../../components/admin/BulkAssignWizard";
import CreateCustomerModal from "../../components/customer-service/CreateCustomerModal";
import CustomerAvatar from "../../components/ui/CustomerAvatar";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import VisitActivityModal from "../../components/customer-activity/VisitActivityModal";
import { useAuth } from "../../context/AuthContext";
import { useUrlIntParam, useUrlStringParam } from "../../hooks/useUrlState";
import {
  isGoogleMapsUrl,
  parseCoordinateText,
  resolveCustomerLocation,
  type ResolvedCustomerLocation,
} from "../../lib/customer-location";
import { supabase } from "../../lib/supabase";
import { fetchOdooPartners, fetchSalespersons, fetchMonthlyStats, type OdooPartner, type Salesperson, type MonthlyStats } from "../../lib/crm-orders-api";
import { Database, Building2 } from "lucide-react";

type TabId = "local" | "odoo";

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
  created_at: string;
}

function formatDate(value: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(parsed);
}

function resolveCustomerContact(customer: Customer) {
  const emailIsLocation = Boolean(parseCoordinateText(customer.customer_email) || isGoogleMapsUrl(customer.customer_email));
  const location = resolveCustomerLocation(customer);

  return {
    email: emailIsLocation ? null : customer.customer_email,
    location,
  };
}

function CustomerLocationCell({ location }: { location: ResolvedCustomerLocation }) {
  const title = location.sourceText ?? location.displayText ?? "لا يوجد عنوان";

  if (location.mapUrl) {
    return (
      <div className="flex justify-end">
        <a
          href={location.mapUrl}
          target="_blank"
          rel="noreferrer"
          title={title}
          aria-label="فتح الخريطة"
          className="inline-flex max-w-full items-center justify-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
        >
          <MapPinIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="whitespace-nowrap">فتح الخريطة</span>
        </a>
      </div>
    );
  }

  if (location.displayText) {
    return (
      <span
        dir="auto"
        title={location.displayText}
        className="block max-w-[280px] overflow-hidden break-words text-right text-sm leading-5 text-gray-600 dark:text-gray-300 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
      >
        {location.displayText}
      </span>
    );
  }

  return <span className="block text-right text-sm text-gray-300 dark:text-gray-600">لا يوجد عنوان</span>;
}

function priorityBadge(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "high") return { tone: "orange" as const, label: "High" };
  if (normalized === "medium") return { tone: "yellow" as const, label: "Medium" };
  return { tone: "green" as const, label: "Low" };
}

function statusBadge(status: string) {
  return status.toLowerCase() === "active"
    ? { tone: "green" as const, label: "نشط" }
    : { tone: "gray" as const, label: "غير نشط" };
}

function rowAccent(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "high") return "border-l-red-400";
  if (normalized === "medium") return "border-l-amber-400";
  if (normalized === "low") return "border-l-emerald-400";
  return "border-l-gray-200";
}

function isRecentVisit(iso: string | null) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
}

const PAGE_SIZE = 20;

/** Applies status, priority, and search filters. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder generics recurse too deeply here.
function applyCustomerListFilters(query: any, search: string, statusFilter: string, priorityFilter: string): any {
  let q = query;
  if (statusFilter !== "all") q = q.eq("status", statusFilter);
  if (priorityFilter !== "all") q = q.eq("priority", priorityFilter);
  if (search.trim()) {
    const term = search.trim();
    q = q.or(
      `customer_name.ilike.%${term}%,customer_email.ilike.%${term}%,customer_location.ilike.%${term}%,google_maps_url.ilike.%${term}%,phone_number.ilike.%${term}%`,
    );
  }
  return q;
}

export default function CustomersManagement() {
  const { authUser } = useAuth();
  const [tab, setTab] = useState<TabId>("local");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [activeInScopeCount, setActiveInScopeCount] = useState(0);
  const [highPriorityScopeCount, setHighPriorityScopeCount] = useState(0);
  const [neverVisitedScopeCount, setNeverVisitedScopeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useUrlStringParam("q");
  const [statusFilter, setStatusFilter] = useUrlStringParam("status", "all" as string);
  const [priorityFilter, setPriorityFilter] = useUrlStringParam("priority", "all" as string);
  const [page, setPage] = useUrlIntParam("page", 1);
  const didMountFiltersRef = useRef(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [selectedVisitCustomer, setSelectedVisitCustomer] = useState<Customer | null>(null);

  const [odooPartners, setOdooPartners] = useState<OdooPartner[]>([]);
  const [odooTotal, setOdooTotal] = useState(0);
  const [odooPage, setOdooPage] = useState(1);
  const [odooSearch, setOdooSearch] = useState("");
  const [odooSearchDebounced, setOdooSearchDebounced] = useState("");
  const [odooLoading, setOdooLoading] = useState(true);
  const [odooError, setOdooError] = useState<string | null>(null);
  const odooSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [salespersonFilter, setSalespersonFilter] = useState<number | "all">("all");
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);

  useEffect(() => {
    if (odooSearchTimerRef.current) clearTimeout(odooSearchTimerRef.current);
    odooSearchTimerRef.current = setTimeout(() => {
      setOdooSearchDebounced(odooSearch);
      setOdooPage(1);
    }, 400);
    return () => {
      if (odooSearchTimerRef.current) clearTimeout(odooSearchTimerRef.current);
    };
  }, [odooSearch]);

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const listSelect =
        "id, customer_name, customer_email, customer_location, google_maps_url, lat, lng, phone_number, whatsapp_number, governorate, district, place, address_line, status, priority, last_visit_at, created_at";

      let listQuery = supabase
        .from("customers")
        .select(listSelect, { count: "exact" })
        .order("created_at", { ascending: false });
      listQuery = applyCustomerListFilters(listQuery, search, statusFilter, priorityFilter);
      listQuery = listQuery.range(from, to);

      const activeCountPromise =
        statusFilter === "inactive" || statusFilter === "archived"
          ? Promise.resolve({ count: 0, error: null })
          : statusFilter === "active"
            ? Promise.resolve({ count: null as number | null, error: null })
            : (() => {
                let q = supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active");
                q = applyCustomerListFilters(q, search, "all", priorityFilter);
                return q;
              })();

      const highCountPromise =
        priorityFilter === "medium" || priorityFilter === "low"
          ? Promise.resolve({ count: 0, error: null })
          : priorityFilter === "high"
            ? Promise.resolve({ count: null as number | null, error: null })
            : (() => {
                let q = supabase.from("customers").select("id", { count: "exact", head: true }).eq("priority", "high");
                q = applyCustomerListFilters(q, search, statusFilter, "all");
                return q;
              })();

      let neverQuery = supabase.from("customers").select("id", { count: "exact", head: true }).is("last_visit_at", null);
      neverQuery = applyCustomerListFilters(neverQuery, search, statusFilter, priorityFilter);

      const [listRes, activeRes, highRes, neverRes] = await Promise.all([
        listQuery,
        activeCountPromise,
        highCountPromise,
        neverQuery,
      ]);

      if (listRes.error) throw listRes.error;
      if (activeRes.error) throw activeRes.error;
      if (highRes.error) throw highRes.error;
      if (neverRes.error) throw neverRes.error;

      const total = listRes.count ?? 0;
      setCustomers((listRes.data ?? []) as Customer[]);
      setTotalMatching(total);

      if (statusFilter === "active") {
        setActiveInScopeCount(total);
      } else if (statusFilter === "inactive" || statusFilter === "archived") {
        setActiveInScopeCount(0);
      } else {
        setActiveInScopeCount(activeRes.count ?? 0);
      }

      if (priorityFilter === "high") {
        setHighPriorityScopeCount(total);
      } else if (priorityFilter === "medium" || priorityFilter === "low") {
        setHighPriorityScopeCount(0);
      } else {
        setHighPriorityScopeCount(highRes.count ?? 0);
      }

      setNeverVisitedScopeCount(neverRes.count ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load customers.");
      setCustomers([]);
      setTotalMatching(0);
      setActiveInScopeCount(0);
      setHighPriorityScopeCount(0);
      setNeverVisitedScopeCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, priorityFilter, search, statusFilter]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const loadOdooPartners = useCallback(async () => {
    try {
      setOdooLoading(true);
      setOdooError(null);
      const sp = salespersonFilter === "all" ? undefined : salespersonFilter;
      const res = await fetchOdooPartners(odooPage, PAGE_SIZE, odooSearchDebounced || undefined, sp);
      setOdooPartners(res.partners);
      setOdooTotal(res.total);
    } catch (e) {
      setOdooError(e instanceof Error ? e.message : "Failed to load Odoo customers.");
      setOdooPartners([]);
      setOdooTotal(0);
    } finally {
      setOdooLoading(false);
    }
  }, [odooPage, odooSearchDebounced, salespersonFilter]);

  useEffect(() => {
    if (tab === "local") void loadCustomers();
  }, [loadCustomers, tab]);

  useEffect(() => {
    if (tab === "odoo") void loadOdooPartners();
  }, [loadOdooPartners, tab]);

  useEffect(() => {
    fetchSalespersons().then(setSalespersons).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "odoo") {
      const sp = salespersonFilter === "all" ? undefined : salespersonFilter;
      fetchMonthlyStats(sp).then(setMonthlyStats).catch(() => setMonthlyStats(null));
    }
  }, [tab, salespersonFilter]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const rangeStart = totalMatching === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const rangeEnd = totalMatching === 0 ? 0 : Math.min(pageSafe * PAGE_SIZE, totalMatching);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, setPage, totalPages]);

  const odooTotalPages = Math.max(1, Math.ceil(odooTotal / PAGE_SIZE));
  const odooPageSafe = Math.min(odooPage, odooTotalPages);
  const odooRangeStart = odooTotal === 0 ? 0 : (odooPageSafe - 1) * PAGE_SIZE + 1;
  const odooRangeEnd = odooTotal === 0 ? 0 : Math.min(odooPageSafe * PAGE_SIZE, odooTotal);

  useEffect(() => {
    if (!didMountFiltersRef.current) {
      didMountFiltersRef.current = true;
      return;
    }

    if (page !== 1) {
      setPage(1);
    }
  }, [page, priorityFilter, search, setPage, statusFilter]);

  const isLocalTab = tab === "local";

  return (
    <>
      <PageMeta title="Customers | Sales Admin" description="Browse and filter customers." />

      <AdminPageFrame>
        <ListPageLayout
          header={
            <PageHeader
              variant="list"
              eyebrow="CUSTOMER DIRECTORY"
              title="Customers"
              subtitle="تصفح قاعدة العملاء، وفلتر حسب الحالة أو الأولوية، وافتح ملفات العملاء مباشرة."
              actions={
                isLocalTab ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateCustomerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                  >
                    <UserPlusIcon className="h-4 w-4" aria-hidden />
                    عميل جديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkAssignOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                  >
                    <UserPlusIcon className="h-4 w-4" aria-hidden />
                    Bulk Assign
                  </button>
                </div>
                ) : undefined
              }
            />
          }
          stats={
            isLocalTab ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">قاعدة العملاء</p>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                    <UsersIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
                  {isLoading ? "—" : totalMatching.toLocaleString("ar-EG")}
                </p>
              </article>
              <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">النشط ضمن النتائج</p>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <EyeIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
                  {isLoading ? "—" : activeInScopeCount.toLocaleString("ar-EG")}
                </p>
                <p className="mt-1 text-xs text-gray-500">ظاهر ضمن نطاق التصفية الحالي</p>
              </article>
              <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">أولوية عالية</p>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    <FlagIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
                  {isLoading ? "—" : highPriorityScopeCount.toLocaleString("en-US")}
                </p>
              </article>
              <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">لم تتم زيارته</p>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                    <MapPinIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p
                  className={`mt-3 text-3xl font-bold ${
                    !isLoading && neverVisitedScopeCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"
                  }`}
                  dir="ltr"
                >
                  {isLoading ? "—" : neverVisitedScopeCount.toLocaleString("en-US")}
                </p>
              </article>
            </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">إجمالي عملاء أودو</p>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                      <Building2 className="h-5 w-5" aria-hidden />
                    </div>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
                    {odooLoading ? "—" : odooTotal.toLocaleString("en-US")}
                  </p>
                </article>
              </div>
            )
          }
        >
          {error || odooError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error || odooError}
            </div>
          ) : null}

          <div className="mb-4 flex w-fit gap-1 rounded-xl border border-gray-200 bg-brand-25/60 p-1 dark:border-gray-700 dark:bg-white/[0.02]/60">
            {([
              { id: "local" as const, label: "عملاء النظام", icon: Database },
              { id: "odoo" as const, label: "عملاء أودو", icon: Building2 },
            ]).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setPage(1);
                  setOdooPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {isLocalTab && (

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, phone, or email"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-3">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:w-auto sm:min-w-[140px]"
                  aria-label="Status"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="archived">مؤرشف</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className="w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:w-auto sm:min-w-[140px]"
                  aria-label="Priority"
                >
                  <option value="all">كل الأولويات</option>
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
                ))}
              </div>
            ) : totalMatching === 0 ? (
              <div className="py-16">
                <EmptyState
                  title="لم يتم العثور على عملاء"
                  description="Try broadening the status or priority filters, or search with a shorter term."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm" dir="rtl">
                  <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04] dark:text-gray-500">
                    <tr>
                      {[
                        "CUSTOMER",
                        "CONTACT",
                        "LOCATION",
                        "PRIORITY",
                        "STATUS",
                        "LAST VISIT",
                        "CREATED",
                        "ACTION",
                      ].map((label) => (
                        <th key={label} className="px-4 py-3 text-right">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => {
                      const priority = priorityBadge(customer.priority);
                      const status = statusBadge(customer.status);
                      const contact = resolveCustomerContact(customer);
                      const location = contact.location;
                      return (
                        <tr
                          key={customer.id}
                          className={`border-b border-gray-100 border-l-4 transition hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.02] ${rowAccent(
                            customer.priority,
                          )}`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar name={customer.customer_name} size="sm" shape="circle" />
                              <div className="min-w-0">
                                <p dir="auto" className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                  {customer.customer_name}
                                </p>
                                <p dir={contact.email ? "auto" : "ltr"} className="mt-0.5 truncate text-xs text-gray-400">
                                  {contact.email || "لا يوجد بريد مسجل"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p dir="ltr" className="font-mono text-sm text-gray-900 dark:text-white">
                              {customer.phone_number || "--"}
                            </p>
                            {customer.whatsapp_number ? (
                              <p className="mt-1 text-xs text-emerald-600">
                                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
                                WhatsApp
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-gray-400">لا يوجد واتساب</p>
                            )}
                          </td>
                          <td className="w-[240px] max-w-[280px] px-4 py-4">
                            <CustomerLocationCell location={location} />
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge label={priority.label} tone={priority.tone} />
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge label={status.label} tone={status.tone} />
                          </td>
                          <td className="px-4 py-4">
                            {customer.last_visit_at ? (
                              <span
                                dir="ltr"
                                className={`text-sm ${
                                  isRecentVisit(customer.last_visit_at)
                                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                                    : "text-gray-600 dark:text-gray-300"
                                }`}
                              >
                                {formatDate(customer.last_visit_at)}
                              </span>
                            ) : (
                              <StatusBadge label="Never" tone="red" />
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500" dir="ltr">
                            {formatDate(customer.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setSelectedVisitCustomer(customer)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                              >
                                <CalendarDaysIcon className="h-4 w-4" aria-hidden />
                                Log Visit
                              </button>
                              <Link
                                to={`/customers/${customer.id}`}
                                className="inline-flex text-sm font-medium text-blue-600 transition hover:text-blue-800 dark:text-blue-400"
                              >
                                View Profile →
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && totalMatching > 0 ? (
              <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">
                  Showing {rangeStart.toLocaleString("en-US")}–{rangeEnd.toLocaleString("en-US")} of{" "}
                  {totalMatching.toLocaleString("ar-EG")} عميل
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm text-gray-600 dark:text-gray-400" dir="ltr">
                    الصفحة {pageSafe.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}
                  </span>
                  <button
                    type="button"
                    disabled={pageSafe >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          )}

          {!isLocalTab && (
            <>
            {monthlyStats && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      عملاء الشهر الحالي ({monthlyStats.month})
                    </p>
                    <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white" dir="ltr">
                      {monthlyStats.total.toLocaleString("en-US")}
                    </p>
                    {salespersonFilter !== "all" && (
                      <p className="mt-1 text-sm text-gray-500">
                        {salespersons.find((s) => s.odoo_user_id === salespersonFilter)?.name || ""}
                      </p>
                    )}
                  </div>
                  {salespersonFilter === "all" && monthlyStats.breakdown.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {monthlyStats.breakdown.slice(0, 6).map((b) => (
                        <button
                          key={b.user_id}
                          type="button"
                          onClick={() => setSalespersonFilter(b.user_id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-brand-25 px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                        >
                          <span>{b.name}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                            {b.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={odooSearch}
                    onChange={(e) => setOdooSearch(e.target.value)}
                    placeholder="Search by name, code, or phone..."
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <select
                    value={salespersonFilter === "all" ? "all" : String(salespersonFilter)}
                    onChange={(e) => {
                      setSalespersonFilter(e.target.value === "all" ? "all" : Number(e.target.value));
                      setOdooPage(1);
                    }}
                    className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:min-w-[180px]"
                  >
                    <option value="all">كل السيلز بيرسون</option>
                    {salespersons.map((sp) => (
                      <option key={sp.odoo_user_id} value={sp.odoo_user_id}>
                        {sp.name} ({sp.partner_count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {odooLoading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
                  ))}
                </div>
              ) : odooPartners.length === 0 ? (
                <div className="py-16">
                  <EmptyState
                    title="لم يتم العثور على عملاء"
                    description="Try broadening your search."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm" dir="rtl">
                    <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04] dark:text-gray-500">
                      <tr>
                        {["CODE", "NAME", "PHONE", "CITY", "SALESPERSON", "TYPE"].map((label) => (
                          <th key={label} className="px-4 py-3 text-right">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {odooPartners.map((partner) => (
                        <tr key={partner.id} className="border-b border-gray-100 transition hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-4">
                            <span className="rounded-md bg-brand-25 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-white/[0.02] dark:text-gray-300">
                              {partner.ref || "\u2014"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar name={partner.name} size="sm" shape="circle" />
                              <p dir="auto" className="truncate text-sm font-medium text-gray-900 dark:text-white">{partner.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p dir="ltr" className="font-mono text-sm text-gray-900 dark:text-white">{partner.phone || "\u2014"}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-600 dark:text-gray-300">{partner.city || "\u2014"}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {partner.salesperson_name || "\u2014"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge
                              label={partner.is_company ? "شركة" : "فرد"}
                              tone={partner.is_company ? "blue" : "gray"}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!odooLoading && odooTotal > 0 ? (
                <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">
                    Showing {odooRangeStart.toLocaleString("en-US")}–{odooRangeEnd.toLocaleString("en-US")} of{" "}
                    {odooTotal.toLocaleString("en-US")} عميل
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={odooPageSafe <= 1}
                      onClick={() => setOdooPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-sm text-gray-600 dark:text-gray-400" dir="ltr">
                      الصفحة {odooPageSafe.toLocaleString("ar-EG")} من {odooTotalPages.toLocaleString("ar-EG")}
                    </span>
                    <button
                      type="button"
                      disabled={odooPageSafe >= odooTotalPages}
                      onClick={() => setOdooPage((p) => Math.min(odooTotalPages, p + 1))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            </>
          )}
        </ListPageLayout>
      </AdminPageFrame>

      <BulkAssignWizard
        isOpen={bulkAssignOpen}
        onClose={() => setBulkAssignOpen(false)}
        onSuccess={() => {
          setBulkAssignOpen(false);
          void loadCustomers();
        }}
      />

      <CreateCustomerModal
        isOpen={createCustomerOpen}
        onClose={() => setCreateCustomerOpen(false)}
        onCreated={() => {
          setCreateCustomerOpen(false);
          void loadCustomers();
        }}
      />
      <VisitActivityModal
        isOpen={Boolean(selectedVisitCustomer)}
        customer={
          selectedVisitCustomer
            ? {
                id: selectedVisitCustomer.id,
                customer_name: selectedVisitCustomer.customer_name,
                phone_number: selectedVisitCustomer.phone_number,
              }
            : null
        }
        actorUserId={authUser?.id ?? null}
        onClose={() => setSelectedVisitCustomer(null)}
        onSaved={loadCustomers}
      />
    </>
  );
}
