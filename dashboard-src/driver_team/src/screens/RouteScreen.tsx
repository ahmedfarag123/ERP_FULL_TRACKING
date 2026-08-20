import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Lock,
  MapPin,
  Package,
  PlayCircle,
  Navigation,
  XCircle,
} from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useUIStore } from '@/stores/uiStore';
import AppHeader from '@/components/AppHeader';
import type { DeliveryPlan, Shipment } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

function openNavigation(coordinates: { lat: number; lng: number } | null, address: string | null | undefined) {
  if (coordinates) {
    window.open(`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`);
  } else if (address) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  }
}

function planStatusLabel(status: string | null) {
  switch (status) {
    case 'in_progress': return 'جاري التنفيذ';
    case 'pending': return 'في الانتظار';
    case 'completed': return 'مكتمل';
    case 'cancelled': return 'ملغي';
    case 'unassigned': return 'غير مسندة';
    default: return status ?? '';
  }
}

function planStatusColor(status: string | null) {
  switch (status) {
    case 'in_progress': return 'bg-app-accent text-white';
    case 'pending': return 'bg-app-warning text-white';
    case 'completed': return 'bg-app-success text-white';
    case 'cancelled': return 'bg-gray-400 text-white';
    case 'unassigned': return 'bg-gray-300 text-white';
    default: return 'bg-gray-200 text-gray-600';
  }
}

function planProgressColor(pct: number) {
  if (pct === 100) return 'bg-app-success';
  if (pct > 0) return 'bg-app-accent';
  return 'bg-gray-200';
}

/* ─── Plan Card (Main View) ──────────────────────────── */

