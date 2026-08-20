export type NewCustomerCheckInLocation = {
  lat: number
  lng: number
}

export type NewCustomerCheckInInput = {
  customerName: string
  phone: string
  customerType: string
  location: NewCustomerCheckInLocation | null
}

export type NewCustomerCheckInErrors = Partial<Record<keyof NewCustomerCheckInInput, string>>

export type PhoneDuplicateCandidate = {
  id: string
  customer_name?: string | null
  name?: string | null
  phone_number?: string | null
  phone?: string | null
}

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
}

export function normalizePhoneDigits(value: string): string {
  const digits = Array.from(value)
    .map((character) => ARABIC_DIGITS[character] ?? character)
    .join('')
    .replace(/\D/g, '')

  if (digits.startsWith('0020') && digits.length >= 14) {
    return `0${digits.slice(4)}`
  }

  if (digits.startsWith('20') && digits.length >= 12) {
    return `0${digits.slice(2)}`
  }

  return digits
}

export function isValidMobilePhone(value: string): boolean {
  const normalized = normalizePhoneDigits(value)
  return /^01[0125]\d{8}$/.test(normalized)
}

export function findPhoneDuplicateCustomer<T extends PhoneDuplicateCandidate>(
  phone: string,
  candidates: T[]
): T | null {
  const normalizedPhone = normalizePhoneDigits(phone)
  if (!normalizedPhone) return null

  return (
    candidates.find((candidate) => {
      const candidatePhone = normalizePhoneDigits(candidate.phone_number ?? candidate.phone ?? '')
      return Boolean(candidatePhone && candidatePhone === normalizedPhone)
    }) ?? null
  )
}

function isValidLocation(location: NewCustomerCheckInLocation | null): boolean {
  return Boolean(
    location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng) &&
      location.lat >= -90 &&
      location.lat <= 90 &&
      location.lng >= -180 &&
      location.lng <= 180
  )
}

export function validateNewCustomerCheckInInput(input: NewCustomerCheckInInput): {
  valid: boolean
  errors: NewCustomerCheckInErrors
} {
  const errors: NewCustomerCheckInErrors = {}

  if (!input.customerName.trim()) {
    errors.customerName = 'اسم العميل مطلوب'
  }

  if (!isValidMobilePhone(input.phone)) {
    errors.phone = 'رقم الموبايل غير صالح'
  }

  if (!input.customerType.trim()) {
    errors.customerType = 'نوع العميل مطلوب'
  }

  if (!isValidLocation(input.location)) {
    errors.location = 'موقع العميل مطلوب'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
