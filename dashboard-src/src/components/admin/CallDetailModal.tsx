import { Modal } from "../ui/modal";
import StatusBadge from "../ui/StatusBadge";
import CustomerAvatar from "../ui/CustomerAvatar";
import {
  buildCallSummaryLines,
  resolveCallDirection,
  type CallActivitySource,
} from "../../lib/customer-activity";
import { formatDurationMmSs } from "../../lib/customer-activity";

interface CallDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: {
    id: string;
    customer_name?: string;
    user_name?: string;
    created_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    call_duration_seconds?: number | null;
    call_status?: string | null;
    call_reason?: string | null;
    customer_response?: string | null;
    call_outcome?: string | null;
    next_action?: string | null;
    call_notes?: string | null;
    callback_at?: string | null;
    follow_up_sla_status?: string | null;
    requires_urgent_action?: boolean | null;
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

export default function CallDetailModal({ isOpen, onClose, call }: CallDetailModalProps) {
  if (!call) return null;

  const source: CallActivitySource = call;
  const direction = resolveCallDirection(source);
  const summaryLines = buildCallSummaryLines(source);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-lg">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <CustomerAvatar name={call.customer_name || "عميل"} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" dir="auto">
              {call.customer_name || "عميل غير معروف"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400" dir="auto">
              {call.user_name || "غير محدد"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge label={direction.label} tone={direction.tone} />
            {call.requires_urgent_action && (
              <StatusBadge label="عاجل" tone="red" />
            )}
          </div>
        </div>

        {/* Timestamps & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-brand-25 dark:bg-white/[0.02]/50 p-3">
            <span className="text-xs font-medium text-gray-400">تاريخ الإنشاء</span>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white" dir="ltr">
              {formatDate(call.created_at)}
            </p>
          </div>
          <div className="rounded-xl bg-brand-25 dark:bg-white/[0.02]/50 p-3">
            <span className="text-xs font-medium text-gray-400">المدة</span>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {formatDurationMmSs(call.call_duration_seconds) ?? "--"}
            </p>
          </div>
        </div>

        {/* Summary lines */}
        {summaryLines.length > 0 && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">تفاصيل المكالمة</span>
            <ul className="mt-1.5 space-y-1">
              {summaryLines.map((line, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300" dir="auto">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Callback */}
        {call.callback_at && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">متابعة مجدولة</span>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white" dir="ltr">
              {formatDate(call.callback_at)}
            </p>
          </div>
        )}

        {/* Notes */}
        {call.call_notes && (
          <div className="rounded-xl bg-brand-25 dark:bg-white/[0.02]/50 p-3">
            <span className="text-xs font-medium text-gray-400">ملاحظات</span>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300" dir="auto">
              {call.call_notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
