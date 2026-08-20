export type KpiDirection = "Higher is Better" | "Lower is Better";
export type KpiSourceMode = "app" | "odoo" | "manual" | "mixed" | "not_implemented";
export type KpiDepartmentSlug =
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

export interface KpiSourceDefinition {
  mode: KpiSourceMode;
  label: string;
  detail: string;
  missingOwner?: "Odoo" | "Manual Upload" | "Main App Formula" | "Mixed";
  manualTemplate?: string;
}

export interface KpiDefinition {
  departmentSlug: KpiDepartmentSlug;
  department: string;
  code: string;
  name: string;
  dataSource: string;
  owner: string;
  frequency: string;
  unit: string;
  target: number;
  direction: KpiDirection;
  weight: number;
  source: KpiSourceDefinition;
}

const KPI_ROWS = [
  ["sales", "Sales", "SAL-01", "Total Revenue", "orders + order_line_items", "Sales Manager", "Daily / Monthly", "EGP", 5000000, "Higher is Better", 0.15],
  ["sales", "Sales", "SAL-02", "Gross Profit Margin", "RPC: compute_gross_profit", "Finance", "Monthly", "%", 25, "Higher is Better", 0.12],
  ["sales", "Sales", "SAL-03", "Sales Conversion Rate", "visits + calls + orders", "Sales Manager", "Weekly", "%", 30, "Higher is Better", 0.1],
  ["sales", "Sales", "SAL-04", "Average Order Value", "orders + order_line_items", "Sales Manager", "Weekly", "EGP", 5000, "Higher is Better", 0.08],
  ["sales", "Sales", "SAL-05", "Revenue Growth Rate", "orders", "Sales Manager", "Monthly", "%", 10, "Higher is Better", 0.1],
  ["sales", "Sales", "SAL-06", "New Customer Acquisition", "customers", "Sales Manager", "Monthly", "Count", 50, "Higher is Better", 0.08],
  ["sales", "Sales", "SAL-07", "Customer Retention Rate", "customers + orders", "Sales Manager", "Monthly", "%", 70, "Higher is Better", 0.08],
  ["sales", "Sales", "SAL-08", "Sales Target Achievement", "sales_targets + orders", "Sales Manager", "Monthly", "%", 100, "Higher is Better", 0.12],
  ["sales", "Sales", "SAL-09", "Customer Satisfaction Score", "RPC: get_satisfaction_scores", "Quality", "Monthly", "Score", 4.5, "Higher is Better", 0.07],
  ["sales", "Sales", "SAL-10", "Sales per Rep", "orders + profiles", "Sales Manager", "Monthly", "EGP", 500000, "Higher is Better", 0.1],
  ["procurement", "Procurement", "PRO-01", "Cost Savings %", "RPC: get_cost_savings", "Procurement Manager", "Monthly", "%", 8, "Higher is Better", 0.15],
  ["procurement", "Procurement", "PRO-02", "Purchase Lead Time", "RPC: get_purchase_lead_time", "Procurement Manager", "Monthly", "Days", 7, "Lower is Better", 0.12],
  ["procurement", "Procurement", "PRO-03", "PO Processing Time", "purchases", "Procurement Manager", "Weekly", "Days", 2, "Lower is Better", 0.1],
  ["procurement", "Procurement", "PRO-04", "Supplier OTD %", "RPC: get_supplier_otd", "Procurement Manager", "Monthly", "%", 90, "Higher is Better", 0.12],
  ["procurement", "Procurement", "PRO-05", "Emergency Purchase %", "RPC: get_emergency_purchases", "Procurement Manager", "Monthly", "%", 5, "Lower is Better", 0.1],
  ["procurement", "Procurement", "PRO-06", "Purchase Accuracy %", "RPC: get_purchase_accuracy", "Procurement Manager", "Monthly", "%", 95, "Higher is Better", 0.1],
  ["procurement", "Procurement", "PRO-07", "Budget Adherence", "budgets + purchases", "Procurement Manager", "Monthly", "%", 100, "Higher is Better", 0.12],
  ["procurement", "Procurement", "PRO-08", "Supplier Scorecard Avg", "supplier_scorecards", "Procurement Manager", "Quarterly", "Score", 80, "Higher is Better", 0.1],
  ["procurement", "Procurement", "PRO-09", "Rejection Rate", "purchase_line_items", "Quality", "Monthly", "%", 2, "Lower is Better", 0.09],
  ["accounting-finance", "Accounting & Finance", "FIN-01", "Monthly Closing Time", "RPC: get_monthly_closing_time", "Finance Manager", "Monthly", "Days", 5, "Lower is Better", 0.12],
  ["accounting-finance", "Accounting & Finance", "FIN-02", "DSO (Days Sales Outstanding)", "finance_invoices + orders", "AR Accountant", "Monthly", "Days", 30, "Lower is Better", 0.12],
  ["accounting-finance", "Accounting & Finance", "FIN-03", "Invoice Accuracy %", "finance_invoices + financial_report_corrections", "Finance Manager", "Monthly", "%", 98, "Higher is Better", 0.1],
  ["accounting-finance", "Accounting & Finance", "FIN-04", "Budget Variance %", "RPC: get_budget_variance", "Finance Manager", "Monthly", "%", 5, "Lower is Better", 0.12],
  ["accounting-finance", "Accounting & Finance", "FIN-05", "Cash Flow Forecast Accuracy", "cash_flow_forecasts", "Finance Manager", "Monthly", "%", 90, "Higher is Better", 0.1],
  ["accounting-finance", "Accounting & Finance", "FIN-06", "Reconciliation Match Rate", "reconciliation_records", "Finance Manager", "Monthly", "%", 100, "Higher is Better", 0.1],
  ["accounting-finance", "Accounting & Finance", "FIN-07", "Report Delivery On-Time %", "financial_reports", "Finance Manager", "Monthly", "%", 100, "Higher is Better", 0.1],
  ["accounting-finance", "Accounting & Finance", "FIN-08", "Payment Processing Time", "finance_payments + finance_invoices", "AP Accountant", "Monthly", "Days", 14, "Lower is Better", 0.08],
  ["accounting-finance", "Accounting & Finance", "FIN-09", "Bank Reconciliation Timeliness", "reconciliation_records", "Finance Manager", "Monthly", "Days", 3, "Lower is Better", 0.08],
  ["accounting-finance", "Accounting & Finance", "FIN-10", "Tax Compliance Score", "manual tracking", "Finance Manager", "Quarterly", "%", 100, "Higher is Better", 0.08],
  ["warehouse", "Warehouse", "WAR-01", "Inventory Accuracy %", "warehouse_inventory_counts", "Warehouse Manager", "Monthly", "%", 98, "Higher is Better", 0.15],
  ["warehouse", "Warehouse", "WAR-02", "Order Picking Accuracy", "order_line_items + logistics_shipment_items", "Warehouse Manager", "Weekly", "%", 99, "Higher is Better", 0.12],
  ["warehouse", "Warehouse", "WAR-03", "Inventory Turnover", "warehouse_inventory + order_line_items", "Warehouse Manager", "Monthly", "Turns", 8, "Higher is Better", 0.12],
  ["warehouse", "Warehouse", "WAR-04", "Damage Rate %", "warehouse_damage_reports", "Warehouse Manager", "Monthly", "%", 1, "Lower is Better", 0.1],
  ["warehouse", "Warehouse", "WAR-05", "Stockout Rate", "warehouse_inventory", "Warehouse Manager", "Weekly", "%", 2, "Lower is Better", 0.12],
  ["warehouse", "Warehouse", "WAR-06", "Receiving Processing Time", "logistics_shipment_status_history", "Warehouse Manager", "Weekly", "Hours", 4, "Lower is Better", 0.1],
  ["warehouse", "Warehouse", "WAR-07", "Space Utilization %", "logistics_warehouses", "Warehouse Manager", "Monthly", "%", 85, "Higher is Better", 0.08],
  ["warehouse", "Warehouse", "WAR-08", "Pick Rate", "order_line_items + profiles", "Warehouse Manager", "Weekly", "Lines/Hr", 50, "Higher is Better", 0.1],
  ["warehouse", "Warehouse", "WAR-09", "Returns Processing Time", "order_tickets", "Warehouse Manager", "Monthly", "Days", 3, "Lower is Better", 0.06],
  ["warehouse", "Warehouse", "WAR-10", "Warehouse Safety Incidents", "manual tracking", "Warehouse Manager", "Monthly", "Count", 0, "Lower is Better", 0.05],
  ["transportation-fleet", "Transportation & Fleet", "FLT-01", "Fleet Availability %", "fleet_vehicles", "Fleet Manager", "Daily", "%", 90, "Higher is Better", 0.12],
  ["transportation-fleet", "Transportation & Fleet", "FLT-02", "On-Time Dispatch %", "logistics_delivery_plans", "Fleet Manager", "Daily", "%", 95, "Higher is Better", 0.12],
  ["transportation-fleet", "Transportation & Fleet", "FLT-03", "Fleet Utilization Rate", "RPC: get_fleet_utilization", "Fleet Manager", "Monthly", "Trips/Vehicle", 20, "Higher is Better", 0.1],
  ["transportation-fleet", "Transportation & Fleet", "FLT-04", "Cost per KM", "fleet_fuel_records + fleet_trips", "Fleet Manager", "Monthly", "EGP/KM", 5, "Lower is Better", 0.1],
  ["transportation-fleet", "Transportation & Fleet", "FLT-05", "Fuel Efficiency", "fleet_fuel_records", "Fleet Manager", "Monthly", "L/KM", 0.12, "Lower is Better", 0.1],
  ["transportation-fleet", "Transportation & Fleet", "FLT-06", "Maintenance Compliance %", "RPC: get_maintenance_compliance", "Fleet Manager", "Monthly", "%", 100, "Higher is Better", 0.12],
  ["transportation-fleet", "Transportation & Fleet", "FLT-07", "Vehicle Downtime %", "fleet_maintenance_records", "Fleet Manager", "Monthly", "%", 5, "Lower is Better", 0.1],
  ["transportation-fleet", "Transportation & Fleet", "FLT-08", "Route Efficiency %", "fleet_trips", "Fleet Manager", "Weekly", "%", 90, "Higher is Better", 0.08],
  ["delivery", "Delivery", "DEL-01", "On-Time Delivery %", "logistics_delivery_plans + logistics_shipment_status_history", "Delivery Manager", "Daily", "%", 95, "Higher is Better", 0.15],
  ["delivery", "Delivery", "DEL-02", "Delivery Success Rate", "logistics_delivery_plans", "Delivery Manager", "Daily", "%", 90, "Higher is Better", 0.12],
  ["delivery", "Delivery", "DEL-03", "Avg Delivery Time", "logistics_shipment_status_history", "Delivery Manager", "Daily", "Hours", 4, "Lower is Better", 0.12],
  ["delivery", "Delivery", "DEL-04", "Customer Delivery Rating", "RPC: get_satisfaction_scores", "Quality", "Monthly", "Score", 4.5, "Higher is Better", 0.1],
  ["delivery", "Delivery", "DEL-05", "Delivery Cost per Order", "logistics_delivery_plans + fleet_trips", "Delivery Manager", "Monthly", "EGP", 25, "Lower is Better", 0.1],
  ["delivery", "Delivery", "DEL-06", "Returns Rate", "orders + logistics_delivery_plans", "Delivery Manager", "Weekly", "%", 3, "Lower is Better", 0.08],
  ["delivery", "Delivery", "DEL-07", "Collection Accuracy %", "logistics_order_collections", "Finance", "Daily", "%", 100, "Higher is Better", 0.1],
  ["quality-customer-service", "Quality & CS", "QCS-01", "Customer Satisfaction Score", "RPC: get_satisfaction_scores", "Quality Manager", "Monthly", "Score", 4.5, "Higher is Better", 0.12],
  ["quality-customer-service", "Quality & CS", "QCS-02", "NPS Score", "RPC: get_satisfaction_scores", "Quality Manager", "Monthly", "Score", 50, "Higher is Better", 0.1],
  ["quality-customer-service", "Quality & CS", "QCS-03", "Ticket Resolution Time", "order_tickets", "CS Manager", "Weekly", "Hours", 24, "Lower is Better", 0.12],
  ["quality-customer-service", "Quality & CS", "QCS-04", "First Contact Resolution %", "order_tickets", "CS Manager", "Monthly", "%", 70, "Higher is Better", 0.1],
  ["quality-customer-service", "Quality & CS", "QCS-05", "Complaint Resolution Rate", "order_tickets", "Quality Manager", "Monthly", "%", 95, "Higher is Better", 0.1],
  ["quality-customer-service", "Quality & CS", "QCS-06", "Corrective Action Closure Rate", "corrective_actions", "Quality Manager", "Monthly", "%", 90, "Higher is Better", 0.08],
  ["quality-customer-service", "Quality & CS", "QCS-07", "Quality Audit Score", "internal_audits", "Quality Manager", "Quarterly", "Score", 90, "Higher is Better", 0.08],
  ["quality-customer-service", "Quality & CS", "QCS-08", "Root Cause Analysis Completion", "order_tickets", "Quality Manager", "Monthly", "%", 100, "Higher is Better", 0.08],
  ["business-dev", "Business Dev / OD", "BOD-01", "Process Improvement Rate", "process_improvements", "OD Manager", "Quarterly", "%", 70, "Higher is Better", 0.1],
  ["business-dev", "Business Dev / OD", "BOD-02", "Cost Savings from Improvements", "process_improvements", "OD Manager", "Quarterly", "EGP", 500000, "Higher is Better", 0.12],
  ["business-dev", "Business Dev / OD", "BOD-03", "Automation Rate", "automation_tracker", "IT Manager", "Quarterly", "%", 50, "Higher is Better", 0.1],
  ["business-dev", "Business Dev / OD", "BOD-04", "SOP Compliance %", "internal_audits", "Quality Manager", "Quarterly", "%", 95, "Higher is Better", 0.1],
  ["business-dev", "Business Dev / OD", "BOD-05", "New Partnerships", "manual tracking", "BD Manager", "Quarterly", "Count", 5, "Higher is Better", 0.08],
  ["business-dev", "Business Dev / OD", "BOD-06", "Revenue from New Channels", "orders + customers", "BD Manager", "Quarterly", "EGP", 1000000, "Higher is Better", 0.1],
  ["business-dev", "Business Dev / OD", "BOD-07", "Audit Findings Closure Rate", "internal_audits", "Audit Manager", "Quarterly", "%", 100, "Higher is Better", 0.1],
  ["business-dev", "Business Dev / OD", "BOD-08", "Report Delivery On-Time %", "report_calendar", "OD Manager", "Monthly", "%", 100, "Higher is Better", 0.08],
  ["business-dev", "Business Dev / OD", "BOD-09", "KPI Achievement Rate", "RPC: get_kpi_achievement", "OD Manager", "Monthly", "%", 80, "Higher is Better", 0.12],
  ["hr", "HR", "HR-01", "Employee Turnover Rate", "RPC: get_employee_turnover", "HR Manager", "Monthly", "%", 5, "Lower is Better", 0.12],
  ["hr", "HR", "HR-02", "Time to Hire", "hiring_requests", "HR Manager", "Monthly", "Days", 21, "Lower is Better", 0.1],
  ["hr", "HR", "HR-03", "Training Completion %", "training_records", "HR Manager", "Monthly", "%", 90, "Higher is Better", 0.08],
  ["hr", "HR", "HR-04", "Attendance Rate", "attendance_records", "HR Manager", "Monthly", "%", 95, "Higher is Better", 0.1],
  ["hr", "HR", "HR-05", "Payroll Accuracy %", "payroll_records", "HR Manager", "Monthly", "%", 100, "Higher is Better", 0.1],
  ["hr", "HR", "HR-06", "Appraisal Completion %", "performance_appraisals", "HR Manager", "Quarterly", "%", 100, "Higher is Better", 0.08],
  ["hr", "HR", "HR-07", "Personnel File Accuracy", "personnel_file_audits", "HR Manager", "Monthly", "%", 100, "Higher is Better", 0.08],
  ["hr", "HR", "HR-08", "Employee Satisfaction Score", "RPC: get_satisfaction_scores", "HR Manager", "Quarterly", "Score", 4, "Higher is Better", 0.1],
  ["hr", "HR", "HR-09", "Employee Engagement Score", "RPC: get_satisfaction_scores", "HR Manager", "Quarterly", "Score", 4, "Higher is Better", 0.08],
  ["it-data", "IT & Data", "ITD-01", "System Uptime %", "system_uptime_logs", "IT Manager", "Daily", "%", 99.5, "Higher is Better", 0.15],
  ["it-data", "IT & Data", "ITD-02", "Ticket Resolution Time", "RPC: get_ticket_resolution_metrics", "IT Manager", "Weekly", "Hours", 8, "Lower is Better", 0.12],
  ["it-data", "IT & Data", "ITD-03", "Data Sync Success Rate", "RPC: get_sync_success_rate", "Data Engineer", "Daily", "%", 99, "Higher is Better", 0.12],
  ["it-data", "IT & Data", "ITD-04", "IT Ticket Volume", "it_tickets", "IT Manager", "Weekly", "Count", 20, "Lower is Better", 0.08],
  ["it-data", "IT & Data", "ITD-05", "Data Quality Index", "data_quality_audits", "Data Manager", "Monthly", "Score", 95, "Higher is Better", 0.1],
  ["it-data", "IT & Data", "ITD-06", "User Satisfaction (IT)", "it_tickets", "IT Manager", "Monthly", "Score", 4, "Higher is Better", 0.08],
  ["marketing", "Marketing", "MKT-01", "Campaign ROI", "marketing_campaigns", "Marketing Manager", "Monthly", "%", 200, "Higher is Better", 0.15],
  ["marketing", "Marketing", "MKT-02", "Cost per Lead", "marketing_campaigns", "Marketing Manager", "Monthly", "EGP", 50, "Lower is Better", 0.12],
  ["marketing", "Marketing", "MKT-03", "Social Media Engagement Rate", "social_media_metrics", "Marketing Manager", "Weekly", "%", 5, "Higher is Better", 0.1],
  ["marketing", "Marketing", "MKT-04", "Content Publishing Rate", "content_calendar", "Content Manager", "Weekly", "%", 90, "Higher is Better", 0.1],
  ["marketing", "Marketing", "MKT-05", "Brand Activation ROI", "brand_activations", "Marketing Manager", "Monthly", "%", 150, "Higher is Better", 0.08],
] as const;

