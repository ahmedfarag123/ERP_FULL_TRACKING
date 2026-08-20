import type { StatusBadgeTone } from "../components/ui/StatusBadge";
import type { SelectedCustomerProfile } from "./customerProfileSelection";
import { supabase } from "./supabase";
import { queuePendingWrite } from "./offlineCache";

type JsonRecord = Record<string, unknown>;

export interface ActivityFieldDefinition {
  key: string;
  label: string;
  type: "text" | "date" | "datetime-local" | "textarea" | "number";
  placeholder?: string;
}

export interface ActivityOption {
  value: string;
  label: string;
  fields?: ActivityFieldDefinition[];
}

export interface CallActivitySource {
  call_status?: string | null;
  contact_status?: string | null;
  call_reason?: string | null;
  customer_disposition?: string | null;
  customer_response?: string | null;
  customer_objection?: string | null;
  requested_actions?: string[] | null;
  next_action?: string | null;
  call_notes?: string | null;
  callback_at?: string | null;
  raw_form_payload?: unknown;
}

export interface VisitActivitySource {
  visit_result?: string | null;
  visit_mode?: string | null;
  note?: string | null;
  started_at?: string | null;
  checked_in_at?: string | null;
  completed_at?: string | null;
  raw_payload?: unknown;
  raw_form_payload?: unknown;
}

/* ========================================================================
 * CALL-RELATED ENUMS — new taxonomy (each enum answers ONE question)
 * ==================================================================== */

/* 1. CALL CONNECTIVITY STATUS — pure telephony fact */
export const CALL_CONNECTIVITY_STATUS_OPTIONS: ActivityOption[] = [
  { value: "connected", label: "تم التواصل" },
  { value: "no_answer", label: "لا يوجد رد" },
  { value: "busy", label: "مشغول" },
  { value: "voicemail", label: "رسالة صوتية" },
  { value: "dropped", label: "انقطع الاتصال" },
];

/* 2. CONTACT STATUS — data hygiene on the number itself */
export const CONTACT_STATUS_OPTIONS: ActivityOption[] = [
  { value: "valid", label: "رقم صحيح" },
  {
    value: "wrong_number_personal",
    label: "رقم شخصي - ليس رقم النشاط",
    fields: [{ key: "newContactNumber", label: "الرقم الصحيح إن وجد", type: "text" }],
  },
  { value: "company_closed", label: "النشاط مغلق" },
  {
    value: "redirected_to_decision_maker",
    label: "تم التحويل لمسؤول المشتريات",
    fields: [
      { key: "decisionMakerName", label: "اسم مسؤول المشتريات", type: "text" },
      { key: "decisionMakerNumber", label: "رقم مسؤول المشتريات", type: "text" },
    ],
  },
  { value: "unreachable_permanently", label: "لا يمكن الوصول إليه نهائياً" },
];

/* 3. CALL REASON — why THIS call happened (ordered by real-world frequency) */
export const CALL_REASON_OPTIONS: ActivityOption[] = [
  {
    value: "new_lead_social_page",
    label: "عميل محتمل جديد - عبر صفحة سوشيال ميديا",
    fields: [{ key: "sourcePageName", label: "اسم الصفحة", type: "text" }],
  },
  { value: "offer_communication", label: "إبلاغ بعرض حالي (فيرن / كيري / GSF...)" },
  { value: "order_taking", label: "أخذ طلب هاتفياً" },
  { value: "follow_up_dormant", label: "متابعة عميل متوقف عن الطلب" },
  { value: "account_handover_intro", label: "تعريف بنفسي - استلام الحساب من موظف آخر" },
  { value: "payment_collection_follow_up", label: "متابعة تحصيل / مديونية" },
  { value: "follow_up_order", label: "متابعة طلب" },
  { value: "follow_up_quotation", label: "متابعة عرض سعر" },
  { value: "order_confirmation", label: "تأكيد طلب" },
  { value: "customer_verification", label: "تأكيد بيانات العميل" },
  { value: "product_inquiry", label: "استفسار عن منتج" },
  { value: "complaint_handling", label: "متابعة شكوى" },
  { value: "feedback_survey", label: "استطلاع رأي" },
  { value: "new_lead_referral", label: "عميل محتمل جديد - ترشيح" },
  { value: "other", label: "أخرى" },
];

