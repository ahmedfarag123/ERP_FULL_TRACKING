type JsonRecord = Record<string, unknown>;

/* ========================================================================
 * CORE PARSERS — handle both object and JSON string from Supabase
 * ==================================================================== */

function asRecord(value: unknown): JsonRecord | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as JsonRecord;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as JsonRecord;
    } catch { /* not JSON */ }
  }
  return null;
}

function getText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function normalizeEnum(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isRawEnum(value: string): boolean {
  const trimmed = value.trim();
  // Pure uppercase word: MET_EMPLOYEE_ONLY, SEND_QUOTATION_NOW, etc.
  if (/^[A-Z][A-Z0-9_]+$/.test(trimmed)) return true;
  // Prefix + value: "Decision maker: MET_EMPLOYEE_ONLY", "Interest: HIGH"
  const colonMatch = trimmed.match(/^(.+?):\s*([A-Z][A-Z0-9_]+)$/);
  if (colonMatch && ENUM_MAP[normalizeEnum(colonMatch[2])]) return true;
  return false;
}

/* ========================================================================
 * MASTER ENUM MAP — every possible raw value → Arabic human text
 * ==================================================================== */

const ENUM_MAP: Record<string, string> = {
  // Decision maker
  met_decision_maker: "تم التحدث مع صاحب القرار مباشرة",
  met_decision: "تم التحدث مع صاحب القرار مباشرة",
  met_owner: "تم التحدث مع صاحب القرار مباشرة",
  decision_maker_available: "صاحب القرار متاح",
  met_employee_only: "لم يتم العثور على صاحب القرار، تم التحدث مع موظف",
  met_employee: "لم يتم العثور على صاحب القرار، تم التحدث مع موظف",
  employee_cooperative: "الموظف كان متعاوناً",
  no_contact: "لم يتم التواصل مع أحد",
  no_answer: "لم يتم التواصل مع أحد",
  met_manager: "تم التحدث مع المدير",
  decision_maker_unavailable: "صاحب القرار غير متاح",
  decision_maker_absent: "صاحب القرار غير متاح",
  follow_up_decision_maker: "يجب متابعة صاحب القرار لاحقاً",

  // Interest level
  high_interest: "المهتمون بالمنتج بمستوى عالي",
  very_high_interest: "المهتمون بالمنتج بمستوى عالي جداً",
  medium_interest: "المهتمون بالمنتج بمستوى متوسط",
  low_interest: "المهتمون بالمنتج بمستوى منخفض",
  no_interest: "لا يوجد اهتمام بالمنتج",
  medium_considering: "يُراجع العميل العرض",
  considering: "يُراجع العميل العرض",
  high: "اهتمام عالي",
  high_immediate: "اهتمام عالي وفوري",
  very_high: "اهتمام عالي جداً",
  medium: "اهتمام متوسط",
  low: "اهتمام منخفض",
  moderate: "اهتمام متوسط",
  cooperative: "الموظف متعاون",
  interested: "العميل مهتم",
  not_interested: "العميل غير مهتم",
  "Decision maker: MET_EMPLOYEE_ONLY": "تم التحدث مع موظف فقط، لم يتم العثور على صاحب القرار",
  // Next action
  send_quotation: "يجب إرسال عرض السعر",
  send_quotation_now: "يجب إرسال عرض السعر فوراً",
  send_brochure: "يجب إرسال كتيب المنتجات",
  send_catalog: "يجب إرسال كتالوج المنتجات",
  send_price_list: "يجب إرسال قائمة الأسعار",
  send_information: "يجب إرسال معلومات",
  send_samples: "يجب إرسال عينات",
  revisit_customer: "يجب إعادة زيارة العميل",
  schedule_follow_up_call: "يجب جدولة اتصال متابعة",
  follow_up_next_week: "يجب المتابعة الأسبوع القادم",
  follow_up_tomorrow: "يجب المتابعة غداً",
  schedule_visit: "يجب جدولة زيارة",
  close_loop: "تم إغلاق المتابعة",
  create_order: "يجب إنشاء طلب",
  create_order_now: "يجب إنشاء طلب فوراً",
  follow_up: "يجب المتابعة",
  follow_up_24h: "يجب المتابعة خلال 24 ساعة",
  call_back: "يجب الاتصال لاحقاً",
  call_back_later: "يجب الاتصال لاحقاً",
  call_back_tomorrow: "يجب الاتصال غداً",
  call_back_next_week: "يجب الاتصال الأسبوع القادم",
  log_order: "يجب تسجيل طلب",
  prepare_quotation: "يجب تجهيز عرض السعر",
  escalate_internally: "يجب التصعيد داخلياً",
  route_service_issue: "يجب تحويل لخدمة العملاء",
  update_contact_info: "يجب تحديث بيانات التواصل",
  no_further_action: "لا إجراء إضافي",
  confirm_visit: "يجب تأكيد الزيارة",
  share_materials: "يجب مشاركة مواد",
  renegotiate: "يجب إعادة التفاوض",

  // Visit outcome
  quotation_requested: "العميل طلب عرض أسعار",
  order_expected: "العميل ينتظر تأكيد الطلب",
  meeting_completed: "تم اللقاء مع العميل بنجاح",
  customer_unavailable: "لم يتم العثور على صاحب القرار",
  cancelled_by_customer: "العميل طلب إلغاء الزيارة",
  follow_up_required: "يجب متابعة العميل",
  visit_scheduled: "تم تأكيد الزيارة القادمة",
  no_sale: "لم يتم البيع",
  price_objection: "العميل اعترض على السعر",
  product_not_available: "المنتج غير متاح",

  // Visit result
  order: "تم تسجيل طلب",
  quotation: "تم طلب عرض السعر",
  follow_up_scheduled: "تم جدولة المتابعة",
  success: "زيارة ناجحة",
  partial_success: "زيارة ناجحة جزئياً",

  // Visit type (mapped to conclusion text)
  intro_visit: "زيارة تعريفية",
  demo: "عرض توضيحي",
  commercial_review: "مراجعة تجارية",
  collection: "تحصيل",
  support: "دعم",

  // Fraud status
  normal: "عادي",
  suspicious: "مشبوه",
  fraud: "احتيال",
  none: "بدون",
};

/* ========================================================================
 * SANITIZE — translate any raw enum, pass through human text
 * ==================================================================== */

export function sanitizeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isRawEnum(trimmed)) {
    // Extract the enum value if it has a prefix like "Decision maker: MET_X"
    const colonMatch = trimmed.match(/^(.+?):\s*([A-Z][A-Z0-9_]+)$/);
    const enumVal = colonMatch ? colonMatch[2] : trimmed;
    const normalized = normalizeEnum(enumVal);
    return ENUM_MAP[normalized] ?? trimmed;
  }

  return trimmed;
}

