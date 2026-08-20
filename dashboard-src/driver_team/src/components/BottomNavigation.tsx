import { LayoutDashboard, Package, Route, DollarSign, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { key: 'dashboard' as const, label: 'الرئيسية', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'deliveries' as const, label: 'التسليمات', icon: Package, path: '/deliveries' },
  { key: 'route' as const, label: 'خط السير', icon: Route, path: '/route' },
  { key: 'collection' as const, label: 'التحصيل', icon: DollarSign, path: '/collection' },
  { key: 'settings' as const, label: 'الإعدادات', icon: Settings, path: '/settings' },
];

export default function BottomNavigation() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on detail pages
  if (location.pathname.includes('/deliveries/') || 
      location.pathname.includes('/settings/') ||
      location.pathname.includes('/notifications')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[100] bg-white border-t border-gray-200 shadow-nav">
      <div className="flex items-center justify-around h-16 pb-safe">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                navigate(tab.path);
              }}
              className="relative flex flex-col items-center justify-center gap-1 w-16 h-full active:scale-[0.92] transition-transform duration-150"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                className={isActive ? 'text-brand-500' : 'text-gray-500'}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className={`text-[11px] font-medium tracking-wide ${
                  isActive ? 'text-brand-500' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
