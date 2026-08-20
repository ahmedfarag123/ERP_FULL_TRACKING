import assert from 'node:assert/strict'
import {
  findPhoneDuplicateCustomer,
  normalizePhoneDigits,
  validateNewCustomerCheckInInput,
} from '../sales_team/lib/newCustomerCheckInValidation.ts'

assert.equal(normalizePhoneDigits('٠١٠-١٢٣٤-٥٦٧٨'), '01012345678')
assert.equal(normalizePhoneDigits('+20 10 1234 5678'), '01012345678')
assert.equal(normalizePhoneDigits('00201012345678'), '01012345678')

const duplicate = findPhoneDuplicateCustomer('010 1234 5678', [
  { id: 'c-1', customer_name: 'Old Cafe', phone_number: '+20 10 1234 5678' },
  { id: 'c-2', customer_name: 'Other Cafe', phone_number: '01200000000' },
])

assert.equal(duplicate?.id, 'c-1')

assert.deepEqual(validateNewCustomerCheckInInput({
  customerName: '',
  phone: '01012345678',
  customerType: 'restaurant',
  location: { lat: 30.0444, lng: 31.2357 },
}).errors.customerName, 'اسم العميل مطلوب')

assert.deepEqual(validateNewCustomerCheckInInput({
  customerName: 'Fresh Cafe',
  phone: '123',
  customerType: 'restaurant',
  location: { lat: 30.0444, lng: 31.2357 },
}).errors.phone, 'رقم الموبايل غير صالح')

assert.equal(validateNewCustomerCheckInInput({
  customerName: 'Fresh Cafe',
  phone: '01012345678',
  customerType: 'restaurant',
  location: { lat: 30.0444, lng: 31.2357 },
}).valid, true)

console.log('new customer check-in validation helpers passed')
