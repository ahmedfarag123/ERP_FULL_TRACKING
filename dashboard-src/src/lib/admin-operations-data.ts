import { supabase } from "./supabase";
import { buildOdooToProfileMap, resolveOrderUserId } from "./order-user-resolver";
import type {
  AdminAuditEntry,
  AdminTargetSummary,
  AdminUserSummary,
  LegacyAdminTarget,
  LegacyAdminUser,
  LegacyModalField,
  LegacyNotification,
  LegacyRole,
} from "../types/admin-operations";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  odoo_user_id: string | null;
  force_logout_at?: string | null;
  status?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
};

type SalesTargetRow = {
  user_id: string;
  target_month: string;
  target_visits: number | null;
  target_calls: number | null;
  target_reachability: number | string | null;
  target_gmv: number | string | null;
  target_quotations: number | null;
  working_days: number | null;
};

type NotificationRow = {
  id: string;
  created_by: string | null;
  title: string;
  body: string;
  sent_at: string;
  metadata: Record<string, unknown> | null;
};

type NotificationRecipientRow = {
  notification_id: string;
  user_id: string;
};

type DynamicFieldRow = {
  id: string;
  form_context: string;
  field_key: string;
  label_en: string;
  label_ar: string;
  field_type: string;
  placeholder_en: string | null;
  placeholder_ar: string | null;
  validation_rules: Record<string, unknown> | null;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
};

type DynamicFieldOptionRow = {
  field_id: string;
  value_key: string;
  label_en: string;
  label_ar: string;
  is_active: boolean;
  display_order: number;
};

type VisitRow = {
  id: string;
  user_id: string;
  customer_id: string | null;
  visit_result: string | null;
  checked_in_at: string | null;
  created_at: string;
};

type CallRow = {
  id: string;
  user_id: string;
  customer_id: string | null;
  call_outcome: string | null;
  call_status: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  assigned_user_id: string | null;
  user_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  status: string | null;
  order_date: string | null;
  total_amount: number | string | null;
  created_at: string;
};

type CustomerRow = {
  id: string;
  customer_name: string;
  external_customer_id: string | null;
};

function normalizeRole(value: string | undefined | null): LegacyRole {
  const role = String(value ?? "").trim().toLowerCase();
  if (
    role === "admin" ||
    role === "manager" ||
    role === "spv" ||
    role === "dispatcher" ||
    role === "driver" ||
    role === "supervisor" ||
    role === "sales_agent" ||
    role === "telesales"
  ) {
    return role;
  }
  return "unknown";
}

function normalizeEmail(value: string | undefined | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function parseNumber(value: string | number | null | undefined): number {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeTimestamp(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? raw : parsed.toISOString();
}

function buildFallbackName(email: string, fullName?: string | null): string {
  const normalizedFullName = String(fullName ?? "").trim();
  if (normalizedFullName) return normalizedFullName;
  return email.split("@")[0]?.replace(/[._-]+/g, " ") || email;
}

function currentMonthKey(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function byName<T extends { name: string; email?: string }>(left: T, right: T): number {
  return `${left.name} ${left.email ?? ""}`.localeCompare(
    `${right.name} ${right.email ?? ""}`,
    "en",
    { sensitivity: "base" },
  );
}

async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileRow>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const BATCH_SIZE = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    chunks.push(uniqueIds.slice(i, i + BATCH_SIZE));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase.from("profiles").select("id, email, full_name, role, odoo_user_id, force_logout_at, status").in("id", chunk),
    ),
  );
  for (const res of results) {
    if (res.error) throw new Error(res.error.message);
  }
  const allProfiles = results.flatMap((res) => res.data ?? []);

  return new Map(allProfiles.map((profile) => [profile.id, profile as ProfileRow]));
}

