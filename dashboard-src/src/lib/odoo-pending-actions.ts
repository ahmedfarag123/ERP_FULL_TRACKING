import { supabase } from "./supabase";
import type {
  OdooPendingAction,
  OdooPendingActionWithMeta,
  OdooActionAuditLogEntry,
  OdooActionCounts,
  OdooActionStatus,
  OdooEntityType,
  OdooActionType,
  OdooValidationResult,
} from "../types/odoo-pending-actions";

// ============================================================
// Fetch pending actions with optional filters
// ============================================================

export interface FetchPendingActionsOptions {
  status?: OdooActionStatus | "all";
  entityType?: OdooEntityType | "all";
  actionType?: OdooActionType | "all";
  createdBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function fetchPendingActions(
  options: FetchPendingActionsOptions = {}
): Promise<{ data: OdooPendingActionWithMeta[]; total: number }> {
  const {
    status = "all",
    entityType = "all",
    actionType = "all",
    createdBy,
    search,
    limit = 50,
    offset = 0,
  } = options;

  let query = supabase
    .from("odoo_pending_actions")
    .select(
      `
        *,
        creator:profiles!odoo_pending_actions_created_by_fkey(full_name, email),
        approver:profiles!odoo_pending_actions_approved_by_fkey(full_name, email)
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (entityType !== "all") {
    query = query.eq("entity_type", entityType);
  }
  if (actionType !== "all") {
    query = query.eq("action_type", actionType);
  }
  if (createdBy) {
    query = query.eq("created_by", createdBy);
  }
  if (search?.trim()) {
    const term = search.trim();
    query = query.or(
      `odoo_model.ilike.%${term}%,entity_type.ilike.%${term}%,action_type.ilike.%${term}%,error_message.ilike.%${term}%,odoo_reference.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<
    OdooPendingAction & {
      creator: { full_name: string | null; email: string | null } | null;
      approver: { full_name: string | null; email: string | null } | null;
    }
  >;

  const mapped: OdooPendingActionWithMeta[] = rows.map((row) => ({
    ...row,
    creator_name: row.creator?.full_name ?? row.creator?.email ?? undefined,
    approver_name: row.approver?.full_name ?? row.approver?.email ?? undefined,
  }));

  return { data: mapped, total: count ?? 0 };
}

// ============================================================
// Fetch single pending action
// ============================================================

export async function fetchPendingAction(
  actionId: string
): Promise<OdooPendingActionWithMeta | null> {
  const { data, error } = await supabase
    .from("odoo_pending_actions")
    .select(
      `
        *,
        creator:profiles!odoo_pending_actions_created_by_fkey(full_name, email),
        approver:profiles!odoo_pending_actions_approved_by_fkey(full_name, email)
      `
    )
    .eq("id", actionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as OdooPendingAction & {
    creator: { full_name: string | null; email: string | null } | null;
    approver: { full_name: string | null; email: string | null } | null;
  };

  return {
    ...row,
    creator_name: row.creator?.full_name ?? row.creator?.email ?? undefined,
    approver_name: row.approver?.full_name ?? row.approver?.email ?? undefined,
  };
}

// ============================================================
// Create a pending action
// ============================================================

export async function createPendingAction(params: {
  entityType: OdooEntityType;
  actionType: OdooActionType;
  odooModel: string;
  odooMethod?: string;
  entityId?: string;
  payload: Record<string, unknown>;
  validationResult?: OdooValidationResult;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_odoo_pending_action", {
    p_entity_type: params.entityType,
    p_action_type: params.actionType,
    p_odoo_model: params.odooModel,
    p_odoo_method: params.odooMethod ?? "create",
    p_entity_id: params.entityId ?? null,
    p_payload_json: params.payload,
    p_validation_result: params.validationResult ?? null,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

// ============================================================
// Approve / Reject / Retry
// ============================================================

export async function approvePendingAction(actionId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_odoo_pending_action", {
    p_action_id: actionId,
  });
  if (error) throw new Error(error.message);
}

export async function bulkApprovePendingActions(actionIds: string[]): Promise<{ approved: number; failed: string[] }> {
  const failed: string[] = [];
  let approved = 0;

  // Approve in parallel batches of 5
  for (let i = 0; i < actionIds.length; i += 5) {
    const batch = actionIds.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((id) => approvePendingAction(id))
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        approved++;
      } else {
        failed.push(batch[idx]);
      }
    });
  }

  return { approved, failed };
}

export async function rejectPendingAction(
  actionId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc("reject_odoo_pending_action", {
    p_action_id: actionId,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function retryPendingAction(actionId: string): Promise<void> {
  const { error } = await supabase.rpc("retry_odoo_action", {
    p_action_id: actionId,
  });
  if (error) throw new Error(error.message);
}

// ============================================================
// Execute approved action via edge function
// ============================================================

export async function executePendingAction(actionId: string): Promise<{
  success: boolean;
  odoo_record_id?: number;
  odoo_reference?: string;
  error?: string;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Not authenticated.");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Supabase URL not configured.");

  const functionUrl = `${supabaseUrl}/functions/v1/odoo-execute-action`;

  const res = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action_id: actionId }),
  });

  const json = await res.json().catch(() => null) as Record<string, unknown> | null;

  if (!res.ok || json?.success === false) {
    const errMsg = typeof json?.error === "string" ? json.error : `Execution failed (${res.status})`;
    throw new Error(errMsg);
  }

  return {
    success: true,
    odoo_record_id: typeof json?.odoo_record_id === "number" ? json.odoo_record_id : undefined,
    odoo_reference: typeof json?.odoo_reference === "string" ? json.odoo_reference : undefined,
  };
}

export async function bulkExecutePendingActions(actionIds: string[]): Promise<{ executed: number; failed: string[] }> {
  const failed: string[] = [];
  let executed = 0;

  for (let i = 0; i < actionIds.length; i += 3) {
    const batch = actionIds.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((id) => executePendingAction(id))
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        executed++;
      } else {
        failed.push(batch[idx]);
      }
    });
  }

  return { executed, failed };
}

// ============================================================
// Audit log
// ============================================================

export async function fetchActionAuditLog(
  actionId: string
): Promise<OdooActionAuditLogEntry[]> {
  const { data, error } = await supabase.rpc("get_odoo_action_audit_log", {
    p_action_id: actionId,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as OdooActionAuditLogEntry[];
}

// ============================================================
// Counts for KPIs
// ============================================================

export async function fetchActionCounts(): Promise<
  Partial<Record<OdooActionStatus, number>>
> {
  const { data, error } = await supabase.rpc("get_odoo_action_counts");
  if (error) throw new Error(error.message);

  const counts: Partial<Record<OdooActionStatus, number>> = {};
  for (const row of (data ?? []) as OdooActionCounts[]) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}

// ============================================================
// Delete draft actions
// ============================================================

export async function deletePendingAction(actionId: string): Promise<void> {
  const { error } = await supabase
    .from("odoo_pending_actions")
    .delete()
    .eq("id", actionId)
    .eq("status", "draft");

  if (error) throw new Error(error.message);
}
