// Page Type: A
// Purpose: Show a feed of visits for the authenticated sales rep.
// Primary user action: Review outcomes and open proof photos from recent visits.
// Data source: visits table for the authenticated user.
import { useEffect, useMemo, useState } from 'react'
import { Clock, Camera, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { createVisitProofUrl, fetchSalesActivityFeed, type ActivityFeedItem } from '../../lib/salesActivity'
import { useAuthStore } from '../../store/authStore'

function outcomeTone(item: ActivityFeedItem) {
  if (item.outcomeTone === 'green') return 'badge-success'
  if (item.outcomeTone === 'red') return 'badge-error'
  if (item.outcomeTone === 'yellow') return 'badge-warning'
  return 'badge-info'
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return '٠ د'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return secs > 0
      ? `${mins.toLocaleString('ar-EG')} د ${secs.toLocaleString('ar-EG')} ث`
      : `${mins.toLocaleString('ar-EG')} د`
  }
  return `${secs.toLocaleString('ar-EG')} ث`
}

function fraudTone(item: ActivityFeedItem) {
  const status = String(item.fraudStatus ?? '').toLowerCase()
  if (!status || status === 'clear' || status === 'low' || status === 'approved') {
    return 'badge-success'
  }
  if (status.includes('high') || status.includes('fraud')) {
    return 'badge-error'
  }
  return 'badge-warning'
}

function geofenceTone(item: ActivityFeedItem) {
  if (item.geofenceStatus === 'inside') return 'badge-success'
  if (item.geofenceStatus === 'outside') return 'badge-warning'
  return 'bg-gray-100 text-gray-600'
}

function formatGeofenceLabel(item: ActivityFeedItem) {
  if (item.geofenceStatus === 'inside') return 'داخل النطاق'
  if (item.geofenceStatus === 'outside') return 'خارج النطاق'
  return 'النطاق غير معروف'
}

function formatVisitMode(value: string | null) {
  if (!value) return 'موقع الجهاز'
  const labels: Record<string, string> = {
    gps: 'موقع الجهاز',
    manual: 'يدوي',
    offline: 'دون اتصال',
    override: 'تجاوز',
  }
  const normalized = value.toLowerCase()
  if (labels[normalized]) return labels[normalized]
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase())
    .join(' ')
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  return `"${text.replace(/"/g, '""')}"`
}

function answerValue(answer: ActivityFeedItem['dynamicAnswers'][number]) {
  if (answer.answerText) return answer.answerText
  if (answer.answerJson == null) return ''
  return typeof answer.answerJson === 'string' ? answer.answerJson : JSON.stringify(answer.answerJson)
}

