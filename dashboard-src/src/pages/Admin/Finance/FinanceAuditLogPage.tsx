import { useQuery } from "@tanstack/react-query";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminPageFrame,
  AdminSection,
  AdminEmptyState,
  AdminTableSkeleton,
} from "../../../components/admin/AdminPageElements";
import { supabase } from "../../../lib/supabase";

interface AuditLogEntry {
  id: string;
  action_type: string;
  actor_email: string | null;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function FinanceAuditLogPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["finance", "audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .ilike("action_type", "finance.%")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);
      return (data ?? []) as AuditLogEntry[];
    },
  });

  return (
    <>
      <PageMeta title="المالية — سجل التدقيق" description="سجل تغييرات الإعدادات والمعاملات المالية" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">سجل التدقيق</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              تتبع التغييرات على الإعدادات والمعاملات المالية
            </p>
          </div>
        </div>

        <AdminSection>
          {isLoading ? (
            <AdminTableSkeleton columns={4} rows={10} />
          ) : logs.length === 0 ? (
            <AdminEmptyState
              title="لا توجد سجلات"
              description="لم يتم تسجيل أي أحداث مالية بعد"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 font-medium text-gray-500">التاريخ والوقت</th>
                    <th className="px-5 py-3 font-medium text-gray-500">الحدث</th>
                    <th className="px-5 py-3 font-medium text-gray-500">النوع</th>
                    <th className="px-5 py-3 font-medium text-gray-500">المعرف</th>
                    <th className="px-5 py-3 font-medium text-gray-500">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString("en-EG")}
                      </td>
                      <td className="px-5 py-3.5 font-medium">{log.action_type}</td>
                      <td className="px-5 py-3.5 text-gray-500">{log.entity_type}</td>
                      <td className="px-5 py-3.5 font-mono text-xs">{log.entity_id}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 max-w-xs truncate">
                        {JSON.stringify(log.metadata)}
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
