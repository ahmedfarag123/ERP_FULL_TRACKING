import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, User, Package, CheckCircle, ShoppingCart } from 'lucide-react';
import { useOrderStore } from '../stores/orderStore';
import { useUIStore } from '../stores/uiStore';
import { formatMoney } from '../lib/format';
import AppHeader from '../components/AppHeader';
import type { PrepOrderItem, UnavailabilityReason } from '../types';

const statusConfig = {
  pending: { label: 'جديد', bg: 'bg-brand-50', text: 'text-brand-500' },
  preparing: { label: 'قيد التجهيز', bg: 'bg-warning-50', text: 'text-warning-600' },
  ready: { label: 'جاهز', bg: 'bg-success-50', text: 'text-success-600' },
  waiting_pickup: { label: 'بانتظار الاستلام', bg: 'bg-blue-light-50', text: 'text-blue-light-600' },
  handed_over: { label: 'تم التسليم', bg: 'bg-success-50', text: 'text-success-600' },
  cancelled: { label: 'ملغي', bg: 'bg-error-50', text: 'text-error-600' },
};

const itemStatusConfig = {
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

export default function OrderDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const loadOrderDetail = useOrderStore((s) => s.loadOrderDetail);
  const orders = useOrderStore((s) => s.orders);
  const startPreparation = useOrderStore((s) => s.startPreparation);
  const confirmPreparedItem = useOrderStore((s) => s.confirmPreparedItem);
  const completePreparation = useOrderStore((s) => s.completePreparation);
  const bulkMarkAllOrderItemsReady = useOrderStore((s) => s.bulkMarkAllOrderItemsReady);
  const showToast = useUIStore((s) => s.showToast);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PrepOrderItem | null>(null);
  const [approvedQty, setApprovedQty] = useState(0);
  const [shortageReason, setShortageReason] = useState<UnavailabilityReason | ''>('');
  const [shortageNote, setShortageNote] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  const order = orders.find((o) => o.id === id);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    loadOrderDetail(id).finally(() => setIsLoading(false));
  }, [id, loadOrderDetail]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <AppHeader title="تفاصيل الطلب" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-app-accent" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <AppHeader title="تفاصيل الطلب" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-app-text-secondary">الطلب غير موجود</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.preparation_status] ?? statusConfig.pending;
  const progress = order.item_count > 0 ? Math.round((order.confirmed_count / order.item_count) * 100) : 0;
  const canComplete = order.item_count > 0 && order.items.every((item) => item.preparation_status !== 'pending');

  const handlePickOrder = async () => {
    try {
      await startPreparation(order.id);
      showToast('بدأ تجهيز الطلب', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل بدء التجهيز', 'error');
    }
  };

  const closeItemConfirmation = () => {
    setSelectedItem(null);
    setShortageReason('');
    setShortageNote('');
  };

  const handleConfirmItem = async () => {
    if (!order || !selectedItem) return;
    const normalizedQty = Math.max(0, Math.min(Number(approvedQty) || 0, selectedItem.ordered_quantity));

    if (normalizedQty < selectedItem.ordered_quantity && !shortageReason) {
      showToast('يجب تحديد سبب نقص الكمية', 'error');
      return;
    }

    setIsSavingItem(true);
    try {
      await confirmPreparedItem(
        order.id,
        selectedItem.id,
        normalizedQty,
        normalizedQty < selectedItem.ordered_quantity ? shortageReason || null : null,
        shortageNote,
      );
      showToast('تم تحديث حالة المنتج', 'success');
      closeItemConfirmation();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل تحديث المنتج', 'error');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleMarkItemReady = async (item: PrepOrderItem) => {
    setIsSavingItem(true);
    try {
      await confirmPreparedItem(
        order.id,
        item.id,
        item.ordered_quantity,
        null,
        '',
      );
      showToast('تم تحديث حالة المنتج', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل تحديث المنتج', 'error');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleMarkAllReady = async () => {
    if (!order) return;
    const pendingItems = order.items.filter((item) => item.preparation_status === 'pending');
    if (pendingItems.length === 0) return;

    setIsSavingItem(true);
    try {
      const updated = await bulkMarkAllOrderItemsReady(order.id);
      showToast(`تم تحديد ${updated} منتج كجاهز`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل تحديث المنتجات', 'error');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleComplete = async () => {
    try {
      await completePreparation(order.id);
      showToast('تم إكمال التجهيز', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل إكمال التجهيز', 'error');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="تفاصيل الطلب" />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        {/* Order Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-app-text">{order.odoo_order_name ?? `طلب #${order.id.slice(0, 8)}`}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <User size={14} className="text-app-text-secondary" />
                <span className="text-sm text-app-text-secondary">{order.customer_name ?? 'عميل'}</span>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>{status.label}</span>
          </div>
          {order.total_amount != null && (
            <p className="text-lg font-bold text-app-text mt-3">{formatMoney(order.total_amount, order.currency_code ?? 'EGP')}</p>
          )}
        </motion.div>

        {/* Progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-app-text">تقدم التجهيز</h3>
            <span className="text-sm text-app-text-secondary">{order.confirmed_count} من {order.item_count} منتج</span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-app-success rounded-full" />
          </div>
          <p className="text-xs text-app-success font-medium mt-1">{progress}%</p>
        </motion.div>

        {/* Products */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-4 mt-3 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-app-text">المنتجات ({order.item_count})</h3>
            {order.preparation_status === 'preparing' && order.items.some((item) => item.preparation_status === 'pending') && (
              <button
                disabled={isSavingItem}
                onClick={() => void handleMarkAllReady()}
                className="h-8 px-3 rounded-lg bg-app-success text-xs font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                تحديد الكل كجاهز
              </button>
            )}
          </div>
          {order.items.map((item, i) => {
            const itemStatus = itemStatusConfig[item.preparation_status] ?? itemStatusConfig.pending;
            return (
              <div key={item.id} className={`px-4 py-3 ${i < order.items.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-25 flex items-center justify-center">
                    <ShoppingCart size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-app-text">{item.product_name}</p>
                    <p className="text-xs text-app-text-secondary">المطلوب: {item.ordered_quantity} | المعتمد: {item.confirmed_quantity}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${itemStatus.bg} ${itemStatus.text}`}>
                  {itemStatus.label}
                </span>
                </div>
                {order.preparation_status === 'preparing' && item.preparation_status === 'pending' && (
                  <button
                    disabled={isSavingItem}
                    onClick={() => void handleMarkItemReady(item)}
                    className="mt-3 h-10 w-full rounded-xl bg-app-dark text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-70"
                  >
                    جاهز
                  </button>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Actions */}
        {order.preparation_status !== 'ready' && order.preparation_status !== 'handed_over' && (order.preparation_status === 'pending' || canComplete) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mx-4 mt-4">
            {order.preparation_status === 'pending' ? (
              <button onClick={handlePickOrder} className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] transition-transform">
                <Package size={20} />
                استلام الطلب
              </button>
            ) : null}
            {canComplete && (
              <button onClick={handleComplete} className="w-full h-[52px] bg-app-success text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] transition-transform mt-3">
                <CheckCircle size={20} />
                إكمال التجهيز
              </button>
            )}
          </motion.div>
        )}
      </div>

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
              <label className="text-sm font-medium text-app-text mb-1 block">الكمية المطلوبة: {selectedItem.ordered_quantity}</label>
              <input
                type="number"
                min={0}
                max={selectedItem.ordered_quantity}
                value={approvedQty}
                onChange={(event) => setApprovedQty(Number(event.target.value))}
                className="w-full h-12 bg-gray-100 rounded-xl px-4 text-lg font-semibold text-app-text text-center focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>

            {approvedQty < selectedItem.ordered_quantity && (
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

