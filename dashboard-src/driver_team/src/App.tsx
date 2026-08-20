import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppErrorBoundary } from '../../lib/AppErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { supabase } from '@/lib/supabase';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';
import { playNotificationSound, vibrateNotification } from '@/services/notificationFeedback';
import MobileContainer from '@/components/MobileContainer';
import BottomNavigation from '@/components/BottomNavigation';
import Toast from '@/components/Toast';
import OfflineBanner from '@/components/OfflineBanner';
import LoginScreen from '@/screens/LoginScreen';
import ForcePasswordChangeScreen from '@/screens/ForcePasswordChangeScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import DeliveriesListScreen from '@/screens/DeliveriesListScreen';
import RouteScreen from '@/screens/RouteScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import ShipmentDetailScreen from '@/screens/ShipmentDetailScreen';
import LoadConfirmationScreen from '@/screens/LoadConfirmationScreen';
import PlanReorderScreen from '@/screens/PlanReorderScreen';
import CollectionScreen from '@/screens/CollectionScreen';
import ConnectionDiagnosticsScreen from '@/screens/ConnectionDiagnosticsScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import EditProfileScreen from '@/screens/EditProfileScreen';

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

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiresPasswordChange) return <Navigate to="/force-password-change" replace />;

  return <>{children}</>;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresPasswordChange = useAuthStore((s) => s.requiresPasswordChange);
  const isLoading = useAuthStore((s) => s.isLoading);
  const profileId = useAuthStore((s) => s.user?.id);
  const activePlanId = useDeliveryStore((s) => s.activePlanId);
  const setOffline = useUIStore((s) => s.setOffline);
  const isDriverOnline = useUIStore((s) => s.isDriverOnline);
  const loadNotifications = useUIStore((s) => s.loadNotifications);

  useDriverLocationTracking({
    isAuthenticated: isAuthenticated && isDriverOnline,
    requiresPasswordChange,
    profileId,
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      // Auto-sync offline actions and IndexedDB pending writes on reconnect
      void useUIStore.getState().syncOfflineActions().catch(() => undefined);
      void useUIStore.getState().syncPendingIndexedDBWrites().catch(() => undefined);
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  // Realtime subscription for assigned plan changes
  useEffect(() => {
    if (!isAuthenticated || requiresPasswordChange || !profileId) return;

    const channel = supabase
      .channel(`driver-plans-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'logistics_delivery_plans',
          filter: `assigned_profile_id=eq.${profileId}`,
        },
        () => {
          useDeliveryStore.getState().scheduleRealtimeRefresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, profileId, requiresPasswordChange]);

  // Realtime subscription for shipments in the active assigned plan
  useEffect(() => {
    if (!isAuthenticated || requiresPasswordChange || !activePlanId) return;

    const channel = supabase
      .channel(`driver-plan-shipments-${activePlanId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'logistics_shipments',
          filter: `plan_id=eq.${activePlanId}`,
        },
        () => {
          useDeliveryStore.getState().scheduleRealtimeRefresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activePlanId, isAuthenticated, requiresPasswordChange]);

  useEffect(() => {
    if (!isAuthenticated || requiresPasswordChange || !profileId) return;

    void loadNotifications();

    const channel = supabase
      .channel(`driver-notifications-${profileId}`)
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
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, loadNotifications, profileId, requiresPasswordChange]);

  return (
    <AppErrorBoundary>
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isLoading ? (
              <LoadingScreen />
            ) : isAuthenticated ? (
              <Navigate to={requiresPasswordChange ? '/force-password-change' : '/dashboard'} replace />
            ) : (
              <MobileContainer>
                <LoginScreen />
                <Toast />
              </MobileContainer>
            )
          }
        />

        <Route
          path="/force-password-change"
          element={
            isLoading ? (
              <LoadingScreen />
            ) : !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : requiresPasswordChange ? (
              <MobileContainer>
                <ForcePasswordChangeScreen />
                <Toast />
              </MobileContainer>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <AppLayout>
                <DashboardScreen />
              </AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/deliveries"
          element={
            <AuthGuard>
              <AppLayout>
                <DeliveriesListScreen />
              </AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/deliveries/load-confirmation"
          element={
            <AuthGuard>
              <MobileContainer>
                <LoadConfirmationScreen />
                <Toast />
              </MobileContainer>
            </AuthGuard>
          }
        />
        <Route
          path="/plan/:planId/reorder"
          element={
            <AuthGuard>
              <MobileContainer>
                <PlanReorderScreen />
                <Toast />
              </MobileContainer>
            </AuthGuard>
          }
        />
        <Route
          path="/deliveries/:id"
          element={
            <AuthGuard>
              <MobileContainer>
                <ShipmentDetailScreen />
                <Toast />
              </MobileContainer>
            </AuthGuard>
          }
        />
        <Route
          path="/route"
          element={
            <AuthGuard>
              <AppLayout>
                <RouteScreen />
              </AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/collection"
          element={
            <AuthGuard>
              <AppLayout>
                <CollectionScreen />
              </AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <AppLayout>
                <SettingsScreen />
              </AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/settings/diagnostics"
          element={
            <AuthGuard>
              <MobileContainer>
                <ConnectionDiagnosticsScreen />
                <Toast />
                <BottomNavigation />
              </MobileContainer>
            </AuthGuard>
          }
        />
        <Route
          path="/settings/notifications"
          element={
            <AuthGuard>
              <MobileContainer>
                <NotificationsScreen />
                <Toast />
                <BottomNavigation />
              </MobileContainer>
            </AuthGuard>
          }
        />
        <Route
          path="/settings/profile"
          element={
            <AuthGuard>
              <MobileContainer>
                <EditProfileScreen />
                <Toast />
                <BottomNavigation />
              </MobileContainer>
            </AuthGuard>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            isLoading ? (
              <LoadingScreen />
            ) : (
              <Navigate to={isAuthenticated ? (requiresPasswordChange ? '/force-password-change' : '/dashboard') : '/login'} replace />
            )
          }
        />
        <Route
          path="*"
          element={
            isLoading ? (
              <LoadingScreen />
            ) : (
              <Navigate to={isAuthenticated ? (requiresPasswordChange ? '/force-password-change' : '/dashboard') : '/login'} replace />
            )
          }
        />
      </Routes>
    </AnimatePresence>
    </AppErrorBoundary>
  );
}
