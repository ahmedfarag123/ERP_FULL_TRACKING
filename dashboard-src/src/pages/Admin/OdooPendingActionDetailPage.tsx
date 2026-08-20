// Page Type: B - Detail
// Purpose: Full detail view of a single Odoo pending action
// Primary user action: Review, approve, reject, or retry the action
// Data source: odoo_pending_actions + audit log

import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ConfirmApproveModal } from "../../components/admin/odoo-pending";
import {
  fetchPendingAction,
  fetchActionAuditLog,
  approvePendingAction,
  rejectPendingAction,
  retryPendingAction,
  deletePendingAction,
  executePendingAction,
} from "../../lib/odoo-pending-actions";
import type {
  OdooPendingActionWithMeta,
  OdooActionAuditLogEntry,
} from "../../types/odoo-pending-actions";

function formatDate(value: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

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
    crm_activity: "نشاط CRM",
    visit_activity: "نشاط زيارة",
    invoice: "فاتورة",
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

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircleIcon className="h-5 w-5 text-emerald-500" />;
    case "failed":
      return <ExclamationTriangleIcon className="h-5 w-5 text-rose-500" />;
    case "sending":
      return <PaperAirplaneIcon className="h-5 w-5 text-purple-500" />;
    case "approved":
      return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
    case "rejected":
      return <NoSymbolIcon className="h-5 w-5 text-orange-500" />;
    case "waiting_approval":
      return <ClockIcon className="h-5 w-5 text-amber-500" />;
    default:
      return <ClockIcon className="h-5 w-5 text-gray-400" />;
  }
}

