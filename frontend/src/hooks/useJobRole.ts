import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { parseJobRole, type JobRole } from "@/features/tenant/recruiter/jobPermissions";

/**
 * Returns the current user's job role for a specific job.
 *
 * Data source: `currentUserRole` field from the job detail API response.
 * The hook accepts a pre-fetched `currentUserRole` string (from the job detail query cache)
 * to avoid an extra network request.
 *
 * Usage:
 *   const { role, isAdmin } = useJobRole(job.currentUserRole, user?.role);
 *
 * - `role` is null  →  the user is an admin (bypass all checks) OR not yet loaded.
 * - `isAdmin` is true  →  the tenant user role is TENANT_ADMIN or ADMIN.
 */
export function useJobRole(
  /** Raw `currentUserRole` string from job detail response (null means admin on the server side). */
  currentUserRoleRaw: string | null | undefined,
  /** Tenant user role from auth store (e.g. "TENANT_ADMIN", "RECRUITER"). */
  tenantUserRole: string | null | undefined
): { role: JobRole | null; isAdmin: boolean } {
  const isAdmin =
    tenantUserRole === "TENANT_ADMIN" ||
    tenantUserRole === "ADMIN" ||
    tenantUserRole === "SUPER_ADMIN";

  const role = parseJobRole(currentUserRoleRaw);

  return { role, isAdmin };
}

/**
 * Convenience hook that reads the auth store internally.
 * Requires `currentUserRole` to be passed in (e.g. from a parent that already fetched job detail).
 */
export function useCurrentJobRole(currentUserRoleRaw: string | null | undefined): {
  role: JobRole | null;
  isAdmin: boolean;
} {
  const tenantUserRole = useAuthStore((s) => s.user?.role);
  return useJobRole(currentUserRoleRaw, tenantUserRole);
}
