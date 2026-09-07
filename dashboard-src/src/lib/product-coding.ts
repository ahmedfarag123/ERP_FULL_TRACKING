import { supabase } from "./supabase";
import { KNOWN_BRANDS, KNOWN_PRODUCTS } from "../data/coding-known";

const EDGE_FUNCTION_URL = `${
  import.meta.env.VITE_SUPABASE_URL ?? "https://horecasmartos.duckdns.org"
}/functions/v1/translate-product-name`;

export async function translateViaGoogle(input: {
  brand: string;
  product: string;
  fromScript?: "arabic" | "latin";
}): Promise<{ brand: string; product: string } | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: token,
      },
      body: JSON.stringify({
        brand: input.brand,
        product: input.product,
        from_script: input.fromScript ?? "arabic",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { brand?: string; product?: string };
    if (typeof data.brand !== "string" || !data.brand) return null;
    return { brand: data.brand, product: data.product ?? "" };
  } catch {
    return null;
  }
}

const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_PATTERN = /[a-zA-Z]+/;

const AR_TO_EN_UNIT: Record<string, string> = {
  "كجم": "kg", "جم": "g", "لتر": "L", "مل": "ml",
  "قطعه": "pc", "قطعة": "pc", "عبوه": "Pack", "عبوات": "Pack", "جرام": "g",
};

export function englishSizeUnit(unit: string): string {
  return AR_TO_EN_UNIT[unit] ?? unit;
}

const AR2LAT: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "a", "آ": "a",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j",
  "ح": "h", "خ": "kh", "د": "d", "ذ": "dh",
  "ر": "r", "ز": "z", "س": "s", "ش": "sh",
  "ص": "s", "ض": "d", "ط": "t", "ظ": "z",
  "ع": "aa", "غ": "gh", "ف": "f", "ق": "q",
  "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "و": "w", "ي": "y",
  "ة": "a", "ى": "a", "ئ": "y", "ؤ": "w",
};

const LAT2AR: Record<string, string> = {};
function buildLat2Ar() {
  for (const [ar, lat] of Object.entries(AR2LAT)) {
    if (!(lat in LAT2AR)) LAT2AR[lat] = ar;
  }
}
buildLat2Ar();

export function detectScript(text: string): "empty" | "arabic" | "latin" | "mixed" | "other" {
  if (!text) return "empty";
  const hasAr = ARABIC_PATTERN.test(text);
  const hasLat = LATIN_PATTERN.test(text);
  if (hasAr && hasLat) return "mixed";
  if (hasAr) return "arabic";
  if (hasLat) return "latin";
  return "other";
}

export function transliterate(text: string, toScript: "latin" | "arabic" = "latin"): string {
  if (toScript === "latin") {
    let r = "";
    for (const ch of text) r += AR2LAT[ch] ?? ch;
    r = r.replace(/aa(?=[a-z])/g, "a").replace(/aa$/g, "a").replace(/\s+/g, " ").trim();
    return r;
  }
  let r = "";
  let i = 0;
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two in LAT2AR) { r += LAT2AR[two]; i += 2; }
    else if (text[i] in LAT2AR) { r += LAT2AR[text[i]]; i += 1; }
    else { r += text[i]; i += 1; }
  }
  return r.trim();
}

export function suggestCounterpart(
  brand: string,
  product: string,
  sizeAmount: string,
  sizeUnit: string,
  packQty: string
): {
  brand: string;
  product: string;
  size_unit: string;
  product_known: boolean;
} {
  const matchByPrefix = (text: string, dict: Record<string, string>) => {
    let best = "";
    let bestLen = 0;
    for (const key of Object.keys(dict)) {
      if (key && text.startsWith(key) && key.length > bestLen && /[\u0600-\u06FF]/.test(key)) {
        best = dict[key];
        bestLen = key.length;
      }
    }
    return best;
  };

  let brandEn = matchByPrefix(brand, KNOWN_BRANDS);
  const productKnown = Boolean(matchByPrefix(product, KNOWN_PRODUCTS));
  let productEn = matchByPrefix(product, KNOWN_PRODUCTS);
  if (!productEn) {
    const t = transliterate(product, "latin");
    productEn = qualityOk(t) ? t : "";
  }

  if (!brandEn && /[\u0600-\u06FF]/.test(brand)) {
    const t = transliterate(brand, "latin");
    brandEn = qualityOk(t) ? t[0].toUpperCase() + t.slice(1) : "";
  }

  const safe = (s: string, lat: boolean) => {
    if (!s) return "";
    return lat ? (LATIN_PATTERN.test(s) ? s : "") : (ARABIC_PATTERN.test(s) ? s : "");
  };
  const sizeUnitEn = englishSizeUnit(sizeUnit);
  return {
    brand: safe(brandEn, true),
    product: safe(productEn, true),
    size_unit: sizeUnitEn ?? sizeUnit,
    product_known: productKnown,
  };
}

