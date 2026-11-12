import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { PublicJob } from "@/api/types/job";

export type SavedJobView = {
  id: number;
  job: PublicJob;
  savedAt: string;
};

export const savedJobApi = {
  list: () =>
    api.get<ApiResponse<SavedJobView[]>>("/candidate/saved-jobs").then((r) => r.data.data),
  ids: () =>
    api.get<ApiResponse<number[]>>("/candidate/saved-jobs/ids").then((r) => r.data.data),
  save: (jobId: number) =>
    api.post<ApiResponse<SavedJobView>>(`/candidate/saved-jobs/${jobId}`).then((r) => r.data.data),
  remove: (jobId: number) =>
    api.delete<ApiResponse<null>>(`/candidate/saved-jobs/${jobId}`).then((r) => r.data),
};

