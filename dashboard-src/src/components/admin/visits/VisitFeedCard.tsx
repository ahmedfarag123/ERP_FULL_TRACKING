import { MapPinIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router";
import {
  getSmartStatus,
  buildConclusionSentence,
  translateNextAction,
  calculateOpportunityScore,
  formatVisitDuration,
} from "../../../lib/visit-translations";
import { getArabicOnlyVisitNote } from "../../../lib/visit-note-localization";
import SmartStatusBadge from "./SmartStatusBadge";

export interface VisitFeedItem {
  id: string;
  customerName: string;
  userName: string;
  checkedInAt: string;
  startedAt: string | null;
  completedAt: string | null;
  visitResult: string | null;
  visitMode: string | null;
  note: string | null;
  translatedNote?: string | null;
  rawFormPayload: Record<string, unknown> | null;
  withinGeofence: boolean | null;
  customerDistanceMeters: number | null;
}

interface VisitFeedCardProps {
  visit: VisitFeedItem;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const OPPORTUNITY_COLORS: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-rose-100 text-rose-700 border-rose-200",
  gray: "bg-brand-25 text-gray-500 border-gray-200",
};

const GPS_STATUS: Record<string, { label: string; color: string }> = {
  inside: { label: "ضمن النطاق", color: "text-emerald-600" },
  outside: { label: "خارج النطاق", color: "text-rose-600" },
  unknown: { label: "", color: "text-gray-400" },
};

export default function VisitFeedCard({ visit }: VisitFeedCardProps) {
  const navigate = useNavigate();
  const smartStatus = getSmartStatus(visit);
  const conclusion = buildConclusionSentence({
    ...visit,
    note: getArabicOnlyVisitNote(visit.note, visit.translatedNote),
  });
  const nextAction = translateNextAction(visit.rawFormPayload);
  const opportunity = calculateOpportunityScore(visit);
  const duration = formatVisitDuration(visit.startedAt, visit.completedAt);

  const time = new Intl.DateTimeFormat("ar-EG", {
    timeStyle: "short",
  }).format(new Date(visit.checkedInAt));

  const date = new Intl.DateTimeFormat("ar-EG", {
    month: "short",
    day: "numeric",
  }).format(new Date(visit.checkedInAt));

  const gpsKey: "inside" | "outside" | "unknown" =
    visit.withinGeofence === true ? "inside" : visit.withinGeofence === false ? "outside" : "unknown";
  const gps = GPS_STATUS[gpsKey];

  return (
    <button
      type="button"
      onClick={() => navigate(`/visits/${visit.id}`)}
      className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-right transition-all hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-blue-500/30 sm:p-5"
    >
      {/* Top Row: Customer + Opportunity + Time */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-25 text-xs font-bold text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
            {getInitials(visit.customerName)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-gray-900 dark:text-white" dir="auto">
              {visit.customerName}
            </h3>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-gray-400">بواسطة</span>
              <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-25 text-[9px] font-bold text-gray-500 dark:bg-white/[0.02]">
                  {getInitials(visit.userName)}
                </span>
                {visit.userName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${OPPORTUNITY_COLORS[opportunity.color]}`}>
            {opportunity.score}/100
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>{date}</span>
            <span>·</span>
            <span>{time}</span>
          </div>
        </div>
      </div>

      {/* Smart Status */}
      <div className="mt-3">
        <SmartStatusBadge status={smartStatus} size="md" />
      </div>

      {/* Conclusion Sentence — THE main content */}
      <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300" dir="auto">
        {conclusion}
      </p>

      {/* Next Action — highlighted */}
      {nextAction && (
        <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400" dir="auto">
          ← {nextAction}
        </p>
      )}

      {/* Bottom Row: Duration + GPS */}
      <div className="mt-3 flex items-center gap-4 border-t border-gray-50 pt-3 dark:border-gray-800">
        {duration && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <ClockIcon className="h-3.5 w-3.5" />
            {duration}
          </span>
        )}
        {gps.label && (
          <span className={`flex items-center gap-1 text-xs ${gps.color}`}>
            <MapPinIcon className="h-3.5 w-3.5" />
            {gps.label}
            {visit.customerDistanceMeters != null && ` · ${Math.round(visit.customerDistanceMeters)}م`}
          </span>
        )}
        {visit.visitMode === "manual" && (
          <span className="text-xs text-amber-500">يدوي</span>
        )}
      </div>
    </button>
  );
}
