// Page Type: B - Detail
// Purpose: Display ticket detail with threaded comments (Freshdesk-style)
// Primary user action: Add comments, change status, assign ticket

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  PhoneIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import {
  fetchTicketById,
  fetchTicketComments,
  fetchTicketItems,
  addTicketComment,
  updateTicketStatus,
  assignTicket,
  fetchAssignableUsers,
  resolveStatusTone,
  resolvePriorityTone,
  formatOptionLabel,
  TICKET_STATUS_OPTIONS,
  TICKET_CATEGORY_OPTIONS,
  type TicketStatus,
  type TicketPriority,
  type TicketItem,
} from "../../lib/customer-service";
import { supabase } from "../../lib/supabase";

interface TicketDetailRecord {
  id: string;
  order_id: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: string;
  category: string | null;
  scope: string | null;
  assigned_to: string | null;
  assigned_departments: string[] | null;
  assigned_user_ids: string[] | null;
  created_by: string;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  order: {
    id: string;
    odoo_order_name: string | null;
    external_order_id: string | null;
    customer_name: string | null;
    customer_id: string | null;
    total_amount: number | null;
    delivery_status: string | null;
    commitment_date: string | null;
  } | null;
  creator: {
    full_name: string;
    email: string;
  } | null;
  assignee: {
    full_name: string;
    email: string;
  } | null;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "--";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatAmount(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCommitment(value: string | null | undefined) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(parsed);
}

function deliveryTone(status: string | null) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "full") return { label: "مكتمل", tone: "green" as const };
  if (normalized === "partial") return { label: "قيد التنفيذ", tone: "blue" as const };
  if (normalized === "cancelled") return { label: "فاشل", tone: "red" as const };
  return { label: "معلق", tone: "yellow" as const };
}

// ─── Comment Bubble ──────────────────────────────────────────────────────────

interface CommentItem {
  id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

function CommentBubble({
  comment,
  isOwnComment,
}: {
  comment: CommentItem;
  isOwnComment: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isOwnComment ? "flex-row-reverse" : ""}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        {comment.author?.avatar_url ? (
          <img
            src={comment.author.avatar_url}
            alt={comment.author?.full_name || ""}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <UserCircleIcon className="h-6 w-6 text-gray-400" aria-hidden />
        )}
      </div>
      <div className={`max-w-[75%] min-w-0 ${isOwnComment ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`flex items-center gap-2 ${isOwnComment ? "flex-row-reverse" : ""}`}>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {comment.author?.full_name || "مستخدم"}
          </span>
          {comment.is_internal ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              داخلي
            </span>
          ) : null}
          <span className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</span>
        </div>
        <div
          className={`mt-2 rounded-2xl px-4 py-3 text-sm leading-6 ${
            isOwnComment
              ? "bg-blue-600 text-white rounded-tr-sm"
              : comment.is_internal
                ? "bg-amber-50 text-gray-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/30 rounded-tl-sm"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-tl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap break-words" dir="auto">
            {comment.body}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { profile } = useAuth();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<TicketDetailRecord | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([]);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [orderActivity, setOrderActivity] = useState<Array<{
    id: string;
    type: "visit";
    date: string;
    outcome: string | null;
    notes: string | null;
    rep_name: string | null;
  }>>([]);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      setIsLoading(true);
      setError(null);
      const [ticketData, commentsData, itemsData] = await Promise.all([
        fetchTicketById(ticketId),
        fetchTicketComments(ticketId),
        fetchTicketItems(ticketId).catch(() => []),
      ]);
      setTicket(ticketData as unknown as TicketDetailRecord);
      setComments(commentsData as unknown as CommentItem[]);
      setTicketItems(itemsData as TicketItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "فشل في تحميل التذكرة.");
      setTicket(null);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchAssignableUsers();
      setUsers(data as { id: string; full_name: string }[]);
    } catch {
      // non-critical
    }
  }, []);

