import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import {
  fetchLegacyTargets,
  summarizeTargets,
} from "../../lib/admin-operations-data";
import type { LegacyAdminTarget } from "../../types/admin-operations";

function TargetMetric(props: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
        {props.value}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{props.hint}</p>
    </div>
  );
}

export default function TargetsManagement() {
  const [targets, setTargets] = useState<LegacyAdminTarget[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTargets = async () => {
      try {
        const nextTargets = await fetchLegacyTargets();
        setTargets(nextTargets);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذر تحميل الأهداف.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadTargets();
  }, []);

  const filteredTargets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return targets;
    return targets.filter((target) =>
      [target.email, target.name, target.role].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search, targets]);

  const summary = useMemo(() => summarizeTargets(targets), [targets]);

  return (
    <>
      <PageMeta title="Targets | Sales Admin" description="Admin targets management page" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            إدارة الأهداف
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            الأهداف الشهرية الحالية كما تأتي من `fetchTargets`.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TargetMetric label="إجمالي السجلات" value={summary.totalTargets.toLocaleString("en-US")} hint="كل أهداف المستخدمين الحالية" />
          <TargetMetric label="إجمالي المكالمات المستهدفة" value={summary.totalTargetCalls.toLocaleString("ar-EG")} hint="مجموع المكالمات المطلوبة" />
          <TargetMetric label="إجمالي الزيارات المستهدفة" value={summary.totalTargetVisits.toLocaleString("ar-EG")} hint="مجموع الزيارات المطلوبة" />
          <TargetMetric label="إجمالي عروض الأسعار" value={summary.totalTargetQuotations.toLocaleString("ar-EG")} hint="أهداف عروض الأسعار" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالبريد أو الاسم أو الدور"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white lg:max-w-sm"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredTargets.length} هدف ظاهر
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              جاري تحميل الأهداف...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-right dark:divide-gray-800" dir="rtl">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">المستخدم</th>
                    <th className="px-4 py-3">الدور</th>
                    <th className="px-4 py-3">الزيارات</th>
                    <th className="px-4 py-3">المكالمات</th>
                    <th className="px-4 py-3">قابلية الوصول</th>
                    <th className="px-4 py-3">GMV</th>
                    <th className="px-4 py-3">عروض الأسعار</th>
                    <th className="px-4 py-3">أيام العمل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredTargets.map((target) => (
                    <tr key={target.email} className="text-sm text-gray-700 dark:text-gray-300">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {target.name || target.email}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {target.email}
                        </div>
                      </td>
                      <td className="px-4 py-4">{target.role}</td>
                      <td className="px-4 py-4">{target.targetVisits.toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-4">{target.targetCalls.toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-4">{target.targetReachability.toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-4">{target.targetGmv.toLocaleString("en-US")}</td>
                      <td className="px-4 py-4">{target.targetQuotations.toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-4">{target.workingDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
