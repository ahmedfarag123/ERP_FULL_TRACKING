// Page Type: D
// Purpose: Guide the sales rep through the reference-style three-step visit wizard.
// Primary user action: Start a visit on site, record visit details, add proof, and complete the visit.
// Data source: customers table, visits table, visit proof storage, and persisted active visit store state.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { draftFollowUpEmail } from '../../lib/gemini'
import { saveSalesVisitActivity } from '../../lib/activityPersistence'
import { fetchScopedCustomerById } from '../../lib/customerQueries'
import { formatDistanceMeters, getBestEffortPosition } from '../../lib/location'
import { supabase } from '../../lib/supabase'
import { getScopedUserContext } from '../../lib/userAccess'
import { VISIT_PROOF_BUCKET } from '../../lib/visitProofStorage'
import {
  decisionMakerLabelMap,
  getInterestLevelOptions,
  getLocalizedLabel,
  getNextActionOptions,
  interestLevelLabelMap,
  isUrgentAction,
  nextActionLabelMap,
  type DecisionMakerStatusValue,
  type InterestLevelValue,
  type NextActionValue,
} from '../../lib/visitFlow'
import { formatTime } from '../../lib/utils'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { useVisitStore } from '../../store/visitStore'
import type { Customer } from '../../types'
import type { SelectedCustomerProfile } from '../../lib/customerProfileSelection'
import CustomerProfileSelector from '../shared/CustomerProfileSelector'

type Step = 1 | 2 | 3
type GeofenceStatus = 'inside' | 'outside' | 'customer_geofence_missing' | 'device_location_missing'
type OrderIntent = {
  summary: string
  estimatedValue: string
  requestedDeliveryDate: string
}

const DEFAULT_GEOFENCE_RADIUS_METERS = 100

function distanceBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return Math.round(
    Math.hypot(((a.lat - b.lat) * Math.PI) / 180, ((a.lng - b.lng) * Math.PI) / 180) * 6371000
  )
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, payload] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? 'image/jpeg'
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  })
}

function customerGeofenceRadiusMeters(customer: Customer) {
  const radius = Number(customer.geofence_radius_meters)
  return Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_GEOFENCE_RADIUS_METERS
}

function getCustomerGeofencePoint(customer: Customer | null) {
  if (!customer || typeof customer.lat !== 'number' || typeof customer.lng !== 'number') {
    return null
  }

  return { lat: customer.lat, lng: customer.lng }
}

function resolveCustomerGeofence(input: {
  customer: Customer | null
  location: { lat: number; lng: number } | null
}): {
  status: GeofenceStatus
  distanceMeters: number | null
  radiusMeters: number | null
  withinGeofence: boolean | null
} {
  if (!input.location) {
    return { status: 'device_location_missing', distanceMeters: null, radiusMeters: null, withinGeofence: null }
  }

  if (!input.customer) {
    return { status: 'customer_geofence_missing', distanceMeters: null, radiusMeters: null, withinGeofence: null }
  }

  const customerPoint = getCustomerGeofencePoint(input.customer)
  if (!customerPoint) {
    return { status: 'customer_geofence_missing', distanceMeters: null, radiusMeters: null, withinGeofence: null }
  }

  const radiusMeters = customerGeofenceRadiusMeters(input.customer)
  const distance = distanceBetween(input.location, customerPoint)
  const withinGeofence = distance <= radiusMeters

  return {
    status: withinGeofence ? 'inside' : 'outside',
    distanceMeters: distance,
    radiusMeters,
    withinGeofence,
  }
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-1">
      <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
      <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
      <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-app-text-secondary">
        الخطوة {step} من 3
      </div>
    </div>
  )
}

