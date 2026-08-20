// Deterministic Regex Intent Classifier — Adapted for Horeca Smart
// Zero DB calls, zero AI calls. Priority order: 1 to 19.

import type { AiQueryIntent } from './types';

interface FilterState {
  customerId?: number | null;
  productId?: number | null;
  customerName?: string;
  productName?: string;
}

const PROHIBITED_PII_REGEX =
  /(تليفون|موبايل|هاتف|رقم العميل|ايميل|إيميل|بريد|عنوان|شارع|\bphone\b|\bmobile\b|\bemail\b|\baddress\b|\bstreet\b)/i;

const PROHIBITED_FINANCIAL_REGEX =
  /(حساب بنكي|رقم الحساب|ايبان|\biban\b|سويفت|\bswift\b|فيزا|ماستر|كارت|تحويل بنكي|انستاباي|انستا باي|\binstapay\b|فوري|\bfawry\b|إيصال|ايصال|مرجع الدفع|\bbank\b|\baccount number\b|\bcard\b|\btransfer reference\b|\breceipt\b|\bpayment reference\b)/i;

const PAYMENT_STATUS_REGEX =
  /(حالة السداد|سداد العميل|سداد الفواتير|مدفوع|غير مدفوع|تحصيل|مديونية|موقف السداد|موقف التحصيل|\bpayment status\b|\bpaid\b|\bunpaid\b|\bpartial payment\b|\bcredit status\b|\bpayment\b|سداد|دفع|تحصيلات)/i;

const CUSTOMER_ORDERS_REGEX =
  /(آخر (أوردرات|اوردرات|طلبات|فواتير)|احدث (أوردرات|اوردرات|طلبات|فواتير)|طلبات العميل|أوردرات العميل|اوردرات العميل|فواتير العميل|\brecent orders\b|\blatest orders\b|\bcustomer orders\b)/i;

const ORDER_LOOKUP_REGEX =
  /(أكبر (الأوردرات|الاوردرات|الطلبات|الفواتير)|اكبر (الأوردرات|الاوردرات|الطلبات|الفواتير)|أوردرات الفترة|اوردرات الفترة|طلبات الفترة|فواتير الفترة|\btop orders\b|\blarge orders\b|\border lookup\b)/i;

const CUSTOMER_PRODUCT_HISTORY_REGEX =
  /(وقف يشتري|توقف عن شراء|بطل يشتري|منتجات متوقفة|المنتجات المتراجعة عند العميل|أصناف توقف|المنتجات المفضلة للعميل|\bproduct dropoff\b|\bstopped buying\b|\bfavorite products\b|dropoff)/i;

const CROSS_SELL_REGEX =
  /((?:ال)?بيع\s+(?:ال)?متقاطع|\bcross[- ]?sell(ing)?\b|منتجات ممكن أبيعها|منتجات ممكن نبيعها|منتجات أقترحها|منتجات نقترحها|فرص منتجات جديدة|منتجات جديدة ممكن نبيعها|أصناف جديدة للعميل|اقتراح منتجات)/i;

const DECLINING_CUSTOMERS_REGEX =
  /(عملاء مبيعاتهم انخفضت|(?:ال)?عملاء (?:ال)?متراجعين|عملاء متراجعين|انخفاض مبيعات العملاء|تراجع العملاء|\bdeclining customers\b|\bsales decline customers\b)/i;

const LOST_CUSTOMERS_REGEX =
  /((?:ال)?عملاء (?:ال)?مفقودين|(?:ال)?عملاء اللي وقفوا شراء|عملاء وقفوا شراء|استرجاع العملاء|استعادة العملاء|\blost customers\b|\bchurned customers\b|\bwin[- ]?back\b)/i;

const PRODUCT_CUSTOMERS_REGEX =
  /(مين (أكبر|اكبر|اهم|أهم) عملاء (هذا |هذه )?(?:ال)?(منتج|صنف)|مين بيشتري (هذا |هذه )?(?:ال)?(منتج|صنف|أصناف)|عملاء (هذا |هذه )?(?:ال)?(صنف|منتج)|\btop customers for product\b|\bwho buys\b)/i;

const CUSTOMER_ANALYSIS_REGEX =
  /(حلل العميل|تحليل العميل|أداء العميل|تفاصيل العميل|وضع العميل|العميل المحدد|بيانات العميل|\bcustomer deep dive\b|\bcustomer analysis\b|\banalyze customer\b)/i;

const PRODUCT_ANALYSIS_REGEX =
  /(حلل المنتج|تحليل المنتج|أداء المنتج المحدد|تفاصيل المنتج|وضع المنتج|المنتج المحدد|حلل الصنف|تحليل الصنف|\bproduct deep dive\b|\bproduct analysis\b|\banalyze product\b)/i;

const SALES_REPS_REGEX =
  /(مندوب|مناديب|فريق البيع|مناديب المبيعات|مسؤولي المبيعات|\bsales reps?\b|\bsales team\b)/i;

const RETENTION_REGEX =
  /(احتفاظ|معدل الاحتفاظ|تسرب العملاء|نسبة الاحتفاظ|\bretention\b|\bchurn rate\b|\bcustomer retention\b)/i;

const RISK_REGEX =
  /(مخاطر|معرضين للفقد|معرض للخطر|مستوى الخطورة|عملاء في خطر|\brisk\b|\bhigh risk\b|\bat[- ]risk\b)/i;

