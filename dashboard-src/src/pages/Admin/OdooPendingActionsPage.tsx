// Page Type: A - List
// Purpose: Browse, filter, and manage all Odoo pending integration actions
// Primary user action: Review, approve, reject, or retry pending actions
// Data source: odoo_pending_actions table

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PlayIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import ListPageLayout from "../../components/layout/ListPageLayout";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { ConfirmApproveModal } from "../../components/admin/odoo-pending";
import {
  fetchPendingActions,
  approvePendingAction,
  bulkApprovePendingActions,
  retryPendingAction,
  deletePendingAction,
  executePendingAction,
  bulkExecutePendingActions,
  fetchActionCounts,
} from "../../lib/odoo-pending-actions";
import { supabase } from "../../lib/supabase";
import type {
  OdooPendingActionWithMeta,
  OdooActionStatus,
  OdooEntityType,
} from "../../types/odoo-pending-actions";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: OdooActionStatus | "all"; label: string }> = [
  { value: "all", label: "جميع الحالات" },
  { value: "waiting_approval", label: "في انتظار الموافقة" },
  { value: "approved", label: "تمت الموافقة" },
  { value: "sending", label: "جارٍ الإرسال" },
  { value: "completed", label: "مكتمل" },
  { value: "failed", label: "فشل" },
  { value: "rejected", label: "مرفوض" },
];

const ENTITY_OPTIONS: Array<{ value: OdooEntityType | "all"; label: string }> = [
  { value: "all", label: "جميع الأنواع" },
  { value: "quotation", label: "عرض أسعار" },
  { value: "customer", label: "عميل" },
  { value: "product", label: "منتج" },
  { value: "crm_lead", label: "فرصة CRM" },
  { value: "generic", label: "عام" },
];

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "مسودة",
    waiting_approval: "في انتظار الموافقة",
    approved: "تمت الموافقة",
    sending: "جارٍ الإرسال",
    completed: "مكتمل",
    failed: "فشل",
    rejected: "مرفوض",
  };
  return map[status] ?? status;
}

function statusTone(status: string): "green" | "yellow" | "red" | "blue" | "gray" | "orange" | "purple" {
  const map: Record<string, "green" | "yellow" | "red" | "blue" | "gray" | "orange" | "purple"> = {
    draft: "gray",
    waiting_approval: "yellow",
    approved: "blue",
    sending: "purple",
    completed: "green",
    failed: "red",
    rejected: "orange",
  };
  return map[status] ?? "gray";
}

function entityTypeLabel(type: string) {
  const map: Record<string, string> = {
    quotation: "عرض أسعار",
    customer: "عميل",
    product: "منتج",
    crm_lead: "فرصة CRM",
    generic: "عام",
  };
  return map[type] ?? type;
}

function actionTypeLabel(type: string) {
  const map: Record<string, string> = {
    create: "إنشاء",
    update: "تحديث",
    archive: "أرشفة",
    convert: "تحويل",
    delete: "حذف",
  };
  return map[type] ?? type;
}

