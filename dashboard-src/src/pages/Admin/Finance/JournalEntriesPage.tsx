import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { EyeIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminFilterBar,
  AdminEmptyState,
  AdminTableSkeleton,
} from "../../../components/admin/AdminPageElements";
import { fetchJournalEntries } from "../../../lib/finance-ledger";
import type { FinanceJournalEntry, JournalSource, JournalStatus } from "../../../types/finance";

const SOURCE_LABELS: Record<JournalSource, string> = {
  invoice: "فاتورة",
  credit_note: "إشعار دائن",
  delivery: "توصيل",
  collection: "تحصيل",
  warehouse_adjustment: "تسوية مخزون",
  driver_settlement: "تسوية سائق",
  manual: "يدوي",
  reversal: "عكس",
};

const STATUS_STYLES: Record<JournalStatus, string> = {
  posted: "text-emerald-600 bg-emerald-50",
  reversed: "text-rose-600 bg-rose-50",
};

const PAGE_SIZE = 20;

export default function JournalEntriesPage() {
  const [status, setStatus] = useState<JournalStatus | "all">("all");
  const [sourceType, setSourceType] = useState<JournalSource | "all">("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "journal-entries", status, sourceType, page],
    queryFn: () =>
      fetchJournalEntries({
        status: status === "all" ? undefined : status,
        sourceType: sourceType === "all" ? undefined : sourceType,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const entries = data?.entries ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <>
      <PageMeta title="المالية — القيود اليومية" description="عرض وإدارة القيود اليومية" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">القيود اليومية</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              سجل القيود المحاسبية ({count} قيد)
            </p>
          </div>
        </div>

        <AdminFilterBar>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-gray-500">الحالة:</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as JournalStatus | "all"); setPage(0); }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
            >
              <option value="all">الكل</option>
              <option value="posted">مرحل</option>
              <option value="reversed">معكوس</option>
            </select>

            <label className="text-xs font-medium text-gray-500">المصدر:</label>
            <select
              value={sourceType}
              onChange={(e) => { setSourceType(e.target.value as JournalSource | "all"); setPage(0); }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-white/[0.02]"
            >
              <option value="all">الكل</option>
              {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </AdminFilterBar>

        <AdminSection>
          {isLoading ? (
            <AdminTableSkeleton columns={5} rows={10} />
          ) : entries.length === 0 ? (
            <AdminEmptyState
              title="لا توجد قيود"
              description="لم يتم تسجيل أي قيود يومية بعد"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 font-medium text-gray-500">رقم القيد</th>
                      <th className="px-5 py-3 font-medium text-gray-500">التاريخ</th>
                      <th className="px-5 py-3 font-medium text-gray-500">المصدر</th>
                      <th className="px-5 py-3 font-medium text-gray-500">الوصف</th>
                      <th className="px-5 py-3 font-medium text-gray-500">الحالة</th>
                      <th className="px-5 py-3 font-medium text-gray-500">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry: FinanceJournalEntry) => (
                      <tr key={entry.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-brand-25/50 dark:hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5 font-mono text-xs">{entry.entryNumber}</td>
                        <td className="px-5 py-3.5">{entry.entryDate}</td>
                        <td className="px-5 py-3.5 text-gray-500">{SOURCE_LABELS[entry.sourceType] ?? entry.sourceType}</td>
                        <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">{entry.description}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status]}`}>
                            {entry.status === "posted" ? "مرحل" : "معكوس"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/finance/journal/${entry.id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <EyeIcon className="h-4 w-4" />
                            عرض
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500">
                    صفحة {page + 1} من {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </AdminSection>
      </AdminPageFrame>
    </>
  );
}
