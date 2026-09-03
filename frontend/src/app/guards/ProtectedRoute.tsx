import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import type { Role } from "@/types/api";

type Props = {
  roles?: Role[];
};

/** Requires accessToken; optional role gate. */
export function ProtectedRoute({ roles }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
