import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export type JobAlertView = {
  id: number;
  keyword: string | null;
  department: string | null;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  webEnabled: boolean;
  emailEnabled: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveJobAlertRequest = {
  keyword?: string | null;
  department?: string | null;
  location?: string | null;
  workMode?: string | null;
  employmentType?: string | null;
  webEnabled?: boolean;
  emailEnabled?: boolean;
  active?: boolean;
};

export const jobAlertApi = {
  list: () =>
    api.get<ApiResponse<JobAlertView[]>>("/candidate/job-alerts").then((r) => r.data.data),
  create: (body: SaveJobAlertRequest) =>
    api.post<ApiResponse<JobAlertView>>("/candidate/job-alerts", body).then((r) => r.data.data),
  update: (id: number, body: SaveJobAlertRequest) =>
    api.put<ApiResponse<JobAlertView>>(`/candidate/job-alerts/${id}`, body).then((r) => r.data.data),
  remove: (id: number) =>
    api.delete<ApiResponse<null>>(`/candidate/job-alerts/${id}`).then((r) => r.data),
};

