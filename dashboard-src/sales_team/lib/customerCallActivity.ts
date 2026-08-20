import { supabase } from './supabase'
import type { SelectedCustomerProfile } from './customerProfileSelection'

type JsonRecord = Record<string, unknown>

export interface ActivityFieldDefinition {
  key: string
  label: string
  type: 'text' | 'date' | 'datetime-local' | 'textarea'
  placeholder?: string
}

export interface ActivityOption {
  value: string
  label: string
  fields?: ActivityFieldDefinition[]
}

export const CALL_REASON_OPTIONS: ActivityOption[] = [
  { value: 'follow_up', label: 'متابعة' },
  { value: 'offer_preparation', label: 'تحضير عرض' },
  { value: 'order_confirmation', label: 'تأكيد طلب' },
  { value: 'requested_callback', label: 'طلب اتصال لاحق' },
  { value: 'customer_verification', label: 'تأكيد بيانات العميل' },
  { value: 'product_inquiry', label: 'استفسار عن منتج' },
  { value: 'sales_outreach', label: 'تواصل مبيعات' },
  { value: 'feedback_survey', label: 'استطلاع رأي' },
  { value: 'other', label: 'أخرى' },
]

export const CUSTOMER_RESPONSE_OPTIONS: ActivityOption[] = [
  { value: 'interested_ready_to_order', label: 'مهتم وجاهز للطلب' },
  {
    value: 'needs_visit',
    label: 'يحتاج زيارة',
    fields: [
      { key: 'visitDate', label: 'وقت الزيارة المقترح', type: 'datetime-local' },
      { key: 'visitReason', label: 'سبب الزيارة', type: 'text', placeholder: 'ما المطلوب تنفيذه في الموقع؟' },
    ],
  },
  {
    value: 'call_back_later',
    label: 'اتصل لاحقاً',
    fields: [
      { key: 'callbackDate', label: 'وقت الاتصال اللاحق', type: 'datetime-local' },
      { key: 'callbackReason', label: 'سبب الاتصال اللاحق', type: 'text', placeholder: 'لماذا يجب إعادة الاتصال؟' },
    ],
  },
  { value: 'requested_price_list', label: 'طلب قائمة أسعار' },
  {
    value: 'price_too_high',
    label: 'السعر مرتفع',
    fields: [
      { key: 'priceReason', label: 'اعتراض السعر', type: 'text', placeholder: 'ما مشكلة التسعير التي ذكرها العميل؟' },
      { key: 'affectedProducts', label: 'المنتجات المتأثرة', type: 'text', placeholder: 'ما المنتجات المتأثرة؟' },
    ],
  },
  {
    value: 'requested_quotation',
    label: 'طلب عرض سعر',
    fields: [
      { key: 'quotationDetails', label: 'تفاصيل عرض السعر', type: 'textarea', placeholder: 'المنتجات والكميات والشروط أو القيود' },
    ],
  },
  {
    value: 'products_not_available',
    label: 'المنتجات المطلوبة غير متاحة',
    fields: [
      { key: 'requestedBrand', label: 'العلامة أو المورد المطلوب', type: 'text' },
      { key: 'requestedProducts', label: 'المنتجات المطلوبة', type: 'textarea' },
    ],
  },
  {
    value: 'rejected_platform',
    label: 'رفض المنصة',
    fields: [{ key: 'refusalReason', label: 'السبب', type: 'textarea', placeholder: 'لماذا رفض العميل المنصة؟' }],
  },
  {
    value: 'rejected_offer',
    label: 'رفض العرض',
    fields: [
      { key: 'rejectionReason', label: 'سبب الرفض', type: 'textarea' },
      { key: 'competitor', label: 'المنافس', type: 'text', placeholder: 'إذا ذكر العميل منافساً' },
    ],
  },
  { value: 'accepted_offer', label: 'قبل العرض' },
  {
    value: 'order_outside_platform',
    label: 'طلب خارج المنصة',
    fields: [{ key: 'orderDetails', label: 'تفاصيل الطلب', type: 'textarea', placeholder: 'ماذا طلب العميل؟' }],
  },
  { value: 'no_clear_answer', label: 'لا توجد إجابة واضحة' },
]

export const CALL_OUTCOME_OPTIONS: ActivityOption[] = [
  { value: 'connected', label: 'تم التواصل' },
  { value: 'no_answer', label: 'لا يوجد رد' },
  { value: 'busy', label: 'مشغول' },
  { value: 'wrong_number', label: 'رقم خاطئ' },
  { value: 'not_interested', label: 'غير مهتم' },
  { value: 'requested_callback', label: 'طلب اتصال لاحق' },
  { value: 'visit_required', label: 'زيارة مطلوبة' },
  { value: 'escalated', label: 'تم التصعيد' },
  { value: 'other', label: 'أخرى' },
]

