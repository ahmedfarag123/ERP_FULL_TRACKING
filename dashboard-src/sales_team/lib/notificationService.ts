import { SALES_ICON_192_SRC } from './appAssets'

/**
 * Notification Service - Handles native browser & web push notifications
 */

export interface NotificationPayload {
  title: string
  body?: string
  tag?: string
  icon?: string
  badge?: string
  vibrate?: number[]
  requireInteraction?: boolean
  actions?: NotificationAction[]
  data?: Record<string, any>
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported')
    return 'denied'
  }

  if (Notification.permission !== 'default') {
    return Notification.permission
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (!('Notification' in window)) return false
  const savedPreference = window.localStorage.getItem('app.notifications.enabled')
  const appPreferenceEnabled = savedPreference !== 'false'
  return Notification.permission === 'granted' && appPreferenceEnabled
}

/**
 * Show a native notification
 */
export function showNotification(payload: NotificationPayload): Promise<void> {
  return new Promise((resolve) => {
    if (!areNotificationsEnabled()) {
      console.warn('Notifications not enabled')
      resolve()
      return
    }

    const notificationOptions: NotificationOptions = {
      body: payload.body,
      tag: payload.tag,
      icon: payload.icon ?? SALES_ICON_192_SRC,
      badge: payload.badge ?? SALES_ICON_192_SRC,
      requireInteraction: payload.requireInteraction ?? false,
      data: payload.data
    }
    // Only add actions if supported
    if ('actions' in Notification.prototype && payload.actions) {
      (notificationOptions as any).actions = payload.actions;
    }
    // Only add vibrate if supported
    if ('vibrate' in Notification.prototype && payload.vibrate) {
      (notificationOptions as any).vibrate = payload.vibrate;
    }
    const notification = new Notification(payload.title, notificationOptions);

    notification.addEventListener('click', () => {
      notification.close()
      window.focus()
      resolve()
    })

    notification.addEventListener('close', () => {
      resolve()
    })

    // Auto close after 5 seconds if not requireInteraction
    if (!payload.requireInteraction) {
      setTimeout(() => {
        notification.close()
      }, 5000)
    }
  })
}

/**
 * Show toast-like notification
 */
export function showToastNotification(message: string, duration = 3000): void {
  if (!areNotificationsEnabled()) {
    // Fallback to console
    console.log(message)
    return
  }

  showNotification({
    title: message,
    tag: 'toast',
    requireInteraction: false
  }).catch(console.error)
}

/**
 * Show persistent notification
 */
export function showPersistentNotification(payload: NotificationPayload): void {
  if (!areNotificationsEnabled()) {
    console.log('Notification:', payload.title, payload.body)
    return
  }

  showNotification({
    ...payload,
    requireInteraction: true
  }).catch(console.error)
}

/**
 * Close notification by tag
 */
export function closeNotification(tag: string): void {
  // Close via service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLOSE_NOTIFICATION',
      tag
    })
  }
}

/**
 * Retrieve active notifications
 */
export async function getActiveNotifications(): Promise<Notification[]> {
  if ('getNotifications' in Notification) {
    // TypeScript doesn't know about getNotifications, so cast
    const getNotifications = (Notification as any).getNotifications;
    if (typeof getNotifications === 'function') {
      return await getNotifications.call(Notification);
    }
  }
  return [];
}

export const NotificationSounds = {
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  info: '/sounds/info.mp3'
}

/**
 * Play notification sound
 */
export function playNotificationSound(soundUrl: string): void {
  try {
    const audio = new Audio(soundUrl)
    audio.play().catch((err) => {
      console.warn('Could not play notification sound:', err)
    })
  } catch (error) {
    console.error('Error playing sound:', error)
  }
}

/**
 * Vibrate device (haptic feedback)
 */
export function vibrateDevice(pattern: number | number[] = [100, 50, 100]): void {
  if ('vibrate' in navigator) {
    try {
      (navigator as any).vibrate(pattern)
    } catch (error) {
      console.warn('Vibration not available:', error)
    }
  }
}

/**
 * Create analytics notification for user actions
 */
export async function notifyUserAction(action: string, metadata?: Record<string, any>): Promise<void> {
  if (areNotificationsEnabled()) {
    const title = `${action} completed`
    const body = metadata
      ? Object.entries(metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      : undefined

    await showNotification({
      title,
      body,
      tag: `action-${Date.now()}`,
      icon: SALES_ICON_192_SRC
    })
  }
}
