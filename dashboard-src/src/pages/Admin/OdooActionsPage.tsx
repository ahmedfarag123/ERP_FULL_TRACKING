// Page Type: D -- Settings
// Purpose: User-friendly Odoo integration governance
// Primary user action: Toggle sync operations on/off
// Data source: odoo_actions table

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpTrayIcon,
  ArrowPathIcon,
  UsersIcon,
  ShoppingCartIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import PageHeader from "../../components/ui/PageHeader";
import Switch from "../../components/form/switch/Switch";
import { fetchOdooActions, updateOdooActionStatus } from "../../lib/odoo-actions";
import type { OdooActionRecord } from "../../types/odoo-actions";

// ── Friendly labels & icons per sync action ──
const SYNC_META: Record<string, { label: string; description: string; icon: typeof UsersIcon; category: "sync_in" | "sync_out" | "api" }> = {
  "customers.sync": {
    label: "مزامنة العملاء",
    description: "جلب بيانات العملاء من Odoo وتحديث القائمة المحلية",
    icon: UsersIcon,
    category: "sync_in",
  },
  "products.sync": {
    label: "مزامنة المنتجات",
    description: "جلب каталог المنتجات من Odoo وتحديث القائمة المحلية",
    icon: CubeIcon,
    category: "sync_in",
  },
  "orders.sync": {
    label: "مزامنة الطلبات",
    description: "جلب طلبات المبيعات من Odoo وتحديث القائمة المحلية",
    icon: ShoppingCartIcon,
    category: "sync_in",
  },
  "crm.sync": {
    label: "مزامنة فرص CRM",
    description: "جلب فرص المبيعات والعملاء المحتملين من Odoo",
    icon: ArrowPathIcon,
    category: "sync_in",
  },
  "logistics_users.sync": {
    label: "مزامنة موظفي اللوجستيات",
    description: "جلب بيانات الموظفين من Odoo لإدارة التوصيل",
    icon: UserGroupIcon,
    category: "sync_in",
  },
  "logistics_warehouses.sync": {
    label: "مزامنة المستودعات",
    description: "جلب بيانات المستودعات من Odoo",
    icon: BuildingStorefrontIcon,
    category: "sync_in",
  },
  "logistics_shipments.sync": {
    label: "مزامنة الشحنات",
    description: "جلب سندات التسليم والشحنات من Odoo",
    icon: TruckIcon,
    category: "sync_in",
  },
};

function getActionMeta(action: OdooActionRecord) {
  const meta = SYNC_META[action.actionKey];
  if (meta) return meta;

  // JSON-RPC actions
  if (action.actionKey.startsWith("jsonrpc.")) {
    const isProduct = action.actionKey.includes("products.");
    const isCrm = action.actionKey.includes("crm.");
    const isCustomer = action.actionKey.includes("customers.");
    const model = isProduct ? "المنتجات" : isCrm ? "فرص CRM" : isCustomer ? "العملاء" : "Odoo";

    if (action.actionKey.includes(".create")) return { label: `إنشاء في ${model}`, description: ` إرسال بيانات جديدة إلى ${model} في Odoo`, icon: ArrowUpTrayIcon, category: "api" as const };
    if (action.actionKey.includes(".write")) return { label: `تحديث ${model}`, description: `تحديث بيانات موجودة في ${model} في Odoo`, icon: ArrowPathIcon, category: "api" as const };
    if (action.actionKey.includes(".unlink")) return { label: `حذف من ${model}`, description: `حذف سجلات من ${model} في Odoo`, icon: ExclamationTriangleIcon, category: "api" as const };
    if (action.actionKey.includes(".search_read")) return { label: `بحث في ${model}`, description: `البحث وقراءة بيانات ${model} من Odoo`, icon: MagnifyingGlassIcon, category: "api" as const };
    if (action.actionKey.includes("authenticate")) return { label: "مصادقة Odoo", description: "التحقق من بيانات الاتصال بـ Odoo", icon: CheckCircleIcon, category: "api" as const };
  }

  return { label: action.label, description: action.description, icon: ArrowPathIcon, category: "api" as const };
}

const CATEGORY_META = {
  sync_in: { label: "مزامنة البيانات من Odoo", subtitle: "اتصال واحد الاتجاه — من Odoo إلى لوحة التحكم", color: "blue" as const },
  sync_out: { label: "إرسال البيانات إلى Odoo", subtitle: "إضافة أو تعديل بيانات في Odoo — يتطلب موافقة", color: "emerald" as const },
  api: { label: "عمليات Odoo المباشرة", subtitle: "استدعاءات API مباشرة — للمشرفين فقط", color: "purple" as const },
};

