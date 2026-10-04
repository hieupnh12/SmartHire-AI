import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AiAnswer, AiInterview, SpeechCapture, SpeechMetrics } from "@/api/types/aiInterview";

export type CandidateInterview = AiInterview & { jobTitle: string | null };
export type ProctorEvent = {
  event: "FULLSCREEN_EXIT" | "PAGE_HIDDEN" | "WINDOW_BLUR" | "COPY_ATTEMPT" | "PASTE_ATTEMPT" | "CONTEXT_MENU" | "BLOCKED_SHORTCUT" | "CAMERA_LOST" | "MICROPHONE_LOST" | "SCREEN_SHARE_STOPPED" | "HEARTBEAT";
  detail?: string;
  durationSeconds?: number;
};

export const candidateInterviewApi = {
  mine: () => api.get<ApiResponse<CandidateInterview[]>>("/ai-interviews/me").then(r => r.data.data),
  get: (id: number) => api.get<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}`).then(r => r.data.data),
  start: (id: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}/start`, null, { timeout: 60000 }).then(r => r.data.data),
  complete: (id: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}/complete`).then(r => r.data.data),
  proctorEvent: (id: number, body: ProctorEvent) =>
    api.post<ApiResponse<void>>(`/ai-interviews/${id}/proctor-events`, body).then(r => r.data.data),
  requestStart: (applicationId: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/applications/${applicationId}/start`).then(r => r.data.data),
  consent: (id: number) => api.post(`/ai-interviews/${id}/voice/consent`, { accepted: true, policyVersion: "communication-voice-v1", userAgent: navigator.userAgent }),
  audioAnswer: (id: number, questionId: number, answerText: string, answerDuration: number, capture: SpeechCapture) => {
    const data = new FormData(); data.append("file", capture.blob, "answer.webm");
    data.append("answer", new Blob([JSON.stringify({ answerText, answerDuration, speechMetrics: capture.metrics })], { type: "application/json" }));
    return api.post<ApiResponse<AiAnswer>>(`/ai-interviews/${id}/questions/${questionId}/audio-answer`, data, { timeout: 180000 }).then(r => r.data.data);
  },
  answer: (id: number, questionId: number, answerText: string, answerDuration: number, speechMetrics?: SpeechMetrics) =>
    api.put<ApiResponse<AiAnswer>>(`/ai-interviews/${id}/questions/${questionId}/answer`, { answerText, answerDuration, speechMetrics }, { timeout: 180000 }).then(r => r.data.data),
};
