#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

const ENV = (name) => {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

const ODOO_URL = ENV('ODOO_BASE_URL')
const ODOO_DB = ENV('ODOO_DB')
const ODOO_UID = Number(ENV('ODOO_UID'))
const ODOO_PW = ENV('ODOO_PASSWORD')
const SB_URL = ENV('SUPABASE_URL')
const SB_KEY = ENV('SUPABASE_SERVICE_ROLE_KEY')

const BATCH_SIZE = 500

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function odooCall(payload) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(ODOO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data?.error) throw new Error(JSON.stringify(data.error))
      return data
    } catch (e) {
      if (attempt === 4) throw e
      await sleep(1000 * Math.pow(2, attempt))
    }
  }
}

async function fetchOdoo(model, fields, domain = [], maxRows) {
  const rows = []
  let offset = 0
  while (true) {
    const remaining = typeof maxRows === 'number' ? maxRows - rows.length : BATCH_SIZE
    if (remaining <= 0) break
    const limit = Math.min(BATCH_SIZE, remaining)
    const result = await odooCall({
      jsonrpc: '2.0', method: 'call',
      params: {
        service: 'object', method: 'execute_kw',
        args: [ODOO_DB, ODOO_UID, ODOO_PW, model, 'search_read', [domain], { fields, limit, offset }],
      }, id: `${model}-${offset}`,
    })
    const batch = Array.isArray(result.result) ? result.result : []
    if (batch.length === 0) break
    rows.push(...batch)
    if (batch.length < limit) break
    offset += limit
  }
  return rows
}

async function fetchOdooByIds(model, ids, fields) {
  if (!ids.length) return []
  const result = await odooCall({
    jsonrpc: '2.0', method: 'call',
    params: {
      service: 'object', method: 'execute_kw',
      args: [ODOO_DB, ODOO_UID, ODOO_PW, model, 'search_read', [[['id', 'in', ids]]], { fields, limit: ids.length }],
    }, id: `${model}-by-ids`,
  })
  return Array.isArray(result.result) ? result.result : []
}

async function odooCount(model, domain = []) {
  const result = await odooCall({
    jsonrpc: '2.0', method: 'call',
    params: {
      service: 'object', method: 'execute_kw',
      args: [ODOO_DB, ODOO_UID, ODOO_PW, model, 'search_count', [domain], {}],
    }, id: `${model}-count`,
  })
  return result.result ?? 0
}

function refId(v) {
  return Array.isArray(v) && v.length > 0 ? String(v[0]) : null
}
function refName(v) {
  return Array.isArray(v) && v.length > 1 ? String(v[1]).trim() : null
}
function toIso(v) {
  if (v == null || v === false || v === '') return null
  const d = new Date(String(v).trim())
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
function toNum(v) {
  if (v == null || v === '' || v === false) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function cleanStr(v) {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

function hasArabic(text) {
  return /[\u0600-\u06ff]/.test(text)
}

// ─── Supabase REST helper ───
async function sbUpsert(table, rows, conflictKey) {
  if (!rows.length) return { count: 0 }
  const batches = []
  for (let i = 0; i < rows.length; i += 500) {
    batches.push(rows.slice(i, i + 500))
  }
  let total = 0
  for (const batch of batches) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(`${SB_URL}/rest/v1/${table}?on_conflict=${conflictKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(batch),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 300)}`)
        }
        total += batch.length
        break
      } catch (e) {
        if (attempt === 4) throw e
        await sleep(2000 * Math.pow(2, attempt))
      }
    }
  }
  return { count: total }
}

async function sbFetch(table, select = '*') {
  const rows = []
  let offset = 0
  const limit = 1000
  while (true) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?select=${select}&limit=${limit}&offset=${offset}`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
      },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Fetch ${table}: ${res.status} ${body.slice(0, 200)}`)
    }
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    rows.push(...batch)
    if (batch.length < limit) break
    offset += limit
  }
  return rows
}

// ═══════════════════════════════════════════
async function importProducts() {
  console.log('\n=== Products ===')
  const fields = ['id', 'default_code', 'name', 'display_name', 'product_tmpl_id', 'standard_price', 'list_price', 'qty_available', 'incoming_qty', 'outgoing_qty', 'uom_id', 'active', 'create_date', 'write_date']
  const products = await fetchOdoo('product.product', fields)
  console.log(`  Fetched ${products.length} products`)

  const tmplIds = [...new Set(products.map(p => Number(refId(p.product_tmpl_id))).filter(Number.isFinite))]
  const templates = await fetchOdooByIds('product.template', tmplIds, ['id', 'name', 'display_name'])
  const tmplMap = new Map(templates.map(t => [t.id, t]))

  const syncTime = new Date().toISOString()
  const usedRefs = new Set()
  const data = products.map(p => {
    const tmpl = tmplMap.get(Number(refId(p.product_tmpl_id)))
    let name = cleanStr(tmpl?.name) || refName(p.product_tmpl_id) || cleanStr(p.name) || cleanStr(p.display_name) || `Product ${p.id}`
    let intRef = null
    if (p.default_code !== false && p.default_code != null && p.default_code !== 'false') {
      intRef = cleanStr(p.default_code)
    }
    if (intRef && usedRefs.has(intRef)) intRef = null
    if (intRef) usedRefs.add(intRef)
    return {
      external_product_id: String(p.id),
      internal_reference: intRef,
      product_name: name,
      average_cost: toNum(p.standard_price) ?? 0,
      sales_price: toNum(p.list_price) ?? 0,
      quantity_on_hand: toNum(p.qty_available) ?? 0,
      incoming_quantity: toNum(p.incoming_qty) ?? 0,
      outgoing_quantity: toNum(p.outgoing_qty) ?? 0,
      unit_of_measure: refName(p.uom_id),
      source: 'odoo_sync',
      raw_payload: p,
      odoo_created_at: toIso(p.create_date),
      odoo_updated_at: toIso(p.write_date),
      last_sync_at: syncTime,
      updated_at: syncTime,
    }
  })

  const result = await sbUpsert('products', data, 'external_product_id')
  console.log(`  Imported ${result.count} products`)
  return result.count
}

// ─── Customers ───
async function importCustomers() {
  console.log('\n=== Customers ===')
  const fields = ['id', 'name', 'company_type', 'is_company', 'email', 'phone', 'mobile', 'street', 'street2', 'city', 'state_id', 'country_id', 'zip', 'vat', 'latitude', 'longitude', 'partner_latitude', 'partner_longitude', 'customer_rank', 'create_date', 'write_date']
  const customers = await fetchOdoo('res.partner', fields)
  console.log(`  Fetched ${customers.length} customers`)

  const syncTime = new Date().toISOString()
  const data = customers.map(c => {
    const rank = Number(c.customer_rank) || 0
    let priority = 'medium'
    if (rank >= 9) priority = 'high'
    else if (rank <= 3) priority = 'low'
    return {
      external_customer_id: String(c.id),
      customer_name: c.name,
      customer_email: c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) ? c.email : null,
      phone_number: c.phone || null,
      whatsapp_number: c.mobile || null,
      address_line: [c.street, c.street2].filter(Boolean).join(', ') || null,
      governorate: refName(c.state_id),
      district: cleanStr(c.city),
      customer_type: c.is_company ? 'company' : 'individual',
      priority,
      lat: toNum(c.partner_latitude) || toNum(c.latitude) || null,
      lng: toNum(c.partner_longitude) || toNum(c.longitude) || null,
      source: 'odoo_sync',
      raw_payload: c,
      status: 'active',
      created_at: toIso(c.create_date) ?? syncTime,
      updated_at: toIso(c.write_date) ?? syncTime,
      last_sync_at: syncTime,
    }
  })

  const result = await sbUpsert('customers', data, 'external_customer_id')
  console.log(`  Imported ${result.count} customers`)
  return result.count
}

// ─── Warehouses ───
async function importWarehouses() {
  console.log('\n=== Warehouses ===')
  const fields = ['id', 'name', 'code', 'active', 'create_date', 'write_date']
  const whs = await fetchOdoo('stock.warehouse', fields)
  const syncTime = new Date().toISOString()
  const data = whs.map(w => ({
    external_warehouse_id: String(w.id),
    warehouse_name: w.name,
    warehouse_code: cleanStr(w.code),
    status: w.active === false ? 'inactive' : 'active',
    source: 'odoo_sync',
    raw_payload: w,
    created_at: toIso(w.create_date) ?? syncTime,
    updated_at: toIso(w.write_date) ?? syncTime,
    last_sync_at: syncTime,
  }))
  const result = await sbUpsert('logistics_warehouses', data, 'external_warehouse_id')
  console.log(`  Imported ${result.count} warehouses`)
  return result.count
}

// ─── Departments ───
async function importDepartments() {
  console.log('\n=== Departments ===')
  const fields = ['id', 'name', 'active', 'create_date', 'write_date']
  const depts = await fetchOdoo('hr.department', fields)
  const syncTime = new Date().toISOString()
  const data = depts.map(d => ({
    external_department_id: String(d.id),
    department_name: d.name,
    status: d.active === false ? 'inactive' : 'active',
    source: 'odoo_sync',
    created_at: toIso(d.create_date) ?? syncTime,
    updated_at: toIso(d.write_date) ?? syncTime,
    last_sync_at: syncTime,
  }))
  const result = await sbUpsert('logistics_departments', data, 'external_department_id')
  console.log(`  Imported ${result.count} departments`)
  return result.count
}

// ─── Logistics Users ───
async function importLogisticsUsers() {
  console.log('\n=== Logistics Users ===')
  const fields = ['id', 'name', 'work_email', 'mobile_phone', 'department_id', 'active', 'create_date', 'write_date']
  const users = await fetchOdoo('hr.employee', fields)
  const syncTime = new Date().toISOString()

  // Build department name mapping
  const deptRows = await sbFetch('logistics_departments', 'external_department_id, department_name')
  const deptMap = new Map()
  for (const d of deptRows) {
    if (d.external_department_id) deptMap.set(d.external_department_id, d.department_name)
  }

  const data = users.map(u => ({
    external_employee_id: String(u.id),
    employee_name: u.name,
    work_email: cleanStr(u.work_email),
    mobile_phone: cleanStr(u.mobile_phone),
    department_name: deptMap.get(refId(u.department_id)) ?? null,
    status: u.active === false ? 'inactive' : 'active',
    source: 'odoo_sync',
    raw_payload: u,
    created_at: toIso(u.create_date) ?? syncTime,
    updated_at: toIso(u.write_date) ?? syncTime,
    last_sync_at: syncTime,
  }))
  const result = await sbUpsert('logistics_users', data, 'external_employee_id')
  console.log(`  Imported ${result.count} logistics users`)
  return result.count
}

// ─── Orders ───
async function importOrders() {
  console.log('\n=== Orders ===')
  const fields = ['id', 'name', 'create_date', 'write_date', 'date_order', 'commitment_date', 'user_id', 'amount_total', 'partner_id', 'partner_shipping_id', 'state', 'client_order_ref', 'order_line', 'warehouse_id', 'invoice_status', 'create_uid']
  const orders = await fetchOdoo('sale.order', fields)
  console.log(`  Fetched ${orders.length} orders`)

  const syncTime = new Date().toISOString()
  const data = orders.map(o => {
    const state = String(o.state ?? '').trim()
    let status = 'pending'
    if (state === 'sale') status = 'confirmed'
    else if (state === 'done') status = 'delivered'
    else if (state === 'cancel') status = 'cancelled'

    return {
      external_order_id: String(o.id),
      odoo_order_name: o.name,
      customer_id: null,
      partner_id: refId(o.partner_id),
      shipping_partner_id: refId(o.partner_shipping_id),
      warehouse_id: refId(o.warehouse_id),
      user_id: refId(o.user_id),
      create_uid: refId(o.create_uid),
      total_amount: toNum(o.amount_total) ?? 0,
      status,
      invoice_status: cleanStr(o.invoice_status),
      source: 'odoo_sync',
      raw_payload: o,
      order_date: toIso(o.date_order),
      commitment_date: toIso(o.commitment_date),
      created_at: toIso(o.create_date) ?? syncTime,
      updated_at: toIso(o.write_date) ?? syncTime,
      last_sync_at: syncTime,
    }
  })

  const result = await sbUpsert('orders', data, 'external_order_id')
  console.log(`  Imported ${result.count} orders`)

  // ─── Order Lines ───
  console.log('\n=== Order Lines ===')
  const lineFields = ['id', 'order_id', 'product_id', 'name', 'product_uom_qty', 'qty_delivered', 'qty_invoiced', 'price_unit', 'price_subtotal', 'price_total', 'discount', 'sequence', 'product_uom', 'display_type']
  const lineIds = orders.flatMap(o => Array.isArray(o.order_line) ? o.order_line : [])
  console.log(`  ${lineIds.length} order line IDs to fetch`)

  let allLines = []
  for (let i = 0; i < lineIds.length; i += 200) {
    const batchIds = lineIds.slice(i, i + 200)
    const lines = await fetchOdooByIds('sale.order.line', batchIds, lineFields)
    allLines.push(...lines)
    if (i % 1000 === 0) process.stdout.write('.')
  }
  console.log(`\n  Fetched ${allLines.length} order lines`)

  // Build order UUID lookup: external_order_id -> uuid
  const orderRows = await sbFetch('orders', 'external_order_id, id')
  const orderUuidMap = new Map()
  for (const row of orderRows) {
    if (row.external_order_id) orderUuidMap.set(row.external_order_id, row.id)
  }

  const lineData = allLines.filter(l => orderUuidMap.has(refId(l.order_id))).map(l => ({
    external_line_id: String(l.id),
    order_id: orderUuidMap.get(refId(l.order_id)),
    external_order_id: refId(l.order_id),
    external_product_id: refId(l.product_id),
    product_name: cleanStr(l.name),
    ordered_quantity: toNum(l.product_uom_qty) ?? 0,
    delivered_quantity: toNum(l.qty_delivered) ?? 0,
    invoiced_quantity: toNum(l.qty_invoiced) ?? 0,
    unit_price: toNum(l.price_unit) ?? 0,
    subtotal_amount: toNum(l.price_subtotal) ?? 0,
    total_amount: toNum(l.price_total) ?? 0,
    discount_percent: toNum(l.discount) ?? 0,
    product_uom: refName(l.product_uom),
    display_type: cleanStr(l.display_type),
    raw_payload: l,
    created_at: syncTime,
    updated_at: syncTime,
    last_sync_at: syncTime,
  }))

  const lineResult = await sbUpsert('order_line_items', lineData, 'external_line_id')
  console.log(`  Imported ${lineResult.count} order lines`)

  return { orders: result.count, lines: lineResult.count }
}

// ─── Shipments ───
async function importShipments() {
  console.log('\n=== Shipments ===')
  const fields = ['id', 'name', 'origin', 'state', 'partner_id', 'picking_type_id', 'location_id', 'location_dest_id', 'scheduled_date', 'date_done', 'sale_id', 'move_ids', 'create_date', 'write_date']
  const pickings = await fetchOdoo('stock.picking', fields)
  console.log(`  Fetched ${pickings.length} shipments`)

  const syncTime = new Date().toISOString()
  const data = pickings.map(p => {
    const state = String(p.state ?? '').trim()
    let status = 'pending'
    if (state === 'confirmed' || state === 'assigned') status = 'confirmed'
    else if (state === 'done') status = 'done'
    else if (state === 'cancel') status = 'cancelled'
    else if (state === 'waiting') status = 'waiting'

    return {
      external_shipment_id: String(p.id),
      shipment_reference: p.name,
      origin_ref: cleanStr(p.origin),
      shipment_state: status,
      external_customer_id: refId(p.partner_id),
      external_order_id: refId(p.sale_id),
      operation_type_ref: refId(p.picking_type_id),
      source: 'odoo_sync',
      raw_payload: p,
      scheduled_at: toIso(p.scheduled_date),
      completed_at: toIso(p.date_done),
      created_at: toIso(p.create_date) ?? syncTime,
      updated_at: toIso(p.write_date) ?? syncTime,
      last_sync_at: syncTime,
    }
  })
  const result = await sbUpsert('logistics_shipments', data, 'external_shipment_id')
  console.log(`  Imported ${result.count} shipments`)

  // ─── Shipment Items (stock.move) ───
  console.log('\n=== Shipment Items ===')
  const moveFields = ['id', 'name', 'product_id', 'product_uom_qty', 'quantity', 'picking_id', 'state', 'product_uom', 'create_date', 'write_date']
  const moveIds = pickings.flatMap(p => Array.isArray(p.move_ids) ? p.move_ids : [])
  console.log(`  ${moveIds.length} stock move IDs to fetch`)

  let allMoves = []
  for (let i = 0; i < moveIds.length; i += 200) {
    const batchIds = moveIds.slice(i, i + 200)
    const moves = await fetchOdooByIds('stock.move', batchIds, moveFields)
    allMoves.push(...moves)
    if (i % 2000 === 0) process.stdout.write('.')
  }
  console.log(`\n  Fetched ${allMoves.length} stock moves`)

  const shipmentRows = await sbFetch('logistics_shipments', 'external_shipment_id, id')
  const shipmentUuidMap = new Map()
  for (const row of shipmentRows) {
    if (row.external_shipment_id) shipmentUuidMap.set(row.external_shipment_id, row.id)
  }

  const moveData = allMoves.filter(m => shipmentUuidMap.has(refId(m.picking_id))).map(m => ({
    external_move_id: String(m.id),
    shipment_id: shipmentUuidMap.get(refId(m.picking_id)),
    external_product_id: refId(m.product_id),
    product_name: cleanStr(m.name),
    requested_quantity: toNum(m.product_uom_qty) ?? 0,
    done_quantity: toNum(m.quantity) ?? 0,
    move_state: cleanStr(m.state) ?? 'draft',
    source: 'odoo_sync',
    raw_payload: m,
    created_at: toIso(m.create_date) ?? syncTime,
    updated_at: toIso(m.write_date) ?? syncTime,
    last_sync_at: syncTime,
  }))
  const moveResult = await sbUpsert('logistics_shipment_items', moveData, 'external_move_id')
  console.log(`  Imported ${moveResult.count} shipment items`)

  return { shipments: result.count, items: moveResult.count }
}

