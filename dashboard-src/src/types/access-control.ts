import type { LegacyRole } from "./admin-operations";

export type ManagedRole = Exclude<LegacyRole, "unknown">;
export type AccessRecordStatus = "active" | "inactive" | "archived";
export type PermissionRiskLevel = "low" | "medium" | "high" | "critical";

export interface DepartmentRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  costCenter: string;
  managerUserId: string | null;
  managerName: string;
  isActive: boolean;
  memberCount: number;
  allowedRoles: ManagedRole[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleDefinitionRecord {
  role: ManagedRole;
  label: string;
  description: string;
  defaultHomePath: string;
  isManagement: boolean;
  isAssignable: boolean;
  sortOrder: number;
  userCount: number;
}

export interface PermissionRecord {
  permissionKey: string;
  moduleKey: string;
  moduleLabel: string;
  label: string;
  description: string;
  routePath: string;
  riskLevel: PermissionRiskLevel;
  isNavigation: boolean;
  isActive: boolean;
  sortOrder: number;
  assignedRoles: ManagedRole[];
}

export interface UserAccessRecord {
  id: string;
  email: string;
  fullName: string;
  role: ManagedRole;
  status: AccessRecordStatus;
  departmentId: string | null;
  departmentName: string;
  jobTitle: string;
  phone: string;
  approvedAt: string;
  forceLogoutAt: string;
  passwordEnabled: boolean;
  otpEnabled: boolean;
  preferOtp: boolean;
  lastLoginAt: string;
  lastLoginMethod: string;
  createdAt: string;
  effectivePermissions: PermissionRecord[];
}

export interface UserAccessUpdateInput {
  userId: string;
  fullName?: string;
  role?: ManagedRole;
  status?: AccessRecordStatus;
  departmentId?: string | null;
  jobTitle?: string;
  phone?: string;
  passwordEnabled?: boolean;
  otpEnabled?: boolean;
  preferOtp?: boolean;
  approved?: boolean;
  forceUnlock?: boolean;
}

export interface CreateManagedUserInput {
  email: string;
  fullName: string;
  role: ManagedRole;
  status?: AccessRecordStatus;
  departmentId?: string | null;
  jobTitle?: string;
  phone?: string;
  initialPassword?: string;
  sendInvite?: boolean;
}

export interface CreateManagedUserResult {
  userId: string;
  email: string;
  invitationSent: boolean;
  temporaryPasswordSet: boolean;
}

export interface RecoveryLinkResult {
  actionLink: string;
}
