import {
  getKpiByCode,
  getKpisForDepartment,
  isManualUploadKpi,
  KPI_REGISTRY,
  type KpiDepartmentSlug,
} from "./kpi-registry";

export const MANUAL_KPI_CSV_HEADERS = [
  "period_start",
  "period_end",
  "department",
  "kpi_code",
  "actual_value",
  "target_value",
  "notes",
] as const;

export interface ParsedManualKpiRow {
  periodStart: string;
  periodEnd: string;
  departmentSlug: KpiDepartmentSlug;
  kpiCode: string;
  actualValue: number;
  targetValue: number | null;
  notes: string | null;
}

export interface ManualKpiParseResult {
  rows: ParsedManualKpiRow[];
  errors: string[];
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

export function buildManualKpiCsvTemplate(departmentSlug?: KpiDepartmentSlug) {
  const kpis = (departmentSlug ? getKpisForDepartment(departmentSlug) : KPI_REGISTRY).filter(isManualUploadKpi);
  const rows = kpis.map((kpi) =>
    [
      "2026-07-01",
      "2026-07-31",
      kpi.departmentSlug,
      kpi.code,
      "",
      kpi.target,
      `${kpi.name} - ${kpi.source.label}`,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [MANUAL_KPI_CSV_HEADERS.join(","), ...rows].join("\n");
}

export function parseManualKpiCsv(csvText: string): ManualKpiParseResult {
  const errors: string[] = [];
  const rows: ParsedManualKpiRow[] = [];
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows, errors: ["CSV must include headers and at least one data row."] };
  }

  const header = parseCsvLine(lines[0]);
  const missingHeaders = MANUAL_KPI_CSV_HEADERS.filter((key) => !header.includes(key));
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(", ")}.`);
  }

  const indexFor = (key: (typeof MANUAL_KPI_CSV_HEADERS)[number]) => header.indexOf(key);

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    const rowNumber = lineIndex + 1;
    const periodStart = cells[indexFor("period_start")] ?? "";
    const periodEnd = cells[indexFor("period_end")] ?? "";
    const department = (cells[indexFor("department")] ?? "") as KpiDepartmentSlug;
    const kpiCode = String(cells[indexFor("kpi_code")] ?? "").toUpperCase();
    const actualRaw = cells[indexFor("actual_value")] ?? "";
    const targetRaw = cells[indexFor("target_value")] ?? "";
    const notes = cells[indexFor("notes")] || null;
    const definition = getKpiByCode(kpiCode);
    const actualValue = Number(actualRaw);
    const targetValue = targetRaw === "" ? null : Number(targetRaw);

    if (!isIsoDate(periodStart)) errors.push(`Row ${rowNumber}: period_start must be YYYY-MM-DD.`);
    if (!isIsoDate(periodEnd)) errors.push(`Row ${rowNumber}: period_end must be YYYY-MM-DD.`);
    if (!definition) errors.push(`Row ${rowNumber}: unknown KPI code ${kpiCode || "(blank)"}.`);
    if (definition && definition.departmentSlug !== department) {
      errors.push(`Row ${rowNumber}: ${kpiCode} belongs to ${definition.departmentSlug}, not ${department}.`);
    }
    if (definition && !isManualUploadKpi(definition)) {
      errors.push(`Row ${rowNumber}: ${kpiCode} is not configured for manual upload.`);
    }
    if (!Number.isFinite(actualValue)) errors.push(`Row ${rowNumber}: actual_value must be numeric.`);
    if (targetRaw !== "" && !Number.isFinite(targetValue)) errors.push(`Row ${rowNumber}: target_value must be numeric or blank.`);

    const hasRowError = errors.some((error) => error.startsWith(`Row ${rowNumber}:`));
    if (!hasRowError && definition) {
      rows.push({
        periodStart,
        periodEnd,
        departmentSlug: department,
        kpiCode,
        actualValue,
        targetValue,
        notes,
      });
    }
  }

  return { rows: errors.length > 0 ? [] : rows, errors };
}