export default function VisitsPage() {
  const user = useAuthStore((state) => state.user)
  const [feed, setFeed] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!user?.id) {
        setFeed([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const items = await fetchSalesActivityFeed(user.id, 150)
        if (active) setFeed(items)
      } catch (error) {
        console.error('Failed to load visits feed.', error)
        if (active) setFeed([])
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [user?.id])

  const photoItems = useMemo(
    () => feed.filter((item) => Boolean(item.photoPath)),
    [feed]
  )

  const exportCsv = () => {
    const rows = [
      [
        'العميل',
        'وقت الحدوث',
        'النتيجة',
        'المدة',
        'مراجعة الاحتيال',
        'درجة المخاطر',
        'نطاق الموقع',
        'المسافة بالمتر',
        'وضع الزيارة',
        'سبب التجاوز',
        'الملاحظات',
        'الإجابات الديناميكية',
      ],
      ...feed.map((item) => [
        item.customerName,
        new Date(item.occurredAt).toISOString(),
        item.outcomeLabel,
        formatDuration(item.durationSeconds),
        item.fraudStatus ?? 'واضح',
        item.fraudScore ?? '',
        item.geofenceStatus,
        item.customerDistanceMeters ?? '',
        formatVisitMode(item.visitMode),
        item.overrideReason ?? '',
        item.note ?? '',
        item.dynamicAnswers.map((answer) => `${answer.label}: ${answerValue(answer)}`).join(' | '),
      ]),
    ]
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `visit-activity-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    let active = true

    const loadPhoto = async () => {
      const selected = selectedPhotoIndex != null ? photoItems[selectedPhotoIndex] : null
      if (!selected?.photoPath) {
        setSelectedPhotoUrl(null)
        return
      }

      try {
        const signedUrl = await createVisitProofUrl(selected.photoPath)
        if (active) setSelectedPhotoUrl(signedUrl)
      } catch (error) {
        console.error('Failed to load selected visit photo.', error)
        if (active) setSelectedPhotoUrl(null)
      }
    }

    void loadPhoto()
    return () => {
      active = false
    }
  }, [photoItems, selectedPhotoIndex])

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-100 px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-app-text">الزيارات الأخيرة</h1>
        <button
          type="button"
          onClick={exportCsv}
          disabled={feed.length === 0}
          className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText size={14} className="ml-1 inline" />
          تصدير
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner" />
            <p className="mt-4 text-app-text-secondary">جار تحميل النشاط...</p>
          </div>
        ) : feed.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-app-text">لا يوجد نشاط مسجل</h3>
            <p className="text-app-text-secondary">ستظهر زياراتك هنا.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {feed.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-card p-4 transition-all active:scale-[0.98]"
              >
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand-500" />
                    <h3 className="text-base font-bold text-app-text" dir="auto">{item.customerName}</h3>
                    <span className="badge-info text-xs">زيارة</span>
                    <span className={`${outcomeTone(item)} text-xs`}>{item.outcomeLabel}</span>
                    {item.urgent ? <span className="badge-warning text-xs">عاجل</span> : null}
                    <span className={`${fraudTone(item)} text-xs`}>
                      مراجعة {item.fraudScore != null ? Math.round(item.fraudScore).toLocaleString('ar-EG') : item.fraudStatus ?? 'واضح'}
                    </span>
                    <span className={`${geofenceTone(item)} text-xs`}>{formatGeofenceLabel(item)}</span>
                    <span className="bg-brand-50 text-brand-500 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {formatVisitMode(item.visitMode)}
                    </span>
                    {item.overrideReason ? <span className="badge-warning text-xs">تجاوز</span> : null}
                  </div>
                  <p className="line-clamp-2 text-sm text-app-text-secondary">{item.note || 'لا توجد ملاحظات'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-app-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.occurredAt).toLocaleString('ar-EG')}
                    </span>
                    <span>{formatDuration(item.durationSeconds)}</span>
                    {item.customerDistanceMeters != null ? (
                      <span>المسافة {Math.round(item.customerDistanceMeters).toLocaleString('ar-EG')} م</span>
                    ) : null}
                  </div>
                  {item.overrideReason ? (
                    <p className="mt-2 text-xs text-warning-600">سبب التجاوز: {item.overrideReason}</p>
                  ) : null}
                  {item.dynamicAnswers.length > 0 ? (
                    <div className="mt-3 rounded-xl bg-brand-25 p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-app-text-secondary">
                        الإجابات الديناميكية
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {item.dynamicAnswers.map((answer) => (
                          <div key={answer.id} className="rounded-lg bg-white p-3 border border-gray-200">
                            <p className="text-[11px] font-semibold text-app-text-secondary" dir="auto">{answer.label}</p>
                            <p className="mt-1 text-sm text-app-text" dir="auto">{answerValue(answer) || '--'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {item.photoPath ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoIndex(photoItems.findIndex((photo) => photo.id === item.id))}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-500 transition-colors hover:bg-brand-100"
                  >
                    <Camera size={16} />
                    صورة
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhotoIndex != null && photoItems[selectedPhotoIndex] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col">
            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              className="absolute -top-10 right-0 text-white transition-colors hover:text-gray-300"
            >
              <X size={32} />
            </button>

            <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-black">
              {selectedPhotoUrl ? (
                <>
                  <div className="flex flex-1 items-center justify-center bg-black">
                    <img src={selectedPhotoUrl} alt="إثبات الزيارة" className="max-h-full max-w-full object-contain rounded-lg" />
                  </div>
                  <div className="border-t border-gray-200 bg-white p-4">
                    <h3 className="mb-2 font-bold text-app-text">{photoItems[selectedPhotoIndex].customerName}</h3>
                    <p className="mb-2 text-sm text-app-text-secondary">
                      {new Date(photoItems[selectedPhotoIndex].occurredAt).toLocaleString('ar-EG')}
                    </p>
                    <p className="text-sm text-app-text-secondary">
                      {photoItems[selectedPhotoIndex].note || 'لا توجد ملاحظات'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white p-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoIndex((current) => (current != null && current > 0 ? current - 1 : current))}
                      className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 font-semibold text-app-text transition-colors hover:bg-gray-200"
                    >
                      <ChevronRight size={16} />
                      السابق
                    </button>
                    <span className="font-semibold text-app-text">
                      صورة {(selectedPhotoIndex + 1).toLocaleString('ar-EG')} / {photoItems.length.toLocaleString('ar-EG')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoIndex((current) => (current != null && current < photoItems.length - 1 ? current + 1 : current))}
                      className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 font-semibold text-app-text transition-colors hover:bg-gray-200"
                    >
                      التالي
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-96 items-center justify-center text-app-text-secondary">لا توجد صورة متاحة</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
