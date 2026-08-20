import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CALL_OUTCOME_OPTIONS,
  CALL_REASON_OPTIONS,
  CUSTOMER_RESPONSE_OPTIONS,
  NEXT_ACTION_OPTIONS,
  getOptionFields,
  parseDurationMinutesToSeconds,
  saveCustomerCallActivity,
  toDateTimeLocalValue,
  type ActivityOption,
} from '../../lib/customerCallActivity'
import type { SelectedCustomerProfile } from '../../lib/customerProfileSelection'
import CustomerProfileSelector from '../shared/CustomerProfileSelector'
import { IconAlert, IconClose, IconPhone } from '../shared/Icons'
import SelectCard from '../shared/SelectCard'

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/50 transition-all focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/50 transition-all focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500'

const SELECT_ACTIVE_CLASS = 'border-brand-500 bg-brand-500/20 text-white shadow-lg scale-[1.02]'

interface CustomerReference {
  id: string
  customer_name?: string | null
  name?: string | null
  phone_number?: string | null
  phone?: string | null
  whatsapp_number?: string | null
}

interface CustomerCallPageProps {
  isOpen: boolean
  customer: CustomerReference | null
  actorUserId: string | null
  onClose: () => void
  onSaved?: () => Promise<void> | void
}

function Field({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-white/50">{label}</span>
      {children}
      {helper ? <span className="mt-1 block text-xs text-white/50">{helper}</span> : null}
    </label>
  )
}

function OptionDot({ urgent = false }: { urgent?: boolean }) {
  if (urgent) {
    return (
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
      </span>
    )
  }

  return <span className="h-3 w-3 rounded-full bg-brand-400" />
}

function CardOptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ActivityOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-4 block text-sm font-bold uppercase tracking-wider text-white/50">{label}</label>
      <div className="grid gap-3">
        {options.map((option) => (
          <SelectCard
            key={option.value}
            active={value === option.value}
            onClick={() => onChange(option.value)}
            title={option.label}
            activeClass={SELECT_ACTIVE_CLASS}
            icon={<OptionDot urgent={option.value.includes('escalate') || option.value.includes('create_order')} />}
          />
        ))}
      </div>
    </div>
  )
}

function getCustomerName(customer: CustomerReference | null) {
  return customer?.name ?? customer?.customer_name ?? 'عميل'
}

function getCustomerPhone(customer: CustomerReference | null) {
  return customer?.phone_number ?? customer?.phone ?? customer?.whatsapp_number ?? ''
}

