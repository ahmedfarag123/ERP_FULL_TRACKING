import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BuildingStorefrontIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  RectangleGroupIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { PhoneIcon, CheckIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../lib/supabase";
import { getCached, setCache } from "../../lib/offlineCache";
import type { ActivityOption } from "../../lib/customer-activity";
import {
  filterProductMappings,
  type SalesBrandMapping,
  type SalesCustomerSpecialityMapping,
  type SalesCustomerTypeMapping,
  type SalesProductCategoryMapping,
  type SalesProductCustomerMapping,
  type SelectedCustomerProfile,
} from "../../lib/customerProfileSelection";

type ActivitySelectCardProps = {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  activeClass?: string;
  disabled?: boolean;
};

const defaultActiveClass =
  "border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-400/50 dark:bg-brand-500/15 dark:text-brand-200";

function uniqueBy<T>(rows: T[], getKey: (row: T) => string) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = getKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ActivitySelectCard({
  active,
  onClick,
  title,
  subtitle,
  icon,
  activeClass = defaultActiveClass,
  disabled = false,
}: ActivitySelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-right transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? activeClass
          : "border-gray-200 bg-white text-gray-600 hover:border-brand-200 hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-25 text-gray-500 dark:bg-white/5 dark:text-gray-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{title}</div>
        {subtitle ? <div className="mt-0.5 text-xs opacity-70">{subtitle}</div> : null}
      </div>
      {active ? <CheckCircleIcon className="h-5 w-5 shrink-0" aria-hidden /> : null}
    </button>
  );
}

const CUSTOM_SELECT_VALUE = "__custom";

export function CardOptionGroup({
  label,
  options,
  value,
  onChange,
  placeholder,
  activeClass,
}: {
  label: string;
  options: ActivityOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  activeClass?: string;
}) {
  const isCustom = Boolean(value) && !options.some((o) => o.value === value);
  const selectValue = isCustom ? CUSTOM_SELECT_VALUE : value;

  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      {options.length > 0 ? (
        <div className="space-y-3">
          <select
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === CUSTOM_SELECT_VALUE ? "" : v);
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="">— اختر —</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value={CUSTOM_SELECT_VALUE}>أخرى / إدخال حر</option>
          </select>

          {selectValue === CUSTOM_SELECT_VALUE && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="اكتب الخيار هنا..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {placeholder ?? "لا توجد اختيارات متاحة حاليا."}
        </div>
      )}
    </section>
  );
}

