/**
 * PWA Installation Store - Handles install prompts and events
 */

import { create } from 'zustand'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PWAInstallationState {
  canInstall: boolean
  isInstalled: boolean
  isIOS: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void
  clearDeferredPrompt: () => void
  setInstalled: (installed: boolean) => void
  install: () => Promise<void>
}

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

let pwaListenersRegistered = false

const detectInstalledState = () => {
  if (typeof window === 'undefined') return false
  return (
    document.referrer.startsWith('android-app://') ||
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    localStorage.getItem('pwa_installed') === 'true'
  )
}

export const usePWAStore = create<PWAInstallationState>((set, get) => {
  if (typeof window !== 'undefined' && !pwaListenersRegistered) {
    pwaListenersRegistered = true

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent
      e.preventDefault()
      set({ canInstall: true, deferredPrompt: promptEvent })
    })

    window.addEventListener('appinstalled', () => {
      set({ isInstalled: true })
      localStorage.setItem('pwa_installed', 'true')
    })
  }

  return {
    canInstall: false,
    isInstalled: detectInstalledState(),
    isIOS: typeof window !== 'undefined' && isIOS(),
    deferredPrompt: null,

    setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => {
      set({ deferredPrompt: prompt, canInstall: !!prompt })
    },

    clearDeferredPrompt: () => {
      set({ deferredPrompt: null })
    },

    setInstalled: (installed: boolean) => {
      set({ isInstalled: installed })
      if (installed) {
        localStorage.setItem('pwa_installed', 'true')
      }
    },

    install: async () => {
      const state = get()

      if (!state.deferredPrompt) {
        console.warn('Install prompt not available')
        return
      }

      try {
        state.deferredPrompt.prompt()
        const result = await state.deferredPrompt.userChoice

        if (result.outcome === 'accepted') {
          set({ isInstalled: true })
          localStorage.setItem('pwa_installed', 'true')
        }
        set({ deferredPrompt: null, canInstall: false })
      } catch (error) {
        console.error('Install failed:', error)
      }
    }
  }
})

/**
 * Get iOS installation instructions
 */
export function getIOSInstallInstructions(): string {
  return `
    ١. اضغط زر المشاركة
    ٢. اختر "إضافة إلى الشاشة الرئيسية"
    ٣. اضغط "إضافة"
  `.trim()
}

/**
 * Check if PWA is installed
 */
export function isPWAInstalled(): boolean {
  const isPWA =
    typeof window !== 'undefined' &&
    (document.referrer.startsWith('android-app://') ||
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches)

  return isPWA || (typeof localStorage !== 'undefined' && localStorage.getItem('pwa_installed') === 'true')
}

/**
 * Request to dismiss install prompt
 */
export function dismissInstallPrompt(): void {
  localStorage.setItem('pwa_install_dismissed', Date.now().toString())
}

/**
 * Check if install prompt was dismissed recently
 */
export function isInstallPromptDismissed(): boolean {
  const dismissed = localStorage.getItem('pwa_install_dismissed')
  if (!dismissed) return false

  // Show again after 7 days
  const dismissedTime = parseInt(dismissed)
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  return Date.now() - dismissedTime < sevenDaysMs
}
