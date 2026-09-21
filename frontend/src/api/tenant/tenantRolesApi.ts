import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export type TenantRole = {
  id: number;
  code: string;
  name: string;
  workspace: "ADMIN" | "RECRUITER" | "CANDIDATE";
  system: boolean;
  assignable: boolean;
  features: string[];
};

export type TenantRoleCatalog = {
  features: string[];
  roles: TenantRole[];
};

export const tenantRolesApi = {
  list: () => api.get<ApiResponse<TenantRoleCatalog>>("/tenant/roles").then((r) => r.data),
  create: (body: { name: string; features: string[] }) =>
    api.post<ApiResponse<TenantRole>>("/tenant/roles", body).then((r) => r.data),
  update: (id: number, body: { name?: string; features?: string[] }) =>
    api.put<ApiResponse<TenantRole>>(`/tenant/roles/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete<ApiResponse<null>>(`/tenant/roles/${id}`).then((r) => r.data),
};
