import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AiAnswer, AiInterview } from "@/api/types/aiInterview";

export type CandidateInterview = AiInterview & { jobTitle: string | null };
export type ProctorEvent = {
  event: "FULLSCREEN_EXIT" | "PAGE_HIDDEN" | "WINDOW_BLUR" | "COPY_ATTEMPT" | "PASTE_ATTEMPT" | "CONTEXT_MENU" | "BLOCKED_SHORTCUT" | "CAMERA_LOST" | "MICROPHONE_LOST" | "SCREEN_SHARE_STOPPED" | "HEARTBEAT";
  detail?: string;
  durationSeconds?: number;
};

export const candidateInterviewApi = {
  mine: () => api.get<ApiResponse<CandidateInterview[]>>("/ai-interviews/me").then(r => r.data.data),
  get: (id: number) => api.get<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}`).then(r => r.data.data),
  start: (id: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}/start`).then(r => r.data.data),
  complete: (id: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}/complete`).then(r => r.data.data),
  proctorEvent: (id: number, body: ProctorEvent) =>
    api.post<ApiResponse<void>>(`/ai-interviews/${id}/proctor-events`, body).then(r => r.data.data),
  requestStart: (applicationId: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/applications/${applicationId}/start`).then(r => r.data.data),
  answer: (id: number, questionId: number, answerText: string, answerDuration: number) =>
    api.put<ApiResponse<AiAnswer>>(`/ai-interviews/${id}/questions/${questionId}/answer`, { answerText, answerDuration }).then(r => r.data.data),
};
