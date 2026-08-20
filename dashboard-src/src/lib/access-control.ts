import { supabase } from "./supabase";
import { invokeAdminUserAuth } from "./admin-user-auth-client";
import type {
  AccessRecordStatus,
  CreateManagedUserInput,
  CreateManagedUserResult,
  DepartmentRecord,
  ManagedRole,
  PermissionRecord,
  PermissionRiskLevel,
  RecoveryLinkResult,
  RoleDefinitionRecord,
  UserAccessRecord,
  UserAccessUpdateInput,
} from "../types/access-control";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
  phone: string | null;
  password_enabled: boolean | null;
  otp_enabled: boolean | null;
  prefer_otp: boolean | null;
  approved_at: string | null;
  force_logout_at: string | null;
  last_login_at: string | null;
  last_login_method: string | null;
  created_at: string | null;
  department_id?: string | null;
  job_title?: string | null;
};

type DepartmentRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cost_center: string | null;
  manager_user_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type DepartmentRoleRow = {
  department_id: string;
  role: string;
};

type PermissionRow = {
  permission_key: string;
  module_key: string;
  module_label: string;
  label: string;
  description: string;
  route_path: string | null;
  risk_level: string;
  is_navigation: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type RoleDefinitionRow = {
  role: string;
  label: string;
  description: string;
  default_home_path: string | null;
  is_management: boolean | null;
  is_assignable: boolean | null;
  sort_order: number | null;
};

type RolePermissionRow = {
  role: string;
  permission_key: string;
};

const ROLE_ORDER: ManagedRole[] = [
  "admin",
  "manager",
  "spv",
  "dispatcher",
  "driver",
  "supervisor",
  "sales_agent",
  "telesales",
];

const ROLE_LABELS: Record<ManagedRole, string> = {
  admin: "Admin",
  manager: "Manager",
  spv: "SPV",
  dispatcher: "Dispatcher",
  driver: "Driver",
  supervisor: "Supervisor",
  sales_agent: "Sales Agent",
  telesales: "Telesales",
};

export function getRoleLabel(role: ManagedRole): string {
  return ROLE_LABELS[role];
}

export function getRoleTone(role: ManagedRole): string {
  switch (role) {
    case "admin":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
    case "manager":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
    case "spv":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300";
    case "dispatcher":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300";
    case "driver":
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300";
    case "supervisor":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300";
    case "sales_agent":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300";
    case "telesales":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
}

export function getRiskTone(riskLevel: PermissionRiskLevel): string {
  switch (riskLevel) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300";
    case "medium":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
    default:
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300";
  }
}

function ensureManagedRole(value: string | null | undefined): ManagedRole {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "admin":
    case "manager":
    case "spv":
    case "dispatcher":
    case "driver":
    case "supervisor":
    case "sales_agent":
    case "telesales":
      return String(value).trim().toLowerCase() as ManagedRole;
    default:
      throw new Error(`Unsupported role "${value ?? ""}"`);
  }
}

function normalizeStatus(value: string | null | undefined): AccessRecordStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "inactive" || normalized === "archived") {
    return normalized;
  }
  return "active";
}

function normalizeRisk(value: string | null | undefined): PermissionRiskLevel {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "low":
    case "high":
    case "critical":
      return String(value).trim().toLowerCase() as PermissionRiskLevel;
    default:
      return "medium";
  }
}

function safeText(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function safeIso(value: string | null | undefined): string {
  const raw = safeText(value);
  if (!raw) return "";

  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? raw : parsed.toISOString();
}

function fallbackName(profile: Pick<ProfileRow, "email" | "full_name">): string {
  const fullName = safeText(profile.full_name);
  if (fullName) return fullName;
  const email = safeText(profile.email);
  return email.split("@")[0]?.replace(/[._-]+/g, " ") || "Unknown User";
}

function isMissingProfileColumnError(error: { message?: string } | null | undefined): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    message.includes("department_id") ||
    message.includes("job_title")
  ) && message.includes("profiles");
}

