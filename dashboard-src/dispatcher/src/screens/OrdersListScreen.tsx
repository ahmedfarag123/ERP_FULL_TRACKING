import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, Search, X } from 'lucide-react';
import { useOrderStore } from '../stores/orderStore';
import { useUIStore } from '../stores/uiStore';
import AppHeader from '../components/AppHeader';
import OrderCard from '../components/OrderCard';
import type { PrepOrder, PrepOrderItem } from '../types';

const filters = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'جديد' },
  { key: 'preparing', label: 'قيد التجهيز' },
  { key: 'ready', label: 'جاهز' },
  { key: 'waiting_pickup', label: 'بانتظار الاستلام' },
];

interface OrdersListScreenProps {
  printMode?: boolean;
}

type RunsheetLine = {
  key: string;
  productName: string;
  productRef: string;
  orderedQuantity: number;
  orders: string[];
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 3 }).format(value);
}

function orderLabel(order: PrepOrder) {
  return order.odoo_order_name ?? `طلب #${order.id.slice(0, 8)}`;
}

function normalizeProductKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ');
}

function itemKey(item: PrepOrderItem) {
  return (
    normalizeProductKey(item.product_name) ||
    normalizeProductKey(item.product_code) ||
    normalizeProductKey(item.product_ref) ||
    normalizeProductKey(item.external_product_id) ||
    normalizeProductKey(item.product_id) ||
    item.id
  );
}

function buildRunsheetLines(orders: PrepOrder[]) {
  const lines = new Map<string, RunsheetLine>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = itemKey(item);
      const current = lines.get(key);
      if (current) {
        current.orderedQuantity += item.ordered_quantity;
        current.productRef ||= item.product_code ?? item.product_ref ?? item.external_product_id ?? '';
        if (!current.orders.includes(orderLabel(order))) current.orders.push(orderLabel(order));
        return;
      }

      lines.set(key, {
        key,
        productName: item.product_name ?? item.product_ref ?? item.product_code ?? 'منتج',
        productRef: item.product_code ?? item.product_ref ?? item.external_product_id ?? '',
        orderedQuantity: item.ordered_quantity,
        orders: [orderLabel(order)],
      });
    });
  });

  return Array.from(lines.values()).sort((left, right) => left.productName.localeCompare(right.productName, 'ar'));
}

