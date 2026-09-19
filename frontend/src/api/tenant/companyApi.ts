import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { CompanyProfile, UpdateCompanyProfileRequest } from "@/features/tenant/admin/company/types";

export const companyApi = {
  getProfile: () =>
    api.get<ApiResponse<CompanyProfile>>("/tenant/company/profile").then((r) => r.data),
  updateProfile: (body: UpdateCompanyProfileRequest) =>
    api.put<ApiResponse<CompanyProfile>>("/tenant/company/profile", body).then((r) => r.data),
};
