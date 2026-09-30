import * as XLSX from "xlsx-js-style";
import { formatDuration } from "./tripAnalytics";
import type { TripStop } from "./tripAnalytics";

type TripSummary = {
  pings: number;
  driveSeconds: number;
  driveKm: number;
  visits: number;
  stops: TripStop[];
  totalStopSeconds: number;
};

type TripEntry = {
  name: string;
  role: string;
  summary: TripSummary;
  stops: TripStop[];
};

const HEADER_FILL = { fgColor: { rgb: "1F4E79" } };
const HEADER_FONT = { name: "Arial", bold: true, color: { rgb: "FFFFFF" }, size: 11 };
const HEADER_ALIGN = { horizontal: "center" as const, vertical: "center" as const, wrapText: true };
const DATA_FONT = { name: "Arial", size: 10 };
const DATA_ALIGN = { vertical: "center" as const, wrapText: true };
const BORDER = { bottom: { style: "thin" as const, color: { rgb: "D1D5DB" } } };

function styleHeader(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = { font: HEADER_FONT, fill: HEADER_FILL, alignment: HEADER_ALIGN, border: BORDER };
  }
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = { font: DATA_FONT, alignment: DATA_ALIGN, border: BORDER };
    }
  }
}

const STATUS_MAP: Record<string, string> = {
  PENDING_ASSIGN: "جاهزة للتخطيط",
  ASSIGNED: "تم الإسناد",
  CHECK_IN: "استلام",
  PICKUP: "استلام",
  OUT_FOR_DELIVERY: "في الطريق",
  ARRIVED: "في الطريق",
  DELIVERED: "تم التسليم",
  FINISHED: "تم التسليم",
  SETTLED: "تم التسليم",
  CANCELLED: "ملغي",
};

function statusLabel(s: string | null): string {
  if (!s) return "—";
  return STATUS_MAP[s] ?? s;
}

function fmtClock(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function createSummarySheet(entry: TripEntry): XLSX.WorkSheet {
  const data = [
    ["الملخص", ""],
    ["نقاط تتبع", entry.summary.pings],
    ["وقت حركة", formatDuration(entry.summary.driveSeconds)],
    ["مسافة تقريبية", `${entry.summary.driveKm.toFixed(1)} كم`],
    ["زيارات عملاء", entry.summary.visits],
    ["وقفات", entry.summary.stops.length],
    ["إجمالي الوقوف", formatDuration(entry.summary.totalStopSeconds)],
    [],
    ["الجدول الزمني"],
    ["#", "النقطة", "الوصول", "استغرق للوصول", "المكوث", "حالة الشحنة"],
  ];
  entry.stops.forEach((stop, i) => {
    data.push([
      i + 1,
      stop.label,
      fmtClock(stop.arrivedAt),
      i === 0 ? "بداية التتبع" : formatDuration(entry.summary.stops[i - 1]?.dwellSeconds ?? 0),
      `${Math.round(stop.dwellSeconds / 60)} دقيقة`,
      statusLabel(stop.status),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 6 }, { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
  ];
  return ws;
}

export function exportTripAnalysisWorkbook({
  periodLabel,
  entries,
}: {
  periodLabel: string;
  entries: TripEntry[];
}) {
  const wb = XLSX.utils.book_new();
  for (const entry of entries) {
    const sheetName = entry.name.slice(0, 31).replace(/[\\/*?[\]]/g, "_");
    const ws = createSummarySheet(entry);
    styleHeader(ws);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const summaryData: Array<[string, string, string, string, string, string]> = [
    ["الاسم", "الدور", "نقاط تتبع", "وقت حركة", "مسافة", "زيارات"],
  ];
  for (const entry of entries) {
    summaryData.push([
      entry.name,
      entry.role,
      String(entry.summary.pings),
      formatDuration(entry.summary.driveSeconds),
      `${entry.summary.driveKm.toFixed(1)} كم`,
      String(entry.summary.visits),
    ]);
  }
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [
    { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
  ];
  styleHeader(summaryWs);
  XLSX.utils.book_append_sheet(wb, summaryWs, "الملخص");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `تحليل_خط_السير_${periodLabel}_${dateStr}.xlsx`);
}

export function exportAttendanceWorkbook({
  periodLabel,
  headers,
  rows,
  dateRows,
  rangeLabel,
}: {
  periodLabel: string;
  headers: string[];
  rows: Array<{ name: string; warehouse: string; values: (string | number)[]; present: number; absent: number }>;
  dateRows: Array<{ date: string; count: number }>;
  rangeLabel: string;
}) {
  const wb = XLSX.utils.book_new();

  const matrixData: (string | number)[][] = [
    ["الاسم", "المخزن", ...headers, "✓", "✗"],
  ];
  for (const row of rows) {
    matrixData.push([row.name, row.warehouse, ...row.values, row.present, row.absent]);
  }
  matrixData.push(["الإجمالي", "", ...dateRows.map((d) => d.count), "", ""]);

  const ws = XLSX.utils.aoa_to_sheet(matrixData);
  ws["!cols"] = [
    { wch: 22 }, { wch: 16 },
    ...headers.map(() => ({ wch: 12 })),
    { wch: 6 }, { wch: 6 },
  ];
  styleHeader(ws);
  XLSX.utils.book_append_sheet(wb, ws, "المصفوفة");

  const logData: (string | number)[][] = [
    ["الاسم", "المخزن", "وقت الحضور", "الملاحظة"],
  ];
  for (const row of rows) {
    if (row.values.some((v) => v !== "—" && v !== "✗" && v !== "")) {
      const attendedDates = row.values
        .map((v, i) => (v !== "—" && v !== "✗" && v !== "" ? headers[i] : null))
        .filter(Boolean)
        .join(", ");
      logData.push([row.name, row.warehouse, attendedDates || "—", ""]);
    }
  }
  const logWs = XLSX.utils.aoa_to_sheet(logData);
  logWs["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 20 }];
  styleHeader(logWs);
  XLSX.utils.book_append_sheet(wb, logWs, "السجل");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `حضور_السائقين_${rangeLabel}_${dateStr}.xlsx`);
}
