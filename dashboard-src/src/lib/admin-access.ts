import type { AdminManagedRole } from "./admin-users";

// Emails allowed to manage all users (Super Admins)
export const SUPER_ADMIN_EMAILS = ["ahmed-farag@hs.com", "sameh@hs.com"];

export type AdminModuleKey =
  | "dashboard"
  | "orders"
  | "customers"
  | "visits"
  | "calls"
  | "users"
  | "tickets"
  | "logistics"
  | "finance";

export type AdminPermissionKey =
  | "dashboard.view"
  | "orders.view"
  | "orders.manage"
  | "customers.view"
  | "customers.assign"
  | "customers.manage"
  | "visits.view"
  | "visits.audit"
  | "calls.view"
  | "calls.audit"
  | "tickets.view"
  | "tickets.manage"
  | "logistics.view"
  | "logistics.manage"
  | "users.view"
  | "users.invite"
  | "users.role-change"
  | "users.password-reset"
  | "users.customer-assignment"
  | "users.auth-controls"
  | "finance.view"
  | "finance.manage"
  | "finance.approve"
  | "finance.close_period";

export interface AdminModuleDefinition {
  key: AdminModuleKey;
  label: string;
  description: string;
  routes: string[];
}

export interface AdminPermissionDefinition {
  key: AdminPermissionKey;
  moduleKey: AdminModuleKey;
  label: string;
  description: string;
}

export const ADMIN_ROLE_ORDER: AdminManagedRole[] = [
  "admin",
  "manager",
  "spv",
  "dispatcher",
  "driver",
  "supervisor",
  "sales_agent",
  "telesales",
];

export const ADMIN_MODULES: AdminModuleDefinition[] = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    description: "لوحة التشغيل الرئيسية والملخصات.",
    routes: ["/"],
  },
  {
    key: "orders",
    label: "الطلبات",
    description: "مراجعة ومراقبة وإدارة تدفق الطلبات الواردة.",
    routes: ["/orders"],
  },
  {
    key: "customers",
    label: "العملاء",
    description: "إدارة سجلات العملاء والملكية وسجل الحساب.",
    routes: ["/customers"],
  },
  {
    key: "visits",
    label: "الزيارات",
    description: "مراقبة سجلات الزيارات والنشاط الميداني والحضور.",
    routes: ["/visits"],
  },
  {
    key: "calls",
    label: "المكالمات",
    description: "مراجعة سجلات المكالمات وتواصل العملاء.",
    routes: ["/calls"],
  },
  {
    key: "tickets",
    label: "خدمة العملاء",
    description: "إدارة تذاكر الدعم والتعليقات على الطلبات.",
    routes: ["/tickets"],
  },
  {
    key: "logistics",
    label: "اللوجستيات",
    description: "إدارة تخطيط الشحنات والخطط والسائقين وحالة التجهيز.",
    routes: ["/logistics", "/logistics/shipments", "/logistics/plans"],
  },
  {
    key: "users",
    label: "المستخدمون",
    description: "إنشاء المستخدمين والتحكم بالأدوار ودورة المصادقة للمشرفين.",
    routes: ["/admin/users", "/admin/users/new", "/admin/access-control"],
  },
  {
    key: "finance",
    label: "المالية",
    description: "إدارة الحسابات والقيود اليومية والفواتير والتقارير المالية.",
    routes: ["/finance", "/finance/accounts", "/finance/journal", "/finance/invoices", "/finance/credit-notes", "/finance/receivables", "/finance/driver-settlements", "/finance/cost-centers", "/finance/reports", "/finance/settings", "/finance/audit-log"],
  },
];

