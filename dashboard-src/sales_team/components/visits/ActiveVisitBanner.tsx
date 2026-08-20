import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVisitStore } from '../../store/visitStore'
import { formatTime } from '../../lib/utils'
import { IconVisits, IconClock } from '../shared/Icons'

export default function ActiveVisitBanner() {
  const activeVisit = useVisitStore((state) => state.activeVisit)
  const updateElapsed = useVisitStore((state) => state.updateElapsed)
  const endVisit = useVisitStore((state) => state.endVisit)
  const navigate = useNavigate()
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activeVisit) return

    intervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeVisit.startTime) / 1000)
      updateElapsed(elapsed)
    }, 1000)

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [activeVisit?.startTime, updateElapsed])

  if (!activeVisit) return null

  const handleCancel = (event: React.MouseEvent) => {
    event.stopPropagation()
    endVisit()
  }

  return (
    <div
      onClick={() => navigate('/visits')}
      className="flex w-full cursor-pointer items-center gap-3 border-b border-soft bg-[rgb(var(--surface))] px-4 py-2.5 text-right transition-colors hover:bg-[rgb(var(--surface-soft))]"
    >
      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[rgb(var(--warning))]" />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <IconVisits size={14} className="flex-shrink-0 text-[rgb(var(--warning))]" />
        <span className="truncate text-xs font-semibold text-[rgb(var(--fg))]">زيارة نشطة: {activeVisit.customerName}</span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5 text-[rgb(var(--muted-fg))]">
        <IconClock size={12} />
        <span className="font-mono text-xs">{formatTime(activeVisit.elapsed)}</span>
      </div>
      <button
        onClick={handleCancel}
        className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
      >
        إلغاء
      </button>
    </div>
  )
}