const GEOGRAPHY_REGEX =
  /(محافظة|محافظات|منطقة|مناطق|جغرافيا|توزيع جغرافي|القاهرة|الجيزة|الإسكندرية|\bgovernorate(s)?\b|\barea(s)?\b|\bgeography\b)/i;

const PRODUCT_PERFORMANCE_REGEX =
  /(المنتجات الأعلى مبيعا|أفضل المنتجات|أعلى الأصناف|المنتجات المتصدرة|أداء المنتجات|\btop products\b|\bbest selling products\b|\bproduct performance\b)/i;

const SALES_PERFORMANCE_REGEX =
  /(اتجاه المبيعات|تحليل المبيعات|مبيعات يومية|متوسط قيمة الطلب|حجم المبيعات|\baov\b|\brevenue\b|\bsales performance\b|\bsales trend\b)/i;

const EXECUTIVE_SUMMARY_REGEX =
  /(لخص الفترة|تقرير تنفيذي|ملخص تنفيذي|لخص الأداء|ملخص المبيعات|لخص لي أداء المبيعات|أداء الفترة الحالية|ملخص شامل|\bexecutive summary\b|\boverview\b|\bsummarize\b)/i;

export function classifyAiQueryIntent(
  message: string,
  filters: FilterState
): AiQueryIntent {
  const norm = message.trim();

  if (PROHIBITED_PII_REGEX.test(norm) || PROHIBITED_FINANCIAL_REGEX.test(norm)) return 'PROHIBITED_DATA_REQUEST';
  if (PAYMENT_STATUS_REGEX.test(norm)) return 'PAYMENT_STATUS';
  if (CUSTOMER_ORDERS_REGEX.test(norm)) return 'CUSTOMER_RECENT_ORDERS';
  if (/(أوردر|اوردر|طلب|طلبات|orders?|invoices?)/i.test(norm) && /(عميل|العميل|للعميل|customer|زبون)/i.test(norm)) return 'CUSTOMER_RECENT_ORDERS';
  if (ORDER_LOOKUP_REGEX.test(norm)) return 'ORDER_LOOKUP';
  if (CUSTOMER_PRODUCT_HISTORY_REGEX.test(norm)) return 'CUSTOMER_PRODUCT_HISTORY';
  if (/(وقف|توقف|بطل|متراجع|dropoff|stopped)/i.test(norm) && /(منتج|صنف|بضاعة|products?)/i.test(norm)) return 'CUSTOMER_PRODUCT_HISTORY';
  if (CROSS_SELL_REGEX.test(norm)) return 'CROSS_SELL';
  if (DECLINING_CUSTOMERS_REGEX.test(norm)) return 'DECLINING_CUSTOMERS';
  if (LOST_CUSTOMERS_REGEX.test(norm)) return 'LOST_CUSTOMERS';
  if (PRODUCT_CUSTOMERS_REGEX.test(norm)) return 'PRODUCT_CUSTOMERS';
  if (CUSTOMER_ANALYSIS_REGEX.test(norm)) return 'CUSTOMER_ANALYSIS';
  if (PRODUCT_ANALYSIS_REGEX.test(norm)) return 'PRODUCT_ANALYSIS';
  if (SALES_REPS_REGEX.test(norm)) return 'SALES_REPS';
  if (RETENTION_REGEX.test(norm)) return 'RETENTION';
  if (RISK_REGEX.test(norm)) return 'RISK';
  if (GEOGRAPHY_REGEX.test(norm)) return 'GEOGRAPHY';
  if (PRODUCT_PERFORMANCE_REGEX.test(norm)) return 'PRODUCT_PERFORMANCE';
  if (SALES_PERFORMANCE_REGEX.test(norm)) return 'SALES_PERFORMANCE';
  if (EXECUTIVE_SUMMARY_REGEX.test(norm)) return 'EXECUTIVE_SUMMARY';
  if (/(العميل المحدد|هذا العميل|الزبون المحدد)/i.test(norm) && filters.customerId) return 'CUSTOMER_ANALYSIS';
  if (/(المنتج المحدد|هذا المنتج|الصنف المحدد)/i.test(norm) && filters.productId) return 'PRODUCT_ANALYSIS';

  return 'GENERAL_EXECUTIVE_QUESTION';
}

export function resolveAiIntent(params: {
  message: string;
  filters: FilterState;
  shortcutIntent?: AiQueryIntent;
}): AiQueryIntent {
  if (params.shortcutIntent) return params.shortcutIntent;
  return classifyAiQueryIntent(params.message, params.filters);
}

export function intentRequiresCustomer(intent: AiQueryIntent): boolean {
  return ['CUSTOMER_RECENT_ORDERS', 'CUSTOMER_PRODUCT_HISTORY', 'CROSS_SELL', 'CUSTOMER_ANALYSIS'].includes(intent);
}

export function intentRequiresProduct(intent: AiQueryIntent): boolean {
  return ['PRODUCT_ANALYSIS', 'PRODUCT_CUSTOMERS'].includes(intent);
}

export function getDeterministicIntentResponse(intent: AiQueryIntent): string | null {
  if (intent === 'PROHIBITED_DATA_REQUEST') {
    return 'عذرًا، بيانات التواصل الشخصية والمعلومات البنكية وتفاصيل التحصيلات الفردية غير متاحة لأسباب تتعلق بالخصوصية وأمن البيانات.';
  }
  return null;
}
