import { supabase } from "./supabase";
import type {
  FinanceFiscalPeriod,
  FinanceCostCenter,
  FinanceDocumentSequence,
} from "../types/finance";

// ─── Fiscal Periods ────────────────────────────────────────────

export async function fetchFiscalPeriods(): Promise<FinanceFiscalPeriod[]> {
  const { data, error } = await supabase
    .from("finance_fiscal_periods")
    .select("id, name, start_date, end_date, status, closed_at, closed_by, created_at")
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceFiscalPeriod[];
}

export async function fetchOpenFiscalPeriods(): Promise<FinanceFiscalPeriod[]> {
  const { data, error } = await supabase
    .from("finance_fiscal_periods")
    .select("id, name, start_date, end_date, status, closed_at, closed_by, created_at")
    .eq("status", "open")
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceFiscalPeriod[];
}

export async function closeFiscalPeriod(periodId: string): Promise<void> {
  const { error } = await supabase.rpc("close_fiscal_period", {
    p_period_id: periodId,
  });
  if (error) throw new Error(error.message);
}

export async function reopenFiscalPeriod(periodId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("reopen_fiscal_period", {
    p_period_id: periodId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

// ─── Cost Centers ──────────────────────────────────────────────

export async function fetchCostCenters(): Promise<FinanceCostCenter[]> {
  const { data, error } = await supabase
    .from("finance_cost_centers")
    .select("id, code, name, name_ar, is_active, created_at")
    .order("code", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceCostCenter[];
}

export async function createCostCenter(
  center: Omit<FinanceCostCenter, "id" | "createdAt">
): Promise<FinanceCostCenter> {
  const { data, error } = await supabase
    .from("finance_cost_centers")
    .insert({
      code: center.code,
      name: center.name,
      name_ar: center.nameAr,
      is_active: center.isActive,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as FinanceCostCenter;
}

export async function updateCostCenter(
  id: string,
  updates: Partial<Pick<FinanceCostCenter, "name" | "nameAr" | "isActive">>
): Promise<void> {
  const { error } = await supabase
    .from("finance_cost_centers")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.nameAr !== undefined && { name_ar: updates.nameAr }),
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Document Sequences ────────────────────────────────────────

export async function fetchDocumentSequences(): Promise<FinanceDocumentSequence[]> {
  const { data, error } = await supabase
    .from("finance_document_sequences")
    .select("document_type, prefix, current_number, year_reset")
    .order("document_type", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceDocumentSequence[];
}

// ─── Driver Settlements ────────────────────────────────────────

export async function runDriverSettlement(
  driverId: string,
  periodStart: string,
  periodEnd: string
): Promise<string> {
  const { data, error } = await supabase.rpc("run_driver_settlement", {
    p_driver_id: driverId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function postDriverSettlement(settlementId: string): Promise<string> {
  const { data, error } = await supabase.rpc("post_driver_settlement", {
    p_settlement_id: settlementId,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function approveDriverSettlement(settlementId: string): Promise<void> {
  const { error } = await supabase
    .from("finance_driver_settlements")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", settlementId)
    .eq("status", "draft");

  if (error) throw new Error(error.message);
}
