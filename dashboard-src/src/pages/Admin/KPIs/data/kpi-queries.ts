import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../../lib/supabase";
import type { DateRange } from "../../../../types/kpi";
import * as rpc from "../lib/rpc-calls";

export function useKpiTracking(dr: DateRange, department?: string) {
  return useQuery({
    queryKey: ["kpi-tracking", dr, department],
    queryFn: async () => {
      let query = supabase.from("kpi_tracking").select("*");
      if (dr.from) query = query.gte("tracking_month", dr.from);
      if (dr.to) query = query.lte("tracking_month", dr.to);
      if (department) query = query.eq("department", department);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllKpiActuals(dr: DateRange) {
  return useQuery({
    queryKey: ["kpi-all-actuals", dr],
    queryFn: () => rpc.rpcAllKpiActuals(dr.from, dr.to),
  });
}

export function useDashboardSummary(dr: DateRange) {
  return useQuery({
    queryKey: ["kpi-dashboard-summary", dr],
    queryFn: () => rpc.rpcDashboardSummary(dr.from, dr.to),
  });
}

export function useDepartmentScores(dr: DateRange) {
  return useQuery({
    queryKey: ["kpi-department-scores", dr],
    queryFn: () => rpc.rpcDepartmentScores(dr.from, dr.to),
  });
}

export function useGrossProfit(dr: DateRange) {
  return useQuery({
    queryKey: ["gross-profit", dr],
    queryFn: () => rpc.rpcGrossProfit(dr.from, dr.to),
  });
}

export function useSatisfactionScores(dr: DateRange, surveyType?: string) {
  return useQuery({
    queryKey: ["satisfaction", dr, surveyType],
    queryFn: () => rpc.rpcSatisfactionScores(dr.from, dr.to, surveyType),
  });
}

export function usePurchaseLeadTime(dr: DateRange) {
  return useQuery({
    queryKey: ["purchase-lead-time", dr],
    queryFn: () => rpc.rpcPurchaseLeadTime(dr.from, dr.to),
  });
}

export function useSupplierOtd(dr: DateRange) {
  return useQuery({
    queryKey: ["supplier-otd", dr],
    queryFn: () => rpc.rpcSupplierOtd(dr.from, dr.to),
  });
}

export function useEmergencyPurchases(dr: DateRange) {
  return useQuery({
    queryKey: ["emergency-purchases", dr],
    queryFn: () => rpc.rpcEmergencyPurchases(dr.from, dr.to),
  });
}

export function usePurchaseAccuracy(dr: DateRange) {
  return useQuery({
    queryKey: ["purchase-accuracy", dr],
    queryFn: () => rpc.rpcPurchaseAccuracy(dr.from, dr.to),
  });
}

export function useCostSavings(dr: DateRange) {
  return useQuery({
    queryKey: ["cost-savings", dr],
    queryFn: () => rpc.rpcCostSavings(dr.from, dr.to),
  });
}

export function useMonthlyClosingTime(dr: DateRange) {
  return useQuery({
    queryKey: ["monthly-closing", dr],
    queryFn: () => rpc.rpcMonthlyClosingTime(dr.from, dr.to),
  });
}

export function useBudgetVariance(dr: DateRange) {
  return useQuery({
    queryKey: ["budget-variance", dr],
    queryFn: () => rpc.rpcBudgetVariance(dr.from, dr.to),
  });
}

export function useFleetUtilization(dr: DateRange) {
  return useQuery({
    queryKey: ["fleet-utilization", dr],
    queryFn: () => rpc.rpcFleetUtilization(dr.from, dr.to),
  });
}

export function useMaintenanceCompliance(dr: DateRange) {
  return useQuery({
    queryKey: ["maintenance-compliance", dr],
    queryFn: () => rpc.rpcMaintenanceCompliance(dr.from, dr.to),
  });
}

export function useEmployeeTurnover(dr: DateRange) {
  return useQuery({
    queryKey: ["employee-turnover", dr],
    queryFn: () => rpc.rpcEmployeeTurnover(dr.from, dr.to),
  });
}

export function useTicketResolution(dr: DateRange) {
  return useQuery({
    queryKey: ["ticket-resolution", dr],
    queryFn: () => rpc.rpcTicketResolutionMetrics(dr.from, dr.to),
  });
}

export function useSyncSuccessRate(dr: DateRange) {
  return useQuery({
    queryKey: ["sync-success", dr],
    queryFn: () => rpc.rpcSyncSuccessRate(dr.from, dr.to),
  });
}

export function useKpiAchievement(dr: DateRange) {
  return useQuery({
    queryKey: ["kpi-achievement", dr],
    queryFn: () => rpc.rpcKpiAchievement(dr.from, dr.to),
  });
}

export function useTotalRevenue(dr: DateRange) {
  return useQuery({
    queryKey: ["total-revenue", dr],
    queryFn: () => rpc.rpcTotalRevenue(dr.from, dr.to),
  });
}

export function useAvgOrderValue(dr: DateRange) {
  return useQuery({
    queryKey: ["avg-order-value", dr],
    queryFn: () => rpc.rpcAvgOrderValue(dr.from, dr.to),
  });
}

export function useRevenueGrowthRate(dr: DateRange) {
  return useQuery({
    queryKey: ["revenue-growth", dr],
    queryFn: () => rpc.rpcRevenueGrowthRate(dr.from, dr.to),
  });
}

export function useNewCustomers(dr: DateRange) {
  return useQuery({
    queryKey: ["new-customers", dr],
    queryFn: () => rpc.rpcNewCustomers(dr.from, dr.to),
  });
}

export function useSalesPerRep(dr: DateRange) {
  return useQuery({
    queryKey: ["sales-per-rep", dr],
    queryFn: () => rpc.rpcSalesPerRep(dr.from, dr.to),
  });
}

export function usePoProcessingTime(dr: DateRange) {
  return useQuery({
    queryKey: ["po-processing-time", dr],
    queryFn: () => rpc.rpcPoProcessingTime(dr.from, dr.to),
  });
}

export function useRejectionRate(dr: DateRange) {
  return useQuery({
    queryKey: ["rejection-rate", dr],
    queryFn: () => rpc.rpcRejectionRate(dr.from, dr.to),
  });
}

export function useInventoryAccuracy(dr: DateRange) {
  return useQuery({
    queryKey: ["inventory-accuracy", dr],
    queryFn: () => rpc.rpcInventoryAccuracy(dr.from, dr.to),
  });
}

export function useDamageRate(dr: DateRange) {
  return useQuery({
    queryKey: ["damage-rate", dr],
    queryFn: () => rpc.rpcDamageRate(dr.from, dr.to),
  });
}

export function useTimeToHire(dr: DateRange) {
  return useQuery({
    queryKey: ["time-to-hire", dr],
    queryFn: () => rpc.rpcTimeToHire(dr.from, dr.to),
  });
}

export function useAttendanceRate(dr: DateRange) {
  return useQuery({
    queryKey: ["attendance-rate", dr],
    queryFn: () => rpc.rpcAttendanceRate(dr.from, dr.to),
  });
}

export function usePayrollAccuracy(dr: DateRange) {
  return useQuery({
    queryKey: ["payroll-accuracy", dr],
    queryFn: () => rpc.rpcPayrollAccuracy(dr.from, dr.to),
  });
}

export function useCampaignRoi(dr: DateRange) {
  return useQuery({
    queryKey: ["campaign-roi", dr],
    queryFn: () => rpc.rpcCampaignRoi(dr.from, dr.to),
  });
}

export function useSocialEngagementRate(dr: DateRange) {
  return useQuery({
    queryKey: ["social-engagement", dr],
    queryFn: () => rpc.rpcSocialEngagementRate(dr.from, dr.to),
  });
}

export function useIndividualKpiPerAgent(dr: DateRange) {
  return useQuery({
    queryKey: ["individual-kpi-per-agent", dr],
    queryFn: () => rpc.rpcIndividualKpiPerAgent(dr.from, dr.to),
  });
}
