// Page Type: A — List
// Purpose: Browse all system users with role and activity context
// Primary user action: Navigate to user profile or create a new user
// Data source: admin/users collection

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseIcon,
  CheckCircleIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  TrashIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import ListPageLayout from "../../components/layout/ListPageLayout";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import CustomerAvatar from "../../components/ui/CustomerAvatar";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useCurrentAccess } from "../../hooks/useCurrentAccess";
import { useAuth } from "../../context/AuthContext";
import { fetchUserAccessRecords, getRoleLabel, ROLE_ORDER } from "../../lib/access-control";
import { fetchAdminUsers, deleteAdminUser, generateAdminUserRecoveryLink } from "../../lib/admin-users";
import { SUPER_ADMIN_EMAILS } from "../../lib/admin-access";
import { supabase } from "../../lib/supabase";
import type { ManagedRole, UserAccessRecord } from "../../types/access-control";

type DirectoryUser = UserAccessRecord & {
  avatarUrl: string | null;
  odooLinked: boolean;
  odooUserName: string | null;
};

type StatusFilter = "all" | "active" | "inactive";

function roleBadge(role: ManagedRole): {
  label: string;
  tone: "blue" | "indigo" | "purple" | "gray";
  className?: string;
} {
  switch (role) {
    case "admin":
      return { label: "Admin", tone: "blue" };
    case "manager":
      return { label: "Manager", tone: "indigo" };
    case "supervisor":
      return { label: "Supervisor", tone: "purple" };
    case "sales_agent":
      return { label: "Sales Agent", tone: "purple" };
    case "telesales":
      return {
        label: "Telesales",
        tone: "gray",
        className: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-300",
      };
    default:
      return { label: "Viewer", tone: "gray" };
  }
}

