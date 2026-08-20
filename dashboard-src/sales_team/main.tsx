import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useAppStore } from './store/appStore'

const applyThemeClass = (mode: 'light' | 'dark') => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode
  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) {
    themeMeta.setAttribute('content', mode === 'dark' ? '#0a0f1e' : '#ffffff')
  }
}

const syncDisplayModeClass = () => {
  if (typeof document === 'undefined') return
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true

  document.documentElement.classList.toggle('standalone', isStandalone)
}

// Apply initial theme before rendering to reduce theme flash.
document.documentElement.lang = 'ar-EG'
document.documentElement.dir = 'rtl'
document.title = 'هوريكا سمارت | تطبيق مندوب المبيعات'
applyThemeClass(useAppStore.getState().themeMode)
syncDisplayModeClass()

function ThemeSync() {
  const themeMode = useAppStore.getState().themeMode

  useEffect(() => {
    applyThemeClass(themeMode)
  }, [themeMode])

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const onModeChange = () => syncDisplayModeClass()
    syncDisplayModeClass()
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
