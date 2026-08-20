import type { ManagedRole } from "./access-control";

export type OdooActionStatus = "active" | "inactive";

export interface OdooActionRecord {
  id: string;
  actionKey: string;
  label: string;
  description: string;
  endpointPath: string;
  httpMethod: string;
  odooModel: string | null;
  odooMethod: string | null;
  serviceName: string;
  isActive: boolean;
  allowedRoles: ManagedRole[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OdooActionUpdateInput {
  id: string;
  isActive?: boolean;
  allowedRoles?: ManagedRole[];
}
