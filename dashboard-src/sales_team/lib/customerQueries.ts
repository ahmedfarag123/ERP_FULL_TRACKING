import { supabase } from './supabase'
import { mapCustomerRecord } from './customerMapper'
import {
  findPhoneDuplicateCustomer,
  normalizePhoneDigits,
  type PhoneDuplicateCandidate,
} from './newCustomerCheckInValidation'
import type { Customer } from '../types'
import type { ScopedUserContext } from './userAccess'

const CUSTOMER_SELECT =
  'id, external_customer_id, customer_name, phone_number, customer_email, customer_location, google_maps_url, whatsapp_number, customer_type, product_interests, governorate, district, place, address_line, notes, status, priority, size, lat, lng, geofence_radius_meters, assigned_user_id, created_by, updated_by, last_visit_at, created_at, updated_at'

type FetchScopedCustomersOptions = {
  userContext: ScopedUserContext
  search?: string
  filterClass?: string
  requireCoordinates?: boolean
  limit?: number
  from?: number
  to?: number
  orderBy?: 'customer_name'
}

export type SalesCustomerTypeOption = {
  customer_type_key: string
  customer_type_name_ar: string
  sort_order: number | null
}

export type CreateCheckInCustomerInput = {
  userContext: ScopedUserContext
  customerName: string
  phone: string
  customerType: string
  lat: number
  lng: number
}

function applyUserScope(query: any, userContext: ScopedUserContext) {
  if (userContext.isPrivileged) {
    return query
  }

  return query.eq('assigned_user_id', userContext.id)
}

function applySearch(query: any, search?: string) {
  const trimmedSearch = search?.trim()
  if (!trimmedSearch) {
    return query
  }

  return query.or(
    `customer_name.ilike.%${trimmedSearch}%,district.ilike.%${trimmedSearch}%,place.ilike.%${trimmedSearch}%,governorate.ilike.%${trimmedSearch}%,phone_number.ilike.%${trimmedSearch}%,customer_email.ilike.%${trimmedSearch}%,customer_location.ilike.%${trimmedSearch}%,google_maps_url.ilike.%${trimmedSearch}%`
  )
}

function matchesFilterClass(customer: Customer, filterClass?: string): boolean {
  if (!filterClass || filterClass === 'ALL') {
    return true
  }

  return customer.customer_class === filterClass
}

function sortCustomers(customers: Customer[], orderBy?: 'customer_name') {
  if (orderBy === 'customer_name') {
    return [...customers].sort((left, right) => (left.name ?? '').localeCompare(right.name ?? '', 'ar'))
  }

  return customers
}

async function fetchCustomersForClassFilter(options: FetchScopedCustomersOptions): Promise<Customer[]> {
  let query: any = applyUserScope(supabase.from('customers').select(CUSTOMER_SELECT), options.userContext)
  query = applySearch(query, options.search)

  if (options.requireCoordinates) {
    query = query.not('lat', 'is', null).not('lng', 'is', null)
  }

  const { data, error } = await query.limit(2000)
  if (error) {
    throw error
  }

  return sortCustomers(
    (data ?? [])
      .map((row: any) => mapCustomerRecord(row as Record<string, unknown>))
      .filter((customer: Customer) => matchesFilterClass(customer, options.filterClass)),
    options.orderBy
  )
}

export async function countScopedCustomers(options: {
  userContext: ScopedUserContext
  search?: string
  filterClass?: string
}): Promise<number> {
  if (options.filterClass && options.filterClass !== 'ALL') {
    const rows = await fetchCustomersForClassFilter({
      userContext: options.userContext,
      search: options.search,
      filterClass: options.filterClass
    })
    return rows.length
  }

  let query: any = applyUserScope(
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    options.userContext
  )
  query = applySearch(query, options.search)

  const { count, error } = await query
  if (error) {
    throw error
  }

  return count ?? 0
}

