import { buildLastSyncDate, corsHeaders, fetchOdooBatches, jsonResponse, referenceName, requireOdooSyncAccess, supabaseAdmin, toRecordStatus } from "../_shared/odoo.ts";
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const authResponse = await requireOdooSyncAccess(req);
  if (authResponse) return authResponse;
  try {
    const { data: latestRow, error: latestError } = await supabaseAdmin.from("logistics_warehouses").select("last_sync_at").not("last_sync_at", "is", null).order("last_sync_at", {
      ascending: false
    }).limit(1).maybeSingle();
    if (latestError) {
      throw latestError;
    }
    const lastSyncDate = buildLastSyncDate(latestRow?.last_sync_at ?? null);
    const warehouses = await fetchOdooBatches({
      model: "stock.warehouse",
      fields: [
        "id",
        "name",
        "code",
        "active",
        "company_id",
        "partner_id",
        "view_location_id",
        "lot_stock_id",
        "out_type_id",
        "in_type_id",
        "pick_type_id",
        "pack_type_id",
        "int_type_id",
        "create_date",
        "write_date"
      ],
      domain: [
        [
          "write_date",
          ">",
          lastSyncDate
        ]
      ],
      batchSize: 200,
      order: "write_date desc"
    });
    if (warehouses.length === 0) {
      return jsonResponse({
        success: true,
        count: 0,
        message: "No warehouses to sync"
      });
    }
    const syncTime = new Date().toISOString();
    const upsertData = warehouses.map((warehouse)=>({
        external_warehouse_id: String(warehouse.id),
        warehouse_name: String(warehouse.name ?? "").trim() || `Warehouse ${warehouse.id}`,
        warehouse_code: String(warehouse.code ?? "").trim() || null,
        company_name: referenceName(warehouse.company_id),
        partner_ref: referenceName(warehouse.partner_id),
        view_location_ref: referenceName(warehouse.view_location_id),
        stock_location_ref: referenceName(warehouse.lot_stock_id),
        out_type_ref: referenceName(warehouse.out_type_id),
        in_type_ref: referenceName(warehouse.in_type_id),
        pick_type_ref: referenceName(warehouse.pick_type_id),
        pack_type_ref: referenceName(warehouse.pack_type_id),
        int_type_ref: referenceName(warehouse.int_type_id),
        status: toRecordStatus(warehouse.active),
        raw_payload: warehouse,
        last_sync_at: syncTime,
        updated_at: syncTime
      }));
    const { error: upsertError } = await supabaseAdmin.from("logistics_warehouses").upsert(upsertData, {
      onConflict: "external_warehouse_id"
    });
    if (upsertError) {
      throw upsertError;
    }
    return jsonResponse({
      success: true,
      count: upsertData.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({
      success: false,
      error: message
    }, 500);
  }
});