export default function CustomerCallPage({
  isOpen,
  customer,
  actorUserId,
  onClose,
  onSaved,
}: CustomerCallPageProps) {
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [occurredAt, setOccurredAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('3')
  const [callReason, setCallReason] = useState('')
  const [customerResponse, setCustomerResponse] = useState('')
  const [responseDetails, setResponseDetails] = useState<Record<string, string>>({})
  const [callOutcome, setCallOutcome] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [callbackAt, setCallbackAt] = useState('')
  const [notes, setNotes] = useState('')
  const [requiresUrgentAction, setRequiresUrgentAction] = useState(false)
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<SelectedCustomerProfile | null>(null)
  const [selectedCustomerProfiles, setSelectedCustomerProfiles] = useState<SelectedCustomerProfile[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !customer) return
    setDirection('outbound')
    setOccurredAt(toDateTimeLocalValue())
    setDurationMinutes('3')
    setCallReason('')
    setCustomerResponse('')
    setResponseDetails({})
    setCallOutcome('')
    setNextAction('')
    setCallbackAt('')
    setNotes('')
    setRequiresUrgentAction(false)
    setSelectedCustomerProfile(null)
    setSelectedCustomerProfiles([])
    setError(null)
  }, [customer, isOpen])

  const activeResponseFields = useMemo(
    () => getOptionFields(CUSTOMER_RESPONSE_OPTIONS, customerResponse),
    [customerResponse]
  )

  const callbackRequired =
    customerResponse === 'call_back_later' || nextAction === 'schedule_follow_up_call'

  const hasCustomerProfileSelection = selectedCustomerProfiles.length > 0
  const showCallReason = hasCustomerProfileSelection
  const showCustomerResponse = showCallReason && Boolean(callReason)
  const showCallOutcome = showCustomerResponse && Boolean(customerResponse)
  const showNextAction = showCallOutcome && Boolean(callOutcome)
  const showFinalDetails = showNextAction && Boolean(nextAction)

  const resetFinalDetails = () => {
    setCallbackAt('')
    setNotes('')
    setRequiresUrgentAction(false)
  }

  const resetAfterCustomerResponse = () => {
    setCallOutcome('')
    setNextAction('')
    resetFinalDetails()
  }

  const resetAfterCallReason = () => {
    setCustomerResponse('')
    setResponseDetails({})
    resetAfterCustomerResponse()
  }

  const resetAfterCustomerProfiles = () => {
    setCallReason('')
    resetAfterCallReason()
  }

  const handleCustomerProfilesChange = (
    profile: SelectedCustomerProfile | null,
    profiles: SelectedCustomerProfile[]
  ) => {
    setSelectedCustomerProfile(profile)
    setSelectedCustomerProfiles(profiles)

    if (profiles.length === 0) {
      resetAfterCustomerProfiles()
    }
  }

  const handleCallReasonChange = (nextValue: string) => {
    if (nextValue === callReason) return
    setCallReason(nextValue)
    resetAfterCallReason()
  }

  const handleCustomerResponseChange = (nextValue: string) => {
    if (nextValue === customerResponse) return
    setCustomerResponse(nextValue)
    setResponseDetails({})
    resetAfterCustomerResponse()
  }

  const handleCallOutcomeChange = (nextValue: string) => {
    if (nextValue === callOutcome) return
    setCallOutcome(nextValue)
    setNextAction('')
    resetFinalDetails()
  }

  const handleNextActionChange = (nextValue: string) => {
    if (nextValue === nextAction) return
    setNextAction(nextValue)
    resetFinalDetails()
  }

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!customer || !actorUserId) {
      setError('جلسة المستخدم غير مكتملة. سجل الدخول مرة أخرى.')
      return
    }

    if (!occurredAt || !callReason || !customerResponse || !callOutcome || !nextAction) {
      setError('أكمل حقول المكالمة المطلوبة قبل الحفظ.')
      return
    }

    if (callbackRequired && !callbackAt) {
      setError('أضف وقت الاتصال اللاحق لهذه المتابعة.')
      return
    }

    if (activeResponseFields.some((field) => field.key && !String(responseDetails[field.key] ?? '').trim())) {
      setError('أكمل تفاصيل رد العميل قبل الحفظ.')
      return
    }

    if (selectedCustomerProfiles.length === 0) {
      setError('أكمل تصنيف العميل والتخصص والمنتج المرتبط قبل الحفظ.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await saveCustomerCallActivity({
        customerId: customer.id,
        userId: actorUserId,
        direction,
        occurredAt,
        durationSeconds: parseDurationMinutesToSeconds(durationMinutes),
        callReason,
        customerResponse,
        responseDetails,
        callOutcome,
        nextAction,
        callbackAt: callbackRequired ? callbackAt : null,
        notes,
        requiresUrgentAction,
        selectedCustomerProfile: selectedCustomerProfiles[0] ?? selectedCustomerProfile,
        selectedCustomerProfiles,
      })
      await onSaved?.()
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ نشاط المكالمة.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 px-3 py-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111936] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
              <IconPhone size={21} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">نشاط العميل</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-white">تسجيل مكالمة</h2>
              <p className="mt-1 truncate text-sm text-white/50" dir="auto">
                {getCustomerName(customer)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white"
            title="إغلاق"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">العميل</p>
            <p dir="auto" className="mt-1 text-base font-semibold text-white">
              {getCustomerName(customer)}
            </p>
            <p dir="ltr" className="mt-1 text-sm text-white/50">
              {getCustomerPhone(customer) || '--'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <CustomerProfileSelector
                value={selectedCustomerProfiles}
                onChange={handleCustomerProfilesChange}
              />
            </div>



            {showCallReason ? (
              <div className="md:col-span-2">
                <CardOptionGroup
                  label="٢. سبب المكالمة"
                  options={CALL_REASON_OPTIONS}
                  value={callReason}
                  onChange={handleCallReasonChange}
                />
              </div>
            ) : null}

            {showCustomerResponse ? (
              <div className="animate-slide-bottom md:col-span-2">
                <CardOptionGroup
                  label="٣. رد العميل"
                  options={CUSTOMER_RESPONSE_OPTIONS}
                  value={customerResponse}
                  onChange={handleCustomerResponseChange}
                />
              </div>
            ) : null}

            {showCallOutcome
              ? activeResponseFields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <Field label={field.label}>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={responseDetails[field.key] ?? ''}
                          onChange={(event) => setResponseDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                          className={TEXTAREA_CLASS}
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={responseDetails[field.key] ?? ''}
                          onChange={(event) => setResponseDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                          className={INPUT_CLASS}
                          placeholder={field.placeholder}
                        />
                      )}
                    </Field>
                  </div>
                ))
              : null}

            {showCallOutcome ? (
              <div className="animate-slide-bottom md:col-span-2">
                <CardOptionGroup
                  label="٤. نتيجة المكالمة"
                  options={CALL_OUTCOME_OPTIONS}
                  value={callOutcome}
                  onChange={handleCallOutcomeChange}
                />
              </div>
            ) : null}

            {showNextAction ? (
              <div className="animate-slide-bottom md:col-span-2">
                <CardOptionGroup
                  label="٥. الإجراء التالي"
                  options={NEXT_ACTION_OPTIONS}
                  value={nextAction}
                  onChange={handleNextActionChange}
                />
              </div>
            ) : null}

            {showFinalDetails && callbackRequired ? (
              <Field label="وقت الاتصال اللاحق">
                <input type="datetime-local" value={callbackAt} onChange={(event) => setCallbackAt(event.target.value)} className={INPUT_CLASS} />
              </Field>
            ) : null}

            {showFinalDetails ? (
              <div className={callbackRequired ? '' : 'md:col-span-2'}>
                <Field label="ملاحظات">
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className={TEXTAREA_CLASS}
                    placeholder="سجل الاعتراضات، المنتجات المطلوبة، ملاحظات العرض، أو سياق المتابعة."
                  />
                </Field>
              </div>
            ) : null}

            {showFinalDetails ? (
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={requiresUrgentAction}
                  onChange={(event) => setRequiresUrgentAction(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                وضع علامة متابعة عاجلة لهذه المكالمة
              </label>
            ) : null}
          </div>

          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-700 dark:bg-error-500/10 dark:text-error-300">
              <IconAlert size={20} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg border border-white/10 px-4 text-sm font-medium text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'جار الحفظ...' : 'حفظ نشاط المكالمة'}
          </button>
        </div>
      </div>
    </div>
  )
}
