import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Loader2, MessageSquare, User, Volume2 } from "lucide-react";
import { interviewConversationApi } from "@/api/tenant/interviewConversationApi";
import { getApiErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { Skeleton } from "@/components/ux/Skeleton";
import { cn } from "@/lib/utils";

export function useInterviewTranscript(interviewId: number, enabled = true) {
  const userId = useAuthStore(state => state.user?.id);
  return useQuery({
    queryKey: ["interview-conversation", getTenantIdFromWindow(), userId, interviewId],
    queryFn: () => interviewConversationApi.get(interviewId),
    enabled,
    refetchInterval: enabled ? 5000 : false,
  });
}

export function ConversationTranscript({
  interviewId,
  maxHeightClass = "max-h-[60vh]",
}: {
  interviewId: number;
  maxHeightClass?: string;
}) {
  const transcript = useInterviewTranscript(interviewId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  useEffect(() => () => {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
  }, []);

  async function play(messageId: number) {
    setLoading(messageId);
    setError(null);
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    try {
      url.current = URL.createObjectURL(await interviewConversationApi.recording(interviewId, messageId));
      audio.current = new Audio(url.current);
      await audio.current.play();
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs" aria-label="Transcript toàn phiên">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
            <MessageSquare className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Transcript hội thoại phỏng vấn
            </h3>
            <p className="text-xs text-slate-400">
              Toàn bộ diễn biến trao đổi giữa AI Interviewer và ứng viên theo thời gian thực.
            </p>
          </div>
        </div>
        {transcript.data && (
          <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--color-primary-hover)]">
            {transcript.data.candidateTurns}/{transcript.data.maxTurns} lượt trả lời
          </span>
        )}
      </div>

      {transcript.isPending && (
        <div className="space-y-3" role="status" aria-busy="true">
          <Skeleton className="h-16 w-3/4 rounded-xl" />
          <Skeleton className="ml-auto h-16 w-2/3 rounded-xl" />
          <Skeleton className="h-16 w-4/5 rounded-xl" />
          <span className="sr-only">Đang tải transcript…</span>
        </div>
      )}

      {(transcript.error || error) && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          {error ?? getApiErrorMessage(transcript.error)}
        </p>
      )}

      {transcript.data && transcript.data.messages.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
          Chưa có tin nhắn hội thoại nào trong phiên này.
        </p>
      )}

      <ol className={cn("space-y-3 overflow-y-auto pr-1", maxHeightClass)}>
        {transcript.data?.messages.map((message) => {
          const isUser = message.role === "USER";
          return (
            <li
              key={message.id}
              className={cn(
                "rounded-2xl p-4 text-xs transition-colors",
                isUser
                  ? "ml-4 border border-[var(--color-primary)]/25 bg-[var(--color-primary-subtle)]/70"
                  : "mr-4 border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40"
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  {isUser ? (
                    <>
                      <User className="size-3.5 text-[var(--color-primary)]" />
                      <span>Ứng viên</span>
                    </>
                  ) : (
                    <>
                      <Bot className="size-3.5 text-[var(--color-primary-hover)]" />
                      <span>AI Interviewer</span>
                    </>
                  )}
                  <span className="text-[10px] font-normal text-slate-400">· Tin #{message.id}</span>
                </span>
                {message.hasRecording && (
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => void play(message.id)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-subtle)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading === message.id ? (
                      <>
                        <Loader2 className="size-3 animate-spin text-[var(--color-primary)]" />
                        <span>Đang tải…</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="size-3 text-[var(--color-primary)]" />
                        <span>Nghe bản ghi</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {message.content}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