function formatDate(value: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function OdooPendingActionsPage() {
  const navigate = useNavigate();
  const [actions, setActions] = useState<OdooPendingActionWithMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OdooActionStatus | "all">("all");
  const [entityFilter, setEntityFilter] = useState<OdooEntityType | "all">("all");
  const [page, setPage] = useState(1);
  const didMountRef = useRef(false);

  // Counts for KPIs
  const [counts, setCounts] = useState<Partial<Record<OdooActionStatus, number>>>({});

  // Confirm modal state
  const [confirmAction, setConfirmAction] = useState<OdooPendingActionWithMeta | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // ---- Data loading ----

  const loadActions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const offset = (page - 1) * PAGE_SIZE;
      const result = await fetchPendingActions({
        status: statusFilter,
        entityType: entityFilter,
        search,
        limit: PAGE_SIZE,
        offset,
      });
      setActions(result.data);
      setTotal(result.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load pending actions.");
      setActions([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, entityFilter, search]);

  const loadCounts = useCallback(async () => {
    try {
      const c = await fetchActionCounts();
      setCounts(c);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  // Reset page on filter change
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setPage(1);
  }, [statusFilter, entityFilter, search]);

  // Realtime refresh
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        void loadActions();
        void loadCounts();
      }, 300);
    };

    const channel = supabase
      .channel("odoo-pending-actions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "odoo_pending_actions" }, refresh)
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      void supabase.removeChannel(channel);
    };
  }, [loadActions, loadCounts]);

  // ---- Pagination ----

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(safePage * PAGE_SIZE, total);

  // ---- KPIs ----

  const pendingCount = (counts.waiting_approval ?? 0);
  const approvedCount = (counts.approved ?? 0);
  const completedCount = (counts.completed ?? 0);
  const failedCount = (counts.failed ?? 0);

  // ---- Actions ----

  const handleReview = (action: OdooPendingActionWithMeta) => {
    navigate(`/admin/odoo-pending/${action.id}`);
  };

  const handleConfirmApprove = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      await approvePendingAction(confirmAction.id);
      setNotice("تمت الموافقة على الإجراء بنجاح.");
      setConfirmOpen(false);
      setConfirmAction(null);
      void loadActions();
      void loadCounts();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Failed to approve action.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (actionId: string) => {
    if (!window.confirm("هل تريد حذف هذا الإجراء؟")) return;
    try {
      await deletePendingAction(actionId);
      setNotice("تم حذف الإجراء.");
      void loadActions();
      void loadCounts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete action.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      // Select all approvable (waiting_approval) OR executable (approved) items
      const selectable = actions
        .filter((a) => a.status === "waiting_approval" || a.status === "approved")
        .map((a) => a.id);
      if (selectable.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(selectable);
    });
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`هل تريد الموافقة على ${ids.length} إجراء؟`)) return;

    setIsBulkApproving(true);
    try {
      const result = await bulkApprovePendingActions(ids);
      if (result.failed.length > 0) {
        setNotice(`تمت الموافقة على ${result.approved} إجراء. فشل ${result.failed.length} إجراء.`);
      } else {
        setNotice(`تمت الموافقة على ${result.approved} إجراء بنجاح.`);
      }
      setSelectedIds(new Set());
      void loadActions();
      void loadCounts();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Bulk approve failed.");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleBulkExecute = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`هل تريد تنفيذ ${ids.length} إجراء؟`)) return;

    setIsBulkApproving(true);
    try {
      const result = await bulkExecutePendingActions(ids);
      if (result.failed.length > 0) {
        setNotice(`تم تنفيذ ${result.executed} إجراء. فشل ${result.failed.length} إجراء.`);
      } else {
        setNotice(`تم تنفيذ ${result.executed} إجراء بنجاح.`);
      }
      setSelectedIds(new Set());
      void loadActions();
      void loadCounts();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Bulk execute failed.");
    } finally {
      setIsBulkApproving(false);
    }
  };

  // ---- Render ----

  return (
    <>
      <PageMeta title="إجراءات Odoo المعلقة | إدارة المبيعات" description="إدارة ومراجعة إجراءات Odoo المعلقة." />

      <AdminPageFrame>
        <ListPageLayout
          header={
            <PageHeader
              variant="list"
              eyebrow="ODOO INTEGRATION"
              title="إجراءات Odoo المعلقة"
              subtitle="مراجعة وموافقة على إجراءات Odoo المعلقة قبل التنفيذ."
            />
          }
          notices={
            <>
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                  <button type="button" onClick={() => setError("")} className="mr-2 font-bold">
                    ✕
                  </button>
                </div>
              )}
              {notice && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                  <button type="button" onClick={() => setNotice("")} className="mr-2 font-bold">
                    ✕
                  </button>
                </div>
              )}
            </>
          }
          stats={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "في انتظار الموافقة",
                  value: pendingCount,
                  icon: <ClockIcon className="h-5 w-5" />,
                  tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "تمت الموافقة",
                  value: approvedCount,
                  icon: <CheckCircleIcon className="h-5 w-5" />,
                  tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "مكتمل اليوم",
                  value: completedCount,
                  icon: <DocumentTextIcon className="h-5 w-5" />,
                  tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
                },
                {
                  label: "فشل",
                  value: failedCount,
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
          }
        >
          {/* Filters */}
          <section className="rounded-[22px] border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OdooActionStatus | "all")}
                  className="h-10 appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value as OdooEntityType | "all")}
                  className="h-10 appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {ENTITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <>
                    <button
                      type="button"
                      disabled={isBulkApproving}
                      onClick={() => void handleBulkApprove()}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isBulkApproving ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                      موافقة على {selectedIds.size}
                    </button>
                    <button
                      type="button"
                      disabled={isBulkApproving}
                      onClick={() => void handleBulkExecute()}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      <PlayIcon className="h-4 w-4" />
                      تنفيذ {selectedIds.size}
                    </button>
                  </>
                )}
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث..."
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white sm:w-64"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Table */}
          <div className="overflow-hidden rounded-[22px] border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
                ))}
              </div>
            ) : actions.length === 0 ? (
              <div className="px-5 py-16">
                <EmptyState
                  icon={<DocumentTextIcon className="h-10 w-10 text-gray-300" />}
                  title="لا توجد إجراءات معلقة"
                  description="جرب تعديل الفلتر أو مصطلح البحث."
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm" dir="rtl">
                    <thead className="border-b border-gray-200 bg-brand-25/80 dark:border-gray-800 dark:bg-white/[0.02]">
                      <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                        <th className="w-10 px-2 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={
                              actions
                                .filter((a) => a.status === "waiting_approval" || a.status === "approved")
                                .every((a) => selectedIds.has(a.id)) &&
                              actions.filter((a) => a.status === "waiting_approval" || a.status === "approved").length > 0
                            }
                            onChange={toggleSelectAll}
                            className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/50"
                          />
                        </th>
                        <th className="px-4 py-4 text-right">الإجراء</th>
                        <th className="px-4 py-4 text-right">النوع</th>
                        <th className="px-4 py-4 text-right">Model</th>
                        <th className="px-4 py-4 text-right">أنشأه</th>
                        <th className="px-4 py-4 text-right">الحالة</th>
                        <th className="px-4 py-4 text-right">التاريخ</th>
                        <th className="w-32 px-4 py-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {actions.map((action) => (
                        <tr
                          key={action.id}
                          className={`bg-white transition hover:bg-brand-25/50 dark:bg-transparent dark:hover:bg-white/[0.02] ${
                            selectedIds.has(action.id) ? "bg-blue-50/50 dark:bg-blue-500/5" : ""
                          }`}
                        >
                          <td className="w-10 px-2 py-4 text-center">
                            {(action.status === "waiting_approval" || action.status === "approved") && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(action.id)}
                                onChange={() => toggleSelect(action.id)}
                                className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/50"
                              />
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {actionTypeLabel(action.action_type)}
                              </span>
                              <span className="mt-0.5 text-xs text-gray-400" dir="ltr">
                                {action.odoo_method}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-lg border border-gray-200 bg-brand-25 px-2 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300">
                              {entityTypeLabel(action.entity_type)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <code className="rounded bg-brand-25 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                              {action.odoo_model}
                            </code>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {action.creator_name || "--"}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge label={statusLabel(action.status)} tone={statusTone(action.status)} />
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-500" dir="ltr">
                            {formatDate(action.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleReview(action)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-brand-25 hover:text-gray-700 dark:hover:border-gray-700 dark:hover:bg-white/[0.02] dark:hover:text-gray-300"
                                title="مراجعة"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              {action.status === "waiting_approval" && (
                                <button
                                  type="button"
                                  disabled={isBulkApproving}
                                  onClick={async () => {
                                    if (!window.confirm(`هل تريد موافقة وتنفيذ هذا الإجراء؟`)) return;
                                    try {
                                      setNotice("جاري الموافقة والتنفيذ...");
                                      await approvePendingAction(action.id);
                                      const execResult = await executePendingAction(action.id);
                                      if (execResult.success) {
                                        setNotice(`تم الموافقة والتنفيذ بنجاح. Odoo ID: ${execResult.odoo_record_id ?? "--"}`);
                                      } else {
                                        setNotice("تمت الموافقة但 التنفيذ فشل.");
                                      }
                                      void loadActions();
                                      void loadCounts();
                                    } catch (e) {
                                      setError(e instanceof Error ? e.message : "Approve & Execute failed.");
                                    }
                                  }}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-transparent px-2 text-xs font-medium text-emerald-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                                  title="موافقة وتنفيذ"
                                >
                                  <CheckCircleIcon className="h-3.5 w-3.5" />
                                  تنفيذ
                                </button>
                              )}
                              {action.status === "failed" && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await retryPendingAction(action.id);
                                      setNotice("تم إعادة الإجراء للموافقة.");
                                      void loadActions();
                                      void loadCounts();
                                    } catch (e) {
                                      setError(e instanceof Error ? e.message : "Failed to retry.");
                                    }
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-blue-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                  title="إعادة المحاولة"
                                >
                                  <ArrowPathIcon className="h-4 w-4" />
                                </button>
                              )}
                              {action.status === "draft" && (
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(action.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-gray-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                  title="حذف"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">
                    Showing {rangeStart.toLocaleString("en-US")}–{rangeEnd.toLocaleString("en-US")} of{" "}
                    {total.toLocaleString("ar-EG")}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
                    >
                      السابق
                    </button>
                    <span className="px-2 text-sm text-gray-600 dark:text-gray-400" dir="ltr">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ListPageLayout>
      </AdminPageFrame>

      {/* Confirm Approve Modal */}
      <ConfirmApproveModal
        isOpen={confirmOpen}
        action={confirmAction}
        onConfirm={handleConfirmApprove}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
        isProcessing={isProcessing}
      />
    </>
  );
}