function PlanCard({ plan, onSelect }: { plan: DeliveryPlan; onSelect: () => void }) {
  const progressPct = plan.totalShipments > 0
    ? Math.round(((plan.deliveredCount + plan.failedCount) / plan.totalShipments) * 100)
    : 0;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-xl p-4 shadow-card active:scale-[0.98] cursor-pointer transition-transform"
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-app-dark flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-app-text text-sm">
              {plan.plannedDate ? (() => {
                const d = new Date(plan.plannedDate + "T00:00:00");
                const days = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
                const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
                return `خط سير ${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
              })() : (plan.planReference ?? `خطة ${plan.id.slice(0, 8)}`)}
            </p>
            {plan.plannedDate && (
              <p className="text-xs text-app-text-secondary">{plan.plannedDate}</p>
            )}
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${planStatusColor(plan.planStatus)}`}>
          {planStatusLabel(plan.planStatus)}
        </span>
      </div>

      {/* Districts */}
      {plan.districts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {plan.districts.map((district) => (
            <span
              key={district}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-app-dark bg-gray-100 px-2 py-0.5 rounded-full"
            >
              <MapPin size={10} />
              {district}
            </span>
          ))}
        </div>
      )}

      {/* Progress */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${planProgressColor(progressPct)}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-app-text-secondary">
          <span>{plan.totalShipments} شحنة</span>
          <span>{progressPct}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {plan.deliveredCount > 0 && (
            <span className="text-app-success font-medium">{plan.deliveredCount} تم</span>
          )}
          {plan.pendingCount > 0 && (
            <span className="text-app-warning font-medium">{plan.pendingCount} معلق</span>
          )}
          {plan.failedCount > 0 && (
            <span className="text-error-500 font-medium">{plan.failedCount} فشل</span>
          )}
        </div>
        <ChevronLeft size={16} className="text-gray-400" />
      </div>
    </motion.div>
  );
}

/* ─── Shipment Stop Item (Drill-down View) ───────────── */

function ShipmentStopItem({
  shipment,
  index,
  isLast,
  stopStatus,
}: {
  shipment: Shipment;
  index: number;
  isLast: boolean;
  stopStatus: string;
}) {
  const navigate = useNavigate();
  const selectShipment = useDeliveryStore((s) => s.selectShipment);
  const showToast = useUIStore((s) => s.showToast);

  const isLocked = stopStatus === 'locked';
  const isCurrent = stopStatus === 'current';
  const canNavigate =
    stopStatus === 'current' ||
    stopStatus === 'completed' ||
    stopStatus === 'failed' ||
    stopStatus === 'out-of-sequence';

  const handleClick = () => {
    if (isLocked) {
      showToast('أكمل نقطة التوقف السابقة قبل فتح هذا الطلب.', 'error');
      return;
    }
    selectShipment(shipment.id);
    navigate(`/deliveries/${shipment.id}`);
  };

  return (
    <motion.div key={shipment.id} variants={itemVariants} className="relative">
      {/* Connector Line */}
      {!isLast && (
        <div
          className={`absolute right-[18px] top-10 w-0.5 h-[calc(100%+8px)] ${
            stopStatus === 'completed' ? 'bg-app-success' : 'bg-gray-200'
          }`}
        />
      )}

      {/* Stop Item */}
      <div className="flex items-start gap-3 pb-2">
        {/* Stop Number / Icon */}
        <button
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold mt-1 ${
            stopStatus === 'completed'
              ? 'bg-app-success text-white'
              : stopStatus === 'failed'
              ? 'bg-error-500 text-white'
              : stopStatus === 'out-of-sequence'
              ? 'bg-app-warning text-white'
              : isCurrent
              ? 'bg-app-dark text-white'
              : 'bg-gray-200 text-gray-500'
          } ${isCurrent ? 'animate-pulse-dot' : ''}`}
          onClick={handleClick}
        >
          {stopStatus === 'completed' ? (
            <CheckCircle size={16} />
          ) : stopStatus === 'failed' ? (
            <XCircle size={16} />
          ) : stopStatus === 'out-of-sequence' ? (
            <AlertTriangle size={16} />
          ) : isLocked ? (
            <Lock size={15} />
          ) : (
            index + 1
          )}
        </button>

        {/* Stop Content */}
        <div
          className={`flex-1 bg-white rounded-xl p-3 shadow-card transition-transform ${
            !isLocked ? 'active:scale-[0.98] cursor-pointer' : 'opacity-70'
          }`}
          onClick={handleClick}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-app-text text-sm truncate">
                {shipment.customerName ?? `#${shipment.id}`}
              </p>
              {shipment.address && (
                <p className="text-xs text-app-text-secondary mt-0.5 truncate">
                  {shipment.address}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Package size={12} />
                  {shipment.items.length === 0
                    ? 'تفاصيل الأصناف غير متاحة'
                    : (shipment.skuCount ?? shipment.totalItems ?? shipment.items?.length ?? 0) > 0
                    ? `${shipment.skuCount ?? shipment.totalItems} بنود`
                    : `${shipment.items?.length ?? 0} بنود`}
                </span>
                {shipment.shipmentCount && shipment.shipmentCount > 1 ? (
                  <span className="text-xs font-semibold text-app-accent">
                    {shipment.shipmentCount} شحنات
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!shipment.coordinates && (
                  <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-600">
                    موقع غير مؤكد
                  </span>
                )}
                {stopStatus === 'out-of-sequence' && (
                  <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-600">
                    خارج الترتيب
                  </span>
                )}
              </div>
            </div>

            {/* Right side: status + navigate */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
              {stopStatus === 'completed' && (
                <span className="flex items-center gap-1 text-xs text-app-success font-medium">
                  <CheckCircle size={14} /> تم
                </span>
              )}
              {stopStatus === 'failed' && (
                <span className="flex items-center gap-1 text-xs text-error-500 font-semibold">
                  <XCircle size={14} /> فشلت
                </span>
              )}
              {stopStatus === 'out-of-sequence' && (
                <span className="flex items-center gap-1 text-xs text-app-warning font-semibold">
                  <AlertTriangle size={14} /> خارج الترتيب
                </span>
              )}
              {isCurrent && (
                <span className="flex items-center gap-1 text-xs text-app-accent font-semibold">
                  <PlayCircle size={14} /> الآن
                </span>
              )}
              {isLocked && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Lock size={14} /> مقفل
                </span>
              )}

              {canNavigate && (shipment.coordinates || shipment.address) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openNavigation(shipment.coordinates, shipment.address);
                  }}
                  className="flex items-center gap-1 text-xs text-app-dark font-semibold bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  <Navigation size={12} />
                  {shipment.coordinates ? 'ملاحة الموقع' : 'انتقال'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Route Screen ──────────────────────────────── */

export default function RouteScreen() {
  const {
    getPlans,
    getPlanShipments,
    selectPlan,
    selectedPlanId,
    loadShipments,
    getRouteGate,
  } = useDeliveryStore();
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  useEffect(() => {
    loadShipments();
    setActiveTab('route');
  }, [loadShipments, setActiveTab]);

  const plans = getPlans();

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find((p) => p.id === selectedPlanId) ?? null;
  }, [plans, selectedPlanId]);

  const planShipments = useMemo(() => {
    if (!selectedPlanId) return [];
    return getPlanShipments(selectedPlanId);
  }, [selectedPlanId, getPlanShipments]);

  const { nextActionableShipmentId, outOfSequenceShipmentIds } = getRouteGate(selectedPlanId ?? undefined);

  const getStopStatus = (shipmentId: string, shipmentStatus: string): string => {
    if (shipmentStatus === 'failed') return 'failed';
    if (outOfSequenceShipmentIds.has(shipmentId)) return 'out-of-sequence';
    if (shipmentStatus === 'delivered') return 'completed';
    if (shipmentId === nextActionableShipmentId) return 'current';
    return 'locked';
  };

  /* ─── Drill-down View (Plan Shipments) ─── */
  if (selectedPlan) {
    const delivered = planShipments.filter((s) => s.status === 'delivered').length;
    const failed = planShipments.filter((s) => s.status === 'failed').length;
    const total = planShipments.length;
    const progressPct = total > 0 ? Math.round(((delivered + failed) / total) * 100) : 0;

    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <AppHeader
          title={selectedPlan.plannedDate ? (() => {
            const d = new Date(selectedPlan.plannedDate + "T00:00:00");
            const days = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
            const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
            return `خط سير ${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
          })() : (selectedPlan.planReference ?? 'تفاصيل الخطة')}
          showBack
          onBack={() => selectPlan(null)}
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto no-scrollbar pb-20"
        >
          {/* Plan Info Card */}
          <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-semibold text-app-text">
                {selectedPlan.plannedDate ? (() => {
                  const d = new Date(selectedPlan.plannedDate + "T00:00:00");
                  const days = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
                  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
                  return `خط سير ${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
                })() : (selectedPlan.planReference ?? `خطة ${selectedPlan.id.slice(0, 8)}`)}
              </h3>
              <span className="text-sm text-app-text-secondary">
                {delivered} من {total} تم تسليمها
              </span>
            </div>
            {selectedPlan.districts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedPlan.districts.map((district) => (
                  <span
                    key={district}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-app-dark bg-gray-100 px-2 py-0.5 rounded-full"
                  >
                    <MapPin size={10} />
                    {district}
                  </span>
                ))}
              </div>
            )}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${progressPct === 100 ? 'bg-app-success' : 'bg-app-accent'}`}
              />
            </div>
            <p className="text-xs text-app-text-secondary mt-2">
              {total} نقاط توقف · {progressPct}% تم تسليمها{failed > 0 ? ` · ${failed} فشلت` : ''}
            </p>
          </motion.div>

          {/* Route List */}
          <motion.div variants={itemVariants} className="px-4 mt-4">
            <p className="text-sm text-app-text-secondary mb-3">اتبع هذا الترتيب لأفضل كفاءة</p>

            {planShipments.length > 0 ? (
              <div className="relative">
                {planShipments.map((shipment, index) => {
                  const stopStatus = getStopStatus(shipment.id, shipment.status);
                  return (
                    <ShipmentStopItem
                      key={shipment.id}
                      shipment={shipment}
                      index={index}
                      isLast={index === planShipments.length - 1}
                      stopStatus={stopStatus}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <MapPin size={28} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-app-text-secondary">لا توجد شحنات</h3>
                <p className="text-sm text-gray-400 mt-1 text-center">
                  لم يتم إسناد شحنات لهذه الخطة بعد
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  /* ─── Main View (Plan Cards) ─── */
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="خط السير" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto no-scrollbar pb-20"
      >
        {/* Summary Card */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-base font-semibold text-app-text">خطط التوصيل</h3>
            <span className="text-sm text-app-text-secondary">
              {plans.length} {plans.length === 1 ? 'خطة' : 'خطط'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-app-text-secondary">
            <span>{plans.reduce((sum, p) => sum + p.totalShipments, 0)} شحنة</span>
            <span>{plans.reduce((sum, p) => sum + p.deliveredCount, 0)} تم التسليم</span>
            <span>{plans.reduce((sum, p) => sum + p.pendingCount, 0)} معلق</span>
          </div>
        </motion.div>

        {/* Plan Cards */}
        <motion.div variants={itemVariants} className="px-4 mt-4 space-y-3">
          <p className="text-sm text-app-text-secondary mb-1">اخطة لعرض شحنات الخطة</p>

          {plans.length > 0 ? (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={() => selectPlan(plan.id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MapPin size={28} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-app-text-secondary">لا توجد خطط</h3>
              <p className="text-sm text-gray-400 mt-1 text-center">
                سيظهر خطط التوصيل عند إسناد التسليمات
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
