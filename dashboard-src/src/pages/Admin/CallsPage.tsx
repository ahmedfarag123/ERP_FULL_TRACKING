// Page Type: D - Utility/Log
// Purpose: View the full history of logged calls
// Primary user action: Filter calls by date or rep, review call context
// Data source: calls collection

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CalendarIcon, ClockIcon, PhoneIcon, PhoneXMarkIcon, PlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import DateRangePicker from "../../components/form/date-range-picker";
import UtilityPageLayout from "../../components/layout/UtilityPageLayout";
import CallActivityModal from "../../components/customer-activity/CallActivityModal";
import { AdminPageFrame, AdminSection } from "../../components/admin/AdminPageElements";
import CustomerAvatar from "../../components/ui/CustomerAvatar";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  buildCallSummaryLines,
  formatDurationMmSs,
  resolveCallDirection,
} from "../../lib/customer-activity";
import { isDateWithinRange } from "../../lib/date-range";
import { supabase } from "../../lib/supabase";
import { getCached, setCache } from "../../lib/offlineCache";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import { useUrlDateRangeParam, useUrlEnumParam, useUrlIntParam, useUrlStringParam } from "../../hooks/useUrlState";
import ConnectionStatusBar from "../../components/common/ConnectionStatusBar";

interface CallRow {
  id: string;
  customer_id: string | null;
  user_id: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  call_duration_seconds?: number | null;
  call_notes?: string | null;
  call_status?: string | null;
  call_reason?: string | null;
  customer_response?: string | null;
  call_outcome?: string | null;
  customer_disposition?: string | null;
  customer_objection?: string | null;
  requested_actions?: string[] | null;
  next_action?: string | null;
  callback_at?: string | null;
  follow_up_sla_status?: string | null;
  requires_urgent_action?: boolean | null;
  raw_form_payload?: Record<string, unknown> | null;
  customer_name?: string;
  user_name?: string;
}

interface ProfileOption {
  id: string;
  full_name: string | null;
  email?: string | null;
}

