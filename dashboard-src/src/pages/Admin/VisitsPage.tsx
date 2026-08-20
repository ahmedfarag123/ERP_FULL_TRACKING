import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon, FunnelIcon } from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import DateRangePicker from "../../components/form/date-range-picker";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import VisitActivityModal from "../../components/customer-activity/VisitActivityModal";
import PageHeader from "../../components/ui/PageHeader";
import KpiCards from "../../components/admin/visits/KpiCards";
import AgentPerformanceRow from "../../components/admin/visits/AgentPerformanceRow";
import VisitFeed from "../../components/admin/visits/VisitFeed";
import VisitFeedPagination from "../../components/admin/visits/VisitFeedPagination";
import type { VisitFeedItem } from "../../components/admin/visits/VisitFeedCard";
import { useAuth } from "../../context/AuthContext";
import { getDateRangeBounds, type DateRangeValue } from "../../lib/date-range";
import { supabase } from "../../lib/supabase";
import { paginateItems } from "../../lib/pagination";
import { useVisitNoteTranslations } from "../../hooks/useVisitNoteTranslations";
import { useUrlDateRangeParam, useUrlStringParam } from "../../hooks/useUrlState";

interface VisitRow {
  id: string;
  customer_id: string;
  user_id: string;
  started_at: string | null;
  checked_in_at: string;
  completed_at: string | null;
  created_at: string;
  visit_mode: string | null;
  visit_result: string | null;
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
  within_geofence?: boolean | null;
  customer_distance_meters?: number | null;
  captured_photo_path?: string | null;
  raw_payload?: Record<string, unknown> | null;
  raw_form_payload?: Record<string, unknown> | null;
  customer_name?: string;
  user_name?: string;
}

type QuickFilter = "all" | "today" | "productive" | "followup" | "quotation" | "orders" | "failed";

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "today", label: "اليوم" },
  { key: "productive", label: "منتجة" },
  { key: "followup", label: "تحتاج متابعة" },
  { key: "quotation", label: "عرض سعر" },
  { key: "orders", label: "طلبات" },
  { key: "failed", label: "فاشلة" },
];

const VISITS_PER_PAGE = 12;

