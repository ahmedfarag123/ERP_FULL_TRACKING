import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon } from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminEmptyState,
  AdminTableSkeleton,
  AdminField,
} from "../../../components/admin/AdminPageElements";
import { fetchCostCenters, createCostCenter, updateCostCenter } from "../../../lib/finance-settings";
import type { FinanceCostCenter } from "../../../types/finance";

export default function CostCentersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<FinanceCostCenter | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ["finance", "cost-centers"],
    queryFn: fetchCostCenters,
  });

  const createMutation = useMutation({
    mutationFn: () => createCostCenter({ code, name, nameAr, isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "cost-centers"] });
      setShowCreate(false);
      setCode("");
      setName("");
      setNameAr("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) return Promise.resolve();
      return updateCostCenter(editing.id, { name, nameAr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "cost-centers"] });
      setEditing(null);
      setCode("");
      setName("");
      setNameAr("");
    },
  });

  return (
    <>
      <PageMeta title="المالية — مراكز التكلفة" description="إدارة مراكز التكلفة" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">مراكز التكلفة</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              إنشاء وإدارة مراكز تخصيص التكاليف
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); setEditing(null); }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            إضافة مركز
          </button>
        </div>

        {(showCreate || editing) && (
          <AdminSection title={editing ? "تعديل المركز" : "مركز جديد"}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {!editing && (
                <AdminField label="الكود">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                    placeholder="CC-NEW"
                  />
                </AdminField>
              )}
              <AdminField label="الاسم (إنجليزي)">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                />
              </AdminField>
              <AdminField label="الاسم (عربي)">
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                />
              </AdminField>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => editing ? updateMutation.mutate() : createMutation.mutate()}
                disabled={!name || createMutation.isPending || updateMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editing ? "حفظ" : "إنشاء"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setEditing(null); setCode(""); setName(""); setNameAr(""); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
              >
                إلغاء
              </button>
            </div>
          </AdminSection>
        )}

        <AdminSection>
          {isLoading ? (
            <AdminTableSkeleton columns={4} rows={5} />
          ) : centers.length === 0 ? (
            <AdminEmptyState title="لا توجد مراكز تكلفة" description="ابنشئ مراكز تكلفة لتخصيص المعاملات" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 font-medium text-gray-500">الكود</th>
                    <th className="px-5 py-3 font-medium text-gray-500">الاسم</th>
                    <th className="px-5 py-3 font-medium text-gray-500">الاسم العربي</th>
                    <th className="px-5 py-3 font-medium text-gray-500">الحالة</th>
                    <th className="px-5 py-3 font-medium text-gray-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {centers.map((center) => (
                    <tr key={center.id} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="px-5 py-3.5 font-mono text-xs">{center.code}</td>
                      <td className="px-5 py-3.5">{center.name}</td>
                      <td className="px-5 py-3.5 text-gray-500">{center.nameAr}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${center.isActive ? "text-emerald-600 bg-emerald-50" : "text-gray-600 bg-brand-25"}`}>
                          {center.isActive ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => {
                            setEditing(center);
                            setName(center.name);
                            setNameAr(center.nameAr ?? "");
                            setShowCreate(false);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </AdminPageFrame>
    </>
  );
}