  const loadOrderActivity = useCallback(async () => {
    if (!ticket?.order_id || !ticket?.order?.customer_id) return;
    try {
      const { data: visits, error } = await supabase
        .from("visits")
        .select("id, checked_in_at, visit_result, note, user_id")
        .eq("customer_id", ticket.order.customer_id)
        .order("checked_in_at", { ascending: false })
        .limit(10);

      if (error || !visits) return;

      const repIds = [...new Set((visits as Array<{ user_id: string | null }>).map((v) => v.user_id).filter(Boolean))] as string[];
      let repMap = new Map<string, string>();
      if (repIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", repIds);
        if (profiles) {
          repMap = new Map((profiles as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name ?? ""]));
        }
      }

      setOrderActivity(
        (visits as Array<{ id: string; checked_in_at: string | null; visit_result: string | null; note: string | null; user_id: string | null }>).map((v) => ({
          id: v.id,
          type: "visit" as const,
          date: v.checked_in_at ?? "",
          outcome: v.visit_result,
          notes: v.note,
          rep_name: v.user_id ? (repMap.get(v.user_id) ?? null) : null,
        }))
      );
    } catch {
      // non-critical
    }
  }, [ticket?.order_id, ticket?.order?.customer_id]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (!ticketId) return;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        void loadTicket();
      }, 300);
    };

    const channel = supabase
      .channel(`ticket-detail-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_tickets", filter: `id=eq.${ticketId}` },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      void supabase.removeChannel(channel);
    };
  }, [ticketId, loadTicket]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadOrderActivity();
  }, [loadOrderActivity]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleAddComment = async () => {
    if (!ticketId || !profile || !newComment.trim()) return;

    try {
      setIsSubmitting(true);
      await addTicketComment({
        ticketId,
        authorId: profile.id,
        body: newComment.trim(),
        isInternal,
      });
      setNewComment("");
      setIsInternal(false);
      await loadTicket();
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "فشل إضافة التعليق.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticketId) return;
    try {
      await updateTicketStatus(ticketId, newStatus);
      setIsStatusMenuOpen(false);
      await loadTicket();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "فشل تحديث الحالة.");
    }
  };

  const handleAssign = async (userId: string) => {
    if (!ticketId) return;
    try {
      await assignTicket(ticketId, userId || null);
      await loadTicket();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "فشل التعيين.");
    }
  };

  if (isLoading) {
    return (
      <>
        <PageMeta title="تفاصيل التذكرة" description="جاري تحميل التذكرة" />
        <AdminPageFrame>
          <div className="space-y-5">
            <div className="h-32 animate-pulse rounded-[22px] bg-gray-100 dark:bg-gray-800" />
            <div className="h-[500px] animate-pulse rounded-[22px] bg-gray-100 dark:bg-gray-800" />
          </div>
        </AdminPageFrame>
      </>
    );
  }

  if (error && !ticket) {
    return (
      <>
        <PageMeta title="تفاصيل التذكرة" description="لم يتم العثور على التذكرة" />
        <AdminPageFrame>
          <EmptyState
            title={error || "لم يتم العثور على التذكرة"}
            description="تعذر تحميل التذكرة المطلوبة."
            action={
              <Link
                to="/tickets"
                className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                العودة للتذاكر
              </Link>
            }
          />
        </AdminPageFrame>
      </>
    );
  }

  if (!ticket) return null;

  const statusBadge = resolveStatusTone(ticket.status);
  const priorityBadge = resolvePriorityTone(ticket.priority as TicketPriority);
  const orderNumber =
    ticket.order?.odoo_order_name || ticket.order?.external_order_id || ticket.id.slice(0, 8);
  const orderDelivery = deliveryTone(ticket.order?.delivery_status ?? null);

  return (
    <>
      <PageMeta
        title={`${ticket.subject} | تذكرة`}
        description="تفاصيل تذكرة خدمة العملاء والتعليقات."
      />

      <AdminPageFrame>
        {/* Header Card */}
        <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-5 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-3">
                <Link
                  to="/tickets"
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  <ChevronRightIcon className="h-4 w-4" aria-hidden />
                  العودة للتذاكر
                </Link>

                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white" dir="auto">
                    {ticket.subject}
                  </h1>
                  <StatusBadge label={statusBadge.label} tone={statusBadge.tone} />
                  <StatusBadge label={priorityBadge.label} tone={priorityBadge.tone} />
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    رقم التذكرة:{" "}
                    <strong className="font-semibold text-gray-800 dark:text-gray-100" dir="ltr">
                      #{ticket.id.slice(0, 8).toUpperCase()}
                    </strong>
                  </span>
                  <span>
                    الطلب:{" "}
                    <Link
                      to={`/orders/${ticket.order_id}`}
                      className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      dir="ltr"
                    >
                      #{orderNumber}
                    </Link>
                  </span>
                  {ticket.category ? (
                    <span>
                      الفئة:{" "}
                      <strong className="font-semibold text-gray-800 dark:text-gray-100">
                        {formatOptionLabel(TICKET_CATEGORY_OPTIONS, ticket.category)}
                      </strong>
                    </span>
                  ) : null}
                  <span>
                    أنشأها:{" "}
                    <strong className="font-semibold text-gray-800 dark:text-gray-100">
                      {ticket.creator?.full_name || "--"}
                    </strong>
                  </span>
                  <span>
                    في: <strong className="font-semibold text-gray-800 dark:text-gray-100">{formatDateTime(ticket.created_at)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {ticket.description ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">الوصف</p>
                <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300 whitespace-pre-wrap" dir="auto">
                  {ticket.description}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* Ticket Items (product-level) */}
        {ticket.scope === "products" && ticketItems.length > 0 && (
          <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                المنتجات المتأثرة ({ticketItems.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {ticketItems.map((item) => {
                const itemPriority = resolvePriorityTone(item.priority);
                const itemCategory = formatOptionLabel(TICKET_CATEGORY_OPTIONS, item.category);
                return (
                  <div key={item.id} className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.product_name}</h3>
                          {item.product_code && (
                            <span className="text-xs text-gray-400">({item.product_code})</span>
                          )}
                          <StatusBadge label={itemPriority.label} tone={itemPriority.tone} />
                          {itemCategory && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {itemCategory}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap" dir="auto">
                            {item.description}
                          </p>
                        )}
                        {item.assigned_departments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.assigned_departments.map((d) => (
                              <span key={d} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <StatusBadge label={resolveStatusTone(item.status).label} tone={resolveStatusTone(item.status).tone} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Comment Thread */}
          <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" aria-hidden />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    التعليقات ({comments.length})
                  </h2>
                </div>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto px-5 py-5">
              {comments.length === 0 ? (
                <div className="py-12 text-center">
                  <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    لا توجد تعليقات بعد. كن أول من يعلق على هذه التذكرة.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {comments.map((comment) => (
                    <CommentBubble
                      key={comment.id}
                      comment={comment}
                      isOwnComment={comment.author_id === profile?.id}
                    />
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="اكتب تعليقاً..."
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        void handleAddComment();
                      }
                    }}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(event) => setIsInternal(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      تعليق داخلي (لا يظهر للعميل)
                    </label>
                    <span className="text-xs text-gray-400">Ctrl+Enter للإرسال</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddComment()}
                  disabled={isSubmitting || !newComment.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "جار الإرسال..." : "إرسال"}
                </button>
              </div>
            </div>
          </section>

          {/* Sidebar - Ticket Info */}
          <div className="space-y-5">
            {/* Status & Priority */}
            <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">الإعدادات</h3>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-2">الحالة</p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-right text-sm font-medium text-gray-700 transition hover:border-blue-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                    >
                      <StatusBadge label={statusBadge.label} tone={statusBadge.tone} />
                    </button>
                    {isStatusMenuOpen ? (
                      <div className="absolute right-0 top-full z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                        {TICKET_STATUS_OPTIONS.map((opt) => {
                          const badge = resolveStatusTone(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => void handleStatusChange(opt.value)}
                              className={`flex w-full items-center px-4 py-2.5 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                ticket.status === opt.value ? "bg-blue-50 dark:bg-blue-500/10" : ""
                              }`}
                            >
                              <StatusBadge label={badge.label} tone={badge.tone} />
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-2">تعيين إلى</p>
                  <select
                    value={ticket.assigned_to || ""}
                    onChange={(event) => void handleAssign(event.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">غير معيّن</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Created */}
                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">أنشأها</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {ticket.creator?.full_name || "--"}
                  </span>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">أنشئ في</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDateTime(ticket.created_at)}
                  </span>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">آخر تحديث</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDateTime(ticket.updated_at)}
                  </span>
                </div>

                {ticket.resolved_at ? (
                  <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">تم الحل في</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(ticket.resolved_at)}
                    </span>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Order Info */}
            <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">الطلب المرتبط</h3>
                <Link
                  to={`/orders/${ticket.order_id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  عرض الطلب
                </Link>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">رقم الطلب</span>
                  <span className="font-medium text-gray-900 dark:text-white" dir="ltr">
                    #{orderNumber}
                  </span>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">العميل</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {ticket.order?.customer_name || "--"}
                  </span>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">المبلغ</span>
                  <span className="font-medium text-gray-900 dark:text-white" dir="ltr">
                    {formatAmount(ticket.order?.total_amount)}
                  </span>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">التسليم</span>
                  <StatusBadge label={orderDelivery.label} tone={orderDelivery.tone} />
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">الاستحقاق</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCommitment(ticket.order?.commitment_date)}
                  </span>
                </div>
              </div>
            </section>

            {/* Order Activity */}
            <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">نشاط الطلب</h3>
              {orderActivity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">لا يوجد نشاط مسجل لهذا الطلب.</p>
              ) : (
                <div className="space-y-3">
                  {orderActivity.map((activity) => (
                    <div key={activity.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-gray-400" aria-hidden />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">زيارة</span>
                        <span className="text-xs text-gray-400">{activity.date ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.date)) : "--"}</span>
                      </div>
                      {activity.outcome ? (
                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">{activity.outcome}</p>
                      ) : null}
                      {activity.notes ? (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2" dir="auto">{activity.notes}</p>
                      ) : null}
                      {activity.rep_name ? (
                        <p className="mt-1 text-xs text-gray-400">{activity.rep_name}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </AdminPageFrame>
    </>
  );
}
