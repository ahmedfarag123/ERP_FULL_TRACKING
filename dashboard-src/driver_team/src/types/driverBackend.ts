import type {
  LogisticsShipmentItemRecord,
  LogisticsShipmentRecord,
} from './logistics';
import type { ShipmentOrder } from './index';

export type DriverShipmentPhase =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'ready'
  | 'ready_for_pickup'
  | 'arrived_pickup'
  | 'check_in'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'arrived_delivery'
  | 'delivered'
  | 'finished'
  | 'settled'
  | 'attempted'
  | 'rescheduled'
  | 'failed'
  | 'cancelled';

export interface DriverProfile {
  profileId: string;
  logisticsUserId: string;
  employeeCode: string | null;
  name: string;
  email: string | null;
  workPhone: string | null;
  mobilePhone: string | null;
  jobTitle: string | null;
  workLocation: string | null;
  companyName: string | null;
  requiresPasswordChange: boolean;
}

export interface DriverNotification {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  deliveredAt: string | null;
  metadata: Record<string, unknown>;
}

export interface DriverShipmentEvent {
  id: string;
  shipment_id: string;
  actor_profile_id: string;
  previous_phase: string | null;
  next_phase: string;
  note: string | null;
  proof_photo_path: string | null;
  location_lat: number | string | null;
  location_lng: number | string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface DriverShipmentCollection {
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

export interface DriverShipmentCustomer {
  id: string;
  customer_name: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  address_line: string | null;
  district: string | null;
  governorate: string | null;
  place: string | null;
  google_maps_url: string | null;
  lat: number | null;
  lng: number | null;
}

export interface DriverShipment extends LogisticsShipmentRecord {
  customer?: DriverShipmentCustomer | null;
  collection?: DriverShipmentCollection | null;
  orders?: ShipmentOrder[];
}

export interface DriverShipmentDetail {
  shipment: DriverShipment;
  items: LogisticsShipmentItemRecord[];
  events: DriverShipmentEvent[];
  collection: DriverShipmentCollection | null;
}
