import type { CodingContent, SampleResult } from "@/api/types/assessment";
import type { BankGenerationRequest, BankGenerationResponse } from "@/api/types/bankGeneration";
import { api } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import type { ApiResponse } from "@/types/api";
import type { BankQuestion, BankQuestionPage, BankQuestionQuery, BankQuestionRequest } from "@/api/types/questionBank";
import type { QuestionRequest } from "@/api/types/assessment";

export type QuestionBankGenerateRequest = {
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionType: "MCQ" | "MULTIPLE_CHOICE" | "ESSAY";
  count: number;
  topic?: string;
  language?: "vi" | "en";
  /** Job description / JD snippet for AI context. */
  context?: string;
};

export type StreamProgressEvent = {
  stage: "analyzing" | "generating" | "verifying" | "completed";
  message: string;
  step: number;
  progressPercent: number;
  currentQuestionIndex?: number;
};

export type StreamQuestionCreatedEvent = {
  question: QuestionRequest;
  authoringMetadata: Record<string, unknown> | null;
  index: number;
  total: number;
};

export type StreamCompletedEvent = {
  count: number;
  questions: BankQuestionRequest[];
};

export type StreamCallbacks = {
  onStarted?: (data: { count: number; skill: string; questionType: string }) => void;
  onProgress?: (event: StreamProgressEvent) => void;
  onQuestionCreated?: (event: StreamQuestionCreatedEvent) => void;
  onCompleted?: (event: StreamCompletedEvent) => void;
  onError?: (error: Error) => void;
};

export const questionBankApi = {
  /** Real-time SSE stream drafting questions one-by-one with progressive events. */
  generateStream: async (
    body: QuestionBankGenerateRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
  ): Promise<BankQuestionRequest[]> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
    const url = `${baseUrl}/question-bank/generate_stream`;

    const token = localStorage.getItem("accessToken");
    const tenantId = getTenantIdFromWindow();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (tenantId) headers["X-Tenant-ID"] = tenantId;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      let errMsg = `Server returned HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.message) errMsg = errJson.message;
      } catch {}
      throw new Error(errMsg);
    }

    if (!response.body) {
      throw new Error("No readable stream response from server");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalQuestions: BankQuestionRequest[] = [];

    try {
      streamLoop: while (true) {
        const { done, value } = await reader.read();
        if (done) break streamLoop;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;
          let eventName = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr += line.slice(5).trim();
            }
          }

          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (eventName === "generation_started") {
              callbacks.onStarted?.(parsed);
            } else if (eventName === "generation_progress") {
              callbacks.onProgress?.(parsed);
            } else if (eventName === "question_created") {
              callbacks.onQuestionCreated?.(parsed);
            } else if (eventName === "generation_completed") {
              finalQuestions = parsed.questions || [];
              callbacks.onCompleted?.(parsed);
              try {
                await reader.cancel();
              } catch {}
              break streamLoop;
            } else if (eventName === "generation_error") {
              throw new Error(parsed.message || "Lỗi sinh câu hỏi từ AI");
            }
          } catch (parseErr) {
            if (eventName === "generation_error") throw parseErr;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return finalQuestions;
  },
  /** Async generation used for CODING drafts (queue + poll). */
  generate: (body: BankGenerationRequest, signal?: AbortSignal) =>
    api.post<ApiResponse<BankGenerationResponse>>("/question-bank/generation", body, { signal }).then(response => response.data.data),
  generationStatus: (id: string, signal?: AbortSignal) =>
    api.get<ApiResponse<BankGenerationResponse>>(`/question-bank/generation/${id}`, { signal }).then(response => response.data.data),
  verifyCoding: (body: { coding?: CodingContent; language: string; source: string; questionId?: number }) => api.post<ApiResponse<SampleResult[]>>("/question-bank/verify_coding", body).then(response => response.data.data),
  generateDrafts: (body: QuestionBankGenerateRequest, signal?: AbortSignal) =>
    api.post<ApiResponse<BankQuestionRequest[]>>("/question-bank/generate_drafts", body, { signal, timeout: 180_000 }).then(response => response.data.data),
  list: (params: BankQuestionQuery, signal?: AbortSignal) => api.get<ApiResponse<BankQuestionPage>>("/question-bank/list_questions", {
    params,
    paramsSerializer: { indexes: null },
    signal,
  }).then(response => response.data.data),
  get: (id: number) => api.get<ApiResponse<BankQuestion>>(`/question-bank/get_question/${id}`).then(response => response.data.data),
  listAll: (signal?: AbortSignal) => api.get<ApiResponse<BankQuestionPage>>("/question-bank/list_questions", {
    params: { size: 100 },
    signal,
  }).then(response => response.data.data.items),
  create: (questions: BankQuestionRequest[]) =>
    api.post<ApiResponse<BankQuestion[]>>("/question-bank/create_questions", {
      questions: questions.map(sanitizeBankQuestionRequest),
    }).then(response => response.data.data),
  update: (id: number, body: BankQuestionRequest) =>
    api.put<ApiResponse<BankQuestion>>(`/question-bank/update_question/${id}`, sanitizeBankQuestionRequest(body)).then(response => response.data.data),
  archive: (questionIds: number[], archived = true) => api.put("/question-bank/archive_questions", { questionIds, archived }),
};

export function sanitizeAuthoringMetadata(meta: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object") return null;
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(meta)) {
    if (key === "similarQuestionIds") {
      // Ephemeral UI duplicate-warning list; omitted to keep persisted metadata clean
      continue;
    }
    if (val === null || val === undefined) continue;
    if (typeof val === "boolean") {
      clean[key] = String(val);
    } else if (typeof val === "number") {
      clean[key] = String(val);
    } else if (typeof val === "string") {
      clean[key] = val.slice(0, 10000);
    } else if (key === "rubric" && Array.isArray(val)) {
      clean[key] = val;
    }
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

export function sanitizeBankQuestionRequest(req: BankQuestionRequest): BankQuestionRequest {
  return {
    ...req,
    authoringMetadata: sanitizeAuthoringMetadata(req.authoringMetadata),
  };
}
