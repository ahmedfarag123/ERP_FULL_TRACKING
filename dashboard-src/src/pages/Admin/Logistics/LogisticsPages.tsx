import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { supabase } from "../../../lib/supabase";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowsUpDownIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  RocketLaunchIcon,
  TrashIcon,
  TruckIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import LiveTrackingMapSection from "../../../components/admin/LiveTrackingMapSection";
import DateRangePicker from "../../../components/form/date-range-picker";
import { AdminEmptyState, AdminMetricCard, AdminMetricGrid, AdminPageFrame, AdminPageHero, AdminSection } from "../../../components/admin/AdminPageElements";
import CustomerAvatar from "../../../components/ui/CustomerAvatar";
import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge, { type StatusBadgeTone } from "../../../components/ui/StatusBadge";
import type { DateRangeValue } from "../../../lib/date-range";
import {
  assignPlanDriver,
  createPlanFromOrders,
  fetchActivePlans,
  fetchAllAssignedShipments,
  fetchDistricts,
  fetchLogisticsDashboard,
  fetchLogisticsDrivers,
  fetchLogisticsPlans,
  fetchPlanDetails,
  fetchShipmentCandidates,
  fetchUnassignedShipments,
  formatPlanDisplayName,
  addUnassignedShipmentsToPlan,
  optimizePlan,
  removeShipmentFromPlan,
  setShipmentSequence,
  startDispatcherPreparation,
  tomorrowDate,
  transferShipmentsBetweenPlans,
  updatePlanDate,
  updatePlanStatus,
  updateShipmentStatus,
  getValidNextStatuses,
  SHIPMENT_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  type LogisticsDriver,
  type LogisticsPlan,
  type LogisticsPlanItem,
  type LogisticsShipment,
  type ShipmentCandidate,
} from "../../../lib/logistics-admin";

const PAGE_SIZE = 10;
const ROOT_QUERY = ["admin", "logistics"] as const;

type SortDirection = "asc" | "desc";

function tomorrowRange(): DateRangeValue {
  const tomorrow = new Date(`${tomorrowDate()}T00:00:00`);
  return [tomorrow, tomorrow];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function formatNumber(value: number | null | undefined, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value ?? 0));
}

function formatMoney(value: number | null | undefined, currency = "EGP") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function displayDistanceKm(value: number | null | undefined) {
  const distance = Number(value ?? 0);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  return distance > 1000 ? distance / 1000 : distance;
}

function formatDistance(value: number | null | undefined) {
  const distance = displayDistanceKm(value);
  return distance === null ? "--" : `${formatNumber(distance, 1)} كم`;
}

function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : tomorrowDate();
}

function includesSearch(values: Array<unknown>, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalized));
}

function planStatusInfo(status: string, preparationStatus?: string | null): { label: string; tone: StatusBadgeTone } {
  if (status === "pending" && preparationStatus === "ready") return { label: "جاهزة للاستلام", tone: "green" };
  if (status === "pending" && preparationStatus) return { label: "لدى الديسباتشر", tone: "blue" };
  if (status === "pending") return { label: "مسودة", tone: "yellow" };
  if (status === "in_progress") return { label: "قيد التنفيذ", tone: "blue" };
  if (status === "completed") return { label: "مكتملة", tone: "green" };
  if (status === "cancelled") return { label: "ملغاة", tone: "gray" };
  return { label: "غير محددة", tone: "gray" };
}

function shipmentStatusInfo(status: string): { label: string; tone: StatusBadgeTone } {
  switch (status) {
    case "PENDING_ASSIGN":
      return { label: "جاهزة للتخطيط", tone: "yellow" };
    case "ASSIGNED":
      return { label: "تم الإسناد", tone: "blue" };
    case "CHECK_IN":
    case "PICKUP":
      return { label: "استلام", tone: "indigo" };
    case "OUT_FOR_DELIVERY":
    case "ARRIVED":
      return { label: "في الطريق", tone: "orange" };
    case "DELIVERED":
    case "FINISHED":
    case "SETTLED":
      return { label: "تم التسليم", tone: "green" };
    case "CANCELLED":
      return { label: "فشل/إلغاء", tone: "red" };
    default:
      return { label: "غير محددة", tone: "gray" };
  }
}

type SortState = { key: string; direction: SortDirection } | null;

function useSort(initial: SortState = null) {
  const [sort, setSort] = useState<SortState>(initial);
  const toggle = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };
  const sorted = <T extends Record<string, any>>(rows: T[], extractors: Record<string, (row: T) => any>): T[] => {
    if (!sort) return rows;
    const extract = extractors[sort.key];
    if (!extract) return rows;
    return [...rows].sort((a, b) => {
      const av = extract(a);
      const bv = extract(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sort.direction === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), "ar");
      return sort.direction === "asc" ? cmp : -cmp;
    });
  };
  return { sort, toggle, sorted };
}

function SortableTh({
  label,
  sortKey,
  sort,
  toggle,
  className,
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  toggle: (key: string) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  return (
    <th
      className={`px-4 py-3 select-none cursor-pointer hover:bg-brand-25 dark:hover:bg-gray-700 transition ${className ?? ""}`}
      onClick={() => toggle(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sort!.direction === "asc" ? (
            <ChevronUpIcon className="h-3.5 w-3.5 text-brand-600" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5 text-brand-600" />
          )
        ) : (
          <ArrowsUpDownIcon className="h-3 w-3 text-gray-300 dark:text-gray-600" />
        )}
      </span>
    </th>
  );
}

function ToolbarButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger";
  type?: "button" | "submit";
}) {
  const variant = props.variant ?? "outline";
  const cls =
    variant === "primary"
      ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-600"
      : variant === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
        : "border-gray-300 bg-white text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.02]";
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {props.children}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative w-full min-w-[220px] md:w-72">
      <span className="sr-only">{placeholder}</span>
      <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
    </label>
  );
}

function ColumnVisibility<T extends string>({
  columns,
  visible,
  onToggle,
}: {
  columns: Array<{ key: T; label: string }>;
  visible: Record<T, boolean>;
  onToggle: (key: T) => void;
}) {
  return (
    <details className="relative">
      <summary className="inline-flex h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        <Cog6ToothIcon className="h-4 w-4" />
        الأعمدة
      </summary>
      <div className="absolute left-0 z-20 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        {columns.map((column) => (
          <label key={column.key} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm text-gray-700 hover:bg-brand-25 dark:text-gray-200 dark:hover:bg-white/[0.04]">
            <span>{column.label}</span>
            <input
              type="checkbox"
              checked={visible[column.key]}
              onChange={() => onToggle(column.key)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
            />
          </label>
        ))}
      </div>
    </details>
  );
}

function Pagination({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        عرض <span className="font-semibold text-gray-900 dark:text-white">{total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}</span> إلى{" "}
        <span className="font-semibold text-gray-900 dark:text-white">{Math.min(safePage * PAGE_SIZE, total)}</span> من{" "}
        <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-gray-500 transition hover:bg-brand-25 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <span className="min-w-16 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-gray-500 transition hover:bg-brand-25 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{message}</div>;
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
      ))}
    </div>
  );
}

function PlanCreatePanel({
  selectedCandidates,
  onCreated,
}: {
  selectedCandidates: ShipmentCandidate[];
  onCreated?: (planId: string) => void;
}) {
  const navigate = useNavigate();
  const { data: drivers = [] } = useQuery({
    queryKey: [...ROOT_QUERY, "drivers"],
    queryFn: fetchLogisticsDrivers,
  });
  const { data: districts = [] } = useQuery({
    queryKey: [...ROOT_QUERY, "districts"],
    queryFn: fetchDistricts,
  });
  const [driverId, setDriverId] = useState("");
  const [plannedDate, setPlannedDate] = useState(tomorrowDate());
  const [notes, setNotes] = useState("");
  const [district, setDistrict] = useState("");
  const mutation = useMutation({
    mutationFn: () => createPlanFromOrders({ driverId, plannedDate, candidates: selectedCandidates, notes, district: district || undefined }),
    onSuccess: (planId) => {
      onCreated?.(planId);
      navigate(`/logistics/plans/draft/${planId}`);
    },
  });
  const canCreate = selectedCandidates.length > 0 && driverId && plannedDate;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canCreate) mutation.mutate();
      }}
      className="grid gap-3 rounded-2xl border border-gray-200 bg-brand-25/80 p-4 dark:border-gray-800 dark:bg-white/[0.03] lg:grid-cols-[1fr_180px_1.2fr_auto]"
    >
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">السائق</span>
        <select
          value={driverId}
          onChange={(event) => setDriverId(event.target.value)}
          className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">اختر السائق</option>
          {drivers.filter((driver) => driver.status === "active").map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">تاريخ التسليم</span>
        <input
          type="date"
          value={plannedDate}
          onChange={(event) => setPlannedDate(event.target.value)}
          className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">المنطقة</span>
        <select
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
          className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">اختر المنطقة</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ملاحظات الخطة</span>
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="اختياري"
          className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </label>
      <div className="flex items-end">
        <ToolbarButton type="submit" variant="primary" disabled={!canCreate || mutation.isPending}>
          <PlusIcon className="h-4 w-4" />
          {mutation.isPending ? "جاري الإنشاء" : `إنشاء خطة (${selectedCandidates.length})`}
        </ToolbarButton>
      </div>
      <ErrorNotice message={mutation.error instanceof Error ? mutation.error.message : null} />
    </form>
  );
}

type CandidateColumn = "select" | "order" | "customer" | "date" | "warehouse" | "amount" | "status" | "plan" | "view";

