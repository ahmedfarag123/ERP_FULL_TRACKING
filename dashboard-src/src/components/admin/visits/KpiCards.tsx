import { useMemo } from "react";
import {
  MapPinIcon,
  CheckCircleIcon,
  PhoneIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

interface VisitRow {
  id: string;
  customer_id: string;
  user_id: string;
  started_at: string | null;
  checked_in_at: string;
  completed_at: string | null;
  visit_mode: string | null;
  visit_result: string | null;
  raw_form_payload?: Record<string, unknown> | null;
  within_geofence?: boolean | null;
}

interface KpiCardsProps {
  visits: VisitRow[];
  isLoading: boolean;
}

interface KpiItem {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: string;
  trendColor?: string;
  subtitle?: string;
}

function parsePayload(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return undefined; }
  }
  return undefined;
}

export default function KpiCards({ visits, isLoading }: KpiCardsProps) {
  const kpis = useMemo<KpiItem[]>(() => {

    const today = new Date().toDateString();
    const todayVisits = visits.filter(
      (v) => new Date(v.checked_in_at).toDateString() === today,
    );

    const completed = visits.filter((v) => v.completed_at);
    const productive = completed.filter((v) => {
      const payload = parsePayload(v.raw_form_payload);
      const outcome = typeof payload?.visit_outcome === "string" ? payload.visit_outcome : "";
      return (
        outcome === "quotation_requested" ||
        outcome === "order_expected" ||
        outcome === "meeting_completed"
      );
    });

    const quotations = visits.filter((v) => {
      const payload = parsePayload(v.raw_form_payload);
      return payload?.visit_outcome === "quotation_requested";
    });

    const orders = visits.filter((v) => {
      const payload = parsePayload(v.raw_form_payload);
      return (
        payload?.visit_outcome === "order_expected" ||
        (v.visit_result ?? "").toLowerCase().includes("order")
      );
    });

    const followUps = visits.filter((v) => {
      const payload = parsePayload(v.raw_form_payload);
      return payload?.visit_outcome === "follow_up_required";
    });

    const gpsCompliant = visits.filter((v) => v.within_geofence === true);

    let totalDurationMs = 0;
    let durationCount = 0;
    for (const v of completed) {
      if (v.started_at && v.completed_at) {
        const ms = new Date(v.completed_at).getTime() - new Date(v.started_at).getTime();
        if (ms > 0) {
          totalDurationMs += ms;
          durationCount++;
        }
      }
    }
    const avgDuration = durationCount > 0 ? Math.round(totalDurationMs / durationCount / 60000) : 0;

    const conversionRate =
      completed.length > 0
        ? Math.round(((quotations.length + orders.length) / completed.length) * 100)
        : 0;

    return [
      {
        label: "إجمالي الزيارات",
        value: todayVisits.length.toLocaleString("ar-EG"),
        icon: <MapPinIcon className="h-5 w-5" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        subtitle: `${visits.length.toLocaleString("ar-EG")} هذا الشهر`,
      },
      {
        label: "زيارات منتجة",
        value: productive.length.toLocaleString("ar-EG"),
        icon: <CheckCircleIcon className="h-5 w-5" />,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        trend:
          completed.length > 0
            ? `${Math.round((productive.length / completed.length) * 100)}%`
            : undefined,
        trendColor: "text-emerald-600",
      },
      {
        label: "تحتاج متابعة",
        value: followUps.length.toLocaleString("ar-EG"),
        icon: <PhoneIcon className="h-5 w-5" />,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        subtitle: "إجراء مطلوب",
      },
      {
        label: "طلبات عرض سعر",
        value: quotations.length.toLocaleString("ar-EG"),
        icon: <DocumentTextIcon className="h-5 w-5" />,
        color: "text-violet-600",
        bgColor: "bg-violet-50",
      },
      {
        label: "الطلبات",
        value: orders.length.toLocaleString("ar-EG"),
        icon: <ShoppingCartIcon className="h-5 w-5" />,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      },
      {
        label: "معدل التحويل",
        value: `${conversionRate}%`,
        icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        subtitle: `${completed.length} زيارة مكتملة`,
      },
      {
        label: "متوسط المدة",
        value: `${avgDuration} د`,
        icon: <ClockIcon className="h-5 w-5" />,
        color: "text-gray-600",
        bgColor: "bg-brand-25",
      },
      {
        label: "التوافق الجغرافي",
        value:
          visits.length > 0
            ? `${Math.round((gpsCompliant.length / visits.length) * 100)}%`
            : "--",
        icon: <SignalIcon className="h-5 w-5" />,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50",
        subtitle: `${gpsCompliant.length} من ${visits.length}`,
      },
    ];
  }, [visits, isLoading]);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {kpis.map((kpi) => (
        <article
          key={kpi.label}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-white/[0.02]"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-gray-400">{kpi.label}</p>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bgColor} ${kpi.color}`}
            >
              {kpi.icon}
            </div>
          </div>
          <p
            className="mt-2 text-2xl font-bold text-gray-900 dark:text-white"
            dir="ltr"
          >
            {kpi.value}
          </p>
          {kpi.trend && (
            <p className={`mt-0.5 text-xs font-medium ${kpi.trendColor ?? "text-gray-400"}`}>
              {kpi.trend}
            </p>
          )}
          {kpi.subtitle && !kpi.trend && (
            <p className="mt-0.5 text-xs text-gray-400">{kpi.subtitle}</p>
          )}
        </article>
      ))}
    </div>
  );
}
