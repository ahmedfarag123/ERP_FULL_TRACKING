import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, PackageCheck, PackageX } from 'lucide-react';
import type { Shipment } from '@/types';
import BottomSheet from './BottomSheet';

interface PartialLoadEditorProps {
  shipment: Shipment;
  onSave: (loadedItems: { name: string; quantity: number; loadedQuantity: number }[]) => void | Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function PartialLoadEditor({ shipment, onSave, onClose, isSubmitting = false }: PartialLoadEditorProps) {
  const [items, setItems] = useState(() =>
    shipment.items.map((item) => ({
      name: item.name ?? 'صنف غير معروف',
      quantity: item.quantity ?? 0,
      loadedQuantity: item.quantity ?? 0,
      isLoaded: true,
    }))
  );

  const handleToggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              isLoaded: !item.isLoaded,
              loadedQuantity: !item.isLoaded ? item.quantity : 0,
            }
          : item
      )
    );
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newQty = Math.max(0, Math.min(item.quantity, item.loadedQuantity + delta));
        return {
          ...item,
          loadedQuantity: newQty,
          isLoaded: newQty > 0,
        };
      })
    );
  };

  const handleSetExact = (index: number, value: string) => {
    const num = parseInt(value, 10);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const clamped = Math.max(0, Math.min(item.quantity, isNaN(num) ? 0 : num));
        return {
          ...item,
          loadedQuantity: clamped,
          isLoaded: clamped > 0,
        };
      })
    );
  };

  const totalOriginal = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalLoaded = items.reduce((sum, item) => sum + (item.isLoaded ? item.loadedQuantity : 0), 0);
  const allPartial = totalLoaded > 0 && totalLoaded < totalOriginal;

  const handleSave = () => {
    void onSave(
      items
        .filter((item) => item.isLoaded)
        .map((item) => ({
          name: item.name,
          quantity: item.quantity,
          loadedQuantity: item.loadedQuantity,
        }))
    );
  };

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title="التحميل الجزئي"
      subtitle={`${shipment.customerName ?? ''} - ${totalLoaded} / ${totalOriginal} صنف`}
    >
      <div className="space-y-2 mb-4">
        {items.map((item, index) => (
          <motion.div
            key={index}
            layout
            className={`rounded-xl border p-3 transition-colors ${
              item.isLoaded
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-brand-25 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Item info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-app-text truncate" dir="auto">
                  {item.name}
                </h4>
                <p className="text-xs text-app-text-secondary mt-0.5">
                  الكمية المطلوبة: {item.quantity}
                </p>
              </div>

              {/* Toggle button */}
              <button
                type="button"
                onClick={() => handleToggleItem(index)}
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  item.isLoaded
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {item.isLoaded ? <PackageCheck size={18} /> : <PackageX size={18} />}
              </button>
            </div>

            {/* Quantity controls (only when loaded) */}
            {item.isLoaded && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(index, -1)}
                  disabled={item.loadedQuantity <= 0}
                  className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-app-text disabled:opacity-30 active:scale-95 transition-transform"
                >
                  <Minus size={16} />
                </button>

                <input
                  type="number"
                  inputMode="numeric"
                  value={item.loadedQuantity}
                  onChange={(e) => handleSetExact(index, e.target.value)}
                  className="w-16 h-9 rounded-lg border border-gray-200 bg-white text-center text-sm font-semibold text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                <button
                  type="button"
                  onClick={() => handleQuantityChange(index, 1)}
                  disabled={item.loadedQuantity >= item.quantity}
                  className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-app-text disabled:opacity-30 active:scale-95 transition-transform"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-gray-100 p-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-app-text-secondary">إجمالي المحمل</span>
          <span className={`font-semibold ${allPartial ? 'text-orange-600' : 'text-app-text'}`}>
            {totalLoaded} / {totalOriginal}
          </span>
        </div>
        {allPartial && (
          <p className="text-xs text-orange-500 mt-1">
            تحميل جزئي - سيتم تسجيل الأصناف غير المحملة كـ "لم يتم التحميل"
          </p>
        )}
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={totalLoaded === 0 || isSubmitting}
        className="w-full rounded-xl bg-app-dark py-3 text-sm font-semibold text-white disabled:opacity-40 active:scale-[0.98] transition-transform"
      >
        حفظ التحميل الجزئي ({totalLoaded} صنف)
      </button>
    </BottomSheet>
  );
}