const MANUAL_DEPARTMENTS = new Set<KpiDepartmentSlug>(["hr", "marketing"]);
const APP_COMPUTED = new Set([
  "SAL-01",
  "SAL-03",
  "SAL-04",
  "SAL-05",
  "SAL-06",
  "SAL-07",
  "SAL-09",
  "SAL-10",
  "QCS-01",
  "QCS-03",
  "QCS-05",
]);
const APP_SOURCE_FORMULA_PENDING = new Set([
  "WAR-07",
  "WAR-08",
  "WAR-09",
  "FLT-02",
  "DEL-02",
  "DEL-04",
  "DEL-05",
  "DEL-07",
  "QCS-04",
  "QCS-08",
]);
const MIXED_SOURCE = new Set(["WAR-03", "DEL-05", "BOD-06", "BOD-09"]);
const MANUAL_SOURCE = new Set([
  "PRO-08",
  "FIN-01",
  "FIN-05",
  "FIN-06",
  "FIN-07",
  "FIN-09",
  "FIN-10",
  "WAR-01",
  "WAR-04",
  "WAR-10",
  "DEL-04",
  "QCS-02",
  "QCS-06",
  "QCS-07",
  "BOD-01",
  "BOD-02",
  "BOD-03",
  "BOD-04",
  "BOD-05",
  "BOD-07",
  "BOD-08",
  "ITD-01",
  "ITD-02",
  "ITD-03",
  "ITD-04",
  "ITD-05",
  "ITD-06",
]);

