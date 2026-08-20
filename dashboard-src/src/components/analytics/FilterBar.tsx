import { useEffect, useState } from "react";
import { FunnelIcon } from "@heroicons/react/24/outline";
import {
  fetchFilterCompanies,
  fetchFilterSalespeople,
  fetchFilterGovernorates,
  fetchFilterAreas,
  type CompanyFilter,
  type SalespersonFilter,
  type GovernorateFilter,
  type AreaFilter,
} from "../../lib/analytics-api";

interface FilterBarProps {
  start_date: string;
  end_date: string;
  company_name: string;
  salesperson: string;
  governorate_code: string;
  area_code: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  onSalespersonChange: (v: string) => void;
  onGovernorateChange: (v: string) => void;
  onAreaChange: (v: string) => void;
}

export default function FilterBar({
  start_date,
  end_date,
  company_name,
  salesperson,
  governorate_code,
  area_code,
  onStartChange,
  onEndChange,
  onCompanyChange,
  onSalespersonChange,
  onGovernorateChange,
  onAreaChange,
}: FilterBarProps) {
  const [companies, setCompanies] = useState<CompanyFilter[]>([]);
  const [salespeople, setSalespeople] = useState<SalespersonFilter[]>([]);
  const [governorates, setGovernorates] = useState<GovernorateFilter[]>([]);
  const [areas, setAreas] = useState<AreaFilter[]>([]);

  useEffect(() => {
    const p = { start_date, end_date };
    fetchFilterCompanies(p).then(setCompanies).catch(() => {});
    fetchFilterSalespeople(p).then(setSalespeople).catch(() => {});
    fetchFilterGovernorates(p).then(setGovernorates).catch(() => {});
  }, [start_date, end_date]);

  useEffect(() => {
    if (governorate_code) {
      fetchFilterAreas({ start_date, end_date, governorate_code }).then(setAreas).catch(() => {});
    } else {
      fetchFilterAreas({ start_date, end_date }).then(setAreas).catch(() => {});
    }
  }, [start_date, end_date, governorate_code]);

  const selectClass =
    "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
      <FunnelIcon className="h-4 w-4 text-gray-400 shrink-0" />

      <input
        type="date"
        value={start_date}
        onChange={(e) => onStartChange(e.target.value)}
        className={selectClass}
      />
      <span className="text-gray-400">←</span>
      <input
        type="date"
        value={end_date}
        onChange={(e) => onEndChange(e.target.value)}
        className={selectClass}
      />

      <select
        value={company_name}
        onChange={(e) => onCompanyChange(e.target.value)}
        className={selectClass}
      >
        <option value="">كل الشركات</option>
        {companies.map((c) => (
          <option key={c.company_name} value={c.company_name}>
            {c.company_name} ({c.orders_count})
          </option>
        ))}
      </select>

      <select
        value={salesperson}
        onChange={(e) => onSalespersonChange(e.target.value)}
        className={selectClass}
      >
        <option value="">كل المندوبين</option>
        {salespeople.map((s) => (
          <option key={s.salesperson} value={s.salesperson}>
            {s.salesperson} ({s.orders_count})
          </option>
        ))}
      </select>

      <select
        value={governorate_code}
        onChange={(e) => {
          onGovernorateChange(e.target.value);
          onAreaChange("");
        }}
        className={selectClass}
      >
        <option value="">كل المحافظات</option>
        {governorates.map((g) => (
          <option key={g.governorate_code} value={g.governorate_code}>
            {g.governorate_name} ({g.orders_count})
          </option>
        ))}
      </select>

      <select
        value={area_code}
        onChange={(e) => onAreaChange(e.target.value)}
        className={selectClass}
        disabled={!governorate_code}
      >
        <option value="">كل المناطق</option>
        {areas.map((a) => (
          <option key={a.area_code} value={a.area_code}>
            {a.area_name}
          </option>
        ))}
      </select>

      {(company_name || salesperson || governorate_code || area_code) && (
        <button
          onClick={() => {
            onCompanyChange("");
            onSalespersonChange("");
            onGovernorateChange("");
            onAreaChange("");
          }}
          className="text-xs text-brand-500 hover:text-brand-600 font-medium"
        >
          مسح الفلاتر
        </button>
      )}
    </div>
  );
}