export const ADMIN_PERMISSIONS: AdminPermissionDefinition[] = [
  {
    key: "dashboard.view",
    moduleKey: "dashboard",
    label: "عرض لوحة التحكم",
    description: "قراءة مؤشرات الأداء والملخصات العامة.",
  },
  {
    key: "orders.view",
    moduleKey: "orders",
    label: "عرض الطلبات",
    description: "قراءة سجلات الطلبات وحالة التسليم.",
  },
  {
    key: "orders.manage",
    moduleKey: "orders",
    label: "إدارة الطلبات",
    description: "التعامل مع ملكية الطلبات وعمليات التنفيذ.",
  },
  {
    key: "customers.view",
    moduleKey: "customers",
    label: "عرض العملاء",
    description: "قراءة سجلات العملاء وملفاتهم.",
  },
  {
    key: "customers.assign",
    moduleKey: "customers",
    label: "إسناد العملاء",
    description: "إسناد حسابات العملاء ونقلها بين المستخدمين.",
  },
  {
    key: "customers.manage",
    moduleKey: "customers",
    label: "إدارة العملاء",
    description: "تحديث عمليات العملاء وبيانات العلاقة.",
  },
  {
    key: "visits.view",
    moduleKey: "visits",
    label: "عرض الزيارات",
    description: "قراءة سجلات الزيارات ومواعيدها.",
  },
  {
    key: "visits.audit",
    moduleKey: "visits",
    label: "مراجعة الزيارات",
    description: "مراجعة تنفيذ الزيارات واتساقها.",
  },
  {
    key: "calls.view",
    moduleKey: "calls",
    label: "عرض المكالمات",
    description: "قراءة سجلات المكالمات وتاريخ التواصل مع العملاء.",
  },
  {
    key: "calls.audit",
    moduleKey: "calls",
    label: "مراجعة المكالمات",
    description: "مراجعة سلوك المكالمات وجودة المتابعة.",
  },
  {
    key: "tickets.view",
    moduleKey: "tickets",
    label: "عرض تذاكر خدمة العملاء",
    description: "قراءة تذاكر الدعم والتعليقات المرتبطة بالطلبات.",
  },
  {
    key: "tickets.manage",
    moduleKey: "tickets",
    label: "إدارة تذاكر خدمة العملاء",
    description: "إنشاء وتعديل وإغلاق تذاكر الدعم وتعيينها.",
  },
  {
    key: "logistics.view",
    moduleKey: "logistics",
    label: "عرض اللوجستيات",
    description: "قراءة الخطط والشحنات والسائقين ومؤشرات التشغيل.",
  },
  {
    key: "logistics.manage",
    moduleKey: "logistics",
    label: "إدارة اللوجستيات",
    description: "إنشاء الخطط وإسناد الشحنات وتشغيل مسار التجهيز.",
  },
  {
    key: "users.view",
    moduleKey: "users",
    label: "عرض المستخدمين",
    description: "قراءة ملفات المستخدمين وحالة المصادقة.",
  },
  {
    key: "users.invite",
    moduleKey: "users",
    label: "دعوة المستخدمين",
    description: "إنشاء ودعوة مستخدمين جدد عبر نظام المصادقة.",
  },
  {
    key: "users.role-change",
    moduleKey: "users",
    label: "تغيير الأدوار",
    description: "إعادة إسناد دور التطبيق وحالة الحساب.",
  },
  {
    key: "users.password-reset",
    moduleKey: "users",
    label: "إعادة تعيين كلمات المرور",
    description: "إنشاء روابط استرداد وفرض تغيير كلمة المرور.",
  },
  {
    key: "users.customer-assignment",
    moduleKey: "users",
    label: "إسناد ملكية العملاء",
    description: "نقل حسابات العملاء بين المستخدمين النشطين.",
  },
  {
    key: "users.auth-controls",
    moduleKey: "users",
    label: "التحكم بدورة المصادقة",
    description: "اعتماد الحسابات وإدارة OTP وإشارات كلمة المرور.",
  },
  {
    key: "finance.view",
    moduleKey: "finance",
    label: "عرض المالية",
    description: "قراءة لوحة التحكم المالية والتقارير والقيود.",
  },
  {
    key: "finance.manage",
    moduleKey: "finance",
    label: "إدارة المالية",
    description: "إنشاء وتعديل القيود اليومية والفواتير وإعدادات الحسابات.",
  },
  {
    key: "finance.approve",
    moduleKey: "finance",
    label: "اعتماد المعاملات المالية",
    description: "اعتماد المعاملات المالية والتسويات فوق حد معيّن (فصل الصلاحيات).",
  },
  {
    key: "finance.close_period",
    moduleKey: "finance",
    label: "إغلاق الفترة المالية",
    description: "قفل أو إعادة فتح الفترة المالية — إجراء لا رجعة فيه.",
  },
];

