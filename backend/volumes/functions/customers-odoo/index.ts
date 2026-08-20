import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireOdooSyncAccess, flattenReference } from "../_shared/odoo.ts";
function requireEnv(name) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
function requireNumberEnv(name) {
  const value = Number(requireEnv(name));
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return value;
}
const ODOO_BASE_URL = requireEnv("ODOO_BASE_URL");
const ODOO_DB = requireEnv("ODOO_DB");
const ODOO_PASSWORD = requireEnv("ODOO_PASSWORD");
const ODOO_UID = requireNumberEnv("ODOO_UID");
const ODOO_LANG = Deno.env.get("ODOO_LANG")?.trim() || "ar_001";
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const REQUIRED_FIELDS = [
  "id",
  "name",
  "company_type",
  "is_company",
  "email",
  "phone",
  "mobile",
  "street",
  "street2",
  "city",
  "state_id",
  "country_id",
  "zip",
  "vat",
  "latitude",
  "longitude",
  "partner_latitude",
  "partner_longitude",
  "customer_rank",
  "create_date",
  "write_date"
];
const GOOGLE_MAP_FIELD_HINTS = [
  "google",
  "map",
  "maps",
  "location",
  "geo",
  "url",
  "link"
];
const GOOGLE_MAP_FIELD_CANDIDATES = [
  "google_map_link",
  "google_maps_url",
  "google_maps_link",
  "map_link",
  "maps_link",
  "location_url",
  "location_link",
  "x_google_map_link",
  "x_google_maps_url",
  "x_studio_google_map_link",
  "x_studio_google_maps_url"
];
const NUMERIC_ODOO_FIELD_TYPES = new Set([
  "float",
  "integer",
  "monetary"
]);
const LATITUDE_FIELD_CANDIDATES = [
  "latitude",
  "lat",
  "partner_latitude",
  "x_latitude",
  "x_lat",
  "x_studio_latitude",
  "x_studio_lat"
];
const LONGITUDE_FIELD_CANDIDATES = [
  "longitude",
  "lng",
  "lon",
  "long",
  "partner_longitude",
  "x_longitude",
  "x_lng",
  "x_lon",
  "x_long",
  "x_studio_longitude",
  "x_studio_lng",
  "x_studio_lon",
  "x_studio_long"
];
const ODOO_BATCH_SIZE = 1000;
function toNullableNumber(value) {
  if (value === null || value === undefined || value === false || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function toNullableIso(value) {
  if (value === null || value === undefined || value === false || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function toOptionalString(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}
function isEmail(value) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}
function isGoogleMapsUrl(value) {
  return Boolean(value && /^https?:\/\//i.test(value) && /(maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^/]+\/maps)/i.test(value));
}
function parseCoordinatePair(value) {
  if (!value) return null;
  const match = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(value);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat,
    lng
  };
}
function parseGoogleMapsCoordinates(value) {
  if (!value) return null;
  // Match @lat,lng pattern (e.g., /@29.9199374,30.9272369,)
  const atMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(value);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        lat,
        lng
      };
    }
  }
  // Match !2d3d pattern (e.g., !2d30.9272369!3d29.9199374)
  const exclamationMatch = /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/.exec(value);
  if (exclamationMatch) {
    const lng = Number(exclamationMatch[1]);
    const lat = Number(exclamationMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        lat,
        lng
      };
    }
  }
  // Match query=lat,lng pattern (e.g., q=29.9199374,30.9272369)
  const queryMatch = /[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(value);
  if (queryMatch) {
    const lat = Number(queryMatch[1]);
    const lng = Number(queryMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        lat,
        lng
      };
    }
  }
  // Fallback to generic coordinate pair
  return parseCoordinatePair(value);
}
function isValidLatitude(value) {
  return value !== null && value >= -90 && value <= 90;
}
function isValidLongitude(value) {
  return value !== null && value >= -180 && value <= 180;
}
function isZeroCoordinatePair(lat, lng) {
  return Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001;
}
function pickOdooCoordinatePair(customer, latitudeFields, longitudeFields) {
  for (const latField of latitudeFields){
    const lat = toNullableNumber(customer[latField]);
    if (!isValidLatitude(lat)) continue;
    if (Math.abs(lat) < 0.000001) continue;
    for (const lngField of longitudeFields){
      const lng = toNullableNumber(customer[lngField]);
      if (!isValidLongitude(lng)) continue;
      if (isZeroCoordinatePair(lat, lng)) continue;
      return {
        lat,
        lng
      };
    }
  }
  return null;
}
function pickGoogleMapsUrl(customer, fieldNames) {
  for (const fieldName of fieldNames){
    const value = toOptionalString(customer[fieldName]);
    if (isGoogleMapsUrl(value)) return value;
  }
  return null;
}
async function resolveGoogleMapsCoordinates(url) {
  const directCoordinates = parseGoogleMapsCoordinates(url);
  if (directCoordinates) {
    console.log("Found direct coordinates in URL:", directCoordinates);
    return directCoordinates;
  }
  if (!isGoogleMapsUrl(url)) return null;
  try {
    console.log("Resolving Google Maps URL:", url);
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow"
    });
    console.log("Final URL after redirect:", response.url);
    const finalUrlCoordinates = parseGoogleMapsCoordinates(response.url);
    if (finalUrlCoordinates) {
      console.log("Found coordinates in final URL:", finalUrlCoordinates);
      return finalUrlCoordinates;
    }
    const body = await response.text();
    const bodyCoordinates = parseGoogleMapsCoordinates(body.slice(0, 120_000));
    if (bodyCoordinates) {
      console.log("Found coordinates in response body:", bodyCoordinates);
    } else {
      console.log("No coordinates found in response body for URL:", url);
    }
    return bodyCoordinates;
  } catch (error) {
    console.warn("Could not resolve Google Maps coordinates:", error instanceof Error ? error.message : String(error));
    return null;
  }
}
async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while(nextIndex < values.length){
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }
  const workers = Array.from({
    length: Math.min(concurrency, values.length)
  }, ()=>worker());
  await Promise.all(workers);
  return results;
}
async function callOdoo(payload) {
  const response = await fetch(ODOO_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}
async function fetchAvailablePartnerFields() {
  const payload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [
        ODOO_DB,
        ODOO_UID,
        ODOO_PASSWORD,
        "res.partner",
        "fields_get",
        [],
        {
          attributes: [
            "string",
            "type"
          ],
          context: {
            lang: ODOO_LANG
          }
        }
      ]
    },
    id: 100
  };
  const result = await callOdoo(payload);
  if (result.error) {
    console.warn("Could not inspect Odoo partner fields, using required fields only:", JSON.stringify(result.error));
    return {};
  }
  return result.result && typeof result.result === "object" ? result.result : {};
}
function normalizeFieldHaystack(fieldName, label) {
  return `${fieldName} ${label ?? ""}`.toLowerCase().replace(/[_\-\s]+/g, " ");
}
function coordinateFieldMatches(fieldName, metadata, axis) {
  if (!NUMERIC_ODOO_FIELD_TYPES.has(String(metadata?.type ?? ""))) return false;
  const haystack = normalizeFieldHaystack(fieldName, metadata.string);
  if (axis === "lat") {
    return /\blatitude\b/.test(haystack) || /\blat\b/.test(haystack) || /\bخط العرض\b/.test(haystack);
  }
  return /\blongitude\b/.test(haystack) || /\blng\b/.test(haystack) || /\blon\b/.test(haystack) || /\blong\b/.test(haystack) || /\bخط الطول\b/.test(haystack);
}
function orderedExistingFields(candidates, availableFields) {
  return candidates.filter((fieldName)=>availableFields[fieldName]);
}
function buildCustomerFieldConfig(availableFields) {
  const hasFieldMetadata = Object.keys(availableFields).length > 0;
  const textTypes = new Set([
    "char",
    "text",
    "html"
  ]);
  const optionalLocationFields = Object.entries(availableFields).filter(([fieldName, metadata])=>{
    if (!textTypes.has(String(metadata?.type ?? ""))) return false;
    const haystack = `${fieldName} ${metadata?.string ?? ""}`.toLowerCase();
    return GOOGLE_MAP_FIELD_HINTS.some((hint)=>haystack.includes(hint));
  }).map(([fieldName])=>fieldName);
  const locationFields = Array.from(new Set([
    ...orderedExistingFields(GOOGLE_MAP_FIELD_CANDIDATES, availableFields),
    ...optionalLocationFields,
    ...hasFieldMetadata ? [] : [
      "google_map_link"
    ]
  ]));
  const discoveredLatitudeFields = Object.entries(availableFields).filter(([fieldName, metadata])=>coordinateFieldMatches(fieldName, metadata, "lat")).map(([fieldName])=>fieldName);
  const discoveredLongitudeFields = Object.entries(availableFields).filter(([fieldName, metadata])=>coordinateFieldMatches(fieldName, metadata, "lng")).map(([fieldName])=>fieldName);
  const latitudeFields = Array.from(new Set([
    ...orderedExistingFields(LATITUDE_FIELD_CANDIDATES, availableFields),
    ...discoveredLatitudeFields
  ]));
  const longitudeFields = Array.from(new Set([
    ...orderedExistingFields(LONGITUDE_FIELD_CANDIDATES, availableFields),
    ...discoveredLongitudeFields
  ]));
  return {
    fields: Array.from(new Set([
      ...REQUIRED_FIELDS,
      ...locationFields,
      ...latitudeFields,
      ...longitudeFields
    ])),
    locationFields,
    latitudeFields,
    longitudeFields
  };
}
async function fetchAllCustomers(domain, fields, maxRows) {
  const customers = [];
  let offset = 0;
  while(true){
    const remainingRows = typeof maxRows === "number" ? maxRows - customers.length : ODOO_BATCH_SIZE;
    if (remainingRows <= 0) break;
    const limit = Math.min(ODOO_BATCH_SIZE, remainingRows);
    const payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          ODOO_DB,
          ODOO_UID,
          ODOO_PASSWORD,
          "res.partner",
          "search_read",
          [
            domain
          ],
          {
            fields,
            limit,
            offset,
            order: "write_date desc",
            context: {
              lang: ODOO_LANG
            }
          }
        ]
      },
      id: 101
    };
    const result = await callOdoo(payload);
    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }
    const batch = Array.isArray(result.result) ? result.result : [];
    if (batch.length === 0) {
      break;
    }
    customers.push(...batch);
    if (batch.length < limit) {
      break;
    }
    offset += limit;
  }
  return customers;
}
async function fixExistingCustomersWithMissingCoordinates(limit = 50) {
  const { data } = await supabase.from("customers").select("id, google_maps_url").not("google_maps_url", "is", null).or("lat.is.null,lng.is.null,lat.eq.0,lng.eq.0").limit(limit);
  const customersToFix = data ?? [];
  if (!customersToFix || customersToFix.length === 0) {
    return 0;
  }
  console.log(`Fixing ${customersToFix.length} customers with missing coordinates...`);
  const fixes = await mapWithConcurrency(customersToFix, 4, async (customer)=>{
    const coordinates = await resolveGoogleMapsCoordinates(customer.google_maps_url);
    if (coordinates) {
      return {
        id: customer.id,
        lat: coordinates.lat,
        lng: coordinates.lng
      };
    }
    return null;
  });
  const validFixes = fixes.filter((f)=>f !== null);
  if (validFixes.length === 0) {
    return 0;
  }
  for (const fix of validFixes){
    await supabase.from("customers").update({
      lat: fix.lat,
      lng: fix.lng,
      updated_at: new Date().toISOString()
    }).eq("id", fix.id);
  }
  console.log(`Updated ${validFixes.length} customers with resolved coordinates`);
  return validFixes.length;
}
Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const authResponse = await requireOdooSyncAccess(req);
  if (authResponse) return authResponse;
  try {
    const requestBody = await req.json().catch(()=>({}));
    const fullSync = Boolean(requestBody && typeof requestBody === "object" && ("full_sync" in requestBody || "force_full_sync" in requestBody || "backfill_existing" in requestBody) && (requestBody.full_sync === true || requestBody.force_full_sync === true || requestBody.backfill_existing === true));
    const configuredMaxRows = Number(Deno.env.get("ODOO_CUSTOMERS_MAX_ROWS") ?? "");
    const requestedMaxRows = Number(requestBody && typeof requestBody === "object" && "max_rows" in requestBody ? requestBody.max_rows : NaN);
    const maxRows = Number.isFinite(requestedMaxRows) && requestedMaxRows > 0 ? requestedMaxRows : Number.isFinite(configuredMaxRows) && configuredMaxRows > 0 ? configuredMaxRows : undefined;
    const skipCoordinateResolution = requestBody && typeof requestBody === "object" && requestBody.skip_coordinate_resolution === true;
    const diagnoseFields = requestBody && typeof requestBody === "object" && requestBody._diagnose_fields === true;
    // Diagnostic mode: return all available Odoo fields and their labels
    if (diagnoseFields) {
      const availableFields = await fetchAvailablePartnerFields();
      const fieldList = Object.entries(availableFields).map(([name, meta])=>({
          name,
          label: meta.string ?? "",
          type: meta.type ?? ""
        })).sort((a, b)=>a.name.localeCompare(b.name));
      return new Response(JSON.stringify({
        success: true,
        total_fields: fieldList.length,
        fields: fieldList
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // 1. Get the last sync timestamp from the DB
    // Odoo uses 'YYYY-MM-DD HH:MM:SS'
    let lastSyncDate = "2000-01-01 00:00:00";
    if (!fullSync) {
      const { data: lastCustomer } = await supabase.from("customers").select("last_sync_at").not("last_sync_at", "is", null).order("last_sync_at", {
        ascending: false
      }).limit(1).maybeSingle();
      if (lastCustomer?.last_sync_at) {
        const date = new Date(lastCustomer.last_sync_at);
        // Subtract 5 minutes to catch overlap
        date.setMinutes(date.getMinutes() - 5);
        lastSyncDate = date.toISOString().replace("T", " ").split(".")[0];
      }
    }
    const domain = fullSync ? [
      [
        "id",
        ">",
        0
      ]
    ] : [
      [
        "id",
        ">",
        0
      ],
      [
        "write_date",
        ">",
        lastSyncDate
      ]
    ];
    const availableFields = await fetchAvailablePartnerFields();
    const customerFieldConfig = buildCustomerFieldConfig(availableFields);
    console.log("Calling Odoo with domain:", JSON.stringify(domain));
    console.log("maxRows:", maxRows);
    const customers = await fetchAllCustomers(domain, customerFieldConfig.fields, maxRows);
    if (!customers || customers.length === 0) {
      const fixedExistingCount = skipCoordinateResolution ? 0 : await fixExistingCustomersWithMissingCoordinates();
      return new Response(JSON.stringify({
        success: true,
        count: 0,
        full_sync: fullSync,
        fixed_existing_count: fixedExistingCount,
        message: fixedExistingCount > 0 ? "No new customers to sync; fixed existing customer coordinates" : "No new customers to sync"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const seenIds = new Set();
    const uniqueCustomers = customers.filter((c)=>{
      const id = String(c.id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    const syncTime = new Date().toISOString();
    const upsertData = await mapWithConcurrency(uniqueCustomers, skipCoordinateResolution ? 1 : 6, async (c)=>{
      const rawEmail = toOptionalString(c.email);
      const emailCoordinates = parseCoordinatePair(rawEmail);
      const googleMapsUrl = pickGoogleMapsUrl(c, customerFieldConfig.locationFields);
      const linkCoordinates = skipCoordinateResolution ? null : await resolveGoogleMapsCoordinates(googleMapsUrl);
      const odooCoordinates = pickOdooCoordinatePair(c, customerFieldConfig.latitudeFields, customerFieldConfig.longitudeFields);
      const fallbackCoordinates = googleMapsUrl ? null : emailCoordinates;
      const customerRank = Number(c.customer_rank) || 0;
      let priority = "medium";
      if (customerRank >= 9) priority = "high";
      else if (customerRank <= 3) priority = "low";
      const stateName = flattenReference(c.state_id);
      const countryName = flattenReference(c.country_id);
      return {
        external_customer_id: String(c.id),
        customer_name: c.name,
        customer_email: isEmail(rawEmail) ? rawEmail : null,
        customer_location: googleMapsUrl ?? (emailCoordinates ? rawEmail : null),
        google_maps_url: googleMapsUrl,
        phone_number: c.phone || null,
        whatsapp_number: c.mobile || null,
        address_line: [
          c.street,
          c.street2
        ].filter(Boolean).join(", ") || null,
        governorate: stateName || null,
        district: toOptionalString(c.city),
        customer_type: c.is_company ? "company" : "individual",
        priority: priority,
        lat: odooCoordinates?.lat ?? linkCoordinates?.lat ?? fallbackCoordinates?.lat ?? null,
        lng: odooCoordinates?.lng ?? linkCoordinates?.lng ?? fallbackCoordinates?.lng ?? null,
        source: "odoo_sync",
        raw_payload: c,
        status: "active",
        created_at: toNullableIso(c.create_date) ?? syncTime,
        updated_at: toNullableIso(c.write_date) ?? syncTime,
        last_sync_at: syncTime
      };
    });
    console.log(`Upserting ${upsertData.length} customers...`);
    const { error: dbError } = await supabase.from("customers").upsert(upsertData, {
      onConflict: "external_customer_id"
    });
    if (dbError) {
      console.error("Supabase upsert error:", JSON.stringify(dbError));
      return new Response(JSON.stringify({
        success: false,
        error: dbError
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const fixedExistingCount = skipCoordinateResolution ? 0 : await fixExistingCustomersWithMissingCoordinates();
    return new Response(JSON.stringify({
      success: true,
      count: uniqueCustomers.length,
      max_rows: maxRows ?? null,
      full_sync: fullSync,
      skip_coordinate_resolution: skipCoordinateResolution,
      fixed_existing_count: fixedExistingCount
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unhandled error:", message);
    return new Response(JSON.stringify({
      success: false,
      error: message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
