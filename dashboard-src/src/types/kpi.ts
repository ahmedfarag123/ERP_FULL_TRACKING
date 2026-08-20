export type DepartmentSlug =
  | "sales"
  | "procurement"
  | "accounting-finance"
  | "warehouse"
  | "transportation-fleet"
  | "delivery"
  | "quality-customer-service"
  | "business-dev"
  | "hr"
  | "it-data"
  | "marketing";

export type KpiDirection = "Higher is Better" | "Lower is Better";

export type KpiFrequency =
  | "Daily" | "Weekly" | "Monthly" | "Quarterly"
  | "Daily / Weekly" | "Daily / Monthly"
  | "Weekly / Monthly" | "Monthly / Quarterly";

export interface KpiDictionaryEntry {
  department: string;
  departmentSlug: DepartmentSlug;
  kpiCode: string;
  kpiNameEn: string;
  kpiNameAr: string;
  definition: string;
  formula: string;
  dataSource: string;
  owner: string;
  frequency: KpiFrequency;
  weight: number;
  direction: KpiDirection;
  unit: string;
  target?: number;
  threshold: string;
  notes?: string;
}

export type ScorecardStatus = "Pending" | "On Track" | "At Risk" | "Missed" | "Exceeded";

export interface DeptScorecardEntry {
  department: string;
  departmentSlug: DepartmentSlug;
  kpiCode: string;
  kpiNameEn: string;
  kpiNameAr: string;
  owner: string;
  frequency: KpiFrequency;
  weight: number;
  direction: KpiDirection;
  unit: string;
  target?: number;
  threshold: string;
  actual?: number;
  scorePercent?: number;
  weightedScore?: number;
  status: ScorecardStatus;
  dataSource: string;
  correctiveAction?: string;
}

export type RoleSlug =
  | "tele-sales-agent"
  | "outdoor-sales-rep"
  | "driver-delivery-rep"
  | "warehouse-worker"
  | "purchasing-specialist"
  | "ar-accountant"
  | "hr-specialist"
  | "data-analyst"
  | "marketing-specialist"
  | "customer-service";

export interface IndividualKpiEntry {
  kpiCode: string;
  role: string;
  roleSlug: RoleSlug;
  department: string;
  departmentSlug: DepartmentSlug;
  kpi: string;
  kpiAr: string;
  weight: number;
  dataSource: string;
  frequency: KpiFrequency;
  suggestedTarget: string;
  direction: KpiDirection;
  target: number;
  unit: string;
  notes?: string;
}

export interface AgentKpiActual {
  profile_id: string;
  full_name: string;
  role: string;
  job_title: string;
  department: string;
  department_slug: string;
  kpi_code: string;
  kpi_name_en: string;
  kpi_name_ar: string;
  actual_value: number;
  target_value: number;
  unit: string;
  weight: number;
  frequency: string;
  direction: string;
}

export interface DepartmentMeta {
  slug: DepartmentSlug;
  name: string;
  nameAr: string;
  codePrefix: string;
  color: "blue" | "emerald" | "amber" | "violet" | "rose" | "slate" | "indigo" | "orange" | "cyan" | "pink";
  icon: string;
}

export interface DateRange {
  from: string;
  to: string;
}