function openRunsheetPrintWindow(orders: PrepOrder[]) {
  const lines = buildRunsheetLines(orders);
  const printedAt = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const selectedOrderLabels = orders.map(orderLabel).join('، ');

  const rows = lines.map((line, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <strong>${escapeHtml(line.productName)}</strong>
        ${line.productRef ? `<span>${escapeHtml(line.productRef)}</span>` : ''}
      </td>
      <td>${formatQuantity(line.orderedQuantity)}</td>
      <td>${escapeHtml(line.orders.join('، '))}</td>
    </tr>
  `).join('');

  const html = `
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>قائمة تجهيز المنتجات</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; font-family: Arial, Tahoma, sans-serif; color: #111827; direction: rtl; }
      header { border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 18px; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 3px 0; font-size: 12px; color: #4b5563; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
      th { background: #f3f4f6; text-align: right; font-weight: 700; }
      td:first-child, th:first-child { width: 42px; text-align: center; }
      td:nth-child(3), th:nth-child(3) { width: 90px; text-align: center; font-weight: 700; }
      strong { display: block; font-size: 13px; }
      span { display: block; margin-top: 3px; color: #6b7280; }
      footer { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; font-size: 12px; }
      .signature { border-top: 1px solid #111827; padding-top: 8px; }
      @page { size: A4; margin: 12mm; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <header>
      <h1>قائمة تجهيز المنتجات</h1>
      <p>الطلبات: ${escapeHtml(selectedOrderLabels)}</p>
      <p>عدد الطلبات: ${orders.length} | عدد المنتجات: ${lines.length} | وقت الطباعة: ${escapeHtml(printedAt)}</p>
    </header>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>الطلبات</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="4">لا توجد منتجات للطباعة</td></tr>'}</tbody>
    </table>
    <footer>
      <div class="signature">مسؤول التجهيز</div>
      <div class="signature">مراجعة المخزن</div>
    </footer>
  </body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=1024,height=768');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);

  return true;
}

export default function OrdersListScreen({ printMode = false }: OrdersListScreenProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loadOrders = useOrderStore((s) => s.loadOrders);
  const loadOrderDetail = useOrderStore((s) => s.loadOrderDetail);
  const selectOrder = useOrderStore((s) => s.selectOrder);
  const getFilteredOrders = useOrderStore((s) => s.getFilteredOrders);
  const statusFilter = useOrderStore((s) => s.statusFilter);
  const setStatusFilter = useOrderStore((s) => s.setStatusFilter);
  const searchQuery = useOrderStore((s) => s.searchQuery);
  const setSearchQuery = useOrderStore((s) => s.setSearchQuery);
  const isLoading = useOrderStore((s) => s.isLoading);
  const error = useOrderStore((s) => s.error);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const showToast = useUIStore((s) => s.showToast);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const isPrintMode = printMode || searchParams.get('print') === '1';

  const filteredOrders = getFilteredOrders();
  const selectedOrders = useMemo(
    () => selectedOrderIds
      .map((id) => filteredOrders.find((order) => order.id === id))
      .filter((order): order is PrepOrder => Boolean(order)),
    [filteredOrders, selectedOrderIds],
  );

  useEffect(() => {
    loadOrders();
    setActiveTab('orders');
  }, [loadOrders, setActiveTab]);

  useEffect(() => {
    if (!isPrintMode) setSelectedOrderIds([]);
  }, [isPrintMode]);

  const openOrderDetail = (order: PrepOrder) => {
    selectOrder(order.id);
    navigate(`/orders/${order.id}`);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((current) => (
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId]
    ));
  };

  const handlePrintSelected = async () => {
    if (selectedOrderIds.length === 0) {
      showToast('اختر طلب واحد على الأقل للطباعة', 'error');
      return;
    }

    setIsPrinting(true);
    try {
      const detailedOrders = (await Promise.all(selectedOrderIds.map((orderId) => loadOrderDetail(orderId))))
        .filter((order): order is PrepOrder => Boolean(order));
      const productCount = detailedOrders.reduce((sum, order) => sum + order.items.length, 0);

      if (productCount === 0) {
        showToast('لا توجد منتجات في الطلبات المحددة', 'error');
        return;
      }

      const opened = openRunsheetPrintWindow(detailedOrders);
      if (!opened) {
        showToast('اسمح بفتح النافذة لإتمام الطباعة', 'error');
        return;
      }

      showToast('تم تجهيز قائمة الطباعة', 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : 'فشل تجهيز الطباعة', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title={isPrintMode ? 'طباعة الطلبات' : 'الطلبات'} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">
        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الطلب أو اسم العميل..." className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent shadow-card" />
          </div>
        </div>

        <div className="px-4 mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${statusFilter === f.key ? 'bg-app-dark text-white' : 'bg-white text-app-text-secondary shadow-card'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {isPrintMode && (
          <div className="px-4 mt-3 flex items-center justify-between">
            <p className="text-xs text-app-text-secondary">
              {selectedOrders.length > 0 ? `${selectedOrders.length} طلب محدد` : 'اختر طلب واحد أو أكثر للطباعة'}
            </p>
            {selectedOrders.length > 0 && (
              <button onClick={() => setSelectedOrderIds([])} className="h-9 px-3 rounded-full bg-white text-xs font-semibold text-app-text-secondary shadow-card flex items-center gap-1.5">
                <X size={14} />
                إلغاء التحديد
              </button>
            )}
          </div>
        )}

        <div className="px-4 mt-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-app-accent" />
            </div>
          ) : error ? (
            <div className="rounded-xl bg-error-50 p-4 text-center">
              <p className="text-sm font-medium text-error-600">{error}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-app-text-secondary">لا توجد طلبات</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isSelected={isPrintMode && selectedOrderIds.includes(order.id)}
                selectionMode={isPrintMode}
                onClick={() => isPrintMode ? toggleOrderSelection(order.id) : openOrderDetail(order)}
                onOpenDetail={isPrintMode ? () => openOrderDetail(order) : undefined}
              />
            ))
          )}
        </div>
      </div>

      {isPrintMode && selectedOrderIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4">
          <button
            onClick={handlePrintSelected}
            disabled={isPrinting}
            className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-card active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <Printer size={20} />
            {isPrinting ? 'جاري تجهيز الطباعة...' : `طباعة ${selectedOrderIds.length} طلب`}
          </button>
        </div>
      )}
    </div>
  );
}
