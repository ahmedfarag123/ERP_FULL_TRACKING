import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList, Package, CheckCircle, Clock, ScanBarcode, Printer } from 'lucide-react';
import { usePlanStore } from '../stores/planStore';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import AppHeader from '../components/AppHeader';
import PlanCard from '../components/PlanCard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
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

  const recentPlans = activePlans.slice(0, 5);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader />
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {/* Greeting */}
        <motion.div variants={itemVariants} className="bg-app-dark px-4 pt-4 pb-8 rounded-b-[20px]">
          <h2 className="text-[22px] font-semibold text-white leading-tight">{getGreeting()},</h2>
          {user?.full_name && <h2 className="text-[22px] font-semibold text-white leading-tight">{user.full_name}!</h2>}
          <p className="text-sm text-white/70 mt-1">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2 px-4 -mt-5">
          {[
            { label: 'الإجمالي', value: stats.total, icon: ClipboardList, color: 'text-gray-500' },
            { label: 'جديد', value: stats.pending, icon: Clock, color: 'text-app-accent' },
            { label: 'جاهز', value: stats.ready, icon: CheckCircle, color: 'text-app-success' },
            { label: 'قيد التجهيز', value: stats.preparing, icon: Package, color: 'text-warning-600' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.08, duration: 0.3 }} className="bg-white rounded-xl p-3 shadow-card flex flex-col items-center text-center">
              <stat.icon size={18} className={stat.color} />
              <span className="text-2xl font-bold text-app-text mt-1">{stat.value}</span>
              <span className="text-xs text-app-text-secondary">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Missed & Completed counts */}
        {(stats.missed > 0 || stats.completed > 0) && (
          <motion.div variants={itemVariants} className="px-4 mt-3 flex gap-2">
            {stats.missed > 0 && (
              <div className="flex-1 bg-orange-50 rounded-xl p-2.5 text-center">
                <span className="text-lg font-bold text-orange-600">{stats.missed}</span>
                <span className="text-xs text-orange-500 block">فائتة</span>
              </div>
            )}
            {stats.completed > 0 && (
              <div className="flex-1 bg-gray-100 rounded-xl p-2.5 text-center">
                <span className="text-lg font-bold text-gray-500">{stats.completed}</span>
                <span className="text-xs text-gray-400 block">مكتملة</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Action Cards */}
        <motion.div variants={itemVariants} className="px-4 mt-5">
          <h3 className="text-lg font-semibold text-app-text mb-3">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ClipboardList, label: 'الخطط', action: () => { setActiveTab('plans'); navigate('/plans'); }, color: 'text-app-dark' },
              { icon: ScanBarcode, label: 'مسح سريع', action: () => navigate('/scanner'), color: 'text-app-accent' },
              { icon: Package, label: 'المخزون', action: () => { setActiveTab('inventory'); navigate('/inventory'); }, color: 'text-app-success' },
              { icon: Printer, label: 'طباعة', action: () => { setActiveTab('plans'); navigate('/plans/print'); }, color: 'text-app-warning' },
            ].map((card) => (
              <button key={card.label} onClick={card.action} className="bg-white rounded-xl p-4 shadow-card flex flex-col items-center gap-2 active:scale-[0.97] transition-transform">
                <card.icon size={26} className={card.color} />
                <span className="text-sm font-semibold text-app-text">{card.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Plans */}
        {recentPlans.length > 0 && (
          <motion.div variants={itemVariants} className="px-4 mt-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-app-text">آخر الخطط</h3>
              <button onClick={() => { setActiveTab('plans'); navigate('/plans'); }} className="text-sm text-app-accent font-medium">عرض الكل</button>
            </div>
            <div className="flex flex-col gap-3">
              {recentPlans.map((plan) => (
                <PlanCard key={plan.plan_id} plan={plan} onClick={() => { selectPlan(plan.plan_id); navigate(`/plans/${plan.plan_id}`); }} />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
