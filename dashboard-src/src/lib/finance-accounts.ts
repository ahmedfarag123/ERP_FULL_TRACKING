import { supabase } from "./supabase";
import type { FinanceAccount, FinanceAccountTreeNode } from "../types/finance";

export async function fetchFinanceAccounts(): Promise<FinanceAccount[]> {
  const { data, error } = await supabase
    .from("finance_accounts")
    .select("id, code, name, name_ar, type, parent_id, is_active, allow_posting, sort_order, created_at, created_by")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceAccount[];
}

export async function fetchActiveAccounts(): Promise<FinanceAccount[]> {
  const { data, error } = await supabase
    .from("finance_accounts")
    .select("id, code, name, name_ar, type, parent_id, is_active, allow_posting, sort_order, created_at, created_by")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceAccount[];
}

export async function fetchPostingAccounts(): Promise<FinanceAccount[]> {
  const { data, error } = await supabase
    .from("finance_accounts")
    .select("id, code, name, name_ar, type, parent_id, is_active, allow_posting, sort_order, created_at, created_by")
    .eq("is_active", true)
    .eq("allow_posting", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FinanceAccount[];
}

export async function createFinanceAccount(
  account: Omit<FinanceAccount, "id" | "createdAt" | "createdBy">
): Promise<FinanceAccount> {
  const { data, error } = await supabase
    .from("finance_accounts")
    .insert({
      code: account.code,
      name: account.name,
      name_ar: account.nameAr,
      type: account.type,
      parent_id: account.parentId,
      is_active: account.isActive,
      allow_posting: account.allowPosting,
      sort_order: account.sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as FinanceAccount;
}

export async function updateFinanceAccount(
  id: string,
  updates: Partial<Pick<FinanceAccount, "name" | "nameAr" | "parentId" | "isActive" | "allowPosting" | "sortOrder">>
): Promise<void> {
  const { error } = await supabase
    .from("finance_accounts")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.nameAr !== undefined && { name_ar: updates.nameAr }),
      ...(updates.parentId !== undefined && { parent_id: updates.parentId }),
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
      ...(updates.allowPosting !== undefined && { allow_posting: updates.allowPosting }),
      ...(updates.sortOrder !== undefined && { sort_order: updates.sortOrder }),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function archiveFinanceAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from("finance_accounts")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export function buildAccountTree(accounts: FinanceAccount[]): FinanceAccountTreeNode[] {
  const map = new Map<string, FinanceAccountTreeNode>();
  const roots: FinanceAccountTreeNode[] = [];

  for (const account of accounts) {
    map.set(account.id, { ...account, children: [], level: 0 });
  }

  for (const account of accounts) {
    const node = map.get(account.id)!;
    if (account.parentId && map.has(account.parentId)) {
      const parent = map.get(account.parentId)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
