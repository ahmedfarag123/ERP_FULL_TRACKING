export type UserRole = 'dispatcher' | 'warehouse_supervisor' | 'warehouse_manager';

export type OrderPreparationStatus = 'pending' | 'preparing' | 'ready' | 'waiting_pickup' | 'handed_over' | 'cancelled';

export type ProductPreparationStatus = 'pending' | 'ready' | 'partial' | 'unavailable';

export type PlanPreparationStatus = 'pending' | 'preparing' | 'ready' | 'cancelled';

export type UnavailabilityReason = 'out_of_stock' | 'damaged' | 'expired' | 'customer_removal' | 'warehouse_issue' | 'wrong_product' | 'other';

export interface DispatcherUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  requires_password_change: boolean;
}

export type PlanBucket = 'active' | 'missed' | 'completed';

export type OverdueReason = 'driver' | 'dispatcher' | null;

export interface DispatcherPlan {
  id: string;
  plan_id: string;
  plan_reference: string | null;
  driver_name: string | null;
  planned_date: string | null;
  preparation_status: PlanPreparationStatus;
  total_items: number;
  confirmed_items: number;
  orders_count: number;
  has_shortages: boolean;
  plan_bucket: PlanBucket;
  overdue_reason: OverdueReason;
}

export interface DispatcherPlanItem {
  id: string;
  plan_preparation_id: string;
  plan_id: string;
  product_name: string;
  product_ref: string | null;
  product_code: string | null;
  external_product_id: string | null;
  product_id: string | null;
  dataset_id: string | null;
  total_requested_quantity: number;
  approved_quantity: number;
  preparation_status: ProductPreparationStatus;
  shortage_reason: UnavailabilityReason | null;
  note: string | null;
  barcode_scanned: boolean;
}

export interface DispatcherPlanOrder {
  order_id: string;
  odoo_order_name: string | null;
  customer_name: string | null;
  total_amount: number | null;
  currency_code: string | null;
  items_count: number;
}

export interface PrepOrder {
  id: string;
  external_order_id: string | null;
  odoo_order_name: string | null;
  customer_id: string;
  customer_name: string | null;
  status: string;
  total_amount: number | null;
  currency_code: string | null;
  order_date: string | null;
  preparation_status: OrderPreparationStatus;
  preparation_started_at: string | null;
  preparation_completed_at: string | null;
  preparation_duration_seconds: number | null;
  prepared_by_profile_id: string | null;
  prepared_by_name: string | null;
  po_number: string | null;
  items: PrepOrderItem[];
  item_count: number;
  confirmed_count: number;
  progress_percent: number;
}

export interface PrepOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  dataset_id: string | null;
  product_name: string | null;
  product_ref: string | null;
  product_code: string | null;
  external_product_id: string | null;
  ordered_quantity: number;
  confirmed_quantity: number;
  preparation_status: ProductPreparationStatus;
  barcode_scanned: boolean;
  unavailability_reason: UnavailabilityReason | null;
  note: string | null;
}

export interface Product {
  id: string;
  product_name: string | null;
  product_ref: string | null;
  product_code: string | null;
  category: string | null;
  unit: string | null;
  current_stock: number;
  image_url: string | null;
  barcodes: string[];
}

export interface ProductDataset {
  id: string;
  base_id: string;
  name: string;
  image_url: string | null;
  barcode: string | null;
  variants: string | null;
  measurments: string | null;
  'measurment value': number | null;
  search_keywords: string[];
  product_id: string | null;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_number: string | null;
  product_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
}

export interface ScannerResult {
  barcode: string;
  productId: string | null;
  datasetId: string | null;
  productName: string | null;
  imageUrl: string | null;
  price: number | null;
  stock: number | null;
  variants: string | null;
  baseId: string | null;
  matched: boolean;
  orderItemId: string | null;
}
