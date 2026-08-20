import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Package, Truck, AlertTriangle } from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useUIStore } from '@/stores/uiStore';
import AppHeader from '@/components/AppHeader';
import LoadConfirmModal from '@/components/LoadConfirmModal';
import PartialLoadEditor from '@/components/PartialLoadEditor';
import type { Shipment } from '@/types';

export default function LoadConfirmationScreen() {
  const navigate = useNavigate();
  const shipments = useDeliveryStore((s) => s.shipments);
  const loadShipments = useDeliveryStore((s) => s.loadShipments);
  const markShipmentPickedUp = useDeliveryStore((s) => s.markShipmentPickedUp);
  const markAllPickedUp = useDeliveryStore((s) => s.markAllPickedUp);
  const markShipmentPartialLoad = useDeliveryStore((s) => s.markShipmentPartialLoad);
  const startOutForDelivery = useDeliveryStore((s) => s.startOutForDelivery);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const pendingShipments = useMemo(
    () => shipments.filter((s) => s.status === 'pending' && s.deliveryPhase !== 'picked_up'),
    [shipments]
  );
  const pickedUpShipments = useMemo(
    () => shipments.filter((s) => s.status === 'pending' && s.deliveryPhase === 'picked_up'),
    [shipments]
  );

  const [confirmModalShipment, setConfirmModalShipment] = useState<Shipment | null>(null);
  const [partialEditorShipment, setPartialEditorShipment] = useState<Shipment | null>(null);
  const [isSubmittingStep, setIsSubmittingStep] = useState(false);

  const allConfirmed = pendingShipments.length === 0 && pickedUpShipments.length > 0;

  const handleFullLoad = async (shipment: Shipment) => {
    if (isSubmittingStep) return;
    setIsSubmittingStep(true);

    try {
      await markShipmentPickedUp(shipment.id);
      setConfirmModalShipment(null);
      showToast(`تم تأكيد استلام ${shipment.customerName ?? 'الشحنة'} بالكامل`);
    } catch {
      // The store already shows the actionable error and reloads stale optimistic state.
    } finally {
      setIsSubmittingStep(false);
    }
  };

  const handleConfirmAll = async () => {
    if (isSubmittingStep || pendingShipments.length === 0) return;
    setIsSubmittingStep(true);

    try {
      await markAllPickedUp();
      showToast(`تم تأكيد استلام ${pendingShipments.length} شحنات بالكامل`);
    } catch {
      // The store already shows the actionable error and reloads stale optimistic state.
    } finally {
      setIsSubmittingStep(false);
    }
  };

  const handlePartialLoad = (shipment: Shipment) => {
    if (isSubmittingStep) return;
    setConfirmModalShipment(null);
    setPartialEditorShipment(shipment);
  };

  const handlePartialSave = async (
    loadedItems: { name: string; quantity: number; loadedQuantity: number }[]
  ) => {
    if (!partialEditorShipment || isSubmittingStep) return;
    setIsSubmittingStep(true);

    try {
      await markShipmentPartialLoad(partialEditorShipment.id, loadedItems);
      setPartialEditorShipment(null);
      showToast(`تم تأكيد التحميل الجزئي لـ ${partialEditorShipment.customerName ?? 'الشحنة'}`);
    } catch {
      // The store already shows the actionable error and reloads stale optimistic state.
    } finally {
      setIsSubmittingStep(false);
    }
  };

  const handleContinue = async () => {
    if (!allConfirmed || isSubmittingStep) return;
    setIsSubmittingStep(true);

    try {
      await startOutForDelivery();
      showToast('تم بدء خط التسليم');
      navigate('/route');
    } catch {
      // The store already shows the actionable error and reloads stale optimistic state.
    } finally {
      setIsSubmittingStep(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="تأكيد التحميل" onBack={() => navigate('/dashboard')} />

      {/* Summary bar */}
      <div className="bg-white px-4 py-3 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-app-accent" />
            <span className="text-sm font-medium text-app-text">
              {pickedUpShipments.length} / {pickedUpShipments.length + pendingShipments.length} شحنات تم تحميلها
            </span>
          </div>
          {allConfirmed && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
              <CheckCircle size={14} />
              تم التأكيد
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-app-accent"
            initial={false}
            animate={{
              width: `${(pickedUpShipments.length / Math.max(pickedUpShipments.length + pendingShipments.length, 1)) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        {/* Confirm all button */}
        {pendingShipments.length > 1 && (
          <button
            type="button"
            onClick={() => void handleConfirmAll()}
            disabled={isSubmittingStep}
            className="mt-3 w-full rounded-xl bg-app-accent py-2.5 text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {isSubmittingStep ? 'جاري التأكيد...' : `تأكيد استلام الكل (${pendingShipments.length})`}
          </button>
        )}
      </div>

      {/* Shipments list */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-24">
        {pendingShipments.length === 0 && pickedUpShipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package size={48} className="text-gray-300" />
            <h3 className="text-lg font-semibold text-app-text-secondary mt-4">لا توجد شحنات معلقة</h3>
            <p className="text-sm text-gray-400 mt-1">لا توجد شحنات تحتاج تأكيد التحميل</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Pending shipments */}
            {pendingShipments.map((shipment, i) => (
              <motion.div
                key={shipment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-app-text text-base truncate" dir="auto">
                      {shipment.customerName ?? `#${shipment.id}`}
                    </h3>
                    <p className="text-xs text-app-text-secondary mt-0.5">
                      {shipment.items.length > 0
                        ? `${shipment.skuCount ?? shipment.totalItems} بنود`
                        : 'تفاصيل الأصناف غير متاحة'}
                      {shipment.items.length > 0 && (
                        <>
                          {' - '}
                          <span dir="auto">{shipment.items[0]?.name}</span>
                          {shipment.items.length > 1 ? ' ...' : ''}
                        </>
                      )}
                    </p>
                    {shipment.items.some((item) => item.preparationStatus === 'partial' || item.preparationStatus === 'unavailable') && (
                      <p className="text-xs text-amber-600 font-medium mt-1">يوجد أصناف بحالة نقص</p>
                    )}
                    {shipment.address && (
                      <p className="text-xs text-gray-400 mt-1 truncate" dir="auto">
                        {shipment.address}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-600">
                    <AlertTriangle size={12} />
                    معلق
                  </span>
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={() => setConfirmModalShipment(shipment)}
                  disabled={isSubmittingStep || shipment.items.length === 0}
                  className="mt-3 w-full rounded-xl bg-app-dark py-2.5 text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {shipment.items.length === 0 ? 'بنود الشحنة ناقصة' : 'تم التحميل'}
                </button>
              </motion.div>
            ))}

            {/* Already picked up shipments */}
            {pickedUpShipments.map((shipment, i) => (
              <motion.div
                key={shipment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (pendingShipments.length + i) * 0.05 }}
                className="rounded-xl border border-green-200 bg-green-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-app-text text-base truncate" dir="auto">
                      {shipment.customerName ?? `#${shipment.id}`}
                    </h3>
                    <p className="text-xs text-app-text-secondary mt-0.5">
                      {shipment.items.length > 0
                        ? `${shipment.skuCount ?? shipment.totalItems} بنود`
                        : 'تفاصيل الأصناف غير متاحة'}
                    </p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <CheckCircle size={12} />
                    تم التحميل
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Continue button (sticky bottom) */}
      {allConfirmed && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-100 z-30">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            type="button"
            onClick={() => void handleContinue()}
            disabled={isSubmittingStep}
            className="w-full rounded-xl bg-app-accent py-3.5 text-base font-bold text-white active:scale-[0.98] transition-transform shadow-lg disabled:opacity-60"
          >
            المتابعة لخط التسليم
          </motion.button>
        </div>
      )}

      {/* Confirm modal (full vs partial) */}
      <LoadConfirmModal
        shipment={confirmModalShipment}
        onFullLoad={handleFullLoad}
        onPartialLoad={handlePartialLoad}
        onClose={() => setConfirmModalShipment(null)}
        isSubmitting={isSubmittingStep}
      />

      {/* Partial load editor */}
      <AnimatePresence>
        {partialEditorShipment && (
          <PartialLoadEditor
            shipment={partialEditorShipment}
            onSave={handlePartialSave}
            onClose={() => setPartialEditorShipment(null)}
            isSubmitting={isSubmittingStep}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
