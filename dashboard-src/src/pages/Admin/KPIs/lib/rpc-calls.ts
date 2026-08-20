import { supabase } from "../../../../lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as any;

export async function rpcGrossProfit(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("compute_gross_profit", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcSatisfactionScores(dateFrom: string, dateTo: string, surveyType?: string) {
  const { data, error } = await rpc("get_satisfaction_scores", {
    p_date_from: dateFrom, p_date_to: dateTo, p_survey_type: surveyType ?? null,
  });
  if (error) throw error;
  return data;
}

export async function rpcPurchaseLeadTime(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_purchase_lead_time", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcSupplierOtd(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_supplier_otd", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcEmergencyPurchases(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_emergency_purchases", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcPurchaseAccuracy(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_purchase_accuracy", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcCostSavings(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_cost_savings", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcMonthlyClosingTime(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_monthly_closing_time", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcBudgetVariance(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_budget_variance", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcFleetUtilization(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_fleet_utilization", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcMaintenanceCompliance(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_maintenance_compliance", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcEmployeeTurnover(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_employee_turnover", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcTicketResolutionMetrics(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_ticket_resolution_metrics", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcSyncSuccessRate(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_sync_success_rate", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcKpiAchievement(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_kpi_achievement", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcAllKpiActuals(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_all_kpi_actuals", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcDashboardSummary(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_kpi_dashboard_summary", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcDepartmentScores(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_department_scores", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcTotalRevenue(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_total_revenue", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcAvgOrderValue(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_avg_order_value", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcRevenueGrowthRate(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_revenue_growth_rate", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcNewCustomers(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_new_customers", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcSalesPerRep(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_sales_per_rep", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcPoProcessingTime(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_po_processing_time", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcRejectionRate(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_rejection_rate", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcInventoryAccuracy(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_inventory_accuracy", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcDamageRate(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_damage_rate", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcTimeToHire(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_time_to_hire", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcAttendanceRate(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_attendance_rate", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcPayrollAccuracy(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_payroll_accuracy", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcCampaignRoi(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_campaign_roi", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcSocialEngagementRate(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_social_engagement_rate", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}

export async function rpcIndividualKpiPerAgent(dateFrom: string, dateTo: string) {
  const { data, error } = await rpc("get_individual_kpi_per_agent", {
    p_date_from: dateFrom, p_date_to: dateTo,
  });
  if (error) throw error;
  return data;
}
