import { supabase } from "./supabase";

export interface FinancePageVisibilitySetting {
  pageKey: string;
  enabled: boolean;
}

type FinancePageVisibilityRow = {
  page_key: string;
  enabled: boolean;
};

export async function fetchFinancePageVisibility(): Promise<FinancePageVisibilitySetting[]> {
  const { data, error } = await supabase
    .from("finance_page_visibility")
    .select("page_key, enabled")
    .order("page_key", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as FinancePageVisibilityRow[]).map((row) => ({
    pageKey: row.page_key,
    enabled: Boolean(row.enabled),
  }));
}

export async function setFinancePageVisibility(pageKey: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("finance_page_visibility")
    .upsert(
      {
        page_key: pageKey,
        enabled,
      },
      { onConflict: "page_key" },
    );

  if (error) throw new Error(error.message);
}

export async function setAllFinancePageVisibility(
  pageKeys: readonly string[],
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("finance_page_visibility")
    .upsert(
      pageKeys.map((pageKey) => ({
        page_key: pageKey,
        enabled,
      })),
      { onConflict: "page_key" },
    );

  if (error) throw new Error(error.message);
}
