import { CheckSquare, ClipboardList, User, Clock, ChevronLeft, Square } from 'lucide-react';
import { formatMoney, formatDate } from '../lib/format';
import type { PrepOrder } from '../types';

interface OrderCardProps {
  order: PrepOrder;
  onClick: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  onOpenDetail?: () => void;
}

const statusConfig = {
  pending: { label: 'جديد', bg: 'bg-brand-50', text: 'text-brand-500' },
  preparing: { label: 'قيد التجهيز', bg: 'bg-warning-50', text: 'text-warning-600' },
  ready: { label: 'جاهز', bg: 'bg-success-50', text: 'text-success-600' },
  waiting_pickup: { label: 'بانتظار الاستلام', bg: 'bg-blue-light-50', text: 'text-blue-light-600' },
  handed_over: { label: 'تم التسليم', bg: 'bg-success-50', text: 'text-success-600' },
  cancelled: { label: 'ملغي', bg: 'bg-error-50', text: 'text-error-600' },
};

export default function OrderCard({ order, onClick, isSelected = false, selectionMode = false, onOpenDetail }: OrderCardProps) {
  const status = statusConfig[order.preparation_status] ?? statusConfig.pending;
  const progress = order.item_count > 0 ? Math.round((order.confirmed_count / order.item_count) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-xl p-4 shadow-card text-right active:scale-[0.98] transition-transform border ${isSelected ? 'border-app-accent ring-2 ring-app-accent/20' : 'border-transparent'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-light flex items-center justify-center">
            {selectionMode ? (
              isSelected ? <CheckSquare size={20} className="text-app-accent" /> : <Square size={20} className="text-app-text-secondary" />
            ) : (
              <ClipboardList size={20} className="text-app-dark" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-app-text">{order.odoo_order_name ?? `طلب #${order.id.slice(0, 8)}`}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <User size={12} className="text-app-text-secondary" />
              <p className="text-xs text-app-text-secondary">{order.customer_name ?? 'عميل'}</p>
            </div>
          </div>
        </div>
        {onOpenDetail ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onOpenDetail();
              }
            }}
            className="h-8 w-8 rounded-full bg-brand-25 flex items-center justify-center text-gray-400"
            aria-label="تفاصيل الطلب"
          >
            <ChevronLeft size={18} />
          </span>
        ) : (
          <ChevronLeft size={18} className="text-gray-400 mt-1" />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-app-text-secondary" />
          <span className="text-xs text-app-text-secondary">{formatDate(order.order_date)}</span>
        </div>
      </div>

      {order.item_count > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-app-text-secondary mb-1">
            <span>{order.confirmed_count} من {order.item_count} منتج</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-app-success rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {order.total_amount != null && (
        <p className="text-sm font-semibold text-app-text mt-2">{formatMoney(order.total_amount, order.currency_code ?? 'EGP')}</p>
      )}
    </button>
  );
}