export function CardMultiOptionGroup({
  label,
  options,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  options: ActivityOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const customTexts = values.filter((v) => !options.some((o) => o.value === v));
  const [customInput, setCustomInput] = useState("");

  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setCustomInput("");
    }
  };

  const removeCustom = (val: string) => {
    onChange(values.filter((v) => v !== val));
  };

  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      {options.length > 0 ? (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            {options.map((option) => {
              const active = values.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition-all duration-150 ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400/50 dark:bg-blue-500/15 dark:text-blue-200"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(option.value)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{option.label}</span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="أضف خياراً مخصصاً..."
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customInput.trim()}
              className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              إضافة
            </button>
          </div>

          {customTexts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customTexts.map((ct) => (
                <span
                  key={ct}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                >
                  {ct}
                  <button
                    type="button"
                    onClick={() => removeCustom(ct)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-500/30"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {placeholder ?? "لا توجد اختيارات متاحة حاليا."}
        </div>
      )}
    </section>
  );
}

const PAGE_SIZE = 20;

interface CustomerSearchListProps {
  selectedId: string;
  onSelect: (customer: { id: string; customer_name: string; phone_number: string | null }) => void;
}

type CustomerRow = { id: string; customer_name: string; phone_number: string | null };

const ALL_CUSTOMERS_CACHE_KEY = "all-customers-list";

export function CustomerSearchList({ selectedId, onSelect }: CustomerSearchListProps) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [allCachedCustomers, setAllCachedCustomers] = useState<CustomerRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const debouncedQueryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  // New customer form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerPhoneError, setNewCustomerPhoneError] = useState<string | null>(null);
  const [isSavingNewCustomer, setIsSavingNewCustomer] = useState(false);

  // Load cached customers on mount for offline fallback
  useEffect(() => {
    void getCached<CustomerRow[]>(ALL_CUSTOMERS_CACHE_KEY).then((cached) => {
      if (cached) setAllCachedCustomers(cached);
    });
  }, []);

  const filterOfflineCustomers = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return allCachedCustomers.slice(0, PAGE_SIZE);
      const term = searchQuery.toLowerCase();
      return allCachedCustomers
        .filter(
          (c) =>
            c.customer_name?.toLowerCase().includes(term) ||
            c.phone_number?.toLowerCase().includes(term),
        )
        .slice(0, PAGE_SIZE);
    },
    [allCachedCustomers],
  );

  const fetchCustomers = useCallback(async (searchQuery: string, pageNum: number, signal?: AbortSignal) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let queryBuilder = supabase
      .from("customers")
      .select("id, customer_name, phone_number")
      .order("customer_name", { ascending: true })
      .range(from, to);

    if (searchQuery.trim()) {
      queryBuilder = queryBuilder.or(
        `customer_name.ilike.%${searchQuery.trim()}%,phone_number.ilike.%${searchQuery.trim()}%`
      );
    }

    const { data, error: fetchError } = await queryBuilder;
    if (signal?.aborted) return;

    if (fetchError) throw fetchError;
    return (data ?? []) as CustomerRow[];
  }, []);

  const doSearch = useCallback(
    (searchQuery: string, resetPage = true) => {
      if (debouncedQueryRef.current) clearTimeout(debouncedQueryRef.current);
      abortRef.current?.abort();

      const newPage = resetPage ? 0 : page;
      if (resetPage) {
        setCustomers([]);
        setPage(0);
      }

      debouncedQueryRef.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);

        // If offline, serve from cache
        if (!navigator.onLine) {
          const results = filterOfflineCustomers(searchQuery);
          setCustomers(results);
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const results = await fetchCustomers(searchQuery, newPage, controller.signal);
          if (results) {
            setCustomers((prev) => (resetPage ? results : [...prev, ...results]));
            setHasMore(results.length === PAGE_SIZE);

            // Cache first page of all customers for offline use
            if (resetPage && !searchQuery.trim() && newPage === 0) {
              void setCache(ALL_CUSTOMERS_CACHE_KEY, results, 24 * 60 * 60 * 1000); // 24h TTL
            }
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            // Fall back to cache on error
            const cached = filterOfflineCustomers(searchQuery);
            if (cached.length > 0) {
              setCustomers(cached);
              setHasMore(false);
            } else {
              setError(err instanceof Error ? err.message : "فشل تحميل العملاء.");
            }
          }
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
        }
      }, 300);
    },
    [fetchCustomers, page, filterOfflineCustomers],
  );

  useEffect(() => {
    doSearch(query);
    return () => {
      if (debouncedQueryRef.current) clearTimeout(debouncedQueryRef.current);
      abortRef.current?.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQueryChange = (value: string) => {
    setQuery(value);
    doSearch(value, true);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch(query, false);
  };

  const validatePhone = (phone: string): boolean => {
    // Phone should be 11 digits starting with 01 (Egyptian mobile)
    const phoneRegex = /^01[0-2,5]{1}[0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      setNewCustomerPhoneError("يجب أن يبدأ الرقم بـ 01 ويحتوي على 11 رقم");
      return false;
    }
    setNewCustomerPhoneError(null);
    return true;
  };

  const handleAddNewCustomer = async () => {
    if (!query.trim()) return;
    if (!validatePhone(newCustomerPhone)) return;

    setIsSavingNewCustomer(true);
    setError(null);

    try {
      const fullPhoneNumber = `+2${newCustomerPhone}`;
      
      const { data, error: insertError } = await supabase
        .from("customers")
        .insert({
          customer_name: query.trim(),
          phone_number: fullPhoneNumber,
          status: "active",
          priority: "medium",
          product_interests: [],
          source: "call_activity",
          raw_payload: { customer_name: query.trim(), phone_number: fullPhoneNumber },
        })
        .select("id, customer_name, phone_number")
        .single();

      if (insertError) throw insertError;

      if (data?.id) {
        await supabase.rpc("create_odoo_pending_action", {
          p_entity_type: "customer",
          p_action_type: "create",
          p_odoo_model: "res.partner",
          p_odoo_method: "create",
          p_entity_id: data.id,
          p_payload_json: {
            name: query.trim(),
            phone: fullPhoneNumber,
            is_company: false,
            customer_rank: 1,
          },
          p_validation_result: null,
        });
      }

      if (data) {
        // Add to local state
        setCustomers((prev) => [data, ...prev]);
        // Select the new customer
        onSelect(data);
        // Reset form
        setShowNewCustomerForm(false);
        setNewCustomerPhone("");
        setQuery("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إضافة العميل الجديد.");
    } finally {
      setIsSavingNewCustomer(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="بحث بالاسم أو رقم الهاتف..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />
      </div>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
      )}

      <div className="max-h-60 space-y-2 overflow-y-auto">
        {customers.map((customer) => (
          <ActivitySelectCard
            key={customer.id}
            active={selectedId === customer.id}
            onClick={() => onSelect(customer)}
            title={customer.customer_name}
            subtitle={customer.phone_number ?? undefined}
            icon={<PhoneIcon className="h-5 w-5" aria-hidden />}
          />
        ))}

        {isLoading && (
          <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            جار تحميل العملاء...
          </div>
        )}

        {!isLoading && customers.length === 0 && query.trim() && !showNewCustomerForm && (
          <button
            type="button"
            onClick={() => setShowNewCustomerForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-sm font-medium text-blue-600 transition hover:bg-blue-100 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">+</span>
            إضافة "{query.trim()}" كعميل جديد
          </button>
        )}

        {!isLoading && customers.length === 0 && showNewCustomerForm && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/30 dark:bg-blue-500/5">
            <p className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
              إضافة عميل جديد: "{query.trim()}"
            </p>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              الرجاء إدخال رقم الموبايل للمتابعة
            </p>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-gray-200 bg-brand-25 px-3 py-2.5 dark:border-gray-700 dark:bg-white/[0.02]">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">+2</span>
              </div>
              <input
                type="tel"
                value={newCustomerPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                  setNewCustomerPhone(value);
                  if (value.length === 11) validatePhone(value);
                  else setNewCustomerPhoneError(null);
                }}
                placeholder="01xxxxxxxxx"
                className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                maxLength={11}
              />
            </div>
            
            {newCustomerPhoneError && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{newCustomerPhoneError}</p>
            )}
            
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleAddNewCustomer}
                disabled={isSavingNewCustomer || !newCustomerPhone || newCustomerPhone.length !== 11}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isSavingNewCustomer ? "جار الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewCustomerForm(false);
                  setNewCustomerPhone("");
                  setNewCustomerPhoneError(null);
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-brand-25 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {!isLoading && customers.length === 0 && !query.trim() && (
          <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            ابحث عن عميل أو أضف عميل جديد
          </div>
        )}

        {hasMore && !isLoading && (
          <button
            type="button"
            onClick={handleLoadMore}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-950 dark:text-blue-400 dark:hover:bg-blue-950/50"
          >
            تحميل المزيد
          </button>
        )}
      </div>
    </div>
  );
}

type CategorySlot = {
  category_key: string;
  category_name_ar: string;
  subcategory_key: string;
  subcategory_name_ar: string;
  sort_order: number | null;
};

type ProductStockRow = {
  external_product_id: string | null;
  product_name: string | null;
  quantity_on_hand: number | string | null;
};

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function CheckItem({
  checked,
  onChange,
  label,
  subtitle,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  subtitle?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition-all duration-150 ${
        checked
          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400/50 dark:bg-blue-500/15 dark:text-blue-200"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-gray-700"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {subtitle ? <span className="block truncate text-xs opacity-60">{subtitle}</span> : null}
      </div>
    </label>
  );
}

const CLASSIFICATION_CACHE_KEY = "customer-classification-data";
const CLASSIFICATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

type ClassificationData = {
  customerTypes: SalesCustomerTypeMapping[];
  specialities: SalesCustomerSpecialityMapping[];
  brands: SalesBrandMapping[];
  categories: SalesProductCategoryMapping[];
  products: SalesProductCustomerMapping[];
  productStockByExternalId: Record<string, ProductStockRow>;
};

async function fetchClassificationData(): Promise<ClassificationData | null> {
  const [typesRes, specRes, brandsRes, catsRes, prodsRes, stockRes] = await Promise.all([
    supabase.from("sales_customer_type_mappings").select("customer_type_key, customer_type_name_ar, sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("sales_customer_speciality_mappings").select("customer_type_key, speciality_key, speciality_name_ar, sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("sales_brand_mappings").select("brand_key, brand_name_ar, sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("sales_product_category_mappings").select("category_key, category_name_ar, subcategory_key, subcategory_name_ar, sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("sales_product_customer_mappings").select("external_product_id, product_name, brand_key, brand_name_ar, category_key, category_name_ar, subcategory_key, subcategory_name_ar, customer_specialities, customer_types").eq("is_active", true).order("product_name"),
    supabase.from("products").select("external_product_id, product_name, quantity_on_hand").not("external_product_id", "is", null),
  ]);
  const err = typesRes.error || specRes.error || brandsRes.error || catsRes.error || prodsRes.error || stockRes.error;
  if (err) throw err;

  return {
    customerTypes: (typesRes.data ?? []) as SalesCustomerTypeMapping[],
    specialities: (specRes.data ?? []) as SalesCustomerSpecialityMapping[],
    brands: (brandsRes.data ?? []) as SalesBrandMapping[],
    categories: (catsRes.data ?? []) as SalesProductCategoryMapping[],
    products: (prodsRes.data ?? []) as SalesProductCustomerMapping[],
    productStockByExternalId: ((stockRes.data ?? []) as ProductStockRow[]).reduce<Record<string, ProductStockRow>>((acc, row) => {
      if (row.external_product_id) acc[row.external_product_id] = row;
      return acc;
    }, {}),
  };
}

async function refreshClassification(): Promise<ClassificationData | null> {
  try {
    const data = await fetchClassificationData();
    if (data) await setCache(CLASSIFICATION_CACHE_KEY, data, CLASSIFICATION_CACHE_TTL);
    return data;
  } catch {
    return null;
  }
}

export function CustomerProfileCardSelector({
  value,
  onChange,
}: {
  value: SelectedCustomerProfile | null;
  onChange: (profile: SelectedCustomerProfile | null) => void;
}) {
  const [customerTypes, setCustomerTypes] = useState<SalesCustomerTypeMapping[]>([]);
  const [specialities, setSpecialities] = useState<SalesCustomerSpecialityMapping[]>([]);
  const [brands, setBrands] = useState<SalesBrandMapping[]>([]);
  const [categories, setCategories] = useState<SalesProductCategoryMapping[]>([]);
  const [products, setProducts] = useState<SalesProductCustomerMapping[]>([]);
  const [productStockByExternalId, setProductStockByExternalId] = useState<Record<string, ProductStockRow>>({});

  const [customerTypeKey, setCustomerTypeKey] = useState("");
  const [customerTypeName, setCustomerTypeName] = useState("");
  const [specialityKey, setSpecialityKey] = useState("");
  const [selectedCategorySlots, setSelectedCategorySlots] = useState<CategorySlot[]>([]);
  const [selectedBrandKeys, setSelectedBrandKeys] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyClassificationData = (data: ClassificationData) => {
    setCustomerTypes(data.customerTypes);
    setSpecialities(data.specialities);
    setBrands(data.brands);
    setCategories(data.categories);
    setProducts(data.products);
    setProductStockByExternalId(data.productStockByExternalId);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try cache first (works offline or online)
        const cached = await getCached<ClassificationData>(CLASSIFICATION_CACHE_KEY);
        if (cached && !active) return;
        if (cached) {
          applyClassificationData(cached);
          setLoading(false);
          // Still try to refresh in background if online
          if (navigator.onLine) {
            void refreshClassification().then((fresh) => {
              if (fresh && active) applyClassificationData(fresh);
            });
          }
          return;
        }

        // No cache, fetch from network
        const fresh = await fetchClassificationData();
        if (!active) return;
        if (fresh) {
          applyClassificationData(fresh);
          void setCache(CLASSIFICATION_CACHE_KEY, fresh, CLASSIFICATION_CACHE_TTL);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "تعذر تحميل اختيارات تصنيف العميل.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  // Hydrate from external value if provided
  useEffect(() => {
    if (!value) return;
    setCustomerTypeKey(value.customer_type_key);
    setCustomerTypeName(value.customer_type_name_ar);
    setSpecialityKey(value.speciality_key);
  }, [value]);

  const specialityOptions = useMemo(() => {
    if (!customerTypeKey) return [];
    return [...specialities]
      .filter((s) => s.customer_type_key === customerTypeKey)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.speciality_name_ar.localeCompare(b.speciality_name_ar, "ar"));
  }, [customerTypeKey, specialities]);

  const productBase = useMemo(
    () => filterProductMappings(products, {
      customerTypeKey,
      customerTypeName,
      specialityKey,
      specialityName: specialities.find((s) => s.customer_type_key === customerTypeKey && s.speciality_key === specialityKey)?.speciality_name_ar ?? "",
      brandKey: "",
      categoryKey: "",
      subcategoryKey: "",
    }),
    [products, customerTypeKey, customerTypeName, specialityKey, specialities]
  );

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
    );
    return (mapped.length ? mapped : categories).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || `${a.category_name_ar} ${a.subcategory_name_ar}`.localeCompare(`${b.category_name_ar} ${b.subcategory_name_ar}`, "ar")
    );
  }, [productBase, categories]);

  const selectedCategoryKeys = useMemo(
    () => new Set(selectedCategorySlots.map((c) => `${c.category_key}:${c.subcategory_key}`)),
    [selectedCategorySlots]
  );

  const availableBrands = useMemo(() => {
    const relevantProducts = selectedCategorySlots.length > 0
      ? productBase.filter((p) => selectedCategorySlots.some((c) => c.category_key === p.category_key && c.subcategory_key === p.subcategory_key))
      : productBase;
    return uniqueBy(
      relevantProducts.map((p) => ({
        brand_key: p.brand_key,
        brand_name_ar: p.brand_name_ar,
        sort_order: brands.find((b) => b.brand_key === p.brand_key)?.sort_order ?? null,
      })),
      (b) => b.brand_key
    ).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.brand_name_ar.localeCompare(b.brand_name_ar, "ar"));
  }, [productBase, selectedCategorySlots, brands]);

  const profiles = useMemo<SelectedCustomerProfile[]>(() => {
    if (!customerTypeKey || !specialityKey || selectedCategorySlots.length === 0 || selectedBrandKeys.size === 0) return [];

    const selectedType = customerTypes.find((t) => t.customer_type_key === customerTypeKey);
    const selectedSpec = specialities.find((s) => s.customer_type_key === customerTypeKey && s.speciality_key === specialityKey);
    if (!selectedType || !selectedSpec) return [];

    const result: SelectedCustomerProfile[] = [];
    for (const cat of selectedCategorySlots) {
      for (const brandKey of selectedBrandKeys) {
        const brand = brands.find((b) => b.brand_key === brandKey);
        if (!brand) continue;
        const matchedProducts = filterProductMappings(products, {
          customerTypeKey,
          customerTypeName,
          specialityKey,
          specialityName: selectedSpec.speciality_name_ar,
          brandKey,
          categoryKey: cat.category_key,
          subcategoryKey: cat.subcategory_key,
        });
        const stockRows = matchedProducts
          .map((product) => productStockByExternalId[product.external_product_id])
          .filter((row): row is ProductStockRow => Boolean(row));
        const totalQuantityOnHand = stockRows.reduce((sum, row) => sum + numberValue(row.quantity_on_hand), 0);
        const lowStockProductNames = stockRows
          .filter((row) => numberValue(row.quantity_on_hand) <= 0)
          .slice(0, 3)
          .map((row) => row.product_name ?? row.external_product_id ?? "")
          .filter(Boolean);
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
          product_external_id: "",
          product_name: "",
          matched_product_count: matchedProducts.length,
          in_stock_product_count: stockRows.filter((row) => numberValue(row.quantity_on_hand) > 0).length,
          total_quantity_on_hand: totalQuantityOnHand,
          low_stock_product_names: lowStockProductNames,
        });
      }
    }
    return result;
  }, [customerTypeKey, customerTypeName, specialityKey, selectedCategorySlots, selectedBrandKeys, customerTypes, specialities, brands, products, productStockByExternalId]);

  // Emit profiles to parent
  useEffect(() => {
    onChange(profiles[0] ?? null);
  }, [profiles]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCustomerTypeChange = (typeKey: string, typeName: string) => {
    setCustomerTypeKey(typeKey);
    setCustomerTypeName(typeName);
    setSpecialityKey("");
    setSelectedCategorySlots([]);
    setSelectedBrandKeys(new Set());
  };

  const handleSpecialityChange = (key: string) => {
    setSpecialityKey(key);
    setSelectedCategorySlots([]);
    setSelectedBrandKeys(new Set());
  };

  const toggleCategory = (slot: CategorySlot) => {
    const combined = `${slot.category_key}:${slot.subcategory_key}`;
    setSelectedCategorySlots((prev) => {
      const next = prev.some((c) => `${c.category_key}:${c.subcategory_key}` === combined)
        ? prev.filter((c) => `${c.category_key}:${c.subcategory_key}` !== combined)
        : [...prev, slot];
      return next;
    });
    setSelectedBrandKeys(new Set());
  };

  const toggleBrand = (brandKey: string) => {
    setSelectedBrandKeys((prev) => {
      const next = new Set(prev);
      if (next.has(brandKey)) next.delete(brandKey);
      else next.add(brandKey);
      return next;
    });
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-brand-25/70 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
        جار تحميل اختيارات تصنيف العميل...
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/30 dark:bg-blue-500/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">تصنيف العميل</p>
          <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">جدول المنتجات التي يتعامل معها</h3>
        </div>
        {profiles.length > 0 && (
          <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            {profiles.length.toLocaleString("ar-EG")} محدّث
          </span>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {/* 1. Customer Type */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">١. فئة العميل</p>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {customerTypes.map((option) => (
            <ActivitySelectCard
              key={option.customer_type_key}
              active={customerTypeKey === option.customer_type_key}
              onClick={() => handleCustomerTypeChange(option.customer_type_key, option.customer_type_name_ar)}
              title={option.customer_type_name_ar}
              subtitle="يحدد التخصصات المتاحة"
              icon={<BuildingStorefrontIcon className="h-5 w-5" aria-hidden />}
            />
          ))}
        </div>
      </section>

      {/* 2. Speciality */}
      {customerTypeKey ? (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">٢. التخصص</p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {specialityOptions.map((option) => (
              <ActivitySelectCard
                key={`${option.customer_type_key}:${option.speciality_key}`}
                active={specialityKey === option.speciality_key}
                onClick={() => handleSpecialityChange(option.speciality_key)}
                title={option.speciality_name_ar}
                subtitle="يحدد تصنيفات المنتجات المناسبة"
                icon={<RectangleGroupIcon className="h-5 w-5" aria-hidden />}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 3. Categories — multi-select */}
      {specialityKey ? (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            ٣. التصنيفات <span className="text-blue-600 dark:text-blue-400">(اختر واحد أو أكثر)</span>
          </p>
          {availableCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              لا توجد تصنيفات متاحة
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableCategories.map((cat) => {
                const combined = `${cat.category_key}:${cat.subcategory_key}`;
                return (
                  <CheckItem
                    key={combined}
                    checked={selectedCategoryKeys.has(combined)}
                    onChange={() => toggleCategory(cat)}
                    label={cat.category_name_ar}
                    subtitle={cat.subcategory_name_ar || undefined}
                  />
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* 4. Brands — multi-select, filtered by selected categories */}
      {selectedCategorySlots.length > 0 ? (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            ٤. البراندات <span className="text-blue-600 dark:text-blue-400">(اختر واحد أو أكثر)</span>
          </p>
          {availableBrands.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              لا توجد براندات متاحة للتصنيفات المحددة
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
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
        </section>
      ) : null}

      {/* Summary */}
      {profiles.length > 0 ? (
        <div className="rounded-xl border border-blue-200 bg-white p-3 dark:border-blue-800/30 dark:bg-white/[0.03]">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">الاختيارات المحددة:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profiles.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                {p.category_name_ar} / {p.brand_name_ar}
                <span className={numberValue(p.total_quantity_on_hand) > 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                  ({numberValue(p.total_quantity_on_hand).toLocaleString("ar-EG")})
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type ConversationStepStatus = "upcoming" | "active" | "complete";

type ConversationStepProps = {
  status: ConversationStepStatus;
  question: string;
  children: ReactNode;
};

export function ConversationStep({ status, question, children }: ConversationStepProps) {
  if (status === "upcoming") return null;

  const borderColor =
    status === "complete"
      ? "border-l-green-500"
      : status === "active"
        ? "border-l-blue-500"
        : "border-l-gray-300 dark:border-l-gray-600";

  return (
    <div
      className={`space-y-3 rounded-2xl border border-gray-200 border-l-4 bg-brand-25/70 p-4 dark:border-gray-800 dark:bg-white/[0.03] ${borderColor}`}
    >
      <div className="flex items-center gap-2.5">
        {status === "complete" ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
            <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
            <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
          </span>
        )}
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{question}</p>
      </div>
      <div className="pl-8.5">{children}</div>
    </div>
  );
}
