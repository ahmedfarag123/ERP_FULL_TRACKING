import { callOdoo, corsHeaders, formatUnknownError, jsonResponse, ODOO_DB, ODOO_PASSWORD, ODOO_UID, executeOdooKwWithCredentials, supabaseAdmin } from "../_shared/odoo.ts";
function extractAuthToken(req) {
  const match = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}
async function authenticateRequester(req) {
  const token = extractAuthToken(req);
  if (!token) {
    return {
      userId: null,
      role: null,
      error: jsonResponse({
        success: false,
        error: "Missing authorization token."
      }, 401)
    };
  }
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const userId = authData.user?.id;
  if (authError || !userId) {
    return {
      userId: null,
      role: null,
      error: jsonResponse({
        success: false,
        error: "Invalid authorization token."
      }, 401)
    };
  }
  const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("role, status").eq("id", userId).maybeSingle();
  if (profileError || !profile) {
    return {
      userId: null,
      role: null,
      error: jsonResponse({
        success: false,
        error: "Profile not found."
      }, 403)
    };
  }
  const role = String(profile.role ?? "").trim().toLowerCase();
  const status = String(profile.status ?? "").trim().toLowerCase();
  if (status && status !== "active") {
    return {
      userId: null,
      role: null,
      error: jsonResponse({
        success: false,
        error: "Account is not active."
      }, 403)
    };
  }
  if (![
    "admin",
    "manager"
  ].includes(role)) {
    return {
      userId: null,
      role: null,
      error: jsonResponse({
        success: false,
        error: "Insufficient permissions."
      }, 403)
    };
  }
  return {
    userId,
    role,
    error: null
  };
}
async function fetchPendingAction(actionId) {
  const { data, error } = await supabaseAdmin.from("odoo_pending_actions").select("id, entity_type, action_type, odoo_model, odoo_method, payload_json, status, retry_count").eq("id", actionId).maybeSingle();
  if (error || !data) return null;
  return data;
}
async function markSending(actionId) {
  const { error } = await supabaseAdmin.rpc("mark_odoo_action_sending", {
    p_action_id: actionId
  });
  if (error) throw new Error(`Failed to mark action as sending: ${error.message}`);
}
async function completeAction(actionId, odooRecordId, odooReference, odooResponse) {
  const { error } = await supabaseAdmin.rpc("complete_odoo_action", {
    p_action_id: actionId,
    p_odoo_record_id: odooRecordId,
    p_odoo_reference: odooReference,
    p_odoo_response: odooResponse
  });
  if (error) throw new Error(`Failed to complete action: ${error.message}`);
}
async function failAction(actionId, errorMessage, odooResponse) {
  const { error } = await supabaseAdmin.rpc("fail_odoo_action", {
    p_action_id: actionId,
    p_error_message: errorMessage,
    p_odoo_response: odooResponse
  });
  if (error) throw new Error(`Failed to mark action as failed: ${error.message}`);
}
function buildOdooPayload(action) {
  const args = action.odoo_method === "write" ? [
    [
      action.payload_json.odoo_record_id ?? 0
    ],
    action.payload_json
  ] : action.odoo_method === "unlink" ? [
    [
      action.payload_json.odoo_record_id ?? 0
    ]
  ] : action.odoo_method === "search_read" ? [
    action.payload_json.domain ?? []
  ] : [
    action.payload_json
  ];
  const kwargs = {};
  if (action.odoo_method === "search_read") {
    kwargs.fields = action.payload_json.fields ?? [];
    kwargs.limit = action.payload_json.limit ?? 100;
  }
  return {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [
        ODOO_DB,
        ODOO_UID,
        ODOO_PASSWORD,
        action.odoo_model,
        action.odoo_method,
        args,
        kwargs
      ]
    },
    id: `pending-${action.id}-${Date.now()}`
  };
}
// ── Entity-specific payload resolution ──
// Some entities (e.g. mail.activity) need Odoo IDs resolved at execution time.
// This function enriches the payload before buildOdooPayload runs.
/**
 * Resolve the ir.model integer ID for a given Odoo model name (e.g. "crm.lead")
 * by calling mail.activity.default_get with the appropriate context.
 * This mirrors what the Odoo web client does when the Schedule Activity form opens.
 */ async function resolveResModelId(odooModelName, odooResId) {
  if (!Number.isFinite(ODOO_UID) || ODOO_UID <= 0 || !ODOO_PASSWORD) {
    throw new Error("Odoo service credentials are not configured.");
  }
  const result = await executeOdooKwWithCredentials({
    uid: ODOO_UID,
    password: ODOO_PASSWORD,
    model: "mail.activity",
    methodName: "default_get",
    args: [
      [
        "res_model_id",
        "res_model",
        "res_id"
      ]
    ],
    kwargs: {
      context: {
        default_res_model: odooModelName,
        default_res_id: odooResId
      }
    }
  });
  // default_get returns { res_model_id: [id, "Name"], ... } or { res_model_id: id, ... }
  const raw = result?.res_model_id;
  if (typeof raw === "number" && raw > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "number" && raw[0] > 0) return raw[0];
  throw new Error(`default_get did not return a valid res_model_id for "${odooModelName}". ` + `Got: ${JSON.stringify(raw)}`);
}
/**
 * Compute date_deadline from the activity type's configured delay.
 * Raw create() calls (unlike activity_schedule()) don't trigger Odoo's
 * default computation for date_deadline, so we must calculate it explicitly.
 */ async function resolveActivityDeadline(activityTypeId) {
  if (!Number.isFinite(ODOO_UID) || ODOO_UID <= 0 || !ODOO_PASSWORD) {
    throw new Error("Odoo service credentials are not configured.");
  }
  const result = await executeOdooKwWithCredentials({
    uid: ODOO_UID,
    password: ODOO_PASSWORD,
    model: "mail.activity.type",
    methodName: "read",
    args: [
      [
        activityTypeId
      ]
    ],
    kwargs: {
      fields: [
        "delay_count",
        "delay_unit"
      ]
    }
  });
  const record = Array.isArray(result) ? result[0] : null;
  if (!record) {
    console.warn(`[resolveActivityDeadline] activity_type_id ${activityTypeId} not found in Odoo; defaulting deadline to today.`);
  }
  const delayCount = Number(record?.delay_count ?? 0);
  const delayUnit = String(record?.delay_unit ?? "days");
  const deadline = new Date();
  const amount = Number.isFinite(delayCount) ? delayCount : 0;
  if (delayUnit === "weeks") deadline.setDate(deadline.getDate() + amount * 7);
  else if (delayUnit === "months") deadline.setMonth(deadline.getMonth() + amount);
  else deadline.setDate(deadline.getDate() + amount);
  return deadline.toISOString().split("T")[0];
}
/**
 * Check if a customer ID is an outsourced reference (e.g. "C-Class-3324")
 * vs a real Odoo partner ID (e.g. "33816").
 */ function isOutsourcedCustomerId(id) {
  return /^C-Class/i.test(id);
}
/**
 * Search Odoo for a CRM lead by customer phone number.
 * Used as fallback when partner_id lookup fails.
 */ async function findLeadByPhone(phone) {
  if (!Number.isFinite(ODOO_UID) || ODOO_UID <= 0 || !ODOO_PASSWORD) return null;
  const normalised = phone.replace(/[\s\-()]/g, "");
  if (!normalised) return null;
  const result = await executeOdooKwWithCredentials({
    uid: ODOO_UID,
    password: ODOO_PASSWORD,
    model: "crm.lead",
    methodName: "search_read",
    args: [
      [
        "|",
        [
          "phone",
          "ilike",
          normalised
        ],
        [
          "mobile",
          "ilike",
          normalised
        ]
      ]
    ],
    kwargs: {
      fields: [
        "id"
      ],
      order: "write_date desc",
      limit: 1
    }
  });
  if (Array.isArray(result) && result.length > 0) {
    const id = Number(result[0].id);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}
/**
 * Search Odoo for a CRM lead by name (opportunity_name).
 * Used as last fallback when partner_id and phone lookups both fail.
 */ async function findLeadByName(name) {
  if (!Number.isFinite(ODOO_UID) || ODOO_UID <= 0 || !ODOO_PASSWORD) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const result = await executeOdooKwWithCredentials({
    uid: ODOO_UID,
    password: ODOO_PASSWORD,
    model: "crm.lead",
    methodName: "search_read",
    args: [
      [
        [
          "name",
          "ilike",
          trimmed
        ]
      ]
    ],
    kwargs: {
      fields: [
        "id"
      ],
      order: "write_date desc",
      limit: 1
    }
  });
  if (Array.isArray(result) && result.length > 0) {
    const id = Number(result[0].id);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}
/**
 * Auto-create a CRM lead in Odoo for customers with no existing lead.
 * Also upserts the new lead into odoo_crm_leads keyed by phone_number.
 */ async function createCrmLeadForCustomer(customer, extId) {
  const normalizedPhone = customer.phone_number?.replace(/[\s\-()]/g, "") || null;
  if (!Number.isFinite(ODOO_UID) || ODOO_UID <= 0 || !ODOO_PASSWORD) {
    throw new Error("Odoo service credentials are not configured.");
  }
  // Deduplicate by phone in local table first
  if (normalizedPhone) {
    const { data: existing } = await supabaseAdmin.from("odoo_crm_leads").select("external_lead_id").eq("phone_number", normalizedPhone).maybeSingle();
    if (existing?.external_lead_id) return Number(existing.external_lead_id);
  }
  const leadVals = {
    name: customer.customer_name?.trim() || customer.phone_number?.trim() || "عميل جديد (تم الإنشاء تلقائيًا)",
    phone: customer.phone_number || false
  };
  if (extId && !isOutsourcedCustomerId(extId)) {
    const partnerId = Number(extId);
    if (Number.isFinite(partnerId) && partnerId > 0) leadVals.partner_id = partnerId;
  }
  const newLeadId = await executeOdooKwWithCredentials({
    uid: ODOO_UID,
    password: ODOO_PASSWORD,
    model: "crm.lead",
    methodName: "create",
    args: [
      leadVals
    ]
  });
  if (!Number.isFinite(newLeadId) || newLeadId <= 0) {
    throw new Error(`Odoo returned an invalid lead id after auto-create: ${newLeadId}`);
  }
  if (normalizedPhone) {
    await supabaseAdmin.from("odoo_crm_leads").upsert({
      partner_id: extId && !isOutsourcedCustomerId(extId) ? extId : null,
      external_lead_id: String(newLeadId),
      phone_number: normalizedPhone,
      odoo_updated_at: new Date().toISOString()
    }, {
      onConflict: "phone_number"
    });
    const { data: winningRow } = await supabaseAdmin.from("odoo_crm_leads").select("external_lead_id").eq("phone_number", normalizedPhone).maybeSingle();
    if (winningRow?.external_lead_id) return Number(winningRow.external_lead_id);
  }
  return newLeadId;
}
async function resolveCrmActivityPayload(payload) {
  const callId = String(payload.call_id ?? "").trim();
  if (!callId) throw new Error("call_id is required for CRM activity resolution.");
  // 1. Look up the call → customer → external_customer_id + phone
  const { data: call, error: callErr } = await supabaseAdmin.from("calls").select("customer_id, call_notes").eq("id", callId).maybeSingle();
  if (callErr || !call) throw new Error(`Call ${callId} not found.`);
  const { data: customer, error: custErr } = await supabaseAdmin.from("customers").select("external_customer_id, phone_number, customer_name").eq("id", call.customer_id).maybeSingle();
  if (custErr || !customer) {
    throw new Error(`Customer for call ${callId} not found.`);
  }
  let externalLeadId = null;
  const extId = String(customer.external_customer_id ?? "").trim();
  // 2a. If real Odoo partner ID → find lead by partner_id
  if (extId && !isOutsourcedCustomerId(extId)) {
    const { data: lead } = await supabaseAdmin.from("odoo_crm_leads").select("external_lead_id").eq("partner_id", extId).order("odoo_updated_at", {
      ascending: false
    }).limit(1).maybeSingle();
    if (lead?.external_lead_id) {
      externalLeadId = Number(lead.external_lead_id);
    }
  }
  // 2b. Fallback: outsourced customer → search Odoo by phone
  if (!externalLeadId && customer.phone_number) {
    externalLeadId = await findLeadByPhone(customer.phone_number);
  }
  // 2c. Last fallback: search Odoo by customer name
  if (!externalLeadId && customer.customer_name) {
    externalLeadId = await findLeadByName(customer.customer_name);
  }
  let leadWasAutoCreated = false;
  if (!externalLeadId) {
    externalLeadId = await createCrmLeadForCustomer(customer, extId);
    leadWasAutoCreated = true;
  }
  // 3. Look up the caller's Odoo user ID from the creator's profile
  const { data: actionCreator } = await supabaseAdmin.from("odoo_pending_actions").select("created_by").eq("id", payload._action_id ?? "").maybeSingle();
  let odooUserId = null;
  if (actionCreator?.created_by) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("user_uid").eq("id", actionCreator.created_by).maybeSingle();
    odooUserId = positiveInt(profile?.user_uid);
  }
  // 4. Resolve res_model_id via default_get (mirrors the Odoo form view behavior)
  const resModelId = await resolveResModelId("crm.lead", externalLeadId);
  // 5. Resolve date_deadline from the activity type's configured delay,
  //    since raw create() calls don't compute this automatically.
  const activityTypeId = Number(payload.activity_type_id);
  const dateDeadline = payload.date_deadline ? String(payload.date_deadline) : await resolveActivityDeadline(activityTypeId);
  // 6. Build the activity payload with all resolved fields
  const callNotes = String(call?.call_notes ?? "").trim();
  const existingNote = String(payload.note ?? "").trim();
  const combinedNote = [
    existingNote,
    callNotes
  ].filter(Boolean).join("\n\n");
  const activityPayload = {
    res_model_id: resModelId,
    res_id: externalLeadId,
    activity_type_id: activityTypeId,
    user_id: odooUserId,
    summary: payload.summary ?? "",
    note: combinedNote || "",
    date_deadline: dateDeadline
  };
  if (leadWasAutoCreated) {
    await supabaseAdmin.from("odoo_pending_action_audit_log").insert({
      action_id: payload._action_id,
      status: "sending",
      details: {
        event: "auto_created_crm_lead",
        odoo_lead_id: externalLeadId
      }
    });
  }
  return activityPayload;
}
function positiveInt(value) {
  if (typeof value === "boolean") return null;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
/**
 * Auto-complete a mail.activity by calling action_done.
 * This marks the activity as completed in Odoo so it doesn't appear as "new".
 */ async function completeOdooActivity(activityId) {
  if (!Number.isFinite(ODOO_UID) || ODOO_UID <= 0 || !ODOO_PASSWORD) return;
  try {
    await executeOdooKwWithCredentials({
      uid: ODOO_UID,
      password: ODOO_PASSWORD,
      model: "mail.activity",
      methodName: "action_done",
      args: [
        [
          activityId
        ]
      ]
    });
    console.log(`[completeOdooActivity] Activity ${activityId} marked as done.`);
  } catch (err) {
    // Non-fatal: activity was created but auto-complete failed
    console.warn(`[completeOdooActivity] Failed to auto-complete activity ${activityId}:`, err);
  }
}
function extractOdooResultId(result, method) {
  if (method === "create" && typeof result === "number") return result;
  if (method === "create" && Array.isArray(result) && result.length > 0) return Number(result[0]);
  if (method === "write" && (result === true || result === false)) return null;
  if (method === "unlink" && (result === true || result === false)) return null;
  if (method === "search_read" && Array.isArray(result) && result.length > 0) {
    const first = result[0];
    return typeof first.id === "number" ? first.id : null;
  }
  return null;
}
function extractOdooReference(result, method) {
  if (method === "search_read" && Array.isArray(result) && result.length > 0) {
    const first = result[0];
    if (typeof first.name === "string") return first.name;
    if (typeof first.display_name === "string") return first.display_name;
  }
  return null;
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  if (req.method !== "POST") {
    return jsonResponse({
      success: false,
      error: "Method not allowed."
    }, 405);
  }
  // Authenticate
  const auth = await authenticateRequester(req);
  if (auth.error) return auth.error;
  // Parse body
  const body = await req.json().catch(()=>null);
  if (!body || typeof body !== "object") {
    return jsonResponse({
      success: false,
      error: "A JSON request body is required."
    }, 400);
  }
  const actionId = String(body.action_id ?? "").trim();
  if (!actionId) {
    return jsonResponse({
      success: false,
      error: "action_id is required."
    }, 400);
  }
  // Fetch pending action
  const action = await fetchPendingAction(actionId);
  if (!action) {
    return jsonResponse({
      success: false,
      error: "Pending action not found."
    }, 404);
  }
  if (action.status !== "approved") {
    return jsonResponse({
      success: false,
      error: `Action must be approved before execution. Current status: ${action.status}`
    }, 400);
  }
  // Validate Odoo credentials
  if (!Number.isFinite(ODOO_UID) || ODOO_UID <= 0 || !ODOO_PASSWORD) {
    return jsonResponse({
      success: false,
      error: "Odoo service credentials are not configured."
    }, 500);
  }
  // Mark as sending
  try {
    await markSending(actionId);
  } catch (sendError) {
    return jsonResponse({
      success: false,
      error: `Failed to mark action as sending: ${formatUnknownError(sendError)}`
    }, 500);
  }
  // Build and execute Odoo RPC
  try {
    // Resolve entity-specific payloads (e.g. CRM activities need Odoo IDs)
    let resolvedPayload = action.payload_json;
    if (action.entity_type === "crm_lead" && action.odoo_model === "mail.activity") {
      resolvedPayload = await resolveCrmActivityPayload({
        ...action.payload_json,
        _action_id: action.id
      });
    }
    const resolvedAction = {
      ...action,
      payload_json: resolvedPayload
    };
    const odooPayload = buildOdooPayload(resolvedAction);
    const response = await callOdoo(odooPayload);
    const result = response?.result;
    const odooRecordId = extractOdooResultId(result, action.odoo_method);
    const odooReference = extractOdooReference(result, action.odoo_method);
    // Auto-complete newly created mail.activity so it shows as "done" in Odoo
    if (action.entity_type === "crm_lead" && action.odoo_model === "mail.activity" && odooRecordId) {
      await completeOdooActivity(odooRecordId);
    }
    await completeAction(actionId, odooRecordId ?? 0, odooReference, {
      result
    });
    return jsonResponse({
      success: true,
      odoo_record_id: odooRecordId,
      odoo_reference: odooReference,
      odoo_response: {
        result
      }
    });
  } catch (rpcError) {
    const errorMessage = formatUnknownError(rpcError);
    let odooResponse = null;
    // Try to extract structured error
    try {
      const parsed = JSON.parse(errorMessage);
      odooResponse = {
        error: parsed
      };
    } catch  {
      odooResponse = {
        error: {
          message: errorMessage
        }
      };
    }
    try {
      await failAction(actionId, errorMessage, odooResponse);
    } catch (failError) {
      // If we can't even mark as failed, log and return error
      console.error("Failed to record failure:", formatUnknownError(failError));
    }
    return jsonResponse({
      success: false,
      error: errorMessage,
      odoo_response: odooResponse
    }, 502);
  }
});
