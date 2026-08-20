import { useEffect } from 'react';
import type React from 'react';
import { IconAlert, IconBell, IconCheck, IconCustomers, IconProducts, IconRefresh } from '../components/shared/Icons';
import { useAppStore } from '../store/appStore';

const typeConfig: Record<string, { icon: React.ReactNode; tone: string }> = {
  order: { icon: <IconProducts size={18} />, tone: 'bg-brand-50 text-brand-600 border-brand-200' },
  customer: { icon: <IconCustomers size={18} />, tone: 'bg-success-50 text-success-600 border-emerald-200' },
  alert: { icon: <IconAlert size={18} />, tone: 'bg-error-50 text-error-600 border-rose-200' },
  sync: { icon: <IconRefresh size={18} />, tone: 'bg-brand-50 text-brand-600 border-sky-200' },
  system: { icon: <IconBell size={18} />, tone: 'bg-brand-25 text-app-text-secondary border-app-border' },
};

function relativeTime(value?: string) {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return 'الآن';
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return new Date(value).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const notifications = useAppStore((state) => state.notifications);
  const unreadCount = useAppStore((state) => state.unreadCount);
  const markAllRead = useAppStore((state) => state.markAllRead);
  const loadNotifications = useAppStore((state) => state.loadNotifications);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-app-text">الإشعارات</h1>
          <p className="mt-1 text-sm text-app-text-secondary">{unreadCount} غير مقروء</p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="rounded-xl border border-app-border bg-brand-25 px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-brand-25/70"
        >
          تعليم الكل كمقروء
        </button>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const config = typeConfig[String(notification.type ?? 'system')] ?? typeConfig.system;
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => markNotificationRead(String(notification.id))}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-right transition ${
                  notification.read
                    ? 'border-app-border bg-brand-25 text-app-text-secondary'
                    : 'border-brand-200 bg-brand-50 text-app-text shadow-lg shadow-brand-500/10'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.tone}`}>
                  {notification.read ? <IconCheck size={18} /> : config.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{notification.title ?? 'إشعار جديد'}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-app-text-secondary">{notification.message ?? notification.body}</span>
                  <span className="mt-2 block text-xs text-app-text-secondary">{relativeTime(notification.created_at)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-app-border bg-brand-25 p-8 text-center">
          <IconBell size={42} className="mx-auto text-app-text-secondary" />
          <h2 className="mt-4 text-lg font-bold text-app-text">لا توجد إشعارات</h2>
          <p className="mt-1 text-sm text-app-text-secondary">أي إشعار عن عميل أو طلب مسند لك سيظهر هنا.</p>
        </div>
      )}
    </section>
  );
}
