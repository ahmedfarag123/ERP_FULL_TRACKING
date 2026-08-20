// Page Type: D — Settings
// Purpose: Configure feature permissions for each system role
// Primary user action: Toggle permissions per role and save changes
// Data source: admin/access-control (roles + permissions matrix)

import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import UtilityPageLayout from "../../components/layout/UtilityPageLayout";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import PageHeader from "../../components/ui/PageHeader";
import Switch from "../../components/form/switch/Switch";
import { fetchPermissions, getRoleLabel, ROLE_ORDER, setRolePermissions } from "../../lib/access-control";
import type { ManagedRole, PermissionRecord } from "../../types/access-control";

type PermissionState = Record<ManagedRole, Set<string>>;

function buildPermissionState(permissions: PermissionRecord[]): PermissionState {
  return ROLE_ORDER.reduce((accumulator, role) => {
    accumulator[role] = new Set(
      permissions
        .filter((permission) => permission.assignedRoles.includes(role))
        .map((permission) => permission.permissionKey),
    );
    return accumulator;
  }, {} as PermissionState);
}

export default function AccessControlPage() {
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [permissionState, setPermissionState] = useState<PermissionState>(
    () => buildPermissionState([]),
  );
  const [selectedRole, setSelectedRole] = useState<ManagedRole>("admin");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const rows = await fetchPermissions();
      setPermissions(rows);
      setPermissionState(buildPermissionState(rows));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load permissions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, { moduleLabel: string; permissions: PermissionRecord[] }>();

    permissions.forEach((permission) => {
      const existing = groups.get(permission.moduleKey);
      if (existing) {
        existing.permissions.push(permission);
        return;
      }

      groups.set(permission.moduleKey, {
        moduleLabel: permission.moduleLabel,
        permissions: [permission],
      });
    });

    return Array.from(groups.entries()).map(([moduleKey, value]) => ({
      moduleKey,
      moduleLabel: value.moduleLabel,
      permissions: value.permissions.sort((left, right) => left.sortOrder - right.sortOrder),
    }));
  }, [permissions]);

  const togglePermission = (permissionKey: string, checked: boolean) => {
    setPermissionState((current) => {
      const next = new Set(current[selectedRole]);
      if (checked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }

      return {
        ...current,
        [selectedRole]: next,
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      await setRolePermissions(selectedRole, Array.from(permissionState[selectedRole] ?? []));
      setNotice(`${getRoleLabel(selectedRole)} permissions saved.`);
      await loadPermissions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Access Control | Sales Admin" description="Manage role permissions." />

      <AdminPageFrame>
        <UtilityPageLayout
          header={
            <PageHeader
              variant="list"
              eyebrow="ROLE GOVERNANCE"
              title="Access Control"
              subtitle="Review role coverage and enable or disable permissions for each role without leaving the settings workspace."
            />
          }
          notices={
            <>
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
              {notice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              ) : null}
            </>
          }
        >
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-wrap gap-2">
              {ROLE_ORDER.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    selectedRole === role
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-brand-25 dark:border-gray-700 dark:bg-transparent dark:text-gray-300"
                  }`}
                >
                  {getRoleLabel(role)}
                </button>
              ))}
            </div>
          </section>

          <div className="space-y-6 pb-24">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl bg-brand-25 dark:bg-white/[0.02]"
                />
              ))
            ) : (
              groupedPermissions.map((group) => (
                <section
                  key={group.moduleKey}
                  className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.02]"
                >
                  <div className="border-b border-gray-100 bg-brand-25 px-5 py-3 dark:border-gray-800 dark:bg-white/[0.04]">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{group.moduleLabel}</h2>
                    <p className="text-xs text-gray-400">الصلاحيات ضمن هذا القسم</p>
                  </div>
                  <div>
                    {group.permissions.map((permission) => {
                      const checked = permissionState[selectedRole]?.has(permission.permissionKey) ?? false;
                      return (
                        <div
                          key={permission.permissionKey}
                          className="flex flex-col gap-2 border-b border-gray-50 px-5 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{permission.label}</p>
                            <p className="mt-0.5 truncate text-xs text-gray-400">{permission.description}</p>
                          </div>
                          <Switch
                            key={`${selectedRole}-${permission.permissionKey}-${checked ? "on" : "off"}`}
                            label={checked ? "On" : "Off"}
                            defaultChecked={checked}
                            onChange={(nextValue) => togglePermission(permission.permissionKey, nextValue)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>

          <div className="fixed bottom-6 right-6 z-50">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isLoading}
              className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : `Save ${getRoleLabel(selectedRole)}`}
            </button>
          </div>
        </UtilityPageLayout>
      </AdminPageFrame>
    </>
  );
}