function SelectCard({
  active,
  onClick,
  title,
  subtitle,
  icon,
  activeClass,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle?: string
  icon: React.ReactNode
  activeClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
        active ? activeClass : 'border-app-border bg-gray-100 text-app-text-secondary hover:bg-gray-200'
      }`}
    >
      <div>{icon}</div>
      <div className="flex-1">
        <div className="font-bold">{title}</div>
        {subtitle ? <div className="text-xs opacity-70">{subtitle}</div> : null}
      </div>
      {active ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </button>
  )
}

export default function CheckInPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const currentLocation = useAppStore((state) => state.currentLocation)
  const setLocation = useAppStore((state) => state.setLocation)
  const setLocationPermission = useAppStore((state) => state.setLocationPermission)
  const addNotification = useAppStore((state) => state.addNotification)
  const activeVisit = useVisitStore((state) => state.activeVisit)
  const startVisit = useVisitStore((state) => state.startVisit)
  const setStage = useVisitStore((state) => state.setStage)
  const updateElapsed = useVisitStore((state) => state.updateElapsed)
  const endVisit = useVisitStore((state) => state.endVisit)
  const geofenceOverridesLeft = useVisitStore((state) => state.geofenceOverridesLeft)
  const useOverride = useVisitStore((state) => state.useOverride)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(true)
  const [step, setStep] = useState<Step>(1)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertDistance, setAlertDistance] = useState(0)
  const [checkoutLocation, setCheckoutLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [status, setStatus] = useState<DecisionMakerStatusValue | null>(null)
  const [interest, setInterest] = useState<InterestLevelValue | null>(null)
  const [nextAction, setNextAction] = useState<NextActionValue | null>(null)
  const [notes, setNotes] = useState('')
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<SelectedCustomerProfile | null>(null)
  const [selectedCustomerProfiles, setSelectedCustomerProfiles] = useState<SelectedCustomerProfile[]>([])
  const [orderIntent, setOrderIntent] = useState<OrderIntent>({
    summary: '',
    estimatedValue: '',
    requestedDeliveryDate: '',
  })
  const [emailDraft, setEmailDraft] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [startingVisit, setStartingVisit] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraTimeout, setCameraTimeout] = useState(false)

  const locale = 'ar' as const

  // Start camera on mount for step 3
  useEffect(() => {
    console.log('[Camera] Step:', step, 'PhotoUrl:', !!photoUrl, 'CameraActive:', cameraActive)
    if (step !== 3 || photoUrl) return

    let isMounted = true
    let stream: MediaStream | null = null

    const startCamera = async () => {
      // Small delay to ensure video element is rendered and ref is set
      await new Promise((resolve) => setTimeout(resolve, 100))
      
      if (!isMounted) {
        console.log('[Camera] Component unmounted before starting')
        return
      }

      console.log('[Camera] Starting camera access request...')
      try {
        console.log('[Camera] Requesting: environment camera, 1280x720')
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('انتهت مهلة طلب الكاميرا بعد ٥ ثوانٍ')), 5000)
          ),
        ]) as MediaStream

        console.log('[Camera] Got stream successfully:', stream.id)
        
        if (!isMounted) {
          console.log('[Camera] Component unmounted, stopping stream')
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        if (!videoRef.current) {
          console.error('[Camera] Video ref is null!')
          return
        }

        console.log('[Camera] Attaching stream to video element')
        videoRef.current.srcObject = stream
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (!videoRef.current) {
            resolve()
            return
          }
          const onLoadedMetadata = () => {
            console.log('[Camera] Video metadata loaded')
            videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata)
            resolve()
          }
          videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata)
          // Fallback if event doesn't fire
          setTimeout(() => resolve(), 1000)
        })

        if (isMounted) {
          setCameraActive(true)
          setCameraError(null)
          console.log('[Camera] Camera fully initialized')
        }
      } catch (error) {
        console.error('[Camera] Error:', error instanceof Error ? error.message : String(error))
        if (isMounted) {
          const errorMsg = error instanceof Error ? error.message : 'تعذر الوصول إلى الكاميرا'
          setCameraError(`تعذر الوصول إلى الكاميرا: ${errorMsg}`)
          setCameraActive(false)
        }
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
      }
    }

    void startCamera()

    return () => {
      console.log('[Camera] Cleanup: stopping all tracks')
      isMounted = false
      if (stream) {
        stream.getTracks().forEach((track) => {
          console.log('[Camera] Stopping track:', track.label)
          track.stop()
        })
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => {
          console.log('[Camera] Stopping remaining track:', track.label)
          track.stop()
        })
        videoRef.current.srcObject = null
      }
    }
  }, [step, photoUrl])

  // Monitor camera timeout - if not active after 7 seconds in step 3, show error
  useEffect(() => {
    if (step !== 3 || photoUrl || cameraActive || cameraError || cameraTimeout) return

    const timeoutId = window.setTimeout(() => {
      console.warn('[Camera] Camera startup timeout - no camera access after 7 seconds')
      setCameraTimeout(true)
      setCameraError('الكاميرا تستغرق وقتاً طويلاً للبدء. تحقق من الصلاحيات وحاول مرة أخرى.')
    }, 7000)

    return () => clearTimeout(timeoutId)
  }, [step, photoUrl, cameraActive, cameraError, cameraTimeout])

  useEffect(() => {
    let active = true

    const loadCustomer = async () => {
      if (!id) {
        setCustomer(null)
        setLoadingCustomer(false)
        return
      }

      setLoadingCustomer(true)
      try {
        const userContext = await getScopedUserContext()
        if (!userContext) {
          if (active) setCustomer(null)
          return
        }

        const row = await fetchScopedCustomerById({ userContext, customerId: id })
        if (active) setCustomer(row)
      } catch (error) {
        console.error('Failed to load customer for check-in.', error)
        if (active) setCustomer(null)
      } finally {
        if (active) setLoadingCustomer(false)
      }
    }

    void loadCustomer()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!activeVisit || !customer || activeVisit.customerId !== customer.id) return undefined

    const tick = () => {
      updateElapsed(Math.max(0, Math.floor((Date.now() - activeVisit.startTime) / 1000)))
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [activeVisit?.customerId, activeVisit?.startTime, customer?.id, updateElapsed])

  useEffect(() => {
    if (!activeVisit || !customer) return
    if (activeVisit.customerId === customer.id) {
      setStep(activeVisit.stage === 'details' ? 2 : activeVisit.stage === 'proof' ? 3 : 1)
    }
  }, [activeVisit, customer])

  useEffect(() => {
    setSelectedCustomerProfile(null)
    setSelectedCustomerProfiles([])
  }, [customer?.id])

  const isVisitActiveHere = Boolean(activeVisit && customer && activeVisit.customerId === customer.id)
  const isVisitActiveElsewhere = Boolean(activeVisit && customer && activeVisit.customerId !== customer.id)
  const activeDistance =
    currentLocation && customer && getCustomerGeofencePoint(customer)
      ? distanceBetween(currentLocation, getCustomerGeofencePoint(customer) as { lat: number; lng: number })
      : null
  const customerHasGeofence = Boolean(getCustomerGeofencePoint(customer))
  const activeGeofenceRadius = customer ? customerGeofenceRadiusMeters(customer) : DEFAULT_GEOFENCE_RADIUS_METERS
  const orderIntentRequired = nextAction === 'CREATE_ORDER_NOW'
  const canProceedToProof =
    Boolean(nextAction) && selectedCustomerProfiles.length > 0 && (!orderIntentRequired || orderIntent.summary.trim().length > 0)

  const interestOptions = status ? getInterestLevelOptions(status) : []
  const actionOptions = interest ? getNextActionOptions(interest) : []

  const handleStartVisit = async () => {
    if (!customer) return
    setStartingVisit(true)
    try {
      console.log('[CheckIn] Starting visit for customer:', customer.id)
      const pos = await getBestEffortPosition({
        fallback: currentLocation,
        maxCachedAgeMs: 2 * 60_000,
        timeoutMs: 6_000,
        maximumAgeMs: 60_000,
      })
      setLocation(pos)
      setLocationPermission('granted')
      console.log('[CheckIn] Got position, starting visit')
      startVisit(customer.id, customer.name ?? customer.customer_name ?? 'عميل', pos.lat, pos.lng)
      console.log('[CheckIn] Visit started, moving to step 1')
      setStep(1)
    } catch (error) {
      console.error('[CheckIn] Failed to start visit:', error)
      const errorMsg = error instanceof Error ? error.message : 'تعذر تحديد الموقع'
      addNotification({
        title: 'خطأ في الموقع',
        message: errorMsg,
        type: 'error',
      })
    } finally {
      setStartingVisit(false)
    }
  }

  const handleDraftEmail = async () => {
    if (!customer || !status || !interest || !nextAction) return
    setDrafting(true)
    try {
      const result = await draftFollowUpEmail({
        customerName: customer.name ?? customer.customer_name ?? 'عميل',
        decisionMakerStatus: getLocalizedLabel(decisionMakerLabelMap, status, locale),
        interestLevel: getLocalizedLabel(interestLevelLabelMap, interest, locale),
        nextAction: getLocalizedLabel(nextActionLabelMap, nextAction, locale),
        notes,
      })
      setEmailDraft(result)
    } catch (error) {
      console.error('Failed to draft AI follow-up.', error)
      setEmailDraft('تعذر إنشاء مسودة المتابعة الآن.')
    } finally {
      setDrafting(false)
    }
  }

  const persistVisit = async (overrideApplied: boolean, location: { lat: number; lng: number }) => {
    try {
      if (!activeVisit || !customer || !user?.id || !status || !interest || !nextAction || selectedCustomerProfiles.length === 0) {
        throw new Error('تفاصيل الزيارة غير مكتملة. راجع نموذج الزيارة وحاول مرة أخرى.')
      }

      let photoPath: string | null = null
      if (photoUrl) {
        try {
          const blob = dataUrlToBlob(photoUrl)
          const extension = blob.type === 'image/png' ? 'png' : 'jpg'
          const path = `${user.id}/${customer.id}/${Date.now()}.${extension}`
          const { error: uploadError } = await withTimeout(
            supabase.storage.from(VISIT_PROOF_BUCKET).upload(path, blob, {
              upsert: false,
              contentType: blob.type,
            }),
            12_000,
            'انتهت مهلة رفع إثبات الزيارة.'
          )
          if (uploadError) {
            throw uploadError
          }
          photoPath = path
        } catch (error) {
          console.error('Failed to upload visit proof.', error)
          throw new Error(error instanceof Error ? error.message : 'تعذر رفع إثبات الزيارة.')
        }
      }

      const geofence = resolveCustomerGeofence({ customer, location })
      const normalizedOrderIntent =
        nextAction === 'CREATE_ORDER_NOW'
          ? {
              summary: orderIntent.summary.trim(),
              estimatedValue: orderIntent.estimatedValue.trim(),
              requestedDeliveryDate: orderIntent.requestedDeliveryDate,
            }
          : null

      const savedVisit = await saveSalesVisitActivity({
        customerId: customer.id,
        userId: user.id,
        startedAt: new Date(activeVisit.startTime).toISOString(),
        completedAt: new Date().toISOString(),
        decisionMakerStatus: status,
        interestLevel: interest,
        nextAction,
        notes: emailDraft ? `${notes}\n\nمسودة المتابعة:\n${emailDraft}`.trim() : notes,
        lat: location.lat,
        lng: location.lng,
        customerDistanceMeters: geofence.distanceMeters,
        withinGeofence: geofence.withinGeofence,
        geofenceStatus: geofence.status,
        geofenceRadiusMeters: geofence.radiusMeters,
        overrideApplied,
        orderIntent: normalizedOrderIntent,
        selectedCustomerProfile: selectedCustomerProfiles[0] ?? selectedCustomerProfile,
        selectedCustomerProfiles,
        capturedPhotoPath: photoPath,
        durationSeconds: activeVisit.elapsed,
      })

      if (overrideApplied) {
        useOverride()
      }
      endVisit()
      addNotification({
        title: 'تم تسجيل الزيارة',
        message: 'اكتمل تسجيل الزيارة بنجاح.',
        type: 'success',
      })
      // Navigate to visits history and notify viewers to refresh
      console.log('[CheckIn] Navigating to visits list')
      navigate('/visits', { replace: true, state: { createdVisitId: String(savedVisit?.id ?? '') } })
      try {
        // Dispatch a global event so the visits page can refresh immediately
        window.dispatchEvent(new CustomEvent('visit:created', { detail: { id: String(savedVisit?.id ?? '') } }))
      } catch (e) {
        /* ignore */
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOverrideAndSubmit = async () => {
    if (!checkoutLocation) return

    setSubmitting(true)
    try {
      await persistVisit(true, checkoutLocation)
    } catch (error) {
      console.error('Failed to complete checkout with location pass.', error)
      addNotification({
        title: 'Could not complete visit',
        message: error instanceof Error ? error.message : 'حاول مرة أخرى.',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleValidationAndSubmit = async () => {
    if (!activeVisit) return
    setSubmitting(true)
    try {
      const location = await getBestEffortPosition({
        fallback: currentLocation,
        maxCachedAgeMs: 60_000,
        timeoutMs: 8_000,
        maximumAgeMs: 30_000,
      })
      setLocation(location)
      setLocationPermission('granted')

      const geofence = resolveCustomerGeofence({ customer, location })

      if (geofence.status === 'outside' && geofence.distanceMeters != null) {
        setAlertDistance(geofence.distanceMeters)
        setCheckoutLocation(location)
        setShowAlert(true)
        setSubmitting(false)
        return
      }

      await persistVisit(false, location)
    } catch (error) {
      console.error('Failed to complete checkout.', error)
      addNotification({
        title: 'Could not complete visit',
        message: error instanceof Error ? error.message : 'حاول مرة أخرى.',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingCustomer) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
      </div>
    )
  }

  if (!customer) return null

  if (showCancelConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-yellow-500/50 bg-[#1e293b] p-6 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">إلغاء تسجيل الزيارة؟</h2>
          <p className="mb-6 text-sm text-app-text-secondary">
            سيتم تجاهل مؤقت الزيارة والبيانات المسجلة.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                endVisit()
                navigate('/customers')
              }}
              className="w-full rounded-xl bg-red-600 py-4 font-bold text-white shadow-lg shadow-red-500/20"
            >
              نعم، إلغاء
            </button>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className="w-full rounded-xl bg-gray-100 py-4 font-bold text-white"
            >
              متابعة الزيارة
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showAlert) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div className="w-full max-w-sm rounded-3xl border border-red-500/50 bg-[#1e293b] p-6 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">تنبيه الموقع</h2>
          <p className="mb-6 text-sm text-app-text-secondary">
            أنت على بعد <strong>{formatDistanceMeters(alertDistance)}</strong> من نقطة موقع العميل. يجب أن تكون داخل نطاق {formatDistanceMeters(activeGeofenceRadius)} لإكمال الزيارة.
          </p>
          <div className="mb-6 rounded-xl bg-gray-100 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-app-text-secondary">تصاريح التجاوز اليومية</div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((index) => (
                <div key={index} className={`h-3 w-3 rounded-full ${index <= geofenceOverridesLeft ? 'bg-green-500' : 'bg-red-900'}`} />
              ))}
            </div>
            <div className="mt-2 text-sm font-bold text-white">{geofenceOverridesLeft.toLocaleString('ar-EG')} متبقية اليوم</div>
          </div>
          <div className="space-y-3">
            {geofenceOverridesLeft > 0 ? (
              <button
                type="button"
                onClick={handleOverrideAndSubmit}
                disabled={submitting}
                className="w-full rounded-xl bg-red-600 py-4 font-bold text-white shadow-lg shadow-red-500/20"
              >
                {submitting ? 'جار الإرسال...' : 'استخدام تصريح وإرسال'}
              </button>
            ) : (
              <button type="button" disabled className="w-full cursor-not-allowed rounded-xl bg-gray-600 py-4 font-bold text-gray-300 opacity-50">
                محظور - تواصل مع الإدارة
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowAlert(false)
                setSubmitting(false)
              }}
              className="w-full rounded-xl bg-gray-100 py-4 font-bold text-white"
            >
              رجوع والاقتراب أكثر
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isVisitActiveElsewhere && activeVisit) {
    return (
      <div className="flex h-[calc(100vh-100px)] flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-app-border bg-white p-8 text-center shadow-2xl">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/10">
              <div className="absolute inset-0 animate-ping rounded-full border-2 border-orange-500/30" />
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">توجد زيارة نشطة</h2>
            <p className="mb-6 text-sm leading-relaxed text-app-text-secondary">
              لديك زيارة مفتوحة حالياً. أكملها قبل بدء زيارة جديدة.
            </p>
            <div className="mb-8 rounded-xl border border-app-border bg-gray-100 p-4 shadow-inner">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-app-text-secondary">الزيارة الحالية عند</div>
              <div className="truncate text-lg font-bold text-orange-200">{activeVisit.customerName}</div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate(`/checkin/${activeVisit.customerId}`)}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 py-4 font-bold text-white shadow-lg shadow-orange-600/20 transition-transform hover:scale-[1.02]"
              >
                <span>استئناف الزيارة</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  endVisit()
                  navigate('/customers')
                }}
                className="w-full rounded-xl border border-red-500/50 bg-red-900/20 py-4 font-bold text-red-300 transition-colors hover:bg-red-900/40"
              >
                إلغاء الزيارة النشطة
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="flex h-[calc(100vh-100px)] flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-12 px-4 text-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-app-text" dir="auto">
              {customer.name ?? customer.customer_name ?? 'عميل'}
            </h1>
            <p className="flex items-center justify-center gap-2 text-sm text-app-text-secondary" dir="auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {[customer.district, customer.area].filter(Boolean).join(', ')}
              {activeDistance != null ? ` • ${formatDistanceMeters(activeDistance)} من العميل` : ''}
            </p>
            <div className="mt-4 rounded-2xl border border-app-border bg-white px-4 py-3 text-left">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-app-text-secondary">تحكم الموقع</div>
                  <div className="mt-1 text-sm font-semibold text-app-text">
                    {customerHasGeofence ? `النطاق ${formatDistanceMeters(activeGeofenceRadius)}` : 'موقع العميل مفقود'}
                  </div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-bold ${
                  customerHasGeofence
                    ? 'bg-success-50 text-success-600'
                    : 'bg-warning-50 text-warning-600'
                }`}>
                  {customerHasGeofence ? 'النطاق جاهز' : 'سيتم تعليمه'}
                </div>
              </div>
              {!customerHasGeofence ? (
                <p className="mt-2 text-xs leading-relaxed text-warning-600">
                  يمكن حفظ الزيارة، لكنها ستُعلّم كموقع عميل مفقود لمراجعة الإدارة.
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className={`absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-1000 ${
              isVisitActiveHere ? 'bg-brand-500/20 opacity-100' : 'bg-blue-500/5 opacity-0'
            }`} />
            <button
              type="button"
              onClick={isVisitActiveHere ? () => { setStage('details'); setStep(2) } : handleStartVisit}
              disabled={startingVisit}
              className={`relative z-10 flex h-64 w-64 flex-col items-center justify-center rounded-full border-4 transition-all duration-500 backdrop-blur-md ${
                isVisitActiveHere
                  ? 'border-red-500 bg-gradient-to-br from-red-500/30 to-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.35)]'
                  : 'border-brand-500 bg-gradient-to-br from-brand-500/10 to-blue-600/10 shadow-[0_0_60px_rgba(99,102,241,0.3)] hover:shadow-[0_0_80px_rgba(99,102,241,0.4)]'
              } ${startingVisit ? 'opacity-70' : 'hover:scale-105'}`}
            >
              <div className="mb-4 text-white">
                {isVisitActiveHere ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="translate-x-1">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </div>
              <div className="leading-none text-white">
                <div className="text-5xl font-black tracking-widest tabular-nums">
                  {startingVisit ? '...' : isVisitActiveHere && activeVisit ? formatTime(activeVisit.elapsed) : 'ابدأ'}
                </div>
                <div className={`mt-3 text-sm font-bold uppercase tracking-[0.2em] ${
                  isVisitActiveHere ? 'text-red-200' : 'text-brand-200'
                }`}>
                  {startingVisit ? 'جار تحديد الموقع...' : isVisitActiveHere ? 'إنهاء الزيارة' : 'بدء الزيارة'}
                </div>
              </div>
            </button>
          </div>

          <div className="px-8 text-sm text-app-text-secondary">
            {isVisitActiveHere
              ? <span className="animate-pulse text-red-300">● جار تسجيل وقت الزيارة في الخلفية...</span>
              : 'اضغط الزر عند الوصول إلى موقع العميل لبدء التتبع.'}
          </div>

          {isVisitActiveHere ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => { setStage('details'); setStep(2) }}
                className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-500"
              >
                ادخل نموذج الزيارة
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="rounded-xl border border-gray-500 bg-gray-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-700"
              >
                إلغاء تسجيل الزيارة
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="mx-auto max-w-xl pb-24">
        <StepIndicator step={2} />
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-app-text">تفاصيل الزيارة</h2>
          <div className="text-right">
            <div className="mb-1 text-xs uppercase tracking-wider text-app-text-secondary">إجمالي الوقت</div>
            <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-1 font-mono text-xl font-bold text-brand-400">
              {activeVisit ? formatTime(activeVisit.elapsed) : '00:00:00'}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <CustomerProfileSelector
            key={customer?.id ?? 'customer-profile'}
            value={selectedCustomerProfiles}
            onChange={(profile, profiles) => {
              setSelectedCustomerProfile(profile)
              setSelectedCustomerProfiles(profiles)
            }}
          />

          <div>
            <label className="mb-4 block text-sm font-bold uppercase tracking-wider text-app-text-secondary">١. من قابلت؟</label>
            <div className="grid gap-3">
              <SelectCard
                active={status === 'MET_DECISION_MAKER'}
                onClick={() => { setStatus('MET_DECISION_MAKER'); setInterest(null); setNextAction(null) }}
                title="صاحب القرار"
                subtitle="مدير / مالك"
                activeClass="bg-success-50 border-success-500 text-success-700 shadow-lg scale-[1.02]"
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              />
              <SelectCard
                active={status === 'MET_EMPLOYEE_ONLY'}
                onClick={() => { setStatus('MET_EMPLOYEE_ONLY'); setInterest(null); setNextAction(null) }}
                title="موظف فقط"
                subtitle="فريق العمل / الاستقبال"
                activeClass="bg-brand-50 border-brand-500 text-brand-600 shadow-lg scale-[1.02]"
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
              />
              <SelectCard
                active={status === 'NO_CONTACT'}
                onClick={() => { setStatus('NO_CONTACT'); setInterest(null); setNextAction(null) }}
                title="لا يوجد تواصل"
                subtitle="مغلق / رفض"
                activeClass="bg-gray-100 border-gray-500 text-gray-700 shadow-lg scale-[1.02]"
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
              />
            </div>
          </div>

          {status ? (
            <div>
              <label className="mb-4 block text-sm font-bold uppercase tracking-wider text-app-text-secondary">٢. النتيجة / الاهتمام</label>
              <div className="grid gap-2">
                {interestOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => { setInterest(option); setNextAction(null) }}
                    className={`rounded-xl border p-4 text-left text-sm font-bold transition-all ${
                      interest === option
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-lg'
                        : 'border-app-border bg-white text-app-text hover:bg-brand-25'
                    }`}
                  >
                    {getLocalizedLabel(interestLevelLabelMap, option, locale)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {interest ? (
            <div>
              <label className="mb-4 block text-sm font-bold uppercase tracking-wider text-app-text-secondary">٣. الإجراء التالي</label>
              <div className="grid gap-2">
                {actionOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setNextAction(option)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                      nextAction === option
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-lg'
                        : 'border-app-border bg-white text-app-text hover:bg-brand-25'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isUrgentAction(option) ? (
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                        </span>
                      ) : null}
                      {getLocalizedLabel(nextActionLabelMap, option, locale)}
                    </div>
                    {nextAction === option ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {nextAction ? (
            <>
            {nextAction === 'CREATE_ORDER_NOW' ? (
              <div className="rounded-2xl border border-success-500/30 bg-success-50 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-success-700">نية الطلب</label>
                    <p className="mt-1 text-xs text-success-600">
                      سجل الأصناف المطلوبة الآن ليحولها فريق التشغيل إلى طلب.
                    </p>
                  </div>
                  <span className="rounded-full bg-success-500 px-3 py-1 text-xs font-bold text-white">مطلوب</span>
                </div>
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={orderIntent.summary}
                    onChange={(event) => setOrderIntent((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="المنتجات والكميات والعلامات أو أحجام العبوات المطلوبة..."
                    className="w-full rounded-xl border border-success-500/20 bg-white p-4 text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-success-500"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={orderIntent.estimatedValue}
                      onChange={(event) => setOrderIntent((current) => ({ ...current, estimatedValue: event.target.value }))}
                      placeholder="القيمة المتوقعة"
                      className="rounded-xl border border-success-500/20 bg-white p-3 text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-success-500"
                    />
                    <input
                      type="date"
                      value={orderIntent.requestedDeliveryDate}
                      onChange={(event) => setOrderIntent((current) => ({ ...current, requestedDeliveryDate: event.target.value }))}
                      className="rounded-xl border border-success-500/20 bg-white p-3 text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-success-500"
                    />
                  </div>
                </div>
              </div>
            ) : null}
            <div>
              <label className="mb-4 block text-sm font-bold uppercase tracking-wider text-app-text-secondary">ملاحظات</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="أضف أهم نقاط النقاش..."
                className="w-full rounded-xl border border-app-border bg-white p-4 text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all focus:bg-white"
              />
              {notes.length > 5 ? (
                <button
                  type="button"
                  onClick={handleDraftEmail}
                  disabled={drafting}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs text-brand-400 transition-colors hover:text-brand-300"
                >
                  {drafting ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  )}
                  {drafting ? 'جار التحضير...' : 'تحضير رسالة متابعة بالذكاء الاصطناعي'}
                </button>
              ) : null}
              {emailDraft ? (
                <div className="mt-3 rounded-xl border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-brand-100">
                  <div className="mb-2 text-[10px] font-bold uppercase text-brand-300">مسودة الذكاء الاصطناعي</div>
                  {emailDraft}
                </div>
              ) : null}
            </div>
            </>
          ) : null}

          <button
            type="button"
            disabled={!canProceedToProof}
            onClick={() => { setStage('proof'); setStep(3) }}
            className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-4 text-lg font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            التالي: إثبات بصري
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl pb-24">
      <StepIndicator step={3} />
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-app-text">إثبات بصري</h2>
      </div>

      <div className="relative mb-8 aspect-[3/4] w-full overflow-hidden rounded-3xl border-2 border-dashed border-app-border transition-colors hover:border-brand-500/50 md:aspect-video">
        {/* Always render video element - even if hidden - so ref is available for camera effect */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {photoUrl ? (
          <div className="group relative h-full w-full">
            <img src={photoUrl} alt="إثبات الزيارة" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl(null)
                  setCameraActive(false)
                }}
                className="rounded-full bg-red-500 px-6 py-3 font-bold text-white shadow-lg"
              >
                إعادة التقاط الصورة
              </button>
            </div>
          </div>
        ) : cameraError ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-center p-6">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="text-base font-bold text-app-text mb-2">صلاحية الكاميرا مطلوبة</div>
            <p className="text-sm text-app-text-secondary mb-6">{cameraError}</p>
            <button
              type="button"
              onClick={async () => {
                setCameraTimeout(false)
                setCameraError(null)
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                      facingMode: 'environment',
                      width: { ideal: 1280 },
                      height: { ideal: 720 },
                    },
                  })
                  if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    setCameraActive(true)
                    setCameraError(null)
                  }
                } catch (error) {
                  console.error('Failed to access camera:', error)
                  setCameraError('تعذر الوصول إلى الكاميرا. تحقق من صلاحيات الجهاز.')
                }
              }}
              className="rounded-lg bg-brand-500 px-4 py-2 font-bold text-white hover:bg-brand-600 transition-colors"
            >
              حاول مرة أخرى
            </button>
          </div>
        ) : cameraActive ? (
          <div className="relative h-full w-full">
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-4 bg-gradient-to-t from-black/60 to-transparent p-6">
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    const canvas = document.createElement('canvas')
                    canvas.width = videoRef.current.videoWidth
                    canvas.height = videoRef.current.videoHeight
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                      ctx.drawImage(videoRef.current, 0, 0)
                      setPhotoUrl(canvas.toDataURL('image/jpeg', 0.95))
                      setCameraActive(false)
                      if (videoRef.current.srcObject) {
                        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
                        tracks.forEach((track) => track.stop())
                      }
                    }
                  }
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/50 transition-all hover:scale-110 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-app-text-secondary transition-colors hover:text-app-text">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
            <span className="text-lg font-bold">جار تشغيل الكاميرا...</span>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => { setStage('details'); setStep(2) }}
          className="flex-1 rounded-xl border border-app-border bg-white py-4 font-bold text-app-text transition-colors hover:bg-brand-25"
        >
          رجوع
        </button>
        <button
          type="button"
          onClick={handleValidationAndSubmit}
          disabled={submitting}
          className="flex-[2] flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              جار التحقق...
            </>
          ) : (
            <>
              إكمال الزيارة
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
