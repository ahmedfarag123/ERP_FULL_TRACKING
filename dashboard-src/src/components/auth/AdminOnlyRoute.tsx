import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function AdminOnlyRoute() {
  const { profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (profile?.role !== "admin") {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
