const DEV_SW_CLEANUP_KEY = 'dev-sw-cleanup-reloaded'
const DEV_SW_RELOAD_KEY = 'dev-sw-cleanup-controller-reload'

function isLocalDevHost() {
  if (typeof window === 'undefined') return false

  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

export async function cleanupDevServiceWorkers() {
  if (!import.meta.env.DEV || !isLocalDevHost()) {
    return
  }

  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    if (url.searchParams.get(DEV_SW_CLEANUP_KEY) === '1' || url.searchParams.get('sw-dev-clean') === '1') {
      url.searchParams.delete(DEV_SW_CLEANUP_KEY)
      url.searchParams.delete('sw-dev-clean')
      window.history.replaceState({}, '', url.toString())
    }
  }

  if (!('serviceWorker' in navigator)) {
    return
  }

  if (window.sessionStorage.getItem(DEV_SW_CLEANUP_KEY) === 'true') {
    return
  }

  try {
    Object.defineProperty(navigator.serviceWorker, 'register', {
      configurable: true,
      value: () => Promise.reject(new Error('Service worker registration is disabled in local dev.')),
    })
  } catch {
    // Some browsers expose register as read-only; cleanup still proceeds.
  }

  navigator.serviceWorker.addEventListener(
    'controllerchange',
    (event) => {
      event.stopImmediatePropagation()
    },
    { once: true, capture: true },
  )

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))

  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
  }

  window.sessionStorage.setItem(DEV_SW_CLEANUP_KEY, 'true')

  if (navigator.serviceWorker.controller && window.sessionStorage.getItem(DEV_SW_RELOAD_KEY) !== 'true') {
    window.sessionStorage.setItem(DEV_SW_RELOAD_KEY, 'true')
    const url = new URL(window.location.href)
    url.searchParams.set('sw-dev-clean', '1')
    window.location.replace(url.toString())
  }
}
