import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Package,
  CheckCircle,
  Clock,
  ScanBarcode,
  Printer,
  AlertTriangle,
  ChevronLeft,
  Boxes,
} from 'lucide-react';
import { usePlanStore } from '../stores/planStore';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import AppHeader from '../components/AppHeader';
import PlanCard from '../components/PlanCard';
import { dispatcherAsset } from '../lib/appAssets';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function WarehouseIllustration() {
  return (
    <svg viewBox="0 0 320 120" fill="none" className="w-full h-auto opacity-[0.12]">
      {/* Warehouse building */}
      <rect x="40" y="30" width="240" height="80" rx="4" fill="white" />
      <path d="M20 35 L160 8 L300 35" stroke="white" strokeWidth="3" fill="white" />
      {/* Shelving unit left */}
      <rect x="55" y="50" width="35" height="55" rx="2" fill="white" opacity="0.6" />
      <rect x="58" y="53" width="29" height="12" rx="1" fill="white" opacity="0.4" />
      <rect x="58" y="68" width="29" height="12" rx="1" fill="white" opacity="0.4" />
      <rect x="58" y="83" width="29" height="12" rx="1" fill="white" opacity="0.4" />
      <rect x="58" y="98" width="29" height="12" rx="1" fill="white" opacity="0.4" />
      {/* Shelving unit right */}
      <rect x="230" y="50" width="35" height="55" rx="2" fill="white" opacity="0.6" />
      <rect x="233" y="53" width="29" height="12" rx="1" fill="white" opacity="0.4" />
      <rect x="233" y="68" width="29" height="12" rx="1" fill="white" opacity="0.4" />
      <rect x="233" y="83" width="29" height="12" rx="1" fill="white" opacity="0.4" />
      <rect x="233" y="98" width="29" height="12" rx="1" fill="white" opacity="0.4" />
      {/* Boxes in center */}
      <rect x="120" y="75" width="22" height="22" rx="3" fill="white" opacity="0.5" />
      <rect x="145" y="82" width="18" height="15" rx="3" fill="white" opacity="0.4" />
      <rect x="125" y="55" width="16" height="16" rx="3" fill="white" opacity="0.35" />
      <rect x="166" y="88" width="26" height="9" rx="2" fill="white" opacity="0.35" />
      {/* Forklift */}
      <rect x="185" y="95" width="20" height="12" rx="2" fill="white" opacity="0.5" />
      <rect x="190" y="80" width="4" height="15" rx="1" fill="white" opacity="0.4" />
      <circle cx="187" cy="110" r="4" fill="white" opacity="0.5" />
      <circle cx="203" cy="110" r="4" fill="white" opacity="0.5" />
      {/* Pallet on forklift */}
      <rect x="191" y="72" width="12" height="8" rx="1" fill="white" opacity="0.4" />
    </svg>
  );
}