async function fetchCustomersByIds(ids: string[]): Promise<Map<string, CustomerRow>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, CustomerRow>();
  }

  const BATCH_SIZE = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    chunks.push(uniqueIds.slice(i, i + BATCH_SIZE));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase.from("customers").select("id, customer_name, external_customer_id").in("id", chunk),
    ),
  );
  for (const res of results) {
    if (res.error) throw new Error(res.error.message);
  }
  const allCustomers = results.flatMap((res) => res.data ?? []);

  return new Map(allCustomers.map((customer) => [customer.id, customer as CustomerRow]));
}

async function requireAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user.id;
}

export function isManagementRole(role: LegacyRole): boolean {
  return role === "admin" || role === "manager" || role === "spv" || role === "dispatcher" || role === "supervisor" || role === "telesales";
}

export async function fetchLegacyUsers(): Promise<LegacyAdminUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, force_logout_at, status, avatar_url, created_at, last_login_at")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((profile) => {
      const email = normalizeEmail(profile.email);
      const role = normalizeRole(profile.role);

      return {
        email,
        username: email,
        name: buildFallbackName(email, profile.full_name),
        role,
        status:
          profile.status === "inactive" || profile.status === "archived"
            ? profile.status
            : "active",
        forceLogout: Boolean(profile.force_logout_at),
        isManagement: isManagementRole(role),
        avatarUrl: String(profile.avatar_url ?? "").trim() || null,
        createdAt: safeTimestamp(profile.created_at) || safeTimestamp(profile.last_login_at),
        lastLoginAt: safeTimestamp(profile.last_login_at) || null,
      } satisfies LegacyAdminUser;
    })
    .filter((user) => user.email)
    .sort(byName);
}

