import { buildLastSyncDate, corsHeaders, fetchOdooBatches, fetchOdooByIds, fetchOdooFieldNames, jsonResponse, referenceId, referenceName, requireOdooSyncAccess, supabaseAdmin, toNullableIso, toNullableNumber } from '../_shared/odoo.ts';
function isPresent(value) {
  return value != null;
}
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
function flattenReference(value) {
  if (Array.isArray(value)) {
    const parts = value.map((part)=>String(part ?? '').trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(' | ') : null;
  }
  const raw = String(value ?? '').trim();
  return raw || null;
}
function mapOdooStatus(state) {
  switch(String(state ?? '').trim()){
    case 'draft':
    case 'sent':
      return 'pending';
    case 'sale':
      return 'confirmed';
    case 'done':
      return 'delivered';
    case 'cancel':
      return 'cancelled';
    default:
      return 'pending';
  }
}
function isActualSalesOrder(order) {
  const typeName = typeof order.type_name === 'string' ? order.type_name.trim().toLowerCase() : '';
  const state = String(order.state ?? '').trim().toLowerCase();
  if (typeName) {
    return typeName === 'sales order';
  }
  if (state) {
    return ['draft', 'sent', 'sale', 'done', 'cancel'].includes(state);
  }
  return false;
}
function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}
function chunkArray(items, size) {
  const chunks = [];
  for(let index = 0; index < items.length; index += size){
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
function dedupeRowsById(rows) {
  return [
    ...new Map(rows.map((row)=>[
        row.id,
        row
      ])).values()
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
  return value.toISOString().replace('T', ' ').split('.')[0];
}
async function fetchByIdsInChunks({ model, ids, fields, chunkSize = 250 }) {
  const rows = [];
  for (const chunk of chunkArray(ids, chunkSize)){
    const batch = await fetchOdooByIds({
      model,
      ids: chunk,
      fields
    });
    rows.push(...batch);
  }
  return rows;
}
async function insertRowsInChunks(table, rows, chunkSize = 250) {
  for (const chunk of chunkArray(rows, chunkSize)){
    const { error } = await supabaseAdmin.from(table).insert(chunk);
    if (error) {
      throw error;
    }
  }
}
async function upsertOrdersInChunks(rows, chunkSize = 250) {
  for (const chunk of chunkArray(rows, chunkSize)){
    const { error } = await supabaseAdmin.from('orders').upsert(chunk, {
      onConflict: 'external_order_id'
    });
    if (error) {
      throw error;
    }
  }
}
async function fetchCustomersByExternalIds(externalCustomerIds, chunkSize = 200) {
  const rows = [];
  for (const chunk of chunkArray(externalCustomerIds, chunkSize)){
    const { data, error } = await supabaseAdmin.from('customers').select('id, external_customer_id').in('external_customer_id', chunk);
    if (error) {
      throw error;
    }
    rows.push(...data ?? []);
  }
  return rows;
}
async function fetchPersistedOrdersByExternalIds(externalOrderIds, chunkSize = 200) {
  const rows = [];
  for (const chunk of chunkArray(externalOrderIds, chunkSize)){
    const { data, error } = await supabaseAdmin.from('orders').select('id, external_order_id, odoo_order_name').in('external_order_id', chunk);
    if (error) {
      throw error;
    }
    rows.push(...data ?? []);
  }
  return rows;
}
async function deleteOrderDetailRows(orderIds, chunkSize = 200) {
  for (const chunk of chunkArray(orderIds, chunkSize)){
    const [lineDelete, deliveryDelete, invoiceDelete] = await Promise.all([
      supabaseAdmin.from('order_line_items').delete().in('order_id', chunk),
      supabaseAdmin.from('order_delivery_documents').delete().in('order_id', chunk),
      supabaseAdmin.from('order_invoice_documents').delete().in('order_id', chunk)
    ]);
    if (lineDelete.error) throw lineDelete.error;
    if (deliveryDelete.error) throw deliveryDelete.error;
    if (invoiceDelete.error) throw invoiceDelete.error;
  }
}
async function deleteInvoiceRowsByOrderIds(orderIds, chunkSize = 200) {
  for (const chunk of chunkArray(orderIds, chunkSize)){
    const { error } = await supabaseAdmin.from('order_invoice_documents').delete().in('order_id', chunk);
    if (error) {
      throw error;
    }
  }
}
async function fetchByDomainChunks({ model, field, values, fields, extraDomain = [], chunkSize = 200, order }) {
  const rows = [];
  if (values.length === 0) {
    return rows;
  }
  for (const chunk of chunkArray(values, chunkSize)){
    const domain = [
      [
        field,
        'in',
        chunk
      ],
      ...extraDomain
    ];
    const batch = await fetchOdooBatches({
      model,
      fields,
      domain,
      batchSize: 500,
      ...order ? {
        order
      } : {}
    });
    rows.push(...batch);
  }
  return rows;
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const authResponse = await requireOdooSyncAccess(req);
  if (authResponse) return authResponse;
  let stage = 'boot';
  try {
    stage = 'parse-request';
    const requestBody = await req.json().catch(()=>({}));
    const backfillExisting = Boolean(requestBody && typeof requestBody === 'object' && 'backfill_existing' in requestBody && requestBody.backfill_existing === true);
    const upcomingLookaheadDays = parseNonNegativeInteger(Deno.env.get('ODOO_ORDERS_UPCOMING_LOOKAHEAD_DAYS'), 21);
    const upcomingPastGraceDays = parseNonNegativeInteger(Deno.env.get('ODOO_ORDERS_UPCOMING_PAST_GRACE_DAYS'), 2);
    stage = 'load-last-sync';
    const { data: lastOrder, error: lastOrderError } = await supabaseAdmin.from('orders').select('last_sync_at').not('last_sync_at', 'is', null).order('last_sync_at', {
      ascending: false
    }).limit(1).maybeSingle();
    if (lastOrderError) {
      throw lastOrderError;
    }
    const lastSyncDate = buildLastSyncDate(lastOrder?.last_sync_at ?? null);
    stage = 'fetch-order-fields';
    const orderFieldNames = await fetchOdooFieldNames('sale.order');
    const requestedOrderFields = [
      'id',
      'name',
      'create_date',
      'write_date',
      'date_order',
      'commitment_date',
      'delivery_status',
      'user_id',
      'amount_to_invoice',
      'amount_total',
      'amount_undiscounted',
      'amount_untaxed',
      'partner_id',
      'partner_shipping_id',
      'payment_term_id',
      'access_url',
      'company_id',
      'create_uid',
      'fiscal_position_id',
      'invoice_status',
      'margin',
      'margin_percent',
      'planning_initial_date',
      'pricelist_id',
      'shipping_weight',
      'team_id',
      'type_name',
      'warehouse_id',
      'state',
      'client_order_ref',
      'order_line'
    ];
    const orderFields = requestedOrderFields.filter((field)=>orderFieldNames.has(field));
    const salesOrderDomain = orderFieldNames.has('state') ? [
      [
        'state',
        'in',
        [
          'draft',
          'sent',
          'sale',
          'done',
          'cancel'
        ]
      ]
    ] : orderFieldNames.has('type_name') ? [
      [
        'type_name',
        '=',
        'Sales Order'
      ]
    ] : [];
    let orders = [];
    let skippedNonSalesOrderCount = 0;
    let incrementalOrderCount = 0;
    let upcomingSafetyOrderCount = 0;
    if (backfillExisting) {
      stage = 'load-existing-order-ids';
      const { data: existingOrderRows, error: existingOrderRowsError } = await supabaseAdmin.from('orders').select('external_order_id').not('external_order_id', 'is', null).range(0, 1999);
      if (existingOrderRowsError) {
        throw existingOrderRowsError;
      }
      const existingOrderIds = [
        ...new Set((existingOrderRows ?? []).map((row)=>Number(row.external_order_id)).filter(isFiniteNumber))
      ];
      stage = 'fetch-existing-orders-from-odoo';
      orders = await fetchByIdsInChunks({
        model: 'sale.order',
        ids: existingOrderIds,
        fields: orderFields,
        chunkSize: 200
      });
    } else {
      stage = 'fetch-incremental-orders-from-odoo';
      const incrementalOrders = await fetchOdooBatches({
        model: 'sale.order',
        fields: orderFields,
        domain: [
          ...salesOrderDomain,
          [
            'write_date',
            '>',
            lastSyncDate
          ]
        ],
        batchSize: 500,
        order: 'write_date desc'
      });
      incrementalOrderCount = incrementalOrders.length;
      let upcomingOrders = [];
      if (upcomingLookaheadDays > 0 && orderFieldNames.has('commitment_date')) {
        stage = 'fetch-upcoming-orders-safety-window-from-odoo';
        const upcomingStart = formatOdooDateTime(utcDayOffset(-upcomingPastGraceDays));
        const upcomingEnd = formatOdooDateTime(utcDayOffset(upcomingLookaheadDays + 1));
        upcomingOrders = await fetchOdooBatches({
          model: 'sale.order',
          fields: orderFields,
          domain: [
            ...salesOrderDomain,
            [
              'commitment_date',
              '>=',
              upcomingStart
            ],
            [
              'commitment_date',
              '<',
              upcomingEnd
            ]
          ],
          batchSize: 500,
          order: 'commitment_date asc'
        });
        upcomingSafetyOrderCount = upcomingOrders.length;
      }
      orders = dedupeRowsById([
        ...incrementalOrders,
        ...upcomingOrders
      ]);
    }
    const fetchedOrderCount = orders.length;
    orders = orders.filter(isActualSalesOrder);
    skippedNonSalesOrderCount = fetchedOrderCount - orders.length;
    const externalCustomerIds = [
      ...new Set(orders.map((order)=>String(referenceId(order.partner_id) ?? '').trim()).filter(Boolean))
    ];
    stage = 'resolve-customers-and-profiles';
    const [customersRes, profilesRes] = await Promise.all([
      externalCustomerIds.length > 0 ? fetchCustomersByExternalIds(externalCustomerIds) : Promise.resolve([]),
      supabaseAdmin.from('profiles').select('id, full_name, email')
    ]);
    if (profilesRes.error) {
      throw profilesRes.error;
    }
    const customerRows = customersRes;
    const customerMap = new Map(customerRows.map((customer)=>[
        customer.external_customer_id,
        customer.id
      ]));
    const profilesByName = new Map();
    for (const profile of profilesRes.data ?? []){
      const key = normalizeName(profile.full_name);
      if (!key) continue;
      const current = profilesByName.get(key) ?? [];
      current.push(profile);
      profilesByName.set(key, current);
    }
    const syncTime = new Date().toISOString();
    stage = 'build-order-upsert-payload';
    const orderUpsertData = orders.map((order)=>{
      const assignedName = referenceName(order.user_id);
      const profileMatch = assignedName ? profilesByName.get(normalizeName(assignedName)) ?? [] : [];
      return {
        external_order_id: String(order.id),
        customer_id: customerMap.get(String(referenceId(order.partner_id) ?? '')) ?? null,
        customer_name: referenceName(order.partner_id),
        status: mapOdooStatus(order.state),
        order_date: toNullableIso(order.date_order ?? order.create_date),
        total_amount: toNullableNumber(order.amount_total) ?? 0,
        currency_code: 'EGP',
        assigned_user_id: profileMatch.length === 1 ? profileMatch[0].id : null,
        source: 'odoo_sync',
        odoo_order_name: String(order.name ?? '').trim() || null,
        create_date: toNullableIso(order.create_date),
        commitment_date: toNullableIso(order.commitment_date),
        delivery_status: String(order.delivery_status ?? '').trim() || null,
        user_id: flattenReference(order.user_id),
        amount_to_invoice: toNullableNumber(order.amount_to_invoice),
        amount_total: toNullableNumber(order.amount_total),
        amount_undiscounted: toNullableNumber(order.amount_undiscounted),
        amount_untaxed: toNullableNumber(order.amount_untaxed),
        partner_id: flattenReference(order.partner_id),
        shipping_partner_id: flattenReference(order.partner_shipping_id),
        payment_term_id: flattenReference(order.payment_term_id),
        access_url: String(order.access_url ?? '').trim() || null,
        company_id: flattenReference(order.company_id),
        create_uid: flattenReference(order.create_uid),
        fiscal_position_id: flattenReference(order.fiscal_position_id),
        invoice_status: String(order.invoice_status ?? '').trim() || null,
        margin: toNullableNumber(order.margin),
        margin_percent: String(order.margin_percent ?? '').trim() || null,
        planning_initial_date: toNullableIso(order.planning_initial_date)?.slice(0, 10) ?? null,
        pricelist_id: flattenReference(order.pricelist_id),
        shipping_weight: toNullableNumber(order.shipping_weight),
        state: String(order.state ?? '').trim() || null,
        team_id: flattenReference(order.team_id),
        type_name: String(order.type_name ?? '').trim() || null,
        warehouse_id: flattenReference(order.warehouse_id),
        raw_payload: order,
        last_sync_at: syncTime,
        updated_at: syncTime
      };
    });
    if (orderUpsertData.length > 0) {
      stage = 'upsert-orders';
      await upsertOrdersInChunks(orderUpsertData);
    }
    const externalOrderIds = orderUpsertData.map((order)=>order.external_order_id);
    stage = 'load-persisted-orders';
    const persistedOrders = await fetchPersistedOrdersByExternalIds(externalOrderIds);
    const orderRowByExternalId = new Map(persistedOrders.map((order)=>[
        String(order.external_order_id),
        order
      ]));
    const changedOrderRowIds = persistedOrders.map((order)=>order.id);
    if (changedOrderRowIds.length > 0) {
      stage = 'delete-existing-order-detail-rows';
      await deleteOrderDetailRows(changedOrderRowIds);
    }
    const orderLineIds = [
      ...new Set(orders.flatMap((order)=>Array.isArray(order.order_line) ? order.order_line : []).filter(isFiniteNumber))
    ];
    stage = 'fetch-order-line-fields';
    const orderLineFieldNames = await fetchOdooFieldNames('sale.order.line');
    const requestedOrderLineFields = [
      'id',
      'order_id',
      'product_id',
      'name',
      'product_uom_qty',
      'qty_delivered',
      'qty_invoiced',
      'price_unit',
      'price_subtotal',
      'price_total',
      'discount',
      'sequence',
      'product_uom',
      'display_type'
    ];
    const orderLineFields = requestedOrderLineFields.filter((field)=>orderLineFieldNames.has(field));
    stage = 'fetch-order-lines-from-odoo';
    const orderLines = await fetchByIdsInChunks({
      model: 'sale.order.line',
      ids: orderLineIds,
      fields: orderLineFields
    });
    const productIds = [
      ...new Set(orderLines.map((line)=>Number(referenceId(line.product_id))).filter(Number.isFinite))
    ];
    stage = 'fetch-product-fields';
    const productFieldNames = await fetchOdooFieldNames('product.product');
    const requestedProductFields = [
      'id',
      'default_code',
      'uom_id'
    ];
    const productFields = requestedProductFields.filter((field)=>productFieldNames.has(field));
    stage = 'fetch-products-from-odoo';
    const products = await fetchByIdsInChunks({
      model: 'product.product',
      ids: productIds,
      fields: productFields
    });
    const productById = new Map(products.map((product)=>[
        product.id,
        product
      ]));
    stage = 'build-line-insert-payload';
    const lineInsertData = orderLines.filter((line)=>{
      const displayType = String(line.display_type ?? '').trim().toLowerCase();
      if (displayType === 'line_note' || displayType === 'line_section') return false;
      const hasProduct = Boolean(referenceId(line.product_id));
      const hasQuantity = Math.max(toNullableNumber(line.product_uom_qty) ?? 0, toNullableNumber(line.qty_delivered) ?? 0, toNullableNumber(line.price_unit) ?? 0, toNullableNumber(line.price_subtotal) ?? 0, toNullableNumber(line.price_total) ?? 0) > 0;
      if (!hasProduct && !hasQuantity) return false;
      return true;
    }).map((line)=>{
      const externalOrderId = referenceId(line.order_id);
      const orderRow = externalOrderId ? orderRowByExternalId.get(externalOrderId) : null;
      if (!orderRow) {
        return null;
      }
      const productId = Number(referenceId(line.product_id));
      const product = Number.isFinite(productId) ? productById.get(productId) : null;
      return {
        order_id: orderRow.id,
        external_line_id: String(line.id),
        external_order_id: externalOrderId,
        external_product_id: referenceId(line.product_id),
        product_name: referenceName(line.product_id) || String(line.name ?? '').trim() || `Line ${line.id}`,
        product_ref: flattenReference(line.product_id),
        product_code: String(product?.default_code ?? '').trim() || null,
        product_uom: referenceName(line.product_uom) || referenceName(product?.uom_id) || null,
        ordered_quantity: toNullableNumber(line.product_uom_qty) ?? 0,
        delivered_quantity: toNullableNumber(line.qty_delivered) ?? 0,
        invoiced_quantity: toNullableNumber(line.qty_invoiced) ?? 0,
        unit_price: toNullableNumber(line.price_unit) ?? 0,
        discount_percent: toNullableNumber(line.discount) ?? 0,
        subtotal_amount: toNullableNumber(line.price_subtotal) ?? 0,
        total_amount: toNullableNumber(line.price_total) ?? 0,
        sort_order: Number(line.sequence ?? 0),
        display_type: line.display_type === false || line.display_type === 'false' ? null : String(line.display_type ?? '').trim() || null,
        raw_payload: line,
        last_sync_at: syncTime,
        updated_at: syncTime
      };
    }).filter(isPresent);
    if (lineInsertData.length > 0) {
      stage = 'insert-order-lines';
      await insertRowsInChunks('order_line_items', lineInsertData);
    }
    const orderOdooIds = orders.map((order)=>order.id);
    stage = 'fetch-picking-fields';
    const pickingFieldNames = await fetchOdooFieldNames('stock.picking');
    const requestedPickingFields = [
      'id',
      'name',
      'origin',
      'state',
      'partner_id',
      'picking_type_id',
      'location_id',
      'location_dest_id',
      'scheduled_date',
      'date_done',
      'sale_id'
    ];
    const pickingFields = requestedPickingFields.filter((field)=>pickingFieldNames.has(field));
    stage = 'fetch-pickings-from-odoo';
    const pickings = await fetchByDomainChunks({
      model: 'stock.picking',
      field: 'sale_id',
      values: orderOdooIds,
      fields: pickingFields,
      order: 'scheduled_date desc'
    });
    stage = 'build-delivery-insert-payload';
    const deliveryInsertData = pickings.map((picking)=>{
      const externalOrderId = referenceId(picking.sale_id);
      const orderRow = (externalOrderId ? orderRowByExternalId.get(externalOrderId) : null) ?? (picking.origin ? (persistedOrders ?? []).find((order)=>order.odoo_order_name === picking.origin) : null);
      if (!orderRow) {
        return null;
      }
      return {
        order_id: orderRow.id,
        external_picking_id: String(picking.id),
        external_order_id: String(externalOrderId ?? orderRow.external_order_id ?? ''),
        picking_name: String(picking.name ?? '').trim() || `Picking ${picking.id}`,
        origin_ref: String(picking.origin ?? '').trim() || null,
        picking_state: String(picking.state ?? '').trim() || null,
        picking_type_ref: flattenReference(picking.picking_type_id),
        partner_ref: flattenReference(picking.partner_id),
        source_location_ref: flattenReference(picking.location_id),
        destination_location_ref: flattenReference(picking.location_dest_id),
        scheduled_at: toNullableIso(picking.scheduled_date),
        completed_at: toNullableIso(picking.date_done),
        raw_payload: picking,
        last_sync_at: syncTime,
        updated_at: syncTime
      };
    }).filter(isPresent);
    if (deliveryInsertData.length > 0) {
      stage = 'insert-deliveries';
      await insertRowsInChunks('order_delivery_documents', deliveryInsertData);
    }
    stage = 'load-invoice-eligible-orders';
    const { data: invoiceEligibleOrders, error: invoiceEligibleOrdersError } = await supabaseAdmin.from('orders').select('id, external_order_id, odoo_order_name').not('odoo_order_name', 'is', null).in('invoice_status', [
      'invoiced',
      'to invoice'
    ]).order('create_date', {
      ascending: false
    }).limit(1000);
    if (invoiceEligibleOrdersError) {
      throw invoiceEligibleOrdersError;
    }
    const invoiceEligibleOrderRows = invoiceEligibleOrders ?? [];
    const invoiceOrderNames = [
      ...new Set(invoiceEligibleOrderRows.map((order)=>String(order.odoo_order_name ?? '').trim()).filter(Boolean))
    ];
    const invoiceOrderIds = invoiceEligibleOrderRows.map((order)=>order.id);
    if (invoiceOrderIds.length > 0) {
      stage = 'delete-existing-invoices';
      await deleteInvoiceRowsByOrderIds(invoiceOrderIds);
    }
    stage = 'fetch-invoice-fields';
    const invoiceFieldNames = await fetchOdooFieldNames('account.move');
    const requestedInvoiceFields = [
      'id',
      'name',
      'state',
      'move_type',
      'invoice_date',
      'amount_total',
      'payment_state',
      'partner_id',
      'invoice_origin',
      'currency_id'
    ];
    const invoiceFields = requestedInvoiceFields.filter((field)=>invoiceFieldNames.has(field));
    stage = 'fetch-invoices-from-odoo';
    const invoices = await fetchByDomainChunks({
      model: 'account.move',
      field: 'invoice_origin',
      values: invoiceOrderNames,
      fields: invoiceFields,
      extraDomain: [
        [
          'move_type',
          'in',
          [
            'out_invoice',
            'out_refund'
          ]
        ]
      ],
      order: 'invoice_date desc'
    });
    const orderRowByName = new Map(invoiceEligibleOrderRows.filter((order)=>String(order.odoo_order_name ?? '').trim()).map((order)=>[
        String(order.odoo_order_name),
        order
      ]));
    stage = 'build-invoice-insert-payload';
    const invoiceInsertData = invoices.map((invoice)=>{
      const orderRow = invoice.invoice_origin ? orderRowByName.get(invoice.invoice_origin) : null;
      if (!orderRow) {
        return null;
      }
      return {
        order_id: orderRow.id,
        external_invoice_id: String(invoice.id),
        external_order_id: String(orderRow.external_order_id ?? ''),
        invoice_name: String(invoice.name ?? '').trim() || `Invoice ${invoice.id}`,
        move_type: String(invoice.move_type ?? '').trim() || null,
        invoice_state: String(invoice.state ?? '').trim() || null,
        payment_state: String(invoice.payment_state ?? '').trim() || null,
        partner_ref: flattenReference(invoice.partner_id),
        invoice_date: toNullableIso(invoice.invoice_date)?.slice(0, 10) ?? null,
        amount_total: toNullableNumber(invoice.amount_total) ?? 0,
        currency_code: referenceName(invoice.currency_id) || 'EGP',
        raw_payload: invoice,
        last_sync_at: syncTime,
        updated_at: syncTime
      };
    }).filter(isPresent);
    if (invoiceInsertData.length > 0) {
      stage = 'insert-invoices';
      await insertRowsInChunks('order_invoice_documents', invoiceInsertData);
    }
    return jsonResponse({
      success: true,
      count: orderUpsertData.length,
      line_count: lineInsertData.length,
      delivery_count: deliveryInsertData.length,
      invoice_count: invoiceInsertData.length,
      invoice_candidate_count: invoiceOrderNames.length,
      backfill_existing: backfillExisting,
      incremental_order_count: incrementalOrderCount,
      upcoming_safety_order_count: upcomingSafetyOrderCount,
      upcoming_lookahead_days: upcomingLookaheadDays,
      skipped_non_sales_order_count: skippedNonSalesOrderCount,
      message: orderUpsertData.length === 0 && invoiceInsertData.length === 0 ? 'No new orders to sync' : undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : (()=>{
      try {
        return JSON.stringify(error);
      } catch  {
        return String(error);
      }
    })();
    return jsonResponse({
      success: false,
      error: message,
      stage
    }, 500);
  }
});
