import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLE_PERMISSION_ACCESS, type AdminPermissionKey } from "../lib/admin-access";
import { fetchUserAccessRecord } from "../lib/access-control";
import { useAuth } from "../context/AuthContext";
import type { ManagedRole, UserAccessRecord } from "../types/access-control";

interface UseCurrentAccessResult {
  accessRecord: UserAccessRecord | null;
  isLoading: boolean;
  error: string | null;
  permissionKeys: Set<AdminPermissionKey>;
  hasPermission: (permission: AdminPermissionKey) => boolean;
  hasAnyPermission: (permissions: AdminPermissionKey[]) => boolean;
}

const LEGACY_PERMISSION_COMPATIBILITY: Record<string, AdminPermissionKey[]> = {
  "dashboard.view": ["dashboard.view"],
  "orders.view": ["orders.view"],
  "orders.manage": ["orders.view", "orders.manage"],
  "customers.view": ["customers.view"],
  "customers.manage": ["customers.view", "customers.assign", "customers.manage"],
  "visits.view": ["visits.view", "visits.audit"],
  "calls.view": ["calls.view", "calls.audit"],
  "tickets.view": ["tickets.view"],
  "tickets.manage": ["tickets.view", "tickets.manage"],
  "users.view": ["users.view"],
  "users.manage": [
    "users.view",
    "users.invite",
    "users.role-change",
    "users.password-reset",
    "users.customer-assignment",
    "users.auth-controls",
  ],
  "roles.view": ["users.view"],
  "roles.manage": ["users.role-change"],
  "permissions.view": ["users.view"],
  "permissions.manage": ["users.role-change"],
};

const accessRecordCache = new Map<string, UserAccessRecord | null>();
const accessRecordRequestCache = new Map<string, Promise<UserAccessRecord | null>>();

function fetchUserAccessRecordCached(profileId: string): Promise<UserAccessRecord | null> {
  const cachedRequest = accessRecordRequestCache.get(profileId);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = fetchUserAccessRecord(profileId).finally(() => {
    if (accessRecordRequestCache.get(profileId) === request) {
      accessRecordRequestCache.delete(profileId);
    }
  });

  accessRecordRequestCache.set(profileId, request);
  return request;
}

function normalizeRole(role: string | null | undefined): ManagedRole | null {
  switch (String(role ?? "").trim().toLowerCase()) {
    case "admin":
    case "manager":
    case "spv":
    case "dispatcher":
    case "driver":
    case "supervisor":
    case "sales_agent":
    case "telesales":
      return String(role).trim().toLowerCase() as ManagedRole;
    default:
      return null;
  }
}

export function useCurrentAccess(): UseCurrentAccessResult {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const profileId = profile?.id ?? null;
  const cachedAccessRecord = profileId ? accessRecordCache.get(profileId) : undefined;
  const [accessRecord, setAccessRecord] = useState<UserAccessRecord | null>(() => cachedAccessRecord ?? null);
  const [isLoading, setIsLoading] = useState(() => Boolean(profileId && !accessRecordCache.has(profileId)));
  const [error, setError] = useState<string | null>(null);

  const loadAccess = useCallback(async () => {
    if (!profileId) {
      setAccessRecord(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (accessRecordCache.has(profileId)) {
      setAccessRecord(accessRecordCache.get(profileId) ?? null);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const record = await fetchUserAccessRecordCached(profileId);
      accessRecordCache.set(profileId, record);
      setAccessRecord(record);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load access state.");
      setAccessRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (isAuthLoading) return;
    void loadAccess();
  }, [isAuthLoading, loadAccess]);

  const permissionKeys = useMemo(() => {
    const resolvedPermissions = new Set<AdminPermissionKey>();

    // Layer 1: DB-resolved permissions
    if (accessRecord) {
      for (const permission of accessRecord.effectivePermissions) {
        const normalized =
          LEGACY_PERMISSION_COMPATIBILITY[permission.permissionKey] ??
          [permission.permissionKey as AdminPermissionKey];

        for (const key of normalized) {
          resolvedPermissions.add(key);
        }
      }
    }

    // Layer 2: Always merge static role permissions as baseline
    // This ensures new permission modules (like finance) are available
    // even before the DB migration is applied or if the DB query
    // returns permissions that don't include the latest module.
    const role = normalizeRole(accessRecord?.role ?? profile?.role);
    if (role) {
      for (const key of ROLE_PERMISSION_ACCESS[role]) {
        resolvedPermissions.add(key);
      }
    }

    return resolvedPermissions;
  }, [accessRecord, profile?.role]);

  const hasPermission = useCallback(
    (permission: AdminPermissionKey) => permissionKeys.has(permission),
    [permissionKeys],
  );

  const hasAnyPermission = useCallback(
    (permissions: AdminPermissionKey[]) => permissions.some((permission) => permissionKeys.has(permission)),
    [permissionKeys],
  );

  return {
    accessRecord,
    isLoading: isAuthLoading || isLoading,
    error,
    permissionKeys,
    hasPermission,
    hasAnyPermission,
  };
}
