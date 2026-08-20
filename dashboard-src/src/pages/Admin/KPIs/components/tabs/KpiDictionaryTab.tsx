import { useMemo, useState } from "react";
import { AdminSection } from "../../../../../components/admin/AdminPageElements";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { WeightBar } from "../../../../../components/ui/KpiProgressBar";
import { KPI_DICTIONARY } from "../../data/kpi-formulas";
import { DEPARTMENTS } from "../../data/department-meta";
import type { KpiDictionaryEntry, DateRange } from "../../../../../types/kpi";

export function KpiDictionaryTab({ dateRange: _dateRange }: { dateRange: DateRange }) {
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = KPI_DICTIONARY;
    if (selectedDept !== "all") {
      result = result.filter((k) => k.departmentSlug === selectedDept);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (k) =>
          k.kpiCode.toLowerCase().includes(q) ||
          k.kpiNameEn.toLowerCase().includes(q) ||
          k.kpiNameAr.includes(q) ||
          k.definition.toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectedDept, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, KpiDictionaryEntry[]>();
    for (const kpi of filtered) {
      const existing = groups.get(kpi.department) ?? [];
      existing.push(kpi);
      groups.set(kpi.department, existing);
    }
    return groups;
  }, [filtered]);

  const stats = useMemo(() => {
    const totalWeight = filtered.reduce((sum, k) => sum + k.weight, 0);
    const higherCount = filtered.filter((k) => k.direction === "Higher is Better").length;
    const lowerCount = filtered.filter((k) => k.direction === "Lower is Better").length;
    return { total: filtered.length, totalWeight, higherCount, lowerCount };
  }, [filtered]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-brand-25 p-3 text-center">
          <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          <p className="text-[10px] text-gray-500">إجمالي المؤشرات</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-brand-25 p-3 text-center">
          <p className="text-lg font-bold text-gray-900">{Math.round(stats.totalWeight * 100)}%</p>
          <p className="text-[10px] text-gray-500">إجمالي الأوزان</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{stats.higherCount}</p>
          <p className="text-[10px] text-emerald-600">↑ الأعلى أفضل</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
          <p className="text-lg font-bold text-red-700">{stats.lowerCount}</p>
          <p className="text-[10px] text-red-600">↓ الأدنى أفضل</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="بحث في المؤشرات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">جميع الأقسام</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Department Groups */}
      {Array.from(grouped.entries()).map(([dept, kpis]) => (
        <AdminSection
          key={dept}
          title={dept}
          description={`${kpis.length} مؤشر أداء`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.kpiCode} kpi={kpi} />
            ))}
          </div>
        </AdminSection>
      ))}

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-500">
          لا توجد مؤشرات تطابق البحث
        </div>
      )}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: KpiDictionaryEntry }) {
  const directionColor = kpi.direction === "Higher is Better" ? "text-emerald-600" : "text-red-600";
  const directionBg = kpi.direction === "Higher is Better" ? "bg-emerald-50" : "bg-red-50";
  const directionIcon = kpi.direction === "Higher is Better" ? "↑" : "↓";

  return (
    <div className="rounded-xl border border-gray-100 p-4 transition-all hover:border-gray-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-brand-600">{kpi.kpiCode}</span>
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${directionBg} ${directionColor}`}
          >
            {directionIcon}
          </span>
        </div>
        <span className="text-[10px] text-gray-400">{kpi.frequency}</span>
      </div>

      {/* Name */}
      <p className="mt-2 text-sm font-semibold text-gray-900">{kpi.kpiNameAr}</p>
      <p className="text-xs text-gray-500">{kpi.kpiNameEn}</p>

      {/* Definition */}
      <p className="mt-2 line-clamp-2 text-[11px] text-gray-400">{kpi.definition}</p>

      {/* Weight & Target */}
      <div className="mt-3 flex items-center justify-between">
        <WeightBar weight={kpi.weight} />
        {kpi.target && (
          <span className="text-xs font-medium text-gray-700">
            الهدف: {kpi.target.toLocaleString()} {kpi.unit}
          </span>
        )}
      </div>

      {/* Formula - collapsed */}
      <p className="mt-2 truncate text-[10px] text-gray-300" title={kpi.formula}>
        {kpi.formula}
      </p>
    </div>
  );
}