/* ========================================================================
 * NOTE PARSING — separate human text from raw appended data
 * ==================================================================== */

function parseNote(note: string): { humanText: string; rawParts: string[] } {
  if (!note) return { humanText: "", rawParts: [] };

  const pipeIndex = note.indexOf("|");
  if (pipeIndex === -1) {
    // No pipes — check if the whole thing is a raw enum
    if (isRawEnum(note)) {
      const normalized = normalizeEnum(note.replace(/^[^:]+:\s*/, ""));
      return { humanText: "", rawParts: [ENUM_MAP[normalized] ?? note] };
    }
    // Try extracting raw enum from text: "Decision maker: MET_X. Some text"
    const enumMatch = note.match(/\b([A-Z][A-Z0-9_]+)\b/);
    if (enumMatch && ENUM_MAP[normalizeEnum(enumMatch[1])]) {
      const humanPart = note.replace(enumMatch[0], "").replace(/[.:]\s*$/, "").trim();
      return {
        humanText: humanPart,
        rawParts: [ENUM_MAP[normalizeEnum(enumMatch[1])]],
      };
    }
    return { humanText: note.trim(), rawParts: [] };
  }

  const beforePipe = note.slice(0, pipeIndex).trim();
  const afterPipe = note.slice(pipeIndex);

  const rawSegments = afterPipe
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const translatedRaw: string[] = [];
  for (const segment of rawSegments) {
    const colonIdx = segment.indexOf(":");
    if (colonIdx === -1) {
      // No colon — treat whole segment as enum value
      const norm = normalizeEnum(segment);
      translatedRaw.push(ENUM_MAP[norm] ?? segment);
      continue;
    }
    const value = segment.slice(colonIdx + 1).trim();
    const norm = normalizeEnum(value);
    const translated = ENUM_MAP[norm];
    if (translated) {
      translatedRaw.push(translated);
    } else {
      // Try extracting uppercase enum from the value part
      const enumMatch = value.match(/([A-Z][A-Z0-9_]+)/);
      if (enumMatch) {
        const enumNorm = normalizeEnum(enumMatch[1]);
        const enumTranslated = ENUM_MAP[enumNorm];
        translatedRaw.push(enumTranslated ?? value);
      } else {
        translatedRaw.push(value);
      }
    }
  }

  return { humanText: beforePipe, rawParts: translatedRaw };
}

