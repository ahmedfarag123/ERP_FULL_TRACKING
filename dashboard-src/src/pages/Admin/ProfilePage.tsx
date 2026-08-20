// Page Type: B
// Purpose: Let the signed-in user review and update their own profile information
// Primary user action: Update their name or avatar and review account, role, and activity details
// Data source: profiles, customers, orders, visits, calls

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  IdentificationIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame, AdminSection } from "../../components/admin/AdminPageElements";
import DetailPageLayout from "../../components/layout/DetailPageLayout";
import CustomerAvatar from "../../components/ui/CustomerAvatar";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge, { type StatusBadgeTone } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  clearCurrentAccountAvatarAssets,
  fetchCurrentAccountProfile,
  updateCurrentAccountProfile,
  uploadCurrentAccountAvatar,
  type AccountProfile,
} from "../../lib/account-profile";
import { getRoleLabel } from "../../lib/access-control";
import { supabase } from "../../lib/supabase";
import { buildOdooToProfileMap } from "../../lib/order-user-resolver";
import type { ManagedRole } from "../../types/access-control";

type AssignedCustomer = {
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

type ProfileDraft = {
  fullName: string;
  phone: string;
};

type ProfileSummary = {
  assignedCustomers: number;
  ordersThisMonth: number;
  callsLogged: number;
  visitsCompleted: number;
};

function formatDate(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("ar-EG", {
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
  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `منذ ${diffMinutes}د`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours}س`;
  return `منذ ${Math.round(diffHours / 24)}ي`;
}

function inputClass() {
  return "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";
}

function roleBadge(role: ManagedRole): { label: string; tone: StatusBadgeTone } {
  switch (role) {
    case "admin":
      return { label: "مدير النظام", tone: "blue" };
    case "manager":
      return { label: "مدير", tone: "indigo" };
    case "supervisor":
      return { label: "مشرف", tone: "purple" };
    case "sales_agent":
      return { label: "مندوب مبيعات", tone: "purple" };
    default:
      return { label: "مبيعات هاتفية", tone: "gray" };
  }
}

function customerPriorityTone(priority: string | null): StatusBadgeTone {
  if (priority === "high") return "orange";
  if (priority === "low") return "green";
  return "yellow";
}

export default function ProfilePage() {
  const { authUser, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [customers, setCustomers] = useState<AssignedCustomer[]>([]);
  const [orders, setOrders] = useState<ActivityOrder[]>([]);
  const [visits, setVisits] = useState<ActivityVisit[]>([]);
  const [calls, setCalls] = useState<ActivityCall[]>([]);
  const [summary, setSummary] = useState<ProfileSummary>({
    assignedCustomers: 0,
    ordersThisMonth: 0,
    callsLogged: 0,
    visitsCompleted: 0,
  });
  const [customerMap, setCustomerMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadProfileData = useCallback(async () => {
    if (!authUser) return;

    try {
      setIsLoading(true);
      setError(null);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const [
        profileResult,
        customersRes,
        ordersRes,
        odooLinkedOrdersRes,
        visitsRes,
        callsRes,
        ordersCountRes,
        odooOrdersCountRes,
        callsCountRes,
        visitsCountRes,
      ] = await Promise.all([
        fetchCurrentAccountProfile(),
        supabase
          .from("customers")
          .select("id, customer_name, priority, status, last_visit_at", { count: "exact" })
          .eq("assigned_user_id", authUser.id)
          .order("last_visit_at", { ascending: false, nullsFirst: false })
          .limit(5),
        supabase
          .from("orders")
          .select("id, customer_name, total_amount, created_at")
          .eq("assigned_user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("profiles")
          .select("odoo_user_id")
          .eq("id", authUser.id)
          .maybeSingle(),
        supabase
          .from("visits")
          .select("id, customer_id, checked_in_at, visit_result")
          .eq("user_id", authUser.id)
          .order("checked_in_at", { ascending: false })
          .limit(8),
        supabase
          .from("calls")
          .select("id, customer_id, created_at, call_outcome")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("assigned_user_id", authUser.id)
          .gte("created_at", monthStart)
          .lt("created_at", nextMonthStart),
        null as null,
        supabase
          .from("calls")
          .select("*", { count: "exact", head: true })
          .eq("user_id", authUser.id),
        supabase
          .from("visits")
          .select("*", { count: "exact", head: true })
          .eq("user_id", authUser.id),
      ]);

      const profileOdooUserId =
        ((odooLinkedOrdersRes as any)?.data?.odoo_user_id ?? "").trim() || null;

      let linkedOrdersRes = null;
      let linkedOrdersCountRes = null;
      if (profileOdooUserId) {
        [linkedOrdersRes, linkedOrdersCountRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id, customer_name, total_amount, created_at")
            .eq("user_id", profileOdooUserId)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profileOdooUserId)
            .gte("created_at", monthStart)
            .lt("created_at", nextMonthStart),
        ]);
      }

      if (customersRes.error) throw customersRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (linkedOrdersRes?.error) throw linkedOrdersRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (callsRes.error) throw callsRes.error;
      if (ordersCountRes.error) throw ordersCountRes.error;
      if (linkedOrdersCountRes?.error) throw linkedOrdersCountRes.error;
      if (callsCountRes.error) throw callsCountRes.error;
      if (visitsCountRes.error) throw visitsCountRes.error;

      const mergedOrders = new Map<string, ActivityOrder>();
      for (const order of [
        ...((ordersRes.data ?? []) as ActivityOrder[]),
        ...((linkedOrdersRes?.data ?? []) as ActivityOrder[]),
      ]) {
        mergedOrders.set(order.id, order);
      }
      const allOrders = Array.from(mergedOrders.values())
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .slice(0, 8);

      setProfile(profileResult);
      setDraft({
        fullName: profileResult.fullName,
        phone: profileResult.phone,
      });
      setCustomers((customersRes.data ?? []) as AssignedCustomer[]);
      setOrders(allOrders);
      setVisits((visitsRes.data ?? []) as ActivityVisit[]);
      setCalls((callsRes.data ?? []) as ActivityCall[]);
      setSummary({
        assignedCustomers: customersRes.count ?? 0,
        ordersThisMonth: (ordersCountRes.count ?? 0) + (linkedOrdersCountRes?.count ?? 0),
        callsLogged: callsCountRes.count ?? 0,
        visitsCompleted: visitsCountRes.count ?? 0,
      });

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
          new Map(
            allCustomers.map((customer) => [customer.id, customer.customer_name]),
          ),
        );
      } else {
        setCustomerMap(new Map());
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "فشل تحميل ملفك الشخصي.");
      setProfile(null);
      setDraft(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const activityFeed = useMemo(() => {
    return [
      ...orders.map((order) => ({
        id: `order-${order.id}`,
        title: `تم إنشاء طلب للعميل ${order.customer_name || "عميل غير معروف"}`,
        detail: formatCurrency(order.total_amount),
        timestamp: order.created_at,
        tone: "blue" as const,
      })),
      ...visits.map((visit) => ({
        id: `visit-${visit.id}`,
        title: `تم تسجيل زيارة للعميل ${customerMap.get(visit.customer_id) || "العميل المسند"}`,
        detail: visit.visit_result || "تم تسجيل الزيارة",
        timestamp: visit.checked_in_at,
        tone: "green" as const,
      })),
      ...calls.map((call) => ({
        id: `call-${call.id}`,
        title: `تم تسجيل مكالمة ${call.customer_id ? customerMap.get(call.customer_id) || "لمتابعة العميل" : "لمتابعة عامة"}`,
        detail: call.call_outcome || "تم تسجيل المكالمة",
        timestamp: call.created_at,
        tone: "purple" as const,
      })),
    ]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 8);
  }, [calls, customerMap, orders, visits]);

  const avatarUrl = useMemo(() => {
    if (removeAvatar) return null;
    if (avatarPreviewUrl) return avatarPreviewUrl;
    return profile?.avatarUrl ?? null;
  }, [avatarPreviewUrl, profile?.avatarUrl, removeAvatar]);

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("يجب أن تكون صورة الملف الشخصي بصيغة JPG أو PNG أو WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("يجب ألا يتجاوز حجم صورة الملف الشخصي ٥ ميجابايت.");
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setError(null);
    setRemoveAvatar(false);
    setSelectedAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const resetEditor = () => {
    if (!profile) return;

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setDraft({
      fullName: profile.fullName,
      phone: profile.phone,
    });
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl(null);
    setRemoveAvatar(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!draft) return;
    const nextName = draft.fullName.trim();

    if (!nextName) {
      setError("الاسم مطلوب.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice("");

    try {
      let nextAvatarUrl: string | null | undefined;

      if (selectedAvatarFile) {
        nextAvatarUrl = await uploadCurrentAccountAvatar(selectedAvatarFile);
      } else if (removeAvatar) {
        await clearCurrentAccountAvatarAssets();
        nextAvatarUrl = null;
      }

      await updateCurrentAccountProfile({
        fullName: nextName,
        phone: draft.phone,
        ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
      });

      await Promise.all([loadProfileData(), refreshProfile()]);
      setNotice("تم تحديث ملفك الشخصي.");
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
      setRemoveAvatar(false);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر تحديث ملفك الشخصي.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <PageMeta title="ملفي الشخصي | إدارة المبيعات" description="جار تحميل ملف الحساب." />
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

  if (!profile || !draft) {
    return (
      <>
        <PageMeta title="ملفي الشخصي | إدارة المبيعات" description="لم يتم العثور على الملف الشخصي." />
        <AdminPageFrame>
          <EmptyState
            icon={<UserCircleIcon className="h-8 w-8" />}
            title="الملف الشخصي غير متاح"
            description={error || "تعذر تحميل ملف حسابك."}
            action={
              <Link
                to="/"
                className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
              >
                العودة إلى لوحة التحكم
              </Link>
            }
          />
        </AdminPageFrame>
      </>
    );
  }

  const role = roleBadge(profile.role);

  return (
    <>
      <PageMeta title="ملفي الشخصي | إدارة المبيعات" description="عرض وتحديث ملف حسابك." />
      <AdminPageFrame>
        <DetailPageLayout
          header={
            <PageHeader
              variant="detail"
              backHref="/"
              backLabel="العودة إلى لوحة التحكم"
              title={<span dir="auto">{profile.fullName}</span>}
              subtitle={
                <span dir="auto">
                  {profile.jobTitle || "لا يوجد مسمى وظيفي"}
                  {" · "}
                  {profile.departmentName || "لا يوجد فريق"}
                </span>
              }
              badges={
                <>
                  <StatusBadge
                    label={profile.status === "active" ? "نشط" : profile.status === "inactive" ? "غير نشط" : "مؤرشف"}
                    tone={profile.status === "active" ? "green" : profile.status === "inactive" ? "gray" : "red"}
                  />
                  <StatusBadge label={role.label} tone={role.tone} />
                </>
              }
              actions={
                isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={resetEditor}
                      className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={isSaving}
                      className="inline-flex items-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "جار الحفظ..." : "حفظ الملف"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                  >
                    تعديل الملف
                  </button>
                )
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
                title="محرر الملف الشخصي"
                description="حافظ على بيانات حسابك الظاهرة محدثة لباقي الفريق."
                className="scroll-mt-24"
              >
                <div id="profile-editor" className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-brand-25/70 p-5 dark:border-gray-800 dark:bg-white/[0.02]">
                    <div className="flex flex-col items-center text-center">
                      <CustomerAvatar
                        name={draft.fullName || profile.fullName}
                        src={avatarUrl}
                        size="lg"
                        shape="circle"
                      />
                      <h2 dir="auto" className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                        {draft.fullName || profile.fullName}
                      </h2>
                      <p dir="ltr" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {profile.email}
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <StatusBadge label={role.label} tone={role.tone} />
                        <StatusBadge
                          label={profile.status === "active" ? "نشط" : "غير نشط"}
                          tone={profile.status === "active" ? "green" : "gray"}
                        />
                      </div>

                      {isEditing ? (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileSelection}
                            className="hidden"
                          />
                          <div className="mt-5 flex w-full flex-col gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                            >
                              <ArrowUpTrayIcon className="h-4 w-4" />
                              رفع صورة جديدة
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (avatarPreviewUrl) {
                                  URL.revokeObjectURL(avatarPreviewUrl);
                                }
                                setSelectedAvatarFile(null);
                                setAvatarPreviewUrl(null);
                                setRemoveAvatar(true);
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                            >
                              <TrashIcon className="h-4 w-4" />
                              إزالة الصورة
                            </button>
                          </div>
                          <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            JPG أو PNG أو WebP حتى ٥ ميجابايت. ستحل الصورة الجديدة محل الحالية.
                          </p>
                        </>
                      ) : (
                        <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          تظهر صورتك في رأس مساحة العمل ودليل المستخدمين.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        الاسم الكامل
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.fullName}
                          onChange={(event) =>
                            setDraft((current) =>
                              current ? { ...current, fullName: event.target.value } : current,
                            )
                          }
                          className={inputClass()}
                        />
                      ) : (
                        <div dir="auto" className="rounded-xl border border-gray-200 bg-brand-25 px-4 py-3 text-sm font-medium text-gray-900 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white">
                          {profile.fullName}
                        </div>
                      )}
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        الهاتف
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.phone}
                          onChange={(event) =>
                            setDraft((current) =>
                              current ? { ...current, phone: event.target.value } : current,
                            )
                          }
                          className={inputClass()}
                        />
                      ) : (
                        <div dir="ltr" className="rounded-xl border border-gray-200 bg-brand-25 px-4 py-3 text-sm font-medium text-gray-900 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white">
                          {profile.phone || "--"}
                        </div>
                      )}
                    </label>

                    <div className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        البريد الإلكتروني
                      </span>
                      <div dir="ltr" className="rounded-xl border border-gray-200 bg-brand-25 px-4 py-3 text-sm font-medium text-gray-900 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white">
                        {profile.email}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        الدور
                      </span>
                      <div className="rounded-xl border border-gray-200 bg-brand-25 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
                        <StatusBadge label={getRoleLabel(profile.role)} tone={role.tone} />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        المسمى
                      </span>
                      <div dir="auto" className="rounded-xl border border-gray-200 bg-brand-25 px-4 py-3 text-sm font-medium text-gray-900 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white">
                        {profile.jobTitle || "--"}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        الفريق
                      </span>
                      <div dir="auto" className="rounded-xl border border-gray-200 bg-brand-25 px-4 py-3 text-sm font-medium text-gray-900 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white">
                        {profile.departmentName || "--"}
                      </div>
                    </div>
                  </div>
                </div>
              </AdminSection>

              <AdminSection
                title="تفاصيل الحساب"
                description="بيانات الهوية وتسجيل الدخول والصلاحيات لهذا الحساب."
                className="scroll-mt-24"
              >
                <div id="account-details" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    {
                      label: "عضو منذ",
                      value: formatDate(profile.createdAt),
                      dir: "ltr" as const,
                      icon: <CalendarDaysIcon className="h-5 w-5" />,
                    },
                    {
                      label: "آخر دخول",
                      value: profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : "لم يحدث",
                      dir: "ltr" as const,
                      icon: <ClockIcon className="h-5 w-5" />,
                    },
                    {
                      label: "طريقة آخر دخول",
                      value: profile.lastLoginMethod || "كلمة المرور",
                      dir: "auto" as const,
                      icon: <ShieldCheckIcon className="h-5 w-5" />,
                    },
                    {
                      label: "الهاتف",
                      value: profile.phone || "--",
                      dir: "ltr" as const,
                      icon: <PhoneIcon className="h-5 w-5" />,
                    },
                    {
                      label: "البريد الإلكتروني",
                      value: profile.email,
                      dir: "ltr" as const,
                      icon: <EnvelopeIcon className="h-5 w-5" />,
                    },
                    {
                      label: "معرف الملف",
                      value: profile.id,
                      dir: "ltr" as const,
                      icon: <IdentificationIcon className="h-5 w-5" />,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-gray-200 bg-brand-25/80 p-4 dark:border-gray-800 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                        {item.icon}
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">{item.label}</p>
                      </div>
                      <p dir={item.dir} className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      label: "دخول بكلمة المرور",
                      enabled: profile.passwordEnabled,
                    },
                    {
                      label: "دخول برمز تحقق",
                      enabled: profile.otpEnabled,
                    },
                    {
                      label: "تفضيل رمز التحقق",
                      enabled: profile.preferOtp,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.label}</p>
                        <StatusBadge
                          label={item.enabled ? "مفعل" : "معطل"}
                          tone={item.enabled ? "green" : "gray"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </AdminSection>

              <AdminSection
                title="النشاط الأخير"
                description="أحدث طلباتك وزياراتك وسجلات المكالمات في مساحة العمل."
                className="scroll-mt-24"
              >
                <div id="activity-overview" className="space-y-4">
                  {activityFeed.length === 0 ? (
                    <EmptyState
                      icon={<ClockIcon className="h-8 w-8" />}
                      title="لا يوجد نشاط بعد"
                      description="ستظهر هنا الطلبات والزيارات والمكالمات المرتبطة بحسابك."
                    />
                  ) : (
                    activityFeed.map((item, index) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`mt-1 h-2.5 w-2.5 rounded-full ${
                              item.tone === "blue"
                                ? "bg-blue-500"
                                : item.tone === "green"
                                  ? "bg-emerald-500"
                                  : "bg-violet-500"
                            }`}
                          />
                          {index < activityFeed.length - 1 ? (
                            <span className="mt-2 h-full w-px bg-gray-200 dark:bg-white/[0.02]" />
                          ) : null}
                        </div>
                        <div className="pb-2">
                          <p dir="auto" className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.detail}</p>
                          <p dir="ltr" className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {formatDateTime(item.timestamp)} {" · "} {relativeTime(item.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSection>
            </>
          }
          side={
            <>
              <AdminSection title="ملخص الملف" description="عرض مختصر لنشاطك التشغيلي الحالي.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {[
                    {
                      label: "العملاء المسندون",
                      value: summary.assignedCustomers.toLocaleString("ar-EG"),
                      icon: <UsersIcon className="h-5 w-5" />,
                    },
                    {
                      label: "طلبات هذا الشهر",
                      value: summary.ordersThisMonth.toLocaleString("ar-EG"),
                      icon: <BriefcaseIcon className="h-5 w-5" />,
                    },
                    {
                      label: "المكالمات المسجلة",
                      value: summary.callsLogged.toLocaleString("ar-EG"),
                      icon: <PhoneIcon className="h-5 w-5" />,
                    },
                    {
                      label: "الزيارات المكتملة",
                      value: summary.visitsCompleted.toLocaleString("ar-EG"),
                      icon: <CalendarDaysIcon className="h-5 w-5" />,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-gray-200 bg-brand-25/80 p-4 dark:border-gray-800 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between gap-3 text-gray-400 dark:text-gray-500">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">{item.label}</p>
                        {item.icon}
                      </div>
                      <p dir="ltr" className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </AdminSection>

              <AdminSection title="العملاء المسندون" description="العملاء المملوكون حالياً لحسابك.">
                {customers.length === 0 ? (
                  <EmptyState
                    icon={<UsersIcon className="h-8 w-8" />}
                    title="لا يوجد عملاء مسندون"
                    description="سيظهر العملاء هنا بعد إسناد حسابات عملاء لك."
                  />
                ) : (
                  <div className="space-y-3">
                    {customers.map((customer) => (
                      <Link
                        key={customer.id}
                        to={`/customers/${customer.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                      >
                        <CustomerAvatar name={customer.customer_name} size="sm" shape="circle" />
                        <div className="min-w-0 flex-1">
                          <p dir="auto" className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {customer.customer_name}
                          </p>
                          <p dir="ltr" className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            آخر زيارة: {customer.last_visit_at ? formatDate(customer.last_visit_at) : "لم تحدث"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge
                            label={(customer.priority || "medium").toUpperCase()}
                            tone={customerPriorityTone(customer.priority)}
                          />
                          <StatusBadge
                            label={customer.status === "active" ? "نشط" : "غير نشط"}
                            tone={customer.status === "active" ? "green" : "gray"}
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </AdminSection>

              <AdminSection title="لمحة الصلاحيات" description="الدور والموقع التنظيمي المسند إليك حالياً.">
                <div className="space-y-4">
                  {[
                    { label: "الدور", value: getRoleLabel(profile.role), dir: "auto" as const },
                    { label: "المسمى", value: profile.jobTitle || "--", dir: "auto" as const },
                    { label: "الفريق", value: profile.departmentName || "--", dir: "auto" as const },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {item.label}
                      </p>
                      <p dir={item.dir} className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-xs leading-5 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    تتم إدارة الدور والمسمى والفريق من صلاحيات مساحة العمل. يمكنك تحديث اسمك الظاهر والهاتف والصورة من هنا.
                  </div>
                </div>
              </AdminSection>
            </>
          }
        />
      </AdminPageFrame>
    </>
  );
}