/* 4. CUSTOMER DISPOSITION — sentiment only, single-select */
export const CUSTOMER_DISPOSITION_OPTIONS: ActivityOption[] = [
  { value: "already_active_customer", label: "شغال معانا بالفعل" },
  { value: "order_confirmed", label: "تم تأكيد الطلب" },
  { value: "interested_ready_to_order", label: "مهتم وجاهز للطلب" },
  { value: "will_order_when_needed", label: "هيطلب من الأبليكيشن وقت الحاجة" },
  { value: "app_installed_not_ordered", label: "نزّل الأبليكيشن ولسه ما طلبش" },
  { value: "interested_needs_info", label: "مهتم لكن يحتاج معلومات" },
  { value: "neutral_undecided", label: "محايد / غير محسوم" },
  { value: "not_interested", label: "غير مهتم" },
  { value: "rejected_offer", label: "رفض العرض" },
  { value: "rejected_platform", label: "رفض المنصة" },
  { value: "no_clear_answer", label: "لا توجد إجابة واضحة" },
];

/* 5. CUSTOMER OBJECTION — nullable; only populate when disposition is negative/hesitant */
export const CUSTOMER_OBJECTION_OPTIONS: ActivityOption[] = [
  {
    value: "price_too_high",
    label: "السعر مرتفع",
    fields: [
      { key: "affectedProducts", label: "المنتجات المتأثرة", type: "text" },
      { key: "ourPrice", label: "سعرنا", type: "number" },
    ],
  },
  {
    value: "products_not_available",
    label: "المنتجات المطلوبة غير متاحة",
    fields: [
      { key: "requestedBrand", label: "العلامة أو المورد المطلوب", type: "text" },
      { key: "requestedProducts", label: "المنتجات المطلوبة", type: "textarea" },
    ],
  },
  { value: "prefers_competitor", label: "يفضل مورد آخر" },
  { value: "invoicing_issue", label: "مشكلة في الفاتورة الضريبية" },
  { value: "delivery_area_not_covered", label: "المنطقة خارج نطاق التوصيل" },
  { value: "no_current_need", label: "لا يوجد احتياج حالياً" },
  { value: "bad_platform_experience", label: "تجربة سيئة سابقة مع المنصة" },
];

/* 6. REQUESTED ACTIONS — what the customer explicitly asked for (MULTI-SELECT) */
export const REQUESTED_ACTION_OPTIONS: ActivityOption[] = [
  {
    value: "visit",
    label: "زيارة",
    fields: [
      { key: "visitDate", label: "وقت الزيارة المقترح", type: "datetime-local" },
      { key: "visitReason", label: "سبب الزيارة", type: "text" },
    ],
  },
  {
    value: "callback",
    label: "اتصال لاحق",
    fields: [
      { key: "callbackDate", label: "وقت الاتصال اللاحق", type: "datetime-local" },
      { key: "callbackReason", label: "سبب الاتصال اللاحق", type: "text" },
    ],
  },
  { value: "price_list", label: "قائمة أسعار" },
  {
    value: "quotation",
    label: "عرض سعر",
    fields: [{ key: "quotationDetails", label: "تفاصيل عرض السعر", type: "textarea" }],
  },
  {
    value: "order_outside_platform",
    label: "طلب خارج المنصة",
    fields: [{ key: "orderDetails", label: "تفاصيل الطلب", type: "textarea" }],
  },
  {
    value: "order_modification",
    label: "تعديل / استبدال في طلب",
    fields: [
      { key: "originalProduct", label: "المنتج الأصلي", type: "text" },
      { key: "replacementProduct", label: "المنتج البديل", type: "text" },
    ],
  },
];

