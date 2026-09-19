import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { workspaceOf } from "@/features/tenant/auth/workspace";
import type { Role, RoleWorkspace } from "@/types/api";
import { Outlet } from "react-router-dom";

type Props = {
  roles?: Role[];
  workspaces?: RoleWorkspace[];
};

/**
 * Role gate. When VITE_REQUIRE_AUTH=false, allows browse for UI scaffolding
 * but still redirects if a logged-in user has the wrong role.
 */
export function RoleRoute({ roles, workspaces }: Props) {
  const requireAuth = import.meta.env.VITE_REQUIRE_AUTH === "true";
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const allowedWorkspaces = workspaces ?? [];
  const allowedRoles = roles ?? [];
  const needsAdminLogin = allowedWorkspaces.includes("ADMIN") || allowedRoles.includes("ADMIN") || allowedRoles.includes("TENANT_ADMIN");

  if (requireAuth && !token) {
    const loginPath = needsAdminLogin ? "/internal/login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (user) {
    const workspace = workspaceOf(user.role, user.workspace);
    const allowed =
      (allowedWorkspaces.length > 0 && allowedWorkspaces.includes(workspace)) ||
      (allowedRoles.length > 0 && allowedRoles.includes(user.role));
    if (!allowed && (allowedWorkspaces.length > 0 || allowedRoles.length > 0)) {
      const home =
        workspace === "ADMIN" ? "/internal/admin" : workspace === "RECRUITER" ? "/recruiter" : "/candidate";
      return <Navigate to={home} replace />;
    }
  }

  return <Outlet />;
}
