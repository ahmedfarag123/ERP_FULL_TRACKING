import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  PhoneIcon,
  SignalIcon,
  TagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame, AdminSection } from "../../components/admin/AdminPageElements";
import StatusBadge, { type StatusBadgeTone } from "../../components/ui/StatusBadge";
import CustomerAvatar from "../../components/ui/CustomerAvatar";
import {
  CALL_CONNECTIVITY_STATUS_OPTIONS,
  CALL_REASON_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  CUSTOMER_DISPOSITION_OPTIONS,
  CUSTOMER_OBJECTION_OPTIONS,
  NEXT_ACTION_OPTIONS,
  REQUESTED_ACTION_OPTIONS,
  formatDurationMmSs,
  formatOptionLabel,
  resolveCallDirection,
} from "../../lib/customer-activity";
import { supabase } from "../../lib/supabase";

interface CallDetail {
  id: string;
  customer_id: string | null;
  user_id: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  call_duration_seconds?: number | null;
  call_notes?: string | null;
  call_status?: string | null;
  contact_status?: string | null;
  contact_status_details?: Record<string, unknown> | null;
  call_reason?: string | null;
  customer_response?: string | null;
  call_outcome?: string | null;
  customer_disposition?: string | null;
  customer_objection?: string | null;
  objection_details?: Record<string, unknown> | null;
  requested_actions?: string[] | null;
  requested_action_details?: Record<string, unknown> | null;
  next_action?: string | null;
  callback_at?: string | null;
  follow_up_sla_status?: string | null;
  requires_urgent_action?: boolean | null;
  service_issue_flagged?: boolean | null;
  service_issue_type?: string | null;
  raw_form_payload?: Record<string, unknown> | null;
  customer_name?: string;
  user_name?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDetailKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function flattenDetails(value: unknown, prefix = ""): Array<{ label: string; value: string }> {
  const record = asRecord(value);
  if (!record) return [];

  return Object.entries(record).flatMap(([key, entry]) => {
    const label = prefix ? `${prefix} / ${formatDetailKey(key)}` : formatDetailKey(key);
    if (entry == null || entry === "") return [];
    if (Array.isArray(entry)) {
      const text = entry.filter(Boolean).join(" / ");
      return text ? [{ label, value: text }] : [];
    }
    if (typeof entry === "object") {
      return flattenDetails(entry, label);
    }
    return [{ label, value: String(entry) }];
  });
}

function statusTone(value: string | null | undefined): StatusBadgeTone {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("connected") || normalized.includes("completed")) return "green";
  if (normalized.includes("missed") || normalized.includes("no_answer") || normalized.includes("dropped")) return "red";
  if (normalized.includes("busy") || normalized.includes("pending")) return "yellow";
  return "gray";
}

function slaTone(value: string | null | undefined): StatusBadgeTone {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("done") || normalized.includes("met")) return "green";
  if (normalized.includes("overdue") || normalized.includes("breach")) return "red";
  if (normalized.includes("due") || normalized.includes("pending")) return "yellow";
  return "gray";
}

function DetailTile({
  label,
  value,
  icon,
  dir = "auto",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  dir?: "ltr" | "rtl" | "auto";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-brand-25/80 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <div dir={dir} className="mt-2 break-words text-sm font-semibold leading-6 text-gray-900 dark:text-white">
            {value}
          </div>
        </div>
        {icon ? <div className="mt-0.5 text-gray-400 dark:text-gray-500">{icon}</div> : null}
      </div>
    </div>
  );
}

function TimelineItem({
  icon,
  label,
  value,
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: "blue" | "green" | "amber" | "rose" | "gray";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
    green: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    amber: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    rose: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    gray: "bg-brand-25 text-gray-600 ring-gray-200 dark:bg-white/10 dark:text-gray-300 dark:ring-white/10",
  }[tone];

  return (
    <li className="min-w-0 rounded-xl border border-gray-100 bg-brand-25/80 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 ${toneClasses}`}>
        {icon}
      </span>
      <div className="mt-3 min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <div className="mt-1 text-sm font-semibold leading-6 text-gray-900 dark:text-white" dir="auto">
          {value}
        </div>
      </div>
    </li>
  );
}

