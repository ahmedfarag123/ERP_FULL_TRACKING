import { ArrowLeft, Bell, Wifi, WifiOff } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import type { ConnectionStatus } from '@/stores/uiStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { driverAsset } from '@/lib/appAssets';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

function connectionDotColor(status: ConnectionStatus) {
  if (status === 'offline') return 'bg-red-500';
  if (status === 'syncing') return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function AppHeader({ title, showBack, onBack }: AppHeaderProps) {
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const unreadCount = useUIStore((s) => s.notifications.filter((notification) => !notification.read).length);
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const isDetailPage = location.pathname.includes('/deliveries/') || 
                       location.pathname.includes('/settings/') ||
                       location.pathname.includes('/notifications');

  const showBackButton = showBack || isDetailPage;

  return (
    <header className="sticky top-0 z-[100] border-b border-gray-200 bg-white text-gray-800 shadow-theme-xs">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 flex-1">
          {showBackButton ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 active:opacity-70 transition-opacity"
            >
              <ArrowLeft size={22} />
              {title && (
                <span className="text-base font-medium text-gray-900">{title}</span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <img
                src={driverAsset('logo.png')}
                alt=""
                aria-hidden="true"
                className="h-8 w-8 rounded-lg object-contain"
              />
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
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-25 text-gray-600 active:scale-95 transition-transform"
            aria-label="الإشعارات"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-app-error px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <div className="relative">
            <div className="flex items-center gap-1.5 rounded-full bg-brand-25 px-2.5 py-1.5">
              <span className={`h-2 w-2 rounded-full ${connectionDotColor(connectionStatus)} ${connectionStatus === 'offline' ? 'animate-pulse' : ''}`} />
              {connectionStatus === 'offline' ? (
                <WifiOff size={14} className="text-red-500" />
              ) : connectionStatus === 'syncing' ? (
                <Wifi size={14} className="text-amber-500 animate-pulse" />
              ) : (
                <Wifi size={14} className="text-emerald-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
