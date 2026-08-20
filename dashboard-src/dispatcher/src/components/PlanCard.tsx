import { ClipboardList, Truck, Calendar, ChevronLeft, AlertTriangle } from 'lucide-react';
import type { DispatcherPlan } from '../types';

interface PlanCardProps {
  plan: DispatcherPlan;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'جديد', bg: 'bg-brand-50', text: 'text-brand-500' },
  preparing: { label: 'قيد التجهيز', bg: 'bg-warning-50', text: 'text-warning-600' },
  ready: { label: 'جاهز', bg: 'bg-success-50', text: 'text-success-600' },
  cancelled: { label: 'ملغي', bg: 'bg-error-50', text: 'text-error-600' },
};

export default function PlanCard({ plan, onClick }: PlanCardProps) {
  const status = statusConfig[plan.preparation_status] ?? statusConfig.pending;
  const progress = plan.total_items > 0 ? Math.round((plan.confirmed_items / plan.total_items) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 shadow-card text-right active:scale-[0.98] transition-transform border border-transparent"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-light flex items-center justify-center">
            <ClipboardList size={20} className="text-app-dark" />
          </div>
          <div>
            <p className="text-sm font-semibold text-app-text">{plan.plan_reference ?? `خطة #${plan.plan_id.slice(0, 8)}`}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Truck size={12} className="text-app-text-secondary" />
              <p className="text-xs text-app-text-secondary">{plan.driver_name ?? 'سائق'}</p>
            </div>
          </div>
        </div>
        <ChevronLeft size={18} className="text-gray-400 mt-1" />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-app-text-secondary" />
          <span className="text-xs text-app-text-secondary">{plan.planned_date ?? '—'}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {plan.total_items > 0 && (
            <span className="text-xs text-app-text-secondary">{plan.confirmed_items} من {plan.total_items} منتج</span>
          )}
          {plan.orders_count > 0 && (
            <span className="text-xs text-app-text-secondary">{plan.orders_count} طلب</span>
          )}
        </div>
        {plan.has_shortages && (
          <span className="flex items-center gap-1 text-xs font-semibold text-error-600">
            <AlertTriangle size={12} />
            نقص
          </span>
        )}
      </div>

      {plan.total_items > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-app-text-secondary mb-1">
            <span>{plan.confirmed_items} من {plan.total_items} منتج</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-app-success rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </button>
  );
}