type CategoryKey = keyof typeof CATEGORY_META;

export default function OdooActionsPage() {
  const [actions, setActions] = useState<OdooActionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadActions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const rows = await fetchOdooActions();
      setActions(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "فشل تحميل إجراءات Odoo.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const grouped = useMemo(() => {
    const groups: Record<CategoryKey, OdooActionRecord[]> = { sync_in: [], sync_out: [], api: [] };
    for (const action of actions) {
      const meta = getActionMeta(action);
      if (groups[meta.category]) groups[meta.category].push(action);
    }
    return groups;
  }, [actions]);

  const filteredGrouped = useMemo(() => {
    if (!searchQuery.trim()) return grouped;
    const q = searchQuery.trim().toLowerCase();
    const result: Record<CategoryKey, OdooActionRecord[]> = { sync_in: [], sync_out: [], api: [] };
    for (const [cat, items] of Object.entries(grouped) as [CategoryKey, OdooActionRecord[]][]) {
      for (const action of items) {
        const meta = getActionMeta(action);
        if (meta.label.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q) || action.actionKey.toLowerCase().includes(q)) {
          result[cat].push(action);
        }
      }
    }
    return result;
  }, [grouped, searchQuery]);

  const totalCount = actions.length;
  const activeCount = actions.filter((a) => a.isActive).length;
  const inactiveCount = totalCount - activeCount;

  const handleToggle = async (actionKey: string, next: boolean) => {
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      await updateOdooActionStatus(actionKey, next);
      setActions((prev) => prev.map((a) => (a.actionKey === actionKey ? { ...a, isActive: next } : a)));
      setNotice(next ? "تم تفعيل الإجراء." : "تم تعطيل الإجراء.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحديث الحالة.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="إعدادات Odoo | إدارة المبيعات" description="إدارة اتصالات Odoo وتفعيل المزامنة." />

      <AdminPageFrame>
        <PageHeader
          variant="list"
          eyebrow="إعدادات Odoo"
          title="إدارة الاتصال بـ Odoo"
          subtitle="تحكم في البيانات التي تتدفق بين لوحة التحكم ونظام Odoo. فعّل أو عطّل كل اتصال حسب الحاجة."
          actions={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">المفعل:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">المعطّل:</span>
                <span className="font-semibold text-gray-500">{inactiveCount}</span>
              </div>
            </div>
          }
        />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
            <button type="button" onClick={() => setError("")} className="mr-2 font-bold">✕</button>
          </div>
        )}
        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
            <button type="button" onClick={() => setNotice("")} className="mr-2 font-bold">✕</button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الاتصالات..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white sm:max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-brand-25 dark:bg-white/[0.02]" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-24 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {(Object.entries(CATEGORY_META) as [CategoryKey, typeof CATEGORY_META[CategoryKey]][]).map(([catKey, catMeta]) => {
              const items = filteredGrouped[catKey];
              if (!items || items.length === 0) return null;
              const activeInCategory = items.filter((a) => a.isActive).length;

              return (
                <section key={catKey}>
                  <div className="mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{catMeta.label}</h2>
                      <span className="rounded-full bg-brand-25 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/[0.02] dark:text-gray-400">
                        {activeInCategory}/{items.length} مفعّل
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{catMeta.subtitle}</p>
                  </div>

                  <div className="space-y-3">
                    {items.map((action) => {
                      const meta = getActionMeta(action);
                      const Icon = meta.icon;
                      return (
                        <div
                          key={action.id}
                          className={`flex items-center gap-4 rounded-2xl border bg-white p-4 transition dark:bg-white/[0.03] ${
                            action.isActive
                              ? "border-emerald-200 dark:border-emerald-500/20"
                              : "border-gray-200 dark:border-gray-800"
                          }`}
                        >
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            action.isActive
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-brand-25 text-gray-400 dark:bg-white/[0.02] dark:text-gray-500"
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{meta.label}</h3>
                              {action.odooModel && (
                                <span className="hidden rounded-md bg-brand-25 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/[0.02] dark:text-gray-400 sm:inline">
                                  {action.odooModel}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{meta.description}</p>
                            <div className="mt-1 flex items-center gap-2">
                              {action.allowedRoles.map((role) => (
                                <span
                                  key={role}
                                  className="rounded-md bg-brand-25 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/[0.02] dark:text-gray-400"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-medium ${action.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
                              {action.isActive ? "مفعّل" : "معطّل"}
                            </span>
                            <Switch
                              label={action.isActive ? "On" : "Off"}
                              defaultChecked={action.isActive}
                              onChange={(next) => void handleToggle(action.actionKey, next)}
                              disabled={isSaving}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </AdminPageFrame>
    </>
  );
}