function formatRelativeTime(value: string) {
  if (!value) return "Never logged in";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function formatDate(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

export default function UsersManagement() {
  const { hasPermission, hasAnyPermission } = useCurrentAccess();
  const { profile } = useAuth();
  const isSuperAdmin = !!profile?.email && SUPER_ADMIN_EMAILS.includes(profile.email.trim().toLowerCase());
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ManagedRole>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [accessRecords, adminUsers, odooUsersRes] = await Promise.all([
        fetchUserAccessRecords(),
        fetchAdminUsers(),
        supabase
          .from("logistics_users")
          .select("external_user_id, employee_name")
          .not("external_user_id", "is", null),
      ]);

      const avatarMap = new Map(adminUsers.map((user) => [user.id, user.avatarUrl]));

      // Build odoo_user_id -> employee_name map for display
      const odooUserMap = new Map<string, string>();
      (odooUsersRes.data ?? []).forEach((u: any) => {
        odooUserMap.set(u.external_user_id, u.employee_name);
      });

      // Fetch profiles to get odoo_user_id for each user
      const userIds = accessRecords.map((r) => r.id);
      const odooLinkMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, odoo_user_id")
          .in("id", userIds);
        (profiles ?? []).forEach((p: any) => {
          if (p.odoo_user_id) odooLinkMap.set(p.id, p.odoo_user_id);
        });
      }

      setUsers(
        accessRecords.map((record) => ({
          ...record,
          avatarUrl: avatarMap.get(record.id) ?? null,
          odooLinked: odooLinkMap.has(record.id),
          odooUserName: odooLinkMap.get(record.id) ? odooUserMap.get(odooLinkMap.get(record.id)!) ?? null : null,
        })),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleResetPassword = useCallback(
    async (user: DirectoryUser) => {
      if (
        !window.confirm(
          `إعادة تعيين كلمة السر للمستخدم "${user.fullName}"؟\nسيتم إنشاء رابط استعادة كلمة السر ونسخه.`,
        )
      ) {
        return;
      }
      try {
        const { actionLink } = await generateAdminUserRecoveryLink({
          userId: user.id,
          email: user.email,
        });
        try {
          await navigator.clipboard.writeText(actionLink);
          alert("تم إنشاء رابط إعادة تعيين كلمة السر ونسخه إلى الحافظة.\nأرسله للمستخدم لتعيين كلمة سر جديدة.");
        } catch {
          window.prompt("انسخ رابط إعادة تعيين كلمة السر وأرسله للمستخدم:", actionLink);
        }
      } catch (resetError) {
        alert(resetError instanceof Error ? resetError.message : "فشل إنشاء رابط إعادة التعيين.");
      }
    },
    [],
  );

  const handleDeleteUser = useCallback(
    async (user: DirectoryUser) => {
      if (
        !window.confirm(
          `حذف المستخدم "${user.fullName}" (${user.email}) نهائيًا؟\nلا يمكن التراجع عن هذا الإجراء.`,
        )
      ) {
        return;
      }
      try {
        await deleteAdminUser({ userId: user.id });
        await loadUsers();
      } catch (deleteError) {
        alert(deleteError instanceof Error ? deleteError.message : "فشل حذف المستخدم.");
      }
    },
    [loadUsers],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [user.fullName, user.email, user.phone, user.departmentName, getRoleLabel(user.role)]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const totalUsers = filteredUsers.length;
  const activeUsers = filteredUsers.filter((user) => user.status === "active").length;
  const adminUsersCount = filteredUsers.filter((user) => user.role === "admin").length;
  const salesRepCount = filteredUsers.filter((user) => user.role === "sales_agent").length;

  return (
    <>
      <PageMeta title="Users | Sales Admin" description="Manage system users and their access." />

      <AdminPageFrame>
        <ListPageLayout
          header={
            <PageHeader
              variant="list"
              eyebrow="Identity workspace"
              title="Users"
              subtitle="Manage internal accounts, inspect role coverage, and jump directly into each user's operational profile."
              actions={hasPermission("users.invite") ? (
                <Link
                  to="/admin/users/new"
                  className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  إنشاء مستخدم {"<-"}
                </Link>
              ) : undefined}
            />
          }
          notices={
            error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null
          }
          stats={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">إجمالي المستخدمين</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UsersIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
                  {isLoading ? "—" : totalUsers.toLocaleString("ar-EG")}
                </p>
              </article>
              <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">نشط</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircleIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
                  {isLoading ? "—" : activeUsers.toLocaleString("ar-EG")}
                </p>
              </article>
              <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">المشرفون</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ShieldCheckIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
                  {isLoading ? "—" : adminUsersCount.toLocaleString("ar-EG")}
                </p>
              </article>
              <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">مندوبي المبيعات</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <BriefcaseIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
                  {isLoading ? "—" : salesRepCount.toLocaleString("ar-EG")}
                </p>
              </article>
            </div>
          }
        >
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث بالاسم أو الهاتف أو البريد"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-3">
                <select
                  value={roleFilter}
                  onChange={(event) =>
                    startTransition(() => setRoleFilter(event.target.value as "all" | ManagedRole))
                  }
                  className="min-w-[160px] cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  aria-label="الدور"
                >
                  <option value="all">كل الأدوار</option>
                  {ROLE_ORDER.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    startTransition(() => setStatusFilter(event.target.value as StatusFilter))
                  }
                  className="min-w-[160px] cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  aria-label="الحالة"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]"
                  />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  title="لم يتم العثور على مستخدمين"
                  description="عدّل البحث أو الدور أو الحالة لعرض نطاق أوسع من المستخدمين."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm" dir="rtl">
                  <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                    <tr>
                      {["المستخدم", "الدور", "الفريق", "Odoo", "الحالة", "آخر دخول", "تاريخ الإنشاء", "الإجراء"].map((label) => (
                        <th key={label} className="px-4 py-3 text-right">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const role = roleBadge(user.role);
                      return (
                        <tr
                          key={user.id}
                          className="transition hover:bg-brand-25/80 dark:hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar
                                name={user.fullName}
                                src={user.avatarUrl}
                                size="sm"
                              />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {user.fullName}
                                </p>
                                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge label={role.label} tone={role.tone} className={role.className ?? ""} />
                          </td>
                          <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                            {user.departmentName || "--"}
                          </td>
                          <td className="px-4 py-4">
                            {user.odooLinked ? (
                              <StatusBadge label="مربوط" tone="green" />
                            ) : (
                              <StatusBadge label="غير مربوط" tone="gray" />
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge
                              label={user.status === "active" ? "نشط" : "غير نشط"}
                              tone={user.status === "active" ? "green" : "gray"}
                            />
                          </td>
                          <td className="px-4 py-4">
                            {user.lastLoginAt ? (
                              <span dir="ltr" className="text-gray-700 dark:text-gray-300">
                                {formatRelativeTime(user.lastLoginAt)}
                              </span>
                            ) : (
                              <StatusBadge label="لم يسجل الدخول" tone="red" />
                            )}
                          </td>
                          <td dir="ltr" className="px-4 py-4 text-gray-700 dark:text-gray-300">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/admin/users/${user.id}`}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                              >
                                عرض الملف
                              </Link>
                              {hasAnyPermission(["users.role-change", "users.auth-controls"]) ? (
                                <Link
                                  to={`/admin/users/${user.id}`}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                                >
                                  تعديل
                                </Link>
                              ) : null}
                              {isSuperAdmin ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleResetPassword(user)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/10"
                                    title="إعادة تعيين كلمة السر"
                                  >
                                    <KeyIcon className="h-4 w-4" aria-hidden />
                                    كلمة السر
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteUser(user)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
                                    title="حذف المستخدم نهائيًا"
                                  >
                                    <TrashIcon className="h-4 w-4" aria-hidden />
                                    حذف نهائي
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ListPageLayout>
      </AdminPageFrame>
    </>
  );
}
