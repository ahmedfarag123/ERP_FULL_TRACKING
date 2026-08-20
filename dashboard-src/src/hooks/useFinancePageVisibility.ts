import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchFinancePageVisibility,
  setAllFinancePageVisibility,
  setFinancePageVisibility,
} from "../lib/finance-page-visibility";

export type FinancePageKey =
  | "dashboard"
  | "accounts"
  | "journal"
  | "invoices"
  | "credit-notes"
  | "receivables"
  | "driver-settlements"
  | "cost-centers"
  | "reports"
  | "settings"
  | "audit-log";

export interface FinancePageVisibility {
  key: FinancePageKey;
  label: string;
  labelAr: string;
  description: string;
  enabled: boolean;
  category: "actionable" | "settings" | "reports";
}

const FINANCE_PAGE_VISIBILITY_QUERY_KEY = ["finance", "settings", "page-visibility"] as const;

const DEFAULT_ENABLED_KEYS: ReadonlySet<FinancePageKey> = new Set([
  "dashboard",
  "invoices",
  "driver-settlements",
  "settings",
]);

const DEFAULT_PAGES: Omit<FinancePageVisibility, "enabled">[] = [
  {
    key: "invoices",
    label: "Invoices",
    labelAr: "الفواتير",
    description: "عرض وإدارة فواتير العملاء من Odoo",
    category: "actionable",
  },
  {
    key: "receivables",
    label: "Receivables",
    labelAr: "الذمم المدينة",
    description: "متابعة الفواتير المستحقة غير المدفوعة",
    category: "actionable",
  },
  {
    key: "driver-settlements",
    label: "Driver Settlements",
    labelAr: "تسويات السائقين",
    description: "إدارة تسويات السائقين والعمولات",
    category: "actionable",
  },
  {
    key: "journal",
    label: "Journal Entries",
    labelAr: "القيود اليومية",
    description: "عرض وإنشاء القيود المحاسبية",
    category: "actionable",
  },
  {
    key: "credit-notes",
    label: "Credit Notes",
    labelAr: "إشعارات الدائن",
    description: "إصدار إشعارات الدائن لتعديل الفواتير",
    category: "actionable",
  },
  {
    key: "dashboard",
    label: "Dashboard",
    labelAr: "لوحة التحكم",
    description: "نظرة عامة على المؤشرات المالية",
    category: "reports",
  },
  {
    key: "reports",
    label: "Financial Reports",
    labelAr: "التقارير المالية",
    description: "قوائم الدخل والميزانية العمومية",
    category: "reports",
  },
  {
    key: "accounts",
    label: "Chart of Accounts",
    labelAr: "دليل الحسابات",
    description: "إدارة الحسابات المحاسبية",
    category: "settings",
  },
  {
    key: "cost-centers",
    label: "Cost Centers",
    labelAr: "مراكز التكلفة",
    description: "إدارة مراكز التكلفة",
    category: "settings",
  },
  {
    key: "settings",
    label: "Finance Settings",
    labelAr: "الإعدادات",
    description: "إعدادات القسم المالي",
    category: "settings",
  },
  {
    key: "audit-log",
    label: "Audit Log",
    labelAr: "سجل التدقيق",
    description: "سجل العمليات المالية",
    category: "settings",
  },
];

const DEFAULT_PAGE_KEYS = DEFAULT_PAGES.map((page) => page.key);

function getDefaultVisibility(): Record<FinancePageKey, boolean> {
  return Object.fromEntries(
    DEFAULT_PAGE_KEYS.map((key) => [key, DEFAULT_ENABLED_KEYS.has(key)]),
  ) as Record<FinancePageKey, boolean>;
}

function mergeVisibility(settings: Array<{ pageKey: string; enabled: boolean }> | undefined) {
  const visibility = getDefaultVisibility();

  for (const setting of settings ?? []) {
    if (DEFAULT_PAGE_KEYS.includes(setting.pageKey as FinancePageKey)) {
      visibility[setting.pageKey as FinancePageKey] = setting.enabled;
    }
  }

  return visibility;
}

export function useFinancePageVisibility() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: FINANCE_PAGE_VISIBILITY_QUERY_KEY,
    queryFn: fetchFinancePageVisibility,
    staleTime: 60_000,
    retry: 1,
  });

  const visibility = useMemo(() => mergeVisibility(query.data), [query.data]);

  const setPageMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: FinancePageKey; enabled: boolean }) =>
      setFinancePageVisibility(key, enabled),
    onMutate: async ({ key, enabled }) => {
      await queryClient.cancelQueries({ queryKey: FINANCE_PAGE_VISIBILITY_QUERY_KEY });
      const previous = queryClient.getQueryData(FINANCE_PAGE_VISIBILITY_QUERY_KEY);
      queryClient.setQueryData(FINANCE_PAGE_VISIBILITY_QUERY_KEY, [
        ...DEFAULT_PAGE_KEYS.map((pageKey) => ({
          pageKey,
          enabled: pageKey === key ? enabled : visibility[pageKey],
        })),
      ]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FINANCE_PAGE_VISIBILITY_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FINANCE_PAGE_VISIBILITY_QUERY_KEY });
    },
  });

  const setAllMutation = useMutation({
    mutationFn: (enabled: boolean) => setAllFinancePageVisibility(DEFAULT_PAGE_KEYS, enabled),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: FINANCE_PAGE_VISIBILITY_QUERY_KEY });
      const previous = queryClient.getQueryData(FINANCE_PAGE_VISIBILITY_QUERY_KEY);
      queryClient.setQueryData(
        FINANCE_PAGE_VISIBILITY_QUERY_KEY,
        DEFAULT_PAGE_KEYS.map((pageKey) => ({ pageKey, enabled })),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FINANCE_PAGE_VISIBILITY_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FINANCE_PAGE_VISIBILITY_QUERY_KEY });
    },
  });

  const pages: FinancePageVisibility[] = DEFAULT_PAGES.map((page) => ({
    ...page,
    enabled: visibility[page.key],
  }));

  const togglePage = useCallback(
    (key: FinancePageKey) => {
      setPageMutation.mutate({ key, enabled: !visibility[key] });
    },
    [setPageMutation, visibility],
  );

  const isPageEnabled = useCallback(
    (key: FinancePageKey) => visibility[key] ?? false,
    [visibility],
  );

  const setAllEnabled = useCallback(
    (enabled: boolean) => {
      setAllMutation.mutate(enabled);
    },
    [setAllMutation],
  );

  return {
    pages,
    togglePage,
    isPageEnabled,
    setAllEnabled,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
