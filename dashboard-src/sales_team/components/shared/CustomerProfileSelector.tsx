import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  filterProductMappings,
  type SalesBrandMapping,
  type SalesCustomerSpecialityMapping,
  type SalesCustomerTypeMapping,
  type SalesProductCategoryMapping,
  type SalesProductCustomerMapping,
  type SelectedCustomerProfile,
} from '../../lib/customerProfileSelection'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Props = {
  value: SelectedCustomerProfile | SelectedCustomerProfile[] | null
  onChange: (profile: SelectedCustomerProfile | null, profiles: SelectedCustomerProfile[]) => void
}

type CategorySlot = {
  category_key: string
  category_name_ar: string
  subcategory_key: string
  subcategory_name_ar: string
  sort_order: number | null
}

type ProductStockRow = {
  external_product_id: string | null
  product_name: string | null
  quantity_on_hand: number | string | null
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getSpecialityOptions(specialities: SalesCustomerSpecialityMapping[], customerTypeKey: string) {
  if (!customerTypeKey) return []
  return [...specialities]
    .filter((s) => s.customer_type_key === customerTypeKey)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.speciality_name_ar.localeCompare(b.speciality_name_ar, 'ar'))
}

function findSpecialityName(
  specialities: SalesCustomerSpecialityMapping[],
  customerTypeKey: string,
  specialityKey: string
) {
  return (
    specialities.find(
      (s) => s.customer_type_key === customerTypeKey && s.speciality_key === specialityKey
    )?.speciality_name_ar ?? ''
  )
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

// ─────────────────────────────────────────────
// SelectCard — base card button (reused)
// ─────────────────────────────────────────────

function SelectCard({
  active,
  onClick,
  title,
  subtitle,
  disabled,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition-all duration-150',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-600'
          : 'border-app-border bg-brand-25 text-app-text-secondary hover:bg-brand-25/70 hover:text-app-text',
        disabled ? 'cursor-not-allowed opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        {subtitle ? <div className="truncate text-xs opacity-60">{subtitle}</div> : null}
      </div>
      {active ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-brand-400">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </button>
  )
}

// ─────────────────────────────────────────────
// SelectCardPicker — dropdown trigger + list
// ─────────────────────────────────────────────

type PickerOption = {
  key: string
  label: string
  sublabel?: string
}

function SelectCardPicker({
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  options: PickerOption[]
  onChange: (key: string) => void
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.key === value)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen((prev) => !prev) }}
        disabled={disabled}
        className={[
          'flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border px-3 text-right text-sm font-semibold transition-all duration-150',
          disabled
            ? 'cursor-not-allowed border-app-border bg-brand-25 opacity-40'
              : open
                ? 'border-brand-500 bg-brand-50 text-brand-600 ring-2 ring-brand-500/30'
                : selected
                  ? 'border-brand-500/40 bg-brand-50 text-brand-600 hover:border-brand-500/60'
                  : 'border-app-border bg-white text-app-text-secondary hover:border-gray-300 hover:text-app-text',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? selected.label : <span className="opacity-50">{placeholder}</span>}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 flex max-h-56 min-w-full max-w-[calc(100vw-3rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-app-border bg-white p-2 shadow-2xl" style={{ direction: 'rtl' }}>
          {options.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-app-text-secondary">لا توجد خيارات</p>
          ) : (
            options.map((opt) => (
              <SelectCard key={opt.key} active={opt.key === value} onClick={() => { onChange(opt.key); setOpen(false) }} title={opt.label} subtitle={opt.sublabel} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// CustomerTypeCards — full cards grid
// ─────────────────────────────────────────────

function CustomerTypeCards({
  types,
  value,
  onChange,
  loading,
}: {
  types: SalesCustomerTypeMapping[]
  value: string
  onChange: (key: string, name: string) => void
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl border border-app-border bg-brand-25 opacity-50" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {types.map((type) => (
        <SelectCard
          key={type.customer_type_key}
          active={value === type.customer_type_key}
          onClick={() => onChange(type.customer_type_key, type.customer_type_name_ar)}
          title={type.customer_type_name_ar}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// Checkbox — styled checkbox for multi-select
// ─────────────────────────────────────────────

function CheckItem({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <label
      className={[
        'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-right transition-all duration-150',
        checked
          ? 'border-brand-500 bg-brand-50 text-brand-600'
          : 'border-app-border bg-brand-25 text-app-text-secondary hover:bg-brand-25/70 hover:text-app-text',
        disabled ? 'cursor-not-allowed opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-400 bg-white text-brand-500 focus:ring-brand-500/30"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
    </label>
  )
}

// ─────────────────────────────────────────────
// Main: CustomerProfileSelector
// ─────────────────────────────────────────────

export default function CustomerProfileSelector({ onChange }: Props) {
  const [customerTypes, setCustomerTypes] = useState<SalesCustomerTypeMapping[]>([])
  const [specialities, setSpecialities] = useState<SalesCustomerSpecialityMapping[]>([])
  const [brands, setBrands] = useState<SalesBrandMapping[]>([])
  const [categories, setCategories] = useState<SalesProductCategoryMapping[]>([])
  const [products, setProducts] = useState<SalesProductCustomerMapping[]>([])
  const [productStockByExternalId, setProductStockByExternalId] = useState<Record<string, ProductStockRow>>({})

  const [customerTypeKey, setCustomerTypeKey] = useState('')
  const [customerTypeName, setCustomerTypeName] = useState('')
  const [specialityKey, setSpecialityKey] = useState('')

  const [selectedCategorySlots, setSelectedCategorySlots] = useState<CategorySlot[]>([])
  const [selectedBrandKeys, setSelectedBrandKeys] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [typesRes, specRes, brandsRes, catsRes, prodsRes, stockRes] = await Promise.all([
          supabase.from('sales_customer_type_mappings').select('customer_type_key, customer_type_name_ar, sort_order').eq('is_active', true).order('sort_order'),
          supabase.from('sales_customer_speciality_mappings').select('customer_type_key, speciality_key, speciality_name_ar, sort_order').eq('is_active', true).order('sort_order'),
          supabase.from('sales_brand_mappings').select('brand_key, brand_name_ar, sort_order').eq('is_active', true).order('sort_order'),
          supabase.from('sales_product_category_mappings').select('category_key, category_name_ar, subcategory_key, subcategory_name_ar, sort_order').eq('is_active', true).order('sort_order'),
          supabase.from('sales_product_customer_mappings').select('external_product_id, product_name, brand_key, brand_name_ar, category_key, category_name_ar, subcategory_key, subcategory_name_ar, customer_specialities, customer_types').eq('is_active', true).order('product_name'),
          supabase.from('products').select('external_product_id, product_name, quantity_on_hand').not('external_product_id', 'is', null),
        ])
        const err = typesRes.error || specRes.error || brandsRes.error || catsRes.error || prodsRes.error || stockRes.error
        if (err) throw err
        if (!active) return
        setCustomerTypes((typesRes.data ?? []) as SalesCustomerTypeMapping[])
        setSpecialities((specRes.data ?? []) as SalesCustomerSpecialityMapping[])
        setBrands((brandsRes.data ?? []) as SalesBrandMapping[])
        setCategories((catsRes.data ?? []) as SalesProductCategoryMapping[])
        setProducts((prodsRes.data ?? []) as SalesProductCustomerMapping[])
        setProductStockByExternalId(
          ((stockRes.data ?? []) as ProductStockRow[]).reduce<Record<string, ProductStockRow>>((acc, row) => {
            if (row.external_product_id) acc[row.external_product_id] = row
            return acc
          }, {})
        )
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'تعذر تحميل الاختيارات.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const specialityOptions = useMemo(
    () => getSpecialityOptions(specialities, customerTypeKey),
    [customerTypeKey, specialities]
  )

  const specialityName = useMemo(
    () => (specialityKey ? findSpecialityName(specialities, customerTypeKey, specialityKey) : ''),
    [specialities, customerTypeKey, specialityKey]
  )

  const productBase = useMemo(
    () => filterProductMappings(products, {
      customerTypeKey,
      customerTypeName,
      specialityKey,
      specialityName,
      brandKey: '',
      categoryKey: '',
      subcategoryKey: '',
    }),
    [products, customerTypeKey, customerTypeName, specialityKey, specialityName]
  )

  const availableCategories = useMemo(() => {
    const mapped = uniqueBy(
      productBase.map((p) => ({
        category_key: p.category_key,
        category_name_ar: p.category_name_ar,
        subcategory_key: p.subcategory_key,
        subcategory_name_ar: p.subcategory_name_ar,
        sort_order: categories.find((c) => c.category_key === p.category_key && c.subcategory_key === p.subcategory_key)?.sort_order ?? null,
      })),
      (c) => `${c.category_key}:${c.subcategory_key}`
    )
    return (mapped.length ? mapped : categories).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || `${a.category_name_ar} ${a.subcategory_name_ar}`.localeCompare(`${b.category_name_ar} ${b.subcategory_name_ar}`, 'ar')
    )
  }, [productBase, categories])

  const selectedCategoryKeys = useMemo(
    () => new Set(selectedCategorySlots.map((c) => `${c.category_key}:${c.subcategory_key}`)),
    [selectedCategorySlots]
  )

  const availableBrands = useMemo(() => {
    const catFiltered = filterProductMappings(productBase, {
      customerTypeKey: '',
      specialityKey: '',
      brandKey: '',
      categoryKey: '',
      subcategoryKey: '',
    })

    const relevantProducts = selectedCategorySlots.length > 0
      ? catFiltered.filter((p) =>
          selectedCategorySlots.some((c) => c.category_key === p.category_key && c.subcategory_key === p.subcategory_key)
        )
      : catFiltered

    return uniqueBy(
      relevantProducts.map((p) => ({
        brand_key: p.brand_key,
        brand_name_ar: p.brand_name_ar,
        sort_order: brands.find((b) => b.brand_key === p.brand_key)?.sort_order ?? null,
      })),
      (b) => b.brand_key
    ).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.brand_name_ar.localeCompare(b.brand_name_ar, 'ar'))
  }, [productBase, selectedCategorySlots, brands])

  const profiles = useMemo<SelectedCustomerProfile[]>(() => {
    if (!customerTypeKey || !specialityKey || selectedCategorySlots.length === 0 || selectedBrandKeys.size === 0) return []

    const selectedType = customerTypes.find((t) => t.customer_type_key === customerTypeKey)
    const selectedSpec = specialities.find((s) => s.customer_type_key === customerTypeKey && s.speciality_key === specialityKey)
    if (!selectedType || !selectedSpec) return []

    const result: SelectedCustomerProfile[] = []
    for (const cat of selectedCategorySlots) {
      for (const brandKey of selectedBrandKeys) {
        const brand = brands.find((b) => b.brand_key === brandKey)
        if (!brand) continue
        const matchedProducts = filterProductMappings(products, {
          customerTypeKey,
          customerTypeName,
          specialityKey,
          specialityName,
          brandKey,
          categoryKey: cat.category_key,
          subcategoryKey: cat.subcategory_key,
        })
        const stockRows = matchedProducts
          .map((product) => productStockByExternalId[product.external_product_id])
          .filter((row): row is ProductStockRow => Boolean(row))
        const totalQuantityOnHand = stockRows.reduce((sum, row) => sum + numberValue(row.quantity_on_hand), 0)
        const lowStockProductNames = stockRows
          .filter((row) => numberValue(row.quantity_on_hand) <= 0)
          .slice(0, 3)
          .map((row) => row.product_name ?? row.external_product_id ?? '')
          .filter(Boolean)
        result.push({
          customer_type_key: selectedType.customer_type_key,
          customer_type_name_ar: selectedType.customer_type_name_ar,
          speciality_key: selectedSpec.speciality_key,
          speciality_name_ar: selectedSpec.speciality_name_ar,
          brand_key: brand.brand_key,
          brand_name_ar: brand.brand_name_ar,
          category_key: cat.category_key,
          category_name_ar: cat.category_name_ar,
          subcategory_key: cat.subcategory_key,
          subcategory_name_ar: cat.subcategory_name_ar,
          product_external_id: '',
          product_name: '',
          matched_product_count: matchedProducts.length,
          in_stock_product_count: stockRows.filter((row) => numberValue(row.quantity_on_hand) > 0).length,
          total_quantity_on_hand: totalQuantityOnHand,
          low_stock_product_names: lowStockProductNames,
        })
      }
    }
    return result
  }, [customerTypeKey, customerTypeName, specialityKey, specialityName, selectedCategorySlots, selectedBrandKeys, customerTypes, specialities, brands, products, productStockByExternalId])

  useEffect(() => {
    onChange(profiles[0] ?? null, profiles)
  }, [profiles])

  const handleCustomerTypeChange = (typeKey: string, typeName: string) => {
    setCustomerTypeKey(typeKey)
    setCustomerTypeName(typeName)
    setSpecialityKey('')
    setSelectedCategorySlots([])
    setSelectedBrandKeys(new Set())
  }

  const handleSpecialityChange = (key: string) => {
    setSpecialityKey(key)
    setSelectedCategorySlots([])
    setSelectedBrandKeys(new Set())
  }

  const toggleCategory = (slot: CategorySlot) => {
    const combined = `${slot.category_key}:${slot.subcategory_key}`
    setSelectedCategorySlots((prev) => {
      const next = prev.some((c) => `${c.category_key}:${c.subcategory_key}` === combined)
        ? prev.filter((c) => `${c.category_key}:${c.subcategory_key}` !== combined)
        : [...prev, slot]
      return next
    })
    setSelectedBrandKeys(new Set())
  }

  const toggleBrand = (brandKey: string) => {
    setSelectedBrandKeys((prev) => {
      const next = new Set(prev)
      if (next.has(brandKey)) next.delete(brandKey)
      else next.add(brandKey)
      return next
    })
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">تصنيف العميل</p>
          <h3 className="mt-1 text-lg font-bold text-app-text">جدول المنتجات التي يتعامل معها</h3>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-600">
          {profiles.length.toLocaleString('ar-EG')} محدّث
        </span>
      </div>

      {/* Error */}
      {error ? (
        <div className="mb-4 rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-600">{error}</div>
      ) : null}

      {/* 1. Customer Type */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-app-text-secondary">فئة العميل</label>
        <CustomerTypeCards
          types={customerTypes}
          value={customerTypeKey}
          onChange={handleCustomerTypeChange}
          loading={loading}
        />
      </div>

      {/* 2. Speciality */}
      {customerTypeKey ? (
        <div className="mb-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-app-text-secondary">التخصص</label>
          <SelectCardPicker
            value={specialityKey}
            options={specialityOptions.map((s) => ({ key: s.speciality_key, label: s.speciality_name_ar }))}
            placeholder="اختر التخصص"
            onChange={handleSpecialityChange}
          />
        </div>
      ) : null}

      {/* 3. Categories — multi-select checkboxes */}
      {specialityKey ? (
        <div className="mb-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-app-text-secondary">
            التصنيفات <span className="text-brand-600">(اختر واحد أو أكثر)</span>
          </label>
          {availableCategories.length === 0 ? (
            <p className="rounded-xl border border-app-border bg-brand-25 p-3 text-center text-xs text-app-text-secondary">لا توجد تصنيفات متاحة</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {availableCategories.map((cat) => {
                const combined = `${cat.category_key}:${cat.subcategory_key}`
                return (
                  <CheckItem
                    key={combined}
                    checked={selectedCategoryKeys.has(combined)}
                    onChange={() => toggleCategory(cat)}
                    label={cat.subcategory_name_ar ? `${cat.category_name_ar} / ${cat.subcategory_name_ar}` : cat.category_name_ar}
                  />
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* 4. Brands — multi-select checkboxes, filtered by selected categories */}
      {selectedCategorySlots.length > 0 ? (
        <div className="mb-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-app-text-secondary">
            البراندات <span className="text-brand-600">(اختر واحد أو أكثر)</span>
          </label>
          {availableBrands.length === 0 ? (
            <p className="rounded-xl border border-app-border bg-brand-25 p-3 text-center text-xs text-app-text-secondary">لا توجد براندات متاحة للتصنيفات المحددة</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableBrands.map((brand) => (
                <CheckItem
                  key={brand.brand_key}
                  checked={selectedBrandKeys.has(brand.brand_key)}
                  onChange={() => toggleBrand(brand.brand_key)}
                  label={brand.brand_name_ar}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Summary */}
      {profiles.length > 0 ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3">
          <p className="text-xs font-bold text-brand-600">الاختيارات المحددة:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profiles.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-600">
                {p.category_name_ar} / {p.brand_name_ar}
                <span className={numberValue(p.total_quantity_on_hand) > 0 ? 'text-success-600' : 'text-warning-600'}>
                  ({numberValue(p.total_quantity_on_hand).toLocaleString('ar-EG')})
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
