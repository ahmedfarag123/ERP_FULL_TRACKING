import { ClipboardList, Truck, Calendar, ChevronLeft, AlertTriangle, Clock, UserX, Building2 } from 'lucide-react';
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

const bucketConfig: Record<string, { label: string; bg: string; text: string; icon: typeof Clock }> = {
  missed: { label: 'فائتة', bg: 'bg-orange-50', text: 'text-orange-600', icon: Clock },
  completed: { label: 'مكتملة', bg: 'bg-gray-100', text: 'text-gray-500', icon: AlertTriangle },
};

const reasonConfig: Record<string, { label: string; icon: typeof UserX; color: string }> = {
  driver: { label: 'السائق', icon: UserX, color: 'text-red-500' },
  dispatcher: { label: 'أمين المخزن', icon: Building2, color: 'text-amber-500' },
};

export default function PlanCard({ plan, onClick }: PlanCardProps) {
  const status = statusConfig[plan.preparation_status] ?? statusConfig.pending;
  const progress = plan.total_items > 0 ? Math.round((plan.confirmed_items / plan.total_items) * 100) : 0;
  const isViewOnly = plan.plan_bucket !== 'active';
  const bucketBadge = bucketConfig[plan.plan_bucket];
  const reasonBadge = plan.overdue_reason ? reasonConfig[plan.overdue_reason] : null;

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-xl p-4 shadow-card text-right transition-all border border-transparent ${
        isViewOnly ? 'opacity-75' : 'active:scale-[0.98]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isViewOnly ? 'bg-gray-100' : 'bg-app-light'}`}>
            <ClipboardList size={20} className={isViewOnly ? 'text-gray-400' : 'text-app-dark'} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${isViewOnly ? 'text-gray-500' : 'text-app-text'}`}>{plan.plan_reference ?? `خطة #${plan.plan_id.slice(0, 8)}`}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Truck size={12} className={isViewOnly ? 'text-gray-400' : 'text-app-text-secondary'} />
              <p className={`text-xs ${isViewOnly ? 'text-gray-400' : 'text-app-text-secondary'}`}>{plan.driver_name ?? 'سائق'}</p>
            </div>
          </div>
        </div>
        {!isViewOnly && <ChevronLeft size={18} className="text-gray-400 mt-1" />}
      </div>

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          {bucketBadge && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${bucketBadge.bg} ${bucketBadge.text}`}>
              <bucketBadge.icon size={12} />
              {bucketBadge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className={isViewOnly ? 'text-gray-400' : 'text-app-text-secondary'} />
          <span className={`text-xs ${isViewOnly ? 'text-gray-400' : 'text-app-text-secondary'}`}>{plan.planned_date ?? '—'}</span>
        </div>
      </div>

      {reasonBadge && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 ${reasonBadge.color}`}>
            <reasonBadge.icon size={12} />
            سبب الفوات: {reasonBadge.label}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {plan.total_items > 0 && (
            <span className={`text-xs ${isViewOnly ? 'text-gray-400' : 'text-app-text-secondary'}`}>{plan.confirmed_items} من {plan.total_items} منتج</span>
          )}
          {plan.orders_count > 0 && (
            <span className={`text-xs ${isViewOnly ? 'text-gray-400' : 'text-app-text-secondary'}`}>{plan.orders_count} طلب</span>
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
            <div className={`h-full rounded-full transition-all ${isViewOnly ? 'bg-gray-300' : 'bg-app-success'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </button>
  );
}