/* ========================================================================
 * CONCLUSION SENTENCE — one flowing paragraph from all visit data
 * ==================================================================== */

export function buildConclusionSentence(visit: {
  visit_result?: string | null;
  visit_mode?: string | null;
  note?: string | null;
  started_at?: string | null;
  checked_in_at?: string | null;
  completed_at?: string | null;
  raw_form_payload?: unknown;
  raw_payload?: unknown;
  rawFormPayload?: unknown;
  within_geofence?: boolean | null;
}): string {
  const payload = asRecord(visit.raw_form_payload ?? visit.rawFormPayload);
  const parts: string[] = [];

  // 1. Extract human note first (the real rep observation)
  const rawNote = getText(visit.note) ?? "";
  const { humanText, rawParts } = parseNote(rawNote);
  if (humanText) parts.push(humanText);

  // 2. Visit type context
  const visitType = normalizeEnum(getText(payload?.visit_type) ?? "");
  const typeContext: Record<string, string> = {
    follow_up: "تمت زيارة متابعة",
    intro_visit: "تمت التعريف بالمنتجات",
    demo: "تم عرض توضيحي للمنتجات",
    commercial_review: "تمت مراجعة الأداء التجاري",
    collection: "تم تحصيل المديونية",
    support: "تم تقديم الدعم",
  };
  if (typeContext[visitType]) parts.push(typeContext[visitType]);

  // 3. Decision maker status
  const dmRaw = getText(payload?.decision_maker_status) ?? "";
  if (dmRaw) {
    if (isRawEnum(dmRaw)) {
      const norm = normalizeEnum(dmRaw);
      parts.push(ENUM_MAP[norm] ?? dmRaw);
    } else {
      parts.push(dmRaw);
    }
  }

  // 4. Interest level
  const interestRaw = getText(payload?.interest_level) ?? "";
  if (interestRaw) {
    if (isRawEnum(interestRaw)) {
      const norm = normalizeEnum(interestRaw);
      parts.push(ENUM_MAP[norm] ?? interestRaw);
    } else {
      parts.push(interestRaw);
    }
  }

  // 5. Outcome (from payload, not from raw pipe data)
  const outcomeRaw = getText(payload?.visit_outcome) ?? "";
  if (outcomeRaw) {
    const norm = normalizeEnum(outcomeRaw);
    const mapped = ENUM_MAP[norm];
    if (mapped) parts.push(mapped);
  }

  // 6. Next action
  const nextRaw = getText(payload?.next_action) ?? "";
  if (nextRaw) {
    if (isRawEnum(nextRaw)) {
      const norm = normalizeEnum(nextRaw);
      parts.push(ENUM_MAP[norm] ?? nextRaw);
    } else {
      parts.push(nextRaw);
    }
  }

  // 7. Append any remaining raw pipe translations (if they weren't already covered)
  for (const raw of rawParts) {
    if (!parts.includes(raw)) parts.push(raw);
  }

  if (parts.length === 0) return "تمت الزيارة";
  return parts.join(". ") + ".";
}

