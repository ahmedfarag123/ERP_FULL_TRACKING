import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  fetchDispatcherNotifications,
  markDispatcherNotificationRead,
  type DispatcherNotification,
} from '../services/dispatcherNotifications';

type TabKey = 'home' | 'orders' | 'plans' | 'inventory' | 'settings';

interface UIState {
  isOffline: boolean;
  activeTab: TabKey;
  notifications: DispatcherNotification[];
  notificationsError: string | null;
  toastMessage: string;
  toastType: 'success' | 'error' | 'info';
  isToastVisible: boolean;
  setOffline: (offline: boolean) => void;
  setActiveTab: (tab: TabKey) => void;
  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isOffline: false,
      activeTab: 'home',
      notifications: [],
      notificationsError: null,
      toastMessage: '',
      toastType: 'info',
      isToastVisible: false,

      setOffline: (offline) => set({ isOffline: offline }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      loadNotifications: async () => {
        try {
          set({ notifications: await fetchDispatcherNotifications(), notificationsError: null });
        } catch (error) {
          set({ notificationsError: error instanceof Error ? error.message : String(error) });
        }
      },
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification
          ),
        }));
        void markDispatcherNotificationRead(id).catch(() => undefined);
      },
      markAllNotificationsRead: () => {
        const unreadIds = get().notifications.filter((notification) => !notification.read).map((notification) => notification.id);
        set((state) => ({
          notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
        }));
        void Promise.all(unreadIds.map((id) => markDispatcherNotificationRead(id))).catch(() => undefined);
      },
      showToast: (message, type = 'info') => {
        if (toastTimer) clearTimeout(toastTimer);
        set({ toastMessage: message, toastType: type, isToastVisible: true });
        toastTimer = setTimeout(() => set({ isToastVisible: false }), 3000);
      },
    }),
    { name: 'dispatcher-ui-storage', partialize: (state) => ({ activeTab: state.activeTab }) }
  )
);
