import { supabase } from "./supabase";
import { invokeAdminUserAuth } from "./admin-user-auth-client";
import type { LegacyRole } from "../types/admin-operations";

export type AdminManagedRole = Exclude<LegacyRole, "unknown">;
export type AdminManagedStatus = "active" | "inactive" | "archived";

export interface AdminManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminManagedRole;
  status: AdminManagedStatus;
  phone: string;
  avatarUrl: string | null;
  approvedAt: string;
  forceLogoutAt: string;
  lastLoginAt: string;
  lastLoginMethod: string;
  createdAt: string;
  passwordEnabled: boolean;
  otpEnabled: boolean;
  preferOtp: boolean;
}

export interface AdminManagedUserUpdateInput {
  userId: string;
  fullName?: string;
  role?: AdminManagedRole;
  status?: AdminManagedStatus;
  phone?: string;
  approved?: boolean;
  passwordEnabled?: boolean;
  otpEnabled?: boolean;
  preferOtp?: boolean;
}

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
  phone: string | null;
  avatar_url: string | null;
  approved_at: string | null;
  force_logout_at: string | null;
  last_login_at: string | null;
  last_login_method: string | null;
  created_at: string | null;
  password_enabled: boolean | null;
  otp_enabled: boolean | null;
  prefer_otp: boolean | null;
};

function ensureRole(value: string | null | undefined): AdminManagedRole {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "admin":
    case "manager":
    case "spv":
    case "dispatcher":
    case "driver":
    case "supervisor":
    case "employee":
    case "sales_agent":
    case "telesales":
      return String(value).trim().toLowerCase() as AdminManagedRole;
    default:
      return "sales_agent";
  }
}

function normalizeStatus(value: string | null | undefined): AdminManagedStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "inactive" || normalized === "archived") {
    return normalized;
  }

  return "active";
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

function fallbackName(row: Pick<ProfileRow, "email" | "full_name">): string {
  const fullName = safeText(row.full_name);
  if (fullName) return fullName;

  const email = safeText(row.email);
  return email.split("@")[0]?.replace(/[._-]+/g, " ") || "Unknown User";
}

export function getAdminRoleLabel(role: AdminManagedRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "spv":
      return "SPV";
    case "dispatcher":
      return "Dispatcher";
    case "driver":
      return "Driver";
    case "supervisor":
      return "Supervisor";
    case "employee":
      return "موظف";
    case "sales_agent":
      return "Sales Agent";
    case "telesales":
      return "Telesales";
  }
}

export function getAdminRoleTone(role: AdminManagedRole): string {
  switch (role) {
    case "admin":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "manager":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "spv":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "dispatcher":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "driver":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "supervisor":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "employee":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "sales_agent":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "telesales":
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export async function fetchAdminUsers(): Promise<AdminManagedUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, status, phone, avatar_url, approved_at, force_logout_at, last_login_at, last_login_method, created_at, password_enabled, otp_enabled, prefer_otp",
    )
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as ProfileRow[]).map((row) => ({
    id: row.id,
    email: safeText(row.email).toLowerCase(),
    fullName: fallbackName(row),
    role: ensureRole(row.role),
    status: normalizeStatus(row.status),
    phone: safeText(row.phone),
    avatarUrl: safeText(row.avatar_url) || null,
    approvedAt: safeIso(row.approved_at),
    forceLogoutAt: safeIso(row.force_logout_at),
    lastLoginAt: safeIso(row.last_login_at),
    lastLoginMethod: safeText(row.last_login_method),
    createdAt: safeIso(row.created_at),
    passwordEnabled: row.password_enabled ?? true,
    otpEnabled: Boolean(row.otp_enabled),
    preferOtp: Boolean(row.prefer_otp),
  }));
}

export async function updateAdminUser(input: AdminManagedUserUpdateInput) {
  const payload: Record<string, unknown> = {};

  if (typeof input.fullName === "string") payload.full_name = input.fullName.trim();
  if (input.role) payload.role = input.role;
  if (input.status) payload.status = input.status;
  if (typeof input.phone === "string") payload.phone = input.phone.trim() || null;
  if (typeof input.passwordEnabled === "boolean") payload.password_enabled = input.passwordEnabled;
  if (typeof input.otpEnabled === "boolean") payload.otp_enabled = input.otpEnabled;
  if (typeof input.preferOtp === "boolean") payload.prefer_otp = input.preferOtp;
  if (typeof input.approved === "boolean") {
    payload.approved_at = input.approved ? new Date().toISOString() : null;
  }

  const { error } = await supabase.from("profiles").update(payload).eq("id", input.userId);
  if (error) throw new Error(error.message);
}

export async function createAdminUser(input: {
  email: string;
  fullName: string;
  role: AdminManagedRole;
  phone?: string;
  initialPassword?: string;
  sendInvite?: boolean;
}) {
  return invokeAdminUserAuth<{
    userId: string;
    email: string;
    invitationSent: boolean;
    temporaryPasswordSet: boolean;
  }>({
    action: "create-user",
    payload: input,
  });
}

export async function resendAdminUserInvite(payload: {
  userId: string;
  email: string;
  fullName: string;
}) {
  return invokeAdminUserAuth<{ invitationSent: boolean }>({
    action: "invite-user",
    payload,
  });
}

export async function generateAdminUserRecoveryLink(payload: {
  userId: string;
  email: string;
}) {
  return invokeAdminUserAuth<{ actionLink: string }>({
    action: "generate-recovery-link",
    payload,
  });
}

export async function setAdminUserPassword(payload: {
  userId: string;
  password: string;
}) {
  return invokeAdminUserAuth<{ updated: boolean }>({
    action: "set-password",
    payload,
  });
}

export async function deleteAdminUser(payload: { userId: string }) {
  return invokeAdminUserAuth<{ deleted: boolean }>({
    action: "delete-user",
    payload,
  });
}

export async function assignCustomerToUser(customerId: string, userId: string | null) {
  const { error } = await supabase
    .from("customers")
    .update({
      assigned_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (error) throw new Error(error.message);
}
