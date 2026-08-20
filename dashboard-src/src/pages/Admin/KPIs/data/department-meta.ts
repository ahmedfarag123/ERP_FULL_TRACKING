import type { DepartmentMeta } from "../../../../types/kpi";

export const DEPARTMENTS: DepartmentMeta[] = [
  { slug: "sales", name: "المبيعات", nameAr: "المبيعات", codePrefix: "SAL", color: "blue", icon: "chart-bar" },
  { slug: "procurement", name: "المشتريات", nameAr: "المشتريات", codePrefix: "PRO", color: "emerald", icon: "shopping-cart" },
  { slug: "accounting-finance", name: "المحاسبة والمالية", nameAr: "المحاسبة والمالية", codePrefix: "FIN", color: "amber", icon: "currency-dollar" },
  { slug: "warehouse", name: "المخازن", nameAr: "المخازن", codePrefix: "WAR", color: "violet", icon: "building-storefront" },
  { slug: "transportation-fleet", name: "النقل والأسطول", nameAr: "النقل والأسطول", codePrefix: "FLT", color: "rose", icon: "truck" },
  { slug: "delivery", name: "التوصيل", nameAr: "التوصيل", codePrefix: "DEL", color: "indigo", icon: "map-pin" },
  { slug: "quality-customer-service", name: "الجودة وخدمة العملاء", nameAr: "الجودة وخدمة العملاء", codePrefix: "QCS", color: "orange", icon: "star" },
  { slug: "business-dev", name: "تطوير الأعمال", nameAr: "تطوير الأعمال", codePrefix: "BOD", color: "cyan", icon: "light-bulb" },
  { slug: "hr", name: "الموارد البشرية", nameAr: "الموارد البشرية", codePrefix: "HR", color: "pink", icon: "users" },
  { slug: "it-data", name: "تقنية المعلومات والبيانات", nameAr: "تقنية المعلومات والبيانات", codePrefix: "ITD", color: "slate", icon: "computer-desktop" },
  { slug: "marketing", name: "التسويق", nameAr: "التسويق", codePrefix: "MKT", color: "blue", icon: "megaphone" },
];

export function getDepartmentBySlug(slug: string) {
  return DEPARTMENTS.find((d) => d.slug === slug);
}

export function getDepartmentColor(slug: string): string {
  return getDepartmentBySlug(slug)?.color ?? "slate";
}
