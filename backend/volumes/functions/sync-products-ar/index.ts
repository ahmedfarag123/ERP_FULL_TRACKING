import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const jsonRpcId = 1;
const DEFAULT_ODOO_LANG = "ar_001";
const DEFAULT_ODOO_PRODUCTS_MODEL = "product.product";
const encoder = new TextEncoder();
function requireEnv(name) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}
function optionalEnv(name) {
  return Deno.env.get(name)?.trim() || null;
}
function constantTimeEqual(left, right) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;
  for(let index = 0; index < length; index += 1){
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return diff === 0;
}
function hasValidSyncSecret(req) {
  const expectedSecret = optionalEnv("ODOO_SYNC_SECRET") || optionalEnv("SYNC_SECRET");
  if (!expectedSecret) return true;
  const providedSecret = req.headers.get("x-sync-secret")?.trim() || "";
  return providedSecret ? constantTimeEqual(providedSecret, expectedSecret) : false;
}
function pickServiceRoleKey(secretKeys) {
  const entries = Object.entries(secretKeys);
  if (entries.length === 1) return entries[0][1];
  const byName = entries.find(([key])=>key.toLowerCase().includes("service_role"));
  if (byName) return byName[1];
  const explicitName = optionalEnv("SUPABASE_SERVICE_ROLE_KEY_NAME");
  if (explicitName) {
    const explicit = secretKeys[explicitName];
    if (explicit) return explicit;
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY_NAME set to "${explicitName}" but not found inside SUPABASE_SECRET_KEYS.`);
  }
  throw new Error("Could not determine service role key. Set SUPABASE_SERVICE_ROLE_KEY_NAME to the exact key name inside SUPABASE_SECRET_KEYS.");
}
function readServiceRoleKey() {
  const directServiceRoleKey = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (directServiceRoleKey) return directServiceRoleKey;
  const rawSecrets = requireEnv("SUPABASE_SECRET_KEYS");
  return pickServiceRoleKey(JSON.parse(rawSecrets));
}
function readOdooUrl() {
  return optionalEnv("ODOO_URL") || requireEnv("ODOO_BASE_URL");
}
function buildOdooJsonRpcUrl(odooUrl) {
  const baseUrl = odooUrl.replace(/\/+$/, "");
  return baseUrl.endsWith("/jsonrpc") ? baseUrl : `${baseUrl}/jsonrpc`;
}
function hasArabic(text) {
  return /[\u0600-\u06ff]/.test(text);
}
function toNullableNumber(value) {
  if (value === null || value === undefined || value === false || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function toNullableIso(value) {
  if (value === null || value === undefined || value === false || value === "") {
    return null;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function referenceName(value) {
  return Array.isArray(value) && value.length > 1 ? String(value[1] ?? "").trim() || null : null;
}
async function translateToArabic(text) {
  const translationApiKey = optionalEnv("TRANSLATION_API_KEY") || optionalEnv("OPENAI_API_KEY");
  const translationApiUrl = optionalEnv("TRANSLATION_API_URL") || (translationApiKey ? "https://api.openai.com/v1/chat/completions" : null);
  const translationModel = optionalEnv("TRANSLATION_MODEL") || "gpt-4o-mini";
  if (!translationApiKey || !translationApiUrl) {
    return null;
  }
  const payload = {
    model: translationModel,
    messages: [
      {
        role: "system",
        content: "Translate the user text to Arabic. Return only the translated text, without notes or quotes."
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.2
  };
  const response = await fetch(translationApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${translationApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    console.warn(`Translation failed for "${text}": ${await response.text()}`);
    return null;
  }
  const data = await response.json();
  const translated = data?.choices?.[0]?.message?.content;
  return typeof translated === "string" && translated.trim() ? translated.trim() : null;
}
async function odooSearchRead({ odooUrl, db, username, password, model, lang, domain, fields, limit }) {
  const jsonRpcUrl = buildOdooJsonRpcUrl(odooUrl);
  const loginPayload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "common",
      method: "login",
      args: [
        db,
        username,
        password
      ]
    },
    id: jsonRpcId
  };
  const loginResponse = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(loginPayload)
  });
  if (!loginResponse.ok) {
    throw new Error(`Odoo login failed: ${await loginResponse.text()}`);
  }
  const loginJson = await loginResponse.json();
  const uid = loginJson?.result;
  if (!uid) throw new Error("Odoo login returned empty uid");
  const args = [
    db,
    uid,
    password,
    model,
    "search_read",
    [
      domain
    ],
    {
      fields,
      limit,
      context: {
        lang
      }
    }
  ];
  const callPayload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args
    },
    id: jsonRpcId
  };
  const response = await fetch(jsonRpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(callPayload)
  });
  if (!response.ok) {
    throw new Error(`Odoo execute_kw failed: ${await response.text()}`);
  }
  const json = await response.json();
  if (json?.error) {
    throw new Error(`Odoo execute_kw error: ${JSON.stringify(json.error)}`);
  }
  if (!Array.isArray(json?.result)) throw new Error("Unexpected Odoo response");
  return json.result;
}
async function fetchArabicMapping(supabase) {
  const { data, error } = await supabase.from("arabic").select("product_id, name");
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []){
    const productId = String(row.product_id ?? "").trim();
    const name = String(row.name ?? "").trim();
    if (productId && name) {
      map.set(productId, name);
    }
  }
  return map;
}
async function syncProductRows(supabase, rows) {
  const externalIds = rows.map((row)=>String(row.external_product_id ?? "").trim()).filter(Boolean);
  const internalReferences = rows.map((row)=>String(row.internal_reference ?? "").trim()).filter(Boolean);
  const existingRows = [];
  if (externalIds.length > 0) {
    const { data, error } = await supabase.from("products").select("id, external_product_id, internal_reference").in("external_product_id", externalIds);
    if (error) throw error;
    existingRows.push(...data ?? []);
  }
  if (internalReferences.length > 0) {
    const { data, error } = await supabase.from("products").select("id, external_product_id, internal_reference").in("internal_reference", internalReferences);
    if (error) throw error;
    existingRows.push(...data ?? []);
  }
  const byExternalId = new Map(existingRows.filter((row)=>row.external_product_id).map((row)=>[
      row.external_product_id,
      row
    ]));
  const byInternalReference = new Map(existingRows.filter((row)=>row.internal_reference).map((row)=>[
      row.internal_reference,
      row
    ]));
  let updatedByExternalId = 0;
  let updatedByInternalReference = 0;
  let inserted = 0;
  for (const row of rows){
    const externalProductId = String(row.external_product_id ?? "").trim();
    const internalReference = String(row.internal_reference ?? "").trim();
    const existingByExternalId = byExternalId.get(externalProductId);
    const existingByInternalReference = byInternalReference.get(internalReference);
    const existing = existingByExternalId ?? existingByInternalReference;
    if (existing) {
      const { error } = await supabase.from("products").update(row).eq("id", existing.id);
      if (error) throw error;
      if (existingByExternalId) {
        updatedByExternalId += 1;
      } else {
        updatedByInternalReference += 1;
      }
      continue;
    }
    const { error } = await supabase.from("products").insert(row);
    if (error) throw error;
    inserted += 1;
  }
  return {
    updatedByExternalId,
    updatedByInternalReference,
    inserted
  };
}
Deno.serve(async (req)=>{
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405
    });
  }
  if (!hasValidSyncSecret(req)) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Unauthorized sync request."
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRole = readServiceRoleKey();
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: {
      persistSession: false
    }
  });
  const odooUrl = readOdooUrl();
  const odooDb = requireEnv("ODOO_DB");
  const odooUsername = requireEnv("ODOO_USERNAME");
  const odooPassword = requireEnv("ODOO_PASSWORD");
  const odooProductsModel = optionalEnv("ODOO_PRODUCTS_MODEL") || DEFAULT_ODOO_PRODUCTS_MODEL;
  const odooLang = optionalEnv("ODOO_LANG") || DEFAULT_ODOO_LANG;
  const limit = Number(optionalEnv("ODOO_PRODUCTS_LIMIT") || "200");
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("ODOO_PRODUCTS_LIMIT must be a positive number.");
  }
  const fields = [
    "id",
    "default_code",
    "name",
    "standard_price",
    "list_price",
    "qty_available",
    "incoming_qty",
    "outgoing_qty",
    "uom_id",
    "create_date",
    "write_date"
  ];
  const products = await odooSearchRead({
    odooUrl,
    db: odooDb,
    username: odooUsername,
    password: odooPassword,
    model: odooProductsModel,
    lang: odooLang,
    domain: [],
    fields,
    limit
  });
  const arabicMap = await fetchArabicMapping(supabase);
  const now = new Date().toISOString();
  const upserts = [];
  let odooArabicCount = 0;
  let arabicTableCount = 0;
  let translatedByApiCount = 0;
  let fallbackNonArabicCount = 0;
  for (const product of products){
    const rawName = String(product.name ?? "").trim();
    if (!rawName) continue;
    const internalRef = product.default_code ? String(product.default_code).trim() : "";
    let productName = rawName;
    if (internalRef && arabicMap.has(internalRef)) {
      productName = arabicMap.get(internalRef);
      arabicTableCount += 1;
    } else if (hasArabic(rawName)) {
      odooArabicCount += 1;
    } else {
      const translatedName = await translateToArabic(rawName);
      if (translatedName) {
        productName = translatedName;
        translatedByApiCount += 1;
      } else {
        fallbackNonArabicCount += 1;
      }
    }
    upserts.push({
      external_product_id: String(product.id),
      internal_reference: product.default_code ? String(product.default_code).trim() : null,
      product_name: productName,
      average_cost: toNullableNumber(product.standard_price) ?? 0,
      sales_price: toNullableNumber(product.list_price) ?? 0,
      quantity_on_hand: toNullableNumber(product.qty_available) ?? 0,
      incoming_quantity: toNullableNumber(product.incoming_qty) ?? 0,
      outgoing_quantity: toNullableNumber(product.outgoing_qty) ?? 0,
      unit_of_measure: referenceName(product.uom_id),
      source: "odoo_sync_ar",
      raw_payload: product,
      odoo_updated_at: toNullableIso(product.write_date),
      odoo_created_at: toNullableIso(product.create_date),
      last_sync_at: now,
      updated_at: now
    });
  }
  const syncStats = upserts.length > 0 ? await syncProductRows(supabase, upserts) : {
    updatedByExternalId: 0,
    updatedByInternalReference: 0,
    inserted: 0
  };
  return new Response(JSON.stringify({
    ok: true,
    lang: odooLang,
    fetched: products.length,
    synced: upserts.length,
    model: odooProductsModel,
    updated_by_external_id: syncStats.updatedByExternalId,
    updated_by_internal_reference: syncStats.updatedByInternalReference,
    inserted: syncStats.inserted,
    odoo_arabic_count: odooArabicCount,
    arabic_table_count: arabicTableCount,
    translated_by_api_count: translatedByApiCount,
    fallback_non_arabic_count: fallbackNonArabicCount
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
});
