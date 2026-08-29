import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { SUPER_ADMIN_EMAILS } from "../../lib/admin-access";

export default function SuperAdminRoute() {
  const { authUser } = useAuth();
  const location = useLocation();

  const email = authUser?.email?.trim().toLowerCase() ?? "";
  if (!email || !SUPER_ADMIN_EMAILS.includes(email)) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
