import { AiQueryIntent } from './types';

interface FilterState {
  customerId?: number | null;
  productId?: number | null;
  customerName?: string;
  productName?: string;
  dateRange?: { label: string };
  periodMode?: string;
}

export type AiQuestionCategory =
  | 'SALES'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'SALES_REPS'
  | 'RECOVERY_GROWTH'
  | 'ORDERS';

export interface AiQuestionShortcut {
  id: string;
  category: AiQuestionCategory;
  textAr: string;
  textEn?: string;
  targetIntent: AiQueryIntent;
  requiresCustomer?: boolean;
  requiresProduct?: boolean;
  unavailableWhen?: {
    salesperson?: boolean;
    governorate?: boolean;
    area?: boolean;
  };
  priority?: number;
}

export interface AiQuestionCategoryInfo {
  category: AiQuestionCategory;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const AI_QUESTION_CATEGORIES: AiQuestionCategoryInfo[] = [
  {
    category: 'SALES',
    titleAr: 'المبيعات',
    titleEn: 'Sales',
    descriptionAr: 'تحليل المبيعات، مؤشرات النمو، ومتوسط قيمة الطلب',
    descriptionEn: 'Sales analysis, growth indicators, and average order value',
  },
  {
    category: 'CUSTOMERS',
    titleAr: 'العملاء',
    titleEn: 'Customers',
    descriptionAr: 'تحليل العملاء، التراجع، والمخاطر، وسلوك الشراء',
    descriptionEn: 'Customer analysis, decline, risk, and purchasing behavior',
  },
  {
    category: 'PRODUCTS',
    titleAr: 'المنتجات',
    titleEn: 'Products',
    descriptionAr: 'أداء الأصناف، المنتجات المتصدرة، وعملاء المنتجات',
    descriptionEn: 'Product performance, top items, and product customers',
  },
  {
    category: 'SALES_REPS',
    titleAr: 'المناديب',
    titleEn: 'Sales Reps',
    descriptionAr: 'مقارنة أداء المناديب، الاحتفاظ، وفرص التدخل الإداري',
    descriptionEn: 'Sales rep comparison, retention, and executive intervention',
  },
  {
    category: 'RECOVERY_GROWTH',
    titleAr: 'الاستعادة والنمو',
    titleEn: 'Recovery & Growth',
    descriptionAr: 'استعادة العملاء المفقودين، تراجع المبيعات، وفرص البيع',
    descriptionEn: 'Lost customer recovery, declining sales gap, and growth opportunities',
  },
  {
    category: 'ORDERS',
    titleAr: 'الأوردرات',
    titleEn: 'Orders',
    descriptionAr: 'تفاصيل أحدث الأوردرات ونمط الطلبات للعميل',
    descriptionEn: 'Recent orders and purchasing order patterns',
  },
];

export const AI_QUESTIONS_CATALOG: AiQuestionShortcut[] = [
  // 1. SALES
  {
    id: 'sales-summary',
    category: 'SALES',
    textAr: 'لخص أداء الفترة الحالية',
    textEn: 'Summarize current period performance',
    targetIntent: 'EXECUTIVE_SUMMARY',
    priority: 100,
  },
  {
    id: 'sales-trend',
    category: 'SALES',
    textAr: 'حلل اتجاه المبيعات خلال الفترة',
    textEn: 'Analyze sales trend over the period',
    targetIntent: 'SALES_PERFORMANCE',
    priority: 90,
  },
  {
    id: 'sales-growth-reasons',
    category: 'SALES',
    textAr: 'ما أهم أسباب النمو أو التراجع؟',
    textEn: 'What are the main drivers of growth or decline?',
    targetIntent: 'SALES_PERFORMANCE',
    priority: 85,
  },
  {
    id: 'sales-aov',
    category: 'SALES',
    textAr: 'ما متوسط قيمة الأوردر وكيف يتحرك؟',
    textEn: 'What is the average order value and how is it moving?',
    targetIntent: 'SALES_PERFORMANCE',
    priority: 80,
  },
  {
    id: 'sales-intervention-points',
    category: 'SALES',
    textAr: 'ما أهم 5 نقاط تحتاج تدخل الإدارة؟',
    textEn: 'What are the top 5 points requiring executive action?',
    targetIntent: 'EXECUTIVE_SUMMARY',
    priority: 75,
  },
  {
    id: 'sales-biggest-opportunity',
    category: 'SALES',
    textAr: 'أين توجد أكبر فرصة نمو؟',
    textEn: 'Where is the biggest growth opportunity?',
    targetIntent: 'SALES_PERFORMANCE',
    priority: 70,
  },

  // 2. CUSTOMERS
  {
    id: 'cust-declining',
    category: 'CUSTOMERS',
    textAr: 'مين العملاء اللي مبيعاتهم انخفضت؟',
    textEn: 'Which customers had sales drop?',
    targetIntent: 'DECLINING_CUSTOMERS',
    priority: 95,
  },
  {
    id: 'cust-risk',
    category: 'CUSTOMERS',
    textAr: 'مين العملاء المعرضين للفقد؟',
    textEn: 'Which customers are at risk of churning?',
    targetIntent: 'RISK',
    priority: 90,
  },
  {
    id: 'cust-retention',
    category: 'CUSTOMERS',
    textAr: 'ما وضع الاحتفاظ بالعملاء؟',
    textEn: 'What is the customer retention status?',
    targetIntent: 'RETENTION',
    priority: 85,
  },
  {
    id: 'cust-drill-down',
    category: 'CUSTOMERS',
    textAr: 'حلل العميل المحدد بالتفصيل',
    textEn: 'Analyze the selected customer in detail',
    targetIntent: 'CUSTOMER_ANALYSIS',
    requiresCustomer: true,
    priority: 100,
  },
  {
    id: 'cust-purchase-pattern',
    category: 'CUSTOMERS',
    textAr: 'ما نمط شراء العميل المحدد؟',
    textEn: 'What is the purchasing pattern of the selected customer?',
    targetIntent: 'CUSTOMER_ANALYSIS',
    requiresCustomer: true,
    priority: 80,
  },
  {
    id: 'cust-stopped-products',
    category: 'CUSTOMERS',
    textAr: 'إيه المنتجات اللي العميل وقف يشتريها؟',
    textEn: 'Which products did the customer stop buying?',
    targetIntent: 'CUSTOMER_PRODUCT_HISTORY',
    requiresCustomer: true,
    priority: 90,
  },

  // 3. PRODUCTS
  {
    id: 'prod-top',
    category: 'PRODUCTS',
    textAr: 'ما المنتجات الأعلى أداءً؟',
    textEn: 'What are the top performing products?',
    targetIntent: 'PRODUCT_PERFORMANCE',
    priority: 95,
  },
  {
    id: 'prod-declining',
    category: 'PRODUCTS',
    textAr: 'ما المنتجات المتراجعة؟',
    textEn: 'What are the declining products?',
    targetIntent: 'PRODUCT_PERFORMANCE',
    priority: 85,
  },
  {
    id: 'prod-drill-down',
    category: 'PRODUCTS',
    textAr: 'حلل المنتج المحدد',
    textEn: 'Analyze the selected product',
    targetIntent: 'PRODUCT_ANALYSIS',
    requiresProduct: true,
    priority: 100,
  },
  {
    id: 'prod-top-customers',
    category: 'PRODUCTS',
    textAr: 'مين أكبر عملاء المنتج المحدد؟',
    textEn: 'Who are the top customers for the selected product?',
    targetIntent: 'PRODUCT_CUSTOMERS',
    requiresProduct: true,
    priority: 90,
  },
  {
    id: 'prod-growth-trend',
    category: 'PRODUCTS',
    textAr: 'هل المنتج المحدد ينمو أم يتراجع؟',
    textEn: 'Is the selected product growing or declining?',
    targetIntent: 'PRODUCT_ANALYSIS',
    requiresProduct: true,
    priority: 85,
  },

  // 4. SALES_REPS
  {
    id: 'rep-compare',
    category: 'SALES_REPS',
    textAr: 'قارن أداء مناديب المبيعات',
    textEn: 'Compare sales reps performance',
    targetIntent: 'SALES_REPS',
    priority: 95,
  },
  {
    id: 'rep-top',
    category: 'SALES_REPS',
    textAr: 'مين أعلى المناديب مبيعات؟',
    textEn: 'Who are the top sales reps by sales?',
    targetIntent: 'SALES_REPS',
    priority: 90,
  },
  {
    id: 'rep-highest-churn',
    category: 'SALES_REPS',
    textAr: 'مين المناديب الأكثر تعرضاً لفقد العملاء؟',
    textEn: 'Which sales reps are most exposed to customer churn?',
    targetIntent: 'SALES_REPS',
    priority: 85,
  },
  {
    id: 'rep-intervention',
    category: 'SALES_REPS',
    textAr: 'مين محتاج تدخل إداري حالياً؟',
    textEn: 'Who needs executive intervention right now?',
    targetIntent: 'SALES_REPS',
    priority: 80,
  },
  {
    id: 'rep-growth-opportunities',
    category: 'SALES_REPS',
    textAr: 'ما فرص النمو لكل مندوب؟',
    textEn: 'What are the growth opportunities for each rep?',
    targetIntent: 'SALES_REPS',
    priority: 75,
  },

  // 5. RECOVERY_GROWTH
  {
    id: 'rec-lost-customers',
    category: 'RECOVERY_GROWTH',
    textAr: 'مين أهم العملاء المفقودين؟',
    textEn: 'Who are the most important lost customers?',
    targetIntent: 'LOST_CUSTOMERS',
    priority: 95,
  },
  {
    id: 'rec-biggest-recovery',
    category: 'RECOVERY_GROWTH',
    textAr: 'ما أكبر فرص الاستعادة الحالية؟',
    textEn: 'What are the biggest current recovery opportunities?',
    targetIntent: 'LOST_CUSTOMERS',
    priority: 90,
  },
  {
    id: 'rec-declining-recovery',
    category: 'RECOVERY_GROWTH',
    textAr: 'مين العملاء المتراجعين اللي نقدر نستعيد مبيعاتهم؟',
    textEn: 'Which declining customers have the highest recovery potential?',
    targetIntent: 'DECLINING_CUSTOMERS',
    priority: 85,
  },
  {
    id: 'rec-cross-sell',
    category: 'RECOVERY_GROWTH',
    textAr: 'ما المنتجات الجديدة اللي ممكن نبيعها للعميل المحدد؟',
    textEn: 'What new products can we cross-sell to the selected customer?',
    targetIntent: 'CROSS_SELL',
    requiresCustomer: true,
    unavailableWhen: {
      salesperson: true,
      governorate: true,
      area: true,
    },
    priority: 80,
  },

  // 6. ORDERS
  {
    id: 'order-cust-recent',
    category: 'ORDERS',
    textAr: 'اعرض آخر 10 أوردرات للعميل المحدد',
    textEn: 'Show the last 10 orders for the selected customer',
    targetIntent: 'CUSTOMER_RECENT_ORDERS',
    requiresCustomer: true,
    priority: 95,
  },
  {
    id: 'order-cust-pattern',
    category: 'ORDERS',
    textAr: 'حلل نمط طلبات العميل',
    textEn: 'Analyze the customer ordering pattern',
    targetIntent: 'CUSTOMER_ANALYSIS',
    requiresCustomer: true,
    priority: 85,
  },
  {
    id: 'order-cust-intervals',
    category: 'ORDERS',
    textAr: 'ما متوسط الفترات بين طلبات العميل؟',
    textEn: 'What is the average interval between customer orders?',
    targetIntent: 'CUSTOMER_ANALYSIS',
    requiresCustomer: true,
    priority: 75,
  },
];

/**
 * Checks whether a question is available based on current filter state.
 */
export function isQuestionAvailable(
  question: AiQuestionShortcut,
  filters: FilterState
): boolean {
  const hasCustomer = Boolean(filters.customerId || (filters.customerName && filters.customerName.trim().length > 0));
  const hasProduct = Boolean(filters.productId || (filters.productName && filters.productName.trim().length > 0));
  const hasSalesperson = Boolean(filters.customerId); // placeholder check removed — use available filter props
  const hasGovernorate = Boolean(filters.customerId);
  const hasArea = Boolean(filters.customerId);

  if (question.requiresCustomer && !hasCustomer) {
    return false;
  }

  if (question.requiresProduct && !hasProduct) {
    return false;
  }

  if (question.unavailableWhen) {
    if (question.unavailableWhen.salesperson && hasSalesperson) {
      return false;
    }
    if (question.unavailableWhen.governorate && hasGovernorate) {
      return false;
    }
    if (question.unavailableWhen.area && hasArea) {
      return false;
    }
  }

  return true;
}

/**
 * Deterministic Smart Suggested Questions Selector (4 to 6 questions).
 */
export function getSmartSuggestedQuestions(filters: FilterState): AiQuestionShortcut[] {
  const hasCustomer = Boolean(filters.customerId || (filters.customerName && filters.customerName.trim().length > 0));
  const hasProduct = Boolean(filters.productId || (filters.productName && filters.productName.trim().length > 0));
  const hasSalesperson = false;
  const hasGeography = false;

  const available = AI_QUESTIONS_CATALOG.filter((q) => isQuestionAvailable(q, filters));
  const selected: AiQuestionShortcut[] = [];

  const addById = (id: string) => {
    if (selected.length >= 6) return;
    const found = available.find((q) => q.id === id);
    if (found && !selected.some((s) => s.id === found.id)) {
      selected.push(found);
    }
  };

  // Case A: Customer + Product Selected
  if (hasCustomer && hasProduct) {
    addById('cust-drill-down');
    addById('prod-drill-down');
    addById('prod-top-customers');
    addById('cust-stopped-products');
    addById('order-cust-recent');
    addById('prod-growth-trend');
  }
  // Case B: Customer Selected
  else if (hasCustomer) {
    addById('cust-drill-down');
    addById('order-cust-recent');
    addById('cust-stopped-products');
    addById('cust-purchase-pattern');
    if (!hasSalesperson && !hasGeography) {
      addById('rec-cross-sell');
    }
    addById('cust-risk');
    addById('order-cust-pattern');
  }
  // Case C: Product Selected
  else if (hasProduct) {
    addById('prod-drill-down');
    addById('prod-top-customers');
    addById('prod-growth-trend');
    addById('prod-top');
    addById('cust-declining');
    addById('sales-trend');
  }
  // Case D: Default Aggregated Scope
  else {
    addById('sales-summary');
    addById('cust-declining');
    addById('prod-top');
    addById('rep-compare');
    addById('rec-lost-customers');
    addById('sales-biggest-opportunity');
  }

  // Ensure between 4 and 6 questions are returned if available
  if (selected.length < 4) {
    for (const q of available) {
      if (!selected.some((s) => s.id === q.id)) {
        selected.push(q);
        if (selected.length >= 6) break;
      }
    }
  }

  return selected.slice(0, 6);
}

/**
 * Returns all available questions grouped by the 6 standard user-facing categories.
 */
export function getAllAvailableQuestions(
  filters: FilterState
): Record<AiQuestionCategory, AiQuestionShortcut[]> {
  const available = AI_QUESTIONS_CATALOG.filter((q) => isQuestionAvailable(q, filters));

  const grouped: Record<AiQuestionCategory, AiQuestionShortcut[]> = {
    SALES: [],
    CUSTOMERS: [],
    PRODUCTS: [],
    SALES_REPS: [],
    RECOVERY_GROWTH: [],
    ORDERS: [],
  };

  for (const q of available) {
    grouped[q.category].push(q);
  }

  return grouped;
}

export interface SuggestedFollowUpItem {
  id: string;
  textAr: string;
  textEn?: string;
  targetIntent: AiQueryIntent;
}

/**
 * Deterministic Follow-Up Suggestions (2 to 4 questions max) based on the responded intent and active filters.
 */
export function getSuggestedFollowUps(params: {
  intent?: AiQueryIntent;
  filters: FilterState;
}): SuggestedFollowUpItem[] {
  const { intent, filters } = params;
  const hasCustomer = Boolean(filters.customerId || (filters.customerName && filters.customerName.trim().length > 0));
  const hasProduct = Boolean(filters.productId || (filters.productName && filters.productName.trim().length > 0));
  const hasSalesperson = false;
  const hasGeography = false;
  const isCrossSellSupported = hasCustomer && !hasSalesperson && !hasGeography;

  const followUps: SuggestedFollowUpItem[] = [];

  switch (intent) {
    case 'CUSTOMER_ANALYSIS': {
      followUps.push({
        id: 'fu-cust-orders',
        textAr: 'اعرض آخر 10 أوردرات',
        textEn: 'Show last 10 orders',
        targetIntent: 'CUSTOMER_RECENT_ORDERS',
      });
      followUps.push({
        id: 'fu-cust-stopped',
        textAr: 'إيه المنتجات اللي العميل وقف يشتريها؟',
        textEn: 'Which products did the customer stop buying?',
        targetIntent: 'CUSTOMER_PRODUCT_HISTORY',
      });
      followUps.push({
        id: 'fu-cust-action',
        textAr: 'ما الإجراء المقترح للمتابعة؟',
        textEn: 'What is the suggested follow-up action?',
        targetIntent: 'CUSTOMER_ANALYSIS',
      });
      if (isCrossSellSupported) {
        followUps.push({
          id: 'fu-cust-cross-sell',
          textAr: 'ما فرصة زيادة المبيعات؟',
          textEn: 'What is the growth/cross-sell opportunity?',
          targetIntent: 'CROSS_SELL',
        });
      } else {
        followUps.push({
          id: 'fu-cust-pattern',
          textAr: 'ما نمط شراء العميل؟',
          textEn: 'What is the customer purchasing pattern?',
          targetIntent: 'CUSTOMER_ANALYSIS',
        });
      }
      break;
    }

    case 'CUSTOMER_PRODUCT_HISTORY': {
      followUps.push({
        id: 'fu-cph-orders',
        textAr: 'اعرض أحدث أوردرات العميل',
        textEn: 'Show recent customer orders',
        targetIntent: 'CUSTOMER_RECENT_ORDERS',
      });
      followUps.push({
        id: 'fu-cph-drop',
        textAr: 'ما حجم الانخفاض في المشتريات؟',
        textEn: 'What is the size of drop in purchases?',
        targetIntent: 'CUSTOMER_PRODUCT_HISTORY',
      });
      followUps.push({
        id: 'fu-cph-action',
        textAr: 'ما الإجراء المقترح لاستعادة المبيعات؟',
        textEn: 'What is the suggested recovery action?',
        targetIntent: 'CUSTOMER_PRODUCT_HISTORY',
      });
      if (isCrossSellSupported) {
        followUps.push({
          id: 'fu-cph-cross-sell',
          textAr: 'ما المنتجات الجديدة المقترحة؟',
          textEn: 'What new products are suggested?',
          targetIntent: 'CROSS_SELL',
        });
      }
      break;
    }

    case 'DECLINING_CUSTOMERS': {
      followUps.push({
        id: 'fu-dec-recovery',
        textAr: 'اعرض أعلى فرص الاستعادة',
        textEn: 'Show highest recovery opportunities',
        targetIntent: 'DECLINING_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-dec-reps',
        textAr: 'قسمهم حسب المندوب',
        textEn: 'Segment by sales rep',
        targetIntent: 'DECLINING_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-dec-action',
        textAr: 'ما الإجراء الإداري الأول؟',
        textEn: 'What is the first executive action?',
        targetIntent: 'DECLINING_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-dec-top-gap',
        textAr: 'مين الأعلى في قيمة الانخفاض؟',
        textEn: 'Who has the largest drop value?',
        targetIntent: 'DECLINING_CUSTOMERS',
      });
      break;
    }

    case 'LOST_CUSTOMERS': {
      followUps.push({
        id: 'fu-lost-top',
        textAr: 'اعرض أعلى العملاء المفقودين بالقيمة',
        textEn: 'Show highest value lost customers',
        targetIntent: 'LOST_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-lost-reps',
        textAr: 'قسمهم حسب المندوب',
        textEn: 'Segment by sales rep',
        targetIntent: 'LOST_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-lost-plan',
        textAr: 'ما خطة الاستعادة المقترحة؟',
        textEn: 'What is the suggested win-back plan?',
        targetIntent: 'LOST_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-lost-val',
        textAr: 'ما قيمة المبيعات المفقودة؟',
        textEn: 'What is the value of lost sales?',
        targetIntent: 'LOST_CUSTOMERS',
      });
      break;
    }

    case 'PRODUCT_ANALYSIS': {
      if (hasProduct) {
        followUps.push({
          id: 'fu-prod-custs',
          textAr: 'مين أكبر عملاء المنتج؟',
          textEn: 'Who are the top customers for this product?',
          targetIntent: 'PRODUCT_CUSTOMERS',
        });
        followUps.push({
          id: 'fu-prod-trend',
          textAr: 'هل المنتج ينمو أم يتراجع؟',
          textEn: 'Is the product growing or declining?',
          targetIntent: 'PRODUCT_ANALYSIS',
        });
        followUps.push({
          id: 'fu-prod-scope',
          textAr: 'ما أداء المنتج داخل النطاق الحالي؟',
          textEn: 'How is the product performing in current scope?',
          targetIntent: 'PRODUCT_ANALYSIS',
        });
      } else {
        followUps.push({
          id: 'fu-prod-top-perf',
          textAr: 'ما المنتجات الأعلى أداءً؟',
          textEn: 'What are the top performing products?',
          targetIntent: 'PRODUCT_PERFORMANCE',
        });
      }
      break;
    }

    case 'PRODUCT_CUSTOMERS': {
      if (hasProduct) {
        followUps.push({
          id: 'fu-prod-cust-deep',
          textAr: 'حلل المنتج المحدد',
          textEn: 'Analyze the selected product',
          targetIntent: 'PRODUCT_ANALYSIS',
        });
        followUps.push({
          id: 'fu-prod-cust-top',
          textAr: 'مين أكبر العملاء؟',
          textEn: 'Who are the top customers?',
          targetIntent: 'PRODUCT_CUSTOMERS',
        });
        followUps.push({
          id: 'fu-prod-cust-trend',
          textAr: 'هل المنتج ينمو أم يتراجع؟',
          textEn: 'Is the product growing or declining?',
          targetIntent: 'PRODUCT_ANALYSIS',
        });
      } else {
        followUps.push({
          id: 'fu-prod-perf-fallback',
          textAr: 'ما المنتجات الأعلى أداءً؟',
          textEn: 'What are the top performing products?',
          targetIntent: 'PRODUCT_PERFORMANCE',
        });
      }
      break;
    }

    case 'SALES_REPS': {
      followUps.push({
        id: 'fu-rep-top',
        textAr: 'مين الأعلى مبيعات؟',
        textEn: 'Who is highest in sales?',
        targetIntent: 'SALES_REPS',
      });
      followUps.push({
        id: 'fu-rep-churn',
        textAr: 'مين الأكثر فقداً للعملاء؟',
        textEn: 'Who has the highest customer loss?',
        targetIntent: 'SALES_REPS',
      });
      followUps.push({
        id: 'fu-rep-action',
        textAr: 'مين يحتاج تدخل إداري؟',
        textEn: 'Who needs executive intervention?',
        targetIntent: 'SALES_REPS',
      });
      followUps.push({
        id: 'fu-rep-opp',
        textAr: 'ما أهم فرص النمو؟',
        textEn: 'What are the top growth opportunities?',
        targetIntent: 'SALES_REPS',
      });
      break;
    }

    case 'EXECUTIVE_SUMMARY': {
      followUps.push({
        id: 'fu-exec-dec',
        textAr: 'مين أهم العملاء المتراجعين؟',
        textEn: 'Who are the top declining customers?',
        targetIntent: 'DECLINING_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-exec-prod',
        textAr: 'ما المنتجات الأعلى مساهمة؟',
        textEn: 'What are the top contributing products?',
        targetIntent: 'PRODUCT_PERFORMANCE',
      });
      followUps.push({
        id: 'fu-exec-ret',
        textAr: 'ما وضع الاحتفاظ بالعملاء؟',
        textEn: 'What is customer retention status?',
        targetIntent: 'RETENTION',
      });
      followUps.push({
        id: 'fu-exec-rep',
        textAr: 'قارن أداء المناديب',
        textEn: 'Compare sales reps performance',
        targetIntent: 'SALES_REPS',
      });
      break;
    }

    case 'SALES_PERFORMANCE': {
      followUps.push({
        id: 'fu-sp-dec',
        textAr: 'مين العملاء المتراجعين؟',
        textEn: 'Which customers are declining?',
        targetIntent: 'DECLINING_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-sp-prod',
        textAr: 'ما المنتجات الأعلى مبيعات؟',
        textEn: 'What are the top selling products?',
        targetIntent: 'PRODUCT_PERFORMANCE',
      });
      followUps.push({
        id: 'fu-sp-reps',
        textAr: 'قارن أداء مناديب المبيعات',
        textEn: 'Compare sales reps performance',
        targetIntent: 'SALES_REPS',
      });
      followUps.push({
        id: 'fu-sp-opp',
        textAr: 'أين توجد أكبر فرصة نمو؟',
        textEn: 'Where is the biggest growth opportunity?',
        targetIntent: 'SALES_PERFORMANCE',
      });
      break;
    }

    case 'RETENTION':
    case 'RISK': {
      followUps.push({
        id: 'fu-risk-lost',
        textAr: 'مين أهم العملاء المفقودين؟',
        textEn: 'Who are the top lost customers?',
        targetIntent: 'LOST_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-risk-dec',
        textAr: 'مين العملاء المتراجعين؟',
        textEn: 'Who are the declining customers?',
        targetIntent: 'DECLINING_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-risk-reps',
        textAr: 'مين المناديب الأكثر تعرضاً للفقد؟',
        textEn: 'Which sales reps are most exposed to churn?',
        targetIntent: 'SALES_REPS',
      });
      break;
    }

    case 'PRODUCT_PERFORMANCE': {
      followUps.push({
        id: 'fu-pp-declining',
        textAr: 'ما المنتجات المتراجعة؟',
        textEn: 'What are the declining products?',
        targetIntent: 'PRODUCT_PERFORMANCE',
      });
      followUps.push({
        id: 'fu-pp-reps',
        textAr: 'قارن أداء المناديب',
        textEn: 'Compare sales reps performance',
        targetIntent: 'SALES_REPS',
      });
      followUps.push({
        id: 'fu-pp-summary',
        textAr: 'لخص أداء الفترة الحالية',
        textEn: 'Summarize current period performance',
        targetIntent: 'EXECUTIVE_SUMMARY',
      });
      break;
    }

    case 'CUSTOMER_RECENT_ORDERS': {
      followUps.push({
        id: 'fu-ro-stopped',
        textAr: 'إيه المنتجات اللي العميل وقف يشتريها؟',
        textEn: 'Which products did the customer stop buying?',
        targetIntent: 'CUSTOMER_PRODUCT_HISTORY',
      });
      followUps.push({
        id: 'fu-ro-pattern',
        textAr: 'ما نمط شراء العميل المحدد؟',
        textEn: 'What is the purchasing pattern of this customer?',
        targetIntent: 'CUSTOMER_ANALYSIS',
      });
      followUps.push({
        id: 'fu-ro-deep',
        textAr: 'حلل العميل المحدد بالتفصيل',
        textEn: 'Analyze the customer in detail',
        targetIntent: 'CUSTOMER_ANALYSIS',
      });
      break;
    }

    default: {
      followUps.push({
        id: 'fu-def-summary',
        textAr: 'لخص أداء الفترة الحالية',
        textEn: 'Summarize current period performance',
        targetIntent: 'EXECUTIVE_SUMMARY',
      });
      followUps.push({
        id: 'fu-def-declining',
        textAr: 'مين العملاء اللي مبيعاتهم انخفضت؟',
        textEn: 'Which customers had sales drop?',
        targetIntent: 'DECLINING_CUSTOMERS',
      });
      followUps.push({
        id: 'fu-def-products',
        textAr: 'ما المنتجات الأعلى أداءً؟',
        textEn: 'What are the top performing products?',
        targetIntent: 'PRODUCT_PERFORMANCE',
      });
      followUps.push({
        id: 'fu-def-reps',
        textAr: 'قارن أداء مناديب المبيعات',
        textEn: 'Compare sales reps performance',
        targetIntent: 'SALES_REPS',
      });
      break;
    }
  }

  return followUps.slice(0, 4);
}

/**
 * Builds a user-facing compact scope badge text from the current filters.
 * Pure display labels only - zero IDs.
 */
export function buildScopeBadgeLabel(filters: FilterState): string {
  const parts: string[] = [];

  // 1. Entity (Customer / Product)
  if (filters.customerName && filters.customerName.trim().length > 0) {
    parts.push(filters.customerName);
  } else if (filters.customerId) {
    parts.push('العميل المحدد');
  }

  if (filters.productName && filters.productName.trim().length > 0) {
    parts.push(filters.productName);
  } else if (filters.productId) {
    parts.push('المنتج المحدد');
  }

  // 2. Date Range / Period
  if (filters.dateRange?.label) {
    parts.push(filters.dateRange.label);
  } else if (filters.periodMode) {
    parts.push(filters.periodMode === 'current_month' ? 'الشهر الحالي' : filters.periodMode);
  }

  if (parts.length === 0) {
    return 'كافة البيانات المجمعة';
  }

  return parts.join(' • ');
}

/**
 * Maps intent / mode to an executive user-facing analysis badge in Arabic.
 */
export function getAnalysisBadgeLabel(intent?: AiQueryIntent, contextMode?: 'AGGREGATED' | 'DRILL_DOWN'): string {
  switch (intent) {
    case 'CUSTOMER_ANALYSIS':
      return 'تحليل عميل';
    case 'CUSTOMER_RECENT_ORDERS':
      return 'تفاصيل أوردرات';
    case 'CUSTOMER_PRODUCT_HISTORY':
      return 'تحليل مشتريات العميل';
    case 'CROSS_SELL':
      return 'بيع متقاطع';
    case 'PRODUCT_ANALYSIS':
      return 'تحليل منتج';
    case 'PRODUCT_CUSTOMERS':
      return 'عملاء المنتج';
    case 'LOST_CUSTOMERS':
      return 'استعادة عملاء';
    case 'DECLINING_CUSTOMERS':
      return 'عملاء متراجعين';
    case 'RISK':
      return 'مخاطر العملاء';
    case 'RETENTION':
      return 'الاحتفاظ بالعملاء';
    case 'SALES_REPS':
      return 'أداء المناديب';
    case 'PRODUCT_PERFORMANCE':
      return 'أداء المنتجات';
    case 'SALES_PERFORMANCE':
      return 'اتجاه المبيعات';
    case 'EXECUTIVE_SUMMARY':
    case 'GENERAL_EXECUTIVE_QUESTION':
      return 'تحليل تنفيذي';
    default:
      return contextMode === 'DRILL_DOWN' ? 'تحليل تفصيلي' : 'تحليل تنفيذي';
  }
}
