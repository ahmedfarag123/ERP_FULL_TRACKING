import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LockClosedIcon, LockOpenIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminTableSkeleton,
  AdminField,
} from "../../../components/admin/AdminPageElements";
import {
  fetchFiscalPeriods,
  closeFiscalPeriod,
  reopenFiscalPeriod,
  fetchDocumentSequences,
  fetchCostCenters,
} from "../../../lib/finance-settings";
import { fetchTaxRates, createTaxRate } from "../../../lib/finance-tax";
import { useFinancePageVisibility } from "../../../hooks/useFinancePageVisibility";
import type { FinancePageKey } from "../../../hooks/useFinancePageVisibility";
import type { FiscalPeriodStatus } from "../../../types/finance";

const PERIOD_STATUS_STYLES: Record<FiscalPeriodStatus, string> = {
  open: "text-emerald-600 bg-emerald-50",
  closed: "text-amber-600 bg-amber-50",
  locked: "text-gray-600 bg-brand-25",
};

export default function FinanceSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pages" | "periods" | "taxes" | "sequences" | "cost-centers">("pages");
  const [showAddTax, setShowAddTax] = useState(false);
  const [taxName, setTaxName] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const { pages, togglePage, setAllEnabled } = useFinancePageVisibility();

  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ["finance", "settings", "periods"],
    queryFn: fetchFiscalPeriods,
  });

  const { data: taxes = [], isLoading: taxesLoading } = useQuery({
    queryKey: ["finance", "settings", "taxes"],
    queryFn: fetchTaxRates,
  });

  const { data: sequences = [], isLoading: sequencesLoading } = useQuery({
    queryKey: ["finance", "settings", "sequences"],
    queryFn: fetchDocumentSequences,
  });

  const { data: costCenters = [], isLoading: centersLoading } = useQuery({
    queryKey: ["finance", "cost-centers"],
    queryFn: fetchCostCenters,
  });

  const closeMutation = useMutation({
    mutationFn: closeFiscalPeriod,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "settings", "periods"] }),
  });

  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reopenFiscalPeriod(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "settings", "periods"] }),
  });

  const addTaxMutation = useMutation({
    mutationFn: () =>
      createTaxRate({
        name: taxName,
        rate: parseFloat(taxRate),
        accountId: "",
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "settings", "taxes"] });
      setShowAddTax(false);
      setTaxName("");
      setTaxRate("");
    },
  });

  const tabs = [
    { id: "pages" as const, label: "الصفحات" },
    { id: "periods" as const, label: "الفترات المالية" },
    { id: "taxes" as const, label: "الضرائب" },
    { id: "sequences" as const, label: "ترقيم المستندات" },
    { id: "cost-centers" as const, label: "مراكز التكلفة" },
  ];

  return (
    <>
      <PageMeta title="المالية — إعدادات المالية" description="إعدادات النظام المالي" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">إعدادات المالية</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              إعدادات الفترة المالية والضرائب وترقيم المستندات
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "pages" && (
          <AdminSection
            title="تفعيل/إخفاء الصفحات"
            description="اختر الصفحات التي تريد ظهورها في القائمة الجانبية"
          >
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => setAllEnabled(true)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-brand-25"
              >
                تفعيل الكل
              </button>
              <button
                onClick={() => setAllEnabled(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-brand-25"
              >
                إخفاء الكل
              </button>
            </div>

            {/* Actionable Pages */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-bold uppercase text-gray-500">صفحات عملية</h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {pages
                  .filter((p) => p.category === "actionable")
                  .map((page) => (
                    <div key={page.key} className="flex items-center justify-between px-4 py-3 hover:bg-brand-25">
                      <div className="flex items-center gap-3">
                        {page.enabled ? (
                          <EyeIcon className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{page.labelAr}</div>
                          <div className="text-xs text-gray-500">{page.description}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePage(page.key as FinancePageKey)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          page.enabled ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            page.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Reports Pages */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-bold uppercase text-gray-500">التقارير</h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {pages
                  .filter((p) => p.category === "reports")
                  .map((page) => (
                    <div key={page.key} className="flex items-center justify-between px-4 py-3 hover:bg-brand-25">
                      <div className="flex items-center gap-3">
                        {page.enabled ? (
                          <EyeIcon className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{page.labelAr}</div>
                          <div className="text-xs text-gray-500">{page.description}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePage(page.key as FinancePageKey)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          page.enabled ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            page.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Settings Pages */}
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase text-gray-500">الإعدادات</h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {pages
                  .filter((p) => p.category === "settings")
                  .map((page) => (
                    <div key={page.key} className="flex items-center justify-between px-4 py-3 hover:bg-brand-25">
                      <div className="flex items-center gap-3">
                        {page.enabled ? (
                          <EyeIcon className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{page.labelAr}</div>
                          <div className="text-xs text-gray-500">{page.description}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePage(page.key as FinancePageKey)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          page.enabled ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            page.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </AdminSection>
        )}

        {activeTab === "periods" && (
          <AdminSection title="الفترات المالية" description="إدارة فترات السنة المالية">
            {periodsLoading ? (
              <AdminTableSkeleton columns={4} rows={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 font-medium text-gray-500">الاسم</th>
                      <th className="px-5 py-3 font-medium text-gray-500">من</th>
                      <th className="px-5 py-3 font-medium text-gray-500">إلى</th>
                      <th className="px-5 py-3 font-medium text-gray-500">الحالة</th>
                      <th className="px-5 py-3 font-medium text-gray-500">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((period) => (
                      <tr key={period.id} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="px-5 py-3.5 font-medium">{period.name}</td>
                        <td className="px-5 py-3.5">{period.startDate}</td>
                        <td className="px-5 py-3.5">{period.endDate}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PERIOD_STATUS_STYLES[period.status]}`}>
                            {period.status === "open" ? "مفتوحة" : period.status === "closed" ? "مغلقة" : "مقفلة"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {period.status === "open" ? (
                            <button
                              onClick={() => closeMutation.mutate(period.id)}
                              disabled={closeMutation.isPending}
                              className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 text-xs"
                            >
                              <LockClosedIcon className="h-3.5 w-3.5" />
                              إغلاق
                            </button>
                          ) : (
                            <button
                              onClick={() => reopenMutation.mutate({ id: period.id, reason: "Admin reopen" })}
                              disabled={reopenMutation.isPending}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                            >
                              <LockOpenIcon className="h-3.5 w-3.5" />
                              إعادة فتح
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}

        {activeTab === "taxes" && (
          <AdminSection title="الضرائب" description="إدارة نسب الضريبة">
            <div className="mb-4">
              <button
                onClick={() => setShowAddTax(!showAddTax)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                + إضافة ضريبة
              </button>
            </div>

            {showAddTax && (
              <>
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <AdminField label="الاسم">
                  <input
                    type="text"
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                    placeholder="VAT 14%"
                  />
                </AdminField>
                <AdminField label="النسبة (%)">
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
                    placeholder="14"
                  />
                </AdminField>
              </div>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => addTaxMutation.mutate()}
                  disabled={!taxName || !taxRate || addTaxMutation.isPending}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addTaxMutation.isPending ? "جارٍ الإضافة..." : "حفظ"}
                </button>
                <button
                  onClick={() => { setShowAddTax(false); setTaxName(""); setTaxRate(""); }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-brand-25 dark:border-gray-700"
                >
                  إلغاء
                </button>
              </div>
              </>
            )}

            {taxesLoading ? (
              <AdminTableSkeleton columns={3} rows={3} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 font-medium text-gray-500">الاسم</th>
                      <th className="px-5 py-3 font-medium text-gray-500">النسبة</th>
                      <th className="px-5 py-3 font-medium text-gray-500">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxes.map((tax) => (
                      <tr key={tax.id} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="px-5 py-3.5">{tax.name}</td>
                        <td className="px-5 py-3.5">{tax.rate}%</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tax.isActive ? "text-emerald-600 bg-emerald-50" : "text-gray-600 bg-brand-25"}`}>
                            {tax.isActive ? "نشط" : "غير نشط"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}

        {activeTab === "sequences" && (
          <AdminSection title="ترقيم المستندات" description="أنماط ترقيم الفواتير والقيود">
            {sequencesLoading ? (
              <AdminTableSkeleton columns={3} rows={3} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 font-medium text-gray-500">نوع المستند</th>
                      <th className="px-5 py-3 font-medium text-gray-500">البادئة</th>
                      <th className="px-5 py-3 font-medium text-gray-500">الرقم الحالي</th>
                      <th className="px-5 py-3 font-medium text-gray-500">إعادة تعيين سنوياً</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sequences.map((seq) => (
                      <tr key={seq.documentType} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="px-5 py-3.5 font-medium">{seq.documentType}</td>
                        <td className="px-5 py-3.5 font-mono">{seq.prefix}</td>
                        <td className="px-5 py-3.5">{seq.currentNumber}</td>
                        <td className="px-5 py-3.5">{seq.yearReset ? "نعم" : "لا"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}

        {activeTab === "cost-centers" && (
          <AdminSection title="مراكز التكلفة" description="عرض مراكز التكلفة المسجلة">
            {centersLoading ? (
              <AdminTableSkeleton columns={3} rows={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 font-medium text-gray-500">الكود</th>
                      <th className="px-5 py-3 font-medium text-gray-500">الاسم</th>
                      <th className="px-5 py-3 font-medium text-gray-500">الاسم العربي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costCenters.map((center) => (
                      <tr key={center.id} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="px-5 py-3.5 font-mono text-xs">{center.code}</td>
                        <td className="px-5 py-3.5">{center.name}</td>
                        <td className="px-5 py-3.5 text-gray-500">{center.nameAr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}
      </AdminPageFrame>
    </>
  );
}