async function selectProfilesWithAccessFields() {
  const extendedSelect =
    "id, email, full_name, role, status, phone, password_enabled, otp_enabled, prefer_otp, approved_at, force_logout_at, last_login_at, last_login_method, created_at, department_id, job_title";

  const fallbackSelect =
    "id, email, full_name, role, status, phone, password_enabled, otp_enabled, prefer_otp, approved_at, force_logout_at, last_login_at, last_login_method, created_at";

  const extendedResult = await supabase
    .from("profiles")
    .select(extendedSelect)
    .order("full_name", { ascending: true });

  if (!isMissingProfileColumnError(extendedResult.error)) {
    return extendedResult;
  }

  const fallbackResult = await supabase
    .from("profiles")
    .select(fallbackSelect)
    .order("full_name", { ascending: true });

  return {
    data: (fallbackResult.data ?? []).map((row) => ({
      ...row,
      department_id: null,
      job_title: null,
    })),
    error: fallbackResult.error,
  };
}

async function selectProfilesForDepartments() {
  const extendedResult = await supabase
    .from("profiles")
    .select("id, email, full_name, department_id")
    .order("full_name", { ascending: true });

  if (!isMissingProfileColumnError(extendedResult.error)) {
    return extendedResult;
  }

  const fallbackResult = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .order("full_name", { ascending: true });

  return {
    data: (fallbackResult.data ?? []).map((row) => ({
      ...row,
      department_id: null,
    })),
    error: fallbackResult.error,
  };
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("Authentication required.");

  return user.id;
}

async function bestEffortAudit(
  actionType: string,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata: Record<string, unknown>,
) {
  await supabase.rpc("log_audit_event", {
    p_action_type: actionType,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_description: description,
    p_metadata: metadata,
  });
}

async function fetchRolePermissionRows(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase
    .from("role_permission_assignments")
    .select("role, permission_key");

  if (error) throw new Error(error.message);
  return (data ?? []) as RolePermissionRow[];
}

export async function fetchRoleDefinitions(): Promise<RoleDefinitionRecord[]> {
  const [roleResult, profileResult] = await Promise.all([
    supabase
      .from("role_definitions")
      .select(
        "role, label, description, default_home_path, is_management, is_assignable, sort_order",
      )
      .order("sort_order", { ascending: true }),
    supabase.from("profiles").select("role"),
  ]);

  if (roleResult.error) throw new Error(roleResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);

  const counts = new Map<ManagedRole, number>();
  for (const role of ROLE_ORDER) counts.set(role, 0);

  for (const profile of (profileResult.data ?? []) as Array<{ role: string | null }>) {
    try {
      const role = ensureManagedRole(profile.role);
      counts.set(role, (counts.get(role) ?? 0) + 1);
    } catch {
      continue;
    }
  }

  return ((roleResult.data ?? []) as RoleDefinitionRow[]).map((row) => {
    const role = ensureManagedRole(row.role);
    return {
      role,
      label: safeText(row.label) || getRoleLabel(role),
      description: safeText(row.description),
      defaultHomePath: safeText(row.default_home_path) || "/",
      isManagement: Boolean(row.is_management),
      isAssignable: row.is_assignable ?? true,
      sortOrder: Number(row.sort_order ?? 0),
      userCount: counts.get(role) ?? 0,
    };
  });
}