function ShipmentCandidateTable({
  rows,
  isLoading,
  selected,
  onSelectedChange,
  planningMode = false,
}: {
  rows: ShipmentCandidate[];
  isLoading: boolean;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  planningMode?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("unplanned");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: CandidateColumn; direction: SortDirection } | null>({ key: "date", direction: "asc" });
  const [visible, setVisible] = useState<Record<CandidateColumn, boolean>>({
    select: true,
    order: true,
    customer: true,
    date: true,
    warehouse: true,
    amount: true,
    status: true,
    plan: !planningMode,
    view: true,
  });

  const warehouses = useMemo(() => Array.from(new Set(rows.map((row) => row.warehouseId).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => {
    const next = rows
      .filter((row) => includesSearch([row.orderName, row.customerName, row.warehouseId, row.deliveryStatus], search))
      .filter((row) => {
        if (planFilter === "all") return true;
        if (planFilter === "planned") return Boolean(row.existingPlanId);
        return !row.existingPlanId;
      })
      .filter((row) => statusFilter === "all" || String(row.shipmentStatus ?? "PENDING_ASSIGN") === statusFilter)
      .filter((row) => warehouseFilter === "all" || row.warehouseId === warehouseFilter);

    return next.sort((a, b) => {
      if (!sort) return 0;
      const direction = sort.direction === "asc" ? 1 : -1;
      const getValue = (row: ShipmentCandidate) => {
        if (sort.key === "date") return row.commitmentDate ?? "";
        if (sort.key === "amount") return row.amount;
        if (sort.key === "customer") return row.customerName ?? "";
        if (sort.key === "status") return String(row.shipmentStatus ?? "PENDING_ASSIGN");
        if (sort.key === "plan") return row.existingPlanId ?? "";
        return row.orderName;
      };
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
      return String(av).localeCompare(String(bv), "ar") * direction;
    });
  }, [rows, search, sort, statusFilter, planFilter, warehouseFilter]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectablePageRows = pageRows.filter((row) => !row.existingPlanId);
  const allVisibleSelected = selectablePageRows.length > 0 && selectablePageRows.every((row) => selected.includes(row.orderId));
  const handleSortToggle = (k: string) => setSort((prev) => prev?.key === k ? (prev.direction === "asc" ? { key: k as CandidateColumn, direction: "desc" } : null) : { key: k as CandidateColumn, direction: "asc" });

  return (
    <AdminSection
      title={planningMode ? "اختيار الشحنات للخطة" : "مصدر التخطيط حسب تاريخ التسليم"}
      actions={
        <div className="flex flex-wrap gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="البحث في الشحنات" />
          <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="unplanned">غير مخطط فقط</option>
            <option value="all">كل الشحنات</option>
            <option value="planned">داخل خطة</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="all">كل حالات الشحنة</option>
            <option value="PENDING_ASSIGN">جاهزة للتخطيط</option>
            <option value="ASSIGNED">تم الإسناد</option>
            <option value="DELIVERED">تم التسليم</option>
            <option value="CANCELLED">ملغاة</option>
          </select>
          <select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)} className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="all">كل المستودعات</option>
            {warehouses.map((warehouse) => <option key={warehouse} value={warehouse}>{warehouse}</option>)}
          </select>
          <ToolbarButton onClick={() => setSort((current) => current ? { key: current.key, direction: current.direction === "asc" ? "desc" : "asc" } : { key: "order", direction: "asc" })}>
            <ArrowsUpDownIcon className="h-4 w-4" />
            ترتيب
          </ToolbarButton>
          <ColumnVisibility
            columns={[
              { key: "order", label: "الطلب" },
              { key: "customer", label: "العميل" },
              { key: "date", label: "تاريخ التسليم" },
              { key: "warehouse", label: "المستودع" },
              { key: "amount", label: "القيمة" },
              { key: "status", label: "الحالة" },
              { key: "plan", label: "الخطة" },
              { key: "view", label: "عرض" },
            ]}
            visible={visible}
            onToggle={(key) => setVisible((current) => ({ ...current, [key]: !current[key] }))}
          />
        </div>
      }
    >
      {isLoading ? <LoadingRows /> : filtered.length === 0 ? (
        <AdminEmptyState title="لا توجد شحنات مطابقة" description="جرّب تعديل تاريخ التسليم أو المرشحات الحالية." icon={<ClipboardDocumentListIcon className="h-6 w-6" />} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm" dir="rtl">
              <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  {visible.select ? <th className="w-12 px-4 py-3 text-center"><input type="checkbox" checked={allVisibleSelected} disabled={selectablePageRows.length === 0} onChange={(event) => onSelectedChange(event.target.checked ? Array.from(new Set([...selected, ...selectablePageRows.map((row) => row.orderId)])) : selected.filter((id) => !selectablePageRows.some((row) => row.orderId === id)))} /></th> : null}
                  {visible.order ? <SortableTh label="الطلب" sortKey="order" sort={sort} toggle={handleSortToggle} /> : null}
                  {visible.customer ? <SortableTh label="العميل" sortKey="customer" sort={sort} toggle={handleSortToggle} /> : null}
                  {visible.date ? <SortableTh label="تاريخ التسليم" sortKey="date" sort={sort} toggle={handleSortToggle} /> : null}
                  {visible.warehouse ? <th className="px-4 py-3">المستودع/المنطقة</th> : null}
                  {visible.amount ? <SortableTh label="القيمة" sortKey="amount" sort={sort} toggle={handleSortToggle} /> : null}
                  {visible.status ? <SortableTh label="الحالة" sortKey="status" sort={sort} toggle={handleSortToggle} /> : null}
                  {visible.plan ? <SortableTh label="الخطة" sortKey="plan" sort={sort} toggle={handleSortToggle} /> : null}
                  {visible.view ? <th className="px-4 py-3">عرض</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {pageRows.map((row) => {
                  const status = row.existingPlanId ? { label: "ضمن خطة", tone: "blue" as const } : shipmentStatusInfo(String(row.shipmentStatus ?? "PENDING_ASSIGN"));
                  return (
                    <tr key={row.orderId} className="bg-white hover:bg-brand-25 dark:bg-transparent dark:hover:bg-white/[0.02]">
                      {visible.select ? (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selected.includes(row.orderId)}
                            onChange={(event) => onSelectedChange(event.target.checked ? [...selected, row.orderId] : selected.filter((id) => id !== row.orderId))}
                            disabled={Boolean(row.existingPlanId)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:opacity-40"
                          />
                        </td>
                        ) : null}
                      {visible.order ? <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white" dir="ltr">{row.orderName}</td> : null}
                      {visible.customer ? <td className="px-4 py-4"><div className="flex items-center gap-3"><CustomerAvatar name={row.customerName ?? "عميل"} size="sm" /><span>{row.customerName ?? "--"}</span></div></td> : null}
                      {visible.date ? <td className="px-4 py-4">{formatDate(row.commitmentDate)}</td> : null}
                      {visible.warehouse ? <td className="px-4 py-4 text-gray-500 dark:text-gray-400">{row.warehouseId ?? "--"}</td> : null}
                      {visible.amount ? <td className="px-4 py-4 font-semibold">{formatMoney(row.amount, row.currency)}</td> : null}
                      {visible.status ? <td className="px-4 py-4"><StatusBadge label={status.label} tone={status.tone} /></td> : null}
                      {visible.plan ? <td className="px-4 py-4">{row.existingPlanId ? <Link className="text-brand-600 hover:underline" to={`/logistics/plans/draft/${row.existingPlanId}`}>فتح الخطة</Link> : <span className="text-gray-400">غير مخطط</span>}</td> : null}
                      {visible.view ? (
                        <td className="px-4 py-4">
                          {row.existingShipmentId ? (
                            <Link
                              to={`/logistics/shipments/${row.existingShipmentId}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-25 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-brand-25 transition dark:bg-white/[0.02] dark:text-gray-300"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              عرض
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </AdminSection>
  );
}

export function LogisticsOverviewPage() {
  const { data, isLoading, error } = useQuery({ queryKey: [...ROOT_QUERY, "overview"], queryFn: fetchLogisticsDashboard });
  const plans = data?.plans ?? [];
  const shipments = data?.shipments ?? [];
  const drivers = data?.drivers ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = tomorrowDate();
  const delayedShipments = shipments.filter((shipment) => shipment.deliveryDate && shipment.deliveryDate < today && !["DELIVERED", "FINISHED", "SETTLED", "CANCELLED"].includes(shipment.status));
  const delivered = shipments.filter((shipment) => ["DELIVERED", "FINISHED", "SETTLED"].includes(shipment.status)).length;

  return (
    <>
      <PageMeta title="اللوجستيات | لوحة التحكم" description="لوحة إدارة اللوجستيات التشغيلية" />
      <AdminPageFrame dir="rtl">
        <AdminPageHero
          eyebrow="Logistics Command Center"
          title="لوحة اللوجستيات"
          description="نظرة عملية على الخطط والشحنات والسائقين، مع إبراز ما يحتاج قرارًا سريعًا."
          actions={
            <>
              <Link to="/logistics/shipments"><ToolbarButton variant="outline"><ClipboardDocumentListIcon className="h-4 w-4" />تخطيط الشحنات</ToolbarButton></Link>
              <Link to="/logistics/plans/new"><ToolbarButton variant="primary"><PlusIcon className="h-4 w-4" />خطة جديدة</ToolbarButton></Link>
            </>
          }
        />
        <ErrorNotice message={error instanceof Error ? error.message : null} />
        <AdminMetricGrid>
          <AdminMetricCard label="خطط نشطة" value={plans.filter((plan) => plan.status === "in_progress").length} helper="قيد التنفيذ" icon={<RocketLaunchIcon className="h-6 w-6" />} tone="blue" />
          <AdminMetricCard label="مسودات" value={plans.filter((plan) => plan.status === "pending" && !plan.preparationStatus).length} helper="تحتاج مراجعة أو تأكيد" icon={<ClipboardDocumentListIcon className="h-6 w-6" />} tone="amber" />
          <AdminMetricCard label="مكتملة" value={plans.filter((plan) => plan.status === "completed").length} helper="خطط مغلقة" icon={<CheckCircleIcon className="h-6 w-6" />} tone="emerald" />
          <AdminMetricCard label="متأخرة" value={delayedShipments.length} helper="شحنات قبل اليوم ولم تغلق" icon={<CalendarDaysIcon className="h-6 w-6" />} tone="rose" />
        </AdminMetricGrid>
        <AdminMetricGrid>
          <AdminMetricCard label="اليوم" value={shipments.filter((shipment) => shipment.deliveryDate === today).length} helper="شحنات بتاريخ تسليم اليوم" tone="blue" />
          <AdminMetricCard label="غدًا" value={shipments.filter((shipment) => shipment.deliveryDate === tomorrow).length} helper="جاهزة للتخطيط المبكر" tone="violet" />
          <AdminMetricCard label="غير مخططة" value={shipments.filter((shipment) => !shipment.planId && !["DELIVERED", "FINISHED", "SETTLED", "CANCELLED"].includes(shipment.status)).length} helper="تحتاج خطة أو سائق" tone="amber" />
          <AdminMetricCard label="نسبة التسليم" value={`${shipments.length ? Math.round((delivered / shipments.length) * 100) : 0}%`} helper="من إجمالي الشحنات" tone="emerald" />
        </AdminMetricGrid>
        <LiveTrackingMapSection className="mt-6" />
        <div className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-[1.4fr_0.8fr]">
          <DriverOverviewTable drivers={drivers} isLoading={isLoading} />
          <RecentActivity activities={data?.activities ?? []} />
        </div>
      </AdminPageFrame>
    </>
  );
}

function DriverOverviewTable({ drivers, isLoading }: { drivers: LogisticsDriver[]; isLoading: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { sort, toggle, sorted } = useSort(null);
  const filtered = useMemo(() => drivers.filter((driver) => includesSearch([driver.name, driver.phone, driver.email, driver.currentPlan, driver.workLocation], search)), [drivers, search]);
  const sortedRows = useMemo(() => sorted(filtered, {
    name: (d) => d.name,
    status: (d) => d.status,
    vehicleType: (d) => d.vehicleType ?? "",
    currentPlan: (d) => d.currentPlan ?? "",
    workload: (d) => d.workload ?? 0,
    lastLocation: (d) => d.lastLocation ?? "",
    lastActivity: (d) => d.lastActivity ?? "",
    todayDeliveries: (d) => d.todayDeliveries ?? 0,
    successRate: (d) => d.successRate ?? 0,
    balance: (d) => d.dueBalance + d.codAmount + d.collectionAmount,
  }), [filtered, sort]);
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <AdminSection
      title="السائقون"
      description="حالة السائقين، عبء العمل، الأداء، والموقع الأخير."
      actions={
        <>
          <SearchBox value={search} onChange={setSearch} placeholder="بحث عن سائق" />
          <Link to="/admin/users/new"><ToolbarButton variant="primary"><UserPlusIcon className="h-4 w-4" />إنشاء سائق/مستخدم</ToolbarButton></Link>
        </>
      }
    >
      {isLoading ? <LoadingRows /> : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-right text-sm" dir="rtl">
              <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  <SortableTh label="السائق" sortKey="name" sort={sort} toggle={toggle} />
                  <SortableTh label="الحالة" sortKey="status" sort={sort} toggle={toggle} />
                  <SortableTh label="المركبة" sortKey="vehicleType" sort={sort} toggle={toggle} />
                  <SortableTh label="الخطة" sortKey="currentPlan" sort={sort} toggle={toggle} />
                  <SortableTh label="العبء" sortKey="workload" sort={sort} toggle={toggle} />
                  <SortableTh label="الموقع" sortKey="lastLocation" sort={sort} toggle={toggle} />
                  <SortableTh label="النشاط" sortKey="lastActivity" sort={sort} toggle={toggle} />
                  <SortableTh label="تسليم اليوم" sortKey="todayDeliveries" sort={sort} toggle={toggle} />
                  <SortableTh label="الأداء" sortKey="successRate" sort={sort} toggle={toggle} />
                  <SortableTh label="المستحقات" sortKey="balance" sort={sort} toggle={toggle} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {pageRows.map((driver) => (
                  <tr key={driver.id}>
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><CustomerAvatar name={driver.name} size="sm" shape="circle" /><div><p className="font-semibold text-gray-900 dark:text-white">{driver.name}</p><p className="text-xs text-gray-400">{driver.phone ?? driver.email ?? "--"}</p></div></div></td>
                    <td className="px-4 py-4"><div className="flex flex-col gap-1"><StatusBadge label={driver.onlineStatus === "online" ? "متصل" : "غير متصل"} tone={driver.onlineStatus === "online" ? "green" : "gray"} dot /><StatusBadge label={driver.status === "active" ? "نشط" : "موقوف"} tone={driver.status === "active" ? "blue" : "red"} /></div></td>
                    <td className="px-4 py-4">{driver.vehicleType}</td>
                    <td className="px-4 py-4">{driver.currentPlan ?? "--"}</td>
                    <td className="px-4 py-4">{driver.workload} / {driver.shipments}</td>
                    <td className="px-4 py-4">{driver.lastLocation ?? "--"}</td>
                    <td className="px-4 py-4">{formatDateTime(driver.lastActivity)}</td>
                    <td className="px-4 py-4">{driver.todayDeliveries}</td>
                    <td className="px-4 py-4">{driver.successRate}%</td>
                    <td className="px-4 py-4">{formatMoney(driver.dueBalance + driver.codAmount + driver.collectionAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </AdminSection>
  );
}

function RecentActivity({ activities }: { activities: Array<{ id: string; title: string; description: string; timestamp: string; tone: StatusBadgeTone }> }) {
  return (
    <AdminSection title="النشاط الأخير" description="آخر تغييرات الشحنات والخطط.">
      {activities.length === 0 ? (
        <AdminEmptyState title="لا يوجد نشاط حديث" description="ستظهر أحداث الخطط والشحنات هنا عند بدء التشغيل." icon={<ArrowPathIcon className="h-6 w-6" />} />
      ) : (
        <ol className="space-y-4">
          {activities.map((activity) => (
            <li key={activity.id} className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.title}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{activity.description}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(activity.timestamp)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </AdminSection>
  );
}

export function LogisticsShipmentsPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(tomorrowRange);
  const [selected, setSelected] = useState<string[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const query = useQuery({ queryKey: [...ROOT_QUERY, "shipment-candidates", dateRange[0]?.toISOString(), dateRange[1]?.toISOString()], queryFn: () => fetchShipmentCandidates(dateRange) });
  const selectedCandidates = useMemo(
    () => (query.data ?? []).filter((candidate) => selected.includes(candidate.orderId)),
    [query.data, selected],
  );
  return (
    <>
      <PageMeta title="اللوجستيات | الشحنات" description="مصدر تخطيط الشحنات حسب تاريخ التسليم" />
      <AdminPageFrame dir="rtl">
        <AdminPageHero eyebrow="Delivery Date Planning" title="الشحنات" description="اختر تاريخ التسليم المطلوب ثم كوّن خطة تشغيلية من الشحنات المتاحة." actions={
          <>
            <ToolbarButton onClick={() => setTransferOpen(true)}>
              <ArrowPathIcon className="h-4 w-4" />
              نقل / إضافة شحنات
            </ToolbarButton>
            <Link to="/logistics/plans/new"><ToolbarButton variant="primary"><PlusIcon className="h-4 w-4" />خطة جديدة</ToolbarButton></Link>
          </>
        } />
        <AdminSection title="نطاق تاريخ التسليم" description="الافتراضي هو غدًا لأن التخطيط يتم قبل يوم التسليم.">
          <div className="max-w-md"><DateRangePicker id="logistics-shipments-range" label="تاريخ التسليم" placeholder="اختر تاريخ التسليم" value={dateRange} onChange={setDateRange} /></div>
        </AdminSection>
        <ErrorNotice message={query.error instanceof Error ? query.error.message : null} />
        {selected.length > 0 ? <PlanCreatePanel selectedCandidates={selectedCandidates} /> : null}
        <ShipmentCandidateTable rows={query.data ?? []} isLoading={query.isLoading} selected={selected} onSelectedChange={setSelected} />
        <ShipmentTransferModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          sourcePlan={null}
          currentShipments={[]}
          onSuccess={() => query.refetch()}
        />
      </AdminPageFrame>
    </>
  );
}

export function LogisticsNewPlanPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(tomorrowRange);
  const [selected, setSelected] = useState<string[]>([]);
  const query = useQuery({ queryKey: [...ROOT_QUERY, "new-plan-candidates", dateRange[0]?.toISOString(), dateRange[1]?.toISOString()], queryFn: () => fetchShipmentCandidates(dateRange) });
  const selectedCandidates = useMemo(
    () => (query.data ?? []).filter((candidate) => selected.includes(candidate.orderId)),
    [query.data, selected],
  );
  return (
    <>
      <PageMeta title="اللوجستيات | خطة جديدة" description="إنشاء خطة لوجستية جديدة" />
      <AdminPageFrame dir="rtl">
        <AdminPageHero eyebrow="New Plan" title="إنشاء خطة جديدة" description="فلتر الشحنات حسب تاريخ التسليم، اختر السائق، ثم تابع إلى مساحة التخطيط." />
        <AdminSection title="تاريخ التسليم" description="كل المرشحات والنتائج تعتمد على تاريخ الالتزام.">
          <div className="max-w-md"><DateRangePicker id="logistics-new-plan-range" label="تاريخ التسليم" placeholder="اختر تاريخ التسليم" value={dateRange} onChange={setDateRange} /></div>
        </AdminSection>
        <ErrorNotice message={query.error instanceof Error ? query.error.message : null} />
        <PlanCreatePanel selectedCandidates={selectedCandidates} />
        <ShipmentCandidateTable rows={query.data ?? []} isLoading={query.isLoading} selected={selected} onSelectedChange={setSelected} planningMode />
      </AdminPageFrame>
    </>
  );
}

type PlanColumn = "select" | "reference" | "date" | "driver" | "district" | "shipments" | "status" | "distance" | "created";

export function LogisticsPlansPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [visible, setVisible] = useState<Record<PlanColumn, boolean>>({ select: true, reference: true, date: true, driver: true, district: true, shipments: true, status: true, distance: true, created: true });
  const { sort: planSort, toggle: planToggle, sorted: planSorted } = useSort({ key: "date", direction: "asc" });
  const query = useQuery({ queryKey: [...ROOT_QUERY, "plans"], queryFn: fetchLogisticsPlans });
  const driversQuery = useQuery({ queryKey: [...ROOT_QUERY, "drivers"], queryFn: fetchLogisticsDrivers });
  const drivers = driversQuery.data ?? [];
  const bulkOptimize = useMutation({
    mutationFn: async () => {
      for (const planId of selected) await optimizePlan(planId);
    },
    onSuccess: async () => {
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ROOT_QUERY });
    },
  });
  const quickStatusChange = useMutation({
    mutationFn: ({ planId, newStatus }: { planId: string; newStatus: string }) => updatePlanStatus(planId, newStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOT_QUERY }),
  });
  const filteredRows = (query.data ?? [])
    .filter((plan) => includesSearch([plan.reference, plan.driverName, plan.district, plan.status], search))
    .filter((plan) => {
      if (tab === "all") return true;
      if (tab === "draft") return plan.status === "pending" && !plan.preparationStatus;
      if (tab === "ready") return plan.preparationStatus === "ready";
      if (tab === "active") return plan.status === "pending" && Boolean(plan.preparationStatus);
      return plan.status === tab;
    });
  const rows = useMemo(() => planSorted(filteredRows, {
    reference: (r) => r.reference,
    date: (r) => r.plannedDate ?? "",
    driver: (r) => r.driverName ?? "",
    district: (r) => r.district ?? "",
    shipments: (r) => r.shipmentCount ?? 0,
    status: (r) => r.status,
    distance: (r) => r.routeDistanceKm ?? 0,
    created: (r) => r.createdAt ?? "",
  }), [filteredRows, planSort]);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <>
      <PageMeta title="اللوجستيات | الخطط" description="إدارة خطط اللوجستيات" />
      <AdminPageFrame dir="rtl">
        <AdminPageHero eyebrow="Plans" title="خطط اللوجستيات" description="إدارة الخطط، حالاتها، السائقين، والمسارات." actions={<Link to="/logistics/plans/new"><ToolbarButton variant="primary"><PlusIcon className="h-4 w-4" />إنشاء خطة</ToolbarButton></Link>} />
        <ErrorNotice message={query.error instanceof Error ? query.error.message : bulkOptimize.error instanceof Error ? bulkOptimize.error.message : null} />
        <AdminSection
          title="قائمة الخطط"
          description="تابع الخطط حسب الحالة وتاريخ التسليم."
          actions={
            <div className="flex flex-wrap gap-2">
              <SearchBox value={search} onChange={setSearch} placeholder="بحث في الخطط" />
              <ColumnVisibility columns={[{ key: "reference", label: "الخطة" }, { key: "date", label: "التاريخ" }, { key: "driver", label: "السائق" }, { key: "district", label: "المنطقة" }, { key: "shipments", label: "الشحنات" }, { key: "status", label: "الحالة" }, { key: "distance", label: "المسافة" }, { key: "created", label: "الإنشاء" }]} visible={visible} onToggle={(key) => setVisible((current) => ({ ...current, [key]: !current[key] }))} />
              <ToolbarButton disabled={selected.length === 0 || bulkOptimize.isPending} onClick={() => bulkOptimize.mutate()}><RocketLaunchIcon className="h-4 w-4" />تحسين المحدد</ToolbarButton>
            </div>
          }
        >
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {[["all", "الكل"], ["draft", "مسودات"], ["active", "لدى الديسباتشر"], ["ready", "جاهزة"], ["in_progress", "قيد التنفيذ"], ["completed", "مكتملة"], ["cancelled", "ملغاة"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${tab === key ? "bg-brand-500 text-white" : "bg-brand-25 text-gray-700 hover:bg-brand-25 dark:bg-white/[0.02] dark:text-gray-200"}`}>{label}</button>
            ))}
          </div>
          {query.isLoading ? <LoadingRows /> : rows.length === 0 ? <AdminEmptyState title="لا توجد خطط" description="أنشئ خطة جديدة من شحنات تاريخ التسليم المطلوب." icon={<ClipboardDocumentListIcon className="h-6 w-6" />} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm" dir="rtl">
                  <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
                    <tr>
                      {visible.select ? <th className="w-12 px-4 py-3"></th> : null}
                      {visible.reference ? <SortableTh label="الخطة" sortKey="reference" sort={planSort} toggle={planToggle} /> : null}
                      {visible.date ? <SortableTh label="تاريخ التسليم" sortKey="date" sort={planSort} toggle={planToggle} /> : null}
                      {visible.driver ? <SortableTh label="السائق" sortKey="driver" sort={planSort} toggle={planToggle} /> : null}
                      {visible.district ? <SortableTh label="المنطقة" sortKey="district" sort={planSort} toggle={planToggle} /> : null}
                      {visible.shipments ? <SortableTh label="الشحنات" sortKey="shipments" sort={planSort} toggle={planToggle} /> : null}
                      {visible.status ? <SortableTh label="الحالة" sortKey="status" sort={planSort} toggle={planToggle} /> : null}
                      {visible.distance ? <SortableTh label="المسافة" sortKey="distance" sort={planSort} toggle={planToggle} /> : null}
                      {visible.created ? <SortableTh label="تاريخ الإنشاء" sortKey="created" sort={planSort} toggle={planToggle} /> : null}
                      <th className="px-4 py-3">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {pageRows.map((plan) => {
                      const status = planStatusInfo(plan.status, plan.preparationStatus);
                      return (
                        <tr key={plan.id}>
                          {visible.select ? <td className="px-4 py-4"><input type="checkbox" checked={selected.includes(plan.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, plan.id] : selected.filter((id) => id !== plan.id))} /></td> : null}
                          {visible.reference ? <td className="px-4 py-4"><p className="font-semibold text-gray-900 dark:text-white">{formatPlanDisplayName(plan, drivers)}</p><p className="mt-0.5 text-[11px] text-gray-400" dir="ltr">{plan.reference}</p></td> : null}
                          {visible.date ? <td className="px-4 py-4">{formatDate(plan.plannedDate)}</td> : null}
                          {visible.driver ? <td className="px-4 py-4">{plan.driverName ?? "بدون سائق"}</td> : null}
                          {visible.district ? <td className="px-4 py-4">{plan.district ?? "—"}</td> : null}
                          {visible.shipments ? <td className="px-4 py-4">{plan.shipmentCount}</td> : null}
                          {visible.status ? <td className="px-4 py-4"><StatusBadge label={status.label} tone={status.tone} /></td> : null}
                          {visible.distance ? <td className="px-4 py-4">{formatDistance(plan.routeDistanceKm)}</td> : null}
                          {visible.created ? <td className="px-4 py-4">{formatDate(plan.createdAt)}</td> : null}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Link to={`/logistics/plans/draft/${plan.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-25 dark:hover:bg-white/[0.02]" aria-label="فتح الخطة"><EyeIcon className="h-5 w-5" /></Link>
                              {plan.status !== "completed" && plan.status !== "cancelled" && (
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      quickStatusChange.mutate({ planId: plan.id, newStatus: e.target.value });
                                      e.target.value = "";
                                    }
                                  }}
                                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                >
                                  <option value="">تغيير الحالة</option>
                                  {plan.status === "pending" && <option value="in_progress">بدء الخطة</option>}
                                  {plan.status === "in_progress" && <option value="completed">إكمال</option>}
                                  {(plan.status === "pending" || plan.status === "in_progress") && <option value="cancelled">إلغاء</option>}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={rows.length} onPageChange={setPage} />
            </>
          )}
        </AdminSection>
      </AdminPageFrame>
    </>
  );
}

function PlanItemsSummary({ items }: { items: LogisticsPlanItem[] }) {
  const { sort, toggle, sorted } = useSort(null);
  const sortedItems = useMemo(() => sorted(items, {
    productName: (i) => i.productName,
    productRef: (i) => i.productRef ?? "",
    requestedQuantity: (i) => i.requestedQuantity ?? 0,
    reservedQuantity: (i) => i.reservedQuantity ?? 0,
    doneQuantity: (i) => i.doneQuantity ?? 0,
    shipmentCount: (i) => i.shipmentCount ?? 0,
  }), [items, sort]);
  return (
    <AdminSection title="ملخص المنتجات" description="المنتجات المجمعة من أوامر البيع داخل شحنات الخطة.">
      {items.length === 0 ? (
        <AdminEmptyState
          title="لا توجد منتجات داخل الخطة"
          description="تأكد أن الشحنات مرتبطة بطلبات تحتوي على بنود منتجات، أو أعد إنشاء الخطة بعد مزامنة أوامر البيع."
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm" dir="rtl">
            <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr>
                <SortableTh label="المنتج" sortKey="productName" sort={sort} toggle={toggle} />
                <SortableTh label="الكود" sortKey="productRef" sort={sort} toggle={toggle} />
                <SortableTh label="الكمية المطلوبة" sortKey="requestedQuantity" sort={sort} toggle={toggle} />
                <SortableTh label="المحجوز" sortKey="reservedQuantity" sort={sort} toggle={toggle} />
                <SortableTh label="تم التحميل" sortKey="doneQuantity" sort={sort} toggle={toggle} />
                <SortableTh label="الشحنات" sortKey="shipmentCount" sort={sort} toggle={toggle} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedItems.map((item) => (
                <tr key={item.key}>
                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">{item.productName}</td>
                  <td className="px-4 py-4" dir="ltr">{item.productRef ?? "--"}</td>
                  <td className="px-4 py-4">{formatNumber(item.requestedQuantity, 1)}</td>
                  <td className="px-4 py-4">{formatNumber(item.reservedQuantity, 1)}</td>
                  <td className="px-4 py-4">{formatNumber(item.doneQuantity, 1)}</td>
                  <td className="px-4 py-4">{formatNumber(item.shipmentCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  );
}

type TransferMode = "transfer" | "add";

function ShipmentTransferModal({
  open,
  onClose,
  sourcePlan,
  currentShipments,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  sourcePlan: LogisticsPlan | null;
  currentShipments: LogisticsShipment[];
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<TransferMode>("transfer");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetPlanId, setTargetPlanId] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);

  const activePlansQuery = useQuery({
    queryKey: [...ROOT_QUERY, "activePlans"],
    queryFn: () => fetchActivePlans(sourcePlan?.id),
    enabled: open,
  });
  const activePlans = activePlansQuery.data ?? [];

  const unassignedQuery = useQuery({
    queryKey: [...ROOT_QUERY, "unassignedShipments"],
    queryFn: fetchUnassignedShipments,
    enabled: open && mode === "add",
  });
  const unassignedShipments = unassignedQuery.data ?? [];

  const allAssignedQuery = useQuery({
    queryKey: [...ROOT_QUERY, "allAssignedShipments"],
    queryFn: fetchAllAssignedShipments,
    enabled: open && mode === "transfer" && !sourcePlan,
  });
  const allAssignedShipments = allAssignedQuery.data ?? [];

  const targetPlan = activePlans.find((p) => p.id === targetPlanId);

  const sourceShipments = mode === "transfer"
    ? (sourcePlan
        ? currentShipments.filter((s) => s.status === "PENDING_ASSIGN" || s.status === "ASSIGNED")
        : allAssignedShipments)
    : unassignedShipments;

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!targetPlanId) throw new Error("اختر الخطة المستهدفة.");
      if (selectedIds.length === 0) throw new Error("اختر شحنة واحدة على الأقل.");
      if (mode === "transfer") {
        return transferShipmentsBetweenPlans(selectedIds, targetPlanId);
      } else {
        return addUnassignedShipmentsToPlan(selectedIds, targetPlanId);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ROOT_QUERY });
      setSelectedIds([]);
      setTargetPlanId("");
      setConfirmStep(false);
      onSuccess();
      onClose();
    },
  });

  if (!open) return null;

  const toggleId = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleAll = () => {
    if (selectedIds.length === sourceShipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sourceShipments.map((s) => s.id));
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col dark:bg-gray-900 dark:border-gray-800 border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {mode === "transfer" ? "نقل شحنات" : "إضافة شحنات"}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {mode === "transfer"
              ? "اختر الشحنات من الخطة الحالية ثم حدد الخطة المستهدفة للنقل."
              : "اختر الشحنات غير المُسندة ثم حدد الخطة لإضافتها."}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 px-6 pt-4">
          <button
            onClick={() => { setMode("transfer"); setSelectedIds([]); setTargetPlanId(""); setConfirmStep(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              mode === "transfer" ? "bg-blue-600 text-white" : "bg-brand-25 text-gray-600 hover:bg-brand-25 dark:bg-white/[0.02] dark:text-gray-300"
            }`}
          >
            نقل من الخطة
          </button>
          <button
            onClick={() => { setMode("add"); setSelectedIds([]); setTargetPlanId(""); setConfirmStep(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              mode === "add" ? "bg-emerald-600 text-white" : "bg-brand-25 text-gray-600 hover:bg-brand-25 dark:bg-white/[0.02] dark:text-gray-300"
            }`}
          >
            إضافة شحنات جديدة
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Shipments Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {mode === "transfer" ? "الشحنات في الخطة الحالية" : "الشحنات غير المُسندة"}
              </h3>
              {sourceShipments.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === sourceShipments.length && sourceShipments.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                  تحديد الكل ({sourceShipments.length})
                </label>
              )}
            </div>
            {sourceShipments.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                {mode === "transfer" ? "لا توجد شحنات قابلة للنقل في هذه الخطة." : "لا توجد شحنات غير مُسندة."}
              </p>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-right" dir="rtl">
                  <thead className="bg-brand-25 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-3 py-2 w-10"></th>
                      <th className="px-3 py-2">الشحنة</th>
                      <th className="px-3 py-2">العميل</th>
                      <th className="px-3 py-2">القيمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sourceShipments.map((shipment) => (
                      <tr
                        key={shipment.id}
                        onClick={() => toggleId(shipment.id)}
                        className={`cursor-pointer transition ${
                          selectedIds.includes(shipment.id)
                            ? "bg-blue-50 dark:bg-blue-500/10"
                            : "hover:bg-brand-25 dark:hover:bg-white/[0.02]/50"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(shipment.id)}
                            onChange={() => toggleId(shipment.id)}
                            className="rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white" dir="ltr">{shipment.orderName ?? shipment.reference}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{shipment.customerName ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{shipment.totalGmv ? `${formatMoney(shipment.totalGmv)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Target Plan Selector */}
          {selectedIds.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                اختر الخطة المستهدفة
              </h3>
              <select
                value={targetPlanId}
                onChange={(event) => { setTargetPlanId(event.target.value); setConfirmStep(false); }}
                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">اختر خطة نشطة...</option>
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatPlanDisplayName(p)} — {p.shipmentCount} شحنة
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Plan Shipments Preview */}
          {targetPlanId && targetPlan && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-brand-25/50 dark:bg-white/[0.02]/30">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                شحنات الخطة المستهدفة ({targetPlan.shipmentCount})
              </p>
              {targetPlan.shipmentCount === 0 ? (
                <p className="text-xs text-gray-400">الخطة فارغة حالياً</p>
              ) : (
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  سيتم إضافة/نقل {selectedIds.length} شحنة إلى الخطة. الترتيب التلقائي سيتم بعد النقل.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {selectedIds.length > 0 && `${selectedIds.length} شحنة محددة`}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-brand-25 dark:text-gray-300 dark:hover:bg-white/[0.02] transition">
              إلغاء
            </button>
            {!confirmStep ? (
              <button
                onClick={() => setConfirmStep(true)}
                disabled={selectedIds.length === 0 || !targetPlanId}
                className={`px-6 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === "transfer" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {mode === "transfer" ? "نقل" : "إضافة"}
              </button>
            ) : (
              <button
                onClick={() => transferMutation.mutate()}
                disabled={transferMutation.isPending}
                className="px-6 py-2 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 transition disabled:opacity-50"
              >
                {transferMutation.isPending ? "جاري التنفيذ..." : "تأكيد"}
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {transferMutation.error && (
          <div className="px-6 pb-4">
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg px-3 py-2">
              {transferMutation.error instanceof Error ? transferMutation.error.message : "حدث خطأ"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function LogisticsDraftPlanPage() {
  const { planId = "" } = useParams();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [...ROOT_QUERY, "plan", planId], queryFn: () => fetchPlanDetails(planId), enabled: Boolean(planId) });
  const plan = query.data?.plan ?? null;
  const shipments = query.data?.shipments ?? [];
  const items = query.data?.items ?? [];
  const drivers = query.data?.drivers ?? [];
  const [driverId, setDriverId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const { sort: shipmentSort, toggle: shipmentToggle, sorted: shipmentSorted } = useSort(null);
  const displayShipments = useMemo(() => shipmentSorted(shipments, {
    reference: (s) => s.reference,
    customer: (s) => s.customerName ?? "",
    status: (s) => s.status,
    date: (s) => s.scheduledAt ?? "",
    distance: (s) => s.distanceKm ?? 0,
  }), [shipments, shipmentSort]);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ROOT_QUERY });
    await queryClient.refetchQueries({ queryKey: [...ROOT_QUERY, "plan", planId], type: "active" });
  };
  const optimize = useMutation({ mutationFn: () => optimizePlan(planId), onSuccess: refresh });
  const confirm = useMutation({ mutationFn: () => startDispatcherPreparation(planId), onSuccess: async () => { setConfirmOpen(false); await refresh(); } });
  const assignDriver = useMutation({
    mutationFn: () => {
      const driver = drivers.find((item) => item.id === driverId);
      if (!driver || !plan) throw new Error("اختر سائقًا صالحًا.");
      return assignPlanDriver(plan.id, driver, shipments.map((shipment) => shipment.id), plan.plannedDate);
    },
    onSuccess: refresh,
  });
  const updateDate = useMutation({
    mutationFn: () => {
      if (!plan) throw new Error("الخطة غير موجودة.");
      return updatePlanDate(plan.id, plannedDate || plan.plannedDate, shipments.map((shipment) => shipment.id));
    },
    onSuccess: refresh,
  });
  const removeShipment = useMutation({ mutationFn: removeShipmentFromPlan, onSuccess: refresh });
  const resequence = useMutation({ mutationFn: ({ shipmentId, sequence }: { shipmentId: string; sequence: number }) => setShipmentSequence(planId, shipmentId, sequence), onSuccess: refresh });
  const changePlanStatus = useMutation({
    mutationFn: ({ newStatus, reason }: { newStatus: string; reason?: string }) => updatePlanStatus(planId, newStatus, reason),
    onSuccess: refresh,
  });
  const changeShipmentStatus = useMutation({
    mutationFn: ({ shipmentId, newStatus }: { shipmentId: string; newStatus: string }) => updateShipmentStatus(shipmentId, newStatus),
    onSuccess: refresh,
  });
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");
  const mutationError = [optimize.error, confirm.error, assignDriver.error, updateDate.error, removeShipment.error, resequence.error, changePlanStatus.error, changeShipmentStatus.error].find(Boolean);

  if (query.isLoading) {
    return <AdminPageFrame dir="rtl"><LoadingRows /></AdminPageFrame>;
  }

  if (!plan) {
    return <AdminPageFrame dir="rtl"><AdminEmptyState title="الخطة غير موجودة" description="ربما تم حذف الخطة أو لا تملك صلاحية الوصول إليها." /></AdminPageFrame>;
  }

  const status = planStatusInfo(plan.status, plan.preparationStatus);
  const isSentToDispatcher = Boolean(plan.preparationStatus);
  const canConfirmPlan = shipments.length > 0 && plan.status === "pending" && !isSentToDispatcher;
  const totalWeight = shipments.reduce((sum, shipment) => sum + Number(shipment.totalWeight ?? 0), 0);
  const planDistance = displayDistanceKm(plan.routeDistanceKm);
  const shipmentDistance = shipments.reduce((sum, shipment) => sum + (displayDistanceKm(shipment.distanceKm) ?? 0), 0);
  const totalDistance = planDistance && planDistance > 0 ? planDistance : shipmentDistance;
  const totalValue = shipments.reduce((sum, shipment) => sum + Number(shipment.totalGmv ?? 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.requestedQuantity, 0);

  return (
    <>
      <PageMeta title={`اللوجستيات | ${plan.reference}`} description="مساحة تخطيط الخطة اللوجستية" />
      <AdminPageFrame dir="rtl">
        <AdminPageHero
          eyebrow="Draft Plan Workspace"
          title={plan.reference}
          description="مساحة العمل قبل ظهور الخطة للسائق. التأكيد هنا يرسلها إلى تجهيز الديسباتشر فقط."
          meta={<StatusBadge label={status.label} tone={status.tone} />}
          actions={
            <>
              <ToolbarButton onClick={() => optimize.mutate()} disabled={optimize.isPending || shipments.length === 0}><RocketLaunchIcon className="h-4 w-4" />تحسين المسار</ToolbarButton>
              {plan.status === "pending" && (
                <ToolbarButton variant="primary" onClick={() => setConfirmOpen(true)} disabled={!canConfirmPlan || confirm.isPending}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {isSentToDispatcher ? "تم إرسالها للديسباتشر" : "تأكيد الخطة"}
                </ToolbarButton>
              )}
              {plan.status === "pending" && (
                <ToolbarButton onClick={() => { setPendingStatus("in_progress"); setStatusConfirmOpen(true); }} disabled={changePlanStatus.isPending}>
                  بدء الخطة
                </ToolbarButton>
              )}
              {plan.status === "in_progress" && (
                <>
                  <ToolbarButton variant="primary" onClick={() => { setPendingStatus("completed"); setStatusConfirmOpen(true); }} disabled={changePlanStatus.isPending}>
                    إكمال الخطة
                  </ToolbarButton>
                  <ToolbarButton onClick={() => { setPendingStatus("cancelled"); setStatusConfirmOpen(true); }} disabled={changePlanStatus.isPending}>
                    إلغاء الخطة
                  </ToolbarButton>
                </>
              )}
            </>
          }
        />
        <ErrorNotice message={mutationError instanceof Error ? mutationError.message : query.error instanceof Error ? query.error.message : null} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          تأكيد الخطة لا يرسلها مباشرة إلى تطبيق السائق. يجب أن يجهز الديسباتشر محتويات الشحنات أولًا، وبعد تأكيد الجاهزية تظهر للسائق.
        </div>
        <AdminMetricGrid>
          <AdminMetricCard label="عدد الشحنات" value={shipments.length} helper="داخل الخطة" icon={<TruckIcon className="h-6 w-6" />} tone="blue" />
          <AdminMetricCard label="المنتجات" value={formatNumber(items.length)} helper={`${formatNumber(totalQuantity, 1)} كمية مطلوبة`} icon={<ClipboardDocumentListIcon className="h-6 w-6" />} tone="blue" />
          <AdminMetricCard label="الوزن الإجمالي" value={`${formatNumber(totalWeight, 1)} كجم`} helper="من بيانات الشحنات" tone="slate" />
          <AdminMetricCard label="المسافة" value={totalDistance > 0 ? `${formatNumber(totalDistance, 1)} كم` : "--"} helper={planDistance ? "بعد التحسين" : "من مسافات الشحنات"} icon={<MapPinIcon className="h-6 w-6" />} tone="emerald" />
          <AdminMetricCard label="قيمة الشحنات" value={formatMoney(totalValue)} helper="للمراجعة المالية" tone="violet" />
        </AdminMetricGrid>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AdminSection title="إسناد السائق" description={`السائق الحالي: ${plan.driverName ?? "غير محدد"}`}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select value={driverId} onChange={(event) => setDriverId(event.target.value)} className="h-11 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="">اختر سائقًا</option>
                {drivers.filter((driver) => driver.status === "active").map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
              </select>
              <ToolbarButton onClick={() => assignDriver.mutate()} disabled={!driverId || assignDriver.isPending}>حفظ السائق</ToolbarButton>
            </div>
          </AdminSection>
          <AdminSection title="تاريخ التسليم" description={`التاريخ الحالي: ${formatDate(plan.plannedDate)}`}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input type="date" value={plannedDate || dateInputValue(plan.plannedDate)} onChange={(event) => setPlannedDate(event.target.value)} className="h-11 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
              <ToolbarButton onClick={() => updateDate.mutate()} disabled={updateDate.isPending}>تحديث التاريخ</ToolbarButton>
            </div>
          </AdminSection>
        </div>
        <PlanItemsSummary items={items} />
        <AdminSection
          title="تسلسل الشحنات"
          description="راجع الشحنات، غيّر ترتيب التوقفات، أو احذف شحنة من الخطة."
          actions={
            <ToolbarButton onClick={() => setTransferOpen(true)}>
              <ArrowPathIcon className="h-4 w-4" />
              نقل / إضافة شحنات
            </ToolbarButton>
          }
        >
          {shipments.length === 0 ? <AdminEmptyState title="لا توجد شحنات في الخطة" description="أضف شحنات من صفحة الشحنات ثم ارجع إلى مساحة التخطيط." action={<Link to="/logistics/shipments"><ToolbarButton><PlusIcon className="h-4 w-4" />إضافة شحنات</ToolbarButton></Link>} /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-sm" dir="rtl">
                <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <SortableTh label="الشحنة" sortKey="reference" sort={shipmentSort} toggle={shipmentToggle} />
                    <SortableTh label="العميل" sortKey="customer" sort={shipmentSort} toggle={shipmentToggle} />
                    <SortableTh label="الحالة" sortKey="status" sort={shipmentSort} toggle={shipmentToggle} />
                    <SortableTh label="التاريخ" sortKey="date" sort={shipmentSort} toggle={shipmentToggle} />
                    <SortableTh label="المسافة" sortKey="distance" sort={shipmentSort} toggle={shipmentToggle} />
                    <th className="px-4 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {displayShipments.map((shipment, index) => {
                    const shipmentStatus = shipmentStatusInfo(shipment.status);
                    return (
                      <tr key={shipment.id}>
                        <td className="px-4 py-4 font-semibold">{shipment.routeSequence ?? index + 1}</td>
                        <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white" dir="ltr">{shipment.reference}</td>
                        <td className="px-4 py-4">{shipment.customerName ?? "--"}</td>
                        <td className="px-4 py-4">
                          {plan.status === "in_progress" ? (
                            <select
                              value={shipment.status}
                              onChange={(e) => changeShipmentStatus.mutate({ shipmentId: shipment.id, newStatus: e.target.value })}
                              disabled={changeShipmentStatus.isPending}
                              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                              <option value={shipment.status}>{shipmentStatus.label}</option>
                              {getValidNextStatuses(shipment.status).map((s) => (
                                <option key={s} value={s}>{SHIPMENT_STATUS_LABELS[s] ?? s}</option>
                              ))}
                            </select>
                          ) : (
                            <StatusBadge label={shipmentStatus.label} tone={shipmentStatus.tone} />
                          )}
                        </td>
                        <td className="px-4 py-4">{formatDate(shipment.scheduledAt)}</td>
                        <td className="px-4 py-4">{formatDistance(shipment.distanceKm)}</td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => resequence.mutate({ shipmentId: shipment.id, sequence: Math.max(1, (shipment.routeSequence ?? index + 1) - 1) })} className="rounded-lg p-2 text-gray-500 hover:bg-brand-25 dark:hover:bg-white/[0.02]"><ArrowRightIcon className="h-4 w-4" /></button>
                            <button type="button" onClick={() => resequence.mutate({ shipmentId: shipment.id, sequence: (shipment.routeSequence ?? index + 1) + 1 })} className="rounded-lg p-2 text-gray-500 hover:bg-brand-25 dark:hover:bg-white/[0.02]"><ChevronLeftIcon className="h-4 w-4" /></button>
                            <button type="button" onClick={() => removeShipment.mutate(shipment.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><TrashIcon className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
        <ShipmentTransferModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          sourcePlan={plan}
          currentShipments={shipments}
          onSuccess={refresh}
        />
        {confirmOpen ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">تأكيد الخطة</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                سيتم نقل الخطة إلى تجهيز الديسباتشر. لن تظهر للسائق حتى يؤكد الديسباتشر أن الشحنات جاهزة للاستلام.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <ToolbarButton onClick={() => setConfirmOpen(false)}>إلغاء</ToolbarButton>
                <ToolbarButton variant="primary" onClick={() => confirm.mutate()} disabled={!canConfirmPlan || confirm.isPending}>
                  {confirm.isPending ? "جاري الإرسال" : "تأكيد وإرسال للديسباتشر"}
                </ToolbarButton>
              </div>
            </div>
          </div>
        ) : null}
        {statusConfirmOpen ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                تغيير حالة الخطة إلى: {PLAN_STATUS_LABELS[pendingStatus] ?? pendingStatus}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {pendingStatus === "completed" && "سيتم إكمال الخطة وتحويل جميع الشحنات المسلّمة إلى حالة مكتملة."}
                {pendingStatus === "cancelled" && "سيتم إلغاء الخطة وإلغاء جميع الشحنات النشطة."}
                {pendingStatus === "in_progress" && "سيتم بدء الخطة وتصبح مرئية للسائق."}
              </p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">سبب التغيير (اختياري)</label>
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="أدخل سبب التغيير..."
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <ToolbarButton onClick={() => { setStatusConfirmOpen(false); setPendingStatus(""); setStatusReason(""); }}>إلغاء</ToolbarButton>
                <ToolbarButton
                  variant={pendingStatus === "cancelled" ? undefined : "primary"}
                  onClick={() => changePlanStatus.mutate({ newStatus: pendingStatus, reason: statusReason }, { onSuccess: () => { setStatusConfirmOpen(false); setPendingStatus(""); setStatusReason(""); } })}
                  disabled={changePlanStatus.isPending}
                >
                  {changePlanStatus.isPending ? "جاري التحديث" : "تأكيد"}
                </ToolbarButton>
              </div>
            </div>
          </div>
        ) : null}
      </AdminPageFrame>
    </>
  );
}

// ─── Returns Page ──────────────────────────────────────────────────────────────

type ReturnColumn = "reference" | "customer" | "order" | "items" | "status" | "value" | "created";

interface ReturnRow {
  id: string;
  origin_ref: string | null;
  odoo_order_name: string | null;
  customer_name: string | null;
  return_reference: string | null;
  shipment_status: string | null;
  total_gmv: number | null;
  parent_shipment_id: string | null;
  created_at: string | null;
  item_count: number;
  received_count: number;
  assigned_profile_id: string | null;
  plan_id: string | null;
}

function returnStatusInfo(status: string): { label: string; tone: StatusBadgeTone } {
  switch (status) {
    case "PENDING_ASSIGN": return { label: "في انتظار الاستلام", tone: "yellow" };
    case "ASSIGNED": return { label: "تم التعيين", tone: "blue" };
    case "FINISHED": return { label: "تم الاستلام", tone: "green" };
    case "SETTLED": return { label: "مكتمل", tone: "gray" };
    default: return { label: "غير محددة", tone: "gray" };
  }
}

async function fetchReturnShipments(): Promise<ReturnRow[]> {
  const { data: plans, error: planError } = await supabase
    .from("logistics_delivery_plans")
    .select("id, plan_reference, return_of_plan_id, created_at")
    .not("return_of_plan_id", "is", null)
    .eq("plan_status", "returned")
    .order("created_at", { ascending: false });

  if (planError) throw planError;
  const planRows = plans ?? [];
  const planIds = planRows.map((plan) => plan.id);
  const originalPlanIds = [...new Set(planRows.map((plan) => plan.return_of_plan_id).filter(Boolean))] as string[];
  if (planIds.length === 0) return [];

  const [{ data: originalPlans, error: originalPlanError }, { data: shipments, error: shipmentError }] = await Promise.all([
    originalPlanIds.length > 0
      ? supabase.from("logistics_delivery_plans").select("id, plan_reference").in("id", originalPlanIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("logistics_shipments")
      .select("id, plan_id, total_gmv")
      .eq("is_return_shipment", true)
      .in("plan_id", planIds),
  ]);
  if (originalPlanError) throw originalPlanError;
  if (shipmentError) throw shipmentError;

  const shipmentRows = shipments ?? [];
  const shipmentPlanById = new Map(shipmentRows.map((shipment) => [shipment.id, shipment.plan_id]));
  const shipmentIds = shipmentRows.map((shipment) => shipment.id);
  const { data: items, error: itemError } = shipmentIds.length > 0
    ? await supabase
      .from("logistics_return_shipment_items")
      .select("return_shipment_id, received_quantity, returned_quantity")
      .in("return_shipment_id", shipmentIds)
    : { data: [], error: null };
  if (itemError) throw itemError;

  const originalsById = new Map((originalPlans ?? []).map((plan) => [plan.id, plan.plan_reference]));
  const totalsByPlan = new Map<string, { itemCount: number; receivedCount: number; totalGmv: number }>();
  for (const shipment of shipmentRows) {
    const current = totalsByPlan.get(shipment.plan_id) ?? { itemCount: 0, receivedCount: 0, totalGmv: 0 };
    current.totalGmv += Number(shipment.total_gmv ?? 0);
    totalsByPlan.set(shipment.plan_id, current);
  }
  for (const item of items ?? []) {
    const planId = shipmentPlanById.get(item.return_shipment_id);
    if (!planId) continue;
    const current = totalsByPlan.get(planId) ?? { itemCount: 0, receivedCount: 0, totalGmv: 0 };
    current.itemCount += 1;
    if (Number(item.received_quantity ?? 0) >= Number(item.returned_quantity ?? 0)) current.receivedCount += 1;
    totalsByPlan.set(planId, current);
  }

  return planRows.map((plan) => {
    const totals = totalsByPlan.get(plan.id) ?? { itemCount: 0, receivedCount: 0, totalGmv: 0 };
    return {
      id: plan.id,
      origin_ref: plan.return_of_plan_id ? originalsById.get(plan.return_of_plan_id) ?? null : null,
      odoo_order_name: null,
      customer_name: null,
      return_reference: plan.plan_reference,
      shipment_status: "FINISHED",
      total_gmv: totals.totalGmv,
      parent_shipment_id: null,
      created_at: plan.created_at,
      item_count: totals.itemCount,
      received_count: totals.receivedCount,
      assigned_profile_id: null,
      plan_id: plan.id,
    };
  });
}

export function LogisticsReturnsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState<Record<ReturnColumn, boolean>>({ reference: true, customer: true, order: true, items: true, status: true, value: true, created: true });
  const { sort, toggle, sorted } = useSort({ key: "created", direction: "desc" });
  const query = useQuery({ queryKey: [...ROOT_QUERY, "returns"], queryFn: fetchReturnShipments });

  const filteredRows = (query.data ?? [])
    .filter((r) => includesSearch([r.return_reference, r.customer_name, r.origin_ref, r.odoo_order_name], search))
    .filter((r) => tab === "all" || r.shipment_status === tab);

  const rows = useMemo(() => sorted(filteredRows, {
    reference: (r) => r.return_reference ?? "",
    customer: (r) => r.customer_name ?? "",
    order: (r) => r.origin_ref ?? "",
    items: (r) => r.item_count,
    status: (r) => r.shipment_status ?? "",
    value: (r) => r.total_gmv ?? 0,
    created: (r) => r.created_at ?? "",
  }), [filteredRows, sort]);

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageMeta title="المرتجعات | اللوجستيات" description="إدارة مرتجعات الشحنات" />
      <AdminPageFrame dir="rtl">
        <AdminPageHero
          eyebrow="Returns"
          title="مرتجعات الشحنات"
          description="متابعة مرتجعات العملاء واستلام الأصناف المرتجعة."
        />
        {/* Metric Cards */}
        <AdminMetricGrid>
          <AdminMetricCard
            label="إجمالي المرتجعات"
            value={formatNumber((query.data ?? []).length)}
            icon={<ArrowPathIcon className="h-5 w-5" />}
          />
          <AdminMetricCard
            label="في انتظار الاستلام"
            value={formatNumber((query.data ?? []).filter((r) => r.shipment_status === "PENDING_ASSIGN").length)}
            icon={<TruckIcon className="h-5 w-5" />}
            tone="amber"
          />
          <AdminMetricCard
            label="قيد التوصيل"
            value={formatNumber((query.data ?? []).filter((r) => r.shipment_status === "ASSIGNED").length)}
            icon={<TruckIcon className="h-5 w-5" />}
            tone="blue"
          />
          <AdminMetricCard
            label="قيمة المرتجعات"
            value={formatMoney((query.data ?? []).reduce((sum, r) => sum + (r.total_gmv ?? 0), 0))}
            icon={<CheckCircleIcon className="h-5 w-5" />}
            tone="emerald"
          />
        </AdminMetricGrid>
        <ErrorNotice message={query.error instanceof Error ? query.error.message : null} />
        <AdminSection
          title="قائمة المرتجعات"
          description="تابع حالة المرتجعات واستلام الأصناف."
          actions={
            <div className="flex flex-wrap gap-2">
              <SearchBox value={search} onChange={setSearch} placeholder="بحث في المرتجعات" />
              <ColumnVisibility
                columns={[
                  { key: "reference", label: "المرتجع" },
                  { key: "customer", label: "العميل" },
                  { key: "order", label: "الطلب" },
                  { key: "items", label: "الأصناف" },
                  { key: "status", label: "الحالة" },
                  { key: "value", label: "القيمة" },
                  { key: "created", label: "التاريخ" },
                ]}
                visible={visible}
                onToggle={(key) => setVisible((current) => ({ ...current, [key]: !current[key] }))}
              />
            </div>
          }
        >
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {[["all", "الكل"], ["PENDING_ASSIGN", "في انتظار الاستلام"], ["ASSIGNED", "تم التعيين"], ["FINISHED", "تم الاستلام"], ["SETTLED", "مكتملة"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${tab === key ? "bg-brand-500 text-white" : "bg-brand-25 text-gray-700 hover:bg-brand-25 dark:bg-white/[0.02] dark:text-gray-200"}`}>{label}</button>
            ))}
          </div>
          {query.isLoading ? <LoadingRows /> : rows.length === 0 ? (
            <AdminEmptyState title="لا توجد مرتجعات" description="ستظهر المرتجعات هنا عند إنشائها تلقائياً من تطبيق السائق." icon={<ArrowPathIcon className="h-6 w-6" />} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm" dir="rtl">
                  <thead className="border-b border-gray-200 bg-brand-25/80 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
                    <tr>
                      {visible.reference ? <SortableTh label="المرتجع" sortKey="reference" sort={sort} toggle={toggle} /> : null}
                      {visible.customer ? <SortableTh label="العميل" sortKey="customer" sort={sort} toggle={toggle} /> : null}
                      {visible.order ? <SortableTh label="الطلب الأصلي" sortKey="order" sort={sort} toggle={toggle} /> : null}
                      {visible.items ? <SortableTh label="الأصناف" sortKey="items" sort={sort} toggle={toggle} /> : null}
                      {visible.status ? <SortableTh label="الحالة" sortKey="status" sort={sort} toggle={toggle} /> : null}
                      {visible.value ? <SortableTh label="القيمة" sortKey="value" sort={sort} toggle={toggle} /> : null}
                      {visible.created ? <SortableTh label="تاريخ الإنشاء" sortKey="created" sort={sort} toggle={toggle} /> : null}
                      <th className="px-4 py-4 text-xs font-medium text-gray-500">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {pageRows.map((ret) => {
                      const status = returnStatusInfo(ret.shipment_status ?? "");
                      return (
                        <tr key={ret.id} className="bg-white hover:bg-brand-25 dark:bg-transparent dark:hover:bg-white/[0.02]">
                          {visible.reference ? (
                            <td className="px-4 py-4">
                              <p className="font-semibold text-gray-900 dark:text-white">{ret.return_reference ?? `#${ret.id.slice(0, 8)}`}</p>
                            </td>
                          ) : null}
                          {visible.customer ? <td className="px-4 py-4">{ret.customer_name ?? "--"}</td> : null}
                          {visible.order ? <td className="px-4 py-4" dir="ltr">{ret.origin_ref ?? "--"}</td> : null}
                          {visible.items ? (
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{ret.received_count}/{ret.item_count}</span>
                                {ret.item_count > 0 && (
                                  <div className="h-1.5 w-16 bg-brand-25 rounded-full overflow-hidden dark:bg-white/[0.02]">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(ret.received_count / ret.item_count) * 100}%` }} />
                                  </div>
                                )}
                              </div>
                            </td>
                          ) : null}
                          {visible.status ? <td className="px-4 py-4"><StatusBadge label={status.label} tone={status.tone} /></td> : null}
                          {visible.value ? <td className="px-4 py-4 font-semibold">{ret.total_gmv != null && ret.total_gmv > 0 ? formatMoney(ret.total_gmv) : "--"}</td> : null}
                          {visible.created ? <td className="px-4 py-4">{formatDate(ret.created_at)}</td> : null}
                          <td className="px-4 py-4">
                            <button
                              onClick={() => navigate(`/logistics/plans/draft/${ret.id}`)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-25 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-brand-25 transition dark:bg-white/[0.02] dark:text-gray-300"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              عرض
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={rows.length} onPageChange={setPage} />
            </>
          )}
        </AdminSection>
      </AdminPageFrame>
    </>
  );
}

// ============================================================================
// LogisticsShipmentDetailPage
// ============================================================================

interface ShipmentDetailRecord {
  id: string;
  shipment_reference: string | null;
  external_shipment_id: string | null;
  shipment_status: string | null;
  shipment_state: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  linked_order_id: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  plan_id: string | null;
  odoo_order_name: string | null;
  external_order_id: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  total_gmv: number | null;
  total_weight: number | null;
  total_cbm: number | null;
  picked_up_gmv: number | null;
  assigned_profile_id: string | null;
  assigned_user_name: string | null;
  delivery_phase: string | null;
  move_type: string | null;
  notes: string | null;
  origin_ref: string | null;
}

interface ShipmentItemRecord {
  id: string;
  shipment_id: string;
  product_name: string;
  product_ref: string | null;
  product_id: string | null;
  requested_quantity: number;
  reserved_quantity: number;
  done_quantity: number;
  move_state: string | null;
  source: string;
}

interface ReturnItemRecord {
  id: string;
  return_shipment_id: string;
  parent_shipment_id: string;
  parent_item_id: string;
  product_name: string | null;
  product_ref: string | null;
  product_id: string | null;
  requested_quantity: number | null;
  approved_quantity: number | null;
  delivered_quantity: number | null;
  returned_quantity: number;
  received_quantity: number;
  return_reason: string | null;
}

interface LinkedOrderRecord {
  id: string;
  external_order_id: string | null;
  odoo_order_name: string | null;
  customer_name: string | null;
  total_amount: number | null;
  currency_code: string | null;
  state: string | null;
}

interface ShipmentCustomerRecord {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  phone_number: string | null;
  governorate: string | null;
  district: string | null;
  place: string | null;
}

function resolveShipmentDetailBadge(status: string | null | undefined): { label: string; tone: StatusBadgeTone } {
  const normalized = String(status ?? "").trim();
  switch (normalized) {
    case "PENDING_ASSIGN":
      return { label: "جاهزة للتخطيط", tone: "yellow" };
    case "ASSIGNED":
      return { label: "تم الإسناد", tone: "blue" };
    case "CHECK_IN":
    case "PICKUP":
      return { label: "استلام", tone: "indigo" };
    case "OUT_FOR_DELIVERY":
    case "ARRIVED":
      return { label: "في الطريق", tone: "orange" };
    case "DELIVERED":
    case "FINISHED":
    case "SETTLED":
      return { label: "تم التسليم", tone: "green" };
    case "CANCELLED":
      return { label: "فشل/إلغاء", tone: "red" };
    default:
      return { label: normalized || "غير محددة", tone: "gray" };
  }
}

function formatShipmentAmount(value: number | null | undefined, currency = "EGP") {
  if (value == null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function ShipmentDetailCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-[22px] border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}>
      {children}
    </section>
  );
}

function ShipmentDetailCardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function LogisticsShipmentDetailPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const [shipment, setShipment] = useState<ShipmentDetailRecord | null>(null);
  const [shipmentItems, setShipmentItems] = useState<ShipmentItemRecord[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItemRecord[]>([]);
  const [linkedOrder, setLinkedOrder] = useState<LinkedOrderRecord | null>(null);
  const [customer, setCustomer] = useState<ShipmentCustomerRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShipment = useCallback(async () => {
    if (!shipmentId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [shipmentRes, itemsRes, returnsRes] = await Promise.all([
        supabase
          .from("logistics_shipments")
          .select(
            "id, shipment_reference, external_shipment_id, shipment_status, shipment_state, customer_id, customer_name, customer_phone, linked_order_id, warehouse_id, warehouse_name, plan_id, odoo_order_name, external_order_id, scheduled_at, completed_at, created_at, total_gmv, total_weight, total_cbm, picked_up_gmv, assigned_profile_id, assigned_user_name, delivery_phase, move_type, notes, origin_ref",
          )
          .eq("id", shipmentId)
          .single(),
        supabase
          .from("logistics_shipment_items")
          .select("id, shipment_id, product_name, product_ref, product_id, requested_quantity, reserved_quantity, done_quantity, move_state, source")
          .eq("shipment_id", shipmentId)
          .order("created_at", { ascending: true }),
        supabase
          .from("logistics_return_shipment_items")
          .select("id, return_shipment_id, parent_shipment_id, parent_item_id, product_name, product_ref, product_id, requested_quantity, approved_quantity, delivered_quantity, returned_quantity, received_quantity, return_reason")
          .eq("parent_shipment_id", shipmentId),
      ]);

      if (shipmentRes.error) throw shipmentRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (returnsRes.error) throw returnsRes.error;

      const shipmentRecord = shipmentRes.data as ShipmentDetailRecord;
      setShipment(shipmentRecord);
      setShipmentItems((itemsRes.data ?? []) as ShipmentItemRecord[]);
      setReturnItems((returnsRes.data ?? []) as ReturnItemRecord[]);

      if (shipmentRecord.linked_order_id) {
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("id, external_order_id, odoo_order_name, customer_name, total_amount, currency_code, state")
          .eq("id", shipmentRecord.linked_order_id)
          .maybeSingle();

        if (orderError) throw orderError;
        setLinkedOrder((orderData as LinkedOrderRecord | null) ?? null);
      } else {
        setLinkedOrder(null);
      }

      if (shipmentRecord.customer_id) {
        const { data: custData, error: custError } = await supabase
          .from("customers")
          .select("id, customer_name, customer_email, phone_number, governorate, district, place")
          .eq("id", shipmentRecord.customer_id)
          .maybeSingle();

        if (custError) throw custError;
        setCustomer((custData as ShipmentCustomerRecord | null) ?? null);
      } else {
        setCustomer(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل تفاصيل الشحنة.");
      setShipment(null);
      setLinkedOrder(null);
      setCustomer(null);
      setShipmentItems([]);
      setReturnItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    void loadShipment();
  }, [loadShipment]);

  useEffect(() => {
    if (!shipmentId) return;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        void loadShipment();
      }, 300);
    };

    const channel = supabase
      .channel(`shipment-detail-${shipmentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "logistics_shipments", filter: `id=eq.${shipmentId}` },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      void supabase.removeChannel(channel);
    };
  }, [shipmentId, loadShipment]);

  const itemCount = shipmentItems.length;
  const totalRequestedQty = useMemo(
    () => shipmentItems.reduce((sum, item) => sum + Number(item.requested_quantity ?? 0), 0),
    [shipmentItems],
  );
  const totalDoneQty = useMemo(
    () => shipmentItems.reduce((sum, item) => sum + Number(item.done_quantity ?? 0), 0),
    [shipmentItems],
  );
  const totalReturnedQty = useMemo(
    () => returnItems.reduce((sum, item) => sum + Number(item.returned_quantity ?? 0), 0),
    [returnItems],
  );
  const totalReceivedQty = useMemo(
    () => returnItems.reduce((sum, item) => sum + Number(item.received_quantity ?? 0), 0),
    [returnItems],
  );

  if (isLoading) {
    return (
      <>
        <PageMeta title="تفاصيل الشحنة" description="جاري تحميل تفاصيل الشحنة" />
        <AdminPageFrame>
          <div className="space-y-5">
            <div className="h-24 animate-pulse rounded-[22px] bg-brand-25 dark:bg-white/[0.02]" />
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_320px]">
              <div className="h-[520px] animate-pulse rounded-[22px] bg-brand-25 dark:bg-white/[0.02]" />
              <div className="space-y-5">
                <div className="h-72 animate-pulse rounded-[22px] bg-brand-25 dark:bg-white/[0.02]" />
                <div className="h-72 animate-pulse rounded-[22px] bg-brand-25 dark:bg-white/[0.02]" />
              </div>
            </div>
          </div>
        </AdminPageFrame>
      </>
    );
  }

  if (error || !shipment) {
    return (
      <>
        <PageMeta title="تفاصيل الشحنة" description="لم يتم العثور على الشحنة" />
        <AdminPageFrame>
          <EmptyState
            title={error || "لم يتم العثور على الشحنة"}
            description="تعذر تحميل تفاصيل الشحنة."
            action={
              <Link
                to="/logistics/shipments"
                className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
              >
                العودة للشحنات
              </Link>
            }
          />
        </AdminPageFrame>
      </>
    );
  }

  const shipmentLabel = shipment.shipment_reference || shipment.external_shipment_id || shipment.id.slice(0, 8);
  const statusBadge = resolveShipmentDetailBadge(shipment.shipment_status);

  return (
    <>
      <PageMeta title={`شحنة #${shipmentLabel}`} description="تفاصيل الشحنة اللوجستية." />

      <AdminPageFrame>
        <ShipmentDetailCard>
          <div className="px-5 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-3">
                <Link
                  to="/logistics/shipments"
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  <ChevronRightIcon className="h-4 w-4" aria-hidden />
                  العودة للشحنات
                </Link>

                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    شحنة <span dir="ltr">#{shipmentLabel}</span>
                  </h1>
                  <StatusBadge label={statusBadge.label} tone={statusBadge.tone} />
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    العميل:{" "}
                    <strong className="font-semibold text-gray-800 dark:text-gray-100">
                      {customer?.customer_name || shipment.customer_name || "--"}
                    </strong>
                  </span>
                  <span>
                    المخزن:{" "}
                    <strong className="font-semibold text-gray-800 dark:text-gray-100">
                      {shipment.warehouse_name || "--"}
                    </strong>
                  </span>
                  {linkedOrder ? (
                    <span>
                      الطلب:{" "}
                      <strong className="font-semibold text-gray-800 dark:text-gray-100">
                        {linkedOrder.odoo_order_name || linkedOrder.external_order_id || "--"}
                      </strong>
                    </span>
                  ) : null}
                  <span>
                    التاريخ:{" "}
                    <strong className="font-semibold text-gray-800 dark:text-gray-100">
                      {formatDate(shipment.scheduled_at || shipment.created_at)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-gray-800">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">عدد الأصناف</p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {itemCount.toLocaleString("ar-EG")} صنف
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">الوزن</p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {shipment.total_weight != null ? `${formatNumber(shipment.total_weight, 1)} كجم` : "--"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">قيمة GMV</p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {formatShipmentAmount(shipment.total_gmv)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {statusBadge.label}
                </p>
              </div>
            </div>
          </div>
        </ShipmentDetailCard>

        <div className="mt-5 space-y-5">
          <ShipmentDetailCard>
            <ShipmentDetailCardHeader
              title="أصناف الشحنة"
              subtitle={`${itemCount} صنف / ${totalRequestedQty.toLocaleString("ar-EG")} مطلوب / ${totalDoneQty.toLocaleString("ar-EG")} تم التنفيذ`}
            />

            {shipmentItems.length === 0 ? (
              <div className="flex min-h-[320px] items-center px-5 py-16">
                <EmptyState title="لا توجد أصناف" description="لم يتم مزامنة أي أصناف لهذه الشحنة حتى الآن." />
              </div>
            ) : (
              <div className="px-5 py-5">
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full text-right text-sm" dir="rtl">
                    <thead className="bg-brand-25/80 dark:bg-white/[0.02]">
                      <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                        <th className="w-12 px-4 py-4 text-right">#</th>
                        <th className="min-w-[260px] px-4 py-4 text-right">الصنف</th>
                        <th className="px-4 py-4 text-center">المطلوب</th>
                        <th className="px-4 py-4 text-center">محجوز</th>
                        <th className="px-4 py-4 text-center">تم التنفيذ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {shipmentItems.map((item, index) => (
                        <tr key={item.id} className="transition hover:bg-brand-25/70 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-4 text-gray-500 dark:text-gray-400">{index + 1}</td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-gray-900 dark:text-white" dir="auto">
                              {item.product_name}
                            </p>
                            {item.product_ref ? (
                              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500" dir="auto">
                                {item.product_ref}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-center font-medium text-gray-800 dark:text-gray-200">
                            {Number(item.requested_quantity ?? 0).toLocaleString("ar-EG")}
                          </td>
                          <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                            {Number(item.reserved_quantity ?? 0).toLocaleString("ar-EG")}
                          </td>
                          <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                            {Number(item.done_quantity ?? 0).toLocaleString("ar-EG")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </ShipmentDetailCard>

          <ShipmentDetailCard>
            <ShipmentDetailCardHeader
              title="المرتجعات"
              subtitle="الأصناف المرتجعة من هذه الشحنة"
            />

            {returnItems.length === 0 ? (
              <div className="flex min-h-[200px] items-center px-5 py-12">
                <EmptyState title="لا توجد مرتجعات من هذه الشحنة" description="لم يتم تسجيل أي مرتجعات مرتبطه بهذه الشحنة." />
              </div>
            ) : (
              <div className="px-5 py-5">
                {totalReturnedQty > 0 || totalReceivedQty > 0 ? (
                  <div className="mb-4 flex flex-wrap gap-4 rounded-2xl bg-brand-25 p-4 dark:bg-white/[0.04]">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">إجمالي المرتجع</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {totalReturnedQty.toLocaleString("ar-EG")} وحدة
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">إجمالي المستلم</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {totalReceivedQty.toLocaleString("ar-EG")} وحدة
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full text-right text-sm" dir="rtl">
                    <thead className="bg-brand-25/80 dark:bg-white/[0.02]">
                      <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                        <th className="w-12 px-4 py-4 text-right">#</th>
                        <th className="min-w-[220px] px-4 py-4 text-right">الصنف</th>
                        <th className="px-4 py-4 text-center">المطلوب</th>
                        <th className="px-4 py-4 text-center">تم التسليم</th>
                        <th className="px-4 py-4 text-center">المرتجع</th>
                        <th className="px-4 py-4 text-center">المستلم</th>
                        <th className="px-4 py-4 text-right">سبب الإرجاع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {returnItems.map((item, index) => (
                        <tr key={item.id} className="transition hover:bg-brand-25/70 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-4 text-gray-500 dark:text-gray-400">{index + 1}</td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-gray-900 dark:text-white" dir="auto">
                              {item.product_name || "--"}
                            </p>
                            {item.product_ref ? (
                              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500" dir="auto">
                                {item.product_ref}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-center font-medium text-gray-800 dark:text-gray-200">
                            {Number(item.requested_quantity ?? 0).toLocaleString("ar-EG")}
                          </td>
                          <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                            {Number(item.delivered_quantity ?? 0).toLocaleString("ar-EG")}
                          </td>
                          <td className="px-4 py-4 text-center font-medium text-gray-800 dark:text-gray-200">
                            {Number(item.returned_quantity ?? 0).toLocaleString("ar-EG")}
                          </td>
                          <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                            {Number(item.received_quantity ?? 0).toLocaleString("ar-EG")}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-500 dark:text-gray-400" dir="auto">
                            {item.return_reason || "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </ShipmentDetailCard>
        </div>
      </AdminPageFrame>
    </>
  );
}
