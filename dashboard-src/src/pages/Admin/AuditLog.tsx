import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { fetchAuditFeed } from "../../lib/admin-operations-data";
import { supabase } from "../../lib/supabase";
import type { AdminAuditEntry } from "../../types/admin-operations";

export default function AuditLog() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "visit" | "call" | "order">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAudit = async () => {
      try {
        const nextEntries = await fetchAuditFeed();
        setEntries(nextEntries);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذر تحميل سجل النشاط.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadAudit();
  }, []);

  useEffect(() => {
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        void fetchAuditFeed().then((nextEntries) => {
          setEntries(nextEntries);
        }).catch(() => {});
      }, 300);
    };

    const channel = supabase
      .channel("audit-log-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredEntries = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((entry) => entry.type === filter);
  }, [entries, filter]);

  return (
    <>
      <PageMeta title="Audit | Sales Admin" description="Admin activity feed page" />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              سجل النشاط
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              تجميع حي من الزيارات والمكالمات والطلبات بدل شاشة audit التجريبية.
            </p>
          </div>
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as "all" | "visit" | "call" | "order")
            }
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
          >
            <option value="all">كل الأنشطة</option>
            <option value="visit">الزيارات</option>
            <option value="call">المكالمات</option>
            <option value="order">الطلبات</option>
          </select>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              جاري تحميل النشاط...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-right dark:divide-gray-800" dir="rtl">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">النوع</th>
                    <th className="px-4 py-3">الوقت</th>
                    <th className="px-4 py-3">المنفذ</th>
                    <th className="px-4 py-3">العميل</th>
                    <th className="px-4 py-3">التفاصيل</th>
                    <th className="px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="text-sm text-gray-700 dark:text-gray-300">
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/[0.02] dark:text-gray-200">
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {new Date(entry.timestamp).toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-4">{entry.actor}</td>
                      <td className="px-4 py-4">
                        <div>{entry.customerName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.customerId || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">{entry.detail}</td>
                      <td className="px-4 py-4">{entry.status}</td>
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
