// Page Type: B — Detail
// Purpose: View full profile, role, and activity for a single system user
// Primary user action: Review user activity or edit role/team assignment
// Data source: admin/users/:userId

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import DetailPageLayout from "../../components/layout/DetailPageLayout";
import { AdminPageFrame, AdminSection } from "../../components/admin/AdminPageElements";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useCurrentAccess } from "../../hooks/useCurrentAccess";
import {
  fetchDepartments,
  fetchUserAccessRecords,
  getRoleLabel,
  ROLE_ORDER,
  updateUserAccess,
} from "../../lib/access-control";
import { supabase } from "../../lib/supabase";
import type { ManagedRole, UserAccessRecord } from "../../types/access-control";

type CustomerAssignment = {
  id: string;
  customer_name: string;
  priority: string | null;
  status: string | null;
  last_visit_at: string | null;
};

type ActivityOrder = {
  id: string;
  customer_name: string | null;
  total_amount: number | null;
  created_at: string;
  user_id: string | null;
};

type ActivityVisit = {
  id: string;
  customer_id: string;
  checked_in_at: string;
  visit_result: string | null;
};

type ActivityCall = {
  id: string;
  customer_id: string | null;
  created_at: string;
  call_outcome: string | null;
};

type EditState = {
  fullName: string;
  role: ManagedRole;
  departmentId: string;
  phone: string;
  odooUserId: string;
};

type OdooUserOption = {
  id: string;
  name: string;
  email: string;
  source: "logistics_users" | "orders";
};

type ProfileOdooLink = {
  odoo_user_id: string | null;
};

type OrderCreatorRow = {
  user_id: string | null;
};

function roleBadge(role: ManagedRole) {
  switch (role) {
    case "admin":
      return { label: "Admin", tone: "blue" as const };
    case "manager":
      return { label: "Manager", tone: "indigo" as const };
    case "supervisor":
      return { label: "Supervisor", tone: "purple" as const };
    case "sales_agent":
      return { label: "Sales Rep", tone: "purple" as const };
    default:
      return { label: "Viewer", tone: "gray" as const };
  }
}

