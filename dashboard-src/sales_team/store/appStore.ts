import { create } from 'zustand'
import type { Notification } from '../types'
import type { Coordinates } from '../lib/location'
import { fetchSalesNotifications, markSalesNotificationRead } from '../lib/notificationInbox'

const notificationPreferenceStorageKey = 'app.notifications.enabled'
const themeStorageKey = 'app.theme.mode'

const getInitialNotificationPreference = () => {
  if (typeof window === 'undefined') return false
  const savedPreference = window.localStorage.getItem(notificationPreferenceStorageKey)
  if (savedPreference === 'true') return true
  if (savedPreference === 'false') return false
  return 'Notification' in window && Notification.permission === 'granted'
}

type ThemeMode = 'light' | 'dark'

const getInitialThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light'
  const savedTheme = window.localStorage.getItem(themeStorageKey)
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return 'light'
}

interface AppState {
  sidebarOpen: boolean
  isOffline: boolean
  notifications: Notification[]
  unreadCount: number
  notificationsEnabled: boolean
  themeMode: ThemeMode
  currentLocation: Coordinates | null
  locationPermission: 'granted' | 'denied' | 'prompt'
  setSidebarOpen: (open: boolean) => void
  setOffline: (offline: boolean) => void
  setNotificationsEnabled: (enabled: boolean) => void
  setThemeMode: (mode: ThemeMode) => void
  addNotification: (n: Omit<Notification, 'id' | 'created_at' | 'read'>) => void
  setNotifications: (notifications: Notification[]) => void
  loadNotifications: () => Promise<void>
  markNotificationRead: (id: string) => void
  markAllRead: () => void
  setLocation: (loc: Coordinates | null) => void
  setLocationPermission: (p: 'granted' | 'denied' | 'prompt') => void
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarOpen: false,
  isOffline: false,
  notifications: [],
  unreadCount: 0,
  notificationsEnabled: getInitialNotificationPreference(),
  themeMode: getInitialThemeMode(),
  currentLocation: null,
  locationPermission: 'prompt',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setOffline: (offline) => set({ isOffline: offline }),
  setNotificationsEnabled: (enabled) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(notificationPreferenceStorageKey, String(enabled))
    }
    set({ notificationsEnabled: enabled })
  },
  setThemeMode: (mode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(themeStorageKey, mode)
    }
    set({ themeMode: mode })
  },
  addNotification: (n) => set((s) => {
    const notif: Notification = {
      ...n, id: crypto.randomUUID(),
      created_at: new Date().toISOString(), read: false
    }
    return {
      notifications: [notif, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1
    }
  }),
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
  }),
  loadNotifications: async () => {
    const notifications = await fetchSalesNotifications()
    set({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
    })
  },
  markNotificationRead: (id) => {
    set((s) => {
      const notifications = s.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
      return {
        notifications,
        unreadCount: notifications.filter((notification) => !notification.read).length,
      }
    })
    void markSalesNotificationRead(id).catch(() => undefined)
  },
  markAllRead: () => {
    const unreadIds = get().notifications.filter((notification) => !notification.read).map((notification) => String(notification.id))
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    }))
    void Promise.all(unreadIds.map((id) => markSalesNotificationRead(id))).catch(() => undefined)
  },
  setLocation: (loc) => set({ currentLocation: loc }),
  setLocationPermission: (p) => set({ locationPermission: p })
}))
