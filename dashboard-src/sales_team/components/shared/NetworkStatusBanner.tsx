import React, { useEffect, useState } from 'react'

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine
  })

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[75] px-3 pb-3 md:px-4 md:pb-4">
      <div className="mx-auto w-full max-w-xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm font-semibold text-amber-800 shadow-lg dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300">
        أنت غير متصل. قد تفشل بعض الإجراءات حتى تعود الشبكة.
      </div>
    </div>
  )
}
