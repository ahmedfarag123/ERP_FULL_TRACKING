import { executeOdooKwWithCredentials, requireServiceOdooPassword, requireServiceOdooUid } from "../_shared/odoo.ts";
import { corsHeaders, formatUnknownError, jsonResponse, supabaseAdmin } from "./shared.ts";
const ACTION_KEY = "crm.activity.create";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function text(value) {
  return String(value ?? "").trim();
}
function positiveInteger(value) {
  if (typeof value === "boolean") return null;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
function odooReferenceId(value) {
  return positiveInteger(Array.isArray(value) ? value[0] : value);
}
function errorResponse(code, message, status = 400) {
  return jsonResponse({
    success: false,
    error_code: code,
    error: message
  }, status);
}
function boundedError(error) {
  return formatUnknownError(error).replace(/\s+/g, " ").slice(0, 500);
}
function authToken(req) {
  const match = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}
function humanize(value) {
  const normalized = text(value);
  return normalized ? normalized.replace(/[_-]+/g, " ") : "Not specified";
}
function boundedText(value, maximum) {
  return value.length <= maximum ? value : `${value.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}
function isoDate(value) {
  const raw = text(value);
  if (!raw) return null;
  const exactDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (exactDate) return exactDate[1];
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
function callbackDateFromRawPayload(rawPayload) {
  const details = rawPayload?.requested_action_details;
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const callback = details.callback;
  if (!callback || typeof callback !== "object" || Array.isArray(callback)) return null;
  return isoDate(callback.callbackDate);
}
function formatCallActivityPayload(call) {
  const requestedActions = Array.isArray(call.requested_actions) ? call.requested_actions.map(humanize).filter((value)=>value !== "Not specified") : [];
  const summary = boundedText(`Call — ${humanize(call.call_reason)} — ${humanize(call.customer_disposition)}`, 256);
  const note = boundedText([
    `Direction: ${humanize((call.raw_form_payload ?? {}).direction)}`,
    `Connectivity: ${humanize(call.call_status)}`,
    `Reason: ${humanize(call.call_reason)}`,
    `Disposition: ${humanize(call.customer_disposition)}`,
    call.customer_objection ? `Objection: ${humanize(call.customer_objection)}` : null,
    requestedActions.length > 0 ? `Requested actions: ${requestedActions.join(", ")}` : null,
    `Next action: ${humanize(call.next_action)}`,
    call.callback_at ? `Callback: ${call.callback_at}` : null,
    call.requires_urgent_action ? "Urgent action: yes" : null,
    call.call_notes ? `Notes: ${text(call.call_notes)}` : null
  ].filter(Boolean).join("\n"), 4000);
  return {
    summary,
    note,
    date_deadline: callbackDateFromRawPayload(call.raw_form_payload) ?? isoDate(call.callback_at) ?? isoDate(call.completed_at) ?? isoDate(call.created_at) ?? new Date().toISOString().slice(0, 10)
  };
}
async function requester(req) {
  const token = authToken(req);
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.id) return null;
  const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("id, role, status, user_uid").eq("id", data.user.id).maybeSingle();
  if (profileError || !profile) return null;
  return profile;
}
async function actionAllows(profile) {
  const { data, error } = await supabaseAdmin.from("odoo_actions").select("is_active, allowed_roles").eq("action_key", ACTION_KEY).maybeSingle();
  if (error || !data || data.is_active !== true) return false;
  const role = text(profile.role).toLowerCase();
  return Array.isArray(data.allowed_roles) && data.allowed_roles.map((value)=>text(value).toLowerCase()).includes(role);
}
function validate(body) {
  const requestId = text(body.requestId);
  const callId = text(body.callId);
  const activityTypeId = positiveInteger(body.activityTypeId);
  if (!UUID_PATTERN.test(requestId)) return {
    error: errorResponse("VALIDATION_ERROR", "requestId must be a UUID.")
  };
  if (!callId) return {
    error: errorResponse("VALIDATION_ERROR", "callId is required.")
  };
  if (!activityTypeId) return {
    error: errorResponse("VALIDATION_ERROR", "activityTypeId must be a positive integer.")
  };
  return {
    value: {
      request_id: requestId,
      call_id: callId,
      activity_type_id: activityTypeId
    }
  };
}
async function recordFailure(dispatchId, code, error) {
  await supabaseAdmin.from("odoo_crm_activity_dispatches").update({
    status: "failed",
    error_code: code,
    error_message: boundedError(error)
  }).eq("id", dispatchId);
}
async function callForRequester(callId, profile) {
  const { data, error } = await supabaseAdmin.from("calls").select("id, customer_id, created_at, completed_at, callback_at, call_status, call_reason, customer_disposition, customer_objection, requested_actions, next_action, call_notes, requires_urgent_action, raw_form_payload").eq("id", callId).eq("user_id", profile.id).maybeSingle();
  return error || !data ? null : data;
}
async function callLead(call) {
  if (!call.customer_id) return null;
  const { data: customer, error: customerError } = await supabaseAdmin.from("customers").select("external_customer_id").eq("id", call.customer_id).maybeSingle();
  if (customerError || !customer || !text(customer.external_customer_id)) return null;
  const { data: lead, error: leadError } = await supabaseAdmin.from("odoo_crm_leads").select("external_lead_id").eq("partner_id", customer.external_customer_id).eq("active", true).order("odoo_updated_at", {
    ascending: false,
    nullsFirst: false
  }).order("last_sync_at", {
    ascending: false,
    nullsFirst: false
  }).limit(1).maybeSingle();
  return leadError || !lead ? null : {
    lead: lead,
    customer: customer
  };
}
async function activityTypeExists(activityTypeId) {
  const { data, error } = await supabaseAdmin.from("odoo_crm_model_records").select("external_id").eq("odoo_model", "mail.activity.type").eq("external_id", String(activityTypeId)).maybeSingle();
  return !error && Boolean(data);
}
async function crmLeadModelId(uid, password) {
  const models = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "ir.model",
    methodName: "search_read",
    args: [
      [
        [
          "model",
          "=",
          "crm.lead"
        ]
      ]
    ],
    kwargs: {
      fields: [
        "id"
      ],
      limit: 1
    }
  });
  const modelId = odooReferenceId(models?.[0]?.id);
  if (!modelId) throw new Error("Odoo crm.lead model could not be resolved.");
  return modelId;
}
async function activityOwnerMatches(uid, password, activityId, expectedUserId) {
  const activities = await executeOdooKwWithCredentials({
    uid,
    password,
    model: "mail.activity",
    methodName: "read",
    args: [
      [
        activityId
      ],
      [
        "user_id"
      ]
    ]
  });
  return odooReferenceId(activities?.[0]?.user_id) === expectedUserId;
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
  const body = await req.json().catch(()=>null);
  if (!body || typeof body !== "object") return errorResponse("VALIDATION_ERROR", "A JSON request body is required.");
  const validation = validate(body);
  if (validation.error || !validation.value) return validation.error;
  const profile = await requester(req);
  if (!profile) return errorResponse("UNAUTHORIZED", "A valid signed-in user is required.", 401);
  if (text(profile.status).toLowerCase() !== "active") return errorResponse("FORBIDDEN", "Your account is not active.", 403);
  if (!await actionAllows(profile)) return errorResponse("ACTION_DISABLED_OR_FORBIDDEN", "This CRM activity action is unavailable.", 403);
  const mappedOdooUserId = positiveInteger(profile.user_uid);
  if (!mappedOdooUserId) return errorResponse("ODOO_USER_MAPPING_REQUIRED", "Your account has no valid Odoo user mapping.", 403);
  const call = await callForRequester(validation.value.call_id, profile);
  if (!call) return errorResponse("CALL_NOT_FOUND", "The saved call is missing or does not belong to you.", 404);
  if (!await activityTypeExists(validation.value.activity_type_id)) return errorResponse("ACTIVITY_TYPE_NOT_FOUND", "The selected Odoo activity type is unavailable.", 404);
  const resolvedLead = await callLead(call);
  if (!resolvedLead) return errorResponse("CALL_LEAD_NOT_FOUND", "This call's customer has no active Odoo CRM lead.", 422);
  const odooLeadId = positiveInteger(resolvedLead.lead.external_lead_id);
  if (!odooLeadId) return errorResponse("CALL_LEAD_NOT_FOUND", "This call's matched Odoo CRM lead is invalid.", 422);
  const activityPayload = formatCallActivityPayload(call);
  const { data: claimRows, error: claimError } = await supabaseAdmin.rpc("claim_odoo_crm_activity_dispatch", {
    p_request_id: validation.value.request_id,
    p_requester_id: profile.id,
    p_mapped_odoo_user_id: mappedOdooUserId,
    p_lead_external_id: resolvedLead.lead.external_lead_id,
    p_activity_type_id: validation.value.activity_type_id,
    p_payload: {
      ...activityPayload,
      call_id: call.id
    },
    p_mode: "live"
  });
  if (claimError) {
    if (claimError.code === "P0001") return errorResponse("RATE_LIMITED", "Too many CRM activity requests. Try again shortly.", 429);
    return errorResponse("DISPATCH_UNAVAILABLE", "Could not record the CRM activity request.", 503);
  }
  const claim = Array.isArray(claimRows) ? claimRows[0] : null;
  if (!claim) return errorResponse("DISPATCH_UNAVAILABLE", "Could not record the CRM activity request.", 503);
  if (!claim.should_dispatch) {
    return jsonResponse({
      success: claim.dispatch_status === "sent",
      status: claim.dispatch_status,
      activity_id: claim.remote_activity_id,
      error_code: claim.error_code
    });
  }
  try {
    const serviceUid = requireServiceOdooUid();
    const servicePassword = requireServiceOdooPassword();
    const activityId = positiveInteger(await executeOdooKwWithCredentials({
      uid: serviceUid,
      password: servicePassword,
      model: "mail.activity",
      methodName: "create",
      args: [
        {
          res_model_id: await crmLeadModelId(serviceUid, servicePassword),
          res_id: odooLeadId,
          activity_type_id: validation.value.activity_type_id,
          user_id: mappedOdooUserId,
          summary: activityPayload.summary,
          note: activityPayload.note,
          date_deadline: activityPayload.date_deadline
        }
      ]
    }));
    if (!activityId) throw new Error("Odoo did not return a valid CRM activity ID.");
    if (!await activityOwnerMatches(serviceUid, servicePassword, activityId, mappedOdooUserId)) {
      throw new Error("Odoo did not preserve the mapped CRM activity owner.");
    }
    const { error: sentError } = await supabaseAdmin.from("odoo_crm_activity_dispatches").update({
      status: "sent",
      remote_activity_id: activityId,
      sent_at: new Date().toISOString(),
      error_code: null,
      error_message: null
    }).eq("id", claim.dispatch_id);
    if (sentError) throw sentError;
    return jsonResponse({
      success: true,
      status: "sent",
      activity_id: activityId
    });
  } catch (error) {
    await recordFailure(claim.dispatch_id, "ODOO_DIRECT_RPC_ERROR", error);
    return errorResponse("ODOO_DIRECT_RPC_ERROR", "The CRM activity was not confirmed by Odoo.", 502);
  }
});