export async function fetchPermissions(): Promise<PermissionRecord[]> {
  const [permissionResult, assignmentRows] = await Promise.all([
    supabase
      .from("permission_catalog")
      .select(
        "permission_key, module_key, module_label, label, description, route_path, risk_level, is_navigation, is_active, sort_order",
      )
      .order("module_label", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    fetchRolePermissionRows(),
  ]);

  if (permissionResult.error) throw new Error(permissionResult.error.message);

  const roleMap = new Map<string, ManagedRole[]>();
  for (const assignment of assignmentRows) {
    let role: ManagedRole;
    try {
      role = ensureManagedRole(assignment.role);
    } catch {
      continue;
    }

    const existing = roleMap.get(assignment.permission_key) ?? [];
    existing.push(role);
    roleMap.set(assignment.permission_key, existing);
  }

  return ((permissionResult.data ?? []) as PermissionRow[]).map((row) => ({
    permissionKey: row.permission_key,
    moduleKey: safeText(row.module_key),
    moduleLabel: safeText(row.module_label),
    label: safeText(row.label),
    description: safeText(row.description),
    routePath: safeText(row.route_path),
    riskLevel: normalizeRisk(row.risk_level),
    isNavigation: Boolean(row.is_navigation),
    isActive: row.is_active ?? true,
    sortOrder: Number(row.sort_order ?? 0),
    assignedRoles: (roleMap.get(row.permission_key) ?? []).sort(
      (left, right) => ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
    ),
  }));
}

export async function fetchDepartments(): Promise<DepartmentRecord[]> {
  const [departmentResult, departmentRoleResult, profileResult] = await Promise.all([
    supabase
      .from("departments")
      .select(
        "id, slug, name, description, cost_center, manager_user_id, is_active, created_at, updated_at",
      )
      .order("name", { ascending: true }),
    supabase.from("department_role_assignments").select("department_id, role"),
    selectProfilesForDepartments(),
  ]);

  if (departmentResult.error) throw new Error(departmentResult.error.message);
  if (departmentRoleResult.error) throw new Error(departmentRoleResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);

  const departments = (departmentResult.data ?? []) as DepartmentRow[];
  const departmentRoles = (departmentRoleResult.data ?? []) as DepartmentRoleRow[];
  const profiles = (profileResult.data ?? []) as Array<{
    id: string;
    email: string | null;
    full_name: string | null;
    department_id: string | null;
  }>;

  const memberCounts = new Map<string, number>();
  const managers = new Map<string, string>();
  for (const profile of profiles) {
    if (profile.department_id) {
      memberCounts.set(
        profile.department_id,
        (memberCounts.get(profile.department_id) ?? 0) + 1,
      );
    }
    managers.set(profile.id, fallbackName(profile));
  }

  const roleMap = new Map<string, ManagedRole[]>();
  for (const assignment of departmentRoles) {
    let role: ManagedRole;
    try {
      role = ensureManagedRole(assignment.role);
    } catch {
      continue;
    }

    const existing = roleMap.get(assignment.department_id) ?? [];
    existing.push(role);
    roleMap.set(assignment.department_id, existing);
  }

  return departments.map((row) => ({
    id: row.id,
    slug: safeText(row.slug),
    name: safeText(row.name),
    description: safeText(row.description),
    costCenter: safeText(row.cost_center),
    managerUserId: row.manager_user_id ?? null,
    managerName: managers.get(row.manager_user_id ?? "") ?? "",
    isActive: row.is_active ?? true,
    memberCount: memberCounts.get(row.id) ?? 0,
    allowedRoles: (roleMap.get(row.id) ?? []).sort(
      (left, right) => ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
    ),
    createdAt: safeIso(row.created_at),
    updatedAt: safeIso(row.updated_at),
  }));
}

export async function fetchUserAccessRecords(): Promise<UserAccessRecord[]> {
  const [profileResult, departments, permissions, assignmentRows] = await Promise.all([
    selectProfilesWithAccessFields(),
    fetchDepartments(),
    fetchPermissions(),
    fetchRolePermissionRows(),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);

  const departmentMap = new Map(departments.map((department) => [department.id, department]));
  const permissionMap = new Map(permissions.map((permission) => [permission.permissionKey, permission]));
  const rolePermissionMap = new Map<ManagedRole, PermissionRecord[]>();

  for (const role of ROLE_ORDER) {
    rolePermissionMap.set(role, []);
  }

  for (const assignment of assignmentRows) {
    let role: ManagedRole;
    try {
      role = ensureManagedRole(assignment.role);
    } catch {
      continue;
    }

    const permission = permissionMap.get(assignment.permission_key);
    if (!permission) continue;

    const existing = rolePermissionMap.get(role) ?? [];
    existing.push(permission);
    rolePermissionMap.set(role, existing);
  }

  return ((profileResult.data ?? []) as ProfileRow[])
    .map((row) => {
      const role = ensureManagedRole(row.role);
      const department = row.department_id
        ? departmentMap.get(row.department_id)
        : undefined;

      return {
        id: row.id,
        email: safeText(row.email).toLowerCase(),
        fullName: fallbackName(row),
        role,
        status: normalizeStatus(row.status),
        departmentId: row.department_id ?? null,
        departmentName: department?.name ?? "",
        jobTitle: safeText(row.job_title),
        phone: safeText(row.phone),
        approvedAt: safeIso(row.approved_at),
        forceLogoutAt: safeIso(row.force_logout_at),
        passwordEnabled: row.password_enabled ?? true,
        otpEnabled: Boolean(row.otp_enabled),
        preferOtp: Boolean(row.prefer_otp),
        lastLoginAt: safeIso(row.last_login_at),
        lastLoginMethod: safeText(row.last_login_method),
        createdAt: safeIso(row.created_at),
        effectivePermissions: [...(rolePermissionMap.get(role) ?? [])].sort(
          (left, right) => left.sortOrder - right.sortOrder,
        ),
      } satisfies UserAccessRecord;
    })
    .sort((left, right) =>
      `${left.fullName} ${left.email}`.localeCompare(
        `${right.fullName} ${right.email}`,
        "en",
        { sensitivity: "base" },
      ),
    );
}

export async function fetchUserAccessRecord(userId: string): Promise<UserAccessRecord | null> {
  const records = await fetchUserAccessRecords();
  return records.find((record) => record.id === userId) ?? null;
}

export async function upsertPermission(input: {
  permissionKey: string;
  moduleKey: string;
  moduleLabel: string;
  label: string;
  description: string;
  routePath?: string;
  riskLevel: PermissionRiskLevel;
  isNavigation: boolean;
  isActive: boolean;
  sortOrder: number;
}) {
  const { error } = await supabase.from("permission_catalog").upsert(
    {
      permission_key: input.permissionKey.trim(),
      module_key: input.moduleKey.trim(),
      module_label: input.moduleLabel.trim(),
      label: input.label.trim(),
      description: input.description.trim(),
      route_path: input.routePath?.trim() || null,
      risk_level: input.riskLevel,
      is_navigation: input.isNavigation,
      is_active: input.isActive,
      sort_order: input.sortOrder,
    },
    { onConflict: "permission_key" },
  );

  if (error) throw new Error(error.message);

  await bestEffortAudit(
    "upsert_permission",
    "permission_catalog",
    null,
    "Upserted permission catalog entry",
    { permission_key: input.permissionKey.trim() },
  );
}

export async function setPermissionActive(permissionKey: string, isActive: boolean) {
  const { error } = await supabase
    .from("permission_catalog")
    .update({ is_active: isActive })
    .eq("permission_key", permissionKey);

  if (error) throw new Error(error.message);

  await bestEffortAudit(
    isActive ? "activate_permission" : "archive_permission",
    "permission_catalog",
    null,
    `${isActive ? "Activated" : "Archived"} permission catalog entry`,
    { permission_key: permissionKey, is_active: isActive },
  );
}

export async function upsertRoleDefinition(input: {
  role: ManagedRole;
  label: string;
  description: string;
  defaultHomePath: string;
  isManagement: boolean;
  isAssignable: boolean;
  sortOrder: number;
}) {
  const { error } = await supabase.from("role_definitions").upsert(
    {
      role: input.role,
      label: input.label.trim(),
      description: input.description.trim(),
      default_home_path: input.defaultHomePath.trim() || "/",
      is_management: input.isManagement,
      is_assignable: input.isAssignable,
      sort_order: input.sortOrder,
    },
    { onConflict: "role" },
  );

  if (error) throw new Error(error.message);

  await bestEffortAudit(
    "upsert_role_definition",
    "role_definition",
    null,
    "Updated role definition",
    { role: input.role },
  );
}

export async function setRolePermissions(role: ManagedRole, permissionKeys: string[]) {
  const { error } = await supabase.rpc("set_role_permissions", {
    p_role: role,
    p_permission_keys: permissionKeys,
  });

  if (error) throw new Error(error.message);
}

export async function upsertDepartment(input: {
  id?: string;
  slug: string;
  name: string;
  description: string;
  costCenter?: string;
  managerUserId?: string | null;
  isActive: boolean;
  allowedRoles: ManagedRole[];
}) {
  const userId = await requireUserId();
  const payload = {
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description.trim() || null,
    cost_center: input.costCenter?.trim() || null,
    manager_user_id: input.managerUserId || null,
    is_active: input.isActive,
    updated_by: userId,
  };

  const query = input.id
    ? supabase.from("departments").update(payload).eq("id", input.id).select("id").single()
    : supabase
        .from("departments")
        .insert({ ...payload, created_by: userId })
        .select("id")
        .single();

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const departmentId = String(data.id);

  await supabase.rpc("set_department_roles", {
    p_department_id: departmentId,
    p_roles: input.allowedRoles,
  });

  await bestEffortAudit(
    "upsert_department",
    "department",
    departmentId,
    "Upserted department record",
    { slug: input.slug.trim(), allowed_roles: input.allowedRoles },
  );
}

export async function setDepartmentActive(departmentId: string, isActive: boolean) {
  const { error } = await supabase
    .from("departments")
    .update({ is_active: isActive })
    .eq("id", departmentId);

  if (error) throw new Error(error.message);

  await bestEffortAudit(
    isActive ? "activate_department" : "archive_department",
    "department",
    departmentId,
    `${isActive ? "Activated" : "Archived"} department`,
    { department_id: departmentId, is_active: isActive },
  );
}

export async function updateUserAccess(input: UserAccessUpdateInput) {
  const { error } = await supabase.rpc("admin_update_profile_access", {
    p_target_user_id: input.userId,
    p_full_name: input.fullName ?? null,
    p_role: input.role ?? null,
    p_status: input.status ?? null,
    p_department_id: input.departmentId ?? null,
    p_clear_department: input.departmentId === null,
    p_job_title: input.jobTitle ?? null,
    p_phone: input.phone ?? null,
    p_password_enabled: input.passwordEnabled ?? null,
    p_otp_enabled: input.otpEnabled ?? null,
    p_prefer_otp: input.preferOtp ?? null,
    p_approved:
      typeof input.approved === "boolean" ? input.approved : null,
    p_force_unlock: Boolean(input.forceUnlock),
  });

  if (error) throw new Error(error.message);
}

export async function forceUserLogout(userId: string, reason = "Forced from admin access panel") {
  const { error } = await supabase.rpc("force_logout_user", {
    p_target_user_id: userId,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);
}

export async function createManagedUser(
  input: CreateManagedUserInput,
): Promise<CreateManagedUserResult> {
  return invokeAdminUserAuth<CreateManagedUserResult>({
    action: "create-user",
    payload: input,
  });
}

export async function resendManagedUserInvite(payload: {
  userId: string;
  email: string;
  fullName: string;
}) {
  return invokeAdminUserAuth<{ invitationSent: boolean }>({
    action: "invite-user",
    payload,
  });
}

export async function generateRecoveryLink(payload: {
  userId: string;
  email: string;
}): Promise<RecoveryLinkResult> {
  return invokeAdminUserAuth<RecoveryLinkResult>({
    action: "generate-recovery-link",
    payload,
  });
}

export async function setManagedUserPassword(payload: {
  userId: string;
  password: string;
}) {
  return invokeAdminUserAuth<{ updated: boolean }>({
    action: "set-password",
    payload,
  });
}

export async function fetchAssignableManagers(): Promise<Array<{
  id: string;
  label: string;
  role: ManagedRole;
}>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .in("role", ["admin", "manager", "spv", "dispatcher", "supervisor"])
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{
    id: string;
    email: string | null;
    full_name: string | null;
    role: string | null;
  }>).map((row) => {
    const role = ensureManagedRole(row.role);
    return {
      id: row.id,
      label: `${fallbackName(row)}${row.email ? ` (${row.email})` : ""}`,
      role,
    };
  });
}

export async function fetchDepartmentMemberProfiles(): Promise<Map<string, ProfileRow>> {
  const { data, error } = await selectProfilesWithAccessFields();

  if (error) throw new Error(error.message);

  return new Map(((data ?? []) as ProfileRow[]).map((row) => [row.id, row]));
}

export { ROLE_ORDER };
