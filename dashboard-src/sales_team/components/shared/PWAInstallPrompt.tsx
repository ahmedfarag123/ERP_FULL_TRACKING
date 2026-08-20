/**
 * PWA Install Prompt Component
 */

import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePWAStore, getIOSInstallInstructions, dismissInstallPrompt, isInstallPromptDismissed } from '../../store/pwaStore'
import clsx from 'clsx'

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIOS, install } = usePWAStore()
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isHighIntent, setIsHighIntent] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const key = 'pwa_route_intent_v1'
    const value = window.sessionStorage.getItem(key)
    let parsed: string[] = []
    if (value) {
      try {
        parsed = JSON.parse(value)
      } catch {
        parsed = []
      }
    }

    const visitedRoutes = new Set<string>(parsed)
    visitedRoutes.add(pathname)
    window.sessionStorage.setItem(key, JSON.stringify(Array.from(visitedRoutes)))

    // Show prompt only after at least 2 distinct route visits.
    setIsHighIntent(visitedRoutes.size >= 2)
  }, [pathname])

  useEffect(() => {
    // Respect dismissals and avoid prompting without clear intent.
    if (isInstalled || !isHighIntent || isInstallPromptDismissed()) return

    if (canInstall || isIOS) {
      setShowPrompt(true)
    }
  }, [canInstall, isHighIntent, isInstalled, isIOS])

  const handleDismiss = () => {
    setShowPrompt(false)
    dismissInstallPrompt()
  }

  if (!showPrompt) return null

  if (isIOS) {
    return (
      <div
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-50',
          'rounded-t-xl border-t border-soft bg-[rgb(var(--surface))] p-4 text-[rgb(var(--fg))] shadow-lg',
          'safe-bottom'
        )}
      >
        <div className="max-w-2xl mx-auto">
          <h3 className="font-semibold text-lg mb-2">تثبيت التطبيق</h3>
          <p className="text-sm mb-3 opacity-90">أضف التطبيق إلى الشاشة الرئيسية للوصول السريع بدون متصفح.</p>

          {!showIOSGuide && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="w-full min-h-11 rounded-lg bg-[rgb(var(--primary))] py-2 font-semibold text-[rgb(var(--primary-fg))] hover:bg-[rgb(var(--primary-strong))]"
            >
              كيفية التثبيت
            </button>
          )}

          {showIOSGuide && (
            <div className="mb-3 rounded-lg border border-soft bg-[rgb(var(--surface-soft))] p-3 text-sm">
              <p className="whitespace-pre-line">{getIOSInstallInstructions()}</p>
            </div>
          )}

          <button
            onClick={handleDismiss}
            className="mt-2 w-full min-h-11 py-2 font-medium text-[rgb(var(--muted-fg))] hover:text-[rgb(var(--fg))]"
          >
            إغلاق
          </button>
        </div>
      </div>
    )
  }

  if (!canInstall) return null

  return (
    <div
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50',
        'rounded-t-xl border-t border-soft bg-[rgb(var(--surface))] p-4 text-[rgb(var(--fg))] shadow-lg',
        'safe-bottom'
      )}
    >
      <div className="max-w-2xl mx-auto">
        <h3 className="font-semibold text-lg mb-1">تثبيت التطبيق</h3>
        <p className="text-sm mb-4 opacity-90">
          ثبّت التطبيق لتشغيل أسرع وتجربة أقرب للتطبيقات الأصلية.
        </p>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              await install()
              setShowPrompt(false)
            }}
            className={clsx(
              'flex-1 min-h-11 rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-[rgb(var(--primary-fg))]',
              'font-semibold hover:bg-[rgb(var(--primary-strong))]'
            )}
          >
            ثبِت الآن
          </button>

          <button
            onClick={handleDismiss}
            className={clsx(
              'flex-1 min-h-11 rounded-lg border border-soft px-4 py-2 text-[rgb(var(--muted-fg))]',
              'font-semibold hover:text-[rgb(var(--fg))]'
            )}
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
