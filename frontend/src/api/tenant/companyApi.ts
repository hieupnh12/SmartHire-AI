import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { CompanyDirectory, CompanyProfile, UpdateCompanyProfileRequest } from "@/features/tenant/admin/company/types";

export const companyApi = {
  getProfile: () =>
    api.get<ApiResponse<CompanyProfile>>("/tenant/company/profile").then((r) => r.data),
  updateProfile: (body: UpdateCompanyProfileRequest) =>
    api.put<ApiResponse<CompanyProfile>>("/tenant/company/profile", body).then((r) => r.data),
  getDirectory: () =>
    api.get<ApiResponse<CompanyDirectory>>("/tenant/company/directory").then((r) => r.data),
  updateDirectory: (body: CompanyDirectory) =>
    api.put<ApiResponse<CompanyDirectory>>("/tenant/company/directory", body).then((r) => r.data),
};