export function buildConclusionParts(visit: {
  visit_result?: string | null;
  visit_mode?: string | null;
  note?: string | null;
  started_at?: string | null;
  checked_in_at?: string | null;
  completed_at?: string | null;
  raw_form_payload?: unknown;
  raw_payload?: unknown;
  rawFormPayload?: unknown;
  within_geofence?: boolean | null;
}): string[] {
  const payload = asRecord(visit.raw_form_payload ?? visit.rawFormPayload);
  const parts: string[] = [];

  const rawNote = getText(visit.note) ?? "";
  const { humanText, rawParts } = parseNote(rawNote);
  if (humanText) parts.push(humanText);

  const visitType = normalizeEnum(getText(payload?.visit_type) ?? "");
  const typeContext: Record<string, string> = {
    follow_up: "زيارة متابعة",
    intro_visit: "تم التعريف بالمنتجات",
    demo: "تم عرض توضيحي للمنتجات",
    commercial_review: "تمت مراجعة الأداء التجاري",
    collection: "تم تحصيل المديونية",
    support: "تم تقديم الدعم",
  };
  if (typeContext[visitType]) parts.push(typeContext[visitType]);

  const dmRaw = getText(payload?.decision_maker_status) ?? "";
  if (dmRaw) {
    if (isRawEnum(dmRaw)) {
      const norm = normalizeEnum(dmRaw);
      parts.push(ENUM_MAP[norm] ?? dmRaw);
    } else {
      parts.push(dmRaw);
    }
  }

  const interestRaw = getText(payload?.interest_level) ?? "";
  if (interestRaw) {
    if (isRawEnum(interestRaw)) {
      const norm = normalizeEnum(interestRaw);
      parts.push(ENUM_MAP[norm] ?? interestRaw);
    } else {
      parts.push(interestRaw);
    }
  }

  const outcomeRaw = getText(payload?.visit_outcome) ?? "";
  if (outcomeRaw) {
    const norm = normalizeEnum(outcomeRaw);
    const mapped = ENUM_MAP[norm];
    if (mapped) parts.push(mapped);
  }

  const nextRaw = getText(payload?.next_action) ?? "";
  if (nextRaw) {
    if (isRawEnum(nextRaw)) {
      const norm = normalizeEnum(nextRaw);
      parts.push(ENUM_MAP[norm] ?? nextRaw);
    } else {
      parts.push(nextRaw);
    }
  }

  for (const raw of rawParts) {
    if (!parts.includes(raw)) parts.push(raw);
  }

  return parts;
}

/* ========================================================================
 * TRANSLATE RAW NOTE — pipe-delimited → conclusion
 * ==================================================================== */

export function translateRawNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  if (!trimmed) return null;

  const { humanText, rawParts } = parseNote(trimmed);

  if (rawParts.length === 0) {
    // No raw data — return human text as-is
    if (isRawEnum(trimmed)) {
      const norm = normalizeEnum(trimmed);
      return ENUM_MAP[norm] ?? trimmed;
    }
    return trimmed;
  }

  // Combine human text + translated raw parts
  const allParts = [...(humanText ? [humanText] : []), ...rawParts];
  return allParts.join(". ");
}

/* ========================================================================
 * SMART STATUS
 * ==================================================================== */