function getEffectiveCallDate(call: CallRow) {
  return new Date(call.completed_at || call.started_at || call.created_at);
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || seconds <= 0) return "٠د ٠ث";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toLocaleString("ar-EG")}د ${secs.toLocaleString("ar-EG")}ث`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isOverdueCallback(call: CallRow) {
  if (!call.callback_at) return false;
  if (String(call.follow_up_sla_status ?? "").toLowerCase().includes("done")) return false;
  return new Date(call.callback_at).getTime() < Date.now();
}

function slaTone(value: string | null | undefined): "green" | "yellow" | "red" | "gray" {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("done") || normalized.includes("met")) return "green";
  if (normalized.includes("overdue") || normalized.includes("breach")) return "red";
  if (normalized.includes("due") || normalized.includes("pending")) return "yellow";
  return "gray";
}

function formatProfileOption(profile: ProfileOption) {
  return profile.full_name || profile.email || profile.id.slice(0, 8);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const DIRECTION_TABS = ["all", "inbound", "outbound"] as const;

export default function CallsPage() {
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const { status: connectionStatus, isOffline, pendingCount } = useConnectionStatus();
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [salesRepOptions, setSalesRepOptions] = useState<Array<[string, string]>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useUrlDateRangeParam();
  const [directionTab, setDirectionTab] = useUrlEnumParam("direction", DIRECTION_TABS, "all");
  const [salesRepFilter, setSalesRepFilter] = useUrlStringParam("rep", "all" as string);
  const [dismissedFollowUps, setDismissedFollowUps] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useUrlIntParam("page", 1);
  const didMountFiltersRef = useRef(false);
  const ITEMS_PER_PAGE = 25;
  const dateRangeStart = dateRange[0]?.getTime() ?? null;
  const dateRangeEnd = dateRange[1]?.getTime() ?? null;

  const loadCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // If offline, try to serve from cache first
      if (isOffline) {
        const cacheKey = `calls-${JSON.stringify(dateRange)}-${salesRepFilter}`;
        const cached = await getCached<CallRow[]>(cacheKey);
        if (cached) {
          setCalls(cached);
          setIsLoading(false);
          return;
        }
      }

      let callsQuery = supabase
        .from("calls")
        .select(
          "id, customer_id, user_id, created_at, started_at, completed_at, call_duration_seconds, call_notes, call_status, call_reason, customer_response, call_outcome, next_action, callback_at, follow_up_sla_status, requires_urgent_action, raw_form_payload",
        )
      if (salesRepFilter !== "all") {
        callsQuery = callsQuery.eq("user_id", salesRepFilter);
      }

      const { data, error: fetchError } = await callsQuery.order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const filteredCalls = ((data ?? []) as CallRow[]).filter((call) => {
        const effectiveDate = getEffectiveCallDate(call);
        return isDateWithinRange(effectiveDate, dateRange);
      });

      const customerIds = Array.from(
        new Set(
          filteredCalls
            .map((call) => call.customer_id)
            .filter((value): value is string => Boolean(value)),
        ),
      );
      const userIds = Array.from(new Set(filteredCalls.map((call) => call.user_id)));

      const BATCH_SIZE = 50;
      async function batchFetch<T extends Record<string, unknown>>(
        table: string,
        select: string,
        ids: string[],
      ): Promise<T[]> {
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          chunks.push(ids.slice(i, i + BATCH_SIZE));
        }
        const results = await Promise.all(
          chunks.map((chunk) => supabase.from(table).select(select).in("id", chunk)),
        );
        for (const res of results) {
          if (res.error) throw res.error;
        }
        return results.flatMap((res) => (res.data ?? []) as unknown as T[]);
      }

      const [customersData, profilesData] = await Promise.all([
        customerIds.length > 0
          ? batchFetch<{ id: string; customer_name: string }>("customers", "id, customer_name", customerIds)
          : [],
        userIds.length > 0
          ? batchFetch<{ id: string; full_name: string }>("profiles", "id, full_name", userIds)
          : [],
      ]);

      const customerMap = new Map(customersData.map((c) => [c.id, c.customer_name]));
      const profileMap = new Map(profilesData.map((p) => [p.id, p.full_name]));

      const transformedCalls = filteredCalls.map((call) => ({
        ...call,
        customer_name: call.customer_id ? customerMap.get(call.customer_id) || undefined : undefined,
        user_name: profileMap.get(call.user_id) || undefined,
      }));

      setCalls(transformedCalls);

      // Cache the result for offline use
      const cacheKey = `calls-${JSON.stringify(dateRange)}-${salesRepFilter}`;
      await setCache(cacheKey, transformedCalls, 30 * 60 * 1000); // 30min TTL
    } catch (loadError) {
      // On network error, try cache
      const cacheKey = `calls-${JSON.stringify(dateRange)}-${salesRepFilter}`;
      const cached = await getCached<CallRow[]>(cacheKey);
      if (cached) {
        setCalls(cached);
        setError(null);
      } else {
        setError(loadError instanceof Error ? loadError.message : "Failed to load calls.");
        setCalls([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, isOffline, salesRepFilter]);

  const loadSalesRepOptions = useCallback(async () => {
    const { data: callUsers, error: callUsersError } = await supabase
      .from("calls")
      .select("user_id")
      .not("user_id", "is", null)
      .limit(5000);

    if (callUsersError) {
      console.warn("Failed to load call agent IDs.", callUsersError);
      return;
    }

    const userIds = Array.from(
      new Set(((callUsers ?? []) as Array<{ user_id: string | null }>).map((call) => call.user_id).filter(Boolean)),
    ) as string[];

    if (userIds.length === 0) {
      setSalesRepOptions([]);
      return;
    }

    const profileResults = await Promise.all(
      chunkArray(userIds, 500).map((ids) =>
        supabase
      .from("profiles")
      .select("id, full_name, email")
          .in("id", ids),
      ),
    );

    const profiles: ProfileOption[] = [];
    for (const result of profileResults) {
      if (result.error) {
        console.warn("Failed to load call agent filter options.", result.error);
        continue;
      }
      profiles.push(...((result.data ?? []) as ProfileOption[]));
    }

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    setSalesRepOptions(
      userIds
        .map((id) => [id, profileById.has(id) ? formatProfileOption(profileById.get(id)!) : id.slice(0, 8)] as [string, string])
        .sort((a, b) => a[1].localeCompare(b[1])),
    );
  }, []);

  const openCallActivityModal = useCallback(() => {
    setIsCallModalOpen(true);
  }, []);

  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

  useEffect(() => {
    void loadSalesRepOptions();
  }, [loadSalesRepOptions]);

  const visibleCalls = useMemo(() => {
    let list = calls;
    if (directionTab !== "all") {
      list = list.filter((call) => {
        const direction = resolveCallDirection(call);
        if (directionTab === "inbound") return direction.tone === "blue";
        return direction.tone === "purple";
      });
    }
    if (salesRepFilter !== "all") {
      list = list.filter((call) => call.user_id === salesRepFilter);
    }
    return list;
  }, [calls, directionTab, salesRepFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleCalls.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCalls = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return visibleCalls.slice(start, start + ITEMS_PER_PAGE);
  }, [safeCurrentPage, visibleCalls]);

  useEffect(() => {
    if (!isLoading && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, isLoading, setCurrentPage, totalPages]);

  useEffect(() => {
    if (!didMountFiltersRef.current) {
      didMountFiltersRef.current = true;
      return;
    }

    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, dateRangeEnd, dateRangeStart, directionTab, salesRepFilter, setCurrentPage]);

  const totalDuration = visibleCalls.reduce((sum, call) => sum + (call.call_duration_seconds || 0), 0);
  const todayCount = visibleCalls.filter(
    (call) => getEffectiveCallDate(call).toDateString() === new Date().toDateString(),
  ).length;
  const urgentFollowUps = visibleCalls.filter((call) => call.requires_urgent_action).length;
  const overdueCallbacks = visibleCalls.filter(isOverdueCallback).length;
  const isEmpty = !isLoading && visibleCalls.length === 0;

  const agentOverdueFollowUps = useMemo(() => {
    if (!authUser) return [];
    return calls.filter(
      (call) => call.user_id === authUser.id && isOverdueCallback(call) && !dismissedFollowUps.has(call.id),
    );
  }, [calls, authUser, dismissedFollowUps]);

  const dismissFollowUp = useCallback((callId: string) => {
    setDismissedFollowUps((prev) => {
      const next = new Set(prev);
      next.add(callId);
      return next;
    });
  }, []);

  return (
    <>
      <PageMeta title="المكالمات | إدارة المبيعات" description="مراجعة سجلات المكالمات عبر الفريق." />

      <AdminPageFrame>
        <ConnectionStatusBar status={connectionStatus} pendingCount={pendingCount} />

        <UtilityPageLayout
          header={
            <PageHeader
              variant="list"
              eyebrow="سجل التواصل"
              title="المكالمات"
              subtitle="كل المكالمات الواردة والصادرة المسجلة من الفريق."
              actions={
                <button
                  type="button"
                  onClick={openCallActivityModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4" aria-hidden />
                  تسجيل مكالمة
                </button>
              }
            />
          }
          notices={
            <>
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
              {agentOverdueFollowUps.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        لديك {agentOverdueFollowUps.length} متابعات متأخرة تحتاج اتصال
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {agentOverdueFollowUps.slice(0, 5).map((call) => (
                          <div key={call.id} className="flex items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-300">
                            <span>
                              {call.customer_name ?? "عميل"} — معاودة اتصال{" "}
                              {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(call.callback_at!))}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => call.customer_id ? navigate(`/customers/${call.customer_id}?highlight=follow-up-${call.id}`) : undefined}
                                className="shrink-0 rounded-lg p-1 text-amber-500 transition hover:bg-amber-100 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/10"
                                title="عرض تفاصيل المكالمة"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => dismissFollowUp(call.id)}
                                className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium text-amber-600 transition hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/10"
                              >
                                تجاهل
                              </button>
                            </div>
                          </div>
                        ))}
                        {agentOverdueFollowUps.length > 5 && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400">
                            +{agentOverdueFollowUps.length - 5} متابعات أخرى
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDismissedFollowUps(new Set(agentOverdueFollowUps.map((c) => c.id)))}
                      className="shrink-0 rounded-lg p-1 text-amber-400 transition hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-500/10"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <StatCard
              label="إجمالي المكالمات"
              icon={<PhoneIcon className="h-5 w-5" aria-hidden />}
              value={isLoading ? "--" : visibleCalls.length.toLocaleString("ar-EG")}
              muted={isEmpty}
              tone="blue"
            />
            <StatCard
              label="مكالمات اليوم"
              icon={<CalendarIcon className="h-5 w-5" aria-hidden />}
              value={isLoading ? "--" : todayCount.toLocaleString("ar-EG")}
              muted={isEmpty}
              tone="purple"
            />
            <StatCard
              label="إجمالي المدة"
              icon={<ClockIcon className="h-5 w-5" aria-hidden />}
              value={isLoading ? "--" : formatDuration(totalDuration)}
              muted={isEmpty}
              valueDir="ltr"
              tone="green"
            />
            <StatCard
              label="متابعات عاجلة"
              icon={<PhoneIcon className="h-5 w-5" aria-hidden />}
              value={isLoading ? "--" : urgentFollowUps.toLocaleString("ar-EG")}
              muted={urgentFollowUps === 0}
              tone="yellow"
            />
            <StatCard
              label="معاودات اتصال متأخرة"
              icon={<ClockIcon className="h-5 w-5" aria-hidden />}
              value={isLoading ? "--" : overdueCallbacks.toLocaleString("ar-EG")}
              muted={overdueCallbacks === 0}
              tone="red"
            />
          </div>

          <AdminSection title="سجل المكالمات" description="فلتر حسب الاتجاه ونطاق التاريخ.">
            <div className="mb-4 flex flex-col gap-4 border-b border-gray-100 pb-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {DIRECTION_TABS.map((tab) => {
                  const active = directionTab === tab;
                  const label = tab === "all" ? "الكل" : tab === "inbound" ? "واردة" : "صادرة";
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setDirectionTab(tab)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={salesRepFilter}
                  onChange={(event) => setSalesRepFilter(event.target.value)}
                  className="min-w-[160px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  aria-label="ممثل المبيعات"
                >
                  <option value="all">كل المندوبين</option>
                  {salesRepOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <div className="min-w-[220px] flex-1 lg:min-w-[260px]">
                  <DateRangePicker
                    id="calls-date-range"
                    label=""
                    placeholder="اختر نطاق التاريخ"
                    value={dateRange}
                    onChange={(value) => {
                      startTransition(() => {
                        setDateRange(value);
                      });
                    }}
                  />
                </div>
                {dateRange[0] ?? dateRange[1] ? (
                  <button
                    type="button"
                    onClick={() => setDateRange([null, null])}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                  >
                    مسح
                  </button>
                ) : null}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
                ))}
              </div>
            ) : isEmpty ? (
              <EmptyState
                icon={<PhoneXMarkIcon className="h-10 w-10 text-gray-300" />}
                title="لا توجد مكالمات مسجلة بعد"
                description="ستظهر المكالمات هنا بعد أن يسجل الفريق النشاط من ملفات العملاء أو تطبيق الهاتف."
                action={
                  <button
                    type="button"
                    onClick={openCallActivityModal}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4" aria-hidden />
                    تسجيل مكالمة
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm" dir="rtl">
                  <thead className="border-b border-gray-100 bg-brand-25/80 dark:border-gray-800 dark:bg-white/[0.02]">
                    <tr>
                      {["العميل", "ممثل المبيعات", "التاريخ والوقت", "المدة", "الاتجاه", "متابعة SLA", "الملاحظات", ""].map((label) => (
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
                    {paginatedCalls.map((call) => {
                      const direction = resolveCallDirection(call);
                      const effectiveDate = getEffectiveCallDate(call);
                      const summaryLines = buildCallSummaryLines(call);
                      return (
                        <tr key={call.id} className="transition hover:bg-brand-25/80 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar name={call.customer_name ?? "عميل"} size="sm" />
                              {call.customer_id ? (
                                <Link to={`/customers/${call.customer_id}`} dir="auto" className="font-medium text-gray-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                                  {call.customer_name ?? "عميل غير معروف"}
                                </Link>
                              ) : (
                                <p dir="auto" className="font-medium text-gray-900 dark:text-white">
                                  {call.customer_name ?? "عميل غير معروف"}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                            {call.user_name ?? call.user_id.slice(0, 8)}
                          </td>
                          <td dir="ltr" className="px-4 py-4 text-gray-700 dark:text-gray-300">
                            {formatDateTime(effectiveDate.toISOString())}
                          </td>
                          <td dir="ltr" className="px-4 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                            {formatDurationMmSs(call.call_duration_seconds)}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge label={direction.label} tone={direction.tone} />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {call.requires_urgent_action ? (
                                <StatusBadge label="عاجل" tone="red" />
                              ) : null}
                              {call.callback_at ? (
                                <StatusBadge
                                  label={`معاودة اتصال ${formatDateTime(call.callback_at)}`}
                                  tone={isOverdueCallback(call) ? "red" : "blue"}
                                />
                              ) : null}
                              {call.follow_up_sla_status ? (
                                <StatusBadge label={call.follow_up_sla_status} tone={slaTone(call.follow_up_sla_status)} />
                              ) : null}
                              {!call.requires_urgent_action && !call.callback_at && !call.follow_up_sla_status ? "--" : null}
                            </div>
                          </td>
                          <td className="max-w-[280px] px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="space-y-1">
                              {summaryLines.slice(0, 3).map((line) => (
                                <p key={line} dir="auto" className="truncate" title={line}>
                                  {line}
                                </p>
                              ))}
                              {summaryLines.length === 0 ? <span>--</span> : null}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/calls/activity/${call.id}`)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                              title="عرض تفاصيل المكالمة"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              عرض
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      صفحة {safeCurrentPage.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")} ({visibleCalls.length.toLocaleString("ar-EG")} مكالمة)
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                      >
                        السابق
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4));
                        const page = start + i;
                        if (page > totalPages) return null;
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[28px] rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                              page === safeCurrentPage
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                : "text-gray-600 hover:bg-brand-25 dark:text-gray-400 dark:hover:bg-white/[0.02]"
                            }`}
                          >
                            {page.toLocaleString("ar-EG")}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AdminSection>
        </UtilityPageLayout>
      </AdminPageFrame>
      <CallActivityModal
        isOpen={isCallModalOpen}
        customer={null}
        actorUserId={authUser?.id ?? null}
        onClose={() => setIsCallModalOpen(false)}
        onSaved={loadCalls}
      />
    </>
  );
}
