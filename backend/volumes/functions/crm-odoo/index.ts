import { buildLastSyncDate, corsHeaders, fetchOdooBatches, fetchOdooFieldNames, formatUnknownError, jsonResponse, referenceId, referenceName, requireOdooSyncAccess, supabaseAdmin, toNullableIso, toNullableNumber } from "../_shared/odoo.ts";
const CRM_MODELS = [
  "crm.lead.convert2ticket",
  "crm.lead.lost",
  "crm.lead.scoring.frequency",
  "crm.lead.scoring.frequency.field",
  "crm.lead2opportunity.partner",
  "crm.lead2opportunity.partner.mass",
  "crm.lost.reason",
  "crm.merge.opportunity",
  "crm.quotation.partner",
  "crm.recurring.plan",
  "crm.stage",
  "crm.tag",
  "crm.team",
  "crm.team.member",
  "mail.activity.type"
];
const CRM_LEAD_FIELDS = [
  "id",
  "name",
  "type",
  "partner_id",
  "partner_name",
  "contact_name",
  "email_from",
  "phone",
  "mobile",
  "street",
  "city",
  "state_id",
  "country_id",
  "user_id",
  "team_id",
  "priority",
  "activity_ids",
  "activity_user_id",
  "activity_date_deadline",
  "campaign_id",
  "medium_id",
  "source_id",
  "expected_revenue",
  "date_deadline",
  "stage_id",
  "description",
  "probability",
  "lost_reason_id",
  "tag_ids",
  "active",
  "create_date",
  "write_date"
];
const ACTIVITY_REPORT_FIELDS = [
  "id",
  "lead_id",
  "lead_type",
  "partner_id",
  "user_id",
  "team_id",
  "activity_type_id",
  "summary",
  "note",
  "date_deadline",
  "date_completed",
  "state",
  "mail_activity_id",
  "active",
  "create_date",
  "write_date"
];
const GENERIC_FIELDS = [
  "id",
  "name",
  "display_name",
  "active",
  "create_date",
  "write_date"
];
const PARTNER_FIELDS = [
  "id",
  "name",
  "display_name",
  "commercial_company_name",
  "email",
  "phone",
  "mobile",
  "street",
  "city",
  "state_id",
  "country_id"
];
function text(value) {
  if (value === null || value === undefined || value === false) return null;
  const raw = String(value).trim();
  return raw || null;
}
function idArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item)=>String(item ?? "").trim()).filter(Boolean);
}
function htmlToText(value) {
  const raw = text(value);
  if (!raw) return null;
  return raw.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim() || null;
}
async function safeFieldNames(model) {
  try {
    return await fetchOdooFieldNames(model);
  } catch  {
    return new Set();
  }
}
async function fetchModelRows(model, fields, domain, maxRows) {
  return await fetchOdooBatches({
    model,
    fields,
    domain,
    batchSize: Math.min(maxRows, 250),
    maxRows,
    order: fields.includes("write_date") ? "write_date asc" : "id asc"
  });
}
async function fetchPartnerRows(partnerIds) {
  const numericPartnerIds = partnerIds.map((id)=>Number(id)).filter(Number.isFinite);
  if (numericPartnerIds.length === 0) {
    return new Map();
  }
  const fieldNames = await safeFieldNames("res.partner");
  if (fieldNames.size === 0 || !fieldNames.has("id")) {
    return new Map();
  }
  const fields = PARTNER_FIELDS.filter((field)=>field === "id" || fieldNames.has(field));
  const partners = await fetchOdooBatches({
    model: "res.partner",
    fields,
    domain: [
      [
        "id",
        "in",
        numericPartnerIds
      ]
    ],
    batchSize: 250,
    maxRows: numericPartnerIds.length
  });
  return new Map(partners.map((partner)=>[
      String(partner.id),
      partner
    ]));
}
async function syncGenericModel(model, syncTime, maxRows) {
  const fieldNames = await safeFieldNames(model);
  if (fieldNames.size === 0 || !fieldNames.has("id")) {
    return {
      model,
      count: 0,
      skipped: true
    };
  }
  const fields = GENERIC_FIELDS.filter((field)=>fieldNames.has(field));
  const rows = await fetchModelRows(model, fields, [], maxRows);
  if (rows.length === 0) {
    return {
      model,
      count: 0
    };
  }
  const upsertRows = rows.map((row)=>({
      odoo_model: model,
      external_id: String(row.id),
      display_name: text(row.display_name) ?? text(row.name) ?? `${model} ${row.id}`,
      active: typeof row.active === "boolean" ? row.active : null,
      source: "odoo_sync",
      raw_payload: row,
      odoo_created_at: toNullableIso(row.create_date),
      odoo_updated_at: toNullableIso(row.write_date),
      last_sync_at: syncTime,
      updated_at: syncTime
    }));
  const { error } = await supabaseAdmin.from("odoo_crm_model_records").upsert(upsertRows, {
    onConflict: "odoo_model,external_id"
  });
  if (error) throw error;
  return {
    model,
    count: upsertRows.length
  };
}
async function syncActivityReports(syncTime, maxRows) {
  const fieldNames = await safeFieldNames("crm.activity.report");
  if (fieldNames.size === 0 || !fieldNames.has("id")) {
    return {
      count: 0,
      skipped: true
    };
  }
  const fields = Array.from(fieldNames);
  const { data: latestRow } = await supabaseAdmin.from("odoo_crm_activity_reports").select("odoo_created_at").order("odoo_created_at", {
    ascending: false,
    nullsFirst: false
  }).limit(1).maybeSingle();
  const lastSyncDate = buildLastSyncDate(latestRow?.odoo_created_at ?? null);
  const domain = fieldNames.has("date") ? [
    [
      "date",
      ">",
      lastSyncDate
    ]
  ] : [];
  const rows = await fetchModelRows("crm.activity.report", fields, domain, maxRows);
  if (rows.length === 0) {
    return {
      count: 0
    };
  }
  const upsertRows = rows.map((row)=>({
      external_activity_id: String(row.id),
      lead_id: referenceId(row.lead_id),
      lead_external_id: text(referenceId(row.lead_id)),
      lead_type: text(row.lead_type),
      partner_id: referenceId(row.partner_id),
      partner_name: referenceName(row.partner_id),
      user_id: referenceId(row.user_id),
      user_name: referenceName(row.user_id),
      team_id: referenceId(row.team_id),
      team_name: referenceName(row.team_id),
      activity_type_id: referenceId(row.mail_activity_type_id),
      activity_type_name: referenceName(row.mail_activity_type_id),
      summary: htmlToText(row.body) || text(row.summary),
      notes: htmlToText(row.body) || htmlToText(row.note),
      date_deadline: text(row.date_deadline),
      date_completed: toNullableIso(row.date_closed),
      state: text(row.won_status) || text(row.state),
      mail_activity_id: referenceId(row.mail_activity_id),
      active: typeof row.active === "boolean" ? row.active : null,
      source: "odoo_sync",
      raw_payload: row,
      odoo_created_at: toNullableIso(row.date) || toNullableIso(row.create_date),
      odoo_updated_at: toNullableIso(row.write_date),
      last_sync_at: syncTime,
      updated_at: syncTime
    }));
  const { error } = await supabaseAdmin.from("odoo_crm_activity_reports").upsert(upsertRows, {
    onConflict: "external_activity_id"
  });
  if (error) throw error;
  return {
    count: upsertRows.length
  };
}
async function syncLeads(syncTime, maxRows) {
  const { data: latestRow, error: latestError } = await supabaseAdmin.from("odoo_crm_leads").select("odoo_updated_at, last_sync_at, updated_at").or("odoo_updated_at.not.is.null,last_sync_at.not.is.null,updated_at.not.is.null").order("odoo_updated_at", {
    ascending: false,
    nullsFirst: false
  }).order("last_sync_at", {
    ascending: false,
    nullsFirst: false
  }).order("updated_at", {
    ascending: false,
    nullsFirst: false
  }).limit(1).maybeSingle();
  if (latestError) throw latestError;
  const fieldNames = await safeFieldNames("crm.lead");
  if (fieldNames.size === 0 || !fieldNames.has("id")) {
    return {
      count: 0,
      skipped: true
    };
  }
  const fields = Array.from(fieldNames);
  const lastSyncDate = buildLastSyncDate(latestRow?.odoo_updated_at ?? latestRow?.last_sync_at ?? latestRow?.updated_at ?? null);
  const domain = fieldNames.has("write_date") ? [
    [
      "write_date",
      ">",
      lastSyncDate
    ]
  ] : [];
  const leads = await fetchModelRows("crm.lead", fields, domain, maxRows);
  if (leads.length === 0) {
    return {
      count: 0
    };
  }
  const partnerIds = Array.from(new Set(leads.map((lead)=>referenceId(lead.partner_id)).filter((id)=>Boolean(id))));
  const partnerById = await fetchPartnerRows(partnerIds);
  const tagIds = Array.from(new Set(leads.flatMap((lead)=>idArray(lead.tag_ids))));
  const tagNameById = new Map();
  if (tagIds.length > 0) {
    const tagFields = [
      "id",
      "name"
    ].filter((field)=>fieldNames.has(field) || field === "id" || field === "name");
    try {
      const tagRows = await fetchOdooBatches({
        model: "crm.tag",
        fields: tagFields,
        domain: [
          [
            "id",
            "in",
            tagIds.map((id)=>Number(id)).filter(Number.isFinite)
          ]
        ],
        batchSize: 250,
        maxRows: tagIds.length
      });
      tagRows.forEach((tag)=>tagNameById.set(String(tag.id), text(tag.name) ?? String(tag.id)));
    } catch  {
      tagIds.forEach((id)=>tagNameById.set(id, id));
    }
  }
  const rawRows = leads.map((lead)=>{
    const leadTagIds = idArray(lead.tag_ids);
    const partner = partnerById.get(String(referenceId(lead.partner_id) ?? ""));
    const partnerName = text(partner?.display_name) ?? text(partner?.name);
    return {
      external_lead_id: String(lead.id),
      opportunity_name: text(lead.name) ?? `Opportunity ${lead.id}`,
      lead_type: text(lead.type),
      partner_id: referenceId(lead.partner_id),
      customer_name: referenceName(lead.partner_id) ?? text(lead.partner_name) ?? text(partner?.commercial_company_name) ?? partnerName,
      contact_name: text(lead.contact_name) ?? partnerName,
      email: text(lead.email_from) ?? text(partner?.email),
      phone: text(lead.phone) ?? text(partner?.phone),
      mobile: text(lead.mobile) ?? text(partner?.mobile),
      street: text(lead.street) ?? text(partner?.street),
      city: text(lead.city) ?? text(partner?.city),
      state_name: referenceName(lead.state_id) ?? referenceName(partner?.state_id),
      country_name: referenceName(lead.country_id) ?? referenceName(partner?.country_id),
      salesperson_id: referenceId(lead.user_id),
      salesperson_name: referenceName(lead.user_id),
      sales_team_id: referenceId(lead.team_id),
      sales_team_name: referenceName(lead.team_id),
      priority: text(lead.priority),
      activity_ids: idArray(lead.activity_ids),
      activity_by_id: referenceId(lead.activity_user_id),
      activity_by_name: referenceName(lead.activity_user_id),
      my_deadline: text(lead.activity_date_deadline),
      campaign_id: referenceId(lead.campaign_id),
      campaign_name: referenceName(lead.campaign_id),
      medium_id: referenceId(lead.medium_id),
      medium_name: referenceName(lead.medium_id),
      source_id: referenceId(lead.source_id),
      source_name: referenceName(lead.source_id),
      expected_revenue: toNullableNumber(lead.expected_revenue) ?? 0,
      expected_closing: text(lead.date_deadline),
      stage_id: referenceId(lead.stage_id),
      stage_name: referenceName(lead.stage_id),
      notes: htmlToText(lead.description),
      probability: toNullableNumber(lead.probability),
      lost_reason_id: referenceId(lead.lost_reason_id),
      lost_reason_name: referenceName(lead.lost_reason_id),
      tag_ids: leadTagIds,
      tag_names: leadTagIds.map((id)=>tagNameById.get(id) ?? id),
      active: lead.active !== false,
      source: "odoo_sync",
      raw_payload: lead,
      odoo_created_at: toNullableIso(lead.create_date),
      odoo_updated_at: toNullableIso(lead.write_date),
      last_sync_at: syncTime,
      updated_at: syncTime
    };
  });
  const seen = new Set();
  const upsertRows = rawRows.filter((row)=>{
    if (seen.has(row.external_lead_id)) return false;
    seen.add(row.external_lead_id);
    return true;
  });
  const { error } = await supabaseAdmin.from("odoo_crm_leads").upsert(upsertRows, {
    onConflict: "external_lead_id"
  });
  if (error) throw error;
  return {
    count: upsertRows.length
  };
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const authResponse = await requireOdooSyncAccess(req);
    if (authResponse) return authResponse;
    const body = req.method === "POST" ? await req.json().catch(()=>({})) : {};
    const maxRows = Math.max(1, Math.min(Number(body?.maxRows ?? 10000), 20000));
    const syncTime = new Date().toISOString();
    const modelResults = [];
    const modelErrors = [];
    const leadResult = await syncLeads(syncTime, maxRows);
    let activityResult = {
      count: 0,
      skipped: false
    };
    try {
      activityResult = await syncActivityReports(syncTime, maxRows);
    } catch (error) {
      modelErrors.push({
        model: "crm.activity.report",
        error: formatUnknownError(error)
      });
    }
    for (const model of CRM_MODELS){
      try {
        modelResults.push(await syncGenericModel(model, syncTime, 1000));
      } catch (error) {
        modelErrors.push({
          model,
          error: formatUnknownError(error)
        });
      }
    }
    return jsonResponse({
      success: true,
      leads: leadResult,
      activityReports: activityResult,
      models: modelResults,
      modelErrors
    });
  } catch (error) {
    const status = typeof error?.status === "number" ? error.status : 500;
    return jsonResponse({
      success: false,
      error: formatUnknownError(error)
    }, status);
  }
});
