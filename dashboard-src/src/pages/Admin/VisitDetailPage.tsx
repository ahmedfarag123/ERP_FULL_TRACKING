import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowRightIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ShieldCheckIcon,
  UserIcon,
  PhoneIcon,
  DocumentTextIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import SmartStatusBadge from "../../components/admin/visits/SmartStatusBadge";
import { ScoreRing } from "../../components/ui/ScoreRing";
import {
  getSmartStatus,
  translateVisitOutcome,
  translateDecisionMakerStatus,
  translateNextAction,
  translateInterestLevel,
  buildVisitNarrative,
  calculateOpportunityScore,
  formatVisitDuration,
  sanitizeValue,
} from "../../lib/visit-translations";
import { supabase } from "../../lib/supabase";
import { getArabicOnlyVisitNote } from "../../lib/visit-note-localization";
import { useVisitNoteTranslations } from "../../hooks/useVisitNoteTranslations";

interface VisitDetail {
  id: string;
  customer_id: string;
  user_id: string;
  started_at: string | null;
  checked_in_at: string;
  completed_at: string | null;
  created_at: string;
  visit_mode: string | null;
  visit_result: string | null;
  note: string | null;
  lat: number | null;
  lng: number | null;
  within_geofence: boolean | null;
  customer_distance_meters: number | null;
  captured_photo_path: string | null;
  fraud_score: number | null;
  fraud_status: string | null;
  raw_form_payload: Record<string, unknown> | null;
  raw_payload: Record<string, unknown> | null;
  customer_name: string | null;
  user_name: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "--";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function formatTime(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat("ar-EG", { timeStyle: "short" }).format(
    new Date(dateStr),
  );
}

export default function VisitDetailPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const noteTranslations = useVisitNoteTranslations(visit ? [visit] : []);

