import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type ProductRow = {
  id: string
  external_product_id: string | null
  internal_reference: string | null
  product_name: string | null
  average_cost: number | string | null
  sales_price: number | string | null
  quantity_on_hand: number | string | null
  incoming_quantity: number | string | null
  outgoing_quantity: number | string | null
  unit_of_measure: string | null
  updated_at: string | null
}

type ProductMappingRow = {
  external_product_id: string
  brand_name_ar: string | null
  category_name_ar: string | null
  subcategory_name_ar: string | null
  customer_specialities: string[] | null
  customer_types: string[] | null
}

type CustomerTypeOption = {
  customer_type_name_ar: string
  sort_order: number | null
}

type SpecialityOption = {
  speciality_name_ar: string
  sort_order: number | null
}

type EnrichedProductRow = ProductRow & {
  mapping?: ProductMappingRow
}

const ALL_FILTER = 'all'

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(numberValue(value))
}

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [productMappings, setProductMappings] = useState<Record<string, ProductMappingRow>>({})
  const [customerTypeOptions, setCustomerTypeOptions] = useState<CustomerTypeOption[]>([])
  const [specialityOptions, setSpecialityOptions] = useState<SpecialityOption[]>([])
  const [search, setSearch] = useState('')
  const [customerTypeFilter, setCustomerTypeFilter] = useState(ALL_FILTER)
  const [specialityFilter, setSpecialityFilter] = useState(ALL_FILTER)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadProducts = async () => {
      setLoading(true)
      setError(null)
      try {
        const [productsResult, mappingsResult, customerTypesResult, specialitiesResult] = await Promise.all([
          supabase
            .from('products')
            .select(
              'id, external_product_id, internal_reference, product_name, average_cost, sales_price, quantity_on_hand, incoming_quantity, outgoing_quantity, unit_of_measure, updated_at'
            )
            .order('product_name', { ascending: true })
            .limit(300),
          supabase
            .from('sales_product_customer_mappings')
            .select('external_product_id, brand_name_ar, category_name_ar, subcategory_name_ar, customer_specialities, customer_types')
            .eq('is_active', true),
          supabase
            .from('sales_customer_type_mappings')
            .select('customer_type_name_ar, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('sales_customer_speciality_mappings')
            .select('speciality_name_ar, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ])

        const { data, error: fetchError } = productsResult
        if (fetchError) throw fetchError
        if (!active) return

        setProducts((data ?? []) as ProductRow[])

        if (!mappingsResult.error) {
          const mappingByExternalId = ((mappingsResult.data ?? []) as ProductMappingRow[]).reduce<Record<string, ProductMappingRow>>(
            (acc, mapping) => {
              acc[mapping.external_product_id] = mapping
              return acc
            },
            {}
          )
          setProductMappings(mappingByExternalId)
        }

        if (!customerTypesResult.error) {
          setCustomerTypeOptions((customerTypesResult.data ?? []) as CustomerTypeOption[])
        }

        if (!specialitiesResult.error) {
          const seen = new Set<string>()
          const options = ((specialitiesResult.data ?? []) as SpecialityOption[]).filter((option) => {
            if (seen.has(option.speciality_name_ar)) return false
            seen.add(option.speciality_name_ar)
            return true
          })
          setSpecialityOptions(options)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل المنتجات.')
          setProducts([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadProducts()
    return () => {
      active = false
    }
  }, [])

  const enrichedProducts = useMemo<EnrichedProductRow[]>(
    () =>
      products.map((product) => ({
        ...product,
        mapping: product.external_product_id ? productMappings[product.external_product_id] : undefined,
      })),
    [productMappings, products]
  )

  const specialityFilterOptions = useMemo(() => {
    if (customerTypeFilter === ALL_FILTER) return specialityOptions
    return specialityOptions.filter((option) =>
      enrichedProducts.some((product) => {
        const mapping = product.mapping
        return mapping?.customer_types?.includes(customerTypeFilter) && mapping.customer_specialities?.includes(option.speciality_name_ar)
      })
    )
  }, [customerTypeFilter, enrichedProducts, specialityOptions])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return enrichedProducts.filter((product) => {
      const mapping = product.mapping
      const matchesCustomerType = customerTypeFilter === ALL_FILTER || mapping?.customer_types?.includes(customerTypeFilter)
      const matchesSpeciality = specialityFilter === ALL_FILTER || mapping?.customer_specialities?.includes(specialityFilter)
      const matchesQuery =
        !query ||
        [
          product.product_name,
          product.internal_reference,
          product.external_product_id,
          product.unit_of_measure,
          mapping?.brand_name_ar,
          mapping?.category_name_ar,
          mapping?.subcategory_name_ar,
        ].some((value) => String(value ?? '').toLowerCase().includes(query))

      return matchesCustomerType && matchesSpeciality && matchesQuery
    })
  }, [customerTypeFilter, enrichedProducts, search, specialityFilter])

  const lowStockCount = filteredProducts.filter((product) => numberValue(product.quantity_on_hand) <= 0).length
  const stockValue = filteredProducts.reduce(
    (sum, product) => sum + numberValue(product.quantity_on_hand) * numberValue(product.average_cost),
    0
  )
  const mappedVisibleCount = filteredProducts.filter((product) => product.mapping).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-app-text-secondary">كتالوج المخزون</p>
          <h1 className="mt-1 text-2xl font-bold text-app-text">المنتجات</h1>
          <p className="text-sm text-app-text-secondary">مخزون متزامن مع توصيات ملاءمة العملاء.</p>
        </div>
        <div className="w-full max-w-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالمنتج أو الكود أو التصنيف..."
            className="input pl-4"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold tracking-wide text-app-text-secondary">نوع العميل</span>
          <select
            value={customerTypeFilter}
            onChange={(event) => {
              setCustomerTypeFilter(event.target.value)
              setSpecialityFilter(ALL_FILTER)
            }}
            className="input"
          >
            <option value={ALL_FILTER}>كل أنواع العملاء</option>
            {customerTypeOptions.map((option) => (
              <option key={option.customer_type_name_ar} value={option.customer_type_name_ar}>
                {option.customer_type_name_ar}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold tracking-wide text-app-text-secondary">التخصص</span>
          <select
            value={specialityFilter}
            onChange={(event) => setSpecialityFilter(event.target.value)}
            className="input"
          >
            <option value={ALL_FILTER}>كل التخصصات</option>
            {specialityFilterOptions.map((option) => (
              <option key={option.speciality_name_ar} value={option.speciality_name_ar}>
                {option.speciality_name_ar}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-app-border bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-app-text-secondary">الأكواد الظاهرة</p>
          <p className="mt-2 text-2xl font-bold text-app-text">{filteredProducts.length.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl border border-app-border bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-app-text-secondary">الأكواد المصنفة</p>
          <p className="mt-2 text-2xl font-bold text-app-text">{mappedVisibleCount.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl border border-app-border bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-app-text-secondary">مخزون منخفض/صفر</p>
          <p className="mt-2 text-2xl font-bold text-app-text">{lowStockCount.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl border border-app-border bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-app-text-secondary">قيمة المخزون</p>
          <p className="mt-2 text-2xl font-bold text-app-text">{formatCurrency(stockValue)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-app-border bg-white">
        {error ? (
          <div className="p-5 text-sm text-error-500">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-app-text-secondary">جار تحميل المنتجات...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-app-text-secondary">لا توجد منتجات مطابقة.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-app-border bg-brand-25 text-right text-xs tracking-wide text-app-text-secondary">
                <tr>
                  <th className="px-4 py-3">المنتج</th>
                  <th className="px-4 py-3">الملاءمة</th>
                  <th className="px-4 py-3">السعر</th>
                  <th className="px-4 py-3">التكلفة</th>
                  <th className="px-4 py-3">المتاح</th>
                  <th className="px-4 py-3">الوارد</th>
                  <th className="px-4 py-3">الصادر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="text-app-text-secondary">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-app-text" dir="auto">
                        {product.product_name ?? 'منتج'}
                      </p>
                      <p className="mt-1 text-xs" dir="ltr">
                        {product.internal_reference ?? product.external_product_id ?? '--'} - {product.unit_of_measure ?? 'وحدة'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {product.mapping ? (
                        <div className="max-w-xs space-y-2">
                          <p className="text-xs font-semibold text-app-text" dir="auto">
                            {[product.mapping.category_name_ar, product.mapping.subcategory_name_ar].filter(Boolean).join(' / ')}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {product.mapping.customer_types?.slice(0, 3).map((type) => (
                              <span
                                key={type}
                                className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600"
                                dir="auto"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-app-text-secondary">غير مصنف</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold text-app-text">{formatCurrency(product.sales_price)}</td>
                    <td className="px-4 py-4">{formatCurrency(product.average_cost)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        numberValue(product.quantity_on_hand) <= 0
                          ? 'bg-error-50 text-error-500'
                          : 'bg-success-50 text-success-600'
                      }`}>
                        {numberValue(product.quantity_on_hand).toLocaleString('ar-EG')}
                      </span>
                    </td>
                    <td className="px-4 py-4">{numberValue(product.incoming_quantity).toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-4">{numberValue(product.outgoing_quantity).toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
