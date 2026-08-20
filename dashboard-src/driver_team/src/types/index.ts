export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'failed';

export interface DeliveryPlan {
  id: string;
  planReference: string | null;
  planStatus: string | null;
  plannedDate: string | null;
  startedAt: string | null;
  createdAt: string | null;
  shipments: Shipment[];
  totalShipments: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  districts: string[];
}

export interface ShipmentItem {
  id?: string;
  name: string | null;
  quantity: number | null;
  productRef?: string | null;
  requestedQuantity?: number | null;
  doneQuantity?: number | null;
  reservedQuantity?: number | null;
  forecastQuantity?: number | null;
  moveState?: string | null;
  preparationStatus?: 'pending' | 'ready' | 'partial' | 'unavailable' | null;
  approvedQuantity?: number | null;
  shortageReason?: string | null;
}

export interface ProofOfDelivery {
  photoUrl: string;
  timestamp: string;
  notes?: string;
}

export interface EventHistoryItem {
  action: string;
  timestamp: string;
  user: string | null;
  note?: string;
}

export interface ShipmentCollection {
  orderId: string | null;
  orderNumber: string | null;
  amount: number | null;
  pendingDeliveryAmount: number | null;
  collectedFromCustomer: number | null;
  collectedSuccessfullyAmount: number | null;
  collectionStatus: string | null;
  currencyCode: string | null;
  paymentTerm: string | null;
  paymentMethod: string | null;
  driverDebtAmount: number | null;
  accountingStatus: string | null;
}

export interface ShipmentOrder {
  orderId: string;
  orderNumber: string | null;
  orderTotal: number;
  paymentTerm: string | null;
}

export type CollectionPaymentMethod = 'cash' | 'credit' | 'cheque' | 'bank_transfer';

export interface SettlementBreakdown {
  cashDebt: number;
  transferAmount: number;
  chequeAmount: number;
  creditAmount: number;
  currencyCode: string;
}

export type CollectionCheckStatus = 'collected' | 'not_collected';
export type CollectionCheckReviewStatus = 'pending' | 'approved' | 'rejected';

export interface PlanCollectionCheck {
  shipmentId: string;
  planId: string;
  checkStatus: CollectionCheckStatus;
  paymentMethod: string | null;
  reason: string | null;
  driverNotes: string | null;
  proofPhotoUrl: string | null;
  salesRepId: string | null;
  reviewStatus: CollectionCheckReviewStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface OrderCollectionInput {
  orderId: string;
  orderNumber: string | null;
  orderTotal: number;
  paymentMethod: CollectionPaymentMethod;
  salesRepId?: string;
  salesRepName?: string;
  chequeReference?: string;
  driverNotes?: string;
}

export interface Shipment {
  id: string;
  planId?: string | null;
  shipmentIds?: string[];
  shipmentCount?: number;
  customerName: string | null;
  customerPhone: string | null;
  address: string | null;
  coordinates: { lat: number; lng: number } | null;
  items: ShipmentItem[];
  totalItems: number;
  skuCount?: number;
  totalQuantity?: number;
  status: ShipmentStatus;
  deliveryPhase?: string | null;
  notes: string | null;
  failureReason: string | null;
  failureNote: string | null;
  proofOfDelivery: ProofOfDelivery | null;
  eventHistory: EventHistoryItem[];
  warehouseOrigin: string | null;
  scheduledDate: string | null;
  priority: 'normal' | 'high';
  routeOrder: number | null;
  routeLocked?: boolean;
  operationType?: string | null;
  shipmentReference?: string | null;
  orderReference?: string | null;
  totalWeight?: number | null;
  collection?: ShipmentCollection | null;
  orders?: ShipmentOrder[];
}

export interface Driver {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  avatar?: string;
}

export interface Notification {
  id: string;
  type: 'delivery' | 'alert' | 'sync' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface OfflineAction {
  id: string;
  type: 'status_update' | 'note_added' | 'pod_uploaded' | 'failure_reported';
  shipmentId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}
