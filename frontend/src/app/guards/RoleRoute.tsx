import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/stores/authStore";
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
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && !roles.includes(user.role)) {
    const home =
      user.role === "ADMIN"
        ? "/admin"
        : user.role === "RECRUITER"
          ? "/recruiter"
          : "/candidate";
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}

/** After login — send user to role home. */
export function RoleHomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user.role === "RECRUITER") return <Navigate to="/recruiter" replace />;
  return <Navigate to="/candidate" replace />;
}
