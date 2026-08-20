import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Truck,
  AlertTriangle,
  RefreshCw,
  Info,
  BellOff,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import type { Notification } from '@/types';

const typeConfig: Record<Notification['type'], { icon: typeof Truck; bg: string; border: string; text: string }> = {
  delivery: { icon: Truck, bg: 'bg-brand-50', border: 'border-l-brand-500', text: 'text-brand-500' },
  alert: { icon: AlertTriangle, bg: 'bg-warning-50', border: 'border-l-warning-500', text: 'text-warning-600' },
  sync: { icon: RefreshCw, bg: 'bg-success-50', border: 'border-l-success-500', text: 'text-success-600' },
  system: { icon: Info, bg: 'bg-brand-50', border: 'border-l-brand-500', text: 'text-brand-500' },
};

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const notifications = useUIStore((s) => s.notifications);
  const notificationsError = useUIStore((s) => s.notificationsError);
  const loadNotifications = useUIStore((s) => s.loadNotifications);
  const markRead = useUIStore((s) => s.markNotificationRead);
  const markAllRead = useUIStore((s) => s.markAllNotificationsRead);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return then.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-[100] bg-white border-b border-app-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 text-app-dark active:opacity-70"
          >
            <ArrowLeft size={22} />
            <span className="text-base font-medium">الإعدادات</span>
          </button>
          <button
            onClick={markAllRead}
            className="text-sm text-app-accent font-medium"
          >
            تعليم الكل كمقروء
          </button>
        </div>
        <div className="px-4 pb-3">
          <h1 className="text-xl font-semibold text-app-text">التنبيهات</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 pb-8"
      >
        {notificationsError ? (
          <div className="rounded-xl bg-error-50 p-4 text-sm text-error-600">
            {notificationsError}
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col gap-2">
            {notifications.map((notification, i) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;

              return (
                <motion.div
                  key={notification.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => markRead(notification.id)}
                  className={`flex items-start gap-3 p-4 rounded-xl shadow-card cursor-pointer active:scale-[0.98] transition-transform ${
                    notification.read ? 'bg-brand-25 border-l-[3px] border-l-transparent' : `bg-white border-l-[3px] ${config.border}`
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}
                  >
                    <Icon size={18} className={config.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notification.read ? 'text-app-text' : 'font-semibold text-app-text'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-app-text-secondary mt-1 leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {getRelativeTime(notification.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <BellOff size={48} className="text-gray-300" />
            <h3 className="text-lg font-semibold text-app-text-secondary mt-4">لا توجد تنبيهات</h3>
            <p className="text-sm text-gray-400 mt-1">لا توجد أي تنبيهات جديدة.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
