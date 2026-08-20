import type { Json } from '../types'

export const decisionMakerOptions = [
  'MET_DECISION_MAKER',
  'MET_EMPLOYEE_ONLY',
  'NO_CONTACT',
] as const

export const interestLevelOptions = [
  'HIGH_IMMEDIATE',
  'MEDIUM_CONSIDERING',
  'LOW_INTEREST',
  'REJECTED',
  'EMPLOYEE_COOPERATIVE',
  'CALL_BACK_LATER',
  'CLOSED_TEMPORARY',
  'CLOSED_PERMANENT',
] as const

export const nextActionOptions = [
  'CREATE_ORDER_NOW',
  'CONFIRM_DELIVERY',
  'SEND_QUOTATION_NOW',
  'FOLLOW_UP_24H',
  'FOLLOW_UP_3_DAYS',
  'FOLLOW_UP_NEXT_WEEK',
  'FOLLOW_UP_DECISION_MAKER',
  'SEND_BROCHURE',
  'CALL_AGAIN_TODAY',
  'RETRY_VISIT',
  'NO_FURTHER_ACTION',
] as const

export type DecisionMakerStatusValue = (typeof decisionMakerOptions)[number]
export type InterestLevelValue = (typeof interestLevelOptions)[number]
export type NextActionValue = (typeof nextActionOptions)[number]

export const urgentActions = new Set<NextActionValue>([
  'CREATE_ORDER_NOW',
  'CONFIRM_DELIVERY',
  'CALL_AGAIN_TODAY',
])

export const decisionMakerLabelMap: Record<DecisionMakerStatusValue, string> = {
  MET_DECISION_MAKER: 'صاحب القرار',
  MET_EMPLOYEE_ONLY: 'موظف فقط',
  NO_CONTACT: 'لا يوجد تواصل',
}

export const interestLevelLabelMap: Record<InterestLevelValue, string> = {
  HIGH_IMMEDIATE: 'اهتمام عالي وفوري',
  MEDIUM_CONSIDERING: 'اهتمام متوسط',
  LOW_INTEREST: 'اهتمام منخفض',
  REJECTED: 'مرفوض',
  EMPLOYEE_COOPERATIVE: 'الموظف متعاون',
  CALL_BACK_LATER: 'اتصل لاحقاً',
  CLOSED_TEMPORARY: 'مغلق مؤقتاً',
  CLOSED_PERMANENT: 'مغلق نهائياً',
}

export const nextActionLabelMap: Record<NextActionValue, string> = {
  CREATE_ORDER_NOW: 'إنشاء طلب الآن',
  CONFIRM_DELIVERY: 'تأكيد التسليم',
  SEND_QUOTATION_NOW: 'إرسال عرض سعر الآن',
  FOLLOW_UP_24H: 'متابعة خلال ٢٤ ساعة',
  FOLLOW_UP_3_DAYS: 'متابعة خلال ٣ أيام',
  FOLLOW_UP_NEXT_WEEK: 'متابعة الأسبوع القادم',
  FOLLOW_UP_DECISION_MAKER: 'متابعة مع صاحب القرار',
  SEND_BROCHURE: 'إرسال الكتيب',
  CALL_AGAIN_TODAY: 'إعادة الاتصال اليوم',
  RETRY_VISIT: 'إعادة الزيارة',
  NO_FURTHER_ACTION: 'لا يوجد إجراء لاحق',
}

export function getInterestLevelOptions(
  decisionMaker: DecisionMakerStatusValue
): InterestLevelValue[] {
  if (decisionMaker === 'MET_DECISION_MAKER') {
    return ['HIGH_IMMEDIATE', 'MEDIUM_CONSIDERING', 'LOW_INTEREST', 'REJECTED']
  }

  if (decisionMaker === 'MET_EMPLOYEE_ONLY') {
    return ['EMPLOYEE_COOPERATIVE', 'CALL_BACK_LATER', 'LOW_INTEREST']
  }

  return ['CLOSED_TEMPORARY', 'CLOSED_PERMANENT']
}

export function getNextActionOptions(interestLevel: InterestLevelValue): NextActionValue[] {
  switch (interestLevel) {
    case 'HIGH_IMMEDIATE':
      return ['CREATE_ORDER_NOW', 'CONFIRM_DELIVERY']
    case 'MEDIUM_CONSIDERING':
      return ['SEND_QUOTATION_NOW', 'FOLLOW_UP_24H', 'FOLLOW_UP_3_DAYS']
    case 'LOW_INTEREST':
      return ['FOLLOW_UP_NEXT_WEEK', 'SEND_BROCHURE', 'NO_FURTHER_ACTION']
    case 'REJECTED':
    case 'CLOSED_PERMANENT':
      return ['NO_FURTHER_ACTION']
    case 'EMPLOYEE_COOPERATIVE':
      return ['FOLLOW_UP_DECISION_MAKER', 'SEND_BROCHURE', 'FOLLOW_UP_24H']
    case 'CALL_BACK_LATER':
      return ['CALL_AGAIN_TODAY', 'FOLLOW_UP_24H']
    case 'CLOSED_TEMPORARY':
      return ['RETRY_VISIT', 'FOLLOW_UP_3_DAYS']
    default:
      return ['FOLLOW_UP_24H']
  }
}

export function isUrgentAction(action: string | null | undefined): boolean {
  return urgentActions.has(action as NextActionValue)
}

export function formatVisitOutcomeFromResult(
  visitResult: string | null | undefined
): { label: string; tone: 'green' | 'blue' | 'red' | 'yellow' } {
  const normalized = String(visitResult ?? '').toLowerCase()

  if (normalized.includes('order') || normalized.includes('meeting')) {
    return { label: 'بيع', tone: 'green' }
  }

  if (normalized.includes('follow') || normalized.includes('quotation')) {
    return { label: 'متابعة', tone: 'blue' }
  }

  if (normalized.includes('unavailable') || normalized.includes('closed') || normalized.includes('reject')) {
    return { label: 'مغلق', tone: 'red' }
  }

  return { label: 'مراجعة', tone: 'yellow' }
}

export function getLocalizedLabel<T extends string>(
  map: Record<T, string>,
  key: T,
  _language?: 'ar' | 'en'
) {
  return map[key] ?? key
}

export function readRawPayloadValue<T extends string>(
  payload: Json | null | undefined,
  key: string
): T | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const value = payload[key]
  return typeof value === 'string' ? (value as T) : null
}