export interface SmartStatus {
  icon: string;
  label: string;
  color: "green" | "yellow" | "red" | "gray" | "blue";
  description: string;
}

export function getSmartStatus(visit: {
  visit_result?: string | null;
  visit_mode?: string | null;
  note?: string | null;
  completed_at?: string | null;
  checked_in_at?: string | null;
  raw_form_payload?: unknown;
  raw_payload?: unknown;
  rawFormPayload?: unknown;
  within_geofence?: boolean | null;
}): SmartStatus {
  const payload = asRecord(visit.raw_form_payload ?? visit.rawFormPayload);
  const explicitStatus = getText(payload?.status)?.toLowerCase();
  const source = `${visit.visit_result ?? ""} ${visit.note ?? ""}`.toLowerCase();

  if (explicitStatus === "cancelled" || source.includes("cancel")) {
    return { icon: "🚫", label: "تم الإلغاء", color: "gray", description: "تم إلغاء الزيارة" };
  }
  if (explicitStatus === "missed" || source.includes("miss") || source.includes("no show")) {
    return { icon: "❌", label: "زيارة فاشلة", color: "red", description: "لم يتم الاتصال بالعميل" };
  }

  const outcome = normalizeEnum(getText(payload?.visit_outcome) ?? "");
  if (outcome === "quotation_requested") return { icon: "📋", label: "طلب عرض سعر", color: "blue", description: "العميل طلب عرض أسعار" };
  if (outcome === "order_expected") return { icon: "🛒", label: "طلب متوقع", color: "green", description: "العميل ينتظر تأكيد الطلب" };
  if (outcome === "meeting_completed") return { icon: "✅", label: "اجتماع مكتمل", color: "green", description: "تم اللقاء بنجاح" };
  if (outcome === "customer_unavailable" || outcome === "decision_maker_absent") return { icon: "👤", label: "العميل غير متاح", color: "yellow", description: "لم يتم العثور على صاحب القرار" };
  if (outcome === "cancelled_by_customer") return { icon: "🚫", label: "ألغيت من العميل", color: "gray", description: "العميل ألغي الموعد" };
  if (outcome === "follow_up_required") return { icon: "📞", label: "تحتاج متابعة", color: "yellow", description: "يجب متابعة العميل" };
  if (outcome === "no_interest") return { icon: "⚪", label: "لا اهتمام", color: "gray", description: "العميل غير مهتم" };
  if (outcome === "price_objection") return { icon: "💰", label: "اعتراض سعري", color: "yellow", description: "العميل يرى السعر مرتفعاً" };

  if (visit.completed_at) return { icon: "🟢", label: "زيارة منتجة", color: "green", description: "تمت الزيارة بنجاح" };
  if (visit.checked_in_at) return { icon: "🟢", label: "زيارة منتجة", color: "green", description: "تم التحقق من الوصول" };
  return { icon: "📅", label: "مخططة", color: "blue", description: "زيارة مستقبلية" };
}

/* ========================================================================
 * VISIT OUTCOME → human sentence
 * ==================================================================== */

export function translateVisitOutcome(visit: {
  visit_result?: string | null;
  raw_form_payload?: unknown;
  raw_payload?: unknown;
  rawFormPayload?: unknown;
  note?: string | null;
}): string {
  const payload = asRecord(visit.raw_form_payload ?? visit.rawFormPayload);
  const outcome = normalizeEnum(getText(payload?.visit_outcome) ?? "");
  const reason = getText(payload?.visit_reason);

  const mappedOutcome = ENUM_MAP[outcome];
  if (mappedOutcome) {
    if (outcome === "quotation_requested" && reason) {
      return `العميل طلب عرض سعر لـ "${sanitizeValue(reason) ?? reason}"`;
    }
    return mappedOutcome;
  }

  const result = normalizeEnum(visit.visit_result ?? "");
  const mappedResult = ENUM_MAP[result];
  if (mappedResult) return mappedResult;
  if (result.includes("order")) return "تم تسجيل طلب";
  if (result.includes("quotation") || result.includes("quote")) return "تم طلب عرض السعر";

  const rawNote = getText(visit.note);
  if (rawNote) {
    const { humanText, rawParts } = parseNote(rawNote);
    if (humanText) return humanText;
    if (rawParts.length > 0) return rawParts[0];
  }
  return "تمت الزيارة";
}