// Mirrors the CRM's _text_quality_words: reject unprotected garbage like
// "smn asfr" (vowel ratio too low) as well as consonant-only words.
function qualityOk(text: string): boolean {
  if (!text) return false;
  const words = text.trim().split(/\s+/);
  if (!words.length) return false;
  if (!/^[a-zA-Z\s]+$/.test(text)) return false;
  const totalChars = text.replace(/\s+/g, "").length;
  const vowelCount = (text.match(/[aeiouAEIOU]/g) ?? []).length;
  if (vowelCount / Math.max(totalChars, 1) < 0.25) return false;
  const poorWords = words.filter(
    (w) => w.length > 2 && !/[aeiouAEIOU]/.test(w)
  ).length;
  if (poorWords >= 1) return false;
  const repeated = words.filter(
    (w) => w.length > 3 && new Set(w.toLowerCase()).size <= 2
  ).length;
  if (repeated >= 1) return false;
  return true;
}

export function buildEnglishName(input: {
  brand: string;
  product: string;
  size_amount: string;
  size_unit: string;
  pack_qty: string;
}): string {
  const { brand, product, size_amount, size_unit, pack_qty } = input;
  if (!brand && !product) return "";
  const base = [brand, product].filter(Boolean).join(" ");
  let name = base;
  const amount = size_amount.trim();
  const unit = size_unit.trim();
  const pack = pack_qty.trim();
  if (amount) name += ` - ${amount}${unit ? ` ${unit}` : ""}`;
  if (pack && pack !== "1") name += ` × ${pack}`;
  return name;
}

