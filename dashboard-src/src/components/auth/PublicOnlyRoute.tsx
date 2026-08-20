import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, requiresPasswordChange } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={requiresPasswordChange ? "/force-password-change" : "/"} replace />;
  }

  return <Outlet />;
}
