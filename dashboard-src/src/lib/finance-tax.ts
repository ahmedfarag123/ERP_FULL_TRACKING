import { supabase } from "./supabase";
import type { FinanceTaxRate } from "../types/finance";

export async function fetchTaxRates(): Promise<FinanceTaxRate[]> {
  const { data, error } = await supabase
    .from("finance_tax_rates")
    .select("id, name, rate, account_id, is_active, created_at")
    .order("rate", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceTaxRate[];
}

export async function fetchActiveTaxRates(): Promise<FinanceTaxRate[]> {
  const { data, error } = await supabase
    .from("finance_tax_rates")
    .select("id, name, rate, account_id, is_active, created_at")
    .eq("is_active", true)
    .order("rate", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceTaxRate[];
}

export async function createTaxRate(
  taxRate: Omit<FinanceTaxRate, "id" | "createdAt">
): Promise<FinanceTaxRate> {
  const { data, error } = await supabase
    .from("finance_tax_rates")
    .insert({
      name: taxRate.name,
      rate: taxRate.rate,
      account_id: taxRate.accountId,
      is_active: taxRate.isActive,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as FinanceTaxRate;
}

export async function updateTaxRate(
  id: string,
  updates: Partial<Pick<FinanceTaxRate, "name" | "rate" | "accountId" | "isActive">>
): Promise<void> {
  const { error } = await supabase
    .from("finance_tax_rates")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.rate !== undefined && { rate: updates.rate }),
      ...(updates.accountId !== undefined && { account_id: updates.accountId }),
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate) / 100;
}

export function calculateLineTax(
  unitPrice: number,
  quantity: number,
  discountPct: number,
  taxRate: number
): number {
  const lineTotal = unitPrice * quantity * (1 - discountPct / 100);
  return Math.round(lineTotal * taxRate) / 100;
}
