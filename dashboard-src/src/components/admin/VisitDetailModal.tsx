import { Modal } from "../ui/modal";
import StatusBadge from "../ui/StatusBadge";
import CustomerAvatar from "../ui/CustomerAvatar";
import {
  buildVisitSummaryLines,
  resolveVisitStatus,
  resolveVisitType,
  type VisitActivitySource,
} from "../../lib/customer-activity";

interface VisitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: {
    id: string;
    customer_name?: string;
    user_name?: string;
    checked_in_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
    visit_mode?: string | null;
    visit_result?: string | null;
    note?: string | null;
    lat?: number | null;
    lng?: number | null;
    raw_form_payload?: Record<string, unknown> | null;
  } | null;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs} ساعة ${mins % 60} دقيقة`;
  return `${mins} دقيقة`;
}

export default function VisitDetailModal({ isOpen, onClose, visit }: VisitDetailModalProps) {
  if (!visit) return null;

  const source: VisitActivitySource = visit;
  const status = resolveVisitStatus(source);
  const visitType = resolveVisitType(source);
  const summaryLines = buildVisitSummaryLines(source);
  const duration = formatDuration(visit.started_at || visit.checked_in_at, visit.completed_at);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-lg">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <CustomerAvatar name={visit.customer_name || "عميل"} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" dir="auto">
              {visit.customer_name || "عميل غير معروف"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400" dir="auto">
              {visit.user_name || "غير محدد"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge label={visitType.label} tone={visitType.tone} />
            <StatusBadge label={status.label} tone={status.tone} />
          </div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-brand-25 dark:bg-white/[0.02]/50 p-3">
            <span className="text-xs font-medium text-gray-400">تاريخ البدء</span>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white" dir="ltr">
              {formatDate(visit.started_at)}
            </p>
          </div>
          <div className="rounded-xl bg-brand-25 dark:bg-white/[0.02]/50 p-3">
            <span className="text-xs font-medium text-gray-400">وقت الوصول</span>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white" dir="ltr">
              {formatDate(visit.checked_in_at)}
            </p>
          </div>
          <div className="rounded-xl bg-brand-25 dark:bg-white/[0.02]/50 p-3">
            <span className="text-xs font-medium text-gray-400">وقت الانتهاء</span>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white" dir="ltr">
              {formatDate(visit.completed_at)}
            </p>
          </div>
          {duration && (
            <div className="rounded-xl bg-brand-25 dark:bg-white/[0.02]/50 p-3">
              <span className="text-xs font-medium text-gray-400">المدة</span>
              <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                {duration}
              </p>
            </div>
          )}
        </div>

        {/* Summary lines */}
        {summaryLines.length > 0 && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">تفاصيل</span>
            <ul className="mt-1.5 space-y-1">
              {summaryLines.map((line, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300" dir="auto">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Note */}
        {visit.note && (
          <div className="rounded-xl bg-brand-25 dark:bg-white/[0.02]/50 p-3">
            <span className="text-xs font-medium text-gray-400">ملاحظة</span>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300" dir="auto">
              {visit.note}
            </p>
          </div>
        )}

        {/* Location */}
        {visit.lat != null && visit.lng != null && (
          <a
            href={`https://www.google.com/maps?q=${visit.lat},${visit.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm text-blue-600 hover:bg-brand-25 dark:hover:bg-white/[0.02]/50 transition-colors"
          >
            <span>فتح الموقع على الخريطة</span>
            <span className="text-xs text-gray-400">
              ({visit.lat.toFixed(5)}, {visit.lng.toFixed(5)})
            </span>
          </a>
        )}
      </div>
    </Modal>
  );
}