/* 7. NEXT ACTION — our committed follow-up */
export const NEXT_ACTION_OPTIONS: ActivityOption[] = [
  { value: "schedule_follow_up_call", label: "جدولة اتصال متابعة" },
  { value: "schedule_visit", label: "جدولة زيارة" },
  { value: "send_information", label: "إرسال معلومات" },
  { value: "send_price_list", label: "إرسال قائمة أسعار" },
  { value: "send_quotation", label: "إرسال عرض سعر" },
  { value: "create_order", label: "إنشاء طلب" },
  {
    value: "escalate_internally",
    label: "تصعيد داخلي",
    fields: [{ key: "escalationReason", label: "سبب التصعيد", type: "text" }],
  },
  { value: "route_service_issue", label: "تحويل لخدمة العملاء / تذكرة دعم" },
  { value: "update_contact_info", label: "تحديث بيانات التواصل" },
  { value: "no_further_action", label: "لا إجراء إضافي" },
];

/* 8. SERVICE ISSUE TYPE — support ticket signal surfaced mid-sales-call */
export const SERVICE_ISSUE_TYPE_OPTIONS: ActivityOption[] = [
  { value: "delivery_delay", label: "تأخير في التوصيل" },
  { value: "invoice_delay", label: "تأخير في الفاتورة الضريبية" },
  { value: "quality_return", label: "إرجاع بسبب جودة المنتج" },
  { value: "wrong_item_substitution", label: "صنف خاطئ / يحتاج استبدال" },
  { value: "other_service_issue", label: "مشكلة خدمة أخرى" },
];

/* ========================================================================
 * VISIT-RELATED ENUMS (unchanged)
 * ==================================================================== */

export const VISIT_STATUS_OPTIONS: ActivityOption[] = [
  { value: "planned", label: "مخططة" },
  { value: "done", label: "تمت" },
  { value: "missed", label: "فائتة" },
  { value: "cancelled", label: "ملغاة" },
];

export const VISIT_TYPE_OPTIONS: ActivityOption[] = [
  { value: "follow_up", label: "متابعة" },
  { value: "intro_visit", label: "زيارة تعريفية" },
  { value: "demo", label: "عرض توضيحي" },
  { value: "commercial_review", label: "مراجعة تجارية" },
  { value: "collection", label: "تحصيل" },
  { value: "support", label: "دعم" },
];

export const VISIT_OUTCOME_OPTIONS: ActivityOption[] = [
  { value: "visit_scheduled", label: "تمت جدولة الزيارة" },
  { value: "meeting_completed", label: "اكتمل الاجتماع" },
  { value: "quotation_requested", label: "طلب عرض سعر" },
  { value: "order_expected", label: "طلب متوقع" },
  { value: "follow_up_required", label: "متابعة مطلوبة" },
  { value: "customer_unavailable", label: "العميل غير متاح" },
  { value: "cancelled_by_customer", label: "ألغيت من العميل" },
];

export const VISIT_NEXT_ACTION_OPTIONS: ActivityOption[] = [
  { value: "confirm_visit", label: "تأكيد الزيارة" },
  { value: "share_materials", label: "مشاركة مواد" },
  { value: "prepare_quotation", label: "تجهيز عرض سعر" },
  { value: "revisit_customer", label: "إعادة زيارة العميل" },
  { value: "log_order", label: "تسجيل طلب" },
  { value: "close_loop", label: "إغلاق المتابعة" },
];