export const NEXT_ACTION_OPTIONS: ActivityOption[] = [
  { value: 'schedule_follow_up_call', label: 'جدولة اتصال متابعة' },
  { value: 'schedule_visit', label: 'جدولة زيارة' },
  { value: 'send_information', label: 'إرسال معلومات' },
  { value: 'send_quotation', label: 'إرسال عرض سعر' },
  { value: 'create_order', label: 'إنشاء طلب' },
  { value: 'escalate_internally', label: 'تصعيد داخلي' },
  { value: 'no_further_action', label: 'لا إجراء إضافي' },
]

function getText(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function formatOptionLabel(options: ActivityOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value.replace(/[_-]+/g, ' ')
}

export function getOptionFields(options: ActivityOption[], value: string) {
  return options.find((option) => option.value === value)?.fields ?? []
}

export function toDateTimeLocalValue(value?: string | Date | null) {
  const parsed = value instanceof Date ? value : value ? new Date(value) : new Date()
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const offset = safeDate.getTimezoneOffset()
  const localized = new Date(safeDate.getTime() - offset * 60_000)
  return localized.toISOString().slice(0, 16)
}

export function parseDurationMinutesToSeconds(value: string) {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) return null
  return Math.round(minutes * 60)
}

export function buildCallInteractionDescription(input: {
  callReason: string
  customerResponse: string
  callOutcome: string
  nextAction: string
  notes: string
}) {
  return [
    formatOptionLabel(CALL_REASON_OPTIONS, input.callReason),
    formatOptionLabel(CUSTOMER_RESPONSE_OPTIONS, input.customerResponse),
    formatOptionLabel(CALL_OUTCOME_OPTIONS, input.callOutcome),
    formatOptionLabel(NEXT_ACTION_OPTIONS, input.nextAction),
    getText(input.notes),
  ]
    .filter(Boolean)
    .join(' - ')
}

export async function saveCustomerCallActivity(input: {
  customerId: string
  userId: string
  direction: 'inbound' | 'outbound'
  occurredAt: string
  durationSeconds: number | null
  callReason: string
  customerResponse: string
  responseDetails: Record<string, string>
  callOutcome: string
  nextAction: string
  callbackAt?: string | null
  notes: string
  requiresUrgentAction: boolean
  selectedCustomerProfile?: SelectedCustomerProfile | null
  selectedCustomerProfiles?: SelectedCustomerProfile[]
}) {
  const completedAt = normalizeDate(input.occurredAt)
  const startedAt =
    completedAt && input.durationSeconds
      ? new Date(new Date(completedAt).getTime() - input.durationSeconds * 1000).toISOString()
      : completedAt

  const rawFormPayload: JsonRecord = {
    direction: input.direction,
    response_details: input.responseDetails,
    selected_customer_profile: input.selectedCustomerProfile ?? null,
    selected_customer_profiles: input.selectedCustomerProfiles ?? (input.selectedCustomerProfile ? [input.selectedCustomerProfile] : []),
    occurred_at: completedAt,
  }

  const insertPayload = {
    customer_id: input.customerId,
    user_id: input.userId,
    started_at: startedAt,
    completed_at: completedAt,
    call_duration_seconds: input.durationSeconds,
    call_status: input.callOutcome === 'connected' ? 'completed' : input.callOutcome,
    call_reason: input.callReason,
    customer_response: input.customerResponse,
    call_outcome: input.callOutcome,
    next_action: input.nextAction,
    callback_at: normalizeDate(input.callbackAt ?? null),
    call_notes: getText(input.notes),
    requires_urgent_action: input.requiresUrgentAction,
    source: 'manual_sales_pwa',
    raw_payload: rawFormPayload,
    raw_form_payload: rawFormPayload,
  }

  const { data, error } = await supabase.from('calls').insert(insertPayload).select('*').single()
  if (error) throw error

  const { error: interactionError } = await supabase.from('customer_interactions').insert({
    customer_id: input.customerId,
    interaction_type: 'call',
    title: 'Phone call',
    description: buildCallInteractionDescription(input),
    actor_user_id: input.userId,
    metadata: {
      call_id: data.id,
      direction: input.direction,
      call_reason: input.callReason,
      customer_response: input.customerResponse,
      call_outcome: input.callOutcome,
      next_action: input.nextAction,
      callback_at: normalizeDate(input.callbackAt ?? null),
      requires_urgent_action: input.requiresUrgentAction,
      response_details: input.responseDetails,
      selected_customer_profile: input.selectedCustomerProfile ?? null,
      selected_customer_profiles: input.selectedCustomerProfiles ?? (input.selectedCustomerProfile ? [input.selectedCustomerProfile] : []),
    },
  })

  if (interactionError) {
    console.warn('Failed to write customer interaction for call activity.', interactionError)
  }

  return data
}
