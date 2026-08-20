/**
 * Analytics API client — calls CRM backend analytics endpoints.
 */

const CRM_TOKEN_KEY = "crm_auth_token";

function getBaseUrl(): string {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  if (!supabaseUrl) return "";
  return supabaseUrl.replace(/\/+$/, "");
}

function getToken(): string | null {
  try {
    return sessionStorage.getItem(CRM_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function analyticsFetch<T>(path: string): Promise<T> {
  const base = getBaseUrl();
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${base}/crm/api/analytics${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || `Analytics API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | null | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ── Types ──────────────────────────────────────────────────────

export interface ExecutiveKpis {
  total_sales: number;
  total_orders: number;
  active_customers: number;
  average_order_value: number;
  previous_sales: number;
  revenue_growth_pct: number | null;
}

export interface DailyTrendRow {
  order_date: string;
  company_name: string;
  daily_sales: number;
  daily_orders: number;
  daily_customers: number;
}

export interface TopCustomerRow {
  customer_id: number;
  customer_name: string;
  company_name: string;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  last_order_at: string;
  primary_salesperson: string;
}

export interface SalesRepSummaryRow {
  order_month: string;
  company_name: string;
  salesperson: string;
  active_customers: number;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  previous_customers: number;
  retained_customers: number;
  lost_customers: number;
  transferred_out_customers: number;
  transferred_in_customers: number;
  new_customers: number;
  reactivated_customers: number;
  lost_previous_sales: number;
  retention_rate: number;
}

export interface SalesRepTrendRow {
  order_month: string;
  company_name: string;
  salesperson: string;
  active_customers: number;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  retained_customers: number;
  lost_customers: number;
  new_customers: number;
  retention_rate: number;
}

export interface SalesRepCustomerRow {
  customer_id: number;
  customer_name: string;
  company_name: string;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  first_order_date: string;
  last_order_date: string;
}

export interface CustomerSummaryRow {
  customer_id: number;
  customer_name: string;
  company_name: string;
  primary_salesperson: string;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  first_order_date: string;
  last_order_date: string;
  days_since_last_order: number;
  customer_status: string;
  previous_period_sales: number;
  sales_change_pct: number | null;
}

export interface CustomerOrderRow {
  order_id: number;
  order_name: string;
  order_date: string;
  company_name: string;
  salesperson: string;
  governorate_name: string;
  area_name: string;
  order_value: number;
  lines_count: number;
  products_count: number;
  total_qty: number;
  order_status: string;
}

export interface FavoriteProductRow {
  product_id: number;
  product_name: string;
  sales_value: number;
  orders_count: number;
  quantity: number;
  sales_share_pct: number;
  last_order_date: string;
}

export interface ActionCenterRow {
  customer_id: number;
  customer_name: string;
  company_name: string;
  current_salesperson: string;
  last_order_date: string;
  days_since_last_order: number;
  median_days_between_orders: number;
  recent_30d_sales: number;
  previous_30d_sales: number;
  sales_change_pct: number | null;
  recovery_opportunity: number;
  risk_level: string;
  action_type: string;
  priority: string;
  action_reason: string;
  salesperson_changed: boolean;
}

export interface RetentionSummaryRow {
  previous_active_customers: number;
  retained_with_same_rep: number;
  transferred_customers: number;
  true_lost_customers: number;
  new_customers: number;
  company_retention_rate: number;
  same_rep_retention_rate: number;
  lost_customer_revenue_egp: number;
}

export interface RetentionDetailRow {
  company_name: string;
  customer_id: number;
  customer_name: string;
  previous_salesperson: string;
  current_salesperson: string;
  previous_orders: number;
  current_orders: number;
  previous_sales: number;
  current_sales: number;
  retention_status: string;
  sales_change_pct: number | null;
  previous_last_order_date: string;
  current_last_order_date: string;
}

export interface ProductSummaryRow {
  product_id: number;
  product_name: string;
  product_category: string;
  orders_count: number;
  customers_count: number;
  qty_sold: number;
  sales_value: number;
  avg_unit_value: number;
  last_order_date: string;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface CompanyFilter {
  company_name: string;
  orders_count: number;
  sales_value: number;
}

export interface SalespersonFilter {
  salesperson: string;
  orders_count: number;
  sales_value: number;
  customers_count: number;
}

export interface CustomerFilter {
  customer_id: number;
  customer_name: string;
  company_name: string;
  orders_count: number;
  sales_value: number;
}

export interface ProductFilter {
  product_id: number;
  product_name: string;
  product_category: string;
  orders_count: number;
  sales_value: number;
}

export interface GovernorateFilter {
  governorate_code: string;
  governorate_name: string;
  orders_count: number;
}

export interface AreaFilter {
  area_code: string;
  area_name: string;
  governorate_name: string;
  orders_count: number;
}

export interface Customer360Data {
  customer_id: number;
  customer_name: string;
  company_name: string;
  primary_salesperson: string;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  first_order_date: string;
  last_order_date: string;
  days_since_last_order: number;
  customer_status: string;
  median_days_between_orders: number;
  recent_30d_sales: number;
  previous_30d_sales: number;
  sales_change_pct: number | null;
}

export interface Product360Data {
  product_id: number;
  product_name: string;
  product_category: string;
  orders_count: number;
  customers_count: number;
  qty_sold: number;
  sales_value: number;
  avg_unit_value: number;
  last_order_date: string;
  first_order_date: string;
  daily_trend: { order_date: string; daily_sales: number; daily_orders: number; daily_qty: number }[];
  top_customers: { customer_id: number; customer_name: string; company_name: string; sales_value: number; orders_count: number }[];
  top_salespeople: { salesperson: string; company_name: string; sales_value: number; orders_count: number; customers_count: number }[];
  alerts: { alert_type: string; message: string; severity: string }[];
}

export interface DailyActionRow {
  action_rank: number;
  customer_id: number;
  customer_name: string;
  company_name: string;
  salesperson: string;
  priority: string;
  action_type: string;
  action_reason: string;
  risk: string;
  last_order_date: string;
  days_since_last_order: number;
  median_buying_interval: number;
  previous_30d_sales: number;
  recent_30d_sales: number;
  sales_change_pct: number | null;
  recovery_opportunity: number;
}

export interface ActionSummaryRow {
  total_actions: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  total_recovery: number;
}

export interface RecoveryPipelineRow {
  customer_id: number;
  customer_name: string;
  company_name: string;
  recovery_opportunity: number;
  risk: string;
  action_type: string;
  last_order_date: string;
  days_since_last_order: number;
}

// ── API Functions ──────────────────────────────────────────────

// Executive
export async function fetchExecutiveKpis(params: {
  start_date: string;
  end_date: string;
  company_name?: string;
  salesperson?: string;
}): Promise<ExecutiveKpis> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: ExecutiveKpis }>(`/executive/kpis${q}`);
  return res.data;
}

export async function fetchDailyTrend(params: {
  start_date: string;
  end_date: string;
  company_name?: string;
  salesperson?: string;
}): Promise<DailyTrendRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: DailyTrendRow[] }>(`/executive/daily-trend${q}`);
  return res.data;
}

export async function fetchTopCustomers(params: {
  start_date: string;
  end_date: string;
  company_name?: string;
  salesperson?: string;
  limit?: number;
}): Promise<TopCustomerRow[]> {
  const q = qs({ ...params, limit: params.limit ?? 20 });
  const res = await analyticsFetch<{ data: TopCustomerRow[] }>(`/top-customers${q}`);
  return res.data;
}

// Sales Reps
export async function fetchSalesRepSummary(params: {
  month: string;
  company_name?: string;
  salesperson?: string;
}): Promise<SalesRepSummaryRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: SalesRepSummaryRow[] }>(`/sales-reps/summary${q}`);
  return res.data;
}

export async function fetchSalesRepTrend(params: {
  start_month: string;
  end_month: string;
  company_name?: string;
  salesperson?: string;
}): Promise<SalesRepTrendRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: SalesRepTrendRow[] }>(`/sales-reps/trend${q}`);
  return res.data;
}

export async function fetchSalesRepCustomers(params: {
  month: string;
  company_name?: string;
  salesperson?: string;
  limit?: number;
}): Promise<SalesRepCustomerRow[]> {
  const q = qs({ ...params, limit: params.limit ?? 50 });
  const res = await analyticsFetch<{ data: SalesRepCustomerRow[] }>(`/sales-reps/customers${q}`);
  return res.data;
}

export async function fetchSalesRepRetentionDetails(params: {
  month: string;
  company_name?: string;
  salesperson?: string;
  status?: string;
  limit?: number;
}): Promise<RetentionDetailRow[]> {
  const q = qs({ ...params, limit: params.limit ?? 50 });
  const res = await analyticsFetch<{ data: RetentionDetailRow[] }>(`/sales-reps/retention-details${q}`);
  return res.data;
}

// Daily Action Center
export async function fetchDailyActions(params: {
  as_of_date?: string;
  salesperson?: string;
  company_name?: string;
  priority?: string;
  action_type?: string;
  risk?: string;
  search?: string;
  limit?: number;
}): Promise<DailyActionRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: DailyActionRow[] }>(`/sales-reps/daily-actions${q}`);
  return res.data;
}

export async function fetchActionSummary(params: {
  as_of_date?: string;
  salesperson?: string;
  company_name?: string;
}): Promise<ActionSummaryRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: ActionSummaryRow[] }>(`/sales-reps/action-summary${q}`);
  return res.data;
}

export async function fetchRecoveryPipeline(params: {
  as_of_date?: string;
  salesperson?: string;
  company_name?: string;
  limit?: number;
}): Promise<RecoveryPipelineRow[]> {
  const q = qs({ ...params, limit: params.limit ?? 20 });
  const res = await analyticsFetch<{ data: RecoveryPipelineRow[] }>(`/sales-reps/recovery-pipeline${q}`);
  return res.data;
}

// Customers
export async function fetchCustomerSummary(params: {
  start_date: string;
  end_date: string;
  company_name?: string;
  salesperson?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<CustomerSummaryRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: CustomerSummaryRow[] }>(`/customers/summary${q}`);
  return res.data;
}

export async function fetchCustomerOrders(params: {
  customer_id: number;
  start_date: string;
  end_date: string;
  company_name?: string;
  limit?: number;
}): Promise<CustomerOrderRow[]> {
  const q = qs({ ...params, limit: params.limit ?? 10 });
  const res = await analyticsFetch<{ data: CustomerOrderRow[] }>(`/customers/${params.customer_id}/orders${q}`);
  return res.data;
}

export async function fetchCustomerFavoriteProducts(params: {
  customer_id: number;
  start_date: string;
  end_date: string;
  company_name?: string;
  limit?: number;
}): Promise<FavoriteProductRow[]> {
  const q = qs({ ...params, limit: params.limit ?? 20 });
  const res = await analyticsFetch<{ data: FavoriteProductRow[] }>(`/customers/${params.customer_id}/favorite-products${q}`);
  return res.data;
}

export async function fetchCustomerActionCenter(params: {
  as_of_date?: string;
  company_name?: string;
  salesperson?: string;
  priority?: string;
  action_type?: string;
  risk?: string;
  search?: string;
  limit?: number;
}): Promise<ActionCenterRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: ActionCenterRow[] }>(`/customers/action-center${q}`);
  return res.data;
}

export async function fetchRetentionSummary(params: {
  month: string;
  company_name?: string;
  salesperson?: string;
}): Promise<RetentionSummaryRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: RetentionSummaryRow[] }>(`/customers/retention-summary${q}`);
  return res.data;
}

export async function fetchRetentionDetails(params: {
  month: string;
  company_name?: string;
  salesperson?: string;
  status?: string;
  limit?: number;
}): Promise<RetentionDetailRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: RetentionDetailRow[] }>(`/customers/retention-details${q}`);
  return res.data;
}

// Products
export async function fetchProductSummary(params: {
  start_date: string;
  end_date: string;
  company_name?: string;
  salesperson?: string;
  search?: string;
  limit?: number;
}): Promise<ProductSummaryRow[]> {
  const q = qs(params);
  const res = await analyticsFetch<{ data: ProductSummaryRow[] }>(`/products/summary${q}`);
  return res.data;
}

// Filters
export async function fetchFilterGovernorates(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<GovernorateFilter[]> {
  const q = qs(params ?? {});
  const res = await analyticsFetch<{ data: GovernorateFilter[] }>(`/filters/governorates${q}`);
  return res.data;
}

export async function fetchFilterAreas(params?: {
  start_date?: string;
  end_date?: string;
  governorate_code?: string;
}): Promise<AreaFilter[]> {
  const q = qs(params ?? {});
  const res = await analyticsFetch<{ data: AreaFilter[] }>(`/filters/areas${q}`);
  return res.data;
}

export async function fetchFilterCompanies(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<CompanyFilter[]> {
  const q = qs(params ?? {});
  const res = await analyticsFetch<{ data: CompanyFilter[] }>(`/filters/companies${q}`);
  return res.data;
}

export async function fetchFilterSalespeople(params?: {
  start_date?: string;
  end_date?: string;
  company_name?: string;
}): Promise<SalespersonFilter[]> {
  const q = qs(params ?? {});
  const res = await analyticsFetch<{ data: SalespersonFilter[] }>(`/filters/salespeople${q}`);
  return res.data;
}

export async function fetchFilterCustomers(params?: {
  start_date?: string;
  end_date?: string;
  company_name?: string;
  salesperson?: string;
  search?: string;
  limit?: number;
}): Promise<CustomerFilter[]> {
  const q = qs(params ?? {});
  const res = await analyticsFetch<{ data: CustomerFilter[] }>(`/filters/customers${q}`);
  return res.data;
}

export async function fetchFilterProducts(params?: {
  start_date?: string;
  end_date?: string;
  company_name?: string;
  search?: string;
  limit?: number;
}): Promise<ProductFilter[]> {
  const q = qs(params ?? {});
  const res = await analyticsFetch<{ data: ProductFilter[] }>(`/filters/products${q}`);
  return res.data;
}

export async function fetchFilterCustomerStatuses(params?: {
  as_of_date?: string;
  company_name?: string;
}): Promise<{ status: string; customer_count: number }[]> {
  const q = qs(params ?? {});
  const res = await analyticsFetch<{ data: { status: string; customer_count: number }[] }>(`/filters/customer-statuses${q}`);
  return res.data;
}


// ── Procurement Analytics ──────────────────────────────────────

export async function fetchProcurementKpis(): Promise<ProcurementKpis> {
  const res = await analyticsFetch<{ data: ProcurementKpis }>(`/procurement/kpis`);
  return res.data;
}

export async function fetchProcurementStockByCategory(): Promise<StockByCategory[]> {
  const res = await analyticsFetch<{ data: StockByCategory[] }>(`/procurement/stock-by-category`);
  return res.data;
}

export async function fetchProcurementSuppliers(): Promise<ProcurementSupplier[]> {
  const res = await analyticsFetch<{ data: ProcurementSupplier[] }>(`/procurement/suppliers`);
  return res.data;
}

export async function fetchProcurementReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const res = await analyticsFetch<{ data: ReorderSuggestion[] }>(`/procurement/reorder-suggestions`);
  return res.data;
}

// Procurement Types
export interface ProcurementKpis {
  total_products: number;
  products_with_stock: number;
  low_stock_products: number;
  out_of_stock_products: number;
  overstock_products: number;
  total_inventory_value: number;
  avg_days_cover: number;
  total_suppliers: number;
  products_needing_reorder: number;
}

export interface StockByCategory {
  category: string;
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  overstock: number;
  total_value: number;
}

export interface ProcurementSupplier {
  supplier_name: string;
  product_count: number;
  avg_cost: number;
  avg_lead_time: number;
  total_stock: number;
}

export interface ReorderSuggestion {
  product_id: string;
  external_product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  avg_daily_sales: number;
  days_cover: number | null;
  suggested_order_qty: number;
  priority: string;
  supplier_name: string;
  avg_cost: number;
  sales_price: number;
}

// Customer 360
export async function fetchCustomer360(params: {
  customer_id: number;
  start_date: string;
  end_date: string;
  company_name?: string;
  salesperson?: string;
}): Promise<Customer360Data> {
  const summary = await fetchCustomerSummary({ ...params, limit: 1 });
  const customer = summary.find(c => c.customer_id === params.customer_id);
  if (!customer) throw new Error("Customer not found");
  return {
    customer_id: customer.customer_id,
    customer_name: customer.customer_name,
    company_name: customer.company_name,
    primary_salesperson: customer.primary_salesperson,
    orders_count: customer.orders_count,
    sales_value: customer.sales_value,
    average_order_value: customer.average_order_value,
    first_order_date: customer.first_order_date,
    last_order_date: customer.last_order_date,
    days_since_last_order: customer.days_since_last_order,
    customer_status: customer.customer_status,
    median_days_between_orders: 0,
    recent_30d_sales: customer.sales_value,
    previous_30d_sales: customer.previous_period_sales,
    sales_change_pct: customer.sales_change_pct,
  };
}

// Product 360
export async function fetchProduct360(params: {
  product_id: number;
  start_date: string;
  end_date: string;
  company_name?: string;
}): Promise<Product360Data> {
  const summary = await fetchProductSummary({ ...params, limit: 1000 });
  const product = summary.find(p => p.product_id === params.product_id);
  if (!product) throw new Error("Product not found");

  const topCustomers = await analyticsFetch<{ data: Product360Data["top_customers"] }>(
    `/products/${params.product_id}/top-customers${qs({ ...params, limit: 10 })}`
  );

  return {
    product_id: product.product_id,
    product_name: product.product_name,
    product_category: product.product_category,
    orders_count: product.orders_count,
    customers_count: product.customers_count,
    qty_sold: product.qty_sold,
    sales_value: product.sales_value,
    avg_unit_value: product.avg_unit_value,
    last_order_date: product.last_order_date,
    first_order_date: "",
    daily_trend: [],
    top_customers: topCustomers.data,
    top_salespeople: [],
    alerts: [],
  };
}
