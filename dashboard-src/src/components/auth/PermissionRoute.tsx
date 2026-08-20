import { Navigate, Outlet, useLocation } from "react-router";
import { useCurrentAccess } from "../../hooks/useCurrentAccess";
import type { AdminPermissionKey } from "../../lib/admin-access";

export default function PermissionRoute({
  anyOf,
  redirectTo = "/profile",
}: {
  anyOf: AdminPermissionKey[];
  redirectTo?: string;
}) {
  const { isLoading, hasAnyPermission } = useCurrentAccess();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!hasAnyPermission(anyOf)) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
