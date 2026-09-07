import type { ManagedRole } from "../types/access-control";
import { supabase } from "./supabase";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
  phone: string | null;
  avatar_url: string | null;
  password_enabled: boolean | null;
  otp_enabled: boolean | null;
  prefer_otp: boolean | null;
  last_login_at: string | null;
  last_login_method: string | null;
  created_at: string | null;
  department_id?: string | null;
  job_title?: string | null;
};

export interface AccountProfile {
  id: string;
  email: string;
  fullName: string;
  role: ManagedRole;
  status: "active" | "inactive" | "archived";
  phone: string;
  avatarUrl: string | null;
  departmentId: string | null;
  departmentName: string;
  jobTitle: string;
  passwordEnabled: boolean;
  otpEnabled: boolean;
  preferOtp: boolean;
  lastLoginAt: string;
  lastLoginMethod: string;
  createdAt: string;
}

export interface AccountProfileUpdateInput {
  fullName: string;
  phone: string;
  avatarUrl?: string | null;
}

function safeText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function safeIso(value: string | null | undefined) {
  const raw = safeText(value);
  if (!raw) return "";

  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? raw : parsed.toISOString();
}

function normalizeStatus(value: string | null | undefined): "active" | "inactive" | "archived" {
  const normalized = safeText(value).toLowerCase();
  if (normalized === "inactive" || normalized === "archived") {
    return normalized;
  }

  return "active";
}

function ensureManagedRole(value: string | null | undefined): ManagedRole {
  switch (safeText(value).toLowerCase()) {
    case "admin":
    case "manager":
    case "spv":
    case "dispatcher":
    case "driver":
    case "supervisor":
    case "employee":
    case "sales_agent":
    case "telesales":
      return safeText(value).toLowerCase() as ManagedRole;
    default:
      return "sales_agent";
  }
}

function isMissingProfileColumnError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  return (message.includes("department_id") || message.includes("job_title")) && message.includes("profiles");
}

async function requireCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("Authentication required.");

  return user.id;
}

async function selectCurrentProfile(userId: string) {
  const extendedSelect =
    "id, email, full_name, role, status, phone, avatar_url, password_enabled, otp_enabled, prefer_otp, last_login_at, last_login_method, created_at, department_id, job_title";
  const fallbackSelect =
    "id, email, full_name, role, status, phone, avatar_url, password_enabled, otp_enabled, prefer_otp, last_login_at, last_login_method, created_at";

  const extendedResult = await supabase
    .from("profiles")
    .select(extendedSelect)
    .eq("id", userId)
    .maybeSingle();

  if (!isMissingProfileColumnError(extendedResult.error)) {
    return extendedResult;
  }

  const fallbackResult = await supabase
    .from("profiles")
    .select(fallbackSelect)
    .eq("id", userId)
    .maybeSingle();

  return {
    data: fallbackResult.data
      ? {
          ...fallbackResult.data,
          department_id: null,
          job_title: null,
        }
      : null,
    error: fallbackResult.error,
  };
}

export async function fetchCurrentAccountProfile(): Promise<AccountProfile> {
  const userId = await requireCurrentUserId();
  const { data, error } = await selectCurrentProfile(userId);

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profile not found.");

  const profile = data as ProfileRow;
  let departmentName = "";

  if (profile.department_id) {
    const departmentResult = await supabase
      .from("departments")
      .select("name")
      .eq("id", profile.department_id)
      .maybeSingle();

    if (departmentResult.error) throw new Error(departmentResult.error.message);
    departmentName = safeText(departmentResult.data?.name);
  }

  return {
    id: profile.id,
    email: safeText(profile.email).toLowerCase(),
    fullName: safeText(profile.full_name) || safeText(profile.email).split("@")[0] || "Unknown User",
    role: ensureManagedRole(profile.role),
    status: normalizeStatus(profile.status),
    phone: safeText(profile.phone),
    avatarUrl: safeText(profile.avatar_url) || null,
    departmentId: profile.department_id ?? null,
    departmentName,
    jobTitle: safeText(profile.job_title),
    passwordEnabled: profile.password_enabled ?? true,
    otpEnabled: Boolean(profile.otp_enabled),
    preferOtp: Boolean(profile.prefer_otp),
    lastLoginAt: safeIso(profile.last_login_at),
    lastLoginMethod: safeText(profile.last_login_method),
    createdAt: safeIso(profile.created_at),
  };
}

export async function updateCurrentAccountProfile(input: AccountProfileUpdateInput) {
  const payload: Record<string, string | null> = {
    p_full_name: input.fullName.trim(),
    p_phone: input.phone.trim(),
  };

  if (Object.prototype.hasOwnProperty.call(input, "avatarUrl")) {
    payload.p_avatar_url = input.avatarUrl ?? "";
  }

  const { error } = await supabase.rpc("self_update_profile", payload);
  if (error) throw new Error(error.message);
}

export async function uploadCurrentAccountAvatar(file: File) {
  const userId = await requireCurrentUserId();
  const extension = safeText(file.name.split(".").pop()).toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const staleResult = await supabase.storage.from(PROFILE_AVATAR_BUCKET).list(userId, { limit: 100 });
  if (!staleResult.error && staleResult.data) {
    const stalePaths = staleResult.data
      .filter((entry) => entry.name && `${userId}/${entry.name}` !== path)
      .map((entry) => `${userId}/${entry.name}`);

    if (stalePaths.length > 0) {
      await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove(stalePaths);
    }
  }

  return supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function clearCurrentAccountAvatarAssets() {
  const userId = await requireCurrentUserId();
  const listResult = await supabase.storage.from(PROFILE_AVATAR_BUCKET).list(userId, { limit: 100 });

  if (listResult.error) throw new Error(listResult.error.message);

  const paths = (listResult.data ?? [])
    .filter((entry) => entry.name)
    .map((entry) => `${userId}/${entry.name}`);

  if (paths.length === 0) return;

  const removeResult = await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove(paths);
  if (removeResult.error) throw new Error(removeResult.error.message);
}
