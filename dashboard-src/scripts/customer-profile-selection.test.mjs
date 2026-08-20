import assert from 'node:assert/strict'
import {
  buildSelectedCustomerProfile,
  filterProductMappings,
  getSpecialitiesForCustomerType,
} from '../sales_team/lib/customerProfileSelection.ts'

const customerTypes = [
  { customer_type_key: 'restaurant', customer_type_name_ar: 'Restaurant', sort_order: 10 },
  { customer_type_key: 'hotel', customer_type_name_ar: 'Hotel', sort_order: 20 },
]

const specialities = [
  { customer_type_key: 'restaurant', speciality_key: 'pizza', speciality_name_ar: 'Pizza', sort_order: 10 },
  { customer_type_key: 'restaurant', speciality_key: 'grill', speciality_name_ar: 'Grill', sort_order: 20 },
  { customer_type_key: 'hotel', speciality_key: 'buffet', speciality_name_ar: 'Buffet', sort_order: 10 },
]

const products = [
  {
    external_product_id: 'P-1',
    product_name: 'Mozzarella',
    brand_key: 'brand-a',
    brand_name_ar: 'Brand A',
    category_key: 'dairy',
    category_name_ar: 'Dairy',
    subcategory_key: 'cheese',
    subcategory_name_ar: 'Cheese',
    customer_types: ['restaurant'],
    customer_specialities: ['pizza'],
  },
  {
    external_product_id: 'P-2',
    product_name: 'Milk',
    brand_key: 'brand-b',
    brand_name_ar: 'Brand B',
    category_key: 'dairy',
    category_name_ar: 'Dairy',
    subcategory_key: 'milk',
    subcategory_name_ar: 'Milk',
    customer_types: ['hotel'],
    customer_specialities: ['buffet'],
  },
]

assert.deepEqual(
  getSpecialitiesForCustomerType(specialities, 'restaurant').map((item) => item.speciality_key),
  ['pizza', 'grill'],
)

assert.deepEqual(
  filterProductMappings(products, {
    customerTypeKey: 'restaurant',
    customerTypeName: 'Restaurant',
    specialityKey: 'pizza',
    specialityName: 'Pizza',
    brandKey: 'brand-a',
    categoryKey: 'dairy',
    subcategoryKey: 'cheese',
  }).map((item) => item.external_product_id),
  ['P-1'],
)

assert.equal(
  filterProductMappings(products, {
    customerTypeKey: 'restaurant',
    customerTypeName: 'Restaurant',
    specialityKey: 'buffet',
    specialityName: 'Buffet',
    brandKey: '',
    categoryKey: '',
    subcategoryKey: '',
  }).length,
  0,
)

assert.deepEqual(
  buildSelectedCustomerProfile({
    customerTypes,
    specialities,
    products,
    selection: {
      customerTypeKey: 'restaurant',
      specialityKey: 'pizza',
      brandKey: 'brand-a',
      categoryKey: 'dairy',
      subcategoryKey: 'cheese',
      productExternalId: 'P-1',
    },
  }),
  {
    customer_type_key: 'restaurant',
    customer_type_name_ar: 'Restaurant',
    speciality_key: 'pizza',
    speciality_name_ar: 'Pizza',
    brand_key: 'brand-a',
    brand_name_ar: 'Brand A',
    category_key: 'dairy',
    category_name_ar: 'Dairy',
    subcategory_key: 'cheese',
    subcategory_name_ar: 'Cheese',
    product_external_id: 'P-1',
    product_name: 'Mozzarella',
  },
)

console.log('customer profile selection helpers passed')
