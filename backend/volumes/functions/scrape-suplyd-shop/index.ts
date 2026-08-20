import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ============================================================
// Suplyd Shop Scraper - Edge Function
//
// Scrapes ALL products from shop.suplyd.com GraphQL API
// including cost_per_unit and all metadata.
//
// Approach:
// 1. Create guest user → get JWT auth token
// 2. Fetch all products via paginated GraphQL query
// 3. Upsert into suplyd_products_live (latest snapshot)
// 4. Insert batch record into suplyd_scrape_batches
// 5. Insert historical snapshots into suplyd_products_history
// ============================================================
const GRAPHQL_ENDPOINT = "https://router.suplyd.com/v1/graphql";
const PRODUCT_QUERY = `query getMarketProdsWithFiltering($input: ProductWhereConditionDTO!) {
  getMarketProducts(condition: $input) {
    products { ...ProductDetails }
    featured_products { ...ProductDetails }
    total_products_count
  }
}
fragment ProductDetails on ProductDTO {
  id name arabic_name image_url description ref_id slug price cost_per_unit
  stock_level unit base_unit base_unit_quantity container_quantity container_unit
  unit_weight min_order_quantity max_order_quantity
  allow_beyond_stock is_package_required is_a_bundle delivery_lead_time storage_type
  is_notification_set entity_max_use_count monthly_consumption restock_date
  coins_usage_deactivated coins_needed_for_pao coins_value_per_unit
  tax_percentage brand { id name arabic_name slug image_url is_local }
  sub_category { id name rank slug arabic_name ref_id category_id image_url
    category { id name slug arabic_name image_url is_bundle_category ref_id }
  }
  parent_of_bundles { id ref_id quantity child_product_id
    child_product { name arabic_name price tax_percentage image_url id is_active ref_id slug unit }
  }
  product_package { id ref_id package_name discount_amount conversion_units product_conversion_count arabic_name }
  promotions { id name type min_order_items max_discount_amt remaining_allowed_discount_amount remaining_allowed_use_count discount min_purchase_of min_order_amt ref_id }
}`;
const GUEST_MUTATION = `mutation createGuestUser($input: GuestCreationDTO!) {
  createGuestUser(input: $input) {
    user_id role refresh_token access_token
  }
}`;
function graphqlFetch(query, variables, headers) {
  return fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables
    })
  }).then((r)=>r.json());
}
function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function mapProduct(p) {
  return {
    id: p.id,
    ref_id: p.ref_id,
    name: p.name,
    arabic_name: p.arabic_name,
    slug: p.slug,
    description: p.description,
    price: toNum(p.price),
    cost_per_unit: toNum(p.cost_per_unit),
    tax_percentage: toNum(p.tax_percentage),
    stock_level: toNum(p.stock_level),
    unit: p.unit,
    base_unit: p.base_unit,
    base_unit_quantity: toNum(p.base_unit_quantity),
    container_quantity: toNum(p.container_quantity),
    container_unit: p.container_unit,
    unit_weight: toNum(p.unit_weight),
    min_order_quantity: toNum(p.min_order_quantity),
    max_order_quantity: toNum(p.max_order_quantity),
    allow_beyond_stock: p.allow_beyond_stock,
    is_package_required: p.is_package_required,
    is_a_bundle: p.is_a_bundle,
    delivery_lead_time: toNum(p.delivery_lead_time),
    storage_type: p.storage_type,
    is_notification_set: p.is_notification_set,
    entity_max_use_count: toNum(p.entity_max_use_count),
    monthly_consumption: toNum(p.monthly_consumption),
    restock_date: p.restock_date,
    coins_usage_deactivated: p.coins_usage_deactivated,
    coins_needed_for_pao: toNum(p.coins_needed_for_pao),
    coins_value_per_unit: toNum(p.coins_value_per_unit),
    brand_id: p.brand?.id ?? null,
    brand_name: p.brand?.name ?? null,
    brand_arabic_name: p.brand?.arabic_name ?? null,
    brand_slug: p.brand?.slug ?? null,
    brand_is_local: p.brand?.is_local ?? null,
    sub_category_id: p.sub_category?.id ?? null,
    sub_category_name: p.sub_category?.name ?? null,
    sub_category_arabic_name: p.sub_category?.arabic_name ?? null,
    sub_category_slug: p.sub_category?.slug ?? null,
    category_id: p.sub_category?.category?.id ?? null,
    category_name: p.sub_category?.category?.name ?? null,
    category_arabic_name: p.sub_category?.category?.arabic_name ?? null,
    category_slug: p.sub_category?.category?.slug ?? null,
    image_url: p.image_url,
    package_id: p.product_package?.id ?? null,
    package_ref_id: p.product_package?.ref_id ?? null,
    package_name: p.product_package?.package_name ?? null,
    package_arabic_name: p.product_package?.arabic_name ?? null,
    package_discount_amount: p.product_package?.discount_amount ?? null,
    package_conversion_units: p.product_package?.conversion_units ?? null,
    package_product_conversion_count: p.product_package?.product_conversion_count ?? null,
    promotion_ids: (p.promotions ?? []).map((x)=>x.id),
    promotion_names: (p.promotions ?? []).map((x)=>x.name),
    promotion_types: (p.promotions ?? []).map((x)=>x.type),
    promotion_discounts: (p.promotions ?? []).map((x)=>x.discount),
    bundle_child_ids: (p.parent_of_bundles ?? []).map((x)=>x.child_product?.id).filter(Boolean),
    bundle_child_names: (p.parent_of_bundles ?? []).map((x)=>x.child_product?.name).filter(Boolean),
    last_scraped_at: new Date().toISOString()
  };
}
function mapProductHistory(p, batchId) {
  return {
    batch_id: batchId,
    product_id: p.id,
    ref_id: p.ref_id,
    name: p.name,
    arabic_name: p.arabic_name,
    price: toNum(p.price),
    cost_per_unit: toNum(p.cost_per_unit),
    tax_percentage: toNum(p.tax_percentage),
    stock_level: toNum(p.stock_level),
    unit: p.unit,
    base_unit: p.base_unit,
    base_unit_quantity: toNum(p.base_unit_quantity),
    container_unit: p.container_unit,
    brand_name: p.brand?.name ?? null,
    category_name: p.sub_category?.category?.name ?? null,
    category_arabic_name: p.sub_category?.category?.arabic_name ?? null,
    sub_category_name: p.sub_category?.name ?? null,
    image_url: p.image_url,
    scraped_at: new Date().toISOString()
  };
}
serve(async (req)=>{
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);
  let batchId = null;
  try {
    // 1. Create batch record
    const { data: batch, error: batchErr } = await supabase.from("suplyd_scrape_batches").insert({
      status: "running",
      started_at: new Date().toISOString()
    }).select("id").single();
    if (batchErr) throw new Error(`Failed to create batch: ${batchErr.message}`);
    batchId = batch.id;
    // 2. Create guest user to get auth token
    const guestRes = await graphqlFetch(GUEST_MUTATION, {
      input: {}
    }, {});
    const guestData = guestRes.data;
    const createGuest = guestData?.createGuestUser;
    const accessToken = createGuest?.access_token;
    if (!accessToken) {
      throw new Error(`Failed to get guest token: ${JSON.stringify(guestRes.errors)}`);
    }
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "x-device-id": `supabase-edge-${Date.now()}`,
      "x-suplyd-request-source": "web"
    };
    // 3. Fetch all products with pagination
    const allProducts = [];
    let offset = 0;
    const limit = 500;
    let totalCount = 0;
    while(true){
      const res = await graphqlFetch(PRODUCT_QUERY, {
        input: {
          limit,
          offset,
          search: null,
          filter: {},
          sort: "RANK_ASC"
        }
      }, authHeaders);
      if (res.errors?.length) {
        throw new Error(`GraphQL error at offset ${offset}: ${res.errors[0].message}`);
      }
      const marketData = res.data?.getMarketProducts;
      const products = marketData?.products ?? [];
      totalCount = marketData?.total_products_count ?? totalCount;
      allProducts.push(...products);
      if (offset === 0) {
        console.log(`Total products reported by API: ${totalCount}`);
      }
      console.log(`Fetched ${products.length} products at offset ${offset}`);
      if (products.length < limit) break;
      offset += limit;
    }
    console.log(`Total fetched: ${allProducts.length} products`);
    // 4. Upsert into live table (batch of 100)
    const liveRows = allProducts.map(mapProduct);
    for(let i = 0; i < liveRows.length; i += 100){
      const chunk = liveRows.slice(i, i + 100);
      const { error } = await supabase.from("suplyd_products_live").upsert(chunk, {
        onConflict: "id"
      });
      if (error) throw new Error(`Live upsert error: ${error.message}`);
    }
    // 5. Insert historical snapshots (batch of 100)
    const historyRows = allProducts.map((p)=>mapProductHistory(p, batchId));
    for(let i = 0; i < historyRows.length; i += 100){
      const chunk = historyRows.slice(i, i + 100);
      const { error } = await supabase.from("suplyd_products_history").insert(chunk);
      if (error) throw new Error(`History insert error: ${error.message}`);
    }
    // 6. Update batch record
    const costCount = allProducts.filter((p)=>p.cost_per_unit != null).length;
    await supabase.from("suplyd_scrape_batches").update({
      status: "success",
      completed_at: new Date().toISOString(),
      products_fetched: allProducts.length,
      products_upserted: liveRows.length,
      products_with_cost: costCount,
      metadata: {
        total_from_api: totalCount,
        unique_brands: [
          ...new Set(allProducts.map((p)=>p.brand?.name).filter(Boolean))
        ].length,
        unique_categories: [
          ...new Set(allProducts.map((p)=>p.sub_category?.category?.name).filter(Boolean))
        ].length
      }
    }).eq("id", batchId);
    return new Response(JSON.stringify({
      success: true,
      batch_id: batchId,
      products_fetched: allProducts.length,
      products_with_cost: costCount,
      total_from_api: totalCount
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("Scrape failed:", err);
    // Update batch with error
    if (batchId) {
      await supabase.from("suplyd_scrape_batches").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err)
      }).eq("id", batchId);
    }
    return new Response(JSON.stringify({
      success: false,
      batch_id: batchId,
      error: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
