import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  AiFeedback,
  AiInterview,
  AiInterviewPage,
  AiInterviewStatus,
  AiInterviewLog,
  AiInterviewConfig,
  AiQuestion,
  AiQuestionRequest,
  CreateAiInterviewRequest,
  UpdateAiInterviewRequest,
  UpsertAiFeedbackRequest,
} from "@/api/types/aiInterview";

type ListParams = { applicationId?: number; status?: AiInterviewStatus; page?: number; size?: number };

export const aiInterviewApi = {
  recordingInfo: (id: number, answerId: number) => api.get<ApiResponse<{ answerId: number; durationSeconds: number; transcript: string; mimeType: string } | null>>(`/ai-interviews/${id}/answers/${answerId}/recording/info`).then(r => r.data.data),
  recordingAudio: (id: number, answerId: number) => api.get<Blob>(`/ai-interviews/${id}/answers/${answerId}/recording/audio`, { responseType: "blob" }).then(r => r.data),
  generate: (id: number) => api.post<ApiResponse<AiInterview>>(`/ai-interviews/${id}/questions/generate`).then(r => r.data.data),
  retryScore: (id: number) => api.post<ApiResponse<AiInterview>>(`/ai-interviews/${id}/score`).then(r => r.data.data),
  logs: (id: number) => api.get<ApiResponse<AiInterviewLog[]>>(`/ai-interviews/${id}/logs`).then(r => r.data.data),
  config: (jobId: number) => api.get<ApiResponse<AiInterviewConfig>>(`/jobs/${jobId}/ai-interview-config`).then(r => r.data.data),
  saveConfig: (jobId: number, body: AiInterviewConfig) => api.put<ApiResponse<AiInterviewConfig>>(`/jobs/${jobId}/ai-interview-config`, body).then(r => r.data.data),
  suggestRoadmap: (jobId: number, body: AiInterviewConfig) => api.post<ApiResponse<AiInterviewConfig>>(`/jobs/${jobId}/ai-interview-config/suggest-roadmap`, body).then(r => r.data.data),
  list: (params: ListParams = {}) =>
    api.get<ApiResponse<AiInterviewPage>>("/ai-interviews", { params }).then((r) => r.data.data),
  // Backend has no jobId filter yet, so pages are scanned and filtered client-side.
  listForJob: async (jobId: number) => {
    const items: AiInterview[] = [];
    let page = 0;
    let result: AiInterviewPage;
    do {
      result = await aiInterviewApi.list({ page, size: 50 });
      items.push(...result.items.filter((item) => item.jobId === jobId));
      page += 1;
    } while (result.items.length > 0 && page * result.size < result.total);
    return items;
  },
  get: (id: number) => api.get<ApiResponse<AiInterview>>(`/ai-interviews/${id}`).then((r) => r.data.data),
  create: (body: CreateAiInterviewRequest) =>
    api.post<ApiResponse<AiInterview>>("/ai-interviews", body).then((r) => r.data.data),
  update: (id: number, body: UpdateAiInterviewRequest) =>
    api.put<ApiResponse<AiInterview>>(`/ai-interviews/${id}`, body).then((r) => r.data.data),
  remove: (id: number) => api.delete(`/ai-interviews/${id}`),
  addQuestion: (id: number, body: AiQuestionRequest) =>
    api.post<ApiResponse<AiQuestion>>(`/ai-interviews/${id}/questions`, body).then((r) => r.data.data),
  updateQuestion: (id: number, questionId: number, body: AiQuestionRequest) =>
    api.put<ApiResponse<AiQuestion>>(`/ai-interviews/${id}/questions/${questionId}`, body).then((r) => r.data.data),
  deleteQuestion: (id: number, questionId: number) => api.delete(`/ai-interviews/${id}/questions/${questionId}`),
  upsertFeedback: (id: number, answerId: number, body: UpsertAiFeedbackRequest) =>
    api.put<ApiResponse<AiFeedback>>(`/ai-interviews/${id}/answers/${answerId}/feedback`, body).then((r) => r.data.data),
};