export async function fetchLegacyTargets(): Promise<LegacyAdminTarget[]> {
  const { data, error } = await supabase
    .from("sales_targets")
    .select(
      "user_id, target_month, target_visits, target_calls, target_reachability, target_gmv, target_quotations, working_days",
    )
    .order("target_month", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as SalesTargetRow[];
  const selectedTargets = new Map<string, SalesTargetRow>();
  const monthKey = currentMonthKey();

  for (const row of rows) {
    const existing = selectedTargets.get(row.user_id);
    if (!existing) {
      selectedTargets.set(row.user_id, row);
      continue;
    }

    if (existing.target_month !== monthKey && row.target_month === monthKey) {
      selectedTargets.set(row.user_id, row);
    }
  }

  const profiles = await fetchProfilesByIds(Array.from(selectedTargets.keys()));

  return Array.from(selectedTargets.values())
    .map((target) => {
      const profile = profiles.get(target.user_id);
      const email = normalizeEmail(profile?.email);

      return {
        email,
        name: buildFallbackName(email, profile?.full_name),
        role: normalizeRole(profile?.role),
        targetVisits: parseNumber(target.target_visits),
        targetCalls: parseNumber(target.target_calls),
        targetReachability: parseNumber(target.target_reachability),
        targetGmv: parseNumber(target.target_gmv),
        targetQuotations: parseNumber(target.target_quotations),
        workingDays: parseNumber(target.working_days),
      } satisfies LegacyAdminTarget;
    })
    .filter((target) => target.email)
    .sort(byName);
}

export async function fetchLegacyNotifications(): Promise<LegacyNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, created_by, title, body, sent_at, metadata")
    .order("sent_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const notifications = (data ?? []) as NotificationRow[];
  const notificationIds = notifications.map((notification) => notification.id);

  const { data: recipientsData, error: recipientsError } = notificationIds.length
    ? await supabase
        .from("notification_recipients")
        .select("notification_id, user_id")
        .in("notification_id", notificationIds)
    : { data: [], error: null };

  if (recipientsError) {
    throw new Error(recipientsError.message);
  }

  const recipients = (recipientsData ?? []) as NotificationRecipientRow[];
  const profileIds = Array.from(
    new Set([
      ...notifications.map((notification) => notification.created_by ?? "").filter(Boolean),
      ...recipients.map((recipient) => recipient.user_id),
    ]),
  );
  const profiles = await fetchProfilesByIds(profileIds);

  const recipientMap = new Map<string, string[]>();
  for (const recipient of recipients) {
    const email = normalizeEmail(profiles.get(recipient.user_id)?.email);
    if (!email) continue;

    const existing = recipientMap.get(recipient.notification_id) ?? [];
    existing.push(email);
    recipientMap.set(recipient.notification_id, existing);
  }

  return notifications.map((notification, index) => {
    const metadata = notification.metadata ?? {};
    const rawImportance = String(metadata.importance ?? "").trim();
    const sender =
      String(metadata.sender ?? "").trim() ||
      normalizeEmail(profiles.get(notification.created_by ?? "")?.email) ||
      "system";

    const importance: LegacyNotification["importance"] =
      rawImportance === "High"
        ? "High"
        : rawImportance === "Medium"
          ? "Medium"
          : "Normal";

    return {
      id: notification.id || `notification-${index}`,
      title: notification.title,
      content: notification.body,
      sender,
      importance,
      timestamp: safeTimestamp(notification.sent_at),
      receivedUsers: Array.from(new Set(recipientMap.get(notification.id) ?? [])),
    } satisfies LegacyNotification;
  });
}

export async function fetchLegacyModalFields(): Promise<LegacyModalField[]> {
  const { data: fieldData, error: fieldError } = await supabase
    .from("dynamic_form_fields")
    .select(
      "id, form_context, field_key, label_en, label_ar, field_type, placeholder_en, placeholder_ar, validation_rules, is_required, is_active, display_order",
    )
    .order("form_context", { ascending: true })
    .order("display_order", { ascending: true });

  if (fieldError) {
    throw new Error(fieldError.message);
  }

  const fields = ((fieldData ?? []) as DynamicFieldRow[]).filter((field) => field.is_active);
  const fieldIds = fields.map((field) => field.id);

  const { data: optionData, error: optionError } = fieldIds.length
    ? await supabase
        .from("dynamic_form_field_options")
        .select("field_id, value_key, label_en, label_ar, is_active, display_order")
        .in("field_id", fieldIds)
        .order("display_order", { ascending: true })
    : { data: [], error: null };

  if (optionError) {
    throw new Error(optionError.message);
  }

  const optionMap = new Map<string, string[]>();
  for (const option of (optionData ?? []) as DynamicFieldOptionRow[]) {
    if (!option.is_active) continue;

    const label = String(option.label_ar || option.label_en || option.value_key).trim();
    const existing = optionMap.get(option.field_id) ?? [];
    existing.push(label);
    optionMap.set(option.field_id, existing);
  }

  return fields.map((field) => {
    const validation = field.validation_rules ?? {};
    return {
      id: field.id,
      modalId: field.form_context,
      fieldName: field.field_key,
      fieldLabel: String(field.label_ar || field.label_en || field.field_key).trim(),
      fieldType: field.field_type,
      fieldOptions: optionMap.get(field.id) ?? [],
      isRequired: field.is_required,
      isReadonly: Boolean(validation.readonly),
      placeholder: String(field.placeholder_ar || field.placeholder_en || "").trim(),
      validation: Object.keys(validation).length ? JSON.stringify(validation) : "",
      order: field.display_order,
      roleRestriction: String(validation.roleRestriction ?? "").trim(),
    } satisfies LegacyModalField;
  });
}

export async function fetchAuditFeed(limit = 120): Promise<AdminAuditEntry[]> {
  const rowLimit = Math.max(limit, 40);

  const [visitsResult, callsResult, ordersResult] = await Promise.all([
    supabase
      .from("visits")
      .select("id, user_id, customer_id, visit_result, checked_in_at, created_at")
      .order("checked_in_at", { ascending: false })
      .limit(rowLimit),
    supabase
      .from("calls")
      .select("id, user_id, customer_id, call_outcome, call_status, created_at")
      .order("created_at", { ascending: false })
      .limit(rowLimit),
    supabase
      .from("orders")
      .select("id, assigned_user_id, user_id, customer_id, customer_name, status, order_date, total_amount, created_at")
      .order("order_date", { ascending: false, nullsFirst: false })
      .limit(rowLimit),
  ]);

  if (visitsResult.error) throw new Error(visitsResult.error.message);
  if (callsResult.error) throw new Error(callsResult.error.message);
  if (ordersResult.error) throw new Error(ordersResult.error.message);

  const visits = (visitsResult.data ?? []) as VisitRow[];
  const calls = (callsResult.data ?? []) as CallRow[];
  const orders = (ordersResult.data ?? []) as OrderRow[];

  const profileIds = Array.from(
    new Set([
      ...visits.map((visit) => visit.user_id),
      ...calls.map((call) => call.user_id),
      ...orders.map((order) => order.assigned_user_id ?? "").filter(Boolean),
    ]),
  );
  const customerIds = Array.from(
    new Set([
      ...visits.map((visit) => visit.customer_id ?? "").filter(Boolean),
      ...calls.map((call) => call.customer_id ?? "").filter(Boolean),
      ...orders.map((order) => order.customer_id ?? "").filter(Boolean),
    ]),
  );

  const [profiles, customers] = await Promise.all([
    fetchProfilesByIds(profileIds),
    fetchCustomersByIds(customerIds),
  ]);

  const odooToProfileId = buildOdooToProfileMap(Array.from(profiles.values()));

  const entries: AdminAuditEntry[] = [
    ...visits.map((visit) => {
      const actor = profiles.get(visit.user_id);
      const customer = visit.customer_id ? customers.get(visit.customer_id) : null;
      return {
        id: `visit-${visit.id}`,
        type: "visit",
        timestamp: safeTimestamp(visit.checked_in_at || visit.created_at),
        actor: buildFallbackName(normalizeEmail(actor?.email), actor?.full_name) || "Unknown rep",
        customerName: customer?.customer_name || "Unknown customer",
        customerId: customer?.external_customer_id || visit.customer_id || "",
        detail: String(visit.visit_result ?? "").trim() || "Visit recorded",
        status: "Visit",
      } satisfies AdminAuditEntry;
    }),
    ...calls.map((call) => {
      const actor = profiles.get(call.user_id);
      const customer = call.customer_id ? customers.get(call.customer_id) : null;
      return {
        id: `call-${call.id}`,
        type: "call",
        timestamp: safeTimestamp(call.created_at),
        actor: buildFallbackName(normalizeEmail(actor?.email), actor?.full_name) || "Unknown agent",
        customerName: customer?.customer_name || "Unknown customer",
        customerId: customer?.external_customer_id || call.customer_id || "",
        detail: String(call.call_outcome ?? call.call_status ?? "").trim() || "CRM call activity",
        status: "Call",
      } satisfies AdminAuditEntry;
    }),
    ...orders.map((order) => {
      const resolvedUserId = resolveOrderUserId(order, odooToProfileId);
      const actor = resolvedUserId ? profiles.get(resolvedUserId) : null;
      const customer = order.customer_id ? customers.get(order.customer_id) : null;
      return {
        id: `order-${order.id}`,
        type: "order",
        timestamp: safeTimestamp(order.order_date || order.created_at),
        actor: actor
          ? buildFallbackName(normalizeEmail(actor.email), actor.full_name)
          : "Unassigned",
        customerName: String(order.customer_name ?? customer?.customer_name ?? "Unknown customer").trim(),
        customerId: customer?.external_customer_id || order.customer_id || "",
        detail: `Order total EGP ${parseNumber(order.total_amount).toLocaleString("en-US")}`,
        status: String(order.status ?? "pending").trim() || "pending",
      } satisfies AdminAuditEntry;
    }),
  ];

  return entries
    .filter((entry) => entry.timestamp)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, limit);
}

