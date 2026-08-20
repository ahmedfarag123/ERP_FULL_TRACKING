const CRM_TOKEN_KEY = "crm_auth_token";

function getBaseUrl(): string {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  if (!supabaseUrl) return "";
  return supabaseUrl.replace(/\/+$/, "");
}

export function getStoredCrmToken(): string | null {
  try {
    return sessionStorage.getItem(CRM_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeCrmToken(token: string): void {
  try {
    sessionStorage.setItem(CRM_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearCrmToken(): void {
  try {
    sessionStorage.removeItem(CRM_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function crmLogin(email: string, password: string): Promise<string> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/crm/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || "فشل تسجيل الدخول");
  }

  const data = (await res.json()) as { access_token?: string; token?: string };
  const token = data.access_token ?? data.token;
  if (!token) throw new Error("لم يتم استلام رمز المصادقة");
  storeCrmToken(token);
  return token;
}

// ── Types ────────────────────────────────────────────────────────

export interface OdooOrder {
  id: number;
  name: string;
  partner_id: number;
  partner_name: string;
  partner_code: string;
  date_order: string | null;
  create_date: string | null;
  amount_total: number;
  state: string;
  invoice_status: string;
  user_id: number;
  user_name: string;
  user_login: string;
}

export interface OdooOrderListResponse {
  orders: OdooOrder[];
  total: number;
  page: number;
  page_size: number;
}

export interface OdooOrderLine {
  id: number;
  product_id: number;
  product_name: string;
  description: string;
  qty: number;
  price_unit: number;
  price_subtotal: number;
}

export interface OdooOrderDetail {
  id: number;
  name: string;
  partner_id: number;
  partner_name: string;
  partner_email: string;
  partner_phone: string;
  date_order: string | null;
  create_date: string | null;
  user_name: string;
  state: string;
  invoice_status: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  lines: OdooOrderLine[];
}

export interface LocalOrder {
  id: string;
  company: string;
  partner_id: number;
  partner_name: string | null;
  status: string;
  validation_result: string;
  order_lines: any[];
  odoo_order_id: number | null;
  odoo_order_name: string | null;
  error_message: string | null;
  rejection_category: string | null;
  rejection_message: string | null;
  retry_count: number;
  created_at: string;
  validated_at: string | null;
  pushed_at: string | null;
}

export interface LocalOrderListResponse {
  orders: LocalOrder[];
  total: number;
  page: number;
  page_size: number;
}

// ── Helpers ──────────────────────────────────────────────────────

async function crmFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredCrmToken();

  const base = getBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}/crm/api${path}`, { ...init, headers });

  if (res.status === 401) {
    clearCrmToken();
    throw new Error("AUTH_REQUIRED");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || `خطأ ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Odoo Orders ──────────────────────────────────────────────────

export async function fetchOdooOrders(
  page: number,
  pageSize: number,
  search?: string,
  state?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<OdooOrderListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) params.set("search", search);
  if (state && state !== "all") params.set("state", state);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  return crmFetch<OdooOrderListResponse>(`/odoo/orders?${params}`);
}

export function getOdooOrdersExportUrl(search?: string, state?: string, dateFrom?: string, dateTo?: string): string {
  const base = getBaseUrl();
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (state && state !== "all") params.set("state", state);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  return `${base}/crm/api/odoo/orders/export?${params}`;
}

export async function fetchOdooOrderDetail(orderId: number): Promise<OdooOrderDetail> {
  return crmFetch<OdooOrderDetail>(`/odoo/orders/detail/${orderId}`);
}

export async function confirmOdooOrderAction(orderId: number): Promise<{
  success: boolean;
  odoo_order_id: number;
  odoo_state: string;
  message: string;
}> {
  return crmFetch(`/odoo/orders/${orderId}/confirm`, { method: "POST" });
}

// ── Odoo Partners / Customers ────────────────────────────────────

export interface OdooPartner {
  id: number;
  name: string;
  ref: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  is_company: boolean;
  is_customer: boolean;
  company_id: number | null;
  user_id: number | null;
  salesperson_name: string | null;
}

export interface OdooPartnerListResponse {
  partners: OdooPartner[];
  total: number;
  page: number;
  page_size: number;
}

export async function fetchOdooPartners(
  page: number,
  pageSize: number,
  search?: string,
  salesperson?: number,
): Promise<OdooPartnerListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) params.set("search", search);
  if (salesperson) params.set("salesperson", String(salesperson));
  return crmFetch<OdooPartnerListResponse>(`/partners?${params}`);
}

export interface Salesperson {
  odoo_user_id: number;
  name: string;
  partner_count: number;
}

export async function fetchSalespersons(): Promise<Salesperson[]> {
  const res = await crmFetch<{ salespersons: Salesperson[] }>(`/partners/salespersons`);
  return res.salespersons;
}

export interface MonthlyStats {
  total: number;
  month: string;
  breakdown: { user_id: number; name: string; count: number }[];
  error?: string;
}

export async function fetchMonthlyStats(salesperson?: number, month?: string): Promise<MonthlyStats> {
  const params = new URLSearchParams();
  if (salesperson) params.set("salesperson", String(salesperson));
  if (month) params.set("month", month);
  return crmFetch<MonthlyStats>(`/partners/monthly-stats?${params}`);
}

// ── Local / Sync Queue Orders ────────────────────────────────────

export async function fetchLocalOrders(
  page: number,
  pageSize: number,
): Promise<LocalOrderListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return crmFetch<LocalOrderListResponse>(`/orders?${params}`);
}

export async function fetchLocalOrderDetail(orderId: string): Promise<LocalOrder> {
  return crmFetch<LocalOrder>(`/orders/${orderId}`);
}
