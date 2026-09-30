import { buildLastSyncDate, corsHeaders, fetchOdooBatches, fetchOdooFieldNames, formatUnknownError, jsonResponse, referenceId, referenceName, requireOdooSyncAccess, supabaseAdmin, toNullableIso, toNullableNumber } from "../_shared/odoo.ts";
function isPresent(value) {
  return value != null;
}
function dedupeRowsById(rows) {
  return [
    ...new Map(rows.map((row)=>[
        row.id,
        row
      ])).values()
  ];
}
function dedupeRecordsByKey(rows, getKey) {
  const seen = new Map();
  for (const row of rows){
    const key = getKey(row);
    if (!key) continue;
    seen.set(key, row);
  }
  return [
    ...seen.values()
  ];
}
function parseNonNegativeInteger(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : fallback;
}
function utcDayOffset(days) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 0, 0, 0, 0));
}
function formatOdooDateTime(value) {
  return value.toISOString().replace("T", " ").split(".")[0];
}
function mapDeliveryPhase(state) {
  switch(String(state ?? "").trim().toLowerCase()){
    case "done":
      return "delivered";
    case "cancel":
      return "cancelled";
    case "assigned":
    case "ready":
      return "ready";
    case "waiting":
    case "confirmed":
    case "draft":
    default:
      return "pending";
  }
}
const TERMINAL_SYNC_PHASES = new Set(["delivered", "cancelled"]);
const INITIAL_SYNC_PHASES = new Set(["", "pending", "ready", "assigned"]);
function resolveSyncDeliveryPhase(mappedPhase, existingPhase, assignedToDriver) {
  const currentPhase = String(existingPhase ?? "").trim().toLowerCase();
  const driverAdvanced = currentPhase !== "" && !INITIAL_SYNC_PHASES.has(currentPhase);
  if (driverAdvanced) {
    return currentPhase;
  }
  if (assignedToDriver && currentPhase) {
    return currentPhase;
  }
  if (!TERMINAL_SYNC_PHASES.has(mappedPhase)) {
    return mappedPhase;
  }
  if (currentPhase && currentPhase !== mappedPhase) {
    return currentPhase;
  }
  return currentPhase || mappedPhase;
}
async function fetchRowsByExternalIds(tableName, selectColumns, columnName, ids) {
  const rows = [];
  const chunkSize = 75;
  for(let index = 0; index < ids.length; index += chunkSize){
    const chunk = ids.slice(index, index + chunkSize);
    if (chunk.length === 0) continue;
    const { data, error } = await supabaseAdmin.from(tableName).select(selectColumns).in(columnName, chunk);
    if (error) {
      throw error;
    }
    rows.push(...data ?? []);
  }
  return rows;
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
    const syncStartTime = Date.now();
    const configuredMaxRows = Number(Deno.env.get("ODOO_SHIPMENTS_MAX_ROWS") ?? "");
    const maxRows = Number.isFinite(configuredMaxRows) && configuredMaxRows > 0 ? configuredMaxRows : undefined;
    const upcomingLookaheadDays = parseNonNegativeInteger(Deno.env.get("ODOO_SHIPMENTS_UPCOMING_LOOKAHEAD_DAYS"), 21);
    const upcomingPastGraceDays = parseNonNegativeInteger(Deno.env.get("ODOO_SHIPMENTS_UPCOMING_PAST_GRACE_DAYS"), 2);
    // Use watermarks table for more reliable sync cursor
    const { data: watermark } = await supabaseAdmin.from("logistics_sync_watermarks").select("last_sync_at").eq("entity_type", "shipments").maybeSingle();
    // Fallback to shipment table if no watermark exists
    let lastSyncDate;
    let lastSyncCursorDate = null;
    if (watermark?.last_sync_at) {
      lastSyncCursorDate = watermark.last_sync_at;
      lastSyncDate = buildLastSyncDate(watermark.last_sync_at);
    } else {
      const { data: latestRow, error: latestError } = await supabaseAdmin.from("logistics_shipments").select("odoo_updated_at, last_sync_at").or("odoo_updated_at.not.is.null,last_sync_at.not.is.null").order("odoo_updated_at", {
        ascending: false,
        nullsFirst: false
      }).order("last_sync_at", {
        ascending: false,
        nullsFirst: false
      }).limit(1).maybeSingle();
      if (latestError) {
        throw latestError;
      }
      lastSyncCursorDate = latestRow?.odoo_updated_at ?? latestRow?.last_sync_at ?? null;
      lastSyncDate = buildLastSyncDate(lastSyncCursorDate);
    }
    const incrementalShipments = await fetchOdooBatches({
      model: "stock.picking",
      fields: [
        "id",
        "name",
        "origin",
        "state",
        "scheduled_date",
        "date_done",
        "create_date",
        "write_date",
        "partner_id",
        "company_id",
        "picking_type_id",
        "location_id",
        "location_dest_id",
        "user_id",
        "move_type",
        "priority",
        "weight",
        "note"
      ],
      domain: [
        [
          "picking_type_id.code",
          "=",
          "outgoing"
        ],
        [
          "write_date",
          ">",
          lastSyncDate
        ]
      ],
      batchSize: 100,
      maxRows,
      order: "write_date asc"
    });
    let upcomingShipments = [];
    if (upcomingLookaheadDays > 0) {
      const upcomingStart = formatOdooDateTime(utcDayOffset(-upcomingPastGraceDays));
      const upcomingEnd = formatOdooDateTime(utcDayOffset(upcomingLookaheadDays + 1));
      upcomingShipments = await fetchOdooBatches({
        model: "stock.picking",
        fields: [
          "id",
          "name",
          "origin",
          "state",
          "scheduled_date",
          "date_done",
          "create_date",
          "write_date",
          "partner_id",
          "company_id",
          "picking_type_id",
          "location_id",
          "location_dest_id",
          "user_id",
          "move_type",
          "priority",
          "weight",
          "note"
        ],
        domain: [
          [
            "picking_type_id.code",
            "=",
            "outgoing"
          ],
          [
            "scheduled_date",
            ">=",
            upcomingStart
          ],
          [
            "scheduled_date",
            "<",
            upcomingEnd
          ]
        ],
        batchSize: 100,
        maxRows,
        order: "scheduled_date asc"
      });
    }
    const shipments = dedupeRowsById([
      ...incrementalShipments,
      ...upcomingShipments
    ]);
    if (shipments.length === 0) {
      return jsonResponse({
        success: true,
        count: 0,
        message: "No shipments to sync"
      });
    }
    const partnerIds = Array.from(new Set(shipments.map((shipment)=>referenceId(shipment.partner_id)).filter(isPresent)));
    const userIds = Array.from(new Set(shipments.map((shipment)=>referenceId(shipment.user_id)).filter(isPresent)));
    const shipmentOriginNames = Array.from(new Set(shipments.map((shipment)=>String(shipment.origin ?? "").trim()).filter(Boolean)));
    const moveShipmentIds = shipments.map((shipment)=>shipment.id);
    const [customers, orders, warehousesRes, logisticsUsers] = await Promise.all([
      partnerIds.length > 0 ? fetchRowsByExternalIds("customers", "id, external_customer_id, customer_name, lat, lng", "external_customer_id", partnerIds) : Promise.resolve([]),
      shipmentOriginNames.length > 0 ? fetchRowsByExternalIds("orders", "id, external_order_id, odoo_order_name, commitment_date", "odoo_order_name", shipmentOriginNames) : Promise.resolve([]),
      supabaseAdmin.from("logistics_warehouses").select("id, external_warehouse_id, warehouse_name, out_type_ref, in_type_ref, pick_type_ref, pack_type_ref, int_type_ref"),
      userIds.length > 0 ? fetchRowsByExternalIds("logistics_users", "id, external_user_id, employee_name, job_title, linked_profile_id", "external_user_id", userIds) : Promise.resolve([])
    ]);
    if (warehousesRes.error) throw warehousesRes.error;
    const warehouseRows = warehousesRes.data ?? [];
    const customersByExternalId = new Map(customers.map((customer)=>[
        customer.external_customer_id,
        customer
      ]));
    const ordersByName = new Map(orders.filter((order)=>order.odoo_order_name).map((order)=>[
        String(order.odoo_order_name),
        order
      ]));
    const warehouseByOperationRef = new Map();
    for (const warehouse of warehouseRows){
      for (const key of [
        warehouse.out_type_ref,
        warehouse.in_type_ref,
        warehouse.pick_type_ref,
        warehouse.pack_type_ref,
        warehouse.int_type_ref
      ]){
        const ref = String(key ?? "").trim();
        if (!ref) continue;
        warehouseByOperationRef.set(ref, warehouse);
      }
    }
    const logisticsUsersByExternalId = new Map(logisticsUsers.map((user)=>[
        user.external_user_id,
        user
      ]));
    const existingShipments = await fetchRowsByExternalIds("logistics_shipments", "id, external_shipment_id, delivery_phase, assigned_profile_id", "external_shipment_id", moveShipmentIds);
    const existingPhaseByExternalId = new Map(existingShipments.map((row)=>[
        String(row.external_shipment_id),
        row.delivery_phase
      ]));
    const existingAssignedProfileByExternalId = new Map(existingShipments.map((row)=>[
        String(row.external_shipment_id),
        row.assigned_profile_id
      ]));
    const syncTime = new Date().toISOString();
    const shipmentUpsertData = shipments.map((shipment)=>{
      const externalCustomerId = referenceId(shipment.partner_id);
      const externalUserId = referenceId(shipment.user_id);
      const customer = externalCustomerId ? customersByExternalId.get(externalCustomerId) : null;
      const originRef = String(shipment.origin ?? "").trim();
      const order = originRef ? ordersByName.get(originRef) : null;
      const orderReference = order?.odoo_order_name ?? order?.external_order_id ?? originRef;
      const operationRef = referenceName(shipment.picking_type_id);
      const warehouse = operationRef ? warehouseByOperationRef.get(operationRef) : null;
      const logisticsUser = externalUserId ? logisticsUsersByExternalId.get(externalUserId) : null;
      return {
        external_shipment_id: String(shipment.id),
        shipment_reference: orderReference ? `SH-${orderReference}` : `SH-${shipment.id}`,
        origin_ref: originRef || null,
        external_order_id: order?.external_order_id ?? null,
        odoo_order_name: order?.odoo_order_name ?? (originRef || null),
        linked_order_id: order?.id ?? null,
        customer_id: customer?.id ?? null,
        external_customer_id: externalCustomerId,
        customer_name: customer?.customer_name ?? referenceName(shipment.partner_id),
        customer_latitude: customer?.lat ?? null,
        customer_longitude: customer?.lng ?? null,
        warehouse_id: warehouse?.id ?? null,
        external_warehouse_id: warehouse?.external_warehouse_id ?? null,
        warehouse_name: warehouse?.warehouse_name ?? null,
        logistics_user_id: logisticsUser?.id ?? null,
        assigned_profile_id: logisticsUser?.linked_profile_id ?? existingAssignedProfileByExternalId.get(String(shipment.id)) ?? null,
        external_user_id: externalUserId,
        assigned_user_name: logisticsUser?.employee_name ?? referenceName(shipment.user_id),
        assigned_job_title: logisticsUser?.job_title ?? null,
        operation_type_name: referenceName(shipment.picking_type_id),
        operation_type_ref: referenceId(shipment.picking_type_id),
        source_location_ref: referenceName(shipment.location_id),
        destination_location_ref: referenceName(shipment.location_dest_id),
        shipment_state: String(shipment.state ?? "").trim() || "draft",
        delivery_phase: resolveSyncDeliveryPhase(mapDeliveryPhase(shipment.state), existingPhaseByExternalId.get(String(shipment.id)), Boolean(existingAssignedProfileByExternalId.get(String(shipment.id)))),
        priority: String(shipment.priority ?? "").trim() || null,
        move_type: String(shipment.move_type ?? "").trim() || null,
        scheduled_at: toNullableIso(order?.commitment_date ?? shipment.scheduled_date),
        completed_at: toNullableIso(shipment.date_done),
        odoo_created_at: toNullableIso(shipment.create_date),
        odoo_updated_at: toNullableIso(shipment.write_date),
        total_weight: toNullableNumber(shipment.weight),
        notes: String(shipment.note ?? "").trim() || null,
        raw_payload: shipment,
        last_sync_at: syncTime,
        updated_at: syncTime
      };
    });
    const { data: savedShipments, error: shipmentUpsertError } = await supabaseAdmin.from("logistics_shipments").upsert(shipmentUpsertData, {
      onConflict: "external_shipment_id"
    }).select("id, external_shipment_id");
    if (shipmentUpsertError) {
      throw shipmentUpsertError;
    }
    const shipmentIds = savedShipments ?? [];
    const shipmentIdMap = new Map(shipmentIds.map((row)=>[
        row.external_shipment_id,
        row.id
      ]));
    const moveFieldNames = await fetchOdooFieldNames("stock.move");
    const requestedMoveFields = [
      "id",
      "picking_id",
      "product_id",
      "name",
      "product_uom_qty",
      "quantity",
      "reserved_availability",
      "forecast_availability",
      "state",
      "location_id",
      "location_dest_id"
    ];
    const moveFields = requestedMoveFields.filter((field)=>moveFieldNames.has(field));
    const moves = await fetchOdooBatches({
      model: "stock.move",
      fields: moveFields,
      domain: [
        [
          "picking_id",
          "in",
          moveShipmentIds
        ]
      ],
      batchSize: 1000
    });
    if (moves.length > 0) {
      const productExternalIds = Array.from(new Set(moves.map((move)=>referenceId(move.product_id)).filter(isPresent)));
      // Skip odoo_sync items for shipments+products that already have order_line_sync rows
      const shipmentIdsArray = Array.from(shipmentIdMap.values());
      const { data: existingOrderLineItems } = await supabaseAdmin.from("logistics_shipment_items").select("shipment_id, external_product_id").in("shipment_id", shipmentIdsArray).eq("source", "order_line_sync");
      const orderLineKeySet = new Set((existingOrderLineItems ?? []).map((item)=>`${item.shipment_id}:${item.external_product_id}`));
      const products = productExternalIds.length > 0 ? await fetchRowsByExternalIds("products", "id, external_product_id, product_name", "external_product_id", productExternalIds) : [];
      const productsByExternalId = new Map(products.map((product)=>[
          product.external_product_id,
          product
        ]));
      const itemUpsertData = moves.map((move)=>{
        const externalShipmentId = referenceId(move.picking_id);
        const shipmentId = externalShipmentId ? shipmentIdMap.get(externalShipmentId) : null;
        if (!shipmentId) return null;
        const externalProductId = referenceId(move.product_id);
        // Skip if this shipment+product already has order_line_sync items
        if (externalProductId && orderLineKeySet.has(`${shipmentId}:${externalProductId}`)) {
          return null;
        }
        const product = externalProductId ? productsByExternalId.get(externalProductId) : null;
        return {
          shipment_id: shipmentId,
          external_move_id: String(move.id),
          product_id: product?.id ?? null,
          external_product_id: externalProductId,
          product_name: product?.product_name ?? referenceName(move.product_id) ?? (String(move.name ?? "").trim() || `Move ${move.id}`),
          product_ref: referenceName(move.product_id),
          requested_quantity: toNullableNumber(move.product_uom_qty) ?? 0,
          done_quantity: toNullableNumber(move.quantity) ?? 0,
          reserved_quantity: toNullableNumber(move.reserved_availability) ?? 0,
          forecast_quantity: toNullableNumber(move.forecast_availability) ?? 0,
          move_state: String(move.state ?? "").trim() || null,
          source_location_ref: referenceName(move.location_id),
          destination_location_ref: referenceName(move.location_dest_id),
          raw_payload: move,
          last_sync_at: syncTime,
          updated_at: syncTime
        };
      }).filter(isPresent);
      if (itemUpsertData.length > 0) {
        const uniqueItemUpsertData = dedupeRecordsByKey(itemUpsertData, (item)=>item.external_move_id);
        const { error: itemUpsertError } = await supabaseAdmin.from("logistics_shipment_items").upsert(uniqueItemUpsertData, {
          onConflict: "external_move_id"
        });
        if (itemUpsertError) {
          throw itemUpsertError;
        }
      }
    }
    // Update sync watermark on success
    const syncDuration = Date.now() - syncStartTime;
    const latestShipmentWriteDate = shipments.map((shipment)=>toNullableIso(shipment.write_date)).filter(isPresent).sort().at(-1) ?? null;
    const nextWatermark = [
      lastSyncCursorDate,
      latestShipmentWriteDate,
      syncTime
    ].filter(isPresent).sort().at(-1) ?? syncTime;
    await supabaseAdmin.from("logistics_sync_watermarks").upsert({
      entity_type: "shipments",
      last_sync_at: nextWatermark,
      last_sync_row_count: shipmentUpsertData.length,
      last_sync_duration_ms: syncDuration,
      last_error: null,
      updated_at: syncTime
    }, {
      onConflict: "entity_type"
    }).select().maybeSingle();
    return jsonResponse({
      success: true,
      count: shipmentUpsertData.length,
      incremental_count: incrementalShipments.length,
      upcoming_safety_count: upcomingShipments.length,
      upcoming_lookahead_days: upcomingLookaheadDays
    });
  } catch (error) {
    const message = formatUnknownError(error);
    // Log error to watermarks for monitoring
    await supabaseAdmin.from("logistics_sync_watermarks").upsert({
      entity_type: "shipments",
      last_error: message,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "entity_type"
    }).select().maybeSingle();
    return jsonResponse({
      success: false,
      error: message
    }, 500);
  }
});
