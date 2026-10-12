import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { interviewConversationApi } from "@/api/tenant/interviewConversationApi";
import { getApiErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { Button } from "@/components/ux/Button";

export function ConversationTranscript({ interviewId }: { interviewId: number }) {
  const userId = useAuthStore(state => state.user?.id);
  const transcript = useQuery({ queryKey: ["interview-conversation", getTenantIdFromWindow(), userId, interviewId], queryFn: () => interviewConversationApi.get(interviewId) });
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null); const url = useRef<string | null>(null);
  useEffect(() => () => { audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); }, []);
  async function play(messageId: number) {
    setLoading(messageId); setError(null); audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current);
    try {
      url.current = URL.createObjectURL(await interviewConversationApi.recording(interviewId, messageId));
      audio.current = new Audio(url.current); await audio.current.play();
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { setLoading(null); }
  }
  return <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5" aria-label="Transcript toàn phiên">
    <h3 className="font-semibold">Transcript hội thoại</h3>
    {transcript.isPending && <p role="status">Đang tải transcript…</p>}
    {(transcript.error || error) && <p role="alert">{error ?? getApiErrorMessage(transcript.error)}</p>}
    <ol className="max-h-[60vh] space-y-3 overflow-y-auto">{transcript.data?.messages.map(message => <li key={message.id} className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
      <p className="text-xs font-semibold">{message.role === "USER" ? "Ứng viên" : "AI Interviewer"} · Tin #{message.id}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
      {message.hasRecording && <Button variant="secondary" disabled={loading !== null} onClick={() => void play(message.id)}>{loading === message.id ? "Đang tải…" : "Nghe bản ghi"}</Button>}
    </li>)}</ol>
  </section>;
}
