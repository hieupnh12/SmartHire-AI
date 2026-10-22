import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ux/Button";
import { interviewConversationApi, type Conversation, type ConversationMessage } from "@/api/tenant/interviewConversationApi";
import { getApiErrorMessage } from "@/lib/axios";
import { useConversationVoice } from "../hooks/useConversationVoice";
import { useCandidateInterviewScope } from "../hooks/useCandidateInterviews";

const turnSchema = z.string().trim().min(1, "Hãy nhập hoặc ghi âm câu trả lời.").max(10000, "Câu trả lời tối đa 10.000 ký tự.");

function cleanStreamingText(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^(AI Interviewer|Interviewer|Assistant|AI|Trợ lý AI|Người phỏng vấn|面接官|AI面接官)\s*[:：\-]\s*/i, "")
    .replace(/^(Certainly|Sure|Alright|Okay|OK)[!.,]?\s*(Here (is|are) (the|your|a) (opening|first|next)?\s*(question|scenario|follow-up)[:.]?\s*)?/i, "")
    .replace(/^(Dưới đây là|Sau đây là)\s*(câu hỏi|lời chào|nội dung phỏng vấn)[^.?!:]*[:：.]\s*/i, "")
    .replace(/^(承知いたしました|かしこまりました|以下が質問です|それでは最初の質問です)[!！。、\s]*([:：]\s*)?/i, "")
    .replace(/^\*\*.*?\*\*[:：]?\s*/, "")
    .trimStart();
}

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
  const [browserSpeech, setBrowserSpeech] = useState(false);
  const [pendingRecording, setPendingRecording] = useState<{ messageId: number; audio: Blob } | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const baseDraftRef = useRef("");

  const [autoPlayVoice, setAutoPlayVoice] = useState(() => {
    try {
      const saved = localStorage.getItem("smarthire_ai_interview_autoplay");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const pendingRequest = useRef<{ requestId: string; content: string } | null>(null);
  const abort = useRef<AbortController | null>(null); const bottom = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null); const audioUrl = useRef<string | null>(null);
  const playbackRequest = useRef(0);
  const lastRead = useRef<string | null>(null);
  const submitRecording = useRef(false);
  const [voiceSubmission, setVoiceSubmission] = useState<string | null>(null);

  const voice = useConversationVoice(
    id,
    text => {
      setLiveTranscript("");
      const base = baseDraftRef.current.trim();
      const content = base ? `${base} ${text}` : text;
      setValue("content", content, { shouldDirty: true, shouldValidate: true });
      if (submitRecording.current) {
        submitRecording.current = false;
        setVoiceSubmission(content);
      }
    },
    {
      language: session.data?.language,
      onInterim: interim => {
        setLiveTranscript(interim);
        const base = baseDraftRef.current.trim();
        const preview = base ? `${base} ${interim}` : interim;
        setValue("content", preview, { shouldDirty: true, shouldValidate: false });
      },
    }
  );

  const upload = useMutation({
    mutationFn: ({ messageId, audio: recording }: { messageId: number; audio: Blob }) => interviewConversationApi.attach(id, messageId, recording),
    onSuccess: () => { setPendingRecording(null); voice.clear(); void client.invalidateQueries({ queryKey: key }); }
  });

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
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [session.data?.messages.length, partial]);
  useEffect(() => () => { playbackRequest.current++; abort.current?.abort(); audio.current?.pause(); window.speechSynthesis?.cancel(); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); }, []);
  useEffect(() => { if (disabled || voice.status !== "idle") { playbackRequest.current++; audio.current?.pause(); window.speechSynthesis?.cancel(); setSpeaking(null); setBrowserSpeech(false); } }, [disabled, voice.status]);

  useEffect(() => {
    if (voice.status === "idle" && voice.error) submitRecording.current = false;
    if (voiceSubmission === null || voice.status !== "idle") return;
    setVoiceSubmission(null);
    if (!active || disabled || send.isPending || pendingRecording) return;
    const parsed = turnSchema.safeParse(voiceSubmission);
    if (parsed.success) send.mutate(parsed.data);
    else setError(parsed.error.issues[0].message);
  }, [voiceSubmission, voice.status, voice.error, active, disabled, send.isPending, pendingRecording]);

  useEffect(() => {
    const message = session.data?.messages.at(-1);
    if (!active || disabled || !voiceEnabled || !autoPlayVoice || busy || !message || message.role !== "ASSISTANT") return;
    const identity = `${id}:${message.id}`;
    if (lastRead.current === identity) return;
    lastRead.current = identity;
    void play(message);
  }, [id, session.data, active, disabled, voiceEnabled, autoPlayVoice, busy]);

  function toggleAutoPlay() {
    setAutoPlayVoice(prev => {
      const next = !prev;
      try { localStorage.setItem("smarthire_ai_interview_autoplay", String(next)); } catch {}
      if (!next) {
        stopPlayback();
      }
      return next;
    });
  }

  function stopPlayback() {
    playbackRequest.current++; audio.current?.pause(); window.speechSynthesis?.cancel();
    if (audioUrl.current) { URL.revokeObjectURL(audioUrl.current); audioUrl.current = null; }
    setSpeaking(null); setBrowserSpeech(false);
  }

  function submit(value: { content: string }) {
    stopPlayback(); setError(null); send.mutate(value.content.trim());
  }

  async function play(message: ConversationMessage) {
    if (speaking === message.id) {
      stopPlayback();
      return;
    }
    const request = ++playbackRequest.current;
    audio.current?.pause(); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    window.speechSynthesis?.cancel(); setSpeaking(message.id); setError(null); setBrowserSpeech(false);
    try {
      const blob = active ? await interviewConversationApi.speech(id, message.id) : await interviewConversationApi.recording(id, message.id);
      if (request !== playbackRequest.current) return;
      const url = URL.createObjectURL(blob); audioUrl.current = url;
      const player = new Audio(url); audio.current = player;
      player.onended = () => { setSpeaking(null); URL.revokeObjectURL(url); audioUrl.current = null; };
      player.onerror = () => { setSpeaking(null); setError("Không phát được bản ghi. Vui lòng thử lại."); };
      await player.play();
    } catch (failure) {
      if (request !== playbackRequest.current) return;
      if (active && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
        const langCode = session.data?.language === "Vietnamese" ? "vi" : session.data?.language === "Japanese" ? "ja" : "en";
        const fullLang = session.data?.language === "Vietnamese" ? "vi-VN" : session.data?.language === "Japanese" ? "ja-JP" : "en-US";
        const voices = window.speechSynthesis.getVoices?.() ?? [];
        const matchedVoice = voices.find(v => v.lang.toLowerCase().replace("_", "-").startsWith(langCode));

        if (!matchedVoice && langCode !== "en") {
          setSpeaking(null);
          setBrowserSpeech(false);
          const langLabel = session.data?.language === "Japanese" ? "tiếng Nhật" : "tiếng Việt";
          setError(`Trình duyệt chưa có gói giọng đọc ${langLabel}. Bạn vui lòng đọc nội dung câu hỏi trên màn hình.`);
          return;
        }

        const cleanContent = message.content
          .replace(/^#{1,6}\s+.*$/gm, "")
          .replace(/^(AI Interviewer|Interviewer|Assistant|AI|Trợ lý AI|Người phỏng vấn|面接官|AI面接官)\s*[:：\-]\s*/i, "")
          .replace(/^(Certainly|Sure|Alright|Okay|OK)[!.,]?\s*(Here (is|are) (the|your|a) (opening|first|next)?\s*(question|scenario|follow-up)[:.]?\s*)?/i, "")
          .replace(/^(Dưới đây là|Sau đây là)\s*(câu hỏi|lời chào|nội dung phỏng vấn)[^.?!:]*[:：.]\s*/i, "")
          .replace(/^(承知いたしました|かしこまりました|以下が質問です|それでは最初の質問です)[!！。、\s]*([:：]\s*)?/i, "")
          .replace(/\*\*/g, "")
          .trim();

        const utterance = new SpeechSynthesisUtterance(cleanContent || message.content);
        utterance.lang = fullLang;
        if (matchedVoice) utterance.voice = matchedVoice;
        utterance.onend = () => { if (request === playbackRequest.current) { setSpeaking(null); setBrowserSpeech(false); } };
        utterance.onerror = event => { if (request !== playbackRequest.current) return; setSpeaking(null); setBrowserSpeech(false); if (event.error !== "canceled" && event.error !== "interrupted") setError("Không phát được giọng đọc. Bạn có thể đọc nội dung câu hỏi và thử lại."); };
        setBrowserSpeech(true); window.speechSynthesis.speak(utterance);
      } else { setError(getApiErrorMessage(failure)); setSpeaking(null); }
    }
  }

  if (session.isPending) return <p role="status">Đang tải hội thoại…</p>;
  if (session.isError) return <div role="alert"><p>{getApiErrorMessage(session.error)}</p><Button onClick={() => void session.refetch()}>Tải lại hội thoại</Button></div>;

  return <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-6 shadow-[var(--shadow-card)]" aria-label="Hội thoại phỏng vấn">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <Bot className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
        SmartHire AI Interviewer
      </h2>
      <div className="flex flex-wrap items-center gap-2.5">
        {voiceEnabled && active && (
          <button
            type="button"
            onClick={toggleAutoPlay}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
              autoPlayVoice
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                : "border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]"
            }`}
            title={autoPlayVoice ? "Tắt tự động đọc câu hỏi bằng giọng nói AI" : "Bật tự động đọc câu hỏi bằng giọng nói AI"}
          >
            {autoPlayVoice ? <Volume2 className="size-3.5" aria-hidden="true" /> : <VolumeX className="size-3.5" aria-hidden="true" />}
            <span>{autoPlayVoice ? "Tự động đọc: Bật" : "Tự động đọc: Tắt"}</span>
          </button>
        )}
        {speaking !== null && (
          <button
            type="button"
            onClick={stopPlayback}
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            title="Dừng phát giọng đọc hiện tại"
          >
            <Square className="size-3" aria-hidden="true" />
            Dừng đọc
          </button>
        )}
        <p className="text-xs text-[var(--color-on-surface-variant)] font-medium">
          {session.data?.candidateTurns}/{session.data?.maxTurns} lượt · {session.data?.language}
        </p>
      </div>
    </div>

    <ol className="max-h-[55vh] space-y-4 overflow-y-auto p-1" aria-label="Lịch sử hội thoại">
      {session.data?.messages.map(message => <li key={message.id} className={`max-w-[95%] rounded-2xl p-4 sm:max-w-[85%] ${message.role === "USER" ? "ml-auto bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]" : "bg-[var(--color-surface-container-low)] border border-[var(--color-border-subtle)]"}`}>
        <p className="mb-1 text-xs font-semibold">{message.role === "USER" ? "Bạn" : "AI Interviewer"}</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
        {(active && voiceEnabled && message.role === "ASSISTANT" || !active && message.hasRecording) && (
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => void play(message)}
            className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] transition-colors"
          >
            {speaking === message.id ? <Square className="size-3.5 text-amber-600" aria-hidden="true" /> : <Volume2 className="size-3.5" aria-hidden="true" />}
            {speaking === message.id ? "Đang đọc (Bấm để dừng)" : active ? "Nghe AI đọc" : "Nghe bản ghi"}
          </button>
        )}
      </li>)}

      {partial && (
        <li className="max-w-[95%] rounded-2xl bg-[var(--color-surface-container-low)] p-4 sm:max-w-[85%] border border-[var(--color-primary-soft)] shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]"></span>
            </span>
            <p className="text-xs font-semibold text-[var(--color-primary)]">AI Interviewer đang trả lời…</p>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {cleanStreamingText(partial)}
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--color-primary)] animate-pulse align-middle" aria-hidden="true" />
          </p>
        </li>
      )}
      <li aria-hidden="true"><div ref={bottom} /></li>
    </ol>

    {voice.status === "recording" && (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)]/50 p-3 text-xs text-[var(--color-primary)]">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="font-semibold shrink-0">
            {voice.isRealtime ? "Đang nhận diện trực tiếp:" : "Đang ghi âm:"}
          </span>
          <span className="italic text-[var(--color-on-surface)] truncate">
            {liveTranscript || "Hãy nói câu trả lời của bạn vào microphone..."}
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={voice.stop}>
          <Square className="size-3.5" aria-hidden="true" />
          Dừng mic
        </Button>
      </div>
    )}

    <p role="status" aria-live="polite" className="text-sm text-[var(--color-on-surface-variant)]">
      {send.isPending ? "AI đang phản hồi…" : voice.status === "recording" ? "Đang ghi âm. Bạn có thể nói liên tục hoặc chỉnh sửa văn bản trước khi gửi." : voice.status === "transcribing" ? "Đang chuyển giọng nói thành văn bản…" : voice.status === "connecting" ? "Đang kết nối micro…" : session.data?.dialogueComplete && active ? "Hội thoại đã đủ lượt. Bấm Kết thúc để gửi toàn phiên đánh giá." : active ? "Điểm và nhận xét được tổng hợp sau khi kết thúc phiên." : "Phiên hội thoại đã kết thúc."}
    </p>

    {browserSpeech && <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">Đang dùng giọng đọc của trình duyệt vì dịch vụ âm thanh tạm thời không khả dụng.</p>}
    {(error || errors.content || voice.error || upload.error) && <p id={`conversation-error-${id}`} role="alert" className="text-sm text-[var(--color-error)]">{error ?? errors.content?.message ?? voice.error ?? getApiErrorMessage(upload.error)}</p>}
    {pendingRecording && !upload.isPending && <Button onClick={() => upload.mutate(pendingRecording)}>Thử lưu lại bản ghi</Button>}

    {active && !session.data?.dialogueComplete && <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <label htmlFor={`conversation-draft-${id}`} className="block text-sm font-medium">Câu trả lời của bạn</label>
      <textarea id={`conversation-draft-${id}`} {...register("content", { validate: value => { const parsed = turnSchema.safeParse(value); return parsed.success || parsed.error.issues[0].message; } })}
        aria-invalid={!!errors.content} aria-describedby={errors.content ? `conversation-error-${id}` : undefined}
        disabled={busy || disabled || !!pendingRecording} maxLength={10000} rows={4}
        placeholder="Nhập câu trả lời hoặc bấm 'Trả lời bằng giọng nói' để nói trực tiếp…"
        className="w-full resize-y rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-lowest)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-60" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[var(--color-on-surface-variant)]">{draft.length}/10.000 ký tự · Có thể chỉnh sửa văn bản trước khi gửi</span>
        <div className="flex flex-wrap gap-2">
          {voiceEnabled && (voice.status === "recording"
            ? <Button type="button" variant="secondary" onClick={voice.stop}><Square className="size-4" aria-hidden="true" />Dừng micro</Button>
            : <Button type="button" variant="secondary" disabled={busy || disabled || !!pendingRecording} onClick={() => { stopPlayback(); submitRecording.current = false; baseDraftRef.current = draft.trim(); setLiveTranscript(""); void voice.start(); }}><Mic className="size-4" aria-hidden="true" />Trả lời bằng giọng nói</Button>)}
          {voice.status === "recording" ? <Button type="button" disabled={disabled} onClick={() => { submitRecording.current = true; voice.stop(); }}><Send className="size-4" aria-hidden="true" />Gửi câu trả lời</Button> : <Button type="submit" disabled={busy || disabled || !!pendingRecording || !draft.trim()}><Send className="size-4" aria-hidden="true" />{send.isPending ? "Đang gửi…" : "Gửi câu trả lời"}</Button>}
        </div>
      </div>
    </form>}
  </section>;
}