/* ========================================================================
 * HELPERS
 * ==================================================================== */

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function getText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toSentenceCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function formatOptionLabel(options: ActivityOption[], value: string | null | undefined) {
  const normalized = getText(value);
  if (!normalized) return null;
  const match = options.find((option) => option.value === normalized);
  return match?.label ?? toSentenceCase(normalized);
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatResponseDetails(details: Record<string, string>) {
  return Object.entries(details)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${toSentenceCase(key)}: ${value.trim()}`);
}

export function getOptionFields(options: ActivityOption[], value: string) {
  return options.find((option) => option.value === value)?.fields ?? [];
}

export function toDateTimeLocalValue(value?: string | Date | null) {
  const parsed = value instanceof Date ? value : value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const offset = safeDate.getTimezoneOffset();
  const localized = new Date(safeDate.getTime() - offset * 60_000);
  return localized.toISOString().slice(0, 16);
}

export function parseDurationMinutesToSeconds(value: string) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.round(minutes * 60);
}

export function formatDurationMmSs(seconds: number | null | undefined) {
  if (seconds == null || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/* ========================================================================
 * CALL DISPLAY FUNCTIONS (updated for new taxonomy)
 * ==================================================================== */

export function resolveCallDirection(call: CallActivitySource) {
  const payload = asRecord(call.raw_form_payload);
  const payloadDirection = getText(payload?.direction)?.toLowerCase();

  if (payloadDirection === "inbound") {
    return { label: "واردة", tone: "blue" as const };
  }

  if (payloadDirection === "outbound") {
    return { label: "صادرة", tone: "purple" as const };
  }

  const source = [
    call.call_status,
    call.call_reason,
    call.customer_disposition ?? call.customer_response,
    call.next_action,
    call.call_notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (source.includes("inbound") || source.includes("incoming")) {
    return { label: "واردة", tone: "blue" as const };
  }

  return { label: "صادرة", tone: "purple" as const };
}

export function buildCallSummaryLines(call: CallActivitySource) {
  const payload = asRecord(call.raw_form_payload);
  const actionDetails = asRecord(payload?.requested_action_details) ?? {};

  // New fields live in raw_form_payload; fall back to old top-level columns for legacy data
  const disposition = getText(call.customer_disposition) ?? getText(payload?.customer_disposition);
  const objection = getText(call.customer_objection) ?? getText(payload?.customer_objection);
  const requestedActions = (call.requested_actions ?? (payload?.requested_actions as string[] | undefined)) ?? [];

  const lines = [
    formatOptionLabel(CALL_REASON_OPTIONS, call.call_reason)
      ? `السبب: ${formatOptionLabel(CALL_REASON_OPTIONS, call.call_reason)}`
      : null,
    formatOptionLabel(CUSTOMER_DISPOSITION_OPTIONS, disposition)
      ? `الشعور: ${formatOptionLabel(CUSTOMER_DISPOSITION_OPTIONS, disposition)}`
      : null,
    formatOptionLabel(CUSTOMER_OBJECTION_OPTIONS, objection)
      ? `اعتراض: ${formatOptionLabel(CUSTOMER_OBJECTION_OPTIONS, objection)}`
      : null,
    requestedActions.length > 0
      ? `طلبات العميل: ${requestedActions.map((a) => formatOptionLabel(REQUESTED_ACTION_OPTIONS, a) ?? a).join(" / ")}`
      : null,
    // Legacy: fall back to old customer_response for old calls that have no disposition
    !disposition && call.customer_response
      ? `رد العميل: ${formatOptionLabel(CUSTOMER_DISPOSITION_OPTIONS, call.customer_response) ?? call.customer_response}`
      : null,
    formatOptionLabel(NEXT_ACTION_OPTIONS, call.next_action)
      ? `التالي: ${formatOptionLabel(NEXT_ACTION_OPTIONS, call.next_action)}`
      : null,
    formatDateTime(call.callback_at) ? `معاودة الاتصال: ${formatDateTime(call.callback_at)}` : null,
    ...formatResponseDetails(
      Object.entries(actionDetails).reduce<Record<string, string>>((accumulator, [key, value]) => {
        const text = getText(value);
        if (text) accumulator[key] = text;
        return accumulator;
      }, {}),
    ),
    getText(call.call_notes) ? `ملاحظات: ${getText(call.call_notes)}` : null,
  ];

  return lines.filter((line): line is string => Boolean(line));
}

export function buildCallInteractionDescription(input: {
  callReason: string;
  disposition: string;
  objection?: string | null;
  requestedActions: string[];
  nextAction: string;
  notes: string;
}) {
  return [
    formatOptionLabel(CALL_REASON_OPTIONS, input.callReason),
    formatOptionLabel(CUSTOMER_DISPOSITION_OPTIONS, input.disposition),
    input.objection ? formatOptionLabel(CUSTOMER_OBJECTION_OPTIONS, input.objection) : null,
    input.requestedActions.length > 0
      ? input.requestedActions.map((value) => formatOptionLabel(REQUESTED_ACTION_OPTIONS, value)).join(" / ")
      : null,
    formatOptionLabel(NEXT_ACTION_OPTIONS, input.nextAction),
    getText(input.notes),
  ]
    .filter(Boolean)
    .join(" - ");
}

/* ========================================================================
 * VISIT DISPLAY FUNCTIONS (unchanged)
 * ==================================================================== */

export type VisitStatusKey = "planned" | "done" | "missed" | "cancelled";

export function resolveVisitStatus(visit: VisitActivitySource): {
  key: VisitStatusKey;
  label: string;
  tone: StatusBadgeTone;
} {
  const payload = asRecord(visit.raw_form_payload);
  const explicitStatus = getText(payload?.status)?.toLowerCase();
  const source = `${visit.visit_result ?? ""} ${visit.note ?? ""}`.toLowerCase();
  const checkedInDate = normalizeDate(visit.checked_in_at);

  if (explicitStatus === "cancelled" || source.includes("cancel")) {
    return { key: "cancelled", label: "ملغاة", tone: "gray" };
  }
  if (explicitStatus === "missed" || source.includes("miss") || source.includes("no show")) {
    return { key: "missed", label: "فائتة", tone: "red" };
  }
  if (explicitStatus === "planned" || source.includes("scheduled") || source.includes("planned")) {
    return { key: "planned", label: "مخططة", tone: "blue" };
  }
  if (explicitStatus === "done" || visit.completed_at) {
    return { key: "done", label: "تمت", tone: "green" };
  }
  if (checkedInDate && new Date(checkedInDate).getTime() > Date.now() + 60_000) {
    return { key: "planned", label: "مخططة", tone: "blue" };
  }
  if (visit.checked_in_at) {
    return { key: "done", label: "تمت", tone: "green" };
  }
  return { key: "planned", label: "مخططة", tone: "blue" };
}

export function resolveVisitType(visit: VisitActivitySource) {
  const payload = asRecord(visit.raw_form_payload);
  const payloadType = getText(payload?.visit_type);
  const note = getText(payload?.visit_reason) ?? visit.note ?? "";
  const source = `${payloadType ?? ""} ${note} ${visit.visit_result ?? ""}`.toLowerCase();

  if (payloadType) {
    const label = formatOptionLabel(VISIT_TYPE_OPTIONS, payloadType) ?? toSentenceCase(payloadType);
    const tone = payloadType === "follow_up" ? "purple" : "blue";
    return { label, tone: tone as StatusBadgeTone };
  }

  if (source.includes("follow")) {
    return { label: "متابعة", tone: "purple" as const };
  }
  if ((visit.visit_mode ?? "").toLowerCase() === "manual") {
    return { label: "غير مجدولة", tone: "gray" as const };
  }
  return { label: "مجدولة", tone: "blue" as const };
}

export function buildVisitSummaryLines(visit: VisitActivitySource) {
  const payload = asRecord(visit.raw_form_payload);
  const lines = [
    formatOptionLabel(VISIT_TYPE_OPTIONS, getText(payload?.visit_type))
      ? `النوع: ${formatOptionLabel(VISIT_TYPE_OPTIONS, getText(payload?.visit_type))}`
      : null,
    getText(payload?.visit_reason) ? `الغرض: ${getText(payload?.visit_reason)}` : null,
    formatOptionLabel(VISIT_OUTCOME_OPTIONS, getText(payload?.visit_outcome))
      ? `النتيجة: ${formatOptionLabel(VISIT_OUTCOME_OPTIONS, getText(payload?.visit_outcome))}`
      : null,
    formatOptionLabel(VISIT_NEXT_ACTION_OPTIONS, getText(payload?.next_action))
      ? `التالي: ${formatOptionLabel(VISIT_NEXT_ACTION_OPTIONS, getText(payload?.next_action))}`
      : null,
    getText(payload?.location_details) ? `الموقع: ${getText(payload?.location_details)}` : null,
    getText(visit.note) ? `ملاحظات: ${getText(visit.note)}` : null,
  ];

  return lines.filter((line): line is string => Boolean(line));
}

export function buildVisitInteractionDescription(input: {
  visitReason: string;
  visitOutcome: string;
  nextAction: string;
  notes: string;
}) {
  return [
    getText(input.visitReason),
    formatOptionLabel(VISIT_OUTCOME_OPTIONS, input.visitOutcome),
    formatOptionLabel(VISIT_NEXT_ACTION_OPTIONS, input.nextAction),
    getText(input.notes),
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ========================================================================
 * SAVE FUNCTIONS
 * ==================================================================== */

export async function saveCustomerCallActivity(input: {
  customerId: string;
  userId: string;
  direction: "inbound" | "outbound";
  occurredAt: string;
  durationSeconds: number | null;

  connectivityStatus: string;
  contactStatus: string;
  contactStatusDetails?: Record<string, string>;

  callReason: string;
  callReasonDetails?: Record<string, string>;

  disposition: string;
  objection?: string | null;
  objectionDetails?: Record<string, string>;

  requestedActions: string[];
  requestedActionDetails?: Record<string, Record<string, string>>;

  nextAction: string;
  nextActionDetails?: Record<string, string>;
  callbackAt?: string | null;

  serviceIssueFlagged?: boolean;
  serviceIssueType?: string | null;
  serviceIssueDetails?: string | null;

  notes: string;
  requiresUrgentAction: boolean;
  selectedCustomerProfile?: SelectedCustomerProfile | null;
  selectedCustomerProfiles?: SelectedCustomerProfile[];
}) {
  const completedAt = normalizeDate(input.occurredAt);
  const startedAt =
    completedAt && input.durationSeconds
      ? new Date(new Date(completedAt).getTime() - input.durationSeconds * 1000).toISOString()
      : completedAt;

  const rawFormPayload: JsonRecord = {
    direction: input.direction,
    contact_status_details: input.contactStatusDetails ?? {},
    call_reason_details: input.callReasonDetails ?? {},
    objection_details: input.objectionDetails ?? {},
    requested_action_details: input.requestedActionDetails ?? {},
    next_action_details: input.nextActionDetails ?? {},
    selected_customer_profile: input.selectedCustomerProfile ?? null,
    selected_customer_profiles:
      input.selectedCustomerProfiles ?? (input.selectedCustomerProfile ? [input.selectedCustomerProfile] : []),
    occurred_at: completedAt,
  };

  const insertPayload = {
    customer_id: input.customerId,
    user_id: input.userId,
    started_at: startedAt,
    completed_at: completedAt,
    call_duration_seconds: input.durationSeconds,

    call_status: input.connectivityStatus,
    contact_status: input.contactStatus,
    call_reason: input.callReason,
    customer_disposition: input.disposition,
    customer_objection: input.objection ?? null,
    requested_actions: input.requestedActions,
    next_action: input.nextAction,
    callback_at: normalizeDate(input.callbackAt ?? null),

    call_notes: getText(input.notes),
    requires_urgent_action: input.requiresUrgentAction,

    service_issue_flagged: input.serviceIssueFlagged ?? false,
    service_issue_type: input.serviceIssueFlagged ? input.serviceIssueType ?? null : null,

    source: "manual",
    raw_payload: rawFormPayload,
    raw_form_payload: rawFormPayload,
  };

  const interactionPayload = {
    customer_id: input.customerId,
    interaction_type: "call",
    title: "Phone call",
    description: buildCallInteractionDescription(input),
    actor_user_id: input.userId,
    metadata: {
      call_id: null as string | null,
      direction: input.direction,
      connectivity_status: input.connectivityStatus,
      contact_status: input.contactStatus,
      call_reason: input.callReason,
      customer_disposition: input.disposition,
      customer_objection: input.objection ?? null,
      requested_actions: input.requestedActions,
      next_action: input.nextAction,
      callback_at: normalizeDate(input.callbackAt ?? null),
      requires_urgent_action: input.requiresUrgentAction,
      service_issue_flagged: input.serviceIssueFlagged ?? false,
      service_issue_type: input.serviceIssueType ?? null,
      selected_customer_profile: input.selectedCustomerProfile ?? null,
      selected_customer_profiles:
        input.selectedCustomerProfiles ?? (input.selectedCustomerProfile ? [input.selectedCustomerProfile] : []),
    },
  };

  if (!navigator.onLine) {
    const callsWrite = await queuePendingWrite({
      table: "calls",
      operation: "insert",
      payload: insertPayload,
    });
    await queuePendingWrite({
      table: "customer_interactions",
      operation: "insert",
      payload: interactionPayload,
    });
    return { id: callsWrite.id, ...insertPayload, created_at: new Date().toISOString() } as Record<string, unknown>;
  }

  const { data, error } = await supabase.from("calls").insert(insertPayload).select("*").single();
  if (error) throw error;

  const { error: interactionError } = await supabase.from("customer_interactions").insert({
    ...interactionPayload,
    metadata: { ...interactionPayload.metadata, call_id: data.id },
  });

  if (interactionError) {
    console.warn("Failed to write customer interaction for call activity.", interactionError);
  }

  return data;
}

export async function saveCustomerVisitActivity(input: {
  customerId: string;
  userId: string;
  scheduledAt: string;
  status: VisitStatusKey;
  visitType: string;
  visitReason: string;
  visitOutcome: string;
  nextAction: string;
  locationDetails: string;
  notes: string;
  selectedCustomerProfile?: SelectedCustomerProfile | null;
}) {
  const scheduledIso = normalizeDate(input.scheduledAt) ?? new Date().toISOString();
  const rawFormPayload = {
    status: input.status,
    visit_type: input.visitType,
    visit_reason: input.visitReason,
    visit_outcome: input.visitOutcome,
    next_action: input.nextAction,
    location_details: input.locationDetails,
    selected_customer_profile: input.selectedCustomerProfile ?? null,
  };

  const visitResult =
    input.status === "planned"
      ? "FOLLOW_UP_SCHEDULED"
      : input.visitOutcome || input.status.toUpperCase();

  const insertPayload = {
    customer_id: input.customerId,
    user_id: input.userId,
    visit_result: visitResult,
    visit_mode: "manual",
    started_at: scheduledIso,
    checked_in_at: scheduledIso,
    completed_at: input.status === "done" ? scheduledIso : null,
    note: getText(input.notes) ?? getText(input.visitReason),
    source: "manual",
    raw_payload: rawFormPayload,
    raw_form_payload: rawFormPayload,
  };

  const interactionPayload = {
    customer_id: input.customerId,
    interaction_type: "visit",
    title: input.status === "planned" ? "Visit scheduled" : "Visit activity",
    description: buildVisitInteractionDescription(input),
    actor_user_id: input.userId,
    metadata: {
      visit_status: input.status,
      visit_type: input.visitType,
      visit_outcome: input.visitOutcome,
      next_action: input.nextAction,
      location_details: input.locationDetails,
      scheduled_at: scheduledIso,
      selected_customer_profile: input.selectedCustomerProfile ?? null,
    },
  };

  if (!navigator.onLine) {
    const visitsWrite = await queuePendingWrite({
      table: "visits",
      operation: "insert",
      payload: insertPayload,
    });
    await queuePendingWrite({
      table: "customer_interactions",
      operation: "insert",
      payload: interactionPayload,
    });
    return { id: visitsWrite.id, ...insertPayload, created_at: new Date().toISOString() } as Record<string, unknown>;
  }

  const { data, error } = await supabase.from("visits").insert(insertPayload).select("*").single();
  if (error) throw error;

  if (input.status === "done") {
    const { error: customerUpdateError } = await supabase
      .from("customers")
      .update({ last_visit_at: scheduledIso })
      .eq("id", input.customerId);

    if (customerUpdateError) {
      console.warn("Failed to update last_visit_at after visit activity.", customerUpdateError);
    }
  }

  const { error: interactionError } = await supabase.from("customer_interactions").insert({
    ...interactionPayload,
    visit_id: data.id,
  });

  if (interactionError) {
    console.warn("Failed to write customer interaction for visit activity.", interactionError);
  }

  return data;
}
