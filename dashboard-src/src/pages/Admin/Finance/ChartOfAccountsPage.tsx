import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminEmptyState,
  AdminFilterBar,
  AdminField,
} from "../../../components/admin/AdminPageElements";
import {
  fetchFinanceAccounts,
  createFinanceAccount,
  archiveFinanceAccount,
  buildAccountTree,
} from "../../../lib/finance-accounts";
import type { FinanceAccount, FinanceAccountTreeNode, AccountType } from "../../../types/finance";

const TYPE_LABELS: Record<AccountType, { label: string; color: string }> = {
  asset: { label: "أصول", color: "text-blue-600 bg-blue-50" },
  liability: { label: "خصوم", color: "text-rose-600 bg-rose-50" },
  equity: { label: "حقوق ملكية", color: "text-violet-600 bg-violet-50" },
  revenue: { label: "إيرادات", color: "text-emerald-600 bg-emerald-50" },
  expense: { label: "مصروفات", color: "text-amber-600 bg-amber-50" },
};

function TreeNode({
  node,
  level,
  onEdit,
  onArchive,
}: {
  node: FinanceAccountTreeNode;
  level: number;
  onEdit: (account: FinanceAccount) => void;
  onArchive: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = node.children.length > 0;
  const typeInfo = TYPE_LABELS[node.type] ?? TYPE_LABELS.asset;

  return (
    <div>
      <div
        className="flex items-center gap-2 border-b border-gray-50 px-3 py-2.5 dark:border-gray-800/50 hover:bg-brand-25/50 dark:hover:bg-white/[0.02]"
        style={{ paddingRight: `${level * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className="font-mono text-xs text-gray-500 w-16">{node.code}</span>
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{node.name}</span>
        {node.nameAr && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{node.nameAr}</span>
        )}
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
          {typeInfo.label}
        </span>
        {!node.allowPosting && (
          <span className="text-xs text-gray-400">roupeau</span>
        )}
        <button onClick={() => onEdit(node)} className="p-1 text-gray-400 hover:text-gray-600">
          <PencilIcon className="h-4 w-4" />
        </button>
        {node.isActive && (
          <button onClick={() => onArchive(node.id)} className="p-1 text-gray-400 hover:text-rose-500">
            <ArchiveBoxIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {expanded &&
        node.children.map((child) => (
          <TreeNode key={child.id} node={child} level={level + 1} onEdit={onEdit} onArchive={onArchive} />
        ))}
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState<AccountType | "all">("all");

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["finance", "accounts"],
    queryFn: fetchFinanceAccounts,
  });

  const tree = buildAccountTree(
    filterType === "all" ? accounts : accounts.filter((a) => a.type === filterType)
  );

  const createMutation = useMutation({
    mutationFn: (data: { code: string; name: string; nameAr: string; type: AccountType; parentId: string | null }) =>
      createFinanceAccount({
        ...data,
        isActive: true,
        allowPosting: true,
        sortOrder: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "accounts"] });
      setShowCreate(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveFinanceAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "accounts"] }),
  });

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newType, setNewType] = useState<AccountType>("asset");

  return (
    <>
      <PageMeta title="المالية — دليل الحسابات" description="إدارة شجرة الحسابات" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">دليل الحسابات</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              إنشاء وإدارة شجرة الحسابات المحاسبية
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            إضافة حساب
          </button>
        </div>

        {showCreate && (
          <AdminSection title="حساب جديد" description="إنشاء حساب جديد في الدليل">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <AdminField label="الكود">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                  placeholder="1015"
                />
              </AdminField>
              <AdminField label="الاسم (إنجليزي)">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                  placeholder="Cash in Hand"
                />
              </AdminField>
              <AdminField label="الاسم (عربي)">
                <input
                  type="text"
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                  placeholder="النقد في اليد"
                />
              </AdminField>
              <AdminField label="النوع">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AccountType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                >
                  <option value="asset">أصول</option>
                  <option value="liability">خصوم</option>
                  <option value="equity">حقوق ملكية</option>
                  <option value="revenue">إيرادات</option>
                  <option value="expense">مصروفات</option>
                </select>
              </AdminField>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  createMutation.mutate({ code: newCode, name: newName, nameAr: newNameAr, type: newType, parentId: null })
                }
                disabled={!newCode || !newName || createMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
              >
                إلغاء
              </button>
            </div>
          </AdminSection>
        )}

        <AdminSection title="شجرة الحسابات" description="دليل الحسابات الكامل">
          <AdminFilterBar>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-500">فلترة حسب النوع:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as AccountType | "all")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
              >
                <option value="all">الكل</option>
                <option value="asset">أصول</option>
                <option value="liability">خصوم</option>
                <option value="equity">حقوق ملكية</option>
                <option value="revenue">إيرادات</option>
                <option value="expense">مصروفات</option>
              </select>
              <span className="text-xs text-gray-400">{accounts.length} حساب</span>
            </div>
          </AdminFilterBar>

          {isLoading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-brand-25 dark:bg-white/[0.02]" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <AdminEmptyState
              title="لا توجد حسابات"
              description="ابنشئ حسابات جديدة لبدء إعداد دليل الحسابات"
            />
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  level={0}
                  onEdit={() => {}}
                  onArchive={(id) => archiveMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </AdminSection>
      </AdminPageFrame>
    </>
  );
}
