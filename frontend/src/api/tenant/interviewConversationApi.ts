import { api } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import type { ApiResponse } from "@/types/api";

export type ConversationMessage = { id: number; sequenceNo: number; role: "USER" | "ASSISTANT"; content: string; requestId: string | null; hasRecording: boolean; createdAt: string };
export type Conversation = { sessionId: number; candidateTurns: number; maxTurns: number; dialogueComplete: boolean; language: string; messages: ConversationMessage[] };
export type StreamEvent = { event: string; data: string };

export async function readConversationStream(reader: ReadableStreamDefaultReader<Uint8Array>, receive: (event: StreamEvent) => void) {
  const decoder = new TextDecoder(); let buffer = "";
  function drain() {
    let delimiter: RegExpExecArray | null;
    while ((delimiter = /\r?\n\r?\n/.exec(buffer))) {
      const block = buffer.slice(0, delimiter.index); buffer = buffer.slice(delimiter.index + delimiter[0].length);
      let event = "message"; const data: string[] = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length) receive({ event, data: data.join("\n") });
    }
  }
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) { buffer += decoder.decode(); drain(); break; }
      buffer += decoder.decode(result.value, { stream: true }); drain();
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
  finally { reader.releaseLock(); }
}

const path = (id: number) => `/ai-interviews/${id}/conversation`;
export const interviewConversationApi = {
  get: (id: number) => api.get<ApiResponse<Conversation>>(path(id)).then(response => response.data.data),
  ticket: (id: number) => api.post<ApiResponse<{ ticket: string }>>(`${path(id)}/voice-ticket`).then(response => response.data.data.ticket),
  speech: (id: number, messageId: number) => api.post<Blob>(`${path(id)}/messages/${messageId}/speech`, null, { responseType: "blob", timeout: 60000 }).then(response => response.data),
  recording: (id: number, messageId: number) => api.get<Blob>(`${path(id)}/messages/${messageId}/recording`, { responseType: "blob" }).then(response => response.data),
  attach: (id: number, messageId: number, audio: Blob) => {
    const body = new FormData(); body.append("file", audio, "answer.webm");
    return api.post(`${path(id)}/messages/${messageId}/recording`, body, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  },
  turn: async (id: number, requestId: string, content: string, signal: AbortSignal, onDelta: (text: string) => void) => {
    // This authenticated request also uses the existing token refresh interceptor before streaming.
    await interviewConversationApi.get(id);
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream" };
    const token = localStorage.getItem("accessToken"); if (token) headers.Authorization = `Bearer ${token}`;
    const tenant = getTenantIdFromWindow(); if (tenant) headers["X-Tenant-ID"] = tenant;
    const base = (api.defaults.baseURL ?? "/api/v1").replace(/\/$/, "");
    const response = await fetch(`${base}${path(id)}/turns`, { method: "POST", headers, body: JSON.stringify({ requestId, content }), signal });
    if (!response.ok || !response.body) throw new Error(`Không thể kết nối hội thoại (HTTP ${response.status}). Vui lòng thử lại.`);
    let completed: Conversation | undefined;
    await readConversationStream(response.body.getReader(), message => {
      if (message.event === "delta") onDelta((JSON.parse(message.data) as { text: string }).text);
      if (message.event === "done") completed = JSON.parse(message.data) as Conversation;
      if (message.event === "error") throw new Error((JSON.parse(message.data) as { message: string }).message);
    });
    if (!completed) throw new Error("Kết nối bị gián đoạn. Bấm gửi lại để khôi phục cùng lượt trả lời.");
    return completed;
  },
};

export function voiceSocketUrl(ticket: string) {
  const apiUrl = new URL(api.defaults.baseURL ?? "/api/v1", window.location.origin);
  const url = new URL("/ws/interview-voice", apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("ticket", ticket); return url.toString();
}