function sourceFor(row: (typeof KPI_ROWS)[number]): KpiSourceDefinition {
  const [departmentSlug, , code, , dataSource] = row;
  const slug = departmentSlug as KpiDepartmentSlug;
  if (APP_COMPUTED.has(code)) {
    if (code === "SAL-01") {
      return {
        mode: "app",
        label: "Live from main app",
        detail: "Calculated by summing order_line_items.total_amount for product lines attached to orders in the selected period.",
      };
    }
    if (code === "SAL-06") {
      return {
        mode: "app",
        label: "Live from main app",
        detail: "Calculated from customers.created_at in the selected period, matching the existing customer analytics dashboard grain.",
      };
    }
    if (code === "SAL-09" || code === "QCS-01") {
      return {
        mode: "app",
        label: "Live from main app",
        detail: "Operational satisfaction proxy from reorder rate, order ticket resolution, and scored sales activities from calls/visits.",
      };
    }
    if (code === "QCS-03") {
      return {
        mode: "app",
        label: "Live from main app",
        detail: "Average hours from order_tickets.created_at to resolved_at/closed_at for tickets resolved in the selected period.",
      };
    }
    if (code === "QCS-05") {
      return {
        mode: "app",
        label: "Live from main app",
        detail: "Resolved or closed customer_complaint tickets divided by customer_complaint tickets created in the selected period.",
      };
    }
    return {
      mode: "app",
      label: "Live from main app",
      detail: `Calculated from ${dataSource}.`,
    };
  }
  if (APP_SOURCE_FORMULA_PENDING.has(code)) {
    return {
      mode: "not_implemented",
      label: "Main app source found",
      detail: `Source table exists or is expected in the main app (${dataSource}), but the KPI formula still needs a verified implementation.`,
      missingOwner: "Main App Formula",
    };
  }
  if (MANUAL_DEPARTMENTS.has(slug) || MANUAL_SOURCE.has(code) || dataSource === "manual tracking") {
    return {
      mode: "manual",
      label: "Manual upload",
      detail: `Upload ${dataSource} results by CSV until a system source is connected.`,
      missingOwner: "Manual Upload",
      manualTemplate: `${slug}-kpis`,
    };
  }
  if (MIXED_SOURCE.has(code)) {
    return {
      mode: "mixed",
      label: "Mixed source",
      detail: `Partly available from the app, but still needs target/channel/cost data from Odoo or manual upload (${dataSource}).`,
      missingOwner: "Mixed",
      manualTemplate: `${slug}-kpis`,
    };
  }
  return {
    mode: "odoo",
    label: "Odoo source required",
    detail: `Requires an Odoo/imported source for ${dataSource}.`,
    missingOwner: "Odoo",
  };
}

export const KPI_REGISTRY: KpiDefinition[] = KPI_ROWS.map((row) => {
  const [
    departmentSlug,
    department,
    code,
    name,
    dataSource,
    owner,
    frequency,
    unit,
    target,
    direction,
    weight,
  ] = row;

  return {
    departmentSlug: departmentSlug as KpiDepartmentSlug,
    department,
    code,
    name,
    dataSource,
    owner,
    frequency,
    unit,
    target,
    direction: direction as KpiDirection,
    weight,
    source: sourceFor(row),
  };
});

export const KPI_DEPARTMENTS = Array.from(
  new Map(KPI_REGISTRY.map((kpi) => [kpi.departmentSlug, { slug: kpi.departmentSlug, name: kpi.department }])).values(),
);

export function getKpisForDepartment(departmentSlug: KpiDepartmentSlug) {
  return KPI_REGISTRY.filter((kpi) => kpi.departmentSlug === departmentSlug);
}

export function getKpiByCode(code: string) {
  return KPI_REGISTRY.find((kpi) => kpi.code === code);
}

export function isManualUploadKpi(kpi: KpiDefinition) {
  return kpi.source.mode === "manual" || kpi.source.mode === "mixed";
}
