/**
 * PWA Utilities - Helper functions for PWA features
 */

import { requestLocationPermission, getCurrentLocation } from './locationService'
import { requestNotificationPermission, showNotification } from './notificationService'
import { loadCacheFromIndexedDB, persistCacheToIndexedDB } from './cacheService'

/**
 * Initialize all PWA permissions
 */
export async function initializePWAPermissions() {
  const permissions = {
    location: false,
    notifications: false
  }

  try {
    // Request location permission
    permissions.location = await requestLocationPermission()
  } catch (error) {
    console.warn('Location permission request failed:', error)
  }

  try {
    // Request notification permission
    const notifPermission = await requestNotificationPermission()
    permissions.notifications = notifPermission === 'granted'
  } catch (error) {
    console.warn('Notification permission request failed:', error)
  }

  return permissions
}

/**
 * Setup service worker with message handling
 */
export function setupServiceWorker() {
  // Registration is handled centrally via `virtual:pwa-register`.
  return 'serviceWorker' in navigator
}

/**
 * Register for background sync
 */
export async function registerBackgroundSync(tag = 'sync-data') {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('Background Sync not supported')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await (registration as any).sync.register(tag)
    console.log('Background sync registered:', tag)
    return true
  } catch (error) {
    console.error('Background sync registration failed:', error)
    return false
  }
}

/**
 * Register for periodic sync
 */
export async function registerPeriodicSync(tag = 'periodic-check', interval = 24 * 60 * 60 * 1000) {
  if (!('serviceWorker' in navigator) || !('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.warn('Periodic Sync not supported')
    return false
  }

  try {
    const permission = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName
    })

    if (permission.state !== 'granted') {
      console.warn('Periodic sync permission not granted')
      return false
    }

    const registration = await navigator.serviceWorker.ready
    await (registration as any).periodicSync.register(tag, {
      minInterval: interval
    })
    console.log('Periodic sync registered:', tag)
    return true
  } catch (error) {
    console.error('Periodic sync registration failed:', error)
    return false
  }
}

/**
 * Initialize offline support
 */
export async function initializeOfflineSupport() {
  try {
    // Load cached data from IndexedDB
    await loadCacheFromIndexedDB()

    // Listen for online/offline events
    window.addEventListener('online', () => {
      // Trigger sync if available
      registerBackgroundSync('sync-data')
    })

    window.addEventListener('offline', () => {
      // Persist cache
      persistCacheToIndexedDB()
    })

    return true
  } catch (error) {
    console.error('Offline support initialization failed:', error)
    return false
  }
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || 'unknown'
}

/**
 * Check if running as PWA
 */
export function isRunningAsPWA(): boolean {
  return (
    // Chrome, Edge
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari
    (window.navigator as any).standalone === true ||
    // Android
    document.referrer.startsWith('android-app://')
  )
}

/**
 * Request full screen on mobile
 */
export async function requestFullScreen() {
  try {
    const element = document.documentElement
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen()
    }
    return true
  } catch (error) {
    console.error('Full screen request failed:', error)
    return false
  }
}

/**
 * Get device info
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    onLine: navigator.onLine,
    memory: (navigator as any).deviceMemory || 'unknown',
    cores: navigator.hardwareConcurrency || 'unknown',
    touchSupport: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }
}

/**
 * Setup app update checker
 */
export function setupAppUpdateChecker(onUpdateAvailable?: () => void) {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    onUpdateAvailable?.()
  })
}

/**
 * Deep link support
 */
export function handleDeepLink(url: string) {
  if ('navigate' in window) {
    window.location.href = url
  }
}

/**
 * Enable wake lock (keep screen on)
 */
export async function enableWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen')
      console.log('Wake lock acquired')

      // Reacquire if wake lock released
      wakeLock.addEventListener('release', () => {
        console.log('Wake lock released')
      })

      return wakeLock
    } catch (error) {
      console.error('Wake lock request failed:', error)
      return null
    }
  }
  return null
}

/**
 * Request battery status
 */
export async function getBatteryStatus() {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery()
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      }
    } catch (error) {
      console.error('Battery API not available:', error)
    }
  }
  return null
}
