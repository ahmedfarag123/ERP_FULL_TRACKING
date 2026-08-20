import { useMemo, useState } from 'react'
import { getBestEffortPosition } from '../../lib/location'
import { useAppStore } from '../../store/appStore'

export default function LocationStatusChip() {
  const currentLocation = useAppStore((state) => state.currentLocation)
  const locationPermission = useAppStore((state) => state.locationPermission)
  const setLocation = useAppStore((state) => state.setLocation)
  const setLocationPermission = useAppStore((state) => state.setLocationPermission)
  const [loading, setLoading] = useState(false)

  const status = useMemo(() => {
    if (loading) {
      return {
        label: 'Locating...',
        dot: 'bg-amber-400',
        surface: 'bg-amber-50 dark:bg-amber-500/10',
        text: 'text-amber-700 dark:text-amber-200',
      }
    }

    if (currentLocation) {
      return {
        label: 'الموقع نشط',
        dot: 'bg-emerald-500',
        surface: 'bg-emerald-50 dark:bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-200',
      }
    }

    if (locationPermission === 'denied') {
      return {
        label: 'الموقع محظور',
        dot: 'bg-rose-500',
        surface: 'bg-rose-50 dark:bg-rose-500/10',
        text: 'text-rose-700 dark:text-rose-200',
      }
    }

    return {
      label: 'الموقع مطلوب',
      dot: 'bg-slate-400',
      surface: 'bg-slate-100 dark:bg-slate-500/10',
      text: 'text-slate-700 dark:text-slate-200',
    }
  }, [currentLocation, loading, locationPermission])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const location = await getBestEffortPosition({
        fallback: currentLocation,
        preferCached: false,
        timeoutMs: 6_000,
        maximumAgeMs: 0,
      })
      setLocation(location)
      setLocationPermission('granted')
    } catch {
      setLocationPermission('denied')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      className={`inline-flex items-center gap-2 rounded-lg border border-app-border px-3 py-2 text-xs font-semibold backdrop-blur-md transition hover:opacity-90 ${status.surface} ${status.text}`}
      title="تحديث الموقع"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
      <span>{status.label}</span>
    </button>
  )
}
