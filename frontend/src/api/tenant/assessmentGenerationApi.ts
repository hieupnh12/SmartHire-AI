import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AssessmentConfiguration } from "@/api/types/assessmentGeneration";
import type { JobTest } from "@/api/types/assessment";

export const assessmentGenerationApi = {
  status: (jobId: number) => api.get<ApiResponse<{ eligible: number; generated: number; pending: number; bankReady: boolean; bankError: string | null }>>(`/assessments/jobs/${jobId}/automation_status`).then(r => r.data.data),
  configuration: (jobId: number) => api.get<ApiResponse<AssessmentConfiguration | null>>(`/assessments/jobs/${jobId}/configuration`).then(r => r.data.data ?? null),
  save: (jobId: number, data: AssessmentConfiguration) => api.put<ApiResponse<AssessmentConfiguration>>(`/assessments/jobs/${jobId}/configuration`, data).then(r => r.data.data),
  generate: (jobId: number) => api.post<ApiResponse<JobTest>>(`/assessments/jobs/${jobId}/generate`).then(r => r.data.data),
};