export default function DashboardScreen() {
  const navigate = useNavigate();
  const plans = usePlanStore((s) => s.plans);
  const loadPlans = usePlanStore((s) => s.loadPlans);
  const selectPlan = usePlanStore((s) => s.selectPlan);
  const getStats = usePlanStore((s) => s.getStats);
  const user = useAuthStore((s) => s.user);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const activePlans = useMemo(() => plans.filter((p) => p.plan_bucket === 'active'), [plans]);
  const stats = useMemo(() => getStats(), [getStats, plans]);

  useEffect(() => {
    loadPlans();
    setActiveTab('home');
  }, [loadPlans, setActiveTab]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  const recentPlans = activePlans.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f4f3]">
      <AppHeader />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto no-scrollbar pb-24"
      >
        {/* Hero Header with Warehouse Illustration */}
        <motion.div
          variants={itemVariants}
          className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 px-5 pt-5 pb-12 overflow-hidden"
        >
          {/* Background warehouse illustration */}
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
            <WarehouseIllustration />
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/[0.04]" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/[0.04]" />

          <div className="relative z-10">
            {/* App identity */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Package size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-white leading-tight">تطبيق المخزن</h1>
                <p className="text-[12px] text-white/50 mt-0.5">إدارة المخزون والشحنات</p>
              </div>
            </div>

            {/* User greeting */}
            <div className="bg-white/[0.08] backdrop-blur-sm rounded-xl p-3 border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-white/60">{getGreeting()}</p>
                  {user?.full_name && (
                    <p className="text-[16px] font-bold text-white mt-0.5">{user.full_name}</p>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-white/40">
                    {new Date().toLocaleDateString('ar-EG', { weekday: 'short' })}
                  </p>
                  <p className="text-[15px] font-bold text-white">
                    {new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setActiveTab('plans'); navigate('/plans'); }}
              className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-right active:scale-[0.97] transition-transform"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <ClipboardList size={20} className="text-emerald-600" />
                </div>
                <ChevronLeft size={16} className="text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">خططة نشطة</p>
            </button>

            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <Package size={20} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.preparing}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">قيد التجهيز</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle size={20} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.ready}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">جاهز للتسليم</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                <Clock size={20} className="text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">بانتظار البدء</p>
            </div>
          </div>
        </motion.div>

        {/* Missed & Completed Banner */}
        {(stats.missed > 0 || stats.completed > 0) && (
          <motion.div variants={itemVariants} className="px-4 mt-3">
            <div className="flex gap-2">
              {stats.missed > 0 && (
                <button
                  onClick={() => { setActiveTab('plans'); navigate('/plans'); }}
                  className="flex-1 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-xl p-3 flex items-center gap-3 active:scale-[0.97] transition-transform border border-orange-200/50"
                >
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-orange-500" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-700">{stats.missed}</p>
                    <p className="text-[11px] text-orange-400">خطة فائتة</p>
                  </div>
                </button>
              )}
              {stats.completed > 0 && (
                <button
                  onClick={() => { setActiveTab('plans'); navigate('/plans'); }}
                  className="flex-1 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-3 flex items-center gap-3 active:scale-[0.97] transition-transform border border-gray-200/50"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <CheckCircle size={18} className="text-gray-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-600">{stats.completed}</p>
                    <p className="text-[11px] text-gray-400">خطة مكتملة</p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="px-4 mt-5">
          <h3 className="text-[15px] font-bold text-gray-900 mb-3">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: ClipboardList,
                label: 'الخطط',
                sub: `${stats.total} خطة نشطة`,
                action: () => { setActiveTab('plans'); navigate('/plans'); },
                bg: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
              },
              {
                icon: ScanBarcode,
                label: 'مسح سريع',
                sub: 'مسح باركود',
                action: () => navigate('/scanner'),
                bg: 'bg-violet-50',
                iconColor: 'text-violet-600',
              },
              {
                icon: Boxes,
                label: 'المخزون',
                sub: 'عرض المنتجات',
                action: () => { setActiveTab('inventory'); navigate('/inventory'); },
                bg: 'bg-sky-50',
                iconColor: 'text-sky-600',
              },
              {
                icon: Printer,
                label: 'طباعة',
                sub: 'قوائم التجهيز',
                action: () => { setActiveTab('plans'); navigate('/plans/print'); },
                bg: 'bg-rose-50',
                iconColor: 'text-rose-600',
              },
            ].map((card) => (
              <button
                key={card.label}
                onClick={card.action}
                className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3 text-right active:scale-[0.97] transition-transform"
              >
                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <card.icon size={22} className={card.iconColor} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-gray-900">{card.label}</p>
                  <p className="text-[11px] text-gray-400 truncate">{card.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Plans */}
        {recentPlans.length > 0 && (
          <motion.div variants={itemVariants} className="px-4 mt-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-gray-900">آخر الخطط</h3>
              <button
                onClick={() => { setActiveTab('plans'); navigate('/plans'); }}
                className="flex items-center gap-1 text-[13px] text-emerald-600 font-semibold"
              >
                عرض الكل
                <ChevronLeft size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {recentPlans.map((plan) => (
                <PlanCard
                  key={plan.plan_id}
                  plan={plan}
                  onClick={() => {
                    selectPlan(plan.plan_id);
                    navigate(`/plans/${plan.plan_id}`);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {activePlans.length === 0 && !usePlanStore.getState().isLoading && (
          <motion.div variants={itemVariants} className="px-4 mt-8 text-center">
            <img
              src={dispatcherAsset('manifest-icon.png')}
              alt=""
              className="w-20 h-20 rounded-3xl mx-auto mb-4 shadow-lg border border-gray-100 object-cover"
            />
            <p className="text-[15px] font-semibold text-gray-700">مفيش خطط نشطة حاليًا</p>
            <p className="text-[13px] text-gray-400 mt-1">الخطط الجديدة هتظهر هنا لما تتسجل</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
