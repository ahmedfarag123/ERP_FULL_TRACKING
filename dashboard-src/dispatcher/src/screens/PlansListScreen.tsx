import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, Search, X } from 'lucide-react';
import { usePlanStore } from '../stores/planStore';
import { useUIStore } from '../stores/uiStore';
import AppHeader from '../components/AppHeader';
import PlanCard from '../components/PlanCard';
import type { DispatcherPlan, DispatcherPlanItem, PlanBucket } from '../types';

const bucketFilters: { key: PlanBucket; label: string }[] = [
  { key: 'active', label: 'نشطة' },
  { key: 'missed', label: 'فائتة' },
  { key: 'completed', label: 'مكتملة' },
];

const statusFilters = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'جديد' },
  { key: 'preparing', label: 'قيد التجهيز' },
  { key: 'ready', label: 'جاهز' },
];

interface PlansListScreenProps {
  printMode?: boolean;
}

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

function openRunsheetPrintWindow(plan: DispatcherPlan, items: DispatcherPlanItem[]) {
  const printedAt = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());

  const rows = items.map((item, index) => {
    const statusLabel =
      item.preparation_status === 'ready' ? 'جاهز' :
      item.preparation_status === 'partial' ? 'جزئي' :
      item.preparation_status === 'unavailable' ? 'غير متوفر' : 'معلق';
    const statusClass =
      item.preparation_status === 'ready' ? 'color:#16a34a' :
      item.preparation_status === 'partial' ? 'color:#d97706' :
      item.preparation_status === 'unavailable' ? 'color:#dc2626' : 'color:#6b7280';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${escapeHtml(item.product_name)}</strong>
          ${item.product_ref ? `<span>${escapeHtml(item.product_ref)}</span>` : ''}
        </td>
        <td>${formatQuantity(item.total_requested_quantity)}</td>
        <td>${formatQuantity(item.approved_quantity)}</td>
        <td style="${statusClass};font-weight:600">${statusLabel}</td>
        ${item.shortage_reason ? `<td>${escapeHtml(item.shortage_reason)}</td>` : '<td>—</td>'}
      </tr>`;
  }).join('');

  const html = `
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>قائمة تجهيز الخطة</title>
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
      td:nth-child(3), th:nth-child(3),
      td:nth-child(4), th:nth-child(4) { width: 80px; text-align: center; font-weight: 700; }
      td:nth-child(5), th:nth-child(5) { width: 70px; text-align: center; }
      td:nth-child(6), th:nth-child(6) { width: 100px; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <header>
      <h1>قائمة تجهيز الخطة</h1>
      <p><strong>رقم الخطة:</strong> ${escapeHtml(plan.plan_reference)}</p>
      <p><strong>السائق:</strong> ${escapeHtml(plan.driver_name)}</p>
      <p><strong>التاريخ:</strong> ${escapeHtml(plan.planned_date)}</p>
      <p><strong>مُعداد القائمة:</strong> ${escapeHtml(printedAt)}</p>
    </header>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>المنتج</th>
          <th>الكمية المطلوبة</th>
          <th>الكمية المعتمدة</th>
          <th>الحالة</th>
          <th>سبب النقص</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload = () => { window.print(); }</script>
  </body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'width=900,height=650');
  return !!w;
}

export default function PlansListScreen({ printMode = false }: PlansListScreenProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loadPlans = usePlanStore((s) => s.loadPlans);
  const loadPlanDetail = usePlanStore((s) => s.loadPlanDetail);
  const selectPlan = usePlanStore((s) => s.selectPlan);
  const getFilteredPlans = usePlanStore((s) => s.getFilteredPlans);
  const statusFilter = usePlanStore((s) => s.statusFilter);
  const setStatusFilter = usePlanStore((s) => s.setStatusFilter);
  const planBucketFilter = usePlanStore((s) => s.planBucketFilter);
  const setPlanBucketFilter = usePlanStore((s) => s.setPlanBucketFilter);
  const searchQuery = usePlanStore((s) => s.searchQuery);
  const setSearchQuery = usePlanStore((s) => s.setSearchQuery);
  const isLoading = usePlanStore((s) => s.isLoading);
  const error = usePlanStore((s) => s.error);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const showToast = useUIStore((s) => s.showToast);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const isPrintMode = printMode || searchParams.get('print') === '1';

  const filteredPlans = getFilteredPlans();
  const selectedPlan = useMemo(
    () => selectedPlanId ? filteredPlans.find((p) => p.plan_id === selectedPlanId) ?? null : null,
    [filteredPlans, selectedPlanId],
  );

  const plans = usePlanStore((s) => s.plans);
  const bucketCounts = useMemo(() => ({
    active: plans.filter((p) => p.plan_bucket === 'active').length,
    missed: plans.filter((p) => p.plan_bucket === 'missed').length,
    completed: plans.filter((p) => p.plan_bucket === 'completed').length,
  }), [plans]);

  useEffect(() => {
    loadPlans();
    setActiveTab('plans');
  }, [loadPlans, setActiveTab]);

  useEffect(() => {
    if (!isPrintMode) setSelectedPlanId(null);
  }, [isPrintMode]);

  const openPlanDetail = (plan: DispatcherPlan) => {
    if (plan.plan_bucket !== 'active') return;
    selectPlan(plan.plan_id);
    navigate(`/plans/${plan.plan_id}`);
  };

  const handlePrintSelected = async () => {
    if (!selectedPlanId || !selectedPlan) {
      showToast('اختر خطة واحدة على الأقل للطباعة', 'error');
      return;
    }

    setIsPrinting(true);
    try {
      await loadPlanDetail(selectedPlanId);
      const { planItems } = usePlanStore.getState();

      if (planItems.length === 0) {
        showToast('لا توجد منتجات في الخطة المحددة', 'error');
        return;
      }

      const opened = openRunsheetPrintWindow(selectedPlan, planItems);
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
      <AppHeader title={isPrintMode ? 'طباعة الخطط' : 'الخطط'} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">
        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الخطة أو اسم السائق..." className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent shadow-card" />
          </div>
        </div>

        {/* Bucket tabs */}
        <div className="px-4 mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {bucketFilters.map((f) => {
            const count = bucketCounts[f.key];
            return (
              <button key={f.key} onClick={() => setPlanBucketFilter(f.key)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${planBucketFilter === f.key ? 'bg-app-dark text-white' : 'bg-white text-app-text-secondary shadow-card'}`}>
                {f.label}
                {count > 0 && <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Status filters (active bucket only) */}
        {planBucketFilter === 'active' && (
          <div className="px-4 mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {statusFilters.map((f) => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${statusFilter === f.key ? 'bg-brand-100 text-brand-700' : 'bg-white text-app-text-secondary shadow-card'}`}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {isPrintMode && (
          <div className="px-4 mt-3 flex items-center justify-between">
            <p className="text-xs text-app-text-secondary">
              {selectedPlan ? `محدد: ${selectedPlan.plan_reference ?? selectedPlan.plan_id}` : 'اختر خطة للطباعة'}
            </p>
            {selectedPlan && (
              <button onClick={() => setSelectedPlanId(null)} className="h-9 px-3 rounded-full bg-white text-xs font-semibold text-app-text-secondary shadow-card flex items-center gap-1.5">
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
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-app-text-secondary">لا توجد خطط</p>
            </div>
          ) : (
            filteredPlans.map((plan) => (
              <PlanCard
                key={plan.plan_id}
                plan={plan}
                onClick={() => isPrintMode ? setSelectedPlanId(plan.plan_id) : openPlanDetail(plan)}
              />
            ))
          )}
        </div>
      </div>

      {isPrintMode && selectedPlanId && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4">
          <button
            onClick={handlePrintSelected}
            disabled={isPrinting}
            className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-card active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <Printer size={20} />
            {isPrinting ? 'جاري تجهيز الطباعة...' : 'طباعة القائمة'}
          </button>
        </div>
      )}
    </div>
  );
}