export type CodingTreeRow = {
  id: string;
  dept_digit: number;
  sub_digits: number | null;
  main_category: string;
  sub_category: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type ProductCodingRow = {
  new_code: string;
  old_code: string | null;
  external_product_id: string | null;
  original_name: string;
  normalized_name: string;
  english_name: string;
  main_category: string;
  sub_category: string;
  sale_price: number;
  cost: number;
  is_active: boolean;
  validation_status: string;
  validation_notes: string;
  source: string;
  brand: string | null;
  brand_normalized: string | null;
  barcode: string | null;
  hs_code: string | null;
  product_type: string | null;
  track_method: string | null;
  is_storable: boolean | null;
  sale_ok: boolean | null;
  purchase_ok: boolean | null;
  weight: number | null;
  volume: number | null;
  uom_sale: string | null;
  uom_purchase: string | null;
  country_of_origin: string | null;
  use_expiration: boolean | null;
  expiry_days: number | null;
  best_before_days: number | null;
  tags: string | null;
  taxes_sale: string | null;
  taxes_purchase: string | null;
  note: string | null;
  description_sale: string | null;
  description_purchase: string | null;
  sale_delay: number | null;
  purchase_method: string | null;
  invoice_policy: string | null;
  alert_time: number | null;
  removal_time: number | null;
  reordering_min_qty: number | null;
  reordering_max_qty: number | null;
  warehouse: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertCodingInput = {
  original_name: string;
  main_category: string;
  sub_category: string;
  new_code?: string | null;
  old_code?: string | null;
  external_product_id?: string | null;
  normalized_name?: string;
  english_name?: string;
  sale_price?: number;
  cost?: number;
  is_active?: boolean;
  validation_status?: string;
  validation_notes?: string;
  brand?: string | null;
  brand_normalized?: string | null;
  barcode?: string | null;
  hs_code?: string | null;
  product_type?: string | null;
  track_method?: string | null;
  is_storable?: boolean | null;
  sale_ok?: boolean | null;
  purchase_ok?: boolean | null;
  weight?: number | null;
  volume?: number | null;
  uom_sale?: string | null;
  uom_purchase?: string | null;
  country_of_origin?: string | null;
  use_expiration?: boolean | null;
  expiry_days?: number | null;
  best_before_days?: number | null;
  tags?: string | null;
  taxes_sale?: string | null;
  taxes_purchase?: string | null;
  note?: string | null;
  description_sale?: string | null;
  description_purchase?: string | null;
  sale_delay?: number | null;
  purchase_method?: string | null;
  invoice_policy?: string | null;
  alert_time?: number | null;
  removal_time?: number | null;
  reordering_min_qty?: number | null;
  reordering_max_qty?: number | null;
  warehouse?: string | null;
  location?: string | null;
};

export type ProductBrand = {
  id: string;
  name: string;
  name_normalized: string;
  name_en: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};

export type ProductNameParts = {
  brand: string;
  product: string;
  size_amount: string;
  size_unit: string;
  pack_qty: string;
};

export const SIZE_UNITS = ["كجم", "جم", "لتر", "مل", "قطعه", "عبوه"] as const;

export function normalizeArName(s: string): string {
  let v = (s ?? "").replace(/[\u064B-\u0652\u0640]/g, "");
  v = v.replace(/[أإآٱ]/g, "ا");
  v = v.replace(/ى/g, "ي");
  v = v.replace(/ؤ/g, "و");
  v = v.replace(/ئ/g, "ي");
  v = v.replace(/[\u200C\u200D]/g, "");
  v = v.replace(/\s+/g, " ").trim();
  return v;
}

export function buildProductName(p: ProductNameParts): {
  original_name: string;
  normalized_name: string;
} {
  const brand = p.brand.trim();
  const product = p.product.trim();
  const nameCore = [brand, product].filter(Boolean).join(" ");

  const amount = p.size_amount.trim();
  const unit = p.size_unit.trim();
  const pack = p.pack_qty.trim();

  let name = nameCore;
  if (amount) name += ` - ${amount}${unit ? ` ${unit}` : ""}`;
  if (pack && pack !== "1") name += ` × ${pack}`;

  return { original_name: name, normalized_name: normalizeArName(name) };
}

export function parseProductName(name: string, brands: ProductBrand[]): ProductNameParts {
  let core = (name ?? "").trim();
  let sizePart = "";

  const dashIdx = core.indexOf(" - ");
  if (dashIdx > -1) {
    sizePart = core.slice(dashIdx + 3).trim();
    core = core.slice(0, dashIdx).trim();
  }

  const sizeRe = /^([\d.,]+)\s*(كجم|جم|لتر|مل|قطعه|قطعة|عبوه|عبوات|جرام)?\s*(?:×\s*)?(\d+)?/;
  const sizeMatch = sizeRe.exec(sizePart);
  let size_amount = "";
  let size_unit = "";
  let pack_qty = "";
  if (sizeMatch) {
    size_amount = sizeMatch[1];
    size_unit = sizeMatch[2] ?? "";
    pack_qty = sizeMatch[3] ?? "";
  }

  let brand = "";
  let product = core;
  const match = brands
    .filter((b) => b.name && core.startsWith(b.name))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (match) {
    brand = match.name;
    product = core.slice(match.name.length).trim();
  }

  return { brand, product, size_amount, size_unit, pack_qty };
}

export function getCodePrefix(tree: CodingTreeRow): string {
  return String(tree.dept_digit) + String(tree.sub_digits).padStart(2, "0");
}

export function computeNextCode(tree: CodingTreeRow, coded: ProductCodingRow[]): string {
  const prefix = getCodePrefix(tree);
  let max = 0;
  for (const row of coded) {
    if (row.new_code.startsWith(prefix)) {
      const seq = Number(row.new_code.slice(3));
      if (Number.isFinite(seq) && seq > max) max = seq;
    }
  }
  return prefix + String(max + 1).padStart(4, "0");
}

export async function fetchCodingTree(): Promise<CodingTreeRow[]> {
  const { data, error } = await supabase
    .from("coding_tree")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CodingTreeRow[];
}

export async function fetchAllCodedProducts(): Promise<ProductCodingRow[]> {
  const { data, error } = await supabase
    .from("product_coding")
    .select("*")
    .order("new_code", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProductCodingRow[];
}

export async function upsertCodingProduct(input: UpsertCodingInput): Promise<string> {
  const { data, error } = await supabase.rpc("coding_upsert_product", {
    p_original_name: input.original_name,
    p_main_category: input.main_category,
    p_sub_category: input.sub_category,
    p_new_code: input.new_code ?? null,
    p_old_code: input.old_code ?? null,
    p_external_product_id: input.external_product_id ?? null,
    p_normalized_name: input.normalized_name ?? "",
    p_english_name: input.english_name ?? "",
    p_sale_price: input.sale_price ?? 0,
    p_cost: input.cost ?? 0,
    p_is_active: input.is_active ?? true,
    p_validation_status: input.validation_status ?? "valid",
    p_validation_notes: input.validation_notes ?? "",
    p_brand: input.brand ?? null,
    p_brand_normalized: input.brand_normalized ?? null,
    p_barcode: input.barcode ?? null,
    p_hs_code: input.hs_code ?? null,
    p_product_type: input.product_type ?? null,
    p_track_method: input.track_method ?? null,
    p_is_storable: input.is_storable ?? null,
    p_sale_ok: input.sale_ok ?? null,
    p_purchase_ok: input.purchase_ok ?? null,
    p_weight: input.weight ?? null,
    p_volume: input.volume ?? null,
    p_uom_sale: input.uom_sale ?? null,
    p_uom_purchase: input.uom_purchase ?? null,
    p_country_of_origin: input.country_of_origin ?? null,
    p_use_expiration: input.use_expiration ?? null,
    p_expiry_days: input.expiry_days ?? null,
    p_best_before_days: input.best_before_days ?? null,
    p_tags: input.tags ?? null,
    p_taxes_sale: input.taxes_sale ?? null,
    p_taxes_purchase: input.taxes_purchase ?? null,
    p_note: input.note ?? null,
    p_description_sale: input.description_sale ?? null,
    p_description_purchase: input.description_purchase ?? null,
    p_sale_delay: input.sale_delay ?? null,
    p_purchase_method: input.purchase_method ?? null,
    p_invoice_policy: input.invoice_policy ?? null,
    p_alert_time: input.alert_time ?? null,
    p_removal_time: input.removal_time ?? null,
    p_reordering_min_qty: input.reordering_min_qty ?? null,
    p_reordering_max_qty: input.reordering_max_qty ?? null,
    p_warehouse: input.warehouse ?? null,
    p_location: input.location ?? null,
  });

  if (error) throw new Error(error.message);
  const result = data as { new_code?: string } | null;
  return result?.new_code ?? input.new_code ?? "";
}

export type BatchApplyResult = {
  applied?: number;
  errors?: { row?: number; new_code?: string; error?: string }[];
};

export async function applyCodingBatch(rows: UpsertCodingInput[]): Promise<BatchApplyResult> {
  const { data, error } = await supabase.rpc("coding_apply_batch", {
    p_rows: rows,
  });

  if (error) throw new Error(error.message);
  const result = (data ?? {}) as BatchApplyResult;
  if (!Array.isArray(result.errors)) result.errors = [];
  return result;
}

export async function deleteCodingProduct(newCode: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("coding_delete_product", {
    p_new_code: newCode,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function fetchProductBrands(): Promise<ProductBrand[]> {
  const { data, error } = await supabase
    .from("product_brands")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProductBrand[];
}

export async function addProductBrand(name: string, nameEn = ""): Promise<ProductBrand> {
  const { data, error } = await supabase.rpc("add_product_brand", {
    p_name: name,
    p_name_normalized: normalizeArName(name),
    p_name_en: nameEn,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as ProductBrand;
}

export async function addMainCategory(
  name: string
): Promise<{ dept_digit: number; main_category: string }> {
  const { data, error } = await supabase.rpc("add_main_category", { p_name: name });

  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as { dept_digit: number; main_category: string };
}

export async function addSubCategory(
  main: string,
  name: string
): Promise<{ dept_digit: number; sub_digits: number; main_category: string; sub_category: string }> {
  const { data, error } = await supabase.rpc("add_sub_category", {
    p_main: main,
    p_name: name,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as {
    dept_digit: number;
    sub_digits: number;
    main_category: string;
    sub_category: string;
  };
}

export function validateEntryField(
  value: unknown,
  label: string
): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return `${label} مطلوب`;
  return null;
}