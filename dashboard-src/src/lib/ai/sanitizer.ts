import {
  ExecutiveAIContext,
  ExecutiveDrillDownContext,
  SafeOrderDTO,
  SafeCustomerDetailDTO,
  SafeCustomerProductHistoryDTO,
  SafeProductDetailDTO,
  SafeProductCustomerDTO,
  SafeRetentionDetailDTO,
  SafeActionCenterDTO,
  SafeCrossSellCandidateDTO,
  PaymentStatusType,
} from './types';

export const MAX_AGGREGATED_BYTES = 20 * 1024; // 20 KB
export const MAX_DRILLDOWN_BYTES = 50 * 1024; // 50 KB
export const MAX_ARRAY_LENGTH = 20;

export class AiContextSecurityViolationError extends Error {
  readonly code = 'AI_CONTEXT_SECURITY_VIOLATION';
  readonly violations: string[];

  constructor(message: string, violations: string[] = []) {
    super(message);
    this.name = 'AiContextSecurityViolationError';
    this.violations = violations;
  }
}

export class AiContextTooLargeError extends Error {
  readonly code = 'AI_CONTEXT_TOO_LARGE';
  readonly sizeBytes: number;
  readonly maxBytes: number;

  constructor(message: string, sizeBytes: number, maxBytes: number) {
    super(message);
    this.name = 'AiContextTooLargeError';
    this.sizeBytes = sizeBytes;
    this.maxBytes = maxBytes;
  }
}

export interface ProhibitedScanResult {
  hasProhibitedData: boolean;
  violations: string[];
  violationCount: number;
}

// Prohibited key regex: matches prohibited field names in camelCase, snake_case, PascalCase, or Arabic
const PROHIBITED_KEY_REGEX =
  /^(phone|mobile|telephone|cellphone|email|mail|address|street|street_address|location_detail|bank|bank_account|bankaccount|account_number|accountnumber|iban|swift|card|card_number|cardnumber|cvv|credit_card|transfer|transfer_reference|transferreference|instapay|fawry|receipt|receipt_image|receiptimage|voucher|payment_reference|paymentreference|payment_slip|raw_payment|rawpayment|payment_details|tax_id|taxid|vat_number|vatnumber|national_id|ssn|هاتف|محمول|جوال|تليفون|ايميل|إيميل|بريد|عنوان|شارع|بنك|حساب_بنكي|رقم_الحساب|ايبان|سويفت|بطاقة|كارت|بطاقة_ائتمان|تحويل|مرجع_التحويل|انستاباي|فوري|ايصال|إيصال|وصل|صورة_الإيصال|مرجع_الدفع|رقم_العملية|رقم_ضريبي|بطاقة_ضريبية|سجل_تجاري|رقم_قومي)$/i;

// Prohibited value regexes
const EMAIL_VALUE_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const EGYPT_PHONE_VALUE_REGEX = /(?:\+?20|0)?1[0125]\d{8}\b/;
const FORMATTED_PHONE_VALUE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const IBAN_VALUE_REGEX = /\b(?:EG\d{27}|[A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/i;
const CREDIT_CARD_VALUE_REGEX = /\b(?:\d{4}[- ]?){3}\d{4}\b/;
const PAYMENT_TRANSFER_LABEL_REGEX = /\b(?:instapay|fawry|transfer\s*ref|payment\s*ref)[\s:#_-]*[a-zA-Z0-9]{6,}/i;
const NATIONAL_ID_VALUE_REGEX = /\b[23]\d{13}\b/;

/**
 * Recursively scans any payload for prohibited keys and sensitive PII / payment value patterns.
 * Conservative pattern matching avoids false positives for legitimate IDs, codes, amounts, and dates.
 */
export function scanForProhibitedAiData(payload: unknown): ProhibitedScanResult {
  const violations: string[] = [];

  function traverse(current: unknown, path: string) {
    if (current === null || current === undefined) {
      return;
    }

    if (typeof current === 'string') {
      if (EMAIL_VALUE_REGEX.test(current)) {
        violations.push(`Email pattern detected at: ${path}`);
      }
      if (EGYPT_PHONE_VALUE_REGEX.test(current) || FORMATTED_PHONE_VALUE_REGEX.test(current)) {
        violations.push(`Phone number pattern detected at: ${path}`);
      }
      if (IBAN_VALUE_REGEX.test(current)) {
        violations.push(`IBAN pattern detected at: ${path}`);
      }
      if (CREDIT_CARD_VALUE_REGEX.test(current)) {
        violations.push(`Credit card pattern detected at: ${path}`);
      }
      if (PAYMENT_TRANSFER_LABEL_REGEX.test(current)) {
        violations.push(`Payment reference pattern detected at: ${path}`);
      }
      if (NATIONAL_ID_VALUE_REGEX.test(current)) {
        violations.push(`National ID pattern detected at: ${path}`);
      }
      return;
    }

    if (Array.isArray(current)) {
      current.forEach((item, idx) => traverse(item, `${path}[${idx}]`));
      return;
    }

    if (typeof current === 'object') {
      for (const [key, value] of Object.entries(current)) {
        if (PROHIBITED_KEY_REGEX.test(key)) {
          violations.push(`Prohibited key "${key}" detected at: ${path ? `${path}.${key}` : key}`);
        }
        traverse(value, path ? `${path}.${key}` : key);
      }
    }
  }

  traverse(payload, '');

  return {
    hasProhibitedData: violations.length > 0,
    violations,
    violationCount: violations.length,
  };
}

/**
 * Validates payload byte size in UTF-8.
 */
export function validateAiContextSize(
  payload: unknown,
  maxSizeKB = 50
): { valid: boolean; sizeBytes: number; maxBytes: number } {
  const jsonStr = JSON.stringify(payload ?? {});
  const sizeBytes = new TextEncoder().encode(jsonStr).length;
  const maxBytes = maxSizeKB * 1024;
  return {
    valid: sizeBytes <= maxBytes,
    sizeBytes,
    maxBytes,
  };
}

/**
 * Validates payment status enum values.
 */
function sanitizePaymentStatus(status: unknown): PaymentStatusType {
  const validStatuses: PaymentStatusType[] = ['PAID', 'UNPAID', 'PARTIAL', 'CREDIT', 'UNKNOWN'];
  if (typeof status === 'string' && validStatuses.includes(status as PaymentStatusType)) {
    return status as PaymentStatusType;
  }
  return 'UNKNOWN';
}

/**
 * Sanitizes and enforces Scope A rules on ExecutiveAIContext.
 * Explicitly removes customerId and customerName, ensuring only customerFilterActive boolean is present.
 */
export function sanitizeExecutiveContext(rawContext: ExecutiveAIContext | undefined): ExecutiveAIContext {
  if (!rawContext || typeof rawContext !== 'object') {
    throw new AiContextSecurityViolationError('Invalid ExecutiveAIContext structure: context is missing or not an object.');
  }

  // Pre-scan for prohibited data
  const scan = scanForProhibitedAiData(rawContext);
  if (scan.hasProhibitedData) {
    // Record violation and check if critically malformed
    if (scan.violations.some((v) => v.includes('Credit card') || v.includes('IBAN'))) {
      throw new AiContextSecurityViolationError('Critical security violation detected in ExecutiveAIContext', scan.violations);
    }
  }

  const rawFilters = rawContext.activeFilters || ({} as any);

  // Strip customerName / customerId and ensure customerFilterActive boolean
  const customerFilterActive = Boolean(
    rawFilters.customerFilterActive || rawFilters.customerId || rawFilters.customerName
  );

  const cleanContext: ExecutiveAIContext = {
    metadata: {
      generatedAt: typeof rawContext.metadata?.generatedAt === 'string' ? rawContext.metadata.generatedAt : new Date().toISOString(),
      dataFreshnessDate: typeof rawContext.metadata?.dataFreshnessDate === 'string' ? rawContext.metadata.dataFreshnessDate : '',
      operatingCurrency: 'EGP',
    },
    activeFilters: {
      dateRangeLabel: String(rawFilters.dateRangeLabel || 'Current'),
      effectiveStartDate: String(rawFilters.effectiveStartDate || ''),
      effectiveEndDate: String(rawFilters.effectiveEndDate || ''),
      companyName: rawFilters.companyName ? String(rawFilters.companyName) : null,
      salespersonName: rawFilters.salespersonName ? String(rawFilters.salespersonName) : null,
      governorateName: rawFilters.governorateName ? String(rawFilters.governorateName) : null,
      areaName: rawFilters.areaName ? String(rawFilters.areaName) : null,
      customerFilterActive,
      productName: rawFilters.productName ? String(rawFilters.productName) : null,
    },
    salesKpis: {
      totalSales: Number(rawContext.salesKpis?.totalSales ?? 0),
      confirmedOrders: Number(rawContext.salesKpis?.confirmedOrders ?? 0),
      activeCustomers: Number(rawContext.salesKpis?.activeCustomers ?? 0),
      averageOrderValue: Number(rawContext.salesKpis?.averageOrderValue ?? 0),
      revenueGrowthPct: rawContext.salesKpis?.revenueGrowthPct != null ? Number(rawContext.salesKpis.revenueGrowthPct) : null,
      previousPeriodSales: rawContext.salesKpis?.previousPeriodSales != null ? Number(rawContext.salesKpis.previousPeriodSales) : null,
    },
  };

  if (rawContext.retentionSummary) {
    cleanContext.retentionSummary = {
      previousActiveCustomers: Number(rawContext.retentionSummary.previousActiveCustomers ?? 0),
      retainedWithSameRep: Number(rawContext.retentionSummary.retainedWithSameRep ?? 0),
      transferredCustomers: Number(rawContext.retentionSummary.transferredCustomers ?? 0),
      trueLostCustomers: Number(rawContext.retentionSummary.trueLostCustomers ?? 0),
      newCustomers: Number(rawContext.retentionSummary.newCustomers ?? 0),
      companyRetentionRate: Number(rawContext.retentionSummary.companyRetentionRate ?? 0),
      sameRepRetentionRate: Number(rawContext.retentionSummary.sameRepRetentionRate ?? 0),
      lostCustomerRevenueEgp: Number(rawContext.retentionSummary.lostCustomerRevenueEgp ?? 0),
    };
  }

  if (rawContext.riskDistribution) {
    cleanContext.riskDistribution = {
      highRiskCount: Number(rawContext.riskDistribution.highRiskCount ?? 0),
      mediumRiskCount: Number(rawContext.riskDistribution.mediumRiskCount ?? 0),
      lowRiskCount: Number(rawContext.riskDistribution.lowRiskCount ?? 0),
      totalRecoveryOpportunityEgp: Number(rawContext.riskDistribution.totalRecoveryOpportunityEgp ?? 0),
    };
  }

  if (Array.isArray(rawContext.topSalesRepsAggregate)) {
    cleanContext.topSalesRepsAggregate = rawContext.topSalesRepsAggregate
      .slice(0, MAX_ARRAY_LENGTH)
      .map((r) => ({
        salesperson: String(r.salesperson || ''),
        companyName: String(r.companyName || ''),
        salesValue: Number(r.salesValue ?? 0),
        ordersCount: Number(r.ordersCount ?? 0),
        activeCustomers: Number(r.activeCustomers ?? 0),
        retentionRate: r.retentionRate != null ? Number(r.retentionRate) : null,
      }));
  }

  if (Array.isArray(rawContext.topProductsAggregate)) {
    cleanContext.topProductsAggregate = rawContext.topProductsAggregate
      .slice(0, MAX_ARRAY_LENGTH)
      .map((p) => ({
        productName: String(p.productName || ''),
        categoryName: p.categoryName ? String(p.categoryName) : null,
        salesValue: Number(p.salesValue ?? 0),
        quantitySold: Number(p.quantitySold ?? 0),
        uniqueCustomersCount: Number(p.uniqueCustomersCount ?? 0),
      }));
  }

  if (Array.isArray(rawContext.geographyAggregate)) {
    cleanContext.geographyAggregate = rawContext.geographyAggregate
      .slice(0, MAX_ARRAY_LENGTH)
      .map((g) => ({
        governorate: String(g.governorate || ''),
        salesValue: Number(g.salesValue ?? 0),
        ordersCount: Number(g.ordersCount ?? 0),
      }));
  }

  // Size validation (< 20 KB)
  let sizeCheck = validateAiContextSize(cleanContext, 20);
  if (!sizeCheck.valid) {
    // Truncate arrays to reduce size
    if (cleanContext.topSalesRepsAggregate) cleanContext.topSalesRepsAggregate = cleanContext.topSalesRepsAggregate.slice(0, 5);
    if (cleanContext.topProductsAggregate) cleanContext.topProductsAggregate = cleanContext.topProductsAggregate.slice(0, 5);
    if (cleanContext.geographyAggregate) cleanContext.geographyAggregate = cleanContext.geographyAggregate.slice(0, 5);

    sizeCheck = validateAiContextSize(cleanContext, 20);
    if (!sizeCheck.valid) {
      throw new AiContextTooLargeError('ExecutiveAIContext exceeds maximum 20 KB limit after reduction', sizeCheck.sizeBytes, sizeCheck.maxBytes);
    }
  }

  return cleanContext;
}

/**
 * Sanitizes and enforces B3 DTO allowlist mapping on ExecutiveDrillDownContext.
 * Rejects arbitrary unknown root blocks (fail-closed) and drops unauthorized properties.
 */
export function sanitizeDrillDownContext(
  rawContext: ExecutiveDrillDownContext | undefined
): ExecutiveDrillDownContext {
  if (!rawContext || typeof rawContext !== 'object') {
    return {};
  }

  // Scan for prohibited data
  const scan = scanForProhibitedAiData(rawContext);
  if (scan.hasProhibitedData) {
    if (scan.violations.some((v) => v.includes('Credit card') || v.includes('IBAN') || v.includes('National ID'))) {
      throw new AiContextSecurityViolationError('Critical security violation detected in ExecutiveDrillDownContext', scan.violations);
    }
  }

  const cleanContext: ExecutiveDrillDownContext = {};

  // 1. targetCustomer
  if (rawContext.targetCustomer && typeof rawContext.targetCustomer === 'object') {
    const c = rawContext.targetCustomer;
    const safeCustomer: SafeCustomerDetailDTO = {
      customerId: Number(c.customerId),
      customerName: String(c.customerName || ''),
      companyName: String(c.companyName || ''),
      salespersonName: String(c.salespersonName || ''),
      governorateName: c.governorateName ? String(c.governorateName) : null,
      areaName: c.areaName ? String(c.areaName) : null,
      totalSales: Number(c.totalSales ?? 0),
      ordersCount: Number(c.ordersCount ?? 0),
      averageOrderValue: Number(c.averageOrderValue ?? 0),
      firstOrderDate: c.firstOrderDate ? String(c.firstOrderDate) : null,
      lastOrderDate: c.lastOrderDate ? String(c.lastOrderDate) : null,
      daysSinceLastOrder: Number(c.daysSinceLastOrder ?? 0),
      previousPeriodSales: Number(c.previousPeriodSales ?? 0),
      currentPeriodSales: Number(c.currentPeriodSales ?? 0),
      salesChangePct: c.salesChangePct != null ? Number(c.salesChangePct) : null,
      customerStatus: String(c.customerStatus || 'ACTIVE'),
      riskLevel: c.riskLevel ? String(c.riskLevel) : undefined,
      recoveryOpportunity: c.recoveryOpportunity != null ? Number(c.recoveryOpportunity) : undefined,
    };
    cleanContext.targetCustomer = safeCustomer;
  }

  // 2. recentOrders (capped to 20)
  if (Array.isArray(rawContext.recentOrders)) {
    cleanContext.recentOrders = rawContext.recentOrders
      .slice(0, MAX_ARRAY_LENGTH)
      .map((o): SafeOrderDTO => ({
        orderId: typeof o.orderId === 'number' || typeof o.orderId === 'string' ? o.orderId : String(o.orderId),
        orderName: String(o.orderName || ''),
        orderDate: String(o.orderDate || ''),
        customerName: o.customerName ? String(o.customerName) : undefined,
        companyName: String(o.companyName || ''),
        salesperson: String(o.salesperson || ''),
        governorateName: o.governorateName ? String(o.governorateName) : null,
        areaName: o.areaName ? String(o.areaName) : null,
        orderValue: Number(o.orderValue ?? 0),
        productsCount: Number(o.productsCount ?? 0),
        linesCount: Number(o.linesCount ?? 0),
        totalQuantity: Number(o.totalQuantity ?? 0),
        orderStatus: 'CONFIRMED',
        paymentStatus: sanitizePaymentStatus(o.paymentStatus),
      }));
  }

  // 3. customerProductHistory
  if (rawContext.customerProductHistory && typeof rawContext.customerProductHistory === 'object') {
    const h = rawContext.customerProductHistory;
    const safeHistory: SafeCustomerProductHistoryDTO = {
      customerId: Number(h.customerId),
      customerName: String(h.customerName || ''),
      stoppedProducts: Array.isArray(h.stoppedProducts)
        ? h.stoppedProducts.slice(0, MAX_ARRAY_LENGTH).map((sp) => ({
            productId: Number(sp.productId),
            productName: String(sp.productName || ''),
            previousSales: Number(sp.previousSales ?? 0),
            currentSales: Number(sp.currentSales ?? 0),
            recoveryValue: Number(sp.recoveryValue ?? 0),
            status: String(sp.status || 'STOPPED_BUYING'),
          }))
        : [],
      favoriteProducts: Array.isArray(h.favoriteProducts)
        ? h.favoriteProducts.slice(0, MAX_ARRAY_LENGTH).map((fp) => ({
            productId: Number(fp.productId),
            productName: String(fp.productName || ''),
            salesValue: Number(fp.salesValue ?? 0),
            ordersCount: Number(fp.ordersCount ?? 0),
            salesSharePct: Number(fp.salesSharePct ?? 0),
            lastOrderDate: fp.lastOrderDate ? String(fp.lastOrderDate) : null,
          }))
        : [],
    };
    cleanContext.customerProductHistory = safeHistory;
  }

  // 4. targetProduct
  if (rawContext.targetProduct && typeof rawContext.targetProduct === 'object') {
    const p = rawContext.targetProduct;
    const safeProduct: SafeProductDetailDTO = {
      productId: Number(p.productId),
      productName: String(p.productName || ''),
      categoryName: p.categoryName ? String(p.categoryName) : null,
      periodSales: Number(p.periodSales ?? 0),
      periodQuantity: Number(p.periodQuantity ?? 0),
      periodOrders: Number(p.periodOrders ?? 0),
      periodCustomers: Number(p.periodCustomers ?? 0),
      averageUnitValue: Number(p.averageUnitValue ?? 0),
      firstOrderDate: p.firstOrderDate ? String(p.firstOrderDate) : null,
      lastOrderDate: p.lastOrderDate ? String(p.lastOrderDate) : null,
    };
    if (Array.isArray(p.topCustomers)) {
      safeProduct.topCustomers = p.topCustomers.slice(0, MAX_ARRAY_LENGTH).map((tc) => ({
        customerId: Number(tc.customerId),
        customerName: String(tc.customerName || ''),
        ordersCount: Number(tc.ordersCount ?? 0),
        salesValue: Number(tc.salesValue ?? 0),
        lastOrderDate: tc.lastOrderDate ? String(tc.lastOrderDate) : null,
      }));
    }
    cleanContext.targetProduct = safeProduct;
  }

  // 5. productTopCustomers (max 20)
  if (Array.isArray(rawContext.productTopCustomers)) {
    cleanContext.productTopCustomers = rawContext.productTopCustomers
      .slice(0, MAX_ARRAY_LENGTH)
      .map((ptc): SafeProductCustomerDTO => ({
        customerId: Number(ptc.customerId),
        customerName: String(ptc.customerName || ''),
        companyName: String(ptc.companyName || ''),
        salesperson: String(ptc.salesperson || ''),
        governorateName: ptc.governorateName ? String(ptc.governorateName) : null,
        areaName: ptc.areaName ? String(ptc.areaName) : null,
        ordersCount: Number(ptc.ordersCount ?? 0),
        salesValue: Number(ptc.salesValue ?? 0),
        quantity: Number(ptc.quantity ?? 0),
        lastOrderDate: ptc.lastOrderDate ? String(ptc.lastOrderDate) : null,
      }));
  }

  // 6. decliningCustomers (max 20)
  if (Array.isArray(rawContext.decliningCustomers)) {
    cleanContext.decliningCustomers = rawContext.decliningCustomers
      .slice(0, MAX_ARRAY_LENGTH)
      .map((dc) => ({
        customerId: Number(dc.customerId),
        customerName: String(dc.customerName || ''),
        companyName: dc.companyName ? String(dc.companyName) : undefined,
        primarySalesperson: String(dc.primarySalesperson || ''),
        salesValue: Number(dc.salesValue ?? 0),
        previousSales: Number(dc.previousSales ?? 0),
        salesChangePct: dc.salesChangePct != null ? Number(dc.salesChangePct) : null,
        salesGap: Number(dc.salesGap ?? Math.max((dc.previousSales || 0) - (dc.salesValue || 0), 0)),
      }));
  }

  // 7. lostCustomers (max 20)
  if (Array.isArray(rawContext.lostCustomers)) {
    cleanContext.lostCustomers = rawContext.lostCustomers
      .slice(0, MAX_ARRAY_LENGTH)
      .map((lc): SafeRetentionDetailDTO => ({
        companyName: String(lc.companyName || ''),
        customerId: Number(lc.customerId),
        customerName: String(lc.customerName || ''),
        previousSalesperson: String(lc.previousSalesperson || ''),
        currentSalesperson: String(lc.currentSalesperson || ''),
        previousOrders: Number(lc.previousOrders ?? 0),
        currentOrders: Number(lc.currentOrders ?? 0),
        previousSales: Number(lc.previousSales ?? 0),
        currentSales: Number(lc.currentSales ?? 0),
        retentionStatus: String(lc.retentionStatus || 'LOST'),
        salesChangePct: lc.salesChangePct != null ? Number(lc.salesChangePct) : null,
        previousLastOrderDate: lc.previousLastOrderDate ? String(lc.previousLastOrderDate) : null,
        currentLastOrderDate: lc.currentLastOrderDate ? String(lc.currentLastOrderDate) : null,
      }));
  }

  // 8. riskActionCenter (max 20)
  if (Array.isArray(rawContext.riskActionCenter)) {
    cleanContext.riskActionCenter = rawContext.riskActionCenter
      .slice(0, MAX_ARRAY_LENGTH)
      .map((rac): SafeActionCenterDTO => ({
        customerId: Number(rac.customerId),
        customerName: String(rac.customerName || ''),
        companyName: String(rac.companyName || ''),
        currentSalesperson: String(rac.currentSalesperson || ''),
        lastOrderDate: rac.lastOrderDate ? String(rac.lastOrderDate) : null,
        daysSinceLastOrder: Number(rac.daysSinceLastOrder ?? 0),
        medianDaysBetweenOrders: Number(rac.medianDaysBetweenOrders ?? 0),
        recent30dSales: Number(rac.recent30dSales ?? 0),
        previous30dSales: Number(rac.previous30dSales ?? 0),
        salesChangePct: rac.salesChangePct != null ? Number(rac.salesChangePct) : null,
        recoveryOpportunity: Number(rac.recoveryOpportunity ?? 0),
        riskLevel: String(rac.riskLevel || 'MEDIUM'),
        actionType: String(rac.actionType || 'WIN_BACK'),
        priority: String(rac.priority || 'MEDIUM'),
        actionReason: String(rac.actionReason || ''),
        salespersonChanged: Boolean(rac.salespersonChanged),
      }));
  }

  // 9. crossSellCandidates (max 20)
  if (Array.isArray(rawContext.crossSellCandidates)) {
    cleanContext.crossSellCandidates = rawContext.crossSellCandidates
      .slice(0, MAX_ARRAY_LENGTH)
      .map((csc): SafeCrossSellCandidateDTO => ({
        productId: Number(csc.productId),
        productName: String(csc.productName || ''),
        peerCustomersCount: Number(csc.peerCustomersCount ?? 0),
        peerOrdersCount: Number(csc.peerOrdersCount ?? 0),
        peerSalesValue: Number(csc.peerSalesValue ?? 0),
        affinityScore: Number(csc.affinityScore ?? 0),
      }));
  }

  // 10. paymentStatusSummary
  if (rawContext.paymentStatusSummary && typeof rawContext.paymentStatusSummary === 'object') {
    cleanContext.paymentStatusSummary = {
      statusNote: String(rawContext.paymentStatusSummary.statusNote || 'حالة السداد وموقف التحصيلات غير مسجلة في سجل المعاملات التحليلي المتاح.'),
      hasReliablePaymentLedger: Boolean(rawContext.paymentStatusSummary.hasReliablePaymentLedger),
    };
  }

  // Size validation (< 50 KB)
  let sizeCheck = validateAiContextSize(cleanContext, 50);
  if (!sizeCheck.valid) {
    // Graceful reduction: trim arrays to 10
    if (cleanContext.recentOrders) cleanContext.recentOrders = cleanContext.recentOrders.slice(0, 10);
    if (cleanContext.productTopCustomers) cleanContext.productTopCustomers = cleanContext.productTopCustomers.slice(0, 10);
    if (cleanContext.decliningCustomers) cleanContext.decliningCustomers = cleanContext.decliningCustomers.slice(0, 10);
    if (cleanContext.lostCustomers) cleanContext.lostCustomers = cleanContext.lostCustomers.slice(0, 10);
    if (cleanContext.riskActionCenter) cleanContext.riskActionCenter = cleanContext.riskActionCenter.slice(0, 10);
    if (cleanContext.crossSellCandidates) cleanContext.crossSellCandidates = cleanContext.crossSellCandidates.slice(0, 10);

    sizeCheck = validateAiContextSize(cleanContext, 50);
    if (!sizeCheck.valid) {
      throw new AiContextTooLargeError('ExecutiveDrillDownContext exceeds maximum 50 KB limit after reduction', sizeCheck.sizeBytes, sizeCheck.maxBytes);
    }
  }

  return cleanContext;
}

/**
 * Sanitizes conversation history text to prevent PII leakage or prompt injection.
 */
export function sanitizeHistoryText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(EMAIL_VALUE_REGEX, '[EMAIL_REDACTED]')
    .replace(EGYPT_PHONE_VALUE_REGEX, '[PHONE_REDACTED]')
    .replace(IBAN_VALUE_REGEX, '[IBAN_REDACTED]')
    .replace(CREDIT_CARD_VALUE_REGEX, '[CARD_REDACTED]')
    .slice(0, 4000); // cap single message length
}
