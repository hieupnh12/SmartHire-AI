import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/tenant/authApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { workspaceOf } from "@/features/tenant/auth/workspace";
import type { Role, RoleWorkspace } from "@/types/api";

type Props = {
  roles?: Role[];
  workspaces?: RoleWorkspace[];
  /** Require login even when VITE_REQUIRE_AUTH=false (pages that only work with a real account). */
  authRequired?: boolean;
};

/**
 * Role gate. When VITE_REQUIRE_AUTH=false, allows browse for UI scaffolding
 * but still redirects if a logged-in user has the wrong role.
 */
export function RoleRoute({ roles, workspaces, authRequired = false }: Props) {
  const requireAuth = authRequired || import.meta.env.VITE_REQUIRE_AUTH === "true";
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const location = useLocation();
  const allowedWorkspaces = workspaces ?? [];
  const allowedRoles = roles ?? [];

  const meQuery = useQuery({
    queryKey: ["auth", "me", token],
    queryFn: async () => {
      const r = await authApi.me();
      if (!r.success || !r.data) throw new Error(r.message ?? "Auth failed");
      return r.data;
    },
    enabled: Boolean(token) && !user,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser]);

  if (requireAuth && !token) {
    const loginPath =
      allowedWorkspaces.includes("CANDIDATE") || allowedRoles.includes("CANDIDATE")
        ? "/login"
        : "/internal/login";
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  const effectiveUser = user ?? meQuery.data ?? null;

  if (effectiveUser) {
    const workspace = workspaceOf(effectiveUser.role, effectiveUser.workspace);
    const allowed =
      (allowedWorkspaces.length > 0 && allowedWorkspaces.includes(workspace)) ||
      (allowedRoles.length > 0 && allowedRoles.includes(effectiveUser.role));
    if (!allowed && (allowedWorkspaces.length > 0 || allowedRoles.length > 0)) {
      const home =
        workspace === "ADMIN" ? "/internal/admin" : workspace === "RECRUITER" ? "/recruiter" : "/career";
      return <Navigate to={home} replace />;
    }
  }

  return <Outlet />;
}