function DetailList({ details }: { details: Array<{ label: string; value: string }> }) {
  if (details.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <dl className="space-y-2">
        {details.map((detail) => (
          <div key={`${detail.label}-${detail.value}`} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
            <dt className="text-xs text-gray-500 dark:text-gray-400">{detail.label}</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white" dir="auto">
              {detail.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function ActivityDetailPage() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<CallDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCall = useCallback(async () => {
    if (!callId) return;
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("calls")
        .select(
          "id, customer_id, user_id, created_at, started_at, completed_at, call_duration_seconds, call_notes, call_status, contact_status, contact_status_details, call_reason, customer_response, call_outcome, customer_disposition, customer_objection, objection_details, requested_actions, requested_action_details, next_action, callback_at, follow_up_sla_status, requires_urgent_action, service_issue_flagged, service_issue_type, raw_form_payload",
        )
        .eq("id", callId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) {
        setError("المكالمة غير موجودة");
        return;
      }

      const callData = data as CallDetail;

      const [customerData, profileData] = await Promise.all([
        callData.customer_id
          ? supabase.from("customers").select("customer_name").eq("id", callData.customer_id).single()
          : null,
        supabase.from("profiles").select("full_name").eq("id", callData.user_id).single(),
      ]);

      callData.customer_name = customerData?.data?.customer_name ?? "عميل غير معروف";
      callData.user_name = profileData?.data?.full_name ?? "غير معروف";

      setCall(callData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحميل المكالمة");
    } finally {
      setIsLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    void loadCall();
  }, [loadCall]);

  const enriched = useMemo(() => {
    const payload = asRecord(call?.raw_form_payload);
    const requestedActions = call?.requested_actions?.length
      ? call.requested_actions
      : asStringArray(payload?.requested_actions);
    const contactDetails = flattenDetails(call?.contact_status_details).length
      ? flattenDetails(call?.contact_status_details)
      : flattenDetails(payload?.contact_status_details);
    const objectionDetails = flattenDetails(call?.objection_details).length
      ? flattenDetails(call?.objection_details)
      : flattenDetails(payload?.objection_details);
    const actionDetails = flattenDetails(call?.requested_action_details).length
      ? flattenDetails(call?.requested_action_details)
      : flattenDetails(payload?.requested_action_details);
    const nextActionDetails = flattenDetails(payload?.next_action_details);

    return {
      contactStatus: call?.contact_status ?? asText(payload?.contact_status),
      disposition: call?.customer_disposition ?? asText(payload?.customer_disposition) ?? call?.customer_response ?? null,
      objection: call?.customer_objection ?? asText(payload?.customer_objection),
      requestedActions,
      contactDetails,
      objectionDetails,
      actionDetails,
      nextActionDetails,
      serviceIssueType: call?.service_issue_type ?? asText(payload?.service_issue_type),
    };
  }, [call]);

  if (isLoading) {
    return (
      <AdminPageFrame>
        <PageMeta title="تفاصيل النشاط" description="تحميل..." />
        <div className="space-y-5">
          <div className="h-20 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02] lg:col-span-2" />
            <div className="h-80 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
          </div>
        </div>
      </AdminPageFrame>
    );
  }

  if (error || !call) {
    return (
      <AdminPageFrame>
        <PageMeta title="تفاصيل النشاط" description="خطأ" />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-gray-700">
          <PhoneIcon className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{error ?? "المكالمة غير موجودة"}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 rounded-xl bg-brand-25 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-gray-700"
          >
            العودة
          </button>
        </div>
      </AdminPageFrame>
    );
  }

  const direction = resolveCallDirection(call);
  const connectivityLabel = formatOptionLabel(CALL_CONNECTIVITY_STATUS_OPTIONS, call.call_status) ?? call.call_status ?? "غير محدد";
  const contactLabel = formatOptionLabel(CONTACT_STATUS_OPTIONS, enriched.contactStatus) ?? enriched.contactStatus ?? "غير محدد";
  const reasonLabel = formatOptionLabel(CALL_REASON_OPTIONS, call.call_reason) ?? call.call_reason ?? "--";
  const dispositionLabel =
    formatOptionLabel(CUSTOMER_DISPOSITION_OPTIONS, enriched.disposition) ?? enriched.disposition ?? call.customer_response ?? "--";
  const objectionLabel = formatOptionLabel(CUSTOMER_OBJECTION_OPTIONS, enriched.objection) ?? enriched.objection;
  const nextActionLabel = formatOptionLabel(NEXT_ACTION_OPTIONS, call.next_action) ?? call.next_action ?? "--";
  const requestedActionLabels = enriched.requestedActions.map(
    (action) => formatOptionLabel(REQUESTED_ACTION_OPTIONS, action) ?? action,
  );

  return (
    <AdminPageFrame dir="rtl">
      <PageMeta title={`نشاط المكالمة - ${call.customer_name}`} description="تفاصيل نشاط المكالمة" />

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="العودة"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white transition hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          >
            <ArrowRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          <CustomerAvatar name={call.customer_name || "عميل"} size="md" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">تفاصيل المكالمة</p>
            <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white" dir="auto">
              {call.customer_name || "عميل غير معروف"}
            </h1>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400" dir="auto">
              {call.user_name || "غير محدد"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={direction.label} tone={direction.tone} />
          <StatusBadge label={connectivityLabel} tone={statusTone(call.call_status)} dot />
          {call.requires_urgent_action ? <StatusBadge label="متابعة عاجلة" tone="red" /> : null}
          {call.follow_up_sla_status ? (
            <StatusBadge label={call.follow_up_sla_status} tone={slaTone(call.follow_up_sla_status)} />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <AdminSection title="معلومات المكالمة" className="h-full">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <DetailTile label="تاريخ الإنشاء" value={formatDate(call.created_at)} icon={<CalendarDaysIcon className="h-5 w-5" />} />
              <DetailTile label="البداية" value={formatDate(call.started_at)} icon={<PhoneIcon className="h-5 w-5" />} />
              <DetailTile label="النهاية" value={formatDate(call.completed_at)} icon={<CheckCircleIcon className="h-5 w-5" />} />
              <DetailTile label="المدة" value={formatDurationMmSs(call.call_duration_seconds)} icon={<ClockIcon className="h-5 w-5" />} />
            </div>
          </AdminSection>
        </div>

        <div className="xl:col-span-4">
          <AdminSection title="المراجع" className="h-full">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <DetailTile
                label="العميل"
                value={call.customer_name || "عميل غير معروف"}
                icon={<UserIcon className="h-5 w-5" />}
              />
              <DetailTile
                label="موظف المبيعات"
                value={call.user_name || "غير معروف"}
                icon={<UserIcon className="h-5 w-5" />}
              />
              <DetailTile
                label="نوع النشاط"
                value="مكالمة"
                icon={<PhoneIcon className="h-5 w-5" />}
              />
            </div>
          </AdminSection>
        </div>

        <div className="xl:col-span-12">
          <AdminSection title="مسار المحادثة" description="ترتيب سريع لما حدث في المكالمة وما يجب عمله بعدها.">
            <ol className="grid gap-3 lg:grid-cols-5">
              <TimelineItem
                icon={<SignalIcon className="h-4 w-4" />}
                label="حالة الاتصال"
                value={
                  <div>
                    <span>{connectivityLabel}</span>
                    <div className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400">بيانات التواصل: {contactLabel}</div>
                    <DetailList details={enriched.contactDetails} />
                  </div>
                }
                tone={statusTone(call.call_status) === "green" ? "green" : statusTone(call.call_status) === "red" ? "rose" : "amber"}
              />
              <TimelineItem icon={<TagIcon className="h-4 w-4" />} label="سبب المكالمة" value={reasonLabel} />
              <TimelineItem
                icon={<UserIcon className="h-4 w-4" />}
                label="موقف العميل"
                value={
                  <div>
                    <span>{dispositionLabel}</span>
                    {objectionLabel ? (
                      <div className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400">الاعتراض: {objectionLabel}</div>
                    ) : null}
                    <DetailList details={enriched.objectionDetails} />
                  </div>
                }
                tone={objectionLabel ? "amber" : "blue"}
              />
              <TimelineItem
                icon={<ClipboardDocumentCheckIcon className="h-4 w-4" />}
                label="طلبات العميل"
                value={
                  requestedActionLabels.length > 0 ? (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {requestedActionLabels.map((action) => (
                          <StatusBadge key={action} label={action} tone="blue" />
                        ))}
                      </div>
                      <DetailList details={enriched.actionDetails} />
                    </div>
                  ) : (
                    "--"
                  )
                }
                tone="blue"
              />
              <TimelineItem
                icon={<ArrowRightIcon className="h-4 w-4" />}
                label="الإجراء التالي"
                value={
                  <div>
                    <span>{nextActionLabel}</span>
                    <DetailList details={enriched.nextActionDetails} />
                  </div>
                }
                tone={call.callback_at ? "amber" : "green"}
              />
            </ol>
          </AdminSection>

        </div>
      </div>
    </AdminPageFrame>
  );
}