/* ========================================================================
 * DECISION MAKER → human text
 * ==================================================================== */

export function translateDecisionMakerStatus(rawPayload: unknown): string | null {
  const payload = asRecord(rawPayload);
  if (!payload) return null;

  const dmStatus = getText(payload?.decision_maker_status) ?? getText(payload?.contact_status);
  if (!dmStatus) return null;

  if (isRawEnum(dmStatus)) {
    const normalized = normalizeEnum(dmStatus);
    return ENUM_MAP[normalized] ?? dmStatus;
  }
  return dmStatus;
}

/* ========================================================================
 * INTEREST LEVEL → human text
 * ==================================================================== */

export function translateInterestLevel(rawPayload: unknown): string | null {
  const payload = asRecord(rawPayload);
  if (!payload) return null;

  const interest = getText(payload?.interest_level);
  if (!interest) return null;

  if (isRawEnum(interest)) {
    const normalized = normalizeEnum(interest);
    return ENUM_MAP[normalized] ?? interest;
  }
  return interest;
}

/* ========================================================================
 * NEXT ACTION → human text
 * ==================================================================== */

export function translateNextAction(rawPayload: unknown): string | null {
  const payload = asRecord(rawPayload);
  if (!payload) return null;

  const action = getText(payload?.next_action);
  if (!action) return null;

  if (isRawEnum(action)) {
    const normalized = normalizeEnum(action);
    return ENUM_MAP[normalized] ?? action;
  }
  return action;
}

/* ========================================================================
 * VISIT NARRATIVE
 * ==================================================================== */

export function buildVisitNarrative(visit: {
  visit_result?: string | null;
  visit_mode?: string | null;
  note?: string | null;
  started_at?: string | null;
  checked_in_at?: string | null;
  completed_at?: string | null;
  raw_form_payload?: unknown;
  raw_payload?: unknown;
  rawFormPayload?: unknown;
  within_geofence?: boolean | null;
  customer_distance_meters?: number | null;
}): string {
  return buildConclusionSentence(visit);
}

/* ========================================================================
 * OPPORTUNITY SCORE
 * ==================================================================== */

export interface OpportunityBreakdown {
  score: number;
  label: "عالية" | "متوسطة" | "منخفضة" | "غير محددة";
  color: "green" | "blue" | "yellow" | "red" | "gray";
  reasons: string[];
}

