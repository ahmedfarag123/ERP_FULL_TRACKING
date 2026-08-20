import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  DollarSign,
  CreditCard,
  FileCheck,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import type { ShipmentOrder, CollectionPaymentMethod, OrderCollectionInput } from '@/types';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface SalesRep {
  id: string;
  full_name: string | null;
}

interface CollectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  orders: ShipmentOrder[];
  onComplete: () => void;
}

const PAYMENT_METHODS: { value: CollectionPaymentMethod; label: string; icon: typeof DollarSign; color: string }[] = [
  { value: 'cash', label: 'نقدي', icon: DollarSign, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'credit', label: 'آجل', icon: CreditCard, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'cheque', label: 'شيك', icon: FileCheck, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'bank_transfer', label: 'تحويل بنكي', icon: ArrowRightLeft, color: 'text-blue-600 bg-blue-50 border-blue-200' },
];

export default function CollectionSheet({ isOpen, onClose, shipmentId, orders, onComplete }: CollectionSheetProps) {
  const [orderMethods, setOrderMethods] = useState<Record<string, CollectionPaymentMethod>>({});
  const [salesRepIds, setSalesRepIds] = useState<Record<string, string>>({});
  const [chequeRefs, setChequeRefs] = useState<Record<string, string>>({});
  const [driverNotes, setDriverNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isOpen) return;
    const fetchReps = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'sales_agent')
        .eq('status', 'active')
        .order('full_name');
      setSalesReps((data ?? []) as SalesRep[]);
    };
    void fetchReps();
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!user?.id || orders.length === 0) return;

    // Validate all orders have a payment method
    if (orders.some((o) => !orderMethods[o.orderId])) {
      setError('يجب اختيار نوع التحصيل لجميع الطلبات');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const orderCollections: OrderCollectionInput[] = orders.map((order) => {
        const salesRepId = salesRepIds[order.orderId];
        const salesRep = salesReps.find((rep) => rep.id === salesRepId);

        return {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          orderTotal: order.orderTotal,
          paymentMethod: orderMethods[order.orderId],
          salesRepId: salesRepId || undefined,
          salesRepName: salesRep?.full_name ?? undefined,
          chequeReference: chequeRefs[order.orderId] ?? undefined,
          driverNotes: driverNotes[order.orderId] ?? undefined,
        };
      });

      const { error: rpcError } = await supabase.rpc('driver_submit_order_collections', {
        p_shipment_id: shipmentId,
        p_order_collections: orderCollections,
      });

      if (rpcError) throw rpcError;

      setSubmitted(true);
      setTimeout(() => {
        onComplete();
        onClose();
        setSubmitted(false);
        setOrderMethods({});
        setSalesRepIds({});
        setChequeRefs({});
        setDriverNotes({});
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال التحصيل');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-8 text-center max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle size={64} className="text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-app-text mt-4">تم تسجيل التحصيل</h3>
              <p className="text-sm text-app-text-secondary mt-2">
                تم إرسال بيانات التحصيل بنجاح
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-app-text">تحصيل المبلغ</h3>
                <p className="text-xs text-app-text-secondary">{orders.length} طلب</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {orders.map((order) => {
                const method = orderMethods[order.orderId] as CollectionPaymentMethod | undefined;
                const isExempt = method === 'cheque' || method === 'credit' || method === 'bank_transfer';
                const isTransfer = method === 'bank_transfer';

                return (
                  <div key={order.orderId} className="bg-brand-25 rounded-xl p-4">
                    {/* Order Info */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-app-text">
                          {order.orderNumber ?? `طلب #${order.orderId.slice(0, 8)}`}
                        </p>
                        {order.paymentTerm && (
                          <p className="text-xs text-app-text-secondary">{order.paymentTerm}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-app-text">
                          {formatMoney(order.orderTotal, 'EGP')}
                        </p>
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    {!method && (
                      <p className="text-xs text-red-500 mb-2 font-medium">اختر نوع التحصيل *</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {PAYMENT_METHODS.map((pm) => {
                        const Icon = pm.icon;
                        const isSelected = method === pm.value;
                        return (
                          <button
                            key={pm.value}
                            onClick={() =>
                              setOrderMethods((prev) => ({ ...prev, [order.orderId]: pm.value }))
                            }
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs sm:text-sm font-medium transition-all min-h-[42px] ${
                              isSelected ? pm.color : 'border-gray-200 bg-white text-gray-600 active:bg-brand-25'
                            }`}
                          >
                            <Icon size={15} className="flex-shrink-0" />
                            <span className="truncate">{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Transfer Name Input (Sales Rep Dropdown) */}
                    {isTransfer && (
                      <div className="mt-2">
                        <label className="text-xs font-medium text-app-text-secondary">
                          مندوب المبيعات <span className="text-red-500">*</span>
                        </label>
                        <div className="relative mt-1">
                          <select
                            value={salesRepIds[order.orderId] ?? ''}
                            onChange={(e) =>
                              setSalesRepIds((prev) => ({ ...prev, [order.orderId]: e.target.value }))
                            }
                            className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 pr-8 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent appearance-none"
                          >
                            <option value="">اختر مندوب المبيعات...</option>
                            {salesReps.map((rep) => (
                              <option key={rep.id} value={rep.id}>
                                {rep.full_name ?? rep.id}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Cheque Reference */}
                    {method === 'cheque' && (
                      <div className="mt-2">
                        <label className="text-xs font-medium text-app-text-secondary">
                          رقم الشيك
                        </label>
                        <input
                          type="text"
                          value={chequeRefs[order.orderId] ?? ''}
                          onChange={(e) =>
                            setChequeRefs((prev) => ({ ...prev, [order.orderId]: e.target.value }))
                          }
                          placeholder="رقم الشيك..."
                          className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent mt-1"
                        />
                      </div>
                    )}

                    {/* Driver Notes */}
                    <div className="mt-2">
                      <input
                        type="text"
                        value={driverNotes[order.orderId] ?? ''}
                        onChange={(e) =>
                          setDriverNotes((prev) => ({ ...prev, [order.orderId]: e.target.value }))
                        }
                        placeholder="ملاحظات (اختياري)..."
                        className="w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-xs text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent"
                      />
                    </div>

                    {/* Exempt Badge */}
                    {isExempt && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                        <AlertTriangle size={12} />
                        <span>معفى من التحصيل</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              {error && (
                <p className="text-sm text-red-500 mb-2 text-center">{error}</p>
              )}

              {(() => {
                const unselectedOrders = orders.filter((o) => !orderMethods[o.orderId]);
                const transferOrders = orders.filter(
                  (o) => orderMethods[o.orderId] === 'bank_transfer'
                );
                const missingNames = transferOrders.some(
                  (o) => !salesRepIds[o.orderId]?.trim()
                );
                return (
                  <>
                    {unselectedOrders.length > 0 && (
                      <p className="text-xs text-red-500 mb-2 text-center">
                        يجب اختيار نوع التحصيل لجميع الطلبات ({unselectedOrders.length} متبقي)
                      </p>
                    )}
                    {missingNames && (
                      <p className="text-xs text-orange-600 mb-2 text-center">
                        يجب اختيار مندوب المبيعات لجميع الطلبات المحولة
                      </p>
                    )}
                  </>
                );
              })()}

              <button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  orders.some((o) => !orderMethods[o.orderId]) ||
                  orders.some(
                    (o) =>
                      orderMethods[o.orderId] === 'bank_transfer' &&
                      !salesRepIds[o.orderId]?.trim()
                  )
                }
                className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <DollarSign size={18} />
                    تسجيل التحصيل
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full h-12 text-app-accent font-semibold mt-2"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
