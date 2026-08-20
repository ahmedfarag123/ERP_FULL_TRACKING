// ============================================================
// Review Drawer — Opens when clicking "Review" on a pending action
// Shows summary, payload preview, validation results, audit log
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type {
  OdooPendingActionWithMeta,
  OdooActionAuditLogEntry,
} from "../../../types/odoo-pending-actions";
import { fetchActionAuditLog } from "../../../lib/odoo-pending-actions";
import StatusBadge from "../../ui/StatusBadge";

interface ReviewDrawerProps {
  isOpen: boolean;
  action: OdooPendingActionWithMeta | null;
  onClose: () => void;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onRetry: (actionId: string) => void;
  isProcessing: boolean;
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

export default function ReviewDrawer({
  isOpen,
  action,
  onClose,
  onApprove,
  onReject,
  onRetry,
  isProcessing,
}: ReviewDrawerProps) {
  const [auditLog, setAuditLog] = useState<OdooActionAuditLogEntry[]>([]);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const loadAuditLog = useCallback(async () => {
    if (!action?.id) return;
    setIsLoadingLog(true);
    try {
      const log = await fetchActionAuditLog(action.id);
      setAuditLog(log);
    } catch {
      setAuditLog([]);
    } finally {
      setIsLoadingLog(false);
    }
  }, [action?.id]);

  useEffect(() => {
    if (isOpen && action?.id) {
      void loadAuditLog();
    }
    if (!isOpen) {
      setAuditLog([]);
      setRejectReason("");
      setShowRejectInput(false);
    }
  }, [isOpen, action?.id, loadAuditLog]);

  if (!isOpen || !action) return null;

  const canApprove = ["waiting_approval", "failed"].includes(action.status);
  const canReject = ["waiting_approval", "approved"].includes(action.status);
  const canRetry = action.status === "failed";

  const validationResult = action.validation_result as { valid?: boolean; errors?: string[] } | null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              مراجعة الإجراء
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {entityTypeLabel(action.entity_type)} — {actionTypeLabel(action.action_type)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-brand-25 hover:text-gray-600 dark:hover:bg-white/[0.02]"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <StatusBadge label={statusLabel(action.status)} tone={statusTone(action.status)} />
            {action.retry_count > 0 && (
              <span className="text-xs text-gray-400">
                محاولة {action.retry_count}
              </span>
            )}
          </div>

          {/* Summary */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              ملخص
            </h3>
            <div className="rounded-xl border border-gray-200 bg-brand-25 p-4 dark:border-gray-800 dark:bg-white/[0.02] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">النوع</span>
                <span className="font-medium text-gray-900 dark:text-white">{entityTypeLabel(action.entity_type)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">الإجراء</span>
                <span className="font-medium text-gray-900 dark:text-white">{actionTypeLabel(action.action_type)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Model Odoo</span>
                <code className="rounded bg-brand-25 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                  {action.odoo_model}
                </code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Method</span>
                <code className="rounded bg-brand-25 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                  {action.odoo_method}
                </code>
              </div>
              {action.entity_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Entity ID</span>
                  <code className="rounded bg-brand-25 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300" dir="ltr">
                    {action.entity_id}
                  </code>
                </div>
              )}
            </div>
          </section>

          {/* Metadata */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              معلومات
            </h3>
            <div className="rounded-xl border border-gray-200 bg-brand-25 p-4 dark:border-gray-800 dark:bg-white/[0.02] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">أنشأه</span>
                <span className="font-medium text-gray-900 dark:text-white">{action.creator_name || "--"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">تاريخ الإنشاء</span>
                <span className="text-gray-700 dark:text-gray-300" dir="ltr">{formatDate(action.created_at)}</span>
              </div>
              {action.approved_by && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">وافقه</span>
                  <span className="font-medium text-gray-900 dark:text-white">{action.approver_name || "--"}</span>
                </div>
              )}
              {action.approved_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">تاريخ الموافقة</span>
                  <span className="text-gray-700 dark:text-gray-300" dir="ltr">{formatDate(action.approved_at)}</span>
                </div>
              )}
              {action.odoo_record_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">رقم السجل في Odoo</span>
                  <code className="rounded bg-brand-25 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300" dir="ltr">
                    {action.odoo_record_id}
                  </code>
                </div>
              )}
              {action.odoo_reference && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">مرجع Odoo</span>
                  <span className="font-medium text-gray-900 dark:text-white" dir="ltr">{action.odoo_reference}</span>
                </div>
              )}
            </div>
          </section>

          {/* Validation Results */}
          {validationResult && (
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                نتائج التحقق
              </h3>
              <div className={`rounded-xl border p-4 ${
                validationResult.valid
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                  : "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5"
              }`}>
                <div className="flex items-center gap-2">
                  {validationResult.valid ? (
                    <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    validationResult.valid
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300"
                  }`}>
                    {validationResult.valid ? "التحقق ناجح" : "التحقق فشل"}
                  </span>
                </div>
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index} className="text-sm text-rose-600 dark:text-rose-400">
                        • {error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* Payload Preview */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              معاينة البيانات
            </h3>
            <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-900 p-4 text-xs leading-relaxed text-gray-100 dark:border-gray-800 dark:bg-black/40">
              {JSON.stringify(action.payload_json, null, 2)}
            </pre>
          </section>

          {/* Error Message */}
          {action.error_message && (
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                رسالة الخطأ
              </h3>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
                <p className="text-sm text-rose-700 dark:text-rose-300">{action.error_message}</p>
              </div>
            </section>
          )}

          {/* Odoo Response */}
          {action.odoo_response && (
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                استجابة Odoo
              </h3>
              <pre className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-900 p-4 text-xs leading-relaxed text-gray-100 dark:border-gray-800 dark:bg-black/40">
                {JSON.stringify(action.odoo_response, null, 2)}
              </pre>
            </section>
          )}

          {/* Audit Log */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              سجل التدقيق
            </h3>
            {isLoadingLog ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-brand-25 dark:bg-white/[0.02]" />
                ))}
              </div>
            ) : auditLog.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">لا يوجد سجل</p>
            ) : (
              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-brand-25 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.02]"
                  >
                    <StatusBadge label={statusLabel(entry.status)} tone={statusTone(entry.status)} />
                    <span className="flex-1 text-xs text-gray-500 dark:text-gray-400">
                      {entry.user_name || "النظام"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500" dir="ltr">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          {showRejectInput ? (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب الرفض (اختياري)..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectInput(false);
                    setRejectReason("");
                  }}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.02]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReject(action.id);
                    setShowRejectInput(false);
                    setRejectReason("");
                  }}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  تأكيد الرفض
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {canApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(action.id)}
                  disabled={isProcessing || (validationResult !== null && !validationResult.valid)}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isProcessing ? "جارٍ المعالجة..." : "موافقة"}
                </button>
              )}
              {canRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(action.id)}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  إعادة المحاولة
                </button>
              )}
              {canReject && (
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  رفض
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.02]"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
