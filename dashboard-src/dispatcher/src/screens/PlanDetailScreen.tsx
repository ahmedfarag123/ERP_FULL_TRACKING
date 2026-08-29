import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, User, Package, CheckCircle, ShoppingCart, ChevronDown, ChevronUp, Truck, Calendar, Loader2 } from 'lucide-react';
import { usePlanStore } from '../stores/planStore';
import { useUIStore } from '../stores/uiStore';
import AppHeader from '../components/AppHeader';
import type { DispatcherPlanItem, DispatcherPlanOrder, UnavailabilityReason } from '../types';

const itemStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'معلق', bg: 'bg-gray-100', text: 'text-gray-600' },
  ready: { label: 'جاهز', bg: 'bg-success-50', text: 'text-success-600' },
  partial: { label: 'جزئي', bg: 'bg-warning-50', text: 'text-warning-600' },
  unavailable: { label: 'غير متوفر', bg: 'bg-error-50', text: 'text-error-600' },
};

const shortageReasons: Array<{ value: UnavailabilityReason; label: string }> = [
  { value: 'out_of_stock', label: 'نفاد المخزون' },
  { value: 'damaged', label: 'تالف' },
  { value: 'expired', label: 'منتهي الصلاحية' },
  { value: 'customer_removal', label: 'إزالة بطلب العميل' },
  { value: 'warehouse_issue', label: 'مشكلة في المخزن' },
  { value: 'wrong_product', label: 'منتج غير مطابق' },
  { value: 'other', label: 'أخرى' },
];

