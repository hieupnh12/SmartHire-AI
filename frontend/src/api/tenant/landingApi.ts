import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  LandingPageConfig,
  LandingPageResponse,
  UpdateLandingPageRequest,
  UploadImageResponse,
} from "@/features/tenant/admin/landing/types/landing";

export const landingApi = {
  getPublicLanding: () =>
    api.get<ApiResponse<LandingPageConfig>>("/public/landing").then((r) => r.data),

  getAdminLandingPage: () =>
    api.get<ApiResponse<LandingPageResponse>>("/tenant/landing-page").then((r) => r.data),

  updateLandingPage: (body: UpdateLandingPageRequest) =>
    api.put<ApiResponse<LandingPageResponse>>("/tenant/landing-page", body).then((r) => r.data),

  resetLandingPage: () =>
    api.post<ApiResponse<LandingPageResponse>>("/tenant/landing-page/reset").then((r) => r.data),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post<ApiResponse<UploadImageResponse>>("/tenant/landing-page/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
