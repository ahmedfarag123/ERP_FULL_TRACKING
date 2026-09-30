import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OfflineAction, Notification } from '@/types';
import { fetchDriverNotifications, markDriverNotificationRead } from '@/services/driverNotifications';
import { updateShipmentPhase, reportDeliveryFailure, driverUpdateShipmentItems } from '@/services/shipmentData';
import { getPendingWrites, removePendingWrite } from '@/lib/offlineCache';

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface UIState {
  isOffline: boolean;
  connectionStatus: ConnectionStatus;
  isDriverOnline: boolean;
  activeTab: 'dashboard' | 'deliveries' | 'route' | 'collection' | 'settings';
  pendingSyncCount: number;
  offlineActions: OfflineAction[];
  notifications: Notification[];
  notificationsError: string | null;
  showOfflineBanner: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  isToastVisible: boolean;

  setOffline: (offline: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setDriverOnline: (online: boolean) => void;
  setActiveTab: (tab: 'dashboard' | 'deliveries' | 'route' | 'collection' | 'settings') => void;
  queueOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  removeOfflineAction: (id: string) => void;
  syncOfflineActions: () => Promise<void>;
  syncPendingIndexedDBWrites: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  loadNotifications: () => Promise<void>;
}

function toNotificationType(value: unknown): Notification['type'] {
  if (value === 'delivery' || value === 'alert' || value === 'sync' || value === 'system') {
    return value;
  }

  return 'system';
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function phaseFromStatus(value: unknown) {
  switch (value) {
    case 'delivered':
      return 'delivered';
    case 'failed':
      return 'failed';
    case 'in_transit':
      return 'in_transit';
    case 'pending':
      return 'pending';
    default:
      return null;
  }
}

async function replayOfflineAction(action: OfflineAction) {
  const payload = action.payload ?? {};

  if (action.type === 'items_updated') {
    const items = Array.isArray(payload.items)
      ? (payload.items as Array<{ itemId: string; doneQuantity: number }>)
      : [];
    if (items.length === 0) {
      throw new Error(`Offline action ${action.id} has no item quantities to persist.`);
    }
    await driverUpdateShipmentItems(action.shipmentId, items);
    return;
  }

  if (action.type === 'failure_reported') {
    const returnType = (stringValue(payload.returnType) as 'full' | 'partial') ?? 'full';
    const failureReason = stringValue(payload.failureReason) ?? stringValue(payload.reason) ?? 'unknown';
    const note = stringValue(payload.note);
    const returnItems = Array.isArray(payload.returnItems) ? payload.returnItems as Array<{ itemId: string; productName: string; returnedQuantity: number }> : undefined;

    await reportDeliveryFailure({
      shipmentId: action.shipmentId,
      failureReason,
      note: note ?? undefined,
      returnType,
      returnItems,
      proofPhotoPath: stringValue(payload.proofPhotoPath) ?? stringValue(payload.photoUrl) ?? null,
    });
    return;
  }

  const nextPhase =
    stringValue(payload.nextPhase) ??
    phaseFromStatus(payload.status) ??
    (action.type === 'pod_uploaded' ? 'delivered' : null) ??
    null;

  if (!nextPhase) {
    throw new Error(`Offline action ${action.id} is missing a shipment phase.`);
  }

  const reason = stringValue(payload.reason);
  const note = stringValue(payload.note);
  const proofPhotoPath = stringValue(payload.proofPhotoPath) ?? stringValue(payload.photoUrl);
  const replayPayload = {
    ...payload,
    offlineActionId: action.id,
    queuedAt: action.timestamp,
    replayedAt: new Date().toISOString(),
  };

  await updateShipmentPhase({
    shipmentId: action.shipmentId,
    nextPhase,
    note: reason && note ? `${reason}: ${note}` : note ?? reason ?? undefined,
    proofPhotoPath,
    payload: replayPayload,
  });
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isOffline: false,
      connectionStatus: 'online' as ConnectionStatus,
      isDriverOnline: true,
      activeTab: 'dashboard',
      pendingSyncCount: 0,
      offlineActions: [],
      notifications: [],
      notificationsError: null,
      showOfflineBanner: false,
      toastMessage: null,
      toastType: 'success',
      isToastVisible: false,

      setOffline: (offline) =>
        set({
          isOffline: offline,
          showOfflineBanner: offline,
          connectionStatus: offline ? 'offline' : 'online',
        }),

      setConnectionStatus: (status) =>
        set({
          connectionStatus: status,
          isOffline: status === 'offline',
          showOfflineBanner: status === 'offline',
        }),

      setDriverOnline: (online) => set({ isDriverOnline: online }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      queueOfflineAction: (action) => {
        const newAction: OfflineAction = {
          ...action,
          id: `offline-${Date.now()}`,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        };
        set((state) => ({
          offlineActions: [...state.offlineActions, newAction],
          pendingSyncCount: state.pendingSyncCount + 1,
        }));
      },

      removeOfflineAction: (id) => {
        set((state) => ({
          offlineActions: state.offlineActions.filter((a) => a.id !== id),
          pendingSyncCount: Math.max(0, state.pendingSyncCount - 1),
        }));
      },

      syncOfflineActions: async () => {
        const { offlineActions } = get();
        if (offlineActions.length === 0) return;

        set({ connectionStatus: 'syncing' });
        const failedActions: OfflineAction[] = [];

        for (const action of offlineActions) {
          try {
            await replayOfflineAction(action);
          } catch {
            failedActions.push({
              ...action,
              retryCount: action.retryCount + 1,
            });
          }
        }

        set({
          offlineActions: failedActions,
          pendingSyncCount: failedActions.length,
          connectionStatus: failedActions.length > 0 ? 'online' : 'online',
        });

        if (failedActions.length > 0) {
          throw new Error(`${failedActions.length} offline action(s) could not be synced.`);
        }
      },

      syncPendingIndexedDBWrites: async () => {
        const pending = await getPendingWrites();
        if (pending.length === 0) return;

        set({ connectionStatus: 'syncing' });

        for (const write of pending) {
          try {
            const { supabase } = await import('@/lib/supabase');
            if (write.operation === 'delete') {
              await supabase.from(write.table).delete().eq('id', (write.payload as { id: string }).id);
            } else if (write.operation === 'upsert') {
              await supabase.from(write.table).upsert(write.payload as Record<string, unknown>);
            } else if (write.operation === 'update') {
              const p = write.payload as { id: string; data: Record<string, unknown> };
              await supabase.from(write.table).update(p.data).eq('id', p.id);
            } else {
              await supabase.from(write.table).insert(write.payload as Record<string, unknown>);
            }
            await removePendingWrite(write.id);
          } catch {
            // Will retry on next connection restore
          }
        }

        set({ connectionStatus: 'online' });
      },

      showToast: (message, type = 'success') => {
        set({
          toastMessage: message,
          toastType: type,
          isToastVisible: true,
        });
        setTimeout(() => {
          set({ isToastVisible: false });
        }, 3000);
      },

      hideToast: () => {
        set({ isToastVisible: false });
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
        void markDriverNotificationRead(id).catch(() => undefined);
      },

      markAllNotificationsRead: () => {
        const unreadIds = get().notifications.filter((n) => !n.read).map((n) => n.id);
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
        void Promise.all(unreadIds.map((id) => markDriverNotificationRead(id))).catch(() => undefined);
      },

      loadNotifications: async () => {
        try {
          const notifications = await fetchDriverNotifications();
          set({
            notificationsError: null,
            notifications: notifications.map((notification) => ({
              id: notification.id,
              type: toNotificationType(notification.metadata?.type ?? 'system'),
              title: notification.title,
              message: notification.body,
              timestamp: notification.sentAt,
              read: Boolean(notification.readAt),
            })),
          });
        } catch (error) {
          set({
            notificationsError: error instanceof Error ? error.message : String(error),
          });
        }
      },
    }),
    {
      name: 'horeca-ui-storage',
      partialize: (state) => ({
        activeTab: state.activeTab,
        isDriverOnline: state.isDriverOnline,
        offlineActions: state.offlineActions,
        pendingSyncCount: state.pendingSyncCount,
      }),
    }
  )
);
