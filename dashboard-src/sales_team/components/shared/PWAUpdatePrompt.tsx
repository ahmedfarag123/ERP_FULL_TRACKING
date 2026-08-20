import React, { useEffect, useState } from 'react'
import clsx from 'clsx'

export default function PWAUpdatePrompt() {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleControllerChange = () => setHasUpdate(true)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  if (!hasUpdate) return null

  return (
    <div className="safe-top fixed inset-x-0 top-2 z-[70] px-3 md:px-4">
      <div
        className={clsx(
          'mx-auto w-full max-w-xl rounded-2xl border border-soft bg-[rgb(var(--surface))] p-3 shadow-xl',
          'backdrop-blur supports-[backdrop-filter]:bg-[rgba(255,255,255,0.88)] dark:supports-[backdrop-filter]:bg-[rgba(16,24,40,0.86)]'
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm font-medium text-[rgb(var(--fg))]">يتوفر إصدار جديد من التطبيق.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-xl bg-[rgb(var(--primary))] px-3 py-2 text-sm font-semibold text-[rgb(var(--primary-fg))] transition-colors hover:bg-[rgb(var(--primary-strong))]"
          >
            تحديث
          </button>
          <button
            type="button"
            onClick={() => setHasUpdate(false)}
            className="min-h-11 rounded-xl border border-soft px-3 py-2 text-sm font-semibold text-[rgb(var(--muted-fg))] transition-colors hover:text-[rgb(var(--fg))]"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  )
}