export default function PlanDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const loadPlanDetail = usePlanStore((s) => s.loadPlanDetail);
  const planItems = usePlanStore((s) => s.planItems);
  const planOrders = usePlanStore((s) => s.planOrders);
  const startPlanPreparation = usePlanStore((s) => s.startPlanPreparation);
  const confirmPlanItem = usePlanStore((s) => s.confirmPlanItem);
  const completePlanPreparation = usePlanStore((s) => s.completePlanPreparation);
  const bulkMarkAllReady = usePlanStore((s) => s.bulkMarkAllReady);
  const plans = usePlanStore((s) => s.plans);
  const showToast = useUIStore((s) => s.showToast);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<DispatcherPlanItem | null>(null);
  const [approvedQty, setApprovedQty] = useState(0);
  const [shortageReason, setShortageReason] = useState<UnavailabilityReason | ''>('');
  const [shortageNote, setShortageNote] = useState('');
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const navigate = useNavigate();

  const plan = plans.find((p) => p.plan_id === id);
  const isSavingItem = savingItemId !== null;

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    loadPlanDetail(id).finally(() => setIsLoading(false));
  }, [id, loadPlanDetail]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <AppHeader title="تفاصيل الخطة" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-app-accent" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <AppHeader title="تفاصيل الخطة" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-app-text-secondary">الخطة غير موجودة</p>
        </div>
      </div>
    );
  }

  const progress = plan.total_items > 0 ? Math.round((plan.confirmed_items / plan.total_items) * 100) : 0;
  const canComplete = plan.total_items > 0 && planItems.every((item) => item.preparation_status !== 'pending');
  const showProducts = plan.preparation_status !== 'pending' && plan.preparation_status !== 'cancelled';

  const handleStartPreparation = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await startPlanPreparation(plan.plan_id);
      showToast('بدأ تجهيز الخطة', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل بدء التجهيز', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const openItemConfirmation = (item: DispatcherPlanItem) => {
    setSelectedItem(item);
    setApprovedQty(item.approved_quantity || item.total_requested_quantity);
    setShortageReason('');
    setShortageNote('');
  };

  const closeItemConfirmation = () => {
    setSelectedItem(null);
    setShortageReason('');
    setShortageNote('');
  };

  const handleConfirmItem = async () => {
    if (!selectedItem) return;
    const normalizedQty = Math.max(0, Math.min(Number(approvedQty) || 0, selectedItem.total_requested_quantity));

    if (normalizedQty < selectedItem.total_requested_quantity && !shortageReason) {
      showToast('يجب تحديد سبب نقص الكمية', 'error');
      return;
    }

    setSavingItemId(selectedItem.id);
    try {
      await confirmPlanItem(
        selectedItem.plan_preparation_id,
        selectedItem.id,
        normalizedQty,
        normalizedQty < selectedItem.total_requested_quantity ? shortageReason || null : null,
        shortageNote,
      );
      showToast('تم تحديث حالة المنتج', 'success');
      closeItemConfirmation();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل تحديث المنتج', 'error');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleMarkItemReady = async (item: DispatcherPlanItem) => {
    setSavingItemId(item.id);
    try {
      await confirmPlanItem(
        item.plan_preparation_id,
        item.id,
        item.total_requested_quantity,
        null,
        '',
      );
      showToast('تم تحديث حالة المنتج', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل تحديث المنتج', 'error');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleMarkAllReady = async () => {
    const pendingItems = planItems.filter((item) => item.preparation_status === 'pending');
    if (pendingItems.length === 0) return;

    setSavingItemId('bulk');
    try {
      const updated = await bulkMarkAllReady(plan.plan_id);
      showToast(`تم تحديد ${updated} منتج كجاهز`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل تحديث المنتجات', 'error');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      await completePlanPreparation(plan.plan_id);
      showToast('تم إكمال تجهيز الخطة بنجاح', 'success');
      navigate('/plans');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل إكمال التجهيز', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="تفاصيل الخطة" />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        {/* Plan Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-app-text">{plan.plan_reference ?? `خطة #${plan.plan_id.slice(0, 8)}`}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Truck size={14} className="text-app-text-secondary" />
                <span className="text-sm text-app-text-secondary">{plan.driver_name ?? 'سائق'}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar size={14} className="text-app-text-secondary" />
                <span className="text-sm text-app-text-secondary">{plan.planned_date ?? '—'}</span>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
              plan.preparation_status === 'ready' ? 'bg-success-50 text-success-600' :
              plan.preparation_status === 'preparing' ? 'bg-warning-50 text-warning-600' :
              plan.preparation_status === 'cancelled' ? 'bg-error-50 text-error-600' :
              'bg-brand-50 text-brand-500'
            }`}>
              {plan.preparation_status === 'ready' ? 'جاهز' :
               plan.preparation_status === 'preparing' ? 'قيد التجهيز' :
               plan.preparation_status === 'cancelled' ? 'ملغي' : 'جديد'}
            </span>
          </div>
        </motion.div>

        {/* Progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-app-text">تقدم التجهيز</h3>
            <span className="text-sm text-app-text-secondary">{plan.confirmed_items} من {plan.total_items} منتج</span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-app-success rounded-full" />
          </div>
          <p className="text-xs text-app-success font-medium mt-1">{progress}%</p>
        </motion.div>

        {/* Products */}
        {showProducts && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-4 mt-3 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-app-text">المنتجات ({plan.total_items})</h3>
            {plan.preparation_status === 'preparing' && planItems.some((item) => item.preparation_status === 'pending') && (
              <button
                disabled={isSavingItem}
                onClick={() => void handleMarkAllReady()}
                className="h-8 px-3 rounded-lg bg-app-success text-xs font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center gap-1.5"
              >
                {savingItemId === 'bulk' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                تحديد الكل كجاهز
              </button>
            )}
          </div>
          {planItems.map((item, i) => {
            const itemStatus = itemStatusConfig[item.preparation_status] ?? itemStatusConfig.pending;
            return (
              <div key={item.id} className={`px-4 py-3 ${i < planItems.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-25 flex items-center justify-center">
                      <ShoppingCart size={18} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-app-text">{item.product_name}</p>
                      <p className="text-xs text-app-text-secondary">المطلوب: {item.total_requested_quantity} | المعتمد: {item.approved_quantity}</p>
                      {item.shortage_reason && (
                        <p className="text-xs text-error-600 mt-0.5">سبب النقص: {shortageReasons.find((r) => r.value === item.shortage_reason)?.label ?? item.shortage_reason}</p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${itemStatus.bg} ${itemStatus.text}`}>
                    {itemStatus.label}
                  </span>
                </div>
                {plan.preparation_status === 'preparing' && item.preparation_status === 'pending' && (
                  <button
                    disabled={isSavingItem}
                    onClick={() => void handleMarkItemReady(item)}
                    className="mt-3 h-10 w-full rounded-xl bg-app-dark text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-70"
                  >
                    {savingItemId === item.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        
                      </span>
                    ) : (
                      'جاهز'
                    )}
                  </button>
                )}
                {plan.preparation_status === 'preparing' && item.preparation_status !== 'pending' && (
                  <button
                    onClick={() => openItemConfirmation(item)}
                    className="mt-3 h-10 w-full rounded-xl border border-gray-200 text-sm font-semibold text-app-text-secondary active:scale-[0.98] transition-transform"
                  >
                    تعديل
                  </button>
                )}
              </div>
            );
          })}
          {planItems.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-app-text-secondary">لا توجد منتجات في هذه الخطة</p>
            </div>
          )}
          </motion.div>
        )}

        {/* Orders Section */}
        {planOrders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mx-4 mt-3 bg-white rounded-xl shadow-card overflow-hidden">
            <button
              onClick={() => setShowOrders(!showOrders)}
              className="w-full px-4 py-3 border-b border-gray-100 flex items-center justify-between"
            >
              <h3 className="text-sm font-semibold text-app-text">الطلبات ({planOrders.length})</h3>
              {showOrders ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            <AnimatePresence>
              {showOrders && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  {planOrders.map((order, i) => (
                    <OrderRow key={order.order_id} order={order} isLast={i === planOrders.length - 1} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Actions */}
        {plan.preparation_status !== 'ready' && (plan.preparation_status === 'pending' || plan.preparation_status === 'cancelled' || canComplete) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mx-4 mt-4">
            {(plan.preparation_status === 'pending' || plan.preparation_status === 'cancelled') ? (
              <button disabled={isStarting} onClick={handleStartPreparation} className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] transition-transform disabled:opacity-70">
                {isStarting ? <Loader2 size={20} className="animate-spin" /> : <Package size={20} />}
                {plan.preparation_status === 'cancelled' ? 'إعادة التجهيز' : 'استلام الخطة'}
              </button>
            ) : null}
            {canComplete && (
              <button disabled={isCompleting} onClick={handleComplete} className="w-full h-[52px] bg-app-success text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] transition-transform mt-3 disabled:opacity-70">
                {isCompleting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                {isCompleting ? 'جاري الإكمال...' : 'إكمال التجهيز'}
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Item Confirmation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-app-light flex items-center justify-center">
                <CheckCircle size={20} className="text-app-success" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app-text">تأكيد الكمية</h3>
                <p className="text-xs text-app-text-secondary">{selectedItem.product_name}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-app-text mb-1 block">الكمية المطلوبة (إجمالي الخطة): {selectedItem.total_requested_quantity}</label>
              <input
                type="number"
                min={0}
                max={selectedItem.total_requested_quantity}
                value={approvedQty}
                onChange={(event) => setApprovedQty(Number(event.target.value))}
                className="w-full h-12 bg-gray-100 rounded-xl px-4 text-lg font-semibold text-app-text text-center focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>

            {approvedQty < selectedItem.total_requested_quantity && (
              <div className="mb-4 space-y-3">
                <div className="rounded-xl bg-warning-50 p-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-warning-600" />
                  <span className="text-xs text-warning-700">يجب تحديد سبب نقص الكمية</span>
                </div>
                <select
                  value={shortageReason}
                  onChange={(event) => setShortageReason(event.target.value as UnavailabilityReason)}
                  className="w-full h-11 rounded-xl bg-gray-100 px-3 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                >
                  <option value="">اختر السبب</option>
                  {shortageReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
                <textarea
                  value={shortageNote}
                  onChange={(event) => setShortageNote(event.target.value)}
                  placeholder="ملاحظات اختيارية"
                  className="w-full min-h-[76px] rounded-xl bg-gray-100 p-3 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={closeItemConfirmation} className="flex-1 h-12 border border-gray-200 rounded-xl font-semibold text-app-text-secondary active:scale-95 transition-transform">
                إلغاء
              </button>
              <button disabled={isSavingItem} onClick={handleConfirmItem} className="flex-1 h-12 bg-app-dark text-white rounded-xl font-semibold active:scale-95 transition-transform disabled:opacity-50">
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, isLast }: { order: DispatcherPlanOrder; isLast: boolean }) {
  return (
    <div className={`px-4 py-3 ${!isLast ? 'border-b border-gray-50' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-25 flex items-center justify-center">
            <User size={14} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-app-text">{order.odoo_order_name ?? `طلب #${order.order_id.slice(0, 8)}`}</p>
            <p className="text-xs text-app-text-secondary">{order.customer_name ?? 'عميل'} — {order.items_count} منتج</p>
          </div>
        </div>
      </div>
    </div>
  );
}
