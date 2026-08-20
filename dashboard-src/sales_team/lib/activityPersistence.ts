import { supabase } from './supabase'
import type { SelectedCustomerProfile } from './customerProfileSelection'

function getText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function buildVisitResult(input: {
  decisionMakerStatus: string
  interestLevel: string
  nextAction: string
}): string {
  if (input.nextAction === 'CREATE_ORDER_NOW') return 'order_expected'
  if (input.nextAction === 'SEND_QUOTATION_NOW') return 'quotation_requested'
  if (input.decisionMakerStatus === 'NO_CONTACT' || input.interestLevel === 'CLOSED_TEMPORARY') {
    return 'customer_unavailable'
  }
  if (input.interestLevel === 'HIGH_IMMEDIATE') return 'meeting_completed'
  return 'follow_up_required'
}

function buildVisitNote(input: {
  notes: string
  decisionMakerStatus: string
  interestLevel: string
  nextAction: string
}): string {
  const parts = [
    getText(input.notes),
    `Decision maker: ${input.decisionMakerStatus}`,
    `Interest: ${input.interestLevel}`,
    `Next action: ${input.nextAction}`
  ].filter(Boolean)

  return parts.join(' | ')
}

export async function saveSalesVisitActivity(input: {
  customerId: string
  userId: string
  startedAt: string
  completedAt: string
  decisionMakerStatus: string
  interestLevel: string
  nextAction: string
  notes: string
  lat: number | null
  lng: number | null
  customerDistanceMeters: number | null
  withinGeofence: boolean | null
  geofenceStatus?: 'inside' | 'outside' | 'customer_geofence_missing' | 'device_location_missing'
  geofenceRadiusMeters?: number | null
  overrideApplied: boolean
  orderIntent?: {
    summary: string
    estimatedValue: string
    requestedDeliveryDate: string
  } | null
  selectedCustomerProfile?: SelectedCustomerProfile | null
  selectedCustomerProfiles?: SelectedCustomerProfile[]
  dynamicAnswers?: Array<{
    fieldId: string
    answerText: string | null
    answerJson?: unknown
  }>
  capturedPhotoPath: string | null
  durationSeconds: number
}) {
  const startedAt = normalizeDate(input.startedAt) ?? new Date().toISOString()
  const completedAt = normalizeDate(input.completedAt) ?? new Date().toISOString()
  const rawFormPayload = {
    status: 'done',
    visit_type: 'follow_up',
    visit_outcome: buildVisitResult(input),
    next_action: input.nextAction,
    decision_maker_status: input.decisionMakerStatus,
    interest_level: input.interestLevel,
    duration_seconds: input.durationSeconds,
    override_applied: input.overrideApplied,
    geofence_status: input.geofenceStatus ?? null,
    geofence_radius_meters: input.geofenceRadiusMeters ?? null,
    order_intent: input.orderIntent ?? null,
    selected_customer_profile: input.selectedCustomerProfile ?? null,
    selected_customer_profiles: input.selectedCustomerProfiles ?? (input.selectedCustomerProfile ? [input.selectedCustomerProfile] : []),
    dynamic_answers: input.dynamicAnswers ?? []
  }

  const insertPayload = {
    customer_id: input.customerId,
    user_id: input.userId,
    visit_result: buildVisitResult(input),
    visit_mode: 'gps',
    note: buildVisitNote(input),
    override_reason: input.overrideApplied ? 'manual_geofence_override' : null,
    captured_photo_path: input.capturedPhotoPath,
    started_at: startedAt,
    checked_in_at: startedAt,
    completed_at: completedAt,
    lat: input.lat,
    lng: input.lng,
    customer_distance_meters: input.customerDistanceMeters,
    within_geofence: input.withinGeofence,
    source: 'manual',
    raw_payload: rawFormPayload,
    raw_form_payload: rawFormPayload
  }

  const { data, error } = await supabase.from('visits').insert(insertPayload).select('*').single()
  if (error) throw error

  if (input.dynamicAnswers?.length) {
    void Promise.resolve(
      supabase.from('visit_dynamic_answers').insert(
        input.dynamicAnswers.map((answer) => ({
          visit_id: data.id,
          field_id: answer.fieldId,
          answer_text: answer.answerText,
          answer_json: answer.answerJson ?? answer.answerText,
        }))
      )
    )
      .then(({ error: answerError }) => {
        if (answerError) {
          console.warn('Failed to create visit dynamic answers.', answerError)
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to create visit dynamic answers.', error)
      })
  }

  void Promise.resolve(
    supabase
      .from('customers')
      .update({ last_visit_at: completedAt })
      .eq('id', input.customerId)
  )
    .then(({ error: customerUpdateError }) => {
      if (customerUpdateError) {
        console.warn('Failed to update customer last_visit_at after visit save.', customerUpdateError)
      }
    })
    .catch((error: unknown) => {
      console.warn('Failed to update customer last_visit_at after visit save.', error)
    })

  void Promise.resolve(
    supabase
      .from('customer_interactions')
      .insert({
        customer_id: input.customerId,
        interaction_type: 'visit',
        title: 'Sales visit',
        description: buildVisitNote(input),
        visit_id: data.id,
        actor_user_id: input.userId,
        metadata: {
          visit_result: insertPayload.visit_result,
          visit_mode: insertPayload.visit_mode,
          next_action: input.nextAction,
          decision_maker_status: input.decisionMakerStatus,
          interest_level: input.interestLevel,
          duration_seconds: input.durationSeconds,
          within_geofence: input.withinGeofence,
          customer_distance_meters: input.customerDistanceMeters,
          override_applied: input.overrideApplied,
          geofence_status: input.geofenceStatus ?? null,
          geofence_radius_meters: input.geofenceRadiusMeters ?? null,
          order_intent: input.orderIntent ?? null,
          selected_customer_profile: input.selectedCustomerProfile ?? null,
          selected_customer_profiles: input.selectedCustomerProfiles ?? (input.selectedCustomerProfile ? [input.selectedCustomerProfile] : []),
          dynamic_answers: input.dynamicAnswers ?? []
        }
      })
  )
    .then(({ error: interactionError }) => {
      if (interactionError) {
        console.warn('Failed to create visit interaction.', interactionError)
      }
    })
    .catch((error: unknown) => {
      console.warn('Failed to create visit interaction.', error)
    })

  return data
}
