import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import type { Role } from "@/types/api";
import { Outlet } from "react-router-dom";

type Props = {
  roles: Role[];
};

/**
 * Role gate. When VITE_REQUIRE_AUTH=false, allows browse for UI scaffolding
 * but still redirects if a logged-in user has the wrong role.
 */
export function RoleRoute({ roles }: Props) {
  const requireAuth = import.meta.env.VITE_REQUIRE_AUTH === "true";
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (requireAuth && !token) {
    const loginPath = roles.includes("ADMIN") || roles.includes("TENANT_ADMIN")
      ? "/internal/login"
      : "/login";
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (user && !roles.includes(user.role)) {
    const home =
      user.role === "ADMIN" || user.role === "TENANT_ADMIN"
        ? "/internal/admin"
        : user.role === "RECRUITER" || user.role === "HR"
          ? "/recruiter"
          : "/candidate";
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}

