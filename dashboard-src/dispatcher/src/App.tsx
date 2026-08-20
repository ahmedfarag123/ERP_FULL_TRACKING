import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppErrorBoundary } from '../../lib/AppErrorBoundary';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import { useOrderStore } from './stores/orderStore';
import { supabase } from './lib/supabase';
import { playNotificationSound, vibrateNotification } from './services/notificationFeedback';
import MobileContainer from './components/MobileContainer';
import BottomNavigation from './components/BottomNavigation';
import Toast from './components/Toast';
import OfflineBanner from './components/OfflineBanner';
import LoginScreen from './screens/LoginScreen';
import ForcePasswordChangeScreen from './screens/ForcePasswordChangeScreen';
import DashboardScreen from './screens/DashboardScreen';
import PlansListScreen from './screens/PlansListScreen';
import PlanDetailScreen from './screens/PlanDetailScreen';
import ScannerScreen from './screens/ScannerScreen';
import InventoryScreen from './screens/InventoryScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ConnectionDiagnosticsScreen from './screens/ConnectionDiagnosticsScreen';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileContainer>
      <OfflineBanner />
      {children}
      <Toast />
      <BottomNavigation />
    </MobileContainer>
  );
}

function LoadingScreen() {
  return (
    <MobileContainer>
      <div className="flex h-full items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-app-accent" />
      </div>
    </MobileContainer>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresPasswordChange = useAuthStore((s) => s.requiresPasswordChange);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiresPasswordChange) return <Navigate to="/force-password-change" replace />;

  return <>{children}</>;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresPasswordChange = useAuthStore((s) => s.requiresPasswordChange);
  const isLoading = useAuthStore((s) => s.isLoading);
  const profileId = useAuthStore((s) => s.user?.id);
  const setOffline = useUIStore((s) => s.setOffline);
  const loadNotifications = useUIStore((s) => s.loadNotifications);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  useEffect(() => {
    if (!isAuthenticated || requiresPasswordChange || !profileId) return;

    void loadNotifications();

    const notificationChannel = supabase
      .channel(`dispatcher-notifications-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playNotificationSound();
            vibrateNotification();
          }
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(notificationChannel);
    };
  }, [isAuthenticated, loadNotifications, profileId, requiresPasswordChange]);

  useEffect(() => {
    if (!isAuthenticated || requiresPasswordChange) return;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        void useOrderStore.getState().loadOrders();
      }, 300);
    };

    const ordersChannel = supabase
      .channel('dispatcher-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      void supabase.removeChannel(ordersChannel);
    };
  }, [isAuthenticated, requiresPasswordChange]);

  return (
    <AppErrorBoundary>
    <AnimatePresence mode="wait">
      <Routes>
        <Route
          path="/login"
          element={
            isLoading ? <LoadingScreen /> : isAuthenticated ? (
              <Navigate to={requiresPasswordChange ? '/force-password-change' : '/dashboard'} replace />
            ) : (
              <MobileContainer><LoginScreen /><Toast /></MobileContainer>
            )
          }
        />
        <Route
          path="/force-password-change"
          element={
            isLoading ? <LoadingScreen /> : !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : requiresPasswordChange ? (
              <MobileContainer><ForcePasswordChangeScreen /><Toast /></MobileContainer>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route path="/dashboard" element={<AuthGuard><AppLayout><DashboardScreen /></AppLayout></AuthGuard>} />
        <Route path="/plans" element={<AuthGuard><AppLayout><PlansListScreen /></AppLayout></AuthGuard>} />
        <Route path="/plans/print" element={<AuthGuard><AppLayout><PlansListScreen printMode /></AppLayout></AuthGuard>} />
        <Route path="/plans/:id" element={<AuthGuard><MobileContainer><PlanDetailScreen /><Toast /></MobileContainer></AuthGuard>} />
        <Route path="/orders" element={<Navigate to="/plans" replace />} />
        <Route path="/orders/print" element={<Navigate to="/plans/print" replace />} />
        <Route path="/orders/:id" element={<Navigate to="/plans" replace />} />
        <Route path="/scanner" element={<AuthGuard><MobileContainer><ScannerScreen /><Toast /><BottomNavigation /></MobileContainer></AuthGuard>} />
        <Route path="/inventory" element={<AuthGuard><AppLayout><InventoryScreen /></AppLayout></AuthGuard>} />
        <Route path="/inventory/:id" element={<AuthGuard><MobileContainer><ProductDetailScreen /><Toast /></MobileContainer></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><AppLayout><SettingsScreen /></AppLayout></AuthGuard>} />
        <Route path="/settings/profile" element={<AuthGuard><MobileContainer><EditProfileScreen /><Toast /><BottomNavigation /></MobileContainer></AuthGuard>} />
        <Route path="/settings/notifications" element={<AuthGuard><MobileContainer><NotificationsScreen /><Toast /><BottomNavigation /></MobileContainer></AuthGuard>} />
        <Route path="/settings/diagnostics" element={<AuthGuard><MobileContainer><ConnectionDiagnosticsScreen /><Toast /><BottomNavigation /></MobileContainer></AuthGuard>} />
        <Route path="/" element={
          isLoading ? <LoadingScreen /> : (
            <Navigate to={isAuthenticated ? (requiresPasswordChange ? '/force-password-change' : '/dashboard') : '/login'} replace />
          )
        } />
        <Route path="*" element={
          isLoading ? <LoadingScreen /> : (
            <Navigate to={isAuthenticated ? (requiresPasswordChange ? '/force-password-change' : '/dashboard') : '/login'} replace />
          )
        } />
      </Routes>
    </AnimatePresence>
    </AppErrorBoundary>
  );
}

