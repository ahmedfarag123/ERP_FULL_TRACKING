// ============================================================
// Odoo Sync Rules — Defines which operations need approval
// Rule: data FROM Odoo = auto-approved, data TO Odoo = pending
// ============================================================

export type SyncDirection = "inbound" | "outbound";
export type SyncGovernance = "auto" | "pending_approval";

export interface OdooSyncRule {
  entityType: string;
  odooModel: string;
  direction: SyncDirection;
  governance: SyncGovernance;
  description: string;
  descriptionAr: string;
  dashboardTable: string;
  operations: string[];
}

export const ODOO_SYNC_RULES: OdooSyncRule[] = [
  // ─── INBOUND (Odoo → Dashboard) — Auto-approved ───
  {
    entityType: "order",
    odooModel: "sale.order",
    direction: "inbound",
    governance: "auto",
    description: "Sales orders synced from Odoo",
    descriptionAr: "طلبات المبيعات المتزامنة من Odoo",
    dashboardTable: "orders",
    operations: ["sync"],
  },
  {
    entityType: "order_line",
    odooModel: "sale.order.line",
    direction: "inbound",
    governance: "auto",
    description: "Order line items synced from Odoo",
    descriptionAr: "بنود الطلبات المتزامنة من Odoo",
    dashboardTable: "order_line_items",
    operations: ["sync"],
  },
  {
    entityType: "customer",
    odooModel: "res.partner",
    direction: "inbound",
    governance: "auto",
    description: "Customers/partners synced from Odoo",
    descriptionAr: "العملاء/الشركاء المتزامنون من Odoo",
    dashboardTable: "customers",
    operations: ["sync"],
  },
  {
    entityType: "product",
    odooModel: "product.template",
    direction: "inbound",
    governance: "auto",
    description: "Products synced from Odoo",
    descriptionAr: "المنتجات المتزامنة من Odoo",
    dashboardTable: "products",
    operations: ["sync"],
  },
  {
    entityType: "crm_lead",
    odooModel: "crm.lead",
    direction: "inbound",
    governance: "auto",
    description: "CRM leads/opportunities synced from Odoo",
    descriptionAr: "فرص CRM المتزامنة من Odoo",
    dashboardTable: "odoo_crm_leads",
    operations: ["sync"],
  },
  {
    entityType: "picking",
    odooModel: "stock.picking",
    direction: "inbound",
    governance: "auto",
    description: "Delivery pickings synced from Odoo",
    descriptionAr: "سندات التسليم المتزامنة من Odoo",
    dashboardTable: "order_delivery_documents",
    operations: ["sync"],
  },
  {
    entityType: "invoice",
    odooModel: "account.move",
    direction: "inbound",
    governance: "auto",
    description: "Invoices synced from Odoo",
    descriptionAr: "الفواتير المتزامنة من Odoo",
    dashboardTable: "order_invoice_documents",
    operations: ["sync"],
  },

  // ─── OUTBOUND (Dashboard → Odoo) — Pending approval ───
  {
    entityType: "customer",
    odooModel: "res.partner",
    direction: "outbound",
    governance: "pending_approval",
    description: "New customer created in dashboard → create in Odoo",
    descriptionAr: "عميل جديد منشئ في لوحة التحكم → إنشاء في Odoo",
    dashboardTable: "customers",
    operations: ["create", "update", "archive"],
  },
  {
    entityType: "quotation",
    odooModel: "sale.order",
    direction: "outbound",
    governance: "pending_approval",
    description: "New quotation from dashboard → create in Odoo",
    descriptionAr: "عرض أسعار جديد من لوحة التحكم → إنشاء في Odoo",
    dashboardTable: "orders",
    operations: ["create"],
  },
  {
    entityType: "product",
    odooModel: "product.template",
    direction: "outbound",
    governance: "pending_approval",
    description: "New product from dashboard → create in Odoo",
    descriptionAr: "منتج جديد من لوحة التحكم → إنشاء في Odoo",
    dashboardTable: "products",
    operations: ["create", "update"],
  },
  {
    entityType: "crm_lead",
    odooModel: "crm.lead",
    direction: "outbound",
    governance: "pending_approval",
    description: "New CRM lead from dashboard → create in Odoo",
    descriptionAr: "فرصة CRM جديدة من لوحة التحكم → إنشاء في Odoo",
    dashboardTable: "odoo_crm_leads",
    operations: ["create", "update"],
  },
  {
    entityType: "crm_activity",
    odooModel: "mail.activity",
    direction: "outbound",
    governance: "pending_approval",
    description: "Call activity → create CRM activity in Odoo",
    descriptionAr: "نشاط مكالمة → إنشاء نشاط CRM في Odoo",
    dashboardTable: "calls",
    operations: ["create"],
  },
  {
    entityType: "visit_activity",
    odooModel: "mail.activity",
    direction: "outbound",
    governance: "pending_approval",
    description: "Visit activity → create CRM activity in Odoo",
    descriptionAr: "نشاط زيارة → إنشاء نشاط CRM في Odoo",
    dashboardTable: "visits",
    operations: ["create"],
  },
  {
    entityType: "invoice",
    odooModel: "account.move",
    direction: "outbound",
    governance: "pending_approval",
    description: "Invoice created in dashboard → create in Odoo",
    descriptionAr: "فاتورة منشئة في لوحة التحكم → إنشاء في Odoo",
    dashboardTable: "finance_invoices",
    operations: ["create"],
  },
];

export function getRulesByDirection(direction: SyncDirection): OdooSyncRule[] {
  return ODOO_SYNC_RULES.filter((rule) => rule.direction === direction);
}

export function getRulesByEntity(entityType: string): OdooSyncRule[] {
  return ODOO_SYNC_RULES.filter((rule) => rule.entityType === entityType);
}

export function getRuleForOperation(
  entityType: string,
  operation: string
): OdooSyncRule | undefined {
  return ODOO_SYNC_RULES.find(
    (rule) => rule.entityType === entityType && rule.operations.includes(operation)
  );
}
