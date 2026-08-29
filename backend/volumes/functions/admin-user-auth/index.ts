import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase function environment variables.");
}
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
function createRequestClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}
function normalizeText(value) {
  return String(value ?? "").trim();
}
function normalizePhoneE164(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("+")) return raw.replace(/\s+/g, "");
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return "+20" + digits;
  if (digits.startsWith("20")) return "+" + digits;
  return "+20" + digits;
}
function ensureRole(value) {
  const role = String(value ?? "").trim().toLowerCase();
  if (role === "admin" || role === "manager" || role === "spv" || role === "dispatcher" || role === "driver" || role === "supervisor" || role === "sales_agent" || role === "telesales") {
    return role;
  }
  throw new Error(`Unsupported role "${String(value ?? "")}".`);
}
function ensureRecordStatus(value) {
  const status = String(value ?? "active").trim().toLowerCase();
  if (status === "active" || status === "inactive" || status === "archived") {
    return status;
  }
  throw new Error(`Unsupported status "${String(value ?? "")}".`);
}
function isMissingProfileColumnError(message) {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("profiles") && (normalized.includes("department_id") || normalized.includes("job_title"));
}
function defaultLogisticsJobTitle(role, jobTitle) {
  const normalized = normalizeText(jobTitle);
  if (normalized) return normalized;
  switch(role){
    case "driver":
      return "Driver";
    case "dispatcher":
      return "Dispatcher";
    case "spv":
      return "SPV";
    case "manager":
      return "Logistics Manager";
    case "supervisor":
      return "Logistics Supervisor";
    case "admin":
      return "Logistics Admin";
    default:
      return "Logistics User";
  }
}
function shouldMirrorToLogisticsUsers(role, department) {
  if (role === "driver") return true;
  const departmentKey = `${department?.slug ?? ""} ${department?.name ?? ""}`.toLowerCase();
  return departmentKey.includes("logistics");
}
async function fetchDepartmentInfo(departmentId) {
  if (!departmentId) return null;
  const { data, error } = await adminClient.from("departments").select("name, slug").eq("id", departmentId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return {
    name: normalizeText(data?.name) || null,
    slug: normalizeText(data?.slug).toLowerCase() || null
  };
}
async function syncLogisticsUser(input) {
  const timestamp = new Date().toISOString();
  const jobTitle = defaultLogisticsJobTitle(input.role, input.jobTitle);
  const rawPayload = {
    source: "admin-user-auth",
    profile_id: input.userId,
    role: input.role,
    department_id: input.departmentId
  };
  const payload = {
    linked_profile_id: input.userId,
    employee_name: input.fullName,
    job_title: jobTitle,
    work_email: input.email || null,
    work_phone: input.phone,
    mobile_phone: input.phone,
    department_name: input.departmentName,
    status: input.status,
    source: "admin_user_create",
    raw_payload: rawPayload,
    last_sync_at: timestamp,
    updated_at: timestamp
  };
  const { data: existingRows, error: existingError } = await adminClient.from("logistics_users").select("id").eq("linked_profile_id", input.userId).limit(1);
  if (existingError) {
    throw new Error(existingError.message);
  }
  const existing = (existingRows ?? [])[0];
  const { error } = existing?.id ? await adminClient.from("logistics_users").update(payload).eq("id", existing.id) : await adminClient.from("logistics_users").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}
async function requireAdmin(request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    throw new Response(JSON.stringify({
      error: "Missing authorization header."
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  // Extract JWT from "Bearer <token>"
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new Response(JSON.stringify({
      error: "Invalid authorization format."
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const requestClient = createRequestClient(token);
  const { data: { user }, error: authError } = await requestClient.auth.getUser();
  if (authError || !user) {
    throw new Response(JSON.stringify({
      error: authError?.message ?? "Invalid authentication token."
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  const userId = String(user.id ?? "");
  if (!userId) {
    throw new Response(JSON.stringify({
      error: "Authenticated user id is missing."
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  // Fetch user profile from database
  const { data: profile, error: profileError } = await adminClient.from("profiles").select("id, email, role").eq("id", userId).single();
  if (profileError || !profile) {
    throw new Response(JSON.stringify({
      error: "Admin profile not found."
    }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  if (String(profile.role ?? "").trim().toLowerCase() !== "admin") {
    throw new Response(JSON.stringify({
      error: "Only admins can use this function."
    }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  return {
    id: String(profile.id),
    email: normalizeEmail(profile.email)
  };
}
async function insertAuditLog(input) {
  await adminClient.from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    actor_role: "admin",
    action_type: input.actionType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    description: input.description,
    metadata: input.metadata
  });
}
async function createUser(actor, payload) {
  const email = normalizeEmail(payload.email);
  const fullName = normalizeText(payload.fullName);
  const role = ensureRole(payload.role);
  const status = ensureRecordStatus(payload.status);
  const departmentId = normalizeText(payload.departmentId) || null;
  const jobTitle = normalizeText(payload.jobTitle) || null;
  const phone = normalizePhoneE164(payload.phone);
  const initialPassword = normalizeText(payload.initialPassword);
  const sendInvite = Boolean(payload.sendInvite) || !initialPassword;
  if (!email) throw new Error("Email is required.");
  if (!fullName) throw new Error("Full name is required.");
  const authResponse = sendInvite ? await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName
    }
  }) : await adminClient.auth.admin.createUser({
    email,
    phone: phone ?? undefined,
    password: initialPassword,
    email_confirm: true,
    phone_confirm: Boolean(phone),
    user_metadata: {
      full_name: fullName
    }
  });
  if (authResponse.error || !authResponse.data.user) {
    throw new Error(authResponse.error?.message ?? "Unable to create auth user.");
  }
  const userId = String(authResponse.data.user.id);
  const timestamp = new Date().toISOString();
  const requiresPasswordChange = Boolean(initialPassword && !sendInvite);
  const profileUpsert = {
    id: userId,
    email,
    full_name: fullName,
    role,
    department_id: departmentId,
    job_title: jobTitle,
    phone,
    status,
    approved_at: timestamp,
    approved_by: actor.id,
    password_enabled: true,
    otp_enabled: false,
    prefer_otp: false,
    requires_password_change: requiresPasswordChange,
    temporary_password_set_at: requiresPasswordChange ? timestamp : null,
    password_changed_at: requiresPasswordChange ? null : timestamp
  };
  let { error: updateError } = await adminClient.from("profiles").upsert(profileUpsert, { onConflict: "id" });
  if (updateError && isMissingProfileColumnError(updateError.message)) {
    const { id, email: em, full_name: fn, role: rl, phone: ph, status: st, approved_at: aa, approved_by: ab, password_enabled: pe, otp_enabled: oe, prefer_otp: po, requires_password_change: rpc, temporary_password_set_at: tps, password_changed_at: pca } = profileUpsert;
    ({ error: updateError } = await adminClient.from("profiles").upsert({
      id, email: em, full_name: fn, role: rl, phone: ph, status: st,
      approved_at: aa, approved_by: ab, password_enabled: pe, otp_enabled: oe,
      prefer_otp: po, requires_password_change: rpc,
      temporary_password_set_at: tps, password_changed_at: pca
    }, { onConflict: "id" }));
  }
  if (updateError) {
    throw new Error(updateError.message);
  }
  const department = await fetchDepartmentInfo(departmentId);
  if (shouldMirrorToLogisticsUsers(role, department)) {
    await syncLogisticsUser({
      userId,
      email,
      fullName,
      departmentId,
      departmentName: department?.name ?? null,
      jobTitle,
      phone,
      role,
      status
    });
  }
  await insertAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actionType: "admin_create_user",
    entityType: "profile",
    entityId: userId,
    description: "Created managed auth user from admin access console",
    metadata: {
      email,
      role,
      status,
      department_id: departmentId,
      invitation_sent: sendInvite,
      requires_password_change: requiresPasswordChange
    }
  });
  return {
    userId,
    email,
    invitationSent: sendInvite,
    temporaryPasswordSet: Boolean(initialPassword && !sendInvite)
  };
}
async function inviteUser(actor, payload) {
  const email = normalizeEmail(payload.email);
  const fullName = normalizeText(payload.fullName);
  if (!email) throw new Error("Email is required.");
  const response = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName
    }
  });
  if (response.error) {
    throw new Error(response.error.message);
  }
  await insertAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actionType: "admin_invite_user",
    entityType: "profile",
    entityId: normalizeText(payload.userId) || null,
    description: "Sent invite email to managed user",
    metadata: {
      email
    }
  });
  return {
    invitationSent: true
  };
}
async function generateRecoveryLink(actor, payload) {
  const email = normalizeEmail(payload.email);
  if (!email) throw new Error("Email is required.");
  const response = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email
  });
  if (response.error) {
    throw new Error(response.error.message);
  }
  const actionLink = response.data.properties?.action_link ?? response.data.properties?.hashed_token ?? "";
  if (!actionLink) {
    throw new Error("Recovery link could not be generated.");
  }
  await insertAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actionType: "admin_generate_recovery_link",
    entityType: "profile",
    entityId: normalizeText(payload.userId) || null,
    description: "Generated recovery link for managed user",
    metadata: {
      email
    }
  });
  return {
    actionLink
  };
}
async function setPassword(actor, payload) {
  const userId = normalizeText(payload.userId);
  const password = normalizeText(payload.password);
  if (!userId) throw new Error("User id is required.");
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const response = await adminClient.auth.admin.updateUserById(userId, {
    password
  });
  if (response.error) {
    throw new Error(response.error.message);
  }
  const timestamp = new Date().toISOString();
  const { error: profileError } = await adminClient.from("profiles").update({
    password_enabled: true,
    requires_password_change: true,
    temporary_password_set_at: timestamp,
    password_changed_at: null
  }).eq("id", userId);
  if (profileError) {
    throw new Error(profileError.message);
  }
  await insertAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actionType: "admin_set_user_password",
    entityType: "profile",
    entityId: userId,
    description: "Updated managed user password and required password reset on next login",
    metadata: {
      user_id: userId,
      requires_password_change: true
    }
  });
  return {
    updated: true
  };
}
async function deleteUser(actor, payload) {
  const userId = normalizeText(payload.userId);
  if (!userId) throw new Error("User id is required.");
  if (userId === actor.id) {
    throw new Error("You cannot delete your own account.");
  }

  const { data: profileRow, error: profileFetchError } = await adminClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();
  if (profileFetchError) throw new Error(profileFetchError.message);

  const { error: profilesError } = await adminClient
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profilesError) throw new Error(profilesError.message);

  const { error: userAccessError } = await adminClient
    .from("user_access")
    .delete()
    .eq("user_id", userId);
  // user_access may not exist for every user; ignore missing table errors
  if (userAccessError && !String(userAccessError.message).includes("does not exist")) {
    throw new Error(userAccessError.message);
  }

  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);

  await insertAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actionType: "admin_delete_user",
    entityType: "profile",
    entityId: userId,
    description: "Permanently deleted managed user account",
    metadata: {
      user_id: userId,
      email: profileRow?.email ?? null
    }
  });

  return {
    deleted: true
  };
}

Deno.serve(async (request)=>{
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const actor = await requireAdmin(request);
    const body = await request.json();
    const action = normalizeText(body.action);
    const payload = body.payload ?? {};
    if (action === "create-user") {
      return jsonResponse(await createUser(actor, payload));
    }
    if (action === "invite-user") {
      return jsonResponse(await inviteUser(actor, payload));
    }
    if (action === "generate-recovery-link") {
      return jsonResponse(await generateRecoveryLink(actor, payload));
    }
    if (action === "set-password") {
      return jsonResponse(await setPassword(actor, payload));
    }
    if (action === "delete-user") {
      return jsonResponse(await deleteUser(actor, payload));
    }
    return jsonResponse({
      error: "Unsupported admin user auth action."
    }, 400);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse({
      error: message
    }, 500);
  }
});