export function summarizeUsers(users: LegacyAdminUser[]): AdminUserSummary {
  return {
    totalUsers: users.length,
    managementUsers: users.filter((user) => user.isManagement).length,
    fieldUsers: users.filter((user) => !user.isManagement).length,
    forcedLogoutUsers: users.filter((user) => user.forceLogout).length,
  };
}

export function summarizeTargets(targets: LegacyAdminTarget[]): AdminTargetSummary {
  return {
    totalTargets: targets.length,
    totalTargetCalls: targets.reduce((sum, target) => sum + target.targetCalls, 0),
    totalTargetVisits: targets.reduce((sum, target) => sum + target.targetVisits, 0),
    totalTargetQuotations: targets.reduce(
      (sum, target) => sum + target.targetQuotations,
      0,
    ),
  };
}

export async function sendLegacyNotification(input: {
  title: string;
  content: string;
  sender: string;
  importance: "High" | "Medium" | "Normal";
  recipients: string[];
}): Promise<void> {
  const currentUserId = await requireAuthenticatedUserId();
  const normalizedRecipients = Array.from(
    new Set(input.recipients.map((recipient) => normalizeEmail(recipient)).filter(Boolean)),
  );

  if (normalizedRecipients.length === 0) {
    throw new Error("Notification must have at least one recipient.");
  }

  const { data: recipientProfiles, error: recipientError } = await supabase
    .from("profiles")
    .select("id, email, role, status")
    .in("email", normalizedRecipients)
    .eq("status", "active");

  if (recipientError) {
    throw new Error(recipientError.message);
  }

  const foundProfiles = (recipientProfiles ?? []) as ProfileRow[];
  const foundEmails = new Set(foundProfiles.map((profile) => normalizeEmail(profile.email)));
  const missingEmails = normalizedRecipients.filter((email) => !foundEmails.has(email));

  if (missingEmails.length > 0) {
    throw new Error(`Unknown recipients: ${missingEmails.join(", ")}`);
  }

  const uniqueRoles = Array.from(
    new Set(foundProfiles.map((profile) => normalizeRole(profile.role)).filter((role) => role !== "unknown")),
  );
  const audienceType =
    foundProfiles.length === 1 ? "user" : uniqueRoles.length === 1 ? "role" : "all";
  const audienceRole = audienceType === "role" ? uniqueRoles[0] : null;
  const audienceUserId = audienceType === "user" ? foundProfiles[0]?.id ?? null : null;

  const { data: notificationRow, error: notificationError } = await supabase
    .from("notifications")
    .insert({
      created_by: currentUserId,
      audience_type: audienceType,
      audience_role: audienceRole,
      audience_user_id: audienceUserId,
      channel: "in_app",
      title: input.title.trim(),
      body: input.content.trim(),
      metadata: {
        importance: input.importance,
        sender: input.sender,
        recipient_emails: normalizedRecipients,
      },
    })
    .select("id")
    .single();

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  const notificationId = notificationRow.id as string;
  const recipientRows = foundProfiles.map((profile) => ({
    notification_id: notificationId,
    user_id: profile.id,
  }));

  const { error: insertRecipientsError } = await supabase
    .from("notification_recipients")
    .insert(recipientRows);

  if (insertRecipientsError) {
    throw new Error(insertRecipientsError.message);
  }

  const { error: auditError } = await supabase.rpc("log_audit_event", {
    p_action_type: "send_notification",
    p_entity_type: "notification",
    p_entity_id: notificationId,
    p_description: "Notification sent from admin panel",
    p_metadata: {
      importance: input.importance,
      recipient_count: recipientRows.length,
    },
  });

  if (auditError) {
    throw new Error(auditError.message);
  }
}

export async function forceLegacyLogout(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.id) {
    throw new Error("Target user not found.");
  }

  const { error: rpcError } = await supabase.rpc("force_logout_user", {
    p_target_user_id: data.id,
    p_reason: "Forced from admin users page",
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }
}
