import { supabase } from "./supabase";
import type { ManagedRole } from "../types/access-control";
import type { OdooActionRecord } from "../types/odoo-actions";

interface OdooActionRow {
  id: string;
  action_key: string;
  label: string;
  description: string;
  endpoint_path: string;
  http_method: string;
  odoo_model: string | null;
  odoo_method: string | null;
  is_active: boolean;
  allowed_roles: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

function serviceNameForMethod(method: string | null | undefined): string {
  switch (String(method ?? "").trim().toLowerCase()) {
    case "authenticate":
    case "version":
      return "common";
    default:
      return "object";
  }
}

function mapRowToRecord(row: OdooActionRow): OdooActionRecord {
  const allowedRoles: ManagedRole[] = [];
  if (Array.isArray(row.allowed_roles)) {
    for (const role of row.allowed_roles) {
      try {
        allowedRoles.push(ensureManagedRole(role));
      } catch {
        continue;
      }
    }
  }

  return {
    id: row.id,
    actionKey: row.action_key,
    label: row.label,
    description: row.description,
    endpointPath: row.endpoint_path,
    httpMethod: row.http_method,
    odooModel: row.odoo_model,
    odooMethod: row.odoo_method,
    serviceName: serviceNameForMethod(row.odoo_method),
    isActive: row.is_active ?? true,
    allowedRoles,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: safeIso(row.created_at),
    updatedAt: safeIso(row.updated_at),
  };
}

export async function fetchOdooActions(): Promise<OdooActionRecord[]> {
  const { data, error } = await supabase
    .from("odoo_actions")
    .select(
      "id, action_key, label, description, endpoint_path, http_method, odoo_model, odoo_method, is_active, allowed_roles, sort_order, created_at, updated_at"
    )
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as OdooActionRow[]).map(mapRowToRecord);
}

export async function fetchOdooActionByKey(actionKey: string): Promise<OdooActionRecord | null> {
  const { data, error } = await supabase
    .from("odoo_actions")
    .select(
      "id, action_key, label, description, endpoint_path, http_method, odoo_model, odoo_method, is_active, allowed_roles, sort_order, created_at, updated_at"
    )
    .eq("action_key", actionKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapRowToRecord(data as OdooActionRow);
}

export async function updateOdooActionStatus(actionKey: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_odoo_action_status", {
    p_action_key: actionKey,
    p_is_active: isActive,
  });

  if (error) throw new Error(error.message);
}

export async function isOdooActionEnabled(actionKey: string): Promise<boolean> {
  const action = await fetchOdooActionByKey(actionKey);
  return action?.isActive ?? false;
}

export function getRoleTone(role: ManagedRole): string {
  switch (role) {
    case "admin":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20";
    case "manager":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
    case "supervisor":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20";
    case "sales_agent":
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20";
    case "telesales":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20";
    default:
      return "bg-brand-25 text-gray-700 border-gray-200 dark:bg-brand-250/10 dark:text-gray-300 dark:border-gray-500/20";
  }
}
