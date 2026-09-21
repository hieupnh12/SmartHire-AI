import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export type RolePermissionsMatrix = {
  assignableRoles: string[];
  features: string[];
  grants: Record<string, string[]>;
};

export const rolePermissionsApi = {
  get: () => api.get<ApiResponse<RolePermissionsMatrix>>("/tenant/role-permissions").then((r) => r.data),
  save: (grants: Record<string, string[]>) =>
    api.put<ApiResponse<RolePermissionsMatrix>>("/tenant/role-permissions", { grants }).then((r) => r.data),
};