export function calculateOpportunityScore(visit: {
  visit_result?: string | null;
  raw_form_payload?: unknown;
  raw_payload?: unknown;
  rawFormPayload?: unknown;
  within_geofence?: boolean | null;
  completed_at?: string | null;
}): OpportunityBreakdown {
  let score = 0;
  const reasons: string[] = [];
  const payload = asRecord(visit.raw_form_payload ?? visit.rawFormPayload);

  const outcome = normalizeEnum(getText(payload?.visit_outcome) ?? "");
  if (outcome === "quotation_requested") { score += 40; reasons.push("طلب عرض سعر"); }
  if (outcome === "order_expected") { score += 50; reasons.push("طلب متوقع"); }
  if (outcome === "meeting_completed") { score += 25; reasons.push("اجتماع ناجح"); }
  if (outcome === "employee_cooperative") { score += 15; reasons.push("موظف متعاون"); }
  if (outcome === "no_interest") { score -= 10; reasons.push("لا اهتمام"); }
  if (outcome === "price_objection") { score += 5; reasons.push("اعتراض سعري"); }

  const dmStatus = normalizeEnum(getText(payload?.decision_maker_status) ?? getText(payload?.contact_status) ?? "");
  if (dmStatus.includes("met_decision") || dmStatus.includes("met_owner")) {
    score += 20; reasons.push("تم التحدث مع صاحب القرار");
  }

  const interest = normalizeEnum(getText(payload?.interest_level) ?? "");
  if (["high", "very_high", "high_interest", "very_high_interest", "high_immediate"].includes(interest)) {
    score += 15; reasons.push("اهتمام عالي");
  } else if (["medium", "moderate", "medium_interest", "medium_considering"].includes(interest)) {
    score += 10; reasons.push("اهتمام متوسط");
  } else if (["cooperative", "employee_cooperative"].includes(interest)) {
    score += 8; reasons.push("موظف متعاون");
  }

  if (visit.within_geofence === true) { score += 5; reasons.push("ضمن نطاق الموقع"); }
  if (visit.completed_at) { score += 10; reasons.push("تمت الزيارة"); }

  const finalScore = Math.max(0, Math.min(score, 100));
  let label: OpportunityBreakdown["label"] = "غير محددة";
  let color: OpportunityBreakdown["color"] = "gray";
  if (finalScore >= 60) { label = "عالية"; color = "green"; }
  else if (finalScore >= 35) { label = "متوسطة"; color = "blue"; }
  else if (finalScore > 0) { label = "منخفضة"; color = "yellow"; }

  return { score: finalScore, label, color, reasons };
}

/* ========================================================================
 * PRIORITY
 * ==================================================================== */

export function resolveVisitPriority(visit: {
  visit_result?: string | null;
  raw_form_payload?: unknown;
  rawFormPayload?: unknown;
  within_geofence?: boolean | null;
  completed_at?: string | null;
}): { label: string; color: "red" | "amber" | "blue" | "gray" } {
  const opp = calculateOpportunityScore(visit);
  if (opp.score >= 60) return { label: "عالية", color: "red" };
  if (opp.score >= 35) return { label: "متوسطة", color: "amber" };
  if (opp.score > 0) return { label: "عادية", color: "blue" };
  return { label: "منخفضة", color: "gray" };
}

/* ========================================================================
 * VISIT DURATION
 * ==================================================================== */

export function formatVisitDuration(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs} ساعة ${mins % 60} دقيقة`;
  if (mins > 0) return `${mins} دقيقة`;
  return "أقل من دقيقة";
}

export function formatDurationShort(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "0 د";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs} س ${remainMins} د` : `${hrs} س`;
}

/* ========================================================================
 * PERFORMANCE SCORE
 * ==================================================================== */

export function calculatePerformanceScore(stats: {
  totalVisits: number;
  productiveVisits: number;
  quotations: number;
  orders: number;
  gpsCompliance: number;
  avgDurationMinutes: number;
}): { score: number; label: string; color: "green" | "blue" | "yellow" | "red" } {
  let score = 0;

  if (stats.totalVisits > 0) {
    score += Math.min(30, (stats.productiveVisits / stats.totalVisits) * 30);
  }
  score += Math.min(25, stats.quotations * 5);
  score += Math.min(20, stats.orders * 10);
  score += (stats.gpsCompliance / 100) * 15;
  if (stats.avgDurationMinutes >= 5 && stats.avgDurationMinutes <= 20) score += 10;
  else if (stats.avgDurationMinutes > 0) score += 5;

  const finalScore = Math.round(Math.min(score, 100));
  let label = "يحتاج تحسين";
  let color: "green" | "blue" | "yellow" | "red" = "red";
  if (finalScore >= 80) { label = "أداء ممتاز"; color = "green"; }
  else if (finalScore >= 60) { label = "أداء جيد"; color = "blue"; }
  else if (finalScore >= 40) { label = "مقبول"; color = "yellow"; }

  return { score: finalScore, label, color };
}