function formatDate(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function relativeTime(value: string) {
  if (!value) return "--";
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

function inputClass() {
  return "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white";
}

export default function UserDetailPage() {
  const { hasPermission, hasAnyPermission } = useCurrentAccess();
  const { userId = "" } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserAccessRecord | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [assignedCustomers, setAssignedCustomers] = useState<CustomerAssignment[]>([]);
  const [orders, setOrders] = useState<ActivityOrder[]>([]);
  const [visits, setVisits] = useState<ActivityVisit[]>([]);
  const [calls, setCalls] = useState<ActivityCall[]>([]);
  const [customerMap, setCustomerMap] = useState<Map<string, string>>(new Map());
  const [odooUsers, setOdooUsers] = useState<OdooUserOption[]>([]);
  const [currentOdooUserId, setCurrentOdooUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadUser = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [users, departmentRows, customersRes, visitsRes, callsRes, odooUsersRes, profileRes, orderCreatorsRes] = await Promise.all([
        fetchUserAccessRecords(),
        fetchDepartments(),
        supabase
          .from("customers")
          .select("id, customer_name, priority, status, last_visit_at")
          .eq("assigned_user_id", userId)
          .order("customer_name", { ascending: true }),
        supabase
          .from("visits")
          .select("id, customer_id, checked_in_at, visit_result")
          .eq("user_id", userId)
          .order("checked_in_at", { ascending: false })
          .limit(12),
        supabase
          .from("calls")
          .select("id, customer_id, created_at, call_outcome")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("logistics_users")
          .select("external_user_id, employee_name, work_email")
          .not("external_user_id", "is", null)
          .order("employee_name"),
        supabase
          .from("profiles")
          .select("odoo_user_id")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("user_id")
          .not("user_id", "is", null)
          .order("user_id", { ascending: true })
          .limit(5000),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (callsRes.error) throw callsRes.error;
      if (odooUsersRes.error) throw odooUsersRes.error;
      if (profileRes.error) throw profileRes.error;
      if (orderCreatorsRes.error) throw orderCreatorsRes.error;

      const profileOdooUserId =
        ((profileRes.data as ProfileOdooLink | null)?.odoo_user_id ?? "").trim() || null;

      const assignedOrdersRes = await supabase
        .from("orders")
        .select("id, customer_name, total_amount, created_at, user_id")
        .eq("assigned_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (assignedOrdersRes.error) throw assignedOrdersRes.error;

      const linkedOdooOrdersRes = profileOdooUserId
        ? await supabase
            .from("orders")
            .select("id, customer_name, total_amount, created_at, user_id")
            .eq("user_id", profileOdooUserId)
            .order("created_at", { ascending: false })
            .limit(12)
        : null;
      if (linkedOdooOrdersRes?.error) throw linkedOdooOrdersRes.error;

      const mergedOrders = new Map<string, ActivityOrder>();
      for (const order of [
        ...((assignedOrdersRes.data ?? []) as ActivityOrder[]),
        ...((linkedOdooOrdersRes?.data ?? []) as ActivityOrder[]),
      ]) {
        mergedOrders.set(order.id, order);
      }

      const nextUser = users.find((item) => item.id === userId) ?? null;
      setUser(nextUser);
      setDepartments(
        departmentRows.map((department) => ({ id: department.id, name: department.name })),
      );
      setAssignedCustomers((customersRes.data ?? []) as CustomerAssignment[]);
      setOrders(
        Array.from(mergedOrders.values())
          .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
          .slice(0, 12),
      );
      setVisits((visitsRes.data ?? []) as ActivityVisit[]);
      setCalls((callsRes.data ?? []) as ActivityCall[]);

      if (nextUser) {
        setEditState({
          fullName: nextUser.fullName,
          role: nextUser.role,
          departmentId: nextUser.departmentId ?? "",
          phone: nextUser.phone,
          odooUserId: profileOdooUserId ?? "",
        });
      }

      setCurrentOdooUserId(profileOdooUserId);

      const nextOdooUsers = new Map<string, OdooUserOption>();
      for (const userRow of odooUsersRes.data ?? []) {
        const id = String(userRow.external_user_id ?? "").trim();
        if (!id) continue;
        nextOdooUsers.set(id, {
          id,
          name: userRow.employee_name ?? id,
          email: userRow.work_email ?? "",
          source: "logistics_users",
        });
      }
      for (const creatorRow of (orderCreatorsRes.data ?? []) as OrderCreatorRow[]) {
        const id = String(creatorRow.user_id ?? "").trim();
        if (!id || nextOdooUsers.has(id)) continue;
        nextOdooUsers.set(id, {
          id,
          name: `Odoo UID ${id}`,
          email: "",
          source: "orders",
        });
      }
      setOdooUsers(Array.from(nextOdooUsers.values()));

      const customerIds = Array.from(
        new Set(
          [
            ...(customersRes.data ?? []).map((customer) => customer.id),
            ...((visitsRes.data ?? []) as ActivityVisit[]).map((visit) => visit.customer_id),
            ...((callsRes.data ?? []) as ActivityCall[])
              .map((call) => call.customer_id)
              .filter((value): value is string => Boolean(value)),
          ],
        ),
      );

      if (customerIds.length > 0) {
        const BATCH_SIZE = 50;
        const chunks: string[][] = [];
        for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
          chunks.push(customerIds.slice(i, i + BATCH_SIZE));
        }
        const results = await Promise.all(
          chunks.map((chunk) =>
            supabase.from("customers").select("id, customer_name").in("id", chunk),
          ),
        );
        for (const res of results) {
          if (res.error) throw res.error;
        }
        const allCustomers = results.flatMap((res) => res.data ?? []);

        setCustomerMap(
          new Map(allCustomers.map((customer) => [customer.id, customer.customer_name])),
        );
      } else {
        setCustomerMap(new Map());
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load user profile.");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const handleSave = async () => {
    if (!user || !editState || !hasPermission("users.role-change")) return;

    setIsSaving(true);
    setError(null);
    setNotice("");

    try {
      await updateUserAccess({
        userId: user.id,
        fullName: editState.fullName.trim(),
        role: editState.role,
        departmentId: editState.departmentId || null,
        phone: editState.phone.trim(),
      });

      // Save odoo_user_id separately
      const newOdooUserId = editState.odooUserId || null;
      if (newOdooUserId !== currentOdooUserId) {
        const { error: odooError } = await supabase
          .from("profiles")
          .update({ odoo_user_id: newOdooUserId })
          .eq("id", user.id);
        if (odooError) throw odooError;
      }

      setNotice(`Saved updates for ${editState.fullName}.`);
      setIsEditing(false);
      await loadUser();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user || !hasAnyPermission(["users.role-change", "users.auth-controls"])) return;

    setIsSaving(true);
    setError(null);
    setNotice("");

    try {
      await updateUserAccess({
        userId: user.id,
        status: "inactive",
      });
      setNotice(`${user.fullName} has been deactivated.`);
      await loadUser();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to deactivate user.");
    } finally {
      setIsSaving(false);
    }
  };

  const activitySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      ordersThisMonth: orders.filter((order) => {
        const date = new Date(order.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length,
      callsLogged: calls.length,
      visitsCompleted: visits.length,
    };
  }, [calls.length, orders, visits.length]);

  const recentActivity = useMemo(() => {
    return [
      ...orders.map((order) => ({
        id: `order-${order.id}`,
        title: `Order created for ${order.customer_name || "Unknown customer"}`,
        detail: formatCurrency(order.total_amount),
        timestamp: order.created_at,
      })),
      ...visits.map((visit) => ({
        id: `visit-${visit.id}`,
        title: `Visit logged for ${customerMap.get(visit.customer_id) || visit.customer_id.slice(0, 8)}`,
        detail: visit.visit_result || "Visit recorded",
        timestamp: visit.checked_in_at,
      })),
      ...calls.map((call) => ({
        id: `call-${call.id}`,
        title: `Call logged for ${call.customer_id ? customerMap.get(call.customer_id) || call.customer_id.slice(0, 8) : "general follow-up"}`,
        detail: call.call_outcome || "Call recorded",
        timestamp: call.created_at,
      })),
    ]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 5);
  }, [calls, customerMap, orders, visits]);

  if (isLoading) {
    return (
      <>
        <PageMeta title="User Detail | Sales Admin" description="Loading user profile." />
        <AdminPageFrame>
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
              <div className="space-y-6">
                <div className="h-72 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
                <div className="h-64 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
              </div>
              <div className="space-y-6">
                <div className="h-48 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
                <div className="h-56 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
              </div>
            </div>
          </div>
        </AdminPageFrame>
      </>
    );
  }

  if (!user || !editState) {
    return (
      <>
        <PageMeta title="User Detail | Sales Admin" description="User not found." />
        <AdminPageFrame>
          <EmptyState
            title="User not found"
            description="The requested profile is not available in the current access-control dataset."
            action={
              <Link
                to="/admin/users"
                className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
              >
                Back to Users
              </Link>
            }
          />
        </AdminPageFrame>
      </>
    );
  }

  const role = roleBadge(user.role);
  const canEditUser = hasPermission("users.role-change");
  const canDeactivateUser = hasAnyPermission(["users.role-change", "users.auth-controls"]);

  return (
    <>
      <PageMeta title={`${user.fullName} | Sales Admin`} description="User profile and activity." />

      <AdminPageFrame>
        <DetailPageLayout
          header={
            <PageHeader
              variant="detail"
              backHref="/admin/users"
              backLabel="Back to Users"
              title={user.fullName}
              subtitle={`${role.label} · ${user.departmentName || "No team assigned"}`}
              badges={
                <>
                  <StatusBadge
                    label={user.status === "active" ? "Active" : "Inactive"}
                    tone={user.status === "active" ? "green" : "gray"}
                  />
                  <StatusBadge label={role.label} tone={role.tone} />
                </>
              }
              actions={
                <>
                  {canEditUser ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                    >
                      Edit User
                    </button>
                  ) : null}
                  {canDeactivateUser ? (
                    <button
                      type="button"
                      onClick={() => void handleDeactivate()}
                      disabled={isSaving}
                      className="inline-flex items-center rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30"
                    >
                      Deactivate
                    </button>
                  ) : null}
                </>
              }
            />
          }
          notices={
            <>
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
              {notice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              ) : null}
            </>
          }
          main={
            <>
              <AdminSection
                title="Account Information"
                description={isEditing ? "Update profile details, role, and team assignment." : "Read-only profile and access details."}
                className="scroll-mt-24"
              >
                <div id="account-information" className="grid gap-4 md:grid-cols-2">
                  {!isEditing || !canEditUser ? (
                    <>
                      {[
                        { label: "Full Name", value: user.fullName, dir: "auto" as const },
                        { label: "Email", value: user.email, dir: "ltr" as const },
                        { label: "Phone", value: user.phone || "—", dir: "ltr" as const },
                        { label: "Role", value: getRoleLabel(user.role), dir: "auto" as const },
                        {
                          label: "Team",
                          value: user.departmentName || "No team assigned",
                          dir: "auto" as const,
                        },
                        { label: "Created", value: formatDate(user.createdAt), dir: "ltr" as const },
                        {
                          label: "Last Login",
                          value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never",
                          dir: "ltr" as const,
                        },
                      ].map((row) => (
                        <div key={row.label}>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{row.label}</p>
                          <p dir={row.dir} className="text-sm font-medium text-gray-900 dark:text-white">
                            {row.value}
                          </p>
                        </div>
                      ))}
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">ربط مستخدم Odoo</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {currentOdooUserId ? (
                            (() => {
                              const linkedUser = odooUsers.find((u) => u.id === currentOdooUserId);
                              return linkedUser ? `${linkedUser.name} · UID ${linkedUser.id}` : currentOdooUserId;
                            })()
                          ) : (
                            <span className="text-gray-400">غير مربوط</span>
                          )}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                          Full Name
                        </span>
                        <input
                          type="text"
                          value={editState.fullName}
                          onChange={(event) =>
                            setEditState((current) =>
                              current ? { ...current, fullName: event.target.value } : current,
                            )
                          }
                          className={inputClass()}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                          Email
                        </span>
                        <input type="text" value={user.email} readOnly className={`${inputClass()} opacity-70`} />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                          Phone
                        </span>
                        <input
                          type="text"
                          value={editState.phone}
                          onChange={(event) =>
                            setEditState((current) =>
                              current ? { ...current, phone: event.target.value } : current,
                            )
                          }
                          className={inputClass()}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                          Role
                        </span>
                        <select
                          value={editState.role}
                          onChange={(event) =>
                            setEditState((current) =>
                              current ? { ...current, role: event.target.value as ManagedRole } : current,
                            )
                          }
                          className={inputClass()}
                        >
                          {ROLE_ORDER.map((entry) => (
                            <option key={entry} value={entry}>
                              {getRoleLabel(entry)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                          Team
                        </span>
                        <select
                          value={editState.departmentId}
                          onChange={(event) =>
                            setEditState((current) =>
                              current ? { ...current, departmentId: event.target.value } : current,
                            )
                          }
                          className={inputClass()}
                        >
                          <option value="">لا يوجد فريق</option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                          ربط مستخدم Odoo
                        </span>
                        <select
                          value={editState.odooUserId}
                          onChange={(event) =>
                            setEditState((current) =>
                              current ? { ...current, odooUserId: event.target.value } : current,
                            )
                          }
                          className={inputClass()}
                        >
                          <option value="">غير مربوط</option>
                          {odooUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.email
                                ? `${u.name} (${u.email})`
                                : u.source === "orders"
                                  ? `${u.name} · orders.user_id`
                                  : `${u.name} · UID ${u.id}`}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400">
                          اختر قيمة تطابق orders.user_id حتى تظهر الطلبات المرتبطة بهذا المستخدم.
                        </span>
                      </label>
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {isEditing && canEditUser ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          void loadUser();
                        }}
                        className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : canEditUser ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                    >
                      Edit User
                    </button>
                  ) : null}
                </div>
              </AdminSection>

              <AdminSection
                title="Assigned Customers"
                description="Customer accounts currently owned by this user."
              >
                {assignedCustomers.length === 0 ? (
                  <EmptyState
                    title="No assigned customers"
                    description="This user does not currently own any customers."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-right text-sm" dir="rtl">
                        <thead className="border-b border-gray-100 bg-brand-25/80 dark:border-gray-800 dark:bg-white/[0.02]">
                          <tr>
                            {["Customer", "Priority", "Last Visit", "Status"].map((label) => (
                              <th
                                key={label}
                                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {assignedCustomers.slice(0, 8).map((customer) => (
                            <tr key={customer.id}>
                              <td className="px-4 py-4">
                                <Link
                                  to={`/customers/${customer.id}`}
                                  dir="auto"
                                  className="font-medium text-gray-900 transition hover:text-brand-600 dark:text-white"
                                >
                                  {customer.customer_name}
                                </Link>
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge
                                  label={(customer.priority || "medium").toUpperCase()}
                                  tone={
                                    customer.priority === "high"
                                      ? "orange"
                                      : customer.priority === "low"
                                        ? "green"
                                        : "yellow"
                                  }
                                />
                              </td>
                              <td dir="ltr" className="px-4 py-4 text-gray-700 dark:text-gray-300">
                                {customer.last_visit_at ? formatDate(customer.last_visit_at) : "Never"}
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge
                                  label={customer.status === "active" ? "Active" : "Inactive"}
                                  tone={customer.status === "active" ? "green" : "gray"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5">
                      <Link
                        to="/customers"
                        className="inline-flex items-center text-sm font-semibold text-brand-600 transition hover:text-brand-700"
                      >
                        View all {"->"}
                      </Link>
                    </div>
                  </>
                )}
              </AdminSection>
            </>
          }
          side={
            <>
              <AdminSection title="Activity Summary" description="Operational output for this user.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: "Orders This Month", value: activitySummary.ordersThisMonth.toLocaleString("en-US") },
                    { label: "Calls Logged", value: activitySummary.callsLogged.toLocaleString("en-US") },
                    { label: "Visits Completed", value: activitySummary.visitsCompleted.toLocaleString("en-US") },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-brand-25 p-4 text-center dark:bg-white/[0.04]">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">
                        {item.value}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </AdminSection>

              <AdminSection
                title="Recent Activity"
                description="The last five actions tied to this user."
              >
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <EmptyState
                      title="No recent activity"
                      description="Activity events will appear here once this user starts working orders, calls, or visits."
                    />
                  ) : (
                    recentActivity.map((item, index) => {
                      const dot =
                        item.id.startsWith("order")
                          ? "bg-blue-500"
                          : item.id.startsWith("call")
                            ? "bg-violet-500"
                            : "bg-emerald-500";
                      return (
                        <div key={item.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dot}`} />
                            {index < recentActivity.length - 1 ? (
                              <span className="mt-2 h-full w-px bg-gray-200 dark:bg-white/[0.02]" />
                            ) : null}
                          </div>
                          <div className="pb-2">
                            <p className="text-sm text-gray-700 dark:text-gray-200" dir="auto">
                              {item.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {item.detail}
                            </p>
                            <p dir="ltr" className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              {formatDateTime(item.timestamp)} · {relativeTime(item.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </AdminSection>
            </>
          }
        />
      </AdminPageFrame>
    </>
  );
}
