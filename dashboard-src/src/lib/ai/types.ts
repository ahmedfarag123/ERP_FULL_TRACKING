// AI Types — Adapted from reference project for Horeca Smart

export interface ExecutiveAIContextMetadata {
  generatedAt: string;
  dataFreshnessDate: string;
  operatingCurrency: 'EGP';
}

export interface ExecutiveAIActiveFilters {
  dateRangeLabel: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  companyName: string | null;
  salespersonName: string | null;
  governorateName: string | null;
  areaName: string | null;
  customerFilterActive: boolean;
  productName: string | null;
  customerId?: number | null;
  customerName?: string | null;
}

export interface ExecutiveAISalesKpis {
  totalSales: number;
  confirmedOrders: number;
  activeCustomers: number;
  averageOrderValue: number;
  revenueGrowthPct: number | null;
  previousPeriodSales: number | null;
}

export interface ExecutiveAIRetentionSummary {
  previousActiveCustomers: number;
  retainedWithSameRep: number;
  transferredCustomers: number;
  trueLostCustomers: number;
  newCustomers: number;
  companyRetentionRate: number;
  sameRepRetentionRate: number;
  lostCustomerRevenueEgp: number;
}

export interface ExecutiveAIRiskDistribution {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalRecoveryOpportunityEgp: number;
}

export interface ExecutiveAISalesRepAggregate {
  salesperson: string;
  companyName: string;
  salesValue: number;
  ordersCount: number;
  activeCustomers: number;
  retentionRate: number | null;
}

export interface ExecutiveAIProductAggregate {
  productName: string;
  categoryName: string | null;
  salesValue: number;
  quantitySold: number;
  uniqueCustomersCount: number;
}

export interface ExecutiveAIGeographyAggregate {
  governorate: string;
  salesValue: number;
  ordersCount: number;
}

export interface ExecutiveAIContext {
  metadata: ExecutiveAIContextMetadata;
  activeFilters: ExecutiveAIActiveFilters;
  salesKpis: ExecutiveAISalesKpis;
  retentionSummary?: ExecutiveAIRetentionSummary | null;
  riskDistribution?: ExecutiveAIRiskDistribution | null;
  topSalesRepsAggregate?: ExecutiveAISalesRepAggregate[];
  topProductsAggregate?: ExecutiveAIProductAggregate[];
  geographyAggregate?: ExecutiveAIGeographyAggregate[];
}

export type AiQueryIntent =
  | 'PROHIBITED_DATA_REQUEST'
  | 'PAYMENT_STATUS'
  | 'CUSTOMER_RECENT_ORDERS'
  | 'ORDER_LOOKUP'
  | 'CUSTOMER_PRODUCT_HISTORY'
  | 'CROSS_SELL'
  | 'DECLINING_CUSTOMERS'
  | 'LOST_CUSTOMERS'
  | 'PRODUCT_CUSTOMERS'
  | 'CUSTOMER_ANALYSIS'
  | 'PRODUCT_ANALYSIS'
  | 'SALES_REPS'
  | 'RETENTION'
  | 'RISK'
  | 'GEOGRAPHY'
  | 'PRODUCT_PERFORMANCE'
  | 'SALES_PERFORMANCE'
  | 'EXECUTIVE_SUMMARY'
  | 'GENERAL_EXECUTIVE_QUESTION';

export type AiContextMode = 'AGGREGATED' | 'DRILL_DOWN';

export type PaymentStatusType = 'PAID' | 'UNPAID' | 'PARTIAL' | 'CREDIT' | 'UNKNOWN';

export interface SafeOrderDTO {
  orderId: number | string;
  orderName: string;
  orderDate: string;
  customerName?: string;
  companyName: string;
  salesperson: string;
  governorateName?: string | null;
  areaName?: string | null;
  orderValue: number;
  productsCount: number;
  linesCount: number;
  totalQuantity: number;
  orderStatus: 'CONFIRMED';
  paymentStatus: PaymentStatusType;
}

export interface SafeCustomerDetailDTO {
  customerId: number;
  customerName: string;
  companyName: string;
  salespersonName: string;
  governorateName?: string | null;
  areaName?: string | null;
  totalSales: number;
  ordersCount: number;
  averageOrderValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  previousPeriodSales: number;
  currentPeriodSales: number;
  salesChangePct: number | null;
  customerStatus: string;
  riskLevel?: string;
  recoveryOpportunity?: number;
}

