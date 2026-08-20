import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-25 px-6 dark:bg-gray-950">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
    </div>
  );
}

export default function ForcePasswordChangeRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated, requiresPasswordChange } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!requiresPasswordChange) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
