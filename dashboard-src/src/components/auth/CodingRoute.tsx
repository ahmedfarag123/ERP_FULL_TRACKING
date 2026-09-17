import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

const CODING_EMAILS = ["ahmed-farag@hs.com", "maha-mohamed@hs.com", "shaimaa@hs.com"];

export default function CodingRoute() {
  const { authUser } = useAuth();
  const location = useLocation();

  const email = authUser?.email?.trim().toLowerCase() ?? "";
  if (!email || !CODING_EMAILS.includes(email)) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}