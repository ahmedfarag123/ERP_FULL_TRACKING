import {
  executeOdooKwWithCredentials,
  formatUnknownError,
  jsonResponse,
  requireOdooSyncAccess,
  requireServiceOdooPassword,
  requireServiceOdooUid,
  supabaseAdmin
} from "../_shared/odoo.ts";

const PAGE_SIZE = 500;

function isoDay(value) {
  const raw = String(value ?? "").trim();
  return raw.slice(0, 10);
}

function parsePeriod(body) {
  const start = isoDay(body?.periodStart ?? body?.period_start);
  const endRaw = body?.periodEnd ?? body?.period_end;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    throw new Error("Invalid periodStart. Expected YYYY-MM-DD.");
  }
  let end;
  if (endRaw) {
    end = isoDay(endRaw);
  } else {
    const [y, m] = start.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1 + 1, 1));
    end = next.toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || end <= start) {
    throw new Error("Invalid periodEnd. Expected YYYY-MM-DD after periodStart.");
  }
  return { start, end };
}

async function fetchOdoo(model, fields, domain, maxRows = 20000) {
  const uid = requireServiceOdooUid();
  const password = requireServiceOdooPassword();
  const rows = [];
  let offset = 0;
  while (true) {
    const remaining = typeof maxRows === "number" ? maxRows - rows.length : PAGE_SIZE;
    if (remaining <= 0) break;
    const result = await executeOdooKwWithCredentials({
      uid,
      password,
      model,
      methodName: "search_read",
      args: [domain],
      kwargs: { fields, limit: Math.min(PAGE_SIZE, remaining), offset },
    });
    if (!Array.isArray(result)) break;
    rows.push(...result);
    if (result.length < Math.min(PAGE_SIZE, remaining)) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function countOdoo(model, domain) {
  const uid = requireServiceOdooUid();
  const password = requireServiceOdooPassword();
  const result = await executeOdooKwWithCredentials({
    uid,
    password,
    model,
    methodName: "search_count",
    args: [domain],
  });
  return Number(result) || 0;
}

async function fetchAgents() {
  const { data, error } = await supabaseAdmin
    .from("sales_kpi_agents")
    .select("odoo_user_id, name, active")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((a) => ({
    odooUserId: Number(a.odoo_user_id),
    name: a.name?.trim() || `Agent ${a.odoo_user_id}`,
  }));
}

async function fetchTargets(start) {
  const [y, m] = start.split("-").map(Number);
  const { data, error } = await supabaseAdmin
    .from("sales_kpi_targets")
    .select("agent_odoo_user_id, gmv_target, new_customers_target, crm_target")
    .eq("year", y)
    .eq("month", m);
  if (error) throw error;
  const map = new Map();
  for (const t of data ?? []) {
    map.set(Number(t.agent_odoo_user_id), {
      gmvTarget: t.gmv_target == null ? null : Number(t.gmv_target),
      newCustomersTarget: t.new_customers_target == null ? null : Number(t.new_customers_target),
      crmTarget: t.crm_target == null ? null : Number(t.crm_target),
    });
  }
  return map;
}

async function computeAgentMetrics(agent, start, end) {
  const uid = agent.odooUserId;
  const orderStates = ["sale", "done"];

  // ---- GMV delivered: stock picking done inside window for this salesperson
  const deliveredOrderIds = new Set();
  {
    let offset = 0;
    while (true) {
      const rows = await fetchOdoo(
        "stock.picking",
        ["sale_id"],
        [["state", "=", "done"], ["date_done", ">=", start], ["date_done", "<", end], ["sale_id.user_id", "=", uid]],
        5000
      );
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const r of rows) {
        if (Array.isArray(r.sale_id) && r.sale_id[0]) deliveredOrderIds.add(Number(r.sale_id[0]));
      }
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  let gmvDelivered = 0;
  {
    const ids = [...deliveredOrderIds];
    if (ids.length > 0) {
      const chunk = 500;
      for (let i = 0; i < ids.length; i += chunk) {
        const orders = await fetchOdoo("sale.order", ["amount_total"], [["id", "in", ids.slice(i, i + chunk)]], chunk * 2);
        if (!Array.isArray(orders)) break;
        for (const o of orders) gmvDelivered += Number(o.amount_total) || 0;
      }
    }
  }

  // ---- Customers: active this window, new (first-ever order in window), retention
  async function orderPartners(dateFrom, dateToExclusive) {
    const partners = new Set();
    let offset = 0;
    while (true) {
      const rows = await fetchOdoo(
        "sale.order",
        ["partner_id", "date_order"],
        [["user_id", "=", uid], ["state", "in", orderStates], ["date_order", ">=", dateFrom], ["date_order", "<", dateToExclusive]],
        20000
      );
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const r of rows) {
        if (Array.isArray(r.partner_id) && r.partner_id[0]) partners.add(Number(r.partner_id[0]));
      }
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return partners;
  }

  const activePartners = await orderPartners(start, end);
  const priorPartners = await orderPartners("2000-01-01", start);
  let newPartners = new Set();
  for (const p of activePartners) {
    if (!priorPartners.has(p)) newPartners.add(p);
  }
  const activeCustomers = activePartners.size;
  const newCustomers = newPartners.size;
  const retention = activeCustomers > 0 ? (activeCustomers - newCustomers) / activeCustomers : 0;

  // ---- CRM: Odoo Call activities (by activity date) + app calls (by created_at), attributed via user_uid
  const odooCalls = await countOdoo("crm.activity.report", [["date", ">=", start], ["date", "<", end], ["user_id", "=", uid]]);

  const { count: appCalls, error: appCallError } = await supabaseAdmin
    .from("calls")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${start}T00:00:00`)
    .lt("created_at", `${end}T00:00:00`)
    .eq("user_uid", uid);
  if (appCallError) throw appCallError;
  const appCallsTotal = Number(appCalls) || 0;

  return {
    agentOdooUserId: uid,
    agentName: agent.name,
    gmvDelivered,
    activeCustomers,
    newCustomers,
    retention,
    odooCalls,
    appCalls: appCallsTotal,
    crmTotal: odooCalls + appCallsTotal,
  };
}

async function upsertRows(rows, start, end) {
  const payload = rows.map((r) => ({
    period_start: start,
    period_end: end,
    agent_odoo_user_id: r.agentOdooUserId,
    agent_name: r.agentName,
    gmv_delivered: r.gmvDelivered,
    active_customers: r.activeCustomers,
    new_customers: r.newCustomers,
    retention: r.retention,
    odoo_calls: r.odooCalls,
    app_calls: r.appCalls,
    crm_total: r.crmTotal,
    gmv_target: r.gmvTarget,
    new_customers_target: r.newCustomersTarget,
    crm_target: r.crmTarget,
  }));
  const { error } = await supabaseAdmin.rpc("upsert_sales_agent_kpi_values", { p_rows: payload });
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, x-sync-secret, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  const accessError = await requireOdooSyncAccess(req);
  if (accessError) return accessError;

  try {
    const body = await req.json().catch(() => ({}));
    const { start, end } = parsePeriod(body);
    const agents = await fetchAgents();
    if (agents.length === 0) {
      return jsonResponse({ success: false, error: "No active sales agents configured." }, 400);
    }
    const targets = await fetchTargets(start);

    const computed = [];
    for (const agent of agents) {
      const metrics = await computeAgentMetrics(agent, start, end);
      const t = targets.get(metrics.agentOdooUserId) ?? {};
      computed.push({ ...metrics, ...t });
    }

    await upsertRows(computed, start, end);

    return jsonResponse({
      success: true,
      periodStart: start,
      periodEnd: end,
      rows: computed.map((r) => ({
        agentOdooUserId: r.agentOdooUserId,
        agentName: r.agentName,
        gmvDelivered: r.gmvDelivered,
        gmvTarget: r.gmvTarget,
        activeCustomers: r.activeCustomers,
        newCustomers: r.newCustomers,
        newCustomersTarget: r.newCustomersTarget,
        retention: r.retention,
        odooCalls: r.odooCalls,
        appCalls: r.appCalls,
        crmTotal: r.crmTotal,
        crmTarget: r.crmTarget,
      })),
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: formatUnknownError(error),
    }, 500);
  }
});