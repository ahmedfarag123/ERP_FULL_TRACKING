import { useQuery } from "@tanstack/react-query";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminEmptyState,
  AdminTableSkeleton,
} from "../../../components/admin/AdminPageElements";
import { supabase } from "../../../lib/supabase";

export default function CreditNotesPage() {
  const { data: creditNotes = [], isLoading } = useQuery({
    queryKey: ["finance", "credit-notes"],
    queryFn: async () => {
      // Credit notes are invoices with type credit_note or we can query them separately
      // For now, fetch invoices that have been credit-noted
      const { data, error } = await supabase
        .from("finance_journal_entries")
        .select("id, entry_number, entry_date, description, status, source_type")
        .eq("source_type", "credit_note")
        .order("entry_date", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <>
      <PageMeta title="المالية — إشعارات الدائن" description="إدارة إشعارات الدائن" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">إشعارات الدائن</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              إشعارات الدائن الصادرة للعملاء
            </p>
          </div>
        </div>

        <AdminSection>
          {isLoading ? (
            <AdminTableSkeleton columns={4} rows={5} />
          ) : creditNotes.length === 0 ? (
            <AdminEmptyState
              title="لا توجد إشعارات دائن"
              description="لم يتم إصدار أي إشعارات دائن بعد"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 font-medium text-gray-500">رقم الإشعار</th>
                    <th className="px-5 py-3 font-medium text-gray-500">التاريخ</th>
                    <th className="px-5 py-3 font-medium text-gray-500">الوصف</th>
                    <th className="px-5 py-3 font-medium text-gray-500">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNotes.map((cn: Record<string, unknown>) => (
                    <tr key={cn.id as string} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="px-5 py-3.5 font-mono text-xs">{cn.entry_number as string}</td>
                      <td className="px-5 py-3.5">{cn.entry_date as string}</td>
                      <td className="px-5 py-3.5 text-gray-500">{cn.description as string}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-emerald-600 bg-emerald-50">
                          {cn.status === "posted" ? "مرحل" : String(cn.status)}
                        </span>
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