export async function fetchScopedCustomers(options: FetchScopedCustomersOptions): Promise<Customer[]> {
  if (options.filterClass && options.filterClass !== 'ALL') {
    const rows = await fetchCustomersForClassFilter(options)

    if (typeof options.from === 'number' && typeof options.to === 'number') {
      return rows.slice(options.from, options.to + 1)
    }

    if (typeof options.limit === 'number') {
      return rows.slice(0, options.limit)
    }

    return rows
  }

  let query: any = applyUserScope(supabase.from('customers').select(CUSTOMER_SELECT), options.userContext)

  if (options.requireCoordinates) {
    query = query.not('lat', 'is', null).not('lng', 'is', null)
  }

  query = applySearch(query, options.search)

  if (options.orderBy === 'customer_name') {
    query = query.order('customer_name', { ascending: true })
  }

  if (typeof options.from === 'number' && typeof options.to === 'number') {
    query = query.range(options.from, options.to)
  } else if (typeof options.limit === 'number') {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return (data ?? []).map((row: any) => mapCustomerRecord(row as Record<string, unknown>))
}

export async function fetchScopedCustomerById(options: {
  userContext: ScopedUserContext
  customerId: string
}): Promise<Customer | null> {
  let query: any = applyUserScope(
    supabase.from('customers').select(CUSTOMER_SELECT).or(`id.eq.${options.customerId},external_customer_id.eq.${options.customerId}`),
    options.userContext
  )

  const { data, error } = await query.maybeSingle()
  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapCustomerRecord(data as Record<string, unknown>)
}

export async function fetchCustomerNameSuggestions(options: {
  userContext: ScopedUserContext
  search: string
  limit?: number
}): Promise<Customer[]> {
  const trimmedSearch = options.search.trim()
  if (trimmedSearch.length < 2) return []

  let query: any = applyUserScope(
    supabase.from('customers').select(CUSTOMER_SELECT).ilike('customer_name', `%${trimmedSearch}%`),
    options.userContext
  )

  query = query.order('customer_name', { ascending: true }).limit(options.limit ?? 6)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row: any) => mapCustomerRecord(row as Record<string, unknown>))
}

export async function findScopedCustomerByPhone(options: {
  userContext: ScopedUserContext
  phone: string
}): Promise<Customer | null> {
  const normalizedPhone = normalizePhoneDigits(options.phone)
  if (normalizedPhone.length < 10) return null

  const phoneTail = normalizedPhone.slice(-7)
  let query: any = applyUserScope(
    supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .ilike('phone_number', `%${phoneTail}%`)
      .limit(20),
    options.userContext
  )

  const { data, error } = await query
  if (error) throw error

  const duplicate = findPhoneDuplicateCustomer(
    options.phone,
    (data ?? []) as PhoneDuplicateCandidate[]
  )

  return duplicate ? mapCustomerRecord(duplicate as Record<string, unknown>) : null
}

export async function fetchSalesCustomerTypeOptions(): Promise<SalesCustomerTypeOption[]> {
  const { data, error } = await supabase
    .from('sales_customer_type_mappings')
    .select('customer_type_key, customer_type_name_ar, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw error
  return (data ?? []) as SalesCustomerTypeOption[]
}

export async function createCheckInCustomer(input: CreateCheckInCustomerInput): Promise<Customer> {
  const locationText = `${input.lat.toFixed(6)}, ${input.lng.toFixed(6)}`
  const googleMapsUrl = `https://www.google.com/maps?q=${input.lat},${input.lng}`

  const { data, error } = await supabase
    .from('customers')
    .insert({
      customer_name: input.customerName.trim(),
      phone_number: normalizePhoneDigits(input.phone),
      customer_type: input.customerType,
      lat: input.lat,
      lng: input.lng,
      customer_location: locationText,
      google_maps_url: googleMapsUrl,
      assigned_user_id: input.userContext.id,
      created_by: input.userContext.id,
      updated_by: input.userContext.id,
      status: 'active',
      priority: 'medium',
      product_interests: [],
    })
    .select(CUSTOMER_SELECT)
    .single()

  if (error) throw error
  return mapCustomerRecord(data as Record<string, unknown>)
}
