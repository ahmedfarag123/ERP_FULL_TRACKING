import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, GripVertical, CheckCircle } from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useUIStore } from '@/stores/uiStore';
import AppHeader from '@/components/AppHeader';

export default function PlanReorderScreen() {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const shipments = useDeliveryStore((s) => s.shipments);
  const reorderPlanShipments = useDeliveryStore((s) => s.reorderPlanShipments);
  const showToast = useUIStore((s) => s.showToast);

  const planShipments = useMemo(() => {
    const filtered = shipments.filter((s) => s.planId === planId);
    return [...filtered].sort((a, b) => {
      if (a.routeOrder == null && b.routeOrder == null) return 0;
      if (a.routeOrder == null) return 1;
      if (b.routeOrder == null) return -1;
      return a.routeOrder - b.routeOrder;
    });
  }, [shipments, planId]);

  const [orderedIds, setOrderedIds] = useState<string[]>(() => planShipments.map((s) => s.id));
  const [isSaving, setIsSaving] = useState(false);

  const orderedShipments = useMemo(() => {
    const byId = new Map(planShipments.map((s) => [s.id, s]));
    return orderedIds.map((id) => byId.get(id)).filter(Boolean) as typeof planShipments;
  }, [planShipments, orderedIds]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    setOrderedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setOrderedIds((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await reorderPlanShipments(orderedIds);
      showToast('تم حفظ ترتيب خط السير');
      navigate(-1);
    } catch {
      showToast('تعذر حفظ الترتيب', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(orderedIds) !== JSON.stringify(planShipments.map((s) => s.id));

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="ترتيب خط السير" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-24">
        {orderedShipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <GripVertical size={48} className="text-gray-300" />
            <h3 className="text-lg font-semibold text-app-text-secondary mt-4">لا توجد شحنات</h3>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {orderedShipments.map((shipment, index) => (
              <motion.div
                key={shipment.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-card"
              >
                {/* Order number */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-app-dark text-white flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>

                {/* Shipment info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-app-text truncate" dir="auto">
                    {shipment.customerName ?? `#${shipment.id}`}
                  </h4>
                  <p className="text-xs text-app-text-secondary truncate" dir="auto">
                    {shipment.address ?? shipment.items[0]?.name ?? ''}
                  </p>
                </div>

                {/* Status indicator */}
                {shipment.status === 'delivered' && (
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                )}

                {/* Move buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-brand-25/70 disabled:opacity-20 active:scale-95 transition-all"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === orderedShipments.length - 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-brand-25/70 disabled:opacity-20 active:scale-95 transition-all"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      {hasChanges && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-100 z-30">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-xl bg-app-accent py-3.5 text-base font-bold text-white active:scale-[0.98] transition-transform shadow-lg disabled:opacity-50"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ الترتيب'}
          </button>
        </div>
      )}
    </div>
  );
}
