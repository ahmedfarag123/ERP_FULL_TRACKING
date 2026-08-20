import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Bell, LogOut, ChevronLeft, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import AppHeader from '../components/AppHeader';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="الإعدادات" />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-app-light flex items-center justify-center">
              <User size={24} className="text-app-dark" />
            </div>
            <div>
              <p className="text-base font-semibold text-app-text">{user?.full_name ?? 'المستخدم'}</p>
              <p className="text-sm text-app-text-secondary">{user?.email ?? ''}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-500 mt-1">
                {user?.role === 'warehouse_manager' ? 'مدير المخزن' : user?.role === 'warehouse_supervisor' ? 'مشرف المخزن' : 'موزع'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Settings Items */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-4 mt-3 bg-white rounded-xl shadow-card overflow-hidden">
          {[
            { icon: User, label: 'الملف الشخصي', action: () => navigate('/settings/profile') },
            { icon: Bell, label: 'الإشعارات', action: () => navigate('/settings/notifications') },
            { icon: Shield, label: 'الاتصال بالخادم', action: () => navigate('/settings/diagnostics') },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full px-4 py-4 flex items-center justify-between active:bg-brand-25 transition-colors ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="text-app-text-secondary" />
                <span className="text-sm font-medium text-app-text">{item.label}</span>
              </div>
              <ChevronLeft size={18} className="text-gray-400" />
            </button>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-4 mt-3">
          <button
            onClick={handleLogout}
            className="w-full bg-white rounded-xl p-4 shadow-card flex items-center justify-center gap-2 text-app-error font-semibold active:scale-[0.98] transition-transform"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </motion.div>

        <p className="text-xs text-gray-400 text-center mt-6">الإصدار 1.0.0</p>
      </div>
    </div>
  );
}

