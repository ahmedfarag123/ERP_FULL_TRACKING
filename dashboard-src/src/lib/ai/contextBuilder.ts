import {
  ExecutiveAIContext,
  ExecutiveDrillDownContext,
  AiChatMessage,
  AiChatRequest,
  AiChatSuccessResponse,
  AiChatErrorResponse,
  AiContextMode,
  AiQueryIntent,
} from './types';
import {
  sanitizeExecutiveContext,
  sanitizeDrillDownContext,
  scanForProhibitedAiData,
} from './sanitizer';

interface FilterState {
  customerId?: number | null;
  productId?: number | null;
  customerName?: string;
  productName?: string;
  dateRange?: { label: string };
  periodMode?: string;
}

const PROHIBITED_KEYS = [
  'order_id',
  'order_name',
  'invoice',
  'phone',
  'mobile',
  'email',
  'street',
  'address',
  'customer_id',
  'customer_name',
  'raw_orders',
  'orders_list',
];

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string) + '/crm/api/analytics';
}

function getAiApiBaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string) + '/crm/api/ai';
}

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('crm_auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

function toSnakeCaseKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Validates that an assembled ExecutiveAIContext does not contain any prohibited PII,
 * transaction IDs, customer names/IDs, or raw order arrays.
 */
export function validateSanitizedContext(context: ExecutiveAIContext): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const serialized = JSON.stringify(context);

  for (const key of PROHIBITED_KEYS) {
    // Check if key exists as an object property in JSON
    const pattern = new RegExp(`"${key}"\\s*:`, 'i');
    if (pattern.test(serialized)) {
      violations.push(`Prohibited key detected: "${key}"`);
    }
  }

  // Also verify activeFilters customerFilterActive is boolean and no customerName/Id was smuggled
  if ((context.activeFilters as any).customerName || (context.activeFilters as any).customerId) {
    violations.push('Customer identity detected in activeFilters');
  }

  // Check for regex patterns of email patterns in the JSON
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(serialized)) {
    violations.push('Email address detected in context');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Trims chat history to a maximum of the most recent 8 messages.
 */
export function trimChatHistory(history: AiChatMessage[]): Array<{ role: 'user' | 'model'; text: string }> {
  const filtered = history
    .filter((msg) => !msg.error && msg.text && (msg.role === 'user' || msg.role === 'model'))
    .map((msg) => ({
      role: msg.role,
      text: msg.text,
    }));

  if (filtered.length <= 8) {
    return filtered;
  }
  return filtered.slice(-8);
}

/**
 * Assembles the ExecutiveAIContext by fetching from the CRM REST API.
 */
export async function buildExecutiveAIContext(filters: FilterState): Promise<ExecutiveAIContext> {
  const baseUrl = getApiBaseUrl();
  const headers = getAuthHeaders();
  const month = filters.dateRange?.label
    ? new Date().toISOString().slice(0, 7) + '-01'
    : '2026-08-01';

  const effectiveEndDate = new Date().toISOString().slice(0, 10);
  const effectiveStartDate = filters.dateRange?.label
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : '2026-01-01';

  const commonQueryParams: Record<string, unknown> = {
    start_date: effectiveStartDate,
    end_date: effectiveEndDate,
    customer_id: filters.customerId,
    product_id: filters.productId,
  };

  // Concurrently fetch executive-level aggregates from CRM API
  const [
    kpisRes,
    retentionRes,
    riskDistRes,
    salesRepsRes,
    productsRes,
    govRes,
  ] = await Promise.allSettled([
    fetch(`${baseUrl}/executive/kpis${buildQueryString(commonQueryParams)}`, { headers }).then((r) => r.json()),
    fetch(`${baseUrl}/customers/retention-summary${buildQueryString({ month, ...commonQueryParams })}`, { headers }).then((r) => r.json()),
    fetch(`${baseUrl}/customers/action-center${buildQueryString({ as_of_date: effectiveEndDate, ...commonQueryParams })}`, { headers }).then((r) => r.json()),
    fetch(`${baseUrl}/sales-reps/summary${buildQueryString({ month, ...commonQueryParams })}`, { headers }).then((r) => r.json()),
    fetch(`${baseUrl}/products/summary${buildQueryString({ ...commonQueryParams, limit: 10 })}`, { headers }).then((r) => r.json()),
    fetch(`${baseUrl}/filters/governorates${buildQueryString(commonQueryParams)}`, { headers }).then((r) => r.json()),
  ]);

  const kpi = kpisRes.status === 'fulfilled' && Array.isArray(kpisRes.value) && kpisRes.value.length > 0
    ? kpisRes.value[0]
    : kpisRes.status === 'fulfilled' && typeof kpisRes.value === 'object' && !Array.isArray(kpisRes.value)
      ? kpisRes.value
      : null;
  const retention = retentionRes.status === 'fulfilled' && Array.isArray(retentionRes.value) && retentionRes.value.length > 0
    ? retentionRes.value[0]
    : retentionRes.status === 'fulfilled' && typeof retentionRes.value === 'object' && !Array.isArray(retentionRes.value)
      ? retentionRes.value
      : null;
  const riskList = riskDistRes.status === 'fulfilled'
    ? (Array.isArray(riskDistRes.value) ? riskDistRes.value : riskDistRes.value?.actionCenterItems || [])
    : [];
  const repList = salesRepsRes.status === 'fulfilled'
    ? (Array.isArray(salesRepsRes.value) ? salesRepsRes.value : [])
    : [];
  const productList = productsRes.status === 'fulfilled'
    ? (Array.isArray(productsRes.value) ? productsRes.value : [])
    : [];
  const govList = govRes.status === 'fulfilled'
    ? (Array.isArray(govRes.value) ? govRes.value : [])
    : [];

  // Risk distribution aggregate rollup
  let riskDistribution: ExecutiveAIContext['riskDistribution'] = null;
  if (riskList.length > 0) {
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let totalRecoveryOpportunityEgp = 0;

    for (const r of riskList) {
      const level = (r.riskLevel || '').toUpperCase();
      if (level === 'HIGH' || level === 'CRITICAL') {
        highRiskCount += r.customersCount || 1;
      } else if (level === 'MEDIUM' || level === 'MED') {
        mediumRiskCount += r.customersCount || 1;
      } else {
        lowRiskCount += r.customersCount || 1;
      }
      totalRecoveryOpportunityEgp += r.recoveryOpportunity || 0;
    }

    riskDistribution = {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      totalRecoveryOpportunityEgp,
    };
  }

  // Top Sales Reps (aggregated league table, max 5)
  const topSalesRepsAggregate = repList
    .slice(0, 5)
    .map((r: any) => ({
      salesperson: r.salesperson || r.salespersonName || '',
      companyName: r.companyName || '',
      salesValue: r.salesValue || 0,
      ordersCount: r.ordersCount || 0,
      activeCustomers: r.activeCustomers || 0,
      retentionRate: r.retentionRate != null ? r.retentionRate : null,
    }));

  // Top Products (aggregated league table, max 5)
  const topProductsAggregate = productList
    .slice(0, 5)
    .map((p: any) => ({
      productName: p.productName || '',
      categoryName: p.productCategory || p.categoryName || null,
      salesValue: p.salesValue || 0,
      quantitySold: p.quantitySold || 0,
      uniqueCustomersCount: p.uniqueCustomers || p.uniqueCustomersCount || 0,
    }));

  // Geography Aggregate (max 5)
  const geographyAggregate = govList
    .slice(0, 5)
    .map((g: any) => ({
      governorate: g.governorateNameAr || g.governorateCode || g.governorateName || '',
      salesValue: g.salesValue || 0,
      ordersCount: g.ordersCount || 0,
    }));

  const customerFilterActive = Boolean(
    filters.customerId != null || (filters.customerName && filters.customerName.trim().length > 0)
  );

  const context: ExecutiveAIContext = {
    metadata: {
      generatedAt: new Date().toISOString(),
      dataFreshnessDate: kpi?.maxOrderDate || effectiveEndDate,
      operatingCurrency: 'EGP',
    },
    activeFilters: {
      dateRangeLabel: filters.dateRange?.label || filters.periodMode || 'Custom',
      effectiveStartDate,
      effectiveEndDate,
      companyName: filters.customerName || null,
      salespersonName: null,
      governorateName: null,
      areaName: null,
      customerFilterActive,
      productName: filters.productName || null,
    },
    salesKpis: {
      totalSales: kpi?.salesValue ?? 0,
      confirmedOrders: kpi?.ordersCount ?? 0,
      activeCustomers: kpi?.activeCustomers ?? 0,
      averageOrderValue: kpi?.averageOrderValue ?? 0,
      revenueGrowthPct: kpi?.revenueGrowthPct != null ? kpi.revenueGrowthPct : null,
      previousPeriodSales: kpi?.previousSalesValue != null ? kpi.previousSalesValue : null,
    },
    retentionSummary: retention
      ? {
          previousActiveCustomers: retention.previousActiveCustomers || 0,
          retainedWithSameRep: retention.retainedWithSameRep || 0,
          transferredCustomers: retention.transferredCustomers || 0,
          trueLostCustomers: retention.trueLostCustomers || 0,
          newCustomers: retention.newCustomers || 0,
          companyRetentionRate: retention.companyRetentionRate || 0,
          sameRepRetentionRate: retention.sameRepRetentionRate || 0,
          lostCustomerRevenueEgp: retention.lostCustomerRevenueEgp || 0,
        }
      : null,
    riskDistribution,
    topSalesRepsAggregate: topSalesRepsAggregate.length > 0 ? topSalesRepsAggregate : undefined,
    topProductsAggregate: topProductsAggregate.length > 0 ? topProductsAggregate : undefined,
    geographyAggregate: geographyAggregate.length > 0 ? geographyAggregate : undefined,
  };

  return context;
}

/**
 * Sends a sanitized AI Chat query to the backend CRM server.
 */
export async function sendAiChatMessage(params: {
  message: string;
  history: AiChatMessage[];
  filters?: FilterState;
  analyticsContext?: ExecutiveAIContext;
  drillDownContext?: ExecutiveDrillDownContext;
  contextMode?: AiContextMode;
  intent?: AiQueryIntent;
  language: 'ar' | 'en';
}): Promise<string> {
  const mode: AiContextMode = params.contextMode || 'AGGREGATED';
  let context = params.analyticsContext;

  if (!context && params.filters) {
    context = await buildExecutiveAIContext(params.filters);
  }

  // Sanitization checks
  if (context) {
    const sanity = validateSanitizedContext(context);
    if (!sanity.valid) {
      console.error('Sanitization violation:', sanity.violations);
      throw new Error('PROHIBITED_DATA_DETECTED');
    }
    context = sanitizeExecutiveContext(context);
  }

  let sanitizedDrillDown = params.drillDownContext;
  if (sanitizedDrillDown) {
    sanitizedDrillDown = sanitizeDrillDownContext(sanitizedDrillDown);
  }

  const trimmedHistory = trimChatHistory(params.history);

  const requestPayload: AiChatRequest = {
    message: params.message,
    history: trimmedHistory,
    analyticsContext: context!,
    drillDownContext: sanitizedDrillDown,
    contextMode: mode,
    intent: params.intent,
    language: params.language,
  };

  const response = await fetch(`${getAiApiBaseUrl()}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    let errorInfo: AiChatErrorResponse | null = null;
    try {
      errorInfo = await response.json();
    } catch {
      // Ignored
    }
    const code = errorInfo?.error?.code || 'AI_SERVICE_UNAVAILABLE';
    const msg = errorInfo?.error?.message || 'AI chat request failed';
    const err = new Error(msg);
    (err as any).code = code;
    throw err;
  }

  const data: AiChatSuccessResponse = await response.json();
  if (!data || typeof data.text !== 'string') {
    throw new Error('INVALID_RESPONSE');
  }

  return data.text;
}
