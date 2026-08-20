export type LegacyRole =
  | "admin"
  | "manager"
  | "spv"
  | "dispatcher"
  | "driver"
  | "supervisor"
  | "sales_agent"
  | "telesales"
  | "unknown";

export interface LegacyAdminUser {
  email: string;
  username: string;
  name: string;
  role: LegacyRole;
  status: "active" | "inactive" | "archived";
  forceLogout: boolean;
  isManagement: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface LegacyAdminTarget {
  email: string;
  name: string;
  role: LegacyRole;
  targetVisits: number;
  targetCalls: number;
  targetReachability: number;
  targetGmv: number;
  targetQuotations: number;
  workingDays: number;
}

export interface LegacyNotification {
  id: string;
  title: string;
  content: string;
  sender: string;
  importance: "High" | "Medium" | "Normal";
  timestamp: string;
  receivedUsers: string[];
}

export interface LegacyModalField {
  id: string;
  modalId: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  fieldOptions: string[];
  isRequired: boolean;
  isReadonly: boolean;
  placeholder: string;
  validation: string;
  order: number;
  roleRestriction: string;
}

export interface AdminAuditEntry {
  id: string;
  type: "visit" | "call" | "order";
  timestamp: string;
  actor: string;
  customerName: string;
  customerId: string;
  detail: string;
  status: string;
}

export interface AdminUserSummary {
  totalUsers: number;
  managementUsers: number;
  fieldUsers: number;
  forcedLogoutUsers: number;
}

export interface AdminTargetSummary {
  totalTargets: number;
  totalTargetCalls: number;
  totalTargetVisits: number;
  totalTargetQuotations: number;
}