export default function VisitsPage() {
  const { authUser } = useAuth();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string | null }>>([]);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useUrlDateRangeParam();
  const [salesRepFilter, setSalesRepFilter] = useUrlStringParam("rep", "all" as string);
  const [quickFilter, setQuickFilter] = useUrlStringParam<QuickFilter>("filter", "all");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [feedPage, setFeedPage] = useState(1);

  const loadVisits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { startIso, endIso } = getDateRangeBounds(dateRange);
      let query = supabase
        .from("visits")
        .select(
          "id, customer_id, user_id, started_at, checked_in_at, completed_at, created_at, visit_mode, visit_result, note, lat, lng, within_geofence, customer_distance_meters, captured_photo_path, raw_payload, raw_form_payload",
        );

      if (salesRepFilter !== "all") {
        query = query.eq("user_id", salesRepFilter);
      }
      if (startIso) {
        query = query.gte("checked_in_at", startIso);
      }
      if (endIso) {
        query = query.lte("checked_in_at", endIso);
      }

      const { data, error: fetchError } = await query.order("checked_in_at", {
        ascending: false,
      });

      if (fetchError) throw fetchError;

      const visitRows = (data ?? []) as VisitRow[];
      const customerIds = Array.from(new Set(visitRows.map((visit) => visit.customer_id)));

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

      const allProfilesRes = await supabase.from("profiles").select("id, full_name").eq("role", "sales_agent").eq("status", "active");
      if (allProfilesRes.error) throw allProfilesRes.error;

      const customersData = customerIds.length > 0
        ? await batchFetch<{ id: string; customer_name: string }>("customers", "id, customer_name", customerIds)
        : [];

      const customerMap = new Map(customersData.map((c) => [c.id, c.customer_name]));

      const allProfiles = (allProfilesRes.data || []) as Array<{ id: string; full_name: string | null }>;
      const profileMap = new Map(
        allProfiles.map((profile) => [profile.id, profile.full_name]),
      );

      const userIds = Array.from(new Set(visitRows.map((visit) => visit.user_id)));
      const missingProfiles = userIds.filter(id => !profileMap.has(id));
      if (missingProfiles.length > 0) {
        const extraProfiles = await batchFetch<{ id: string; full_name: string }>("profiles", "id, full_name", missingProfiles);
        for (const profile of extraProfiles) {
          profileMap.set(profile.id, profile.full_name);
          allProfiles.push(profile);
        }
      }

      const enrichedRows = visitRows.map((visit) => ({
        ...visit,
        customer_name: customerMap.get(visit.customer_id) || undefined,
        user_name: profileMap.get(visit.user_id) || undefined,
      }));

      allProfiles.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
      setProfiles(allProfiles);

      setVisits(enrichedRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load visits.");
      setVisits([]);
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, salesRepFilter]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  const filteredVisits = useMemo(() => {
    let result = visits;

    if (selectedAgentId) {
      result = result.filter((v) => v.user_id === selectedAgentId);
    }

    if (quickFilter === "all") return result;

    const today = new Date().toDateString();
    return result.filter((visit) => {
      let parsedPayload: Record<string, unknown> | undefined;
      if (typeof visit.raw_form_payload === "string") {
        try { parsedPayload = JSON.parse(visit.raw_form_payload); } catch { /* not JSON */ }
      } else if (visit.raw_form_payload && typeof visit.raw_form_payload === "object") {
        parsedPayload = visit.raw_form_payload as Record<string, unknown>;
      }
      const outcome = typeof parsedPayload?.visit_outcome === "string" ? parsedPayload.visit_outcome : "";
      const result = (visit.visit_result ?? "").toLowerCase();

      switch (quickFilter) {
        case "today":
          return new Date(visit.checked_in_at).toDateString() === today;
        case "productive":
          return (
            outcome === "quotation_requested" ||
            outcome === "order_expected" ||
            outcome === "meeting_completed"
          );
        case "followup":
          return outcome === "follow_up_required";
        case "quotation":
          return outcome === "quotation_requested";
        case "orders":
          return outcome === "order_expected" || result.includes("order");
        case "failed":
          return (
            result.includes("miss") ||
            result.includes("cancel") ||
            outcome === "customer_unavailable"
          );
        default:
          return true;
      }
    });
  }, [visits, quickFilter, selectedAgentId]);

  const feedItems: VisitFeedItem[] = useMemo(
    () =>
      filteredVisits.map((v) => {
        let parsedPayload: Record<string, unknown> | null = null;
        if (typeof v.raw_form_payload === "string") {
          try { parsedPayload = JSON.parse(v.raw_form_payload); } catch { /* not JSON */ }
        } else if (v.raw_form_payload && typeof v.raw_form_payload === "object") {
          parsedPayload = v.raw_form_payload as Record<string, unknown>;
        }
        return {
          id: v.id,
          customerName: v.customer_name ?? "عميل غير معروف",
          userName: v.user_name ?? "غير محدد",
          checkedInAt: v.checked_in_at,
          startedAt: v.started_at,
          completedAt: v.completed_at,
          visitResult: v.visit_result,
          visitMode: v.visit_mode,
          note: v.note ?? null,
          rawFormPayload: parsedPayload,
          withinGeofence: v.within_geofence ?? null,
          customerDistanceMeters: v.customer_distance_meters ?? null,
        };
      }),
    [filteredVisits],
  );

  const paginatedFeed = useMemo(
    () => paginateItems(feedItems, feedPage, VISITS_PER_PAGE),
    [feedItems, feedPage],
  );
  const noteTranslations = useVisitNoteTranslations(paginatedFeed.items);
  const visibleFeedItems = useMemo(
    () =>
      paginatedFeed.items.map((visit) => ({
        ...visit,
        translatedNote: noteTranslations.get(visit.id) ?? null,
      })),
    [noteTranslations, paginatedFeed.items],
  );

  useEffect(() => {
    if (feedPage !== paginatedFeed.page) {
      setFeedPage(paginatedFeed.page);
    }
  }, [feedPage, paginatedFeed.page]);

  function handleSelectAgent(userId: string | null) {
    setSelectedAgentId(userId);
    setFeedPage(1);
  }

  return (
    <>
      <PageMeta title="الزيارات | إدارة المبيعات" description="مركز متابعة عمليات المبيعات الميدانية." />

      <AdminPageFrame>
        <div className="space-y-6 p-4 sm:p-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الزيارات</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                مركز عمليات فريق المبيعات الميداني
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsVisitModalOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" />
              تسجيل زيارة
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Level 1: KPI Cards */}
          <KpiCards visits={visits} isLoading={isLoading} />

          {/* Level 2: Sales Team Performance */}
          <AgentPerformanceRow
            selectedAgentId={selectedAgentId}
            onSelectAgent={handleSelectAgent}
            startIso={getDateRangeBounds(dateRange).startIso}
            endIso={getDateRangeBounds(dateRange).endIso}
          />

          {/* Filters */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((filter) => {
                  const active = quickFilter === filter.key;
                  const count =
                    filter.key === "all"
                      ? visits.length
                      : filteredVisits.length;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => startTransition(() => {
                        setQuickFilter(filter.key);
                        setFeedPage(1);
                      })}
                      className={`rounded-xl px-3.5 py-1.5 text-sm font-medium transition ${
                        active
                          ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                          : "text-gray-500 hover:bg-brand-25 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                >
                  <FunnelIcon className="h-4 w-4" />
                  مرشحات
                </button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <select
                  value={salesRepFilter}
                  onChange={(event) => startTransition(() => {
                    setSalesRepFilter(event.target.value);
                    setFeedPage(1);
                  })}
                  className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 sm:w-auto sm:min-w-[160px]"
                  aria-label="ممثل المبيعات"
                >
                  <option value="all">كل المندوبين</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
                <div className="w-full min-w-0 sm:flex-1 lg:max-w-xs">
                  <DateRangePicker
                    id="visits-date-range"
                    label=""
                    placeholder="اختر نطاق التاريخ"
                    value={dateRange}
                    onChange={(value) => {
                      startTransition(() => {
                        setDateRange(value);
                        setFeedPage(1);
                      });
                    }}
                  />
                </div>
                {dateRange[0] ?? dateRange[1] ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange([null, null]);
                      setFeedPage(1);
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                  >
                    مسح
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Selected Agent Indicator */}
          {selectedAgentId && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <span>عرض زيارات:</span>
              <span className="font-semibold">
                {profiles.find((p) => p.id === selectedAgentId)?.full_name || selectedAgentId.slice(0, 8)}
              </span>
              <button
                type="button"
                onClick={() => handleSelectAgent(null)}
                className="mr-2 text-blue-500 hover:text-blue-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Level 3: Visit Feed */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                سجل الزيارات
                <span className="mr-2 text-sm font-normal text-gray-400">
                  ({filteredVisits.length})
                </span>
              </h2>
            </div>
            <VisitFeed
              visits={visibleFeedItems}
              isLoading={isLoading}
              footer={
                <VisitFeedPagination
                  page={paginatedFeed.page}
                  totalPages={paginatedFeed.totalPages}
                  totalItems={paginatedFeed.totalItems}
                  start={paginatedFeed.start}
                  end={paginatedFeed.end}
                  onPageChange={setFeedPage}
                />
              }
            />
          </div>
        </div>
      </AdminPageFrame>

      <VisitActivityModal
        isOpen={isVisitModalOpen}
        customer={null}
        actorUserId={authUser?.id ?? null}
        onClose={() => setIsVisitModalOpen(false)}
        onSaved={loadVisits}
      />
    </>
  );
}
