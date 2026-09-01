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
  Truck,
  Warehouse,
} from 'lucide-react';
import { usePlanStore } from '../stores/planStore';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import AppHeader from '../components/AppHeader';
import PlanCard from '../components/PlanCard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

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
        {/* Hero Header */}
        <motion.div
          variants={itemVariants}
          className="relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 px-5 pt-5 pb-10 overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute top-8 right-8 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Warehouse size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-[15px] text-white/70 leading-tight">{getGreeting()}</h1>
                {user?.full_name && (
                  <h2 className="text-xl font-bold text-white leading-tight">{user.full_name}</h2>
                )}
              </div>
            </div>
            <p className="text-[13px] text-white/60 mt-1">
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-2 gap-3">
            {/* Active Plans */}
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

            {/* Preparing */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <Package size={20} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.preparing}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">قيد التجهيز</p>
            </div>

            {/* Ready */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle size={20} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.ready}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">جاهز للتسليم</p>
            </div>

            {/* Pending */}
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
                icon: Package,
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
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Truck size={36} className="text-emerald-300" />
            </div>
            <p className="text-[15px] font-semibold text-gray-700">مفيش خطط نشطة حاليًا</p>
            <p className="text-[13px] text-gray-400 mt-1">الخطط الجديدة هتظهر هنا لما تتسجل</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
