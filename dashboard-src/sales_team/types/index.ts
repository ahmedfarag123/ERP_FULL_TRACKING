export type Customer = {
  id: string;
  external_customer_id?: string | null;
  customerid?: string;
  customer_name?: string | null;
  name?: string;
  phone_number?: string | null;
  phone?: string;
  customer_email?: string | null;
  customer_location?: string | null;
  google_maps_url?: string | null;
  whatsapp_number?: string | null;
  customer_type?: string | null;
  product_interests?: Json | null;
  governorate?: string | null;
  district?: string | null;
  place?: string | null;
  area?: string;
  address_line?: string | null;
  notes?: string | null;
  status?: string | null;
  priority?: string | null;
  size?: string | null;
  lat?: number | null;
  lng?: number | null;
  geofence_radius_meters?: number | null;
  assigned_user_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  last_visit_at?: string | null;
  lastVisitAt?: number;
  created_at?: string | null;
  updated_at?: string | null;
  customer_class?: string;
  distance?: number;
}

export type Visit = {
  id?: string;
  customer_id?: string | null;
  user_id?: string | null;
  linked_order_id?: string | null;
  visit_result?: string | null;
  visit_mode?: string | null;
  note?: string | null;
  override_reason?: string | null;
  captured_photo_path?: string | null;
  started_at?: string | null;
  checked_in_at?: string | null;
  completed_at?: string | null;
  lat?: number | null;
  lng?: number | null;
  customer_distance_meters?: number | null;
  within_geofence?: boolean | null;
  fraud_score?: number | null;
  fraud_status?: string | null;
  fraud_signals?: Json | null;
  source?: string | null;
  raw_payload?: Json | null;
  raw_form_payload?: Json | null;
  created_at?: string | null;
  updated_at?: string | null;
  customer_name?: string | null;
  name?: string;
}

export type Notification = { id?: string; [key: string]: any }

export type ActiveVisit = {
  customerId: string;
  customerName: string;
  startTime: number;
  startLat?: number;
  startLng?: number;
  stage: VisitStage;
  elapsed: number;
}

export type VisitStage = string
export type Call = import('../../supabase/types-generated').Tables<'calls'>
export type DashboardStats = Record<string, any>
export type DecisionMakerStatus = string
export type InterestLevel = string
export type NextAction = string
export type CustomerClass = "A" | "B" | "C" | "D" | "E"
export type UserRole = "admin" | "sales_team" | "manager" | "supervisor" | "telesales"
export type CallStatus = string
export type UserProfile = Record<string, any>
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from '../../supabase/types-generated'
export type Database = import('../../supabase/types-generated').Database
