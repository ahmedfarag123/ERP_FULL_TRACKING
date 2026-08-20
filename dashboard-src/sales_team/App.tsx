import React, { Suspense, lazy, useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppErrorBoundary } from '../lib/AppErrorBoundary'
import { findProfileByAuthUser } from '../lib/profileIdentity'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './components/auth/AuthPage'
import { watchLocation } from './lib/location'
import { clearSupabaseBrowserSession, isSupabaseInvalidSessionError, supabase, withSupabaseLockRetry } from './lib/supabase'
import { playNotificationSound } from './lib/notificationFeedback'
import { useAppStore } from './store/appStore'
import { useAuthStore } from './store/authStore'
import type { UserProfile } from './types'

const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage'))
const CustomersPage = lazy(() => import('./components/customers/CustomersPage'))
const CheckInPage = lazy(() => import('./components/checkin/CheckInPage'))
const VisitsPage = lazy(() => import('./components/visits/VisitsPage'))
const RoutesPage = lazy(() => import('./components/routes/RoutesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const SALES_BASENAME = '/sales'
const SESSION_BOOTSTRAP_TIMEOUT_MS = 1_500
const PROFILE_LOOKUP_TIMEOUT_MS = 1_500

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-[rgb(var(--muted-fg))]">جاري التحميل...</p>
    </div>
  )
}

function ThemeSync() {
  const themeMode = useAppStore((state) => state.themeMode)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', themeMode === 'dark')
    document.documentElement.style.colorScheme = themeMode
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', themeMode === 'dark' ? '#022c22' : '#ffffff')
    }
  }, [themeMode])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    document.documentElement.classList.toggle('standalone', isStandalone)

    const media = window.matchMedia('(display-mode: standalone)')
    const onModeChange = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      document.documentElement.classList.toggle('standalone', standalone)
    }
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onModeChange)
    } else {
      media.addListener(onModeChange)
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', onModeChange)
      } else {
        media.removeListener(onModeChange)
      }
    }
  }, [])

  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/auth" replace />


  return (
    <>
      {children}
    </>
  )
}

function buildFallbackProfile(authUser: User): UserProfile {
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    full_name: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? 'User',
    role: 'sales_team',
    phone: authUser.phone ?? undefined,
    avatar_url: authUser.user_metadata?.avatar_url,
    team_id: undefined,
    is_active: true,
    created_at: authUser.created_at ?? new Date().toISOString(),
  }
}

export default function App() {
  const setUser = useAuthStore((state) => state.setUser)
  const setSession = useAuthStore((state) => state.setSession)
  const setLoading = useAuthStore((state) => state.setLoading)
  const profileId = useAuthStore((state) => state.user?.id)
  const setLocation = useAppStore((state) => state.setLocation)
  const setLocationPermission = useAppStore((state) => state.setLocationPermission)
  const setOffline = useAppStore((state) => state.setOffline)
  const loadNotifications = useAppStore((state) => state.loadNotifications)
  const skipProfileFetchRef = useRef(false)

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline])

  useEffect(() => {
    let mounted = true
    const persistedUser = useAuthStore.getState().user

    const resolveProfileWithTimeout = async (authUser: User) => {
      try {
        return await Promise.race<Record<string, unknown> | null>([
          findProfileByAuthUser<Record<string, unknown>>(supabase, authUser),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), PROFILE_LOOKUP_TIMEOUT_MS)),
        ])
      } catch (error) {
        throw error
      }
    }

    const syncUser = async (authUser: User | null) => {
      if (!mounted) return

      if (!authUser) {
        setUser(null)
        return
      }

      const fallbackProfile = buildFallbackProfile(authUser)
      const existingUser = useAuthStore.getState().user
      const mergedFallback =
        existingUser?.id === authUser.id ? { ...fallbackProfile, ...existingUser } : fallbackProfile
      setUser(mergedFallback)

      if (skipProfileFetchRef.current) {
        return
      }

      let resolvedProfile: Record<string, unknown> | null = null
      let profileLookupError: unknown = null

      try {
        resolvedProfile = await resolveProfileWithTimeout(authUser)
      } catch (error) {
        profileLookupError = error
      }

      if (!mounted) return

      if (!resolvedProfile && profileLookupError) {
        skipProfileFetchRef.current = true
        setUser(fallbackProfile)
        return
      }

      const mergedProfile: UserProfile = resolvedProfile
        ? {
            ...fallbackProfile,
            ...resolvedProfile,
            id: String(resolvedProfile.id ?? fallbackProfile.id),
            email: String(resolvedProfile.email ?? authUser.email ?? fallbackProfile.email),
          }
        : fallbackProfile

      setUser(mergedProfile)
    }

    Promise.race([
      withSupabaseLockRetry(() => supabase.auth.getSession()),
      new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), SESSION_BOOTSTRAP_TIMEOUT_MS)
      ),
    ])
      .then(({ data: { session } }) => {
        if (!mounted) return
        setSession(session)
        if (session?.user) {
          void syncUser(session.user)
          return
        }

        if (persistedUser) {
          setUser(persistedUser)
          return
        }

        setUser(null)
      })
      .catch((error) => {
        if (!mounted) return

        if (isSupabaseInvalidSessionError(error)) {
          void clearSupabaseBrowserSession()
          setSession(null)
          setUser(null)
          return
        }

        setSession(null)
        setUser(persistedUser ?? null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      void syncUser(session?.user ?? null)
      setLoading(false)
    })

    setLocationPermission('prompt')
    const stopLocationWatch = watchLocation(
      (position) => {
        setLocation(position)
        setLocationPermission('granted')
      },
      (error) => {
        setLocationPermission(error.code === 'PERMISSION_DENIED' ? 'denied' : useAppStore.getState().currentLocation ? 'granted' : 'prompt')
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
      stopLocationWatch()
    }
  }, [setLoading, setLocation, setLocationPermission, setSession, setUser])

  useEffect(() => {
    if (!profileId) return

    void loadNotifications()

    const channel = supabase
      .channel(`sales-notifications-${profileId}`)
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
            playNotificationSound()
          }
          void loadNotifications()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadNotifications, profileId])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <AppErrorBoundary>
      <BrowserRouter basename={SALES_BASENAME}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="customers"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CustomersPage />
                </Suspense>
              }
            />
            <Route
              path="checkin/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CheckInPage />
                </Suspense>
              }
            />
            <Route
              path="visits"
              element={
                <Suspense fallback={<PageLoader />}>
                  <VisitsPage />
                </Suspense>
              }
            />
            <Route
              path="routes"
              element={
                <Suspense fallback={<PageLoader />}>
                  <RoutesPage />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="notifications"
              element={
                <Suspense fallback={<PageLoader />}>
                  <NotificationsPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </AppErrorBoundary>
    </QueryClientProvider>
  )
}
