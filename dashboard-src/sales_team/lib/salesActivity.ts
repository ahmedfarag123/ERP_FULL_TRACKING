import { supabase } from './supabase'
import { VISIT_PROOF_BUCKET } from './visitProofStorage'
import { formatVisitOutcomeFromResult, isUrgentAction, readRawPayloadValue } from './visitFlow'
import type { Json } from '../types'

export type VisitActivityFeedItem = {
  id: string
  type: 'visit'
  customerName: string
  occurredAt: string
  durationSeconds: number | null
  note: string | null
  outcomeLabel: string
  outcomeTone: 'green' | 'blue' | 'red' | 'yellow'
  urgent: boolean
  photoPath: string | null
  fraudStatus: string | null
  fraudScore: number | null
  fraudSignals: Json | null
  withinGeofence: boolean | null
  geofenceStatus: 'inside' | 'outside' | 'unknown'
  customerDistanceMeters: number | null
  visitMode: string | null
  overrideReason: string | null
  dynamicAnswers: Array<{
    id: string
    fieldId: string | null
    label: string
    answerText: string | null
    answerJson: Json | null
  }>
}

export type ActivityFeedItem = VisitActivityFeedItem

function getOccurredAt(row: Record<string, unknown>) {
  return String(
    row.completed_at ??
      row.checked_in_at ??
      row.started_at ??
      row.timestamp ??
      row.created_at ??
      new Date().toISOString()
  )
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toNullableBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return null
}

function getGeofenceStatus(withinGeofence: boolean | null): VisitActivityFeedItem['geofenceStatus'] {
  if (withinGeofence === true) return 'inside'
  if (withinGeofence === false) return 'outside'
  return 'unknown'
}

export async function fetchSalesActivityFeed(userId: string, limit = 80): Promise<ActivityFeedItem[]> {
  const visitsResponse = await supabase
    .from('visits')
    .select('id, customer_id, created_at, started_at, checked_in_at, completed_at, visit_result, visit_mode, note, override_reason, captured_photo_path, customer_distance_meters, within_geofence, fraud_score, fraud_status, fraud_signals, raw_form_payload')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (visitsResponse.error) throw visitsResponse.error

  const visitIds = (visitsResponse.data ?? []).map((row: any) => String(row.id)).filter(Boolean)

  const dynamicAnswerMap =
    visitIds.length > 0
      ? await supabase
          .from('visit_dynamic_answers')
          .select('id, visit_id, field_id, answer_text, answer_json')
          .in('visit_id', visitIds)
          .then(async ({ data, error }) => {
            if (error) throw error

            const fieldIds = Array.from(
              new Set(
                (data ?? [])
                  .map((answer: any) => (typeof answer.field_id === 'string' ? answer.field_id : null))
                  .filter((value): value is string => Boolean(value))
              )
            )

            const fieldLabelMap =
              fieldIds.length > 0
                ? await supabase
                    .from('dynamic_form_fields')
                    .select('id, label_en, label_ar, field_key')
                    .in('id', fieldIds)
                    .then(({ data: fields, error: fieldsError }) => {
                      if (fieldsError) throw fieldsError
                      return new Map(
                        (fields ?? []).map((field: any) => [
                          String(field.id),
                          String(field.label_en ?? field.label_ar ?? field.field_key ?? 'Question'),
                        ])
                      )
                    })
                : new Map<string, string>()

            const grouped = new Map<string, VisitActivityFeedItem['dynamicAnswers']>()
            ;(data ?? []).forEach((answer: any) => {
              const visitId = String(answer.visit_id)
              const fieldId = typeof answer.field_id === 'string' ? answer.field_id : null
              const list = grouped.get(visitId) ?? []
              list.push({
                id: String(answer.id),
                fieldId,
                label: fieldId ? fieldLabelMap.get(fieldId) ?? 'Question' : 'Question',
                answerText: typeof answer.answer_text === 'string' ? answer.answer_text : null,
                answerJson: (answer.answer_json ?? null) as Json | null,
              })
              grouped.set(visitId, list)
            })
            return grouped
          })
      : new Map<string, VisitActivityFeedItem['dynamicAnswers']>()

  const customerIds = Array.from(
    new Set(
      (visitsResponse.data ?? [])
        .map((row: any) => (typeof row.customer_id === 'string' ? row.customer_id : null))
        .filter((value): value is string => Boolean(value))
    )
  )

  const customerNameMap =
    customerIds.length > 0
      ? await supabase
          .from('customers')
          .select('id, customer_name')
          .in('id', customerIds)
          .then(({ data, error }) => {
            if (error) throw error
            return new Map((data ?? []).map((customer) => [String(customer.id), String(customer.customer_name ?? 'عميل')]))
          })
      : new Map<string, string>()

  const visits: VisitActivityFeedItem[] = (visitsResponse.data ?? []).map((row: any) => {
    const occurredAt = getOccurredAt(row)
    const durationSeconds =
      row.started_at && row.completed_at
        ? Math.max(0, Math.round((new Date(row.completed_at).getTime() - new Date(row.started_at).getTime()) / 1000))
        : null

    const nextAction = readRawPayloadValue<string>(row.raw_form_payload as Json | null | undefined, 'next_action')
    const outcome = formatVisitOutcomeFromResult(row.visit_result)
    const withinGeofence = toNullableBoolean(row.within_geofence)
    const customerName =
      typeof row.customer_id === 'string' && customerNameMap.has(row.customer_id)
        ? customerNameMap.get(row.customer_id) ?? 'عميل'
        : 'عميل'

    return {
      id: String(row.id),
      type: 'visit',
      customerName,
      occurredAt,
      durationSeconds,
      note: typeof row.note === 'string' ? row.note : null,
      outcomeLabel: outcome.label,
      outcomeTone: outcome.tone,
      urgent: isUrgentAction(nextAction),
      photoPath: typeof row.captured_photo_path === 'string' && row.captured_photo_path.length > 0 ? row.captured_photo_path : null,
      fraudStatus: typeof row.fraud_status === 'string' && row.fraud_status.length > 0 ? row.fraud_status : null,
      fraudScore: toNullableNumber(row.fraud_score),
      fraudSignals: (row.fraud_signals ?? null) as Json | null,
      withinGeofence,
      geofenceStatus: getGeofenceStatus(withinGeofence),
      customerDistanceMeters: toNullableNumber(row.customer_distance_meters),
      visitMode: typeof row.visit_mode === 'string' && row.visit_mode.length > 0 ? row.visit_mode : null,
      overrideReason: typeof row.override_reason === 'string' && row.override_reason.length > 0 ? row.override_reason : null,
      dynamicAnswers: dynamicAnswerMap.get(String(row.id)) ?? [],
    }
  })

  return visits.sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  )
}

export async function createVisitProofUrl(path: string) {
  const { data, error } = await supabase.storage.from(VISIT_PROOF_BUCKET).createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}