export const ROLE_MODULE_ACCESS: Record<AdminManagedRole, AdminModuleKey[]> = {
  admin: ["dashboard", "orders", "customers", "visits", "calls", "users", "tickets", "logistics", "finance"],
  manager: ["dashboard", "orders", "customers", "visits", "calls", "tickets", "logistics", "finance"],
  spv: ["dashboard", "orders", "customers", "visits", "calls", "tickets", "logistics", "finance"],
  dispatcher: ["dashboard", "orders"],
  driver: [],
  supervisor: ["dashboard", "orders", "customers", "visits", "calls", "tickets"],
  sales_agent: ["customers", "visits", "calls", "tickets"],
  telesales: ["dashboard", "orders", "customers", "calls", "tickets"],
};

export const ROLE_PERMISSION_ACCESS: Record<AdminManagedRole, AdminPermissionKey[]> = {
  admin: ADMIN_PERMISSIONS.map((permission) => permission.key),
  manager: [
    "dashboard.view",
    "orders.view",
    "orders.manage",
    "customers.view",
    "customers.assign",
    "customers.manage",
    "visits.view",
    "visits.audit",
    "calls.view",
    "calls.audit",
    "tickets.view",
    "tickets.manage",
    "logistics.view",
    "logistics.manage",
    "finance.view",
    "finance.manage",
    "finance.approve",
  ],
  spv: [
    "dashboard.view",
    "orders.view",
    "orders.manage",
    "customers.view",
    "customers.assign",
    "customers.manage",
    "visits.view",
    "visits.audit",
    "calls.view",
    "calls.audit",
    "tickets.view",
    "tickets.manage",
    "logistics.view",
    "logistics.manage",
    "finance.view",
  ],
  dispatcher: [
    "dashboard.view",
    "orders.view",
    "orders.manage",
  ],
  driver: [],
  supervisor: [
    "dashboard.view",
    "orders.view",
    "customers.view",
    "customers.assign",
    "visits.view",
    "visits.audit",
    "calls.view",
    "calls.audit",
    "tickets.view",
    "tickets.manage",
  ],
  sales_agent: [
    "customers.view",
    "visits.view",
    "calls.view",
    "tickets.view",
    "tickets.manage",
  ],
  telesales: [
    "dashboard.view",
    "orders.view",
    "customers.view",
    "calls.view",
    "tickets.view",
    "tickets.manage",
  ],
};

export const AUTH_CYCLE_STEPS = [
  {
    label: "إنشاء",
    description: "ينشئ المشرف المستخدم بدعوة أو كلمة مرور مؤقتة عبر دالة المصادقة.",
  },
  {
    label: "اعتماد",
    description: "يفعل المشرف الحساب ويسجل الاعتماد التشغيلي في ملف المستخدم.",
  },
  {
    label: "منح الدور",
    description: "الوصول إلى أقسام التطبيق مرتبط بالدور، وتغيير الدور يغير التغطية مباشرة.",
  },
  {
    label: "تشغيل",
    description: "يسجل المستخدم الدخول بكلمة المرور وإعدادات OTP المخزنة في ملفه.",
  },
  {
    label: "استرداد",
    description: "يمكن للمشرف إعادة إرسال الدعوة أو إنشاء رابط استرداد أو تعيين كلمة مرور مؤقتة.",
  },
  {
    label: "إيقاف",
    description: "يمكن للمشرف تعطيل الملف أو أرشفته لإنهاء الوصول التشغيلي.",
  },
];

export function getRoleSummary(role: AdminManagedRole) {
  switch (role) {
    case "admin":
      return "Full app control, user provisioning, auth lifecycle, customer assignment, and finance management.";
    case "manager":
      return "Management visibility over orders, customers, visits, and calls.";
    case "spv":
      return "Supervisor access over dispatch, orders, customers, visits, and calls.";
    case "dispatcher":
      return "Dispatch access for order fulfillment and routing.";
    case "driver":
      return "Driver app access for assigned delivery work.";
    case "supervisor":
      return "Team oversight for customer operations, visits, calls, and order visibility.";
    case "sales_agent":
      return "Field execution focused on customers, visits, and calls.";
    case "telesales":
      return "Phone-first workflow focused on calls and customer follow-up.";
  }
}
