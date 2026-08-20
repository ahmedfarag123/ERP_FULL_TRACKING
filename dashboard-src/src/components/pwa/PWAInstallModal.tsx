import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith('android-app://')
  )
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

export default function PWAInstallModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [dismissed, setDismissed] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const ios = isIOS()

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setDismissed(false)
    }
    const markInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    window.addEventListener('appinstalled', markInstalled)
    setInstalled(isStandalone())

    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (choice.outcome === 'accepted') setInstalled(true)
    else setDismissed(true)
  }

  if (installed || dismissed || (!deferredPrompt && !ios)) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-slate-950/40 p-3 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="تثبيت تطبيق لوحة التحكم">
      <section className="w-full max-w-md rounded-2xl bg-white p-5 text-right text-slate-900 shadow-2xl" dir="rtl">
        <h2 className="text-lg font-bold">ثبّت لوحة التحكم</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">ثبّت التطبيق للوصول الأسرع وتجربة أفضل على جهازك.</p>
        {ios && showIOSGuide && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">اضغط زر المشاركة في Safari، ثم اختر «إضافة إلى الشاشة الرئيسية»، وبعدها اضغط «إضافة».</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          {ios ? (
            <button type="button" onClick={() => setShowIOSGuide(true)} className="min-h-11 flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">كيفية التثبيت</button>
          ) : (
            <button type="button" onClick={() => void install()} className="min-h-11 flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">ثبّت الآن</button>
          )}
          <button type="button" onClick={() => setDismissed(true)} className="min-h-11 flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">لاحقاً</button>
        </div>
      </section>
    </div>
  )
}