export default function OdooPendingActionDetailPage() {
  const { actionId } = useParams<{ actionId: string }>();
  const navigate = useNavigate();
  const [action, setAction] = useState<OdooPendingActionWithMeta | null>(null);
  const [auditLog, setAuditLog] = useState<OdooActionAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const loadAction = useCallback(async () => {
    if (!actionId) return;
    setIsLoading(true);
    setError("");
    try {
      const [loaded, log] = await Promise.all([
        fetchPendingAction(actionId),
        fetchActionAuditLog(actionId),
      ]);
      setAction(loaded);
      setAuditLog(log);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load action.");
    } finally {
      setIsLoading(false);
    }
  }, [actionId]);

  useEffect(() => {
    void loadAction();
  }, [loadAction]);

  const handleApprove = () => {
    setConfirmOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!actionId) return;
    setIsProcessing(true);
    try {
      await approvePendingAction(actionId);
      setNotice("تمت الموافقة. اضغط \"تنفيذ\" لإرساله إلى Odoo.");
      setConfirmOpen(false);
      void loadAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async () => {
    if (!actionId) return;
    setIsProcessing(true);
    setError("");
    setNotice("");
    try {
      const result = await executePendingAction(actionId);
      if (result.odoo_record_id) {
        setNotice(`تم التنفيذ بنجاح. Odoo Record ID: ${result.odoo_record_id}`);
      } else {
        setNotice("تم التنفيذ بنجاح.");
      }
      void loadAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to execute.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!actionId) return;
    setIsProcessing(true);
    try {
      await rejectPendingAction(actionId, rejectReason || undefined);
      setNotice("تم رفض الإجراء.");
      setShowRejectInput(false);
      setRejectReason("");
      void loadAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    if (!actionId) return;
    setIsProcessing(true);
    try {
      await retryPendingAction(actionId);
      setNotice("تم إعادة الإجراء. اضغط \"تنفيذ\" لإرساله إلى Odoo.");
      void loadAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!actionId || !window.confirm("هل تريد حذف هذا الإجراء؟")) return;
    try {
      await deletePendingAction(actionId);
      navigate("/admin/odoo-pending");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    }
  };

  if (isLoading) {
    return (
      <>
        <PageMeta title="تفاصيل الإجراء | إدارة المبيعات" description="جاري تحميل تفاصيل الإجراء..." />
        <AdminPageFrame>
          <div className="space-y-4 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
            ))}
          </div>
        </AdminPageFrame>
      </>
    );
  }

  if (!action) {
    return (
      <>
        <PageMeta title="الإجراء غير موجود | إدارة المبيعات" description="الإجراء المطلوب غير موجود." />
        <AdminPageFrame>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">الإجراء غير موجود</p>
            <button
              type="button"
              onClick={() => navigate("/admin/odoo-pending")}
              className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-900"
            >
              العودة للقائمة
            </button>
          </div>
        </AdminPageFrame>
      </>
    );
  }

  const canApprove = ["waiting_approval", "failed"].includes(action.status);
  const canExecute = action.status === "approved";
  const canReject = ["waiting_approval", "approved"].includes(action.status);
  const canRetry = action.status === "failed";
  const canDelete = action.status === "draft";

  const validationResult = action.validation_result as { valid?: boolean; errors?: string[] } | null;

  return (
    <>
      <PageMeta title={`${entityTypeLabel(action.entity_type)} — ${actionTypeLabel(action.action_type)} | إدارة المبيعات`} description={`تفاصيل إجراء ${action.odoo_model} - ${action.odoo_method}.`} />

      <AdminPageFrame>
        <PageHeader
          variant="detail"
          backHref="/admin/odoo-pending"
          backLabel="العودة للقائمة"
          title={`${entityTypeLabel(action.entity_type)} — ${actionTypeLabel(action.action_type)}`}
          subtitle={`${action.odoo_model} · ${action.odoo_method}`}
          badges={
            <>
              <StatusBadge label={statusLabel(action.status)} tone={statusTone(action.status)} />
              {action.retry_count > 0 && (
                <span className="text-xs text-gray-400">محاولة {action.retry_count}</span>
              )}
            </>
          }
          actions={
            <div className="flex gap-2">
              {canApprove && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing || (validationResult !== null && !validationResult.valid)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  موافقة
                </button>
              )}
              {canExecute && (
                <button
                  type="button"
                  onClick={() => void handleExecute()}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                  تنفيذ
                </button>
              )}
              {canRetry && (
                <button
                  type="button"
                  onClick={() => void handleRetry()}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  إعادة المحاولة
                </button>
              )}
              {canReject && (
                <button
                  type="button"
                  onClick={() => setShowRejectInput(!showRejectInput)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400"
                >
                  <NoSymbolIcon className="h-4 w-4" />
                  رفض
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <TrashIcon className="h-4 w-4" />
                  حذف
                </button>
              )}
            </div>
          }
        />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
            <button type="button" onClick={() => setError("")} className="mr-2 font-bold">✕</button>
          </div>
        )}
        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
            <button type="button" onClick={() => setNotice("")} className="mr-2 font-bold">✕</button>
          </div>
        )}

        {showRejectInput && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
            <p className="mb-2 text-sm font-medium text-rose-700 dark:text-rose-300">سبب الرفض</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض..."
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-rose-500/30 dark:bg-gray-900 dark:text-white"
              rows={3}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={isProcessing}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Payload */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                بيانات Odoo
              </h3>
              <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-900 p-4 text-xs leading-relaxed text-gray-100 dark:border-gray-800 dark:bg-black/40">
                {JSON.stringify(action.payload_json, null, 2)}
              </pre>
            </section>

            {/* Validation */}
            {validationResult && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  نتائج التحقق
                </h3>
                <div className={`rounded-xl border p-4 ${
                  validationResult.valid
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                    : "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5"
                }`}>
                  <div className="flex items-center gap-2">
                    {validationResult.valid
                      ? <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                      : <ExclamationTriangleIcon className="h-5 w-5 text-rose-600" />
                    }
                    <span className={`text-sm font-medium ${validationResult.valid ? "text-emerald-700" : "text-rose-700"}`}>
                      {validationResult.valid ? "التحقق ناجح" : "التحقق فشل"}
                    </span>
                  </div>
                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {validationResult.errors.map((err, i) => (
                        <li key={i} className="text-sm text-rose-600">• {err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {/* Error */}
            {action.error_message && (
              <section className="rounded-2xl border border-rose-200 bg-white p-5 dark:border-rose-500/20 dark:bg-white/[0.03]">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-rose-400">
                  رسالة الخطأ
                </h3>
                <p className="text-sm text-rose-700 dark:text-rose-300">{action.error_message}</p>
              </section>
            )}

            {/* Odoo Response */}
            {action.odoo_response && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  استجابة Odoo
                </h3>
                <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-900 p-4 text-xs leading-relaxed text-gray-100 dark:border-gray-800 dark:bg-black/40">
                  {JSON.stringify(action.odoo_response, null, 2)}
                </pre>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                ملخص
              </h3>
              <div className="space-y-3">
                {[
                  { label: "النوع", value: entityTypeLabel(action.entity_type) },
                  { label: "الإجراء", value: actionTypeLabel(action.action_type) },
                  { label: "Model", value: action.odoo_model },
                  { label: "Method", value: action.odoo_method },
                  action.entity_id ? { label: "Entity ID", value: action.entity_id } : null,
                  action.odoo_record_id ? { label: "Odoo Record ID", value: String(action.odoo_record_id) } : null,
                  action.odoo_reference ? { label: "مرجع Odoo", value: action.odoo_reference } : null,
                ].filter(Boolean).map((item) => item && (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white" dir="ltr">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Metadata */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                معلومات
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">أنشأه</span>
                  <span className="font-medium text-gray-900 dark:text-white">{action.creator_name || "--"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">التاريخ</span>
                  <span className="text-gray-700 dark:text-gray-300" dir="ltr">{formatDate(action.created_at)}</span>
                </div>
                {action.approved_by && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">وافقه</span>
                    <span className="font-medium text-gray-900 dark:text-white">{action.approver_name || "--"}</span>
                  </div>
                )}
                {action.approved_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">تاريخ الموافقة</span>
                    <span className="text-gray-700 dark:text-gray-300" dir="ltr">{formatDate(action.approved_at)}</span>
                  </div>
                )}
                {action.rejected_by && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">رفضه</span>
                    <span className="font-medium text-gray-900 dark:text-white">{action.rejected_by}</span>
                  </div>
                )}
                {action.rejection_reason && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-300">
                    {action.rejection_reason}
                  </div>
                )}
              </div>
            </section>

            {/* Audit Log */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                سجل التدقيق
              </h3>
              {auditLog.length === 0 ? (
                <p className="text-sm text-gray-400">لا يوجد سجل</p>
              ) : (
                <div className="relative space-y-0">
                  {auditLog.map((entry, index) => (
                    <div key={entry.id} className="relative flex gap-3 pb-4">
                      {index < auditLog.length - 1 && (
                        <div className="absolute left-[9px] top-5 h-full w-0.5 bg-gray-200 dark:bg-white/[0.02]" />
                      )}
                      <div className="relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                        {statusIcon(entry.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge label={statusLabel(entry.status)} tone={statusTone(entry.status)} />
                          <span className="text-xs text-gray-500">{entry.user_name || "النظام"}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400" dir="ltr">{formatDate(entry.created_at)}</p>
                        {entry.details && (
                          <pre className="mt-1 overflow-x-auto rounded bg-brand-25 p-2 text-[10px] text-gray-500 dark:bg-gray-900">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </AdminPageFrame>

      <ConfirmApproveModal
        isOpen={confirmOpen}
        action={action}
        onConfirm={() => void handleConfirmApprove()}
        onCancel={() => setConfirmOpen(false)}
        isProcessing={isProcessing}
      />
    </>
  );
}
