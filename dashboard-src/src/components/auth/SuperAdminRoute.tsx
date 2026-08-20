import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

const SUPER_ADMIN_EMAIL = "ahmed-farag@hs.com";

export default function SuperAdminRoute() {
  const { authUser } = useAuth();
  const location = useLocation();

  if (!authUser || authUser.email !== SUPER_ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
