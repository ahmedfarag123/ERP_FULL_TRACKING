// Page Type: A - List
// Purpose: Browse and manage customer service tickets linked to orders
// Primary user action: Find a ticket, create new ticket, or navigate to detail

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import CreateTicketModal from "../../components/customer-service/CreateTicketModal";
import ConnectionStatusBar from "../../components/common/ConnectionStatusBar";
import { useAuth } from "../../context/AuthContext";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import { useUrlIntParam, useUrlStringParam } from "../../hooks/useUrlState";
import {
  fetchTickets,
  fetchTicketStats,
  resolveStatusTone,
  resolvePriorityTone,
  formatOptionLabel,
  TICKET_STATUS_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_CATEGORY_OPTIONS,
  type TicketStatus,
  type TicketPriority,
  type TicketWithDetails,
} from "../../lib/customer-service";
import { supabase } from "../../lib/supabase";
import { getCached, setCache } from "../../lib/offlineCache";

type StatusFilter = TicketStatus | "all";
type PriorityFilter = TicketPriority | "all";
const PAGE_SIZE = 20;

function relativeTime(iso: string | null) {
  if (!iso) return "--";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "--";
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 45) return "الآن";
  if (sec < 3600) return `منذ ${Math.floor(sec / 60)}د`;
  if (sec < 86400) return `منذ ${Math.floor(sec / 3600)}س`;
  return `منذ ${Math.floor(sec / 86400)}ي`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerServicePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { status: connectionStatus, isOffline, pendingCount } = useConnectionStatus();

  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useUrlStringParam<StatusFilter>("status", "all");
  const [priorityFilter, setPriorityFilter] = useUrlStringParam<PriorityFilter>("priority", "all");
  const [searchTerm, setSearchTerm] = useUrlStringParam("q");
  const [currentPage, setCurrentPage] = useUrlIntParam("page", 1);
  const didMountFiltersRef = useRef(false);

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    urgent: 0,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const cacheKey = `tickets-${statusFilter}-${priorityFilter}-${searchTerm}-${currentPage}`;

      // If offline, try to serve from cache first
      if (isOffline) {
        const cached = await getCached<{ tickets: TicketWithDetails[]; total: number }>(cacheKey);
        if (cached) {
          setTickets(cached.tickets);
          setTotal(cached.total);
          setIsLoading(false);
          return;
        }
      }

      const offset = (currentPage - 1) * PAGE_SIZE;
      const { tickets: data, total: count } = await fetchTickets({
        status: statusFilter,
        priority: priorityFilter,
        search: searchTerm,
        limit: PAGE_SIZE,
        offset,
      });
      setTickets(data);
      setTotal(count);

      // Cache the result for offline use
      await setCache(cacheKey, { tickets: data, total: count }, 30 * 60 * 1000); // 30min TTL
    } catch (loadError) {
      // On network error, try cache
      const cacheKey = `tickets-${statusFilter}-${priorityFilter}-${searchTerm}-${currentPage}`;
      const cached = await getCached<{ tickets: TicketWithDetails[]; total: number }>(cacheKey);
      if (cached) {
        setTickets(cached.tickets);
        setTotal(cached.total);
        setError(null);
      } else {
        setError(loadError instanceof Error ? loadError.message : "فشل في تحميل التذاكر.");
        setTickets([]);
        setTotal(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, searchTerm, currentPage, isOffline]);

  const loadStats = useCallback(async () => {
    try {
      // If offline, try cache first
      if (isOffline) {
        const cached = await getCached<typeof stats>("ticket-stats");
        if (cached) {
          setStats(cached);
          return;
        }
      }

      const s = await fetchTicketStats();
      setStats(s);
      await setCache("ticket-stats", s, 30 * 60 * 1000);
    } catch {
      // Try cache on error
      const cached = await getCached<typeof stats>("ticket-stats");
      if (cached) setStats(cached);
    }
  }, [isOffline]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        void loadTickets();
        void loadStats();
      }, 300);
    };

    const channel = supabase
      .channel("customer-service-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_tickets" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      void supabase.removeChannel(channel);
    };
  }, [loadTickets, loadStats]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;

  useEffect(() => {
    if (!didMountFiltersRef.current) {
      didMountFiltersRef.current = true;
      return;
    }

    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, priorityFilter, searchTerm, setCurrentPage, statusFilter]);

  const handleCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    void loadTickets();
    void loadStats();
  }, [loadTickets, loadStats]);

  return (
    <>
      <PageMeta title="خدمة العملاء | إدارة المبيعات" description="تذاكر الدعم والتعليقات على الطلبات." />

      <AdminPageFrame>
        <ConnectionStatusBar status={connectionStatus} pendingCount={pendingCount} />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "إجمالي التذاكر",
              value: stats.total.toLocaleString("ar-EG"),
              icon: <TicketIcon className="h-5 w-5" />,
              tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
            },
            {
              label: "مفتوحة",
              value: stats.open.toLocaleString("ar-EG"),
              icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
              tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
            },
            {
              label: "قيد المعالجة",
              value: stats.inProgress.toLocaleString("ar-EG"),
              icon: <FunnelIcon className="h-5 w-5" />,
              tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
            },
            {
              label: "عاجلة",
              value: stats.urgent.toLocaleString("ar-EG"),
              icon: <ExclamationTriangleIcon className="h-5 w-5" />,
              tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
            },
          ].map((metric) => (
            <article
              key={metric.label}
              className="rounded-[22px] border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone}`}>
                  {metric.icon}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Main List Section */}
        <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">تذاكر خدمة العملاء</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  أنشئ تذاكر وتتبعها للطلبات ذات الصلة
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
                <label className="relative w-full min-w-0 lg:w-[280px]">
                  <span className="sr-only">بحث في التذاكر</span>
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="بحث بالموضوع أو رقم الطلب أو اسم العميل..."
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>

                <label className="relative w-full min-w-0 lg:w-auto lg:min-w-[150px]">
                  <span className="sr-only">تصفية الحالة</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="h-11 w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="all">جميع الحالات</option>
                    {TICKET_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ▼
                  </span>
                </label>

                <label className="relative w-full min-w-0 lg:w-auto lg:min-w-[140px]">
                  <span className="sr-only">تصفية الأولوية</span>
                  <select
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
                    className="h-11 w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="all">جميع الأولويات</option>
                    {TICKET_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ▼
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4" aria-hidden />
                  تذكرة جديدة
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-5 py-16">
              <EmptyState
                icon={<TicketIcon className="h-10 w-10 text-gray-300" />}
                title="لا توجد تذاكر"
                description="لم يتم العثور على تذاكر تطابق البحث. جرب تعديل الفلاتر أو أنشئ تذكرة جديدة."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm" dir="rtl">
                  <thead className="border-b border-gray-200 bg-brand-25/80 dark:border-gray-800 dark:bg-white/[0.02]">
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                      <th className="px-4 py-4 text-right">رقم التذكرة</th>
                      <th className="px-4 py-4 text-right">الموضوع</th>
                      <th className="px-4 py-4 text-right">رقم الطلب</th>
                      <th className="px-4 py-4 text-right">العميل</th>
                      <th className="px-4 py-4 text-right">الحالة</th>
                      <th className="px-4 py-4 text-right">الأولوية</th>
                      <th className="px-4 py-4 text-right">التعليقات</th>
                      <th className="px-4 py-4 text-right">أنشأها</th>
                      <th className="px-4 py-4 text-right">أنشئ في</th>
                      <th className="px-4 py-4 text-right">التاريخ</th>
                      <th className="w-16 px-4 py-4 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {tickets.map((ticket) => {
                      const statusBadge = resolveStatusTone(ticket.status);
                      const priorityBadge = resolvePriorityTone(ticket.priority);

                      return (
                        <tr
                          key={ticket.id}
                          role="link"
                          tabIndex={0}
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigate(`/tickets/${ticket.id}`);
                            }
                          }}
                          className="cursor-pointer bg-white transition hover:bg-brand-25 dark:bg-transparent dark:hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-4 text-right align-middle">
                            <p className="font-semibold text-blue-600 dark:text-blue-400" dir="ltr">
                              #{ticket.id.slice(0, 8).toUpperCase()}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            <p className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate" dir="auto">
                              {ticket.subject}
                            </p>
                            {ticket.category ? (
                              <p className="mt-1 text-xs text-gray-400">
                                {formatOptionLabel(TICKET_CATEGORY_OPTIONS, ticket.category)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            <Link
                              to={`/orders/${ticket.order_id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="font-semibold text-gray-900 hover:text-blue-600 dark:text-white"
                              dir="ltr"
                            >
                              {ticket.order_number || ticket.order_id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            <p className="text-sm text-gray-700 dark:text-gray-300" dir="auto">
                              {ticket.order_customer_name || "--"}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            <StatusBadge label={statusBadge.label} tone={statusBadge.tone} />
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            <StatusBadge label={priorityBadge.label} tone={priorityBadge.tone} />
                          </td>
                          <td className="px-4 py-4 text-center align-middle">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-25 px-2 text-xs font-semibold text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                              {ticket.comment_count}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {ticket.creator_name || "--"}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDateTime(ticket.created_at)}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right align-middle">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {(() => {
                                const rp = ticket.raw_payload as Record<string, unknown> | null;
                                const dueDate = rp?.due_date;
                                if (dueDate && typeof dueDate === "string") {
                                  const d = new Date(dueDate);
                                  if (!Number.isNaN(d.getTime())) {
                                    return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
                                  }
                                }
                                return "--";
                              })()}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center align-middle">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/tickets/${ticket.id}`);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-brand-25 hover:text-gray-700 dark:hover:border-gray-700 dark:hover:bg-white/[0.02] dark:hover:text-gray-300"
                              aria-label="فتح التذكرة"
                            >
                              <ChevronLeftIcon className="h-5 w-5" aria-hidden />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  عرض{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {total === 0 ? 0 : pageStart + 1}
                  </span>{" "}
                  إلى{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.min(pageStart + PAGE_SIZE, total)}
                  </span>{" "}
                  من{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
                </p>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safeCurrentPage === 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-gray-500 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.02]"
                  >
                    <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                    const pageNumber = index + 1;
                    const active = pageNumber === safeCurrentPage;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                          active
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-brand-25 dark:text-gray-200 dark:hover:bg-white/[0.02]"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-gray-500 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.02]"
                  >
                    <ChevronRightIcon className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </AdminPageFrame>

      {isCreateModalOpen && profile ? (
        <CreateTicketModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleCreated}
          currentUserId={profile.id}
        />
      ) : null}
    </>
  );
}
