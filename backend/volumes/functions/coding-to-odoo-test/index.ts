import {
  callOdoo,
  corsHeaders,
  formatUnknownError,
  jsonResponse,
  requireOdooSyncAccess,
  supabaseAdmin,
  executeOdooKwWithCredentials,
} from "../_shared/odoo.ts";

const ODOO_DB_TEST = "TEST";

async function executeTestKw(
  model: string,
  method: string,
  args: any[],
  kwargs: any = {}
) {
  const uid = Number(Deno.env.get("ODOO_UID"));
  const password = Deno.env.get("ODOO_PASSWORD") ?? "";
  if (!Number.isFinite(uid) || uid <= 0 || !password) {
    throw new Error("Odoo service credentials not configured.");
  }
  const payload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [
        ODOO_DB_TEST,
        uid,
        password,
        model,
        method,
        args,
        { ...kwargs, context: { lang: "ar_001", ...kwargs.context } },
      ],
    },
    id: `coding-test-${model}-${method}-${Date.now()}`,
  };
  const response = await callOdoo(payload);
  return response?.result ?? response;
}

async function findOrCreateCategory(
  mainCat: string,
  subCat: string
): Promise<number | null> {
  if (!mainCat) return null;
  try {
    const cats = await executeTestKw(
      "product.category",
      "search_read",
      [[["name", "=", mainCat]]],
      { fields: ["id"], limit: 1 }
    );
    let parentId: number | null =
      Array.isArray(cats) && cats.length > 0 ? cats[0].id : null;

    if (!parentId) {
      parentId = await executeTestKw("product.category", "create", [
        { name: mainCat },
      ]);
    }

    if (subCat) {
      const subs = await executeTestKw(
        "product.category",
        "search_read",
        [
          [
            ["name", "=", subCat],
            ["parent_id", "=", parentId],
          ],
        ],
        { fields: ["id"], limit: 1 }
      );
      if (Array.isArray(subs) && subs.length > 0) return subs[0].id;

      const newSubId = await executeTestKw("product.category", "create", [
        { name: subCat, parent_id: parentId },
      ]);
      return newSubId;
    }

    return parentId;
  } catch (e) {
    console.error("[findOrCreateCategory]", e);
    return null;
  }
}

async function findOrCreateTag(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const tags = await executeTestKw(
      "product.tag",
      "search_read",
      [[["name", "=", name]]],
      { fields: ["id"], limit: 1 }
    );
    if (Array.isArray(tags) && tags.length > 0) return tags[0].id;

    const newId = await executeTestKw("product.tag", "create", [{ name }]);
    return newId;
  } catch (e) {
    console.error("[findOrCreateTag]", e);
    return null;
  }
}

async function resolveUom(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const uoms = await executeTestKw(
      "uom.uom",
      "search_read",
      [[["name", "ilike", name]]],
      { fields: ["id"], limit: 1 }
    );
    if (Array.isArray(uoms) && uoms.length > 0) return uoms[0].id;
  } catch {}
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const authResponse = await requireOdooSyncAccess(req);
  if (authResponse) return authResponse;

  try {
    const body = await req.json().catch(() => ({}));

    const codingData = body?.coding_data;
    if (!codingData || typeof codingData !== "object") {
      return jsonResponse(
        { success: false, error: "coding_data is required." },
        400
      );
    }

    const {
      new_code,
      original_name,
      normalized_name,
      english_name,
      main_category,
      sub_category,
      sale_price,
      cost,
      is_active,
      barcode,
      hs_code,
      weight,
      volume,
      uom_sale,
      description_sale,
      description_purchase,
      tags,
      product_type,
      sale_ok,
      purchase_ok,
      country_of_origin,
    } = codingData;

    const categId = await findOrCreateCategory(
      main_category || "",
      sub_category || ""
    );

    const tagId = await findOrCreateTag(tags || english_name || "");
    const brandTagId = await findOrCreateTag(
      codingData.brand_normalized || codingData.brand || ""
    );

    const uomId = await resolveUom(uom_sale || "Units");
    const uomPoId = await resolveUom(uom_sale || "Units");

    const productName = [original_name, english_name]
      .filter(Boolean)
      .join(" | ");

    const productVals: Record<string, any> = {
      name: productName || original_name || `Product ${new_code}`,
      default_code: new_code || undefined,
      list_price: Number(sale_price) || 0,
      active: is_active !== false,
    };

    if (categId) productVals.categ_id = categId;
    if (barcode) productVals.barcode = barcode;
    if (hs_code) productVals.hs_code = hs_code;
    if (uomId) productVals.uom_id = uomId;
    if (uomPoId) productVals.uom_po_id = uomPoId;
    if (weight) productVals.weight = Number(weight);
    if (volume) productVals.volume = Number(volume);
    if (typeof sale_ok === "boolean") productVals.sale_ok = sale_ok;
    if (typeof purchase_ok === "boolean") productVals.purchase_ok = purchase_ok;
    if (country_of_origin) productVals.country_of_origin = country_of_origin;

    const desc = [description_sale, description_purchase]
      .filter(Boolean)
      .join("\n\n");
    if (desc) productVals.description_sale = desc;

    const tagIds: number[] = [];
    if (tagId) tagIds.push(tagId);
    if (brandTagId && brandTagId !== tagId) tagIds.push(brandTagId);
    if (tagIds.length > 0) productVals.product_tag_ids = [[6, 0, tagIds]];

    let odooProductId: number | null = null;

    if (new_code) {
      const existing = await executeTestKw(
        "product.template",
        "search_read",
        [[["default_code", "=", new_code]]],
        { fields: ["id"], limit: 1 }
      );
      if (Array.isArray(existing) && existing.length > 0) {
        odooProductId = existing[0].id;
        await executeTestKw("product.template", "write", [
          [odooProductId],
          productVals,
        ]);
      }
    }

    if (!odooProductId) {
      odooProductId = await executeTestKw("product.template", "create", [
        productVals,
      ]);
    }

    return jsonResponse({
      success: true,
      odoo_product_id: odooProductId,
      odoo_db: ODOO_DB_TEST,
      default_code: new_code,
    });
  } catch (error) {
    return jsonResponse(
      { success: false, error: formatUnknownError(error) },
      500
    );
  }
});
