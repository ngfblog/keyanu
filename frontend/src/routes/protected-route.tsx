import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/store/auth-context";
import { ForcePasswordChangePage } from "@/pages/force-password-change-page";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-base">
        <Loader2 className="h-6 w-6 animate-spin text-brass" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.must_change_password) {
    return <ForcePasswordChangePage />;
  }

  return <>{children}</>;
}
