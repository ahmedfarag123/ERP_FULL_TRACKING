import { useEffect } from 'react';
import { AlertTriangle, BellOff, ClipboardList, Info, RefreshCw, UserRound } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { useUIStore } from '../stores/uiStore';
import type { DispatcherNotification } from '../services/dispatcherNotifications';

const typeConfig: Record<DispatcherNotification['type'], { icon: typeof Info; bg: string; border: string; text: string }> = {
  order: { icon: ClipboardList, bg: 'bg-brand-50', border: 'border-l-brand-500', text: 'text-brand-500' },
  customer: { icon: UserRound, bg: 'bg-success-50', border: 'border-l-success-500', text: 'text-success-600' },
  alert: { icon: AlertTriangle, bg: 'bg-warning-50', border: 'border-l-warning-500', text: 'text-warning-600' },
  sync: { icon: RefreshCw, bg: 'bg-success-50', border: 'border-l-success-500', text: 'text-success-600' },
  system: { icon: Info, bg: 'bg-gray-100', border: 'border-l-gray-400', text: 'text-gray-600' },
};

function relativeTime(timestamp: string) {
  const then = new Date(timestamp);
  const diffMinutes = Math.max(0, Math.floor((Date.now() - then.getTime()) / 60_000));

  if (Number.isNaN(then.getTime())) return '';
  if (diffMinutes < 1) return 'الآن';
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return then.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const notifications = useUIStore((s) => s.notifications);
  const notificationsError = useUIStore((s) => s.notificationsError);
  const loadNotifications = useUIStore((s) => s.loadNotifications);
  const markRead = useUIStore((s) => s.markNotificationRead);
  const markAllRead = useUIStore((s) => s.markAllNotificationsRead);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <AppHeader title="الإشعارات" />

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-app-text">الإشعارات</h1>
            <p className="text-xs text-app-text-secondary">
              {notifications.filter((notification) => !notification.read).length} غير مقروء
            </p>
          </div>
          <button type="button" onClick={markAllRead} className="text-sm font-semibold text-app-accent">
            تعليم الكل كمقروء
          </button>
        </div>

        {notificationsError ? (
          <div className="rounded-xl bg-error-50 p-4 text-sm text-error-600">{notificationsError}</div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col gap-2">
            {notifications.map((notification) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markRead(notification.id)}
                  className={`flex items-start gap-3 rounded-xl p-4 text-right shadow-card active:scale-[0.98] transition-transform ${
                    notification.read ? 'bg-brand-25 border-l-[3px] border-l-transparent' : `bg-white border-l-[3px] ${config.border}`
                  }`}
                >
                  <div className={`right-auto left-0  flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                    <Icon size={18} className={config.text} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${notification.read ? 'text-app-text' : 'font-semibold text-app-text'}`}>
                      {notification.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-app-text-secondary">{notification.message}</p>
                    <p className="mt-1.5 text-xs text-gray-400">{relativeTime(notification.timestamp)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <BellOff size={48} className="text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-app-text-secondary">لا توجد إشعارات</h3>
            <p className="mt-1 text-sm text-gray-400">أي تنبيه جديد للطلبات أو المخزون سيظهر هنا.</p>
          </div>
        )}
      </div>
    </div>
  );
}
