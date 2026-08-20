import { ChevronLeft, DollarSign, FileText, Lock, MapPin, Route, Scale } from 'lucide-react';
import type { Shipment } from '@/types';
import { formatMoney } from '@/lib/format';
import StatusBadge from './StatusBadge';

interface ShipmentListItemProps {
  shipment: Shipment;
  onClick: () => void;
  compact?: boolean;
}

export default function ShipmentListItem({ shipment, onClick, compact }: ShipmentListItemProps) {
  const isCompleted = shipment.status === 'delivered';
  const isFailed = shipment.status === 'failed';
  const firstNamedItem = shipment.items.find((item) => item.name)?.name;
  const skuCount = shipment.skuCount ?? shipment.totalItems ?? shipment.items.length;
  const totalQuantity =
    shipment.totalQuantity ?? shipment.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const reference = shipment.orderReference ?? shipment.shipmentReference ?? null;
  const collectionAmount = formatMoney(
    shipment.collection?.pendingDeliveryAmount ?? shipment.collection?.amount ?? null,
    shipment.collection?.currencyCode ?? null
  );

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border border-gray-200 bg-white p-4 text-right shadow-card transition-all duration-100 active:scale-[0.98] active:bg-brand-25 ${
        isFailed ? 'border-l-[3px] border-l-error-500' : ''
      } ${isCompleted ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-app-text text-base truncate" dir="auto" data-preserve-source-text>
              {shipment.customerName ?? `#${shipment.id}`}
            </h3>
            <StatusBadge status={shipment.status} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {shipment.routeOrder != null && (
              <span
                aria-label={`خط السير رقم ${shipment.routeOrder}`}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-app-text-secondary"
              >
                <Route size={11} />
                خط السير #{shipment.routeOrder}
              </span>
            )}
            {shipment.priority === 'high' && (
              <span aria-label="الأولوية" className="inline-flex rounded-full bg-error-50 px-2 py-0.5 text-[11px] font-semibold text-error-600">
                الأولوية
              </span>
            )}
            {collectionAmount && (
              <span
                aria-label={`تحصيل نقدي ${collectionAmount}`}
                className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-600"
              >
                <DollarSign size={11} />
                تحصيل نقدي {collectionAmount}
              </span>
            )}
            {shipment.routeLocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-500">
                <Lock size={11} />
                مقفل
              </span>
            )}
          </div>

          {shipment.address && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <MapPin size={14} className="text-app-text-secondary flex-shrink-0" />
              <p className="text-sm text-app-text-secondary truncate" dir="auto" data-preserve-source-text>
                {shipment.address}
              </p>
            </div>
          )}

          {!compact && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-400">
                {shipment.items.length > 0
                  ? `${skuCount} بنود${totalQuantity > 0 ? ` - الكمية ${totalQuantity}` : ''}`
                  : 'تفاصيل الأصناف غير متاحة'}
                {firstNamedItem ? (
                  <>
                    {' - '}
                    <span dir="auto" data-preserve-source-text>
                      {firstNamedItem}
                    </span>
                    {shipment.items.length > 1 ? ', ...' : ''}
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-app-text-secondary">
                {reference && (
                  <span aria-label="مرجع الطلب" className="inline-flex items-center gap-1">
                    <FileText size={11} />
                    <span dir="auto" data-preserve-source-text>
                      {reference}
                    </span>
                  </span>
                )}
                {shipment.totalWeight != null && (
                  <span aria-label="الوزن" className="inline-flex items-center gap-1">
                    <Scale size={11} />
                    الوزن {shipment.totalWeight} كجم
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <ChevronLeft size={18} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}