  const loadVisit = useCallback(async () => {
    if (!visitId) return;
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("visits")
        .select("*")
        .eq("id", visitId)
        .single();

      if (fetchError) throw fetchError;

      const visitRow = data as VisitDetail;

      const [customerRes, profileRes] = await Promise.all([
        supabase
          .from("customers")
          .select("customer_name")
          .eq("id", visitRow.customer_id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", visitRow.user_id)
          .single(),
      ]);

      visitRow.customer_name = customerRes.data?.customer_name ?? null;
      visitRow.user_name = profileRes.data?.full_name ?? null;

      setVisit(visitRow);
    } catch {
      setError(
        "تعذر تحميل تفاصيل الزيارة.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    void loadVisit();
  }, [loadVisit]);

  if (isLoading) {
    return (
      <>
        <PageMeta title="تفاصيل الزيارة | إدارة المبيعات" description="" />
        <AdminPageFrame>
          <div className="space-y-6 p-6">
            <div className="h-8 w-48 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
            <div className="h-64 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
            <div className="h-48 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]" />
          </div>
        </AdminPageFrame>
      </>
    );
  }

  if (error || !visit) {
    return (
      <>
        <PageMeta title="تفاصيل الزيارة | إدارة المبيعات" description="" />
        <AdminPageFrame>
          <div className="flex flex-col items-center justify-center py-32">
            <ExclamationTriangleIcon className="h-12 w-12 text-amber-400" />
            <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              {error || "الزيارة غير موجودة"}
            </p>
            <button
              type="button"
              onClick={() => navigate("/visits")}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              العودة للزيارات
            </button>
          </div>
        </AdminPageFrame>
      </>
    );
  }

  const smartStatus = getSmartStatus(visit);
  const outcome = translateVisitOutcome(visit);
  const dmStatus = translateDecisionMakerStatus(visit.raw_form_payload);
  const nextAction = translateNextAction(visit.raw_form_payload);
  const interestLevel = translateInterestLevel(visit.raw_form_payload);
  const localizedNote = getArabicOnlyVisitNote(
    visit.note,
    noteTranslations.get(visit.id),
  );
  const narrative = buildVisitNarrative({ ...visit, note: localizedNote });
  const opportunity = calculateOpportunityScore(visit);
  const duration = formatVisitDuration(visit.started_at, visit.completed_at);

  // Parse raw_form_payload — it may be a JSON string from Supabase
  let payload: Record<string, unknown> | null = null;
  if (visit.raw_form_payload && typeof visit.raw_form_payload === "object") {
    payload = visit.raw_form_payload as Record<string, unknown>;
  } else if (typeof visit.raw_form_payload === "string") {
    try {
      const parsed = JSON.parse(visit.raw_form_payload);
      if (parsed && typeof parsed === "object") payload = parsed;
    } catch { /* not JSON */ }
  }

  const selectedProfiles = Array.isArray(payload?.selected_customer_profiles)
    ? (payload.selected_customer_profiles as Array<Record<string, unknown>>)
    : [];
  const interestedBrands = [...new Set(selectedProfiles
    .map((p) => typeof p?.brand_name_ar === "string" ? p.brand_name_ar : null)
    .filter(Boolean))] as string[];
  const interestedCategories = [...new Set(selectedProfiles
    .map((p) => typeof p?.category_name_ar === "string" ? p.category_name_ar : null)
    .filter(Boolean))] as string[];
  const customerType = selectedProfiles.length > 0
    ? (selectedProfiles[0]?.customer_type_name_ar as string ?? null)
    : null;

  const photoUrl = visit.captured_photo_path
    ? `https://your-storage-bucket.supabase.co/storage/v1/object/public/visit-proofs/${visit.captured_photo_path}`
    : null;

  return (
    <>
      <PageMeta
        title={`${visit.customer_name ?? "الزيارة"} | تفاصيل الزيارة`}
        description=""
      />
      <AdminPageFrame>
        <div className="mx-auto max-w-4xl space-y-6 p-6">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => navigate("/visits")}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowRightIcon className="h-4 w-4" />
            العودة للزيارات
          </button>

          {/* Header Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-25 text-lg font-bold text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                {getInitials(visit.customer_name ?? "عميل")}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white" dir="auto">
                  {visit.customer_name ?? "عميل غير معروف"}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <UserIcon className="h-4 w-4" />
                    {visit.user_name ?? "غير محدد"}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">
                    {formatDate(visit.checked_in_at)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <SmartStatusBadge status={smartStatus} size="md" />
                {duration && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4" />
                    {duration}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Visit Narrative */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-500/20 dark:bg-blue-500/5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              ملخص الزيارة
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300" dir="auto">
              {narrative}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Opportunity Score */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                فرصة التحويل
              </h3>
              <div className="mt-4 flex items-center gap-6">
                <ScoreRing score={opportunity.score} size={80} strokeWidth={6} />
                <div className="flex-1">
                  <p className={`text-lg font-bold ${
                    opportunity.color === "green"
                      ? "text-emerald-600"
                      : opportunity.color === "blue"
                        ? "text-blue-600"
                        : opportunity.color === "yellow"
                          ? "text-amber-600"
                          : "text-gray-400"
                  }`}>
                    {opportunity.label}
                  </p>
                  {opportunity.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {opportunity.reasons.map((reason) => (
                        <li key={reason} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Visit Facts */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                تفاصيل الزيارة
              </h3>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">التاريخ والوقت</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white" dir="ltr">
                    {formatDate(visit.checked_in_at)}
                  </span>
                </div>
                {duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">المدة</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {duration}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">طريقة الزيارة</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {visit.visit_mode === "gps" ? "GPS" : "يدوية"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">صاحب القرار</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300" dir="auto">
                    {dmStatus || "غير محدد"}
                  </span>
                </div>
                {interestLevel && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">مستوى الاهتمام</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300" dir="auto">
                      {interestLevel}
                    </span>
                  </div>
                )}
                {nextAction && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">الإجراء التالي</span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400" dir="auto">
                      {nextAction}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GPS Evidence */}
          {(visit.lat || visit.captured_photo_path) && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                أدلة الزيارة
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visit.lat && visit.lng && (
                  <div className="rounded-xl bg-brand-25 p-4 dark:bg-white/[0.02]/50">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        الموقع
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500" dir="ltr">
                      {visit.lat.toFixed(5)}, {visit.lng.toFixed(5)}
                    </p>
                    {visit.customer_distance_meters != null && (
                      <p className="mt-1 text-xs text-gray-500">
                        المسافة: {Math.round(visit.customer_distance_meters)}م
                      </p>
                    )}
                    <p className={`mt-1 text-xs font-medium ${visit.within_geofence ? "text-emerald-600" : "text-rose-600"}`}>
                      {visit.within_geofence ? "ضمن النطاق الجغرافي" : "خارج النطاق الجغرافي"}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${visit.lat},${visit.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      فتح على الخريطة ←
                    </a>
                  </div>
                )}

                {photoUrl && (
                  <div className="rounded-xl bg-brand-25 p-4 dark:bg-white/[0.02]/50">
                    <div className="flex items-center gap-2">
                      <PhotoIcon className="h-5 w-5 text-violet-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        صورة التحقق
                      </span>
                    </div>
                    <img
                      src={photoUrl}
                      alt="صورة الزيارة"
                      className="mt-2 h-32 w-full rounded-lg object-cover"
                    />
                  </div>
                )}

                {!visit.lat && !photoUrl && (
                  <div className="col-span-2 rounded-xl bg-brand-25 p-4 text-center text-sm text-gray-400 dark:bg-white/[0.02]/50">
                    لا توجد أدلة موقع متاحة
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Products Opportunity */}
          {(customerType || interestedBrands.length > 0 || interestedCategories.length > 0) && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                المنتجات المهتم بها
              </h3>
              <div className="mt-3 space-y-3">
                {customerType && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">نوع النشاط</p>
                    <span className="mt-1 inline-block rounded-full bg-brand-25 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/[0.02] dark:text-gray-300">
                      {customerType}
                    </span>
                  </div>
                )}
                {interestedBrands.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">العلامات التجارية</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {interestedBrands.map((brand) => (
                        <span
                          key={brand}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {interestedCategories.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">الأقسام</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {interestedCategories.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              الجدول الزمني
            </h3>
            <div className="mt-4 space-y-0">
              {visit.started_at && (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <ClockIcon className="h-4 w-4" />
                    </div>
                    <div className="h-8 w-0.5 bg-gray-200 dark:bg-white/[0.04]" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">بداية الزيارة</p>
                    <p className="text-xs text-gray-500" dir="ltr">{formatTime(visit.started_at)}</p>
                  </div>
                </div>
              )}
              {visit.checked_in_at && (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircleIcon className="h-4 w-4" />
                    </div>
                    {visit.completed_at && <div className="h-8 w-0.5 bg-gray-200 dark:bg-white/[0.04]" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">التحقق من الوصول</p>
                    <p className="text-xs text-gray-500" dir="ltr">{formatTime(visit.checked_in_at)}</p>
                  </div>
                </div>
              )}
              {visit.completed_at && (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <CheckCircleIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">انتهت الزيارة</p>
                    <p className="text-xs text-gray-500" dir="ltr">{formatTime(visit.completed_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {visit.note && (() => {
            const translated = localizedNote;
            if (!translated) return null;
            return (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.02]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  ملاحظات المندوب
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300" dir="auto">
                  {translated}
                </p>
              </div>
            );
          })()}

          {/* Fraud Info (if present) */}
          {visit.fraud_status && visit.fraud_status !== "none" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  إشارة احتيال
                </h3>
              </div>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                الحالة: {sanitizeValue(visit.fraud_status) ?? visit.fraud_status}
                {visit.fraud_score != null && ` · النتيجة: ${visit.fraud_score}`}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/visits")}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
            >
              العودة
            </button>
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              إرسال عرض سعر
            </button>
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              جدولة متابعة
            </button>
          </div>
        </div>
      </AdminPageFrame>
    </>
  );
}
