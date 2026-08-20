import { Package, CheckCircle, Sliders } from 'lucide-react';
import type { Shipment } from '@/types';
import BottomSheet from './BottomSheet';

interface LoadConfirmModalProps {
  shipment: Shipment | null;
  onFullLoad: (shipment: Shipment) => void | Promise<void>;
  onPartialLoad: (shipment: Shipment) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function LoadConfirmModal({
  shipment,
  onFullLoad,
  onPartialLoad,
  onClose,
  isSubmitting = false,
}: LoadConfirmModalProps) {
  if (!shipment) return null;
  const hasItems = shipment.items.length > 0;
  const skuCount = shipment.skuCount ?? shipment.totalItems;

  return (
    <BottomSheet
      isOpen={!!shipment}
      onClose={onClose}
      title="تأكيد التحميل"
      subtitle={shipment.customerName ?? `شحنة #${shipment.id}`}
    >
      {/* Items summary */}
      <div className="mb-5 rounded-xl bg-brand-25 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package size={16} className="text-app-text-secondary" />
          <span className="text-sm font-medium text-app-text">
            {hasItems ? `${skuCount} بنود في الشحنة` : 'تفاصيل الأصناف غير متاحة'}
          </span>
        </div>
        <div className="space-y-1">
          {shipment.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-app-text-secondary">
              <span dir="auto" className="truncate flex-1">
                {item.name ?? `صنف ${i + 1}`}
              </span>
              <span className="font-medium text-app-text mr-2">
                {item.quantity ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => void onFullLoad(shipment)}
          disabled={isSubmitting || !hasItems}
          className="w-full flex items-center gap-3 rounded-xl border-2 border-green-200 bg-green-50 p-4 text-right transition-all active:scale-[0.98] hover:border-green-300 disabled:opacity-60"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-800">تحميل كامل</h4>
            <p className="text-xs text-green-600 mt-0.5">
              {hasItems ? 'تم استلام جميع الأصناف بالكمية المطلوبة' : 'تأكيد تحميل الشحنة بدون تفاصيل أصناف'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onPartialLoad(shipment)}
          disabled={isSubmitting || !hasItems}
          className="w-full flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 p-4 text-right transition-all active:scale-[0.98] hover:border-orange-300 disabled:opacity-60"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Sliders size={20} className="text-orange-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-orange-800">تحميل جزئي</h4>
            <p className="text-xs text-orange-600 mt-0.5">
              تعديل الكميات أو استبعاد أصناف لم يتم تحميلها
            </p>
          </div>
        </button>
      </div>
    </BottomSheet>
  );
}
