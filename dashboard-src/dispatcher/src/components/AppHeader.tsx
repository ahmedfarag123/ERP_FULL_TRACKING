import { ArrowLeft, Bell, Wifi, WifiOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dispatcherAsset } from '../lib/appAssets';
import { useUIStore } from '../stores/uiStore';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function AppHeader({ title, showBack, onBack }: AppHeaderProps) {
  const isOffline = useUIStore((s) => s.isOffline);
  const unreadCount = useUIStore((s) => s.notifications.filter((notification) => !notification.read).length);
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const isDetailPage =
    location.pathname.includes('/orders/') ||
    location.pathname.includes('/inventory/') ||
    location.pathname.includes('/settings/');

  const showBackButton = showBack || isDetailPage;

  return (
    <header className="sticky top-0 z-[100] border-b border-gray-200 bg-white text-gray-800 shadow-theme-xs">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex flex-1 items-center gap-2">
          {showBackButton ? (
            <button onClick={handleBack} className="flex items-center gap-1 active:opacity-70 transition-opacity">
              <ArrowLeft size={22} />
              {title && <span className="text-base font-medium text-gray-900">{title}</span>}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <img src={dispatcherAsset('logo.png')} alt="" className="h-8 w-8 rounded-lg object-contain" />
              <div className="flex items-center gap-1">
                <span className="text-base font-bold text-gray-900">هوريكا</span>
                <span className="text-base font-medium text-brand-500">سمارت</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/settings/notifications')}
            className="relative flex h-9 w-9 right-auto left-0 items-center justify-center rounded-xl bg-brand-25 text-gray-600 active:scale-95 transition-transform"
            aria-label="الإشعارات"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <div className="relative">
            {isOffline ? <WifiOff size={18} className="text-error-500" /> : <Wifi size={18} className="text-success-500" />}
            {isOffline && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-error-500 animate-pulse-dot" />}
          </div>
        </div>
      </div>
    </header>
  );
}
