// ============================================================
// Confirm Approve Modal
// Shows confirmation dialog before approving a pending action
// ============================================================

import { Modal } from "../../ui/modal";
import type { OdooPendingActionWithMeta } from "../../../types/odoo-pending-actions";

interface ConfirmApproveModalProps {
  isOpen: boolean;
  action: OdooPendingActionWithMeta | null;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

function formatAmount(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(num);
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

function odooMethodLabel(method: string) {
  const map: Record<string, string> = {
    create: "إنشاء",
    write: "تحديث",
    unlink: "حذف",
    search_read: "بحث",
  };
  return map[method] ?? method;
}

function extractSummary(action: OdooPendingActionWithMeta) {
  const payload = action.payload_json ?? {};

  if (action.entity_type === "quotation") {
    const orderLine = payload.order_line as unknown[];
    const lineCount = Array.isArray(orderLine) ? orderLine.length : 0;
    const partnerId = payload.partner_id;
    return {
      title: `${odooMethodLabel(action.odoo_method)} ${entityTypeLabel(action.entity_type)}`,
      details: [
        { label: "العميل (Odoo ID)", value: partnerId ? String(partnerId) : "--" },
        { label: "عدد المنتجات", value: String(lineCount) },
      ],
    };
  }

  if (action.entity_type === "customer") {
    return {
      title: `${odooMethodLabel(action.odoo_method)} ${entityTypeLabel(action.entity_type)}`,
      details: [
        { label: "الاسم", value: String(payload.name ?? "--") },
        { label: "البريد", value: String(payload.email ?? "--") },
        { label: "الهاتف", value: String(payload.phone ?? "--") },
      ],
    };
  }

  if (action.entity_type === "product") {
    return {
      title: `${odooMethodLabel(action.odoo_method)} ${entityTypeLabel(action.entity_type)}`,
      details: [
        { label: "الاسم", value: String(payload.name ?? "--") },
        { label: "سعر البيع", value: formatAmount(payload.list_price) },
        { label: "ال Barcode", value: String(payload.barcode ?? "--") },
      ],
    };
  }

  if (action.entity_type === "crm_lead") {
    return {
      title: `${odooMethodLabel(action.odoo_method)} ${entityTypeLabel(action.entity_type)}`,
      details: [
        { label: "الاسم", value: String(payload.name ?? "--") },
        { label: "الإيراد المتوقع", value: formatAmount(payload.expected_revenue) },
        { label: "النوع", value: String(payload.type ?? "lead") },
      ],
    };
  }

  return {
    title: `${odooMethodLabel(action.odoo_method)} على ${action.odoo_model}`,
    details: Object.entries(payload)
      .slice(0, 5)
      .map(([key, value]) => ({
        label: key,
        value: typeof value === "object" ? JSON.stringify(value) : String(value ?? "--"),
      })),
  };
}

export default function ConfirmApproveModal({
  isOpen,
  action,
  onConfirm,
  onCancel,
  isProcessing,
}: ConfirmApproveModalProps) {
  if (!action) return null;

  const summary = extractSummary(action);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-lg">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {summary.title}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          أنت على وشك تنفيذ هذا الإجراء في Odoo. هل تريد المتابعة؟
        </p>

        <div className="mt-5 rounded-xl border border-gray-200 bg-brand-25 p-4 dark:border-gray-800 dark:bg-white/[0.02] space-y-3">
          {summary.details.map((detail) => (
            <div key={detail.label} className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{detail.label}</span>
              <span className="font-medium text-gray-900 dark:text-white" dir="ltr">
                {detail.value}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm border-t border-gray-200 pt-3 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">Model</span>
            <code className="rounded bg-brand-25 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
              {action.odoo_model}
            </code>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">أنشأه</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {action.creator_name || "--"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.02]"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isProcessing}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {isProcessing ? "جارٍ المعالجة..." : "تأكيد التنفيذ"}
        </button>
      </div>
    </Modal>
  );
}