export interface SafeCustomerProductHistoryDTO {
  customerId: number;
  customerName: string;
  stoppedProducts: Array<{
    productId: number;
    productName: string;
    previousSales: number;
    currentSales: number;
    recoveryValue: number;
    status: string;
  }>;
  favoriteProducts: Array<{
    productId: number;
    productName: string;
    salesValue: number;
    ordersCount: number;
    salesSharePct: number;
    lastOrderDate: string | null;
  }>;
}

export interface SafeProductDetailDTO {
  productId: number;
  productName: string;
  categoryName: string | null;
  periodSales: number;
  periodQuantity: number;
  periodOrders: number;
  periodCustomers: number;
  averageUnitValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  topCustomers?: Array<{
    customerId: number;
    customerName: string;
    ordersCount: number;
    salesValue: number;
    lastOrderDate: string | null;
  }>;
}

export interface SafeProductCustomerDTO {
  customerId: number;
  customerName: string;
  companyName: string;
  salesperson: string;
  governorateName?: string | null;
  areaName?: string | null;
  ordersCount: number;
  salesValue: number;
  quantity: number;
  lastOrderDate: string | null;
}

export interface SafeRetentionDetailDTO {
  companyName: string;
  customerId: number;
  customerName: string;
  previousSalesperson: string;
  currentSalesperson: string;
  previousOrders: number;
  currentOrders: number;
  previousSales: number;
  currentSales: number;
  retentionStatus: string;
  salesChangePct: number | null;
  previousLastOrderDate: string | null;
  currentLastOrderDate: string | null;
}

export interface SafeActionCenterDTO {
  customerId: number;
  customerName: string;
  companyName: string;
  currentSalesperson: string;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  medianDaysBetweenOrders: number;
  recent30dSales: number;
  previous30dSales: number;
  salesChangePct: number | null;
  recoveryOpportunity: number;
  riskLevel: string;
  actionType: string;
  priority: string;
  actionReason: string;
  salespersonChanged: boolean;
}


export interface SafeCrossSellCandidateDTO {
  productId: number;
  productName: string;
  peerCustomersCount: number;
  peerOrdersCount: number;
  peerSalesValue: number;
  affinityScore: number;
}

export interface ExecutiveDrillDownContext {
  targetCustomer?: SafeCustomerDetailDTO;
  recentOrders?: SafeOrderDTO[];
  customerProductHistory?: SafeCustomerProductHistoryDTO;
  targetProduct?: SafeProductDetailDTO;
  productTopCustomers?: SafeProductCustomerDTO[];
  decliningCustomers?: Array<{
    customerId: number;
    customerName: string;
    companyName?: string;
    primarySalesperson: string;
    salesValue: number;
    previousSales: number;
    salesChangePct: number | null;
    salesGap: number;
  }>;
  lostCustomers?: SafeRetentionDetailDTO[];
  riskActionCenter?: SafeActionCenterDTO[];
  crossSellCandidates?: SafeCrossSellCandidateDTO[];
  paymentStatusSummary?: {
    statusNote: string;
    hasReliablePaymentLedger: boolean;
  };
}

export type AiRouterStatus =
  | 'SUCCESS'
  | 'PROHIBITED_DATA_DETECTED'
  | 'PAYMENT_STATUS_UNKNOWN'
  | 'ENTITY_NOT_FOUND'
  | 'DRILLDOWN_DATA_UNAVAILABLE'
  | 'UNSUPPORTED_QUERY'
  | 'INVALID_INPUT'
  | 'AI_SERVICE_UNAVAILABLE';

export interface AiContextRouterResult {
  status: AiRouterStatus;
  intent: AiQueryIntent;
  contextMode: AiContextMode;
  analyticsContext?: ExecutiveAIContext;
  drillDownContext?: ExecutiveDrillDownContext;
  userMessage?: string;
  errorMessage?: string;
}

export interface AiChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
  error?: boolean;
  intent?: AiQueryIntent;
  contextMode?: AiContextMode;
}

export interface AiChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  analyticsContext: ExecutiveAIContext;
  drillDownContext?: ExecutiveDrillDownContext;
  contextMode?: AiContextMode;
  intent?: AiQueryIntent;
  language?: 'ar' | 'en';
}

export interface AiChatSuccessResponse {
  text: string;
}

export type AiErrorCode =
  | 'CONFIG_ERROR'
  | 'INVALID_INPUT'
  | 'AI_SERVICE_UNAVAILABLE'
  | 'AI_CONTEXT_SECURITY_VIOLATION'
  | 'AI_CONTEXT_TOO_LARGE'
  | 'PROHIBITED_DATA_DETECTED';

export interface AiChatErrorResponse {
  error: { code: AiErrorCode; message: string };
}
