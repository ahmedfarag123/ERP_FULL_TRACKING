import { buildLastSyncDate, corsHeaders, fetchOdooBatches, fetchOdooByIds, fetchOdooFieldNames, formatUnknownError, jsonResponse, referenceId, referenceName, requireOdooSyncAccess, supabaseAdmin, toNullableIso, toNullableNumber } from "../_shared/odoo.ts";
import { normalizeOdooText } from "../_shared/odoo-normalization.ts";
function hasArabic(text) {
  return /[\u0600-\u06ff]/.test(text);
}
function cleanText(value) {
  return normalizeOdooText(value);
}
function pickLocalizedProductName(product, templateById) {
  const templateId = Number(referenceId(product.product_tmpl_id));
  const template = Number.isFinite(templateId) ? templateById.get(templateId) : null;
  const templateName = cleanText(template?.name);
  if (templateName) return {
    name: templateName,
    source: "template"
  };
  const templateRefName = referenceName(product.product_tmpl_id);
  if (templateRefName) return {
    name: templateRefName,
    source: "template_ref"
  };
  const productName = cleanText(product.name);
  if (productName) return {
    name: productName,
    source: "product_name"
  };
  const displayName = cleanText(product.display_name);
  if (displayName) return {
    name: displayName,
    source: "display_name"
  };
  return {
    name: `Product ${product.id}`,
    source: "fallback"
  };
}
Deno.serve(async (req)=>{
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
    const configuredMaxRows = Number(Deno.env.get("ODOO_PRODUCTS_MAX_ROWS") ?? "");
    const requestedMaxRows = Number(requestBody && typeof requestBody === "object" && "max_rows" in requestBody ? requestBody.max_rows : NaN);
    const maxRows = Number.isFinite(requestedMaxRows) && requestedMaxRows > 0 ? requestedMaxRows : Number.isFinite(configuredMaxRows) && configuredMaxRows > 0 ? configuredMaxRows : undefined;
    let lastSyncDate = "2000-01-01 00:00:00";
    if (!fullSync) {
      const { data: latestRow, error: latestError } = await supabaseAdmin.from("products").select("odoo_updated_at, last_sync_at, updated_at").or("odoo_updated_at.not.is.null,last_sync_at.not.is.null,updated_at.not.is.null").order("odoo_updated_at", {
        ascending: false,
        nullsFirst: false
      }).order("last_sync_at", {
        ascending: false,
        nullsFirst: false
      }).order("updated_at", {
        ascending: false,
        nullsFirst: false
      }).limit(1).maybeSingle();
      if (latestError) {
        throw latestError;
      }
      lastSyncDate = buildLastSyncDate(latestRow?.odoo_updated_at ?? latestRow?.last_sync_at ?? latestRow?.updated_at ?? null);
    }
    const productFieldNames = await fetchOdooFieldNames("product.product");
    const requestedProductFields = [
      "id",
      "default_code",
      "name",
      "display_name",
      "product_tmpl_id",
      "standard_price",
      "list_price",
      "qty_available",
      "incoming_qty",
      "outgoing_qty",
      "uom_id",
      "active",
      "create_date",
      "write_date"
    ];
    const productFields = requestedProductFields.filter((field)=>productFieldNames.has(field));
    const products = await fetchOdooBatches({
      model: "product.product",
      fields: productFields,
      domain: fullSync ? [] : [
        [
          "write_date",
          ">",
          lastSyncDate
        ]
      ],
      batchSize: 250,
      maxRows,
      order: "write_date asc"
    });
    if (products.length === 0) {
      return jsonResponse({
        success: true,
        count: 0,
        full_sync: fullSync,
        message: "No products to sync"
      });
    }
    const templateIds = [
      ...new Set(products.map((product)=>Number(referenceId(product.product_tmpl_id))).filter(Number.isFinite))
    ];
    const templateFieldNames = await fetchOdooFieldNames("product.template");
    const requestedTemplateFields = [
      "id",
      "name",
      "display_name"
    ];
    const templateFields = requestedTemplateFields.filter((field)=>templateFieldNames.has(field));
    const templates = await fetchOdooByIds({
      model: "product.template",
      ids: templateIds,
      fields: templateFields
    });
    const templateById = new Map(templates.map((template)=>[
        template.id,
        template
      ]));
    const syncTime = new Date().toISOString();
    let odooArabicCount = 0;
    let odooNonArabicCount = 0;
    const nameSourceCounts = {
      template: 0,
      template_ref: 0,
      product_name: 0,
      display_name: 0,
      fallback: 0
    };
    const seenProductIds = new Set();
    const upsertData = products.filter((product)=>{
      const pid = String(product.id);
      if (seenProductIds.has(pid)) return false;
      seenProductIds.add(pid);
      return true;
    }).map((product)=>{
      const localizedName = pickLocalizedProductName(product, templateById);
      nameSourceCounts[localizedName.source] += 1;
      if (hasArabic(localizedName.name)) {
        odooArabicCount += 1;
      } else {
        odooNonArabicCount += 1;
      }
      return {
        external_product_id: String(product.id),
        internal_reference: normalizeOdooText(product.default_code),
        product_name: localizedName.name,
        average_cost: toNullableNumber(product.standard_price) ?? 0,
        sales_price: toNullableNumber(product.list_price) ?? 0,
        quantity_on_hand: toNullableNumber(product.qty_available) ?? 0,
        incoming_quantity: toNullableNumber(product.incoming_qty) ?? 0,
        outgoing_quantity: toNullableNumber(product.outgoing_qty) ?? 0,
        unit_of_measure: referenceName(product.uom_id),
        source: "odoo_sync",
        raw_payload: product,
        odoo_created_at: toNullableIso(product.create_date),
        odoo_updated_at: toNullableIso(product.write_date),
        last_sync_at: syncTime,
        updated_at: syncTime
      };
    });
    const { error: upsertError } = await supabaseAdmin.from("products").upsert(upsertData, {
      onConflict: "external_product_id"
    });
    if (upsertError) {
      throw upsertError;
    }
    return jsonResponse({
      success: true,
      count: upsertData.length,
      full_sync: fullSync,
      odoo_arabic_count: odooArabicCount,
      odoo_non_arabic_count: odooNonArabicCount,
      name_source_counts: nameSourceCounts
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: formatUnknownError(error)
    }, 500);
  }
});