// ─── CRM Leads ───
async function importCrmLeads() {
  console.log('\n=== CRM Leads ===')
  const fields = ['id', 'name', 'partner_id', 'email_from', 'phone', 'mobile', 'stage_id', 'user_id', 'team_id', 'expected_revenue', 'probability', 'priority', 'description', 'active', 'create_date', 'write_date']
  const leads = await fetchOdoo('crm.lead', fields)
  console.log(`  Fetched ${leads.length} CRM leads`)

  const syncTime = new Date().toISOString()
  const data = leads.map(l => ({
    external_lead_id: String(l.id),
    opportunity_name: l.name,
    partner_id: refId(l.partner_id),
    email: cleanStr(l.email_from),
    phone: cleanStr(l.phone),
    mobile: cleanStr(l.mobile),
    stage_id: refId(l.stage_id),
    salesperson_id: refId(l.user_id),
    sales_team_id: refId(l.team_id),
    expected_revenue: toNum(l.expected_revenue) ?? 0,
    probability: toNum(l.probability) ?? 0,
    priority: cleanStr(l.priority) ?? 'medium',
    notes: cleanStr(l.description),
    active: l.active !== false,
    source: 'odoo_sync',
    raw_payload: l,
    odoo_created_at: toIso(l.create_date) ?? syncTime,
    odoo_updated_at: toIso(l.write_date) ?? syncTime,
    last_sync_at: syncTime,
  }))
  const result = await sbUpsert('odoo_crm_leads', data, 'external_lead_id')
  console.log(`  Imported ${result.count} CRM leads`)
  return result.count
}

// ═══════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║  Odoo → Supabase Bulk Import        ║')
  console.log('╚══════════════════════════════════════╝')
  console.log(`Odoo: ${ODOO_URL}`)
  console.log(`Supabase: ${SB_URL}`)
  console.log()

  const start = Date.now()

  try {
    const counts = {}

    counts.products = await importProducts()
    counts.customers = await importCustomers()
    counts.warehouses = await importWarehouses()
    counts.departments = await importDepartments()
    counts.logisticsUsers = await importLogisticsUsers()
    const ord = await importOrders()
    counts.orders = ord.orders
    counts.orderLines = ord.lines
    const ship = await importShipments()
    counts.shipments = ship.shipments
    counts.shipmentItems = ship.items
    counts.crmLeads = await importCrmLeads()

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    console.log('\n═══════════════════════════════════════')
    console.log('  IMPORT COMPLETE')
    console.log('═══════════════════════════════════════')
    console.log(`  Products:          ${counts.products}`)
    console.log(`  Customers:         ${counts.customers}`)
    console.log(`  Warehouses:        ${counts.warehouses}`)
    console.log(`  Departments:       ${counts.departments}`)
    console.log(`  Logistics Users:   ${counts.logisticsUsers}`)
    console.log(`  Orders:            ${counts.orders}`)
    console.log(`  Order Lines:       ${counts.orderLines}`)
    console.log(`  Shipments:         ${counts.shipments}`)
    console.log(`  Shipment Items:    ${counts.shipmentItems}`)
    console.log(`  CRM Leads:         ${counts.crmLeads}`)
    console.log('───────────────────────────────────────')
    console.log(`  Time: ${elapsed}s`)
    console.log('═══════════════════════════════════════\n')
  } catch (e) {
    console.error('\n❌ Import failed:', e.message)
    process.exit(1)
  }
}

main()
