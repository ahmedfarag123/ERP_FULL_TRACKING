import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  Lock,
  Bell,
  Download,
  Globe,
  Moon,
  Database,
  HelpCircle,
  Wifi,
  FileText,
  Shield,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import AppHeader from '@/components/AppHeader';
import BottomSheet from '@/components/BottomSheet';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

export default function SettingsScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const showToast = useUIStore((s) => s.showToast);

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setActiveTab('settings');
  }, []);

  const handleSignOut = () => {
    logout();
    showToast('تم تسجيل الخروج');
    navigate('/login');
  };

  const accountItems = [
    { icon: User, label: 'تعديل الملف الشخصي', action: () => navigate('/settings/profile') },
    { icon: Phone, label: 'تغيير رقم الهاتف', action: () => showToast('قريبا') },
    { icon: Lock, label: 'تغيير كلمة المرور', action: () => showToast('قريبا') },
    { icon: Bell, label: 'التنبيهات', action: () => navigate('/settings/notifications') },
  ];

  const appItems = [
    { icon: Download, label: 'تثبيت التطبيق', action: () => showToast('تم تثبيت التطبيق') },
    { icon: Globe, label: 'اللغة', value: 'العربية', action: () => showToast('قريبا') },
    {
      icon: Moon,
      label: 'الوضع الداكن',
      toggle: true,
      toggleValue: darkMode,
      onToggle: () => setDarkMode(!darkMode),
      action: () => {},
    },
    { icon: Database, label: 'التخزين', value: '٢٫٤ ميجابايت مستخدمة', action: () => {} },
  ];

  const supportItems = [
    { icon: HelpCircle, label: 'مركز المساعدة', action: () => showToast('قريبا') },
    { icon: Wifi, label: 'فحص الاتصال', action: () => navigate('/settings/diagnostics') },
    { icon: FileText, label: 'شروط الخدمة', action: () => showToast('قريبا') },
    { icon: Shield, label: 'سياسة الخصوصية', action: () => showToast('قريبا') },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="الإعدادات" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto no-scrollbar pb-20"
      >
        {/* Profile Card */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-app-dark flex items-center justify-center text-white text-xl font-semibold flex-shrink-0 border-2 border-app-light">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-app-text">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-sm text-app-text-secondary">سائق التسليم</p>
              <p className="text-xs text-gray-400">رقم السائق: {user?.id}</p>
            </div>
          </div>
        </motion.div>

        {/* Account Section */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl shadow-card overflow-hidden">
          <p className="text-xs font-semibold text-app-text-secondary tracking-wider uppercase px-4 pt-4 pb-2">
            الحساب
          </p>
          {accountItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-right hover:bg-brand-25 active:bg-gray-100 transition-colors ${
                i < accountItems.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <item.icon size={18} className="text-app-dark flex-shrink-0" />
              <span className="text-sm text-app-text flex-1">{item.label}</span>
              <ChevronLeft size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </motion.div>

        {/* App Section */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl shadow-card overflow-hidden">
          <p className="text-xs font-semibold text-app-text-secondary tracking-wider uppercase px-4 pt-4 pb-2">
            التطبيق
          </p>
          {appItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-right hover:bg-brand-25 active:bg-gray-100 transition-colors ${
                i < appItems.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <item.icon size={18} className="text-app-dark flex-shrink-0" />
              <span className="text-sm text-app-text flex-1">{item.label}</span>
              {'toggle' in item && item.toggle ? (
                <div
                  onClick={(e) => { e.stopPropagation(); item.onToggle?.(); }}
                  className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                    item.toggleValue ? 'bg-app-dark' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      item.toggleValue ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              ) : 'value' in item && item.value ? (
                <span className="text-xs text-app-text-secondary">{item.value}</span>
              ) : (
                <ChevronLeft size={16} className="text-gray-300 flex-shrink-0" />
              )}
            </button>
          ))}
        </motion.div>

        {/* Support Section */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl shadow-card overflow-hidden">
          <p className="text-xs font-semibold text-app-text-secondary tracking-wider uppercase px-4 pt-4 pb-2">
            الدعم
          </p>
          {supportItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-right hover:bg-brand-25 active:bg-gray-100 transition-colors ${
                i < supportItems.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <item.icon size={18} className="text-app-dark flex-shrink-0" />
              <span className="text-sm text-app-text flex-1">{item.label}</span>
              <ChevronLeft size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </motion.div>

        {/* Sign Out Button */}
        <motion.div variants={itemVariants} className="mx-4 mt-6">
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full h-[52px] border border-error-500 text-error-600 rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-error-50 transition-colors"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </motion.div>

        {/* Version Info */}
        <motion.div variants={itemVariants} className="text-center mt-6 mb-8">
          <p className="text-xs text-gray-400">هوريكا سمارت السائق v1.0.0</p>
          <p className="text-xs text-gray-300 mt-0.5">مصمم لخدمة السائقين</p>
        </motion.div>
      </motion.div>

      {/* Sign Out Confirmation */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <BottomSheet
            isOpen={showSignOutConfirm}
            onClose={() => setShowSignOutConfirm(false)}
            title="تسجيل الخروج؟"
            showHandle={false}
          >
            <p className="text-sm text-app-text-secondary mb-6">
              هل تريد تسجيل الخروج؟ ستحتاج إلى تسجيل الدخول مرة أخرى.
            </p>
            <button
              onClick={handleSignOut}
              className="w-full h-[52px] bg-app-error text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] transition-all"
            >
              <LogOut size={18} />
              تسجيل الخروج
            </button>
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="w-full h-12 border border-gray-300 text-app-text rounded-xl font-semibold mt-2 active:bg-brand-25 transition-all"
            >
              إلغاء
            </button>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
}
