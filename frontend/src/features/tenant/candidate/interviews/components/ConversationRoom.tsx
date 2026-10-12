import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Mic, Send, Square, Volume2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ux/Button";
import { interviewConversationApi, type Conversation, type ConversationMessage } from "@/api/tenant/interviewConversationApi";
import { getApiErrorMessage } from "@/lib/axios";
import { useConversationVoice } from "../hooks/useConversationVoice";
import { useCandidateInterviewScope } from "../hooks/useCandidateInterviews";

const turnSchema = z.string().trim().min(1, "Hãy nhập hoặc ghi âm câu trả lời.").max(10000, "Câu trả lời tối đa 10.000 ký tự.");
export function ConversationRoom({ id, active, disabled, voiceEnabled, recordingEnabled, onActivity }: {
  id: number; active: boolean; disabled: boolean; voiceEnabled: boolean; recordingEnabled: boolean;
  onActivity: (busy: boolean, dirty: boolean) => void;
}) {
  const scope = useCandidateInterviewScope(); const key = [...scope, id, "conversation"];
  const client = useQueryClient();
  const session = useQuery({ queryKey: key, queryFn: () => interviewConversationApi.get(id), enabled: !!scope[2] });
  const { register, watch, setValue, reset, handleSubmit, formState: { errors } } = useForm<{ content: string }>({ defaultValues: { content: "" } });
  const draft = watch("content"); const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null); const [speaking, setSpeaking] = useState<number | null>(null);
  const [pendingRecording, setPendingRecording] = useState<{ messageId: number; audio: Blob } | null>(null);
  const pendingRequest = useRef<{ requestId: string; content: string } | null>(null);
  const abort = useRef<AbortController | null>(null); const bottom = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null); const audioUrl = useRef<string | null>(null);
  const voice = useConversationVoice(id, text => setValue("content", draft.trim() ? `${draft}\n${text}` : text, { shouldDirty: true, shouldValidate: true }));
  const upload = useMutation({ mutationFn: ({ messageId, audio: recording }: { messageId: number; audio: Blob }) => interviewConversationApi.attach(id, messageId, recording),
    onSuccess: () => { setPendingRecording(null); voice.clear(); void client.invalidateQueries({ queryKey: key }); } });
  const send = useMutation({
    mutationFn: async (content: string) => {
      if (pendingRequest.current?.content !== content) pendingRequest.current = { requestId: crypto.randomUUID(), content };
      const request = pendingRequest.current; abort.current = new AbortController(); setPartial("");
      return interviewConversationApi.turn(id, request.requestId, content, abort.current.signal, text => setPartial(previous => previous + text));
    },
    onSuccess: (value: Conversation) => {
      client.setQueryData(key, value); reset(); setPartial(""); setError(null);
      if (recordingEnabled && voice.blob) {
        const message = value.messages.find(item => item.requestId === pendingRequest.current?.requestId);
        if (message) { const recording = { messageId: message.id, audio: voice.blob }; setPendingRecording(recording); upload.mutate(recording); }
      } else voice.clear();
      pendingRequest.current = null;
    },
    onError: failure => { setPartial(""); setError(failure instanceof Error ? failure.message : getApiErrorMessage(failure)); },
  });
  const busy = send.isPending || upload.isPending || voice.status !== "idle";
  useEffect(() => { onActivity(busy || !!pendingRecording, !!draft.trim()); }, [busy, pendingRecording, draft, onActivity]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [session.data?.messages.length, partial]);
  useEffect(() => () => { abort.current?.abort(); audio.current?.pause(); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); }, []);
  function submit(value: { content: string }) {
    setError(null); send.mutate(value.content.trim());
  }
  async function play(message: ConversationMessage) {
    audio.current?.pause(); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    setSpeaking(message.id); setError(null);
    try {
      const blob = active ? await interviewConversationApi.speech(id, message.id) : await interviewConversationApi.recording(id, message.id);
      const url = URL.createObjectURL(blob); audioUrl.current = url;
      const player = new Audio(url); audio.current = player;
      player.onended = () => { setSpeaking(null); URL.revokeObjectURL(url); audioUrl.current = null; };
      await player.play();
    } catch (failure) { setError(getApiErrorMessage(failure)); setSpeaking(null); }
  }
  if (session.isPending) return <p role="status">Đang tải hội thoại…</p>;
  if (session.isError) return <div role="alert"><p>{getApiErrorMessage(session.error)}</p><Button onClick={() => void session.refetch()}>Tải lại hội thoại</Button></div>;
  return <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-6" aria-label="Hội thoại phỏng vấn">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-semibold"><Bot className="size-5 text-[var(--color-primary)]" aria-hidden="true" />SmartHire AI Interviewer</h2>
      <p className="text-xs text-[var(--color-on-surface-variant)]">{session.data?.candidateTurns}/{session.data?.maxTurns} lượt · {session.data?.language}</p></div>
    <ol className="max-h-[55vh] space-y-4 overflow-y-auto p-1" aria-label="Lịch sử hội thoại">
      {session.data?.messages.map(message => <li key={message.id} className={`max-w-[95%] rounded-2xl p-4 sm:max-w-[85%] ${message.role === "USER" ? "ml-auto bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]" : "bg-[var(--color-surface-container-low)]"}`}>
        <p className="mb-1 text-xs font-semibold">{message.role === "USER" ? "Bạn" : "AI Interviewer"}</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
        {(active && voiceEnabled && message.role === "ASSISTANT" || !active && message.hasRecording) && <button type="button" disabled={speaking !== null || busy || disabled} onClick={() => void play(message)}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><Volume2 className="size-4" aria-hidden="true" />{speaking === message.id ? "Đang đọc…" : active ? "Nghe AI" : "Nghe bản ghi"}</button>}
      </li>)}
      {partial && <li className="max-w-[95%] rounded-2xl bg-[var(--color-surface-container-low)] p-4 sm:max-w-[85%]"><p className="text-xs font-semibold">AI đang phản hồi</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{partial}</p></li>}
      <li aria-hidden="true"><div ref={bottom} /></li>
    </ol>
    <p role="status" aria-live="polite" className="text-sm text-[var(--color-on-surface-variant)]">{send.isPending ? "AI đang phản hồi…" : voice.status === "recording" ? "Đang ghi âm. Bấm dừng khi trả lời xong." : voice.status === "transcribing" ? "Đang chuyển giọng nói thành văn bản…" : voice.status === "connecting" ? "Đang kết nối micro…" : session.data?.dialogueComplete && active ? "Hội thoại đã đủ lượt. Bấm Kết thúc để gửi toàn phiên đánh giá." : active ? "Điểm và nhận xét được tổng hợp sau khi kết thúc phiên." : "Phiên hội thoại đã kết thúc."}</p>
    {(error || errors.content || voice.error || upload.error) && <p id={`conversation-error-${id}`} role="alert" className="text-sm text-[var(--color-error)]">{error ?? errors.content?.message ?? voice.error ?? getApiErrorMessage(upload.error)}</p>}
    {pendingRecording && !upload.isPending && <Button onClick={() => upload.mutate(pendingRecording)}>Thử lưu lại bản ghi</Button>}
    {active && !session.data?.dialogueComplete && <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <label htmlFor={`conversation-draft-${id}`} className="block text-sm font-medium">Câu trả lời của bạn</label>
      <textarea id={`conversation-draft-${id}`} {...register("content", { validate: value => { const parsed = turnSchema.safeParse(value); return parsed.success || parsed.error.issues[0].message; } })}
        aria-invalid={!!errors.content} aria-describedby={errors.content ? `conversation-error-${id}` : undefined}
        disabled={busy || disabled || !!pendingRecording} maxLength={10000} rows={4}
        className="w-full resize-y rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-lowest)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-60" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[var(--color-on-surface-variant)]">{draft.length}/10.000 · Kiểm tra transcript trước khi gửi</span>
        <div className="flex flex-wrap gap-2">{voiceEnabled && (voice.status === "recording"
          ? <Button type="button" variant="secondary" onClick={voice.stop}><Square className="size-4" aria-hidden="true" />Dừng micro</Button>
          : <Button type="button" variant="secondary" disabled={busy || disabled || !!pendingRecording} onClick={() => void voice.start()}><Mic className="size-4" aria-hidden="true" />Trả lời bằng giọng nói</Button>)}
          <Button type="submit" disabled={busy || disabled || !!pendingRecording || !draft.trim()}><Send className="size-4" aria-hidden="true" />{send.isPending ? "Đang gửi…" : "Gửi câu trả lời"}</Button></div>
      </div>
    </form>}
  </section>;
}
