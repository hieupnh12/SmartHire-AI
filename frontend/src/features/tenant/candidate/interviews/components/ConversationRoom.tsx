import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Mic, Send, Square, Volume2, VolumeX, Sparkles, Keyboard, CheckCircle2, Compass, HeartHandshake, Lightbulb, Target, AlertTriangle, RefreshCw } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { interviewConversationApi, type Conversation, type ConversationMessage } from "@/api/tenant/interviewConversationApi";
import { getApiErrorMessage } from "@/lib/axios";
import { useConversationVoice } from "../hooks/useConversationVoice";
import { useCandidateInterviewScope } from "../hooks/useCandidateInterviews";

const turnSchema = z.string().trim().min(1, "Hãy nhập hoặc ghi âm câu trả lời.").max(10000, "Câu trả lời tối đa 10.000 ký tự.");

function cleanStreamingText(raw: string): string {
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<thought>[\s\S]*$/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<reasoning>[\s\S]*$/gi, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^(AI Interviewer|Interviewer|Assistant|AI|Trợ lý AI|Người phỏng vấn|面接官|AI面接官)\s*[:：\-]\s*/i, "")
    .replace(/^(Certainly|Sure|Alright|Okay|OK)[!.,]?\s*(Here (is|are) (the|your|a) (opening|first|next)?\s*(question|scenario|follow-up)[:.]?\s*)?/i, "")
    .replace(/^(Dưới đây là|Sau đây là)\s*(câu hỏi|lời chào|nội dung phỏng vấn)[^.?!:]*[:：.]\s*/i, "")
    .replace(/^(承知いたしました|かしこまりました|以下が質問です|それでは最初の質問です)[!！。、\s]*([:：]\s*)?/i, "")
    .replace(/^\*\*.*?\*\*[:：]?\s*/, "")
    .replace(/^(Okay|OK|Alright|So|Now|First|Looking at)[^.!?\n]*(mentioned|said|noted|used|focus|question|candidate|user)[^.!?\n]*[.!?\n]+\s*/i, "")
    .trimStart();

  let matched = false;
  do {
    matched = false;
    const before = cleaned;
    cleaned = cleaned
      .replace(/^(Hello|Hi|Greetings|Good (morning|afternoon|evening|day))[!.,]?\s*(and\s+)?(welcome (to (the|this|our|your)?\s*[^.!\n]*)?)?[!.,]?\s*/i, "")
      .replace(/^Welcome to (the|this|our|your)?\s*[^.!\n]*[!.,]\s*/i, "")
      .replace(/^(Let's (begin|start)( the interview)?|To (begin|start)( with)?)[!.,:]?\\s*/i, "")
      .replace(/^Thank you for (joining|participating in|attending)[^.!\n]*[!.,]\s*/i, "")
      .trimStart();
    if (cleaned !== before) matched = true;
  } while (matched && cleaned.length > 0);

  return cleaned || raw.trimStart();
}

export function ConversationRoom({ id, active, disabled, voiceEnabled, recordingEnabled, reportJson, status, onActivity }: {
  id: number; active: boolean; disabled: boolean; voiceEnabled: boolean; recordingEnabled: boolean;
  reportJson?: string | null; status?: string;
  onActivity: (busy: boolean, dirty: boolean) => void;
}) {
  const scope = useCandidateInterviewScope(); const key = [...scope, id, "conversation"];
  const client = useQueryClient();
  const session = useQuery({ queryKey: key, queryFn: () => interviewConversationApi.get(id), enabled: !!scope[2] });
  const { watch, setValue, reset, handleSubmit, formState: { errors } } = useForm<{ content: string }>({ defaultValues: { content: "" } });
  const draft = watch("content"); const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null); const [speaking, setSpeaking] = useState<number | null>(null);
  const [browserSpeech, setBrowserSpeech] = useState(false);
  const [pendingRecording, setPendingRecording] = useState<{ messageId: number; audio: Blob } | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [showTextFallback, setShowTextFallback] = useState(false);
  const baseDraftRef = useRef("");

  // In-memory audio Blob cache to prevent redundant HTTP requests / TTS calls
  const audioBlobCache = useRef<Map<number, Blob>>(new Map());

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
        if (content.trim() && active && !disabled && !send.isPending) {
          submit({ content: content.trim() });
        } else {
          setVoiceSubmission(content);
        }
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
    playbackRequest.current++;
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    if (audioUrl.current) { URL.revokeObjectURL(audioUrl.current); audioUrl.current = null; }
    setSpeaking(null);
    setBrowserSpeech(false);
  }

  function submit(value: { content: string }) {
    stopPlayback(); setError(null); send.mutate(value.content.trim());
  }

  function handleStopMic() {
    submitRecording.current = false;
    const current = (draft || liveTranscript || "").trim();
    voice.stop();
    if (current) {
      baseDraftRef.current = current;
      setValue("content", current, { shouldDirty: true, shouldValidate: true });
    }
  }

  function handleSendVoiceAnswer() {
    stopPlayback();
    const current = (draft || liveTranscript || "").trim();
    if (current && !send.isPending) {
      submitRecording.current = false;
      voice.stop();
      setValue("content", current, { shouldDirty: true, shouldValidate: true });
      submit({ content: current });
    } else {
      submitRecording.current = true;
      voice.stop();
    }
  }

  async function play(message: ConversationMessage) {
    if (speaking === message.id) {
      stopPlayback();
      return;
    }
    const request = ++playbackRequest.current;
    audio.current?.pause();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    window.speechSynthesis?.cancel();
    setSpeaking(message.id);
    setError(null);
    setBrowserSpeech(false);

    try {
      let blob = audioBlobCache.current.get(message.id);
      if (!blob) {
        blob = message.role === "ASSISTANT"
          ? await interviewConversationApi.speech(id, message.id)
          : await interviewConversationApi.recording(id, message.id);
        if (blob) {
          audioBlobCache.current.set(message.id, blob);
        }
      }
      if (request !== playbackRequest.current || !blob) return;
      const url = URL.createObjectURL(blob);
      audioUrl.current = url;
      const player = new Audio(url);
      audio.current = player;
      player.onended = () => {
        if (request === playbackRequest.current) {
          setSpeaking(null);
          URL.revokeObjectURL(url);
          audioUrl.current = null;
        }
      };
      player.onerror = () => {
        if (request === playbackRequest.current) {
          setSpeaking(null);
          setError("Không phát được bản ghi âm thanh. Vui lòng thử lại.");
        }
      };
      await player.play();
    } catch (failure) {
      if (request !== playbackRequest.current) return;
      if (failure instanceof Error && failure.name === "NotAllowedError") {
        setSpeaking(null);
        const resumeOnInteraction = () => {
          window.removeEventListener("click", resumeOnInteraction);
          window.removeEventListener("keydown", resumeOnInteraction);
          if (active && autoPlayVoice) {
            void play(message);
          }
        };
        window.addEventListener("click", resumeOnInteraction, { once: true });
        window.addEventListener("keydown", resumeOnInteraction, { once: true });
        return;
      }
      if (active && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
        const langCode = session.data?.language === "Vietnamese" ? "vi" : session.data?.language === "Japanese" ? "ja" : "en";
        const fullLang = session.data?.language === "Vietnamese" ? "vi-VN" : session.data?.language === "Japanese" ? "ja-JP" : "en-US";
        const voices = window.speechSynthesis.getVoices?.() ?? [];
        const matchedVoice = voices.find(v => v.lang.toLowerCase().replace("_", "-").startsWith(langCode));

        const cleanContent = cleanStreamingText(message.content);
        const utterance = new SpeechSynthesisUtterance(cleanContent || message.content);
        utterance.lang = fullLang;
        if (matchedVoice) utterance.voice = matchedVoice;
        utterance.onend = () => {
          if (request === playbackRequest.current) {
            setSpeaking(null);
            setBrowserSpeech(false);
          }
        };
        utterance.onerror = event => {
          if (request !== playbackRequest.current) return;
          setSpeaking(null);
          setBrowserSpeech(false);
          if (event.error !== "canceled" && event.error !== "interrupted") {
            setError("Không phát được giọng đọc. Bạn có thể thử lại hoặc nhập câu trả lời.");
          }
        };
        setBrowserSpeech(true);
        window.speechSynthesis.speak(utterance);
      } else {
        setError(getApiErrorMessage(failure));
        setSpeaking(null);
      }
    }
  }

  if (session.isPending) {
    return (
      <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-6" role="status" aria-busy="true">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-4">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-4 py-8 flex flex-col items-center">
          <Skeleton className="size-32 rounded-full" />
          <Skeleton className="h-6 w-64 rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-xl" />
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <span className="sr-only">Đang tải phòng phỏng vấn thoại…</span>
      </section>
    );
  }

  if (session.isError) {
    return (
      <div role="alert" className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700">
        <p className="mb-2 font-medium">{getApiErrorMessage(session.error)}</p>
        <Button onClick={() => void session.refetch()}>Tải lại phòng phỏng vấn</Button>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-6 shadow-[var(--shadow-card)]" aria-label="Phòng phỏng vấn AI">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
            <Bot className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-on-surface)]">SmartHire AI Interviewer</h2>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              {active ? "Phòng phỏng vấn thoại thông minh 1-1" : "Nhận xét & Lời khuyên sau phỏng vấn"}
            </p>
          </div>
        </div>

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
              <span>{autoPlayVoice ? "Tự động phát âm: Bật" : "Tự động phát âm: Tắt"}</span>
            </button>
          )}

          {speaking !== null && (
            <button
              type="button"
              onClick={stopPlayback}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              title="Dừng giọng đọc hiện tại"
            >
              <Square className="size-3" aria-hidden="true" />
              Dừng đọc
            </button>
          )}

          {active ? (
            <span className="rounded-full bg-[var(--color-surface-container)] px-3 py-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
              {session.data?.language ?? "Vietnamese"}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Đã hoàn thành phỏng vấn
            </span>
          )}
        </div>
      </div>

      {/* ACTIVE MODE: VOICE-FIRST INTERVIEW CALL STAGE (NO TEXT BUBBLES) */}
      {active ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[var(--color-border-default)] bg-gradient-to-b from-[var(--color-surface-card)] via-[var(--color-surface-container-lowest)] to-[var(--color-surface-container-low)] p-8 sm:p-12 text-center shadow-sm">
            {/* Visualizer Halo & Animated Waveform */}
            <div className="relative mb-6 flex items-center justify-center">
              <div
                className={`size-32 sm:size-40 rounded-full flex items-center justify-center transition-all duration-500 ${
                  speaking !== null
                    ? "bg-blue-500/10 ring-8 ring-blue-500/25 shadow-xl shadow-blue-500/20 scale-105"
                    : voice.status === "recording"
                    ? "bg-emerald-500/10 ring-8 ring-emerald-500/25 shadow-xl shadow-emerald-500/20 animate-pulse"
                    : send.isPending || partial
                    ? "bg-amber-500/10 ring-8 ring-amber-500/25 shadow-xl shadow-amber-500/20 animate-pulse"
                    : "bg-[var(--color-surface-container)] ring-4 ring-[var(--color-border-default)]"
                }`}
              >
                {speaking !== null ? (
                  /* Animated Waveform Equalizer when AI is speaking */
                  <div className="flex items-center justify-center gap-1.5 h-12" aria-label="AI đang phát âm thanh">
                    <span className="w-2 h-6 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-11 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-8 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:-0.4s]" />
                    <span className="w-2 h-12 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-2 h-7 bg-[var(--color-primary)] rounded-full animate-bounce [animation-delay:-0.35s]" />
                  </div>
                ) : voice.status === "recording" ? (
                  /* Pulsing mic when candidate is speaking */
                  <Mic className="size-14 text-emerald-600 animate-pulse" aria-hidden="true" />
                ) : send.isPending || partial ? (
                  /* Thinking sparkles when AI is processing */
                  <Sparkles className="size-14 text-amber-500 animate-spin" aria-hidden="true" />
                ) : (
                  /* Idle AI Persona icon */
                  <Bot className="size-14 text-[var(--color-primary)]" aria-hidden="true" />
                )}
              </div>

              {/* Status Badge */}
              {speaking !== null && (
                <span className="absolute -bottom-2 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-md">
                  <Volume2 className="size-3 animate-pulse" />
                  AI ĐANG NÓI
                </span>
              )}
              {voice.status === "recording" && (
                <span className="absolute -bottom-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-md animate-pulse">
                  <Mic className="size-3" />
                  ĐANG GHI ÂM
                </span>
              )}
              {(send.isPending || partial) && (
                <span className="absolute -bottom-2 inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-md">
                  <Sparkles className="size-3 animate-spin" />
                  AI ĐANG SUY NGHĨ
                </span>
              )}
            </div>

            {/* Dynamic Status Text */}
            <h3 className="text-lg font-bold text-[var(--color-on-surface)] sm:text-xl">
              {speaking !== null
                ? "Người phỏng vấn AI đang đặt câu hỏi..."
                : voice.status === "recording"
                ? "Đang lắng nghe câu trả lời của bạn..."
                : send.isPending || partial
                ? "AI đang lắng nghe và chuẩn bị phản hồi..."
                : session.data?.dialogueComplete
                ? "Phiên phỏng vấn đã hoàn tất câu hỏi"
                : "Sẵn sàng cho câu trả lời của bạn"}
            </h3>
            <p className="mt-1 max-w-md text-sm text-[var(--color-on-surface-variant)]">
              {speaking !== null
                ? "Hãy lắng nghe câu hỏi qua tai nghe hoặc loa của thiết bị."
                : voice.status === "recording"
                ? "Hãy nói rõ ràng, tự tin vào micro. Bấm 'Hoàn tất & Gửi' khi trả lời xong."
                : send.isPending || partial
                ? "Hệ thống đang xử lý và đánh giá câu trả lời của bạn..."
                : session.data?.dialogueComplete
                ? "Bạn đã hoàn thành đủ số lượt hỏi. Bấm nút Kết thúc để nộp toàn phiên."
                : "Bấm nút bắt đầu để trả lời trực tiếp bằng giọng nói."}
            </p>

            {/* Natural Repetition Tip */}
            <div className="mt-5 inline-flex max-w-lg items-center gap-2 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-4 py-2.5 text-xs text-blue-800 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <Sparkles className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>
                Chưa nghe rõ câu hỏi? Hãy nói vào micro: <strong>&ldquo;Bạn có thể nhắc lại câu hỏi giúp tôi không?&rdquo;</strong>. AI sẽ lặp lại câu hỏi tự nhiên mà không tính mất lượt phỏng vấn.
              </span>
            </div>

            {/* Live speech recognition preview if recording */}
            {voice.status === "recording" && (
              <div className="mt-6 w-full max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
                  </span>
                  <span>{voice.isRealtime ? "Giọng nói nhận diện trực tiếp:" : "Đang ghi âm câu trả lời:"}</span>
                </div>
                <p className="text-sm italic text-[var(--color-on-surface)] min-h-[1.5rem]">
                  {liveTranscript || draft || "Đang lắng nghe... hãy bắt đầu nói..."}
                </p>
              </div>
            )}

            {/* Action Voice Controls */}
            {!session.data?.dialogueComplete && (
              <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-md">
                {voice.status === "recording" ? (
                  <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleStopMic}
                      className="flex-1 min-w-[130px]"
                    >
                      <Square className="size-4 mr-1.5" aria-hidden="true" />
                      Tạm dừng
                    </Button>
                    <Button
                      type="button"
                      disabled={disabled || send.isPending}
                      onClick={handleSendVoiceAnswer}
                      className="flex-1 min-w-[170px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 shadow-md"
                    >
                      <Send className="size-4 mr-1.5" aria-hidden="true" />
                      {send.isPending ? "Đang gửi..." : "Hoàn tất & Gửi câu trả lời"}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy || disabled || !!pendingRecording}
                    onClick={() => {
                      stopPlayback();
                      submitRecording.current = false;
                      baseDraftRef.current = draft.trim();
                      setLiveTranscript("");
                      void voice.start();
                    }}
                    className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-[var(--color-primary)]/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Mic className="size-5 transition-transform group-hover:scale-110" aria-hidden="true" />
                    <span>Bắt đầu trả lời bằng giọng nói</span>
                  </button>
                )}

                {/* Keyboard Fallback Toggle */}
                <button
                  type="button"
                  onClick={() => setShowTextFallback(prev => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors underline-offset-4 hover:underline"
                >
                  <Keyboard className="size-3.5" aria-hidden="true" />
                  <span>{showTextFallback ? "Ẩn khung nhập văn bản dự phòng" : "Micro gặp sự cố? Bấm để nhập bằng bàn phím"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Fallback Form (Hidden by default, used when mic hardware fails) */}
          {showTextFallback && !session.data?.dialogueComplete && (
            <form onSubmit={handleSubmit(submit)} className="space-y-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 shadow-sm">
              <label htmlFor={`conversation-draft-${id}`} className="block text-sm font-medium">
                Nhập câu trả lời dự phòng (khi không dùng micro)
              </label>
              <textarea
                id={`conversation-draft-${id}`}
                value={draft}
                onChange={e => setValue("content", e.target.value, { shouldDirty: true, shouldValidate: true })}
                aria-invalid={!!errors.content}
                disabled={send.isPending || upload.isPending || disabled || !!pendingRecording}
                maxLength={10000}
                rows={4}
                placeholder="Nhập nội dung câu trả lời của bạn..."
                className="w-full resize-y rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-lowest)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[var(--color-on-surface-variant)]">
                  {draft.length}/10.000 ký tự
                </span>
                <Button type="submit" disabled={busy || disabled || !!pendingRecording || !draft.trim()}>
                  <Send className="size-4 mr-1.5" aria-hidden="true" />
                  {send.isPending ? "Đang gửi…" : "Gửi câu trả lời"}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* COMPLETED MODE: CANDIDATE POST-INTERVIEW ADVICE ONLY (NO CHAT BUBBLES, NO TURN COUNTS) */
        <PostInterviewAdviceView
          reportJson={reportJson}
          status={status}
          language={session.data?.language}
          onRefresh={() => void session.refetch()}
        />
      )}

      {/* System Status Indicators (Only displayed when active) */}
      {active && (
        <p role="status" aria-live="polite" className="text-sm text-[var(--color-on-surface-variant)]">
          {send.isPending
            ? "AI đang phản hồi…"
            : voice.status === "recording"
            ? "Đang ghi âm trực tiếp. Hãy nói rõ ràng câu trả lời của bạn."
            : voice.status === "transcribing"
            ? "Đang chuyển giọng nói thành văn bản…"
            : voice.status === "connecting"
            ? "Đang kết nối micro…"
            : session.data?.dialogueComplete
            ? "Hội thoại đã đủ lượt. Bấm Kết thúc để gửi toàn phiên đánh giá."
            : "Điểm và nhận xét được tổng hợp sau khi kết thúc phiên."}
        </p>
      )}

      {browserSpeech && (
        <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">
          Đang dùng giọng đọc của trình duyệt vì dịch vụ âm thanh tạm thời không khả dụng.
        </p>
      )}

      {(error || errors.content || voice.error || upload.error) && (
        <p id={`conversation-error-${id}`} role="alert" className="text-sm text-[var(--color-error)]">
          {error ?? errors.content?.message ?? voice.error ?? getApiErrorMessage(upload.error)}
        </p>
      )}

      {pendingRecording && !upload.isPending && (
        <Button onClick={() => upload.mutate(pendingRecording)}>Thử lưu lại bản ghi</Button>
      )}
    </section>
  );
}

type ParsedReport = {
  summary?: string;
  strengths?: string;
  weaknesses?: string;
  advice?: string;
  overallScore?: number;
  communicationCriteria?: Record<string, number>;
  criteriaEvidence?: Record<string, { messageId: number; quote: string }[]>;
};

function parseReport(raw?: string | null): ParsedReport | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedReport;
  } catch {
    return null;
  }
}

function PostInterviewAdviceView({
  reportJson,
  status,
  onRefresh,
}: {
  reportJson?: string | null;
  status?: string;
  language?: string;
  onRefresh?: () => void;
}) {
  const report = parseReport(reportJson);
  const hasAiFeedback = !!(report?.summary || report?.strengths || report?.weaknesses || report?.advice);
  const isScoring = status === "SCORING" || (!hasAiFeedback && status !== "ERROR");
  const isError = status === "ERROR";

  return (
    <div className="space-y-6 pt-1">
      {/* 1. Header Advice Banner */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-blue-50/90 p-5 sm:p-6 text-slate-800 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <Sparkles className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Nhận xét & Lời khuyên phát triển từ AI
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                <Bot className="size-3 text-blue-600" />
                SmartHire AI Insights
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Dựa trên nội dung các câu hỏi và câu trả lời trong buổi phỏng vấn trực tiếp, hệ thống AI đã phân tích chi tiết để đúc kết nhận xét khách quan và lời khuyên giúp bạn sửa chữa, hoàn thiện kỹ năng chuyên môn.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Feedback Content */}
      {hasAiFeedback ? (
        <div className="space-y-5">
          {/* A. LỜI KHUYÊN SỬA CHỮA & ĐỊNH HƯỚNG CẢI THIỆN (Actionable Advice - Highest Priority) */}
          <div className="rounded-2xl border-2 border-amber-200/90 bg-amber-50/60 p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2.5 text-amber-950">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800 shadow-xs">
                <Lightbulb className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-amber-950">
                  Lời khuyên sửa chữa & Hoàn thiện câu trả lời
                </h4>
                <p className="text-xs text-amber-800/80">
                  Đúc kết từ những thiếu sót trong các câu trả lời thực tế của bạn trong cuộc hội thoại
                </p>
              </div>
            </div>

            {/* Advice & Weaknesses blocks */}
            {report.advice ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-white/90 border border-amber-200 p-4">
                  <span className="block text-xs font-bold text-amber-950 mb-1.5 uppercase tracking-wide">
                    Hướng dẫn cải thiện câu trả lời:
                  </span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-medium">
                    {report.advice}
                  </p>
                </div>
                {report.weaknesses && (
                  <div className="rounded-xl bg-amber-100/60 border border-amber-200/80 p-3.5">
                    <span className="block text-xs font-bold text-amber-900 mb-1">
                      Điểm còn thiếu sót trong các câu trả lời:
                    </span>
                    <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-amber-900/90">
                      {report.weaknesses}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-white/90 border border-amber-200 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-medium">
                  {report.weaknesses || "Hãy tiếp tục trau dồi các kiến thức chuyên môn cốt lõi và rèn luyện cách diễn đạt câu trả lời đi thẳng vào giải pháp kỹ thuật cụ thể."}
                </p>
              </div>
            )}
          </div>

          {/* B. ĐIỂM MẠNH & TỔNG QUAN NĂNG LỰC */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Điểm mạnh */}
            <div className="rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/60 p-5 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-950">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-200/80 text-emerald-800">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-bold text-emerald-950">Điểm mạnh được ghi nhận</h4>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-900/95 font-medium">
                {report.strengths || "Thể hiện tinh thần hợp tác tốt, phản hồi tự tin và nắm được các khái niệm cơ bản liên quan đến vị trí ứng tuyển."}
              </p>
            </div>

            {/* Tổng quan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Compass className="size-4" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Tổng quan buổi phỏng vấn</h4>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {report.summary || "Buổi phỏng vấn đã được ghi nhận đầy đủ các câu hỏi và câu trả lời."}
              </p>
            </div>
          </div>

          {/* C. TIÊU CHÍ NĂNG LỰC CÙNG DẪN CHỨNG TRÍCH XUẤT */}
          {report.communicationCriteria && Object.keys(report.communicationCriteria).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Target className="size-4 text-blue-600" />
                  Đánh giá chi tiết 4 tiêu chí năng lực
                </h4>
                <span className="text-xs text-slate-500">Thang điểm 100</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(report.communicationCriteria).map(([criterion, score]) => {
                  const label = {
                    TECHNICAL_KNOWLEDGE: "Kiến thức chuyên môn",
                    PROBLEM_SOLVING: "Giải quyết vấn đề",
                    REASONING: "Tư duy & Lập luận",
                    COMMUNICATION: "Kỹ năng giao tiếp",
                  }[criterion] ?? criterion;
                  const evidences = report.criteriaEvidence?.[criterion] ?? [];

                  return (
                    <div key={criterion} className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{label}</span>
                        <span className={`rounded-md px-2 py-0.5 font-bold text-xs ${score >= 70 ? "bg-emerald-100 text-emerald-800" : score >= 50 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"}`}>
                          {score}/100
                        </span>
                      </div>
                      {/* Evidence quote if present */}
                      {evidences.length > 0 && (
                        <div className="rounded-lg bg-white border border-slate-200/70 p-2 text-[11px] text-slate-600 leading-snug">
                          <span className="font-semibold text-slate-700 block mb-0.5">Dẫn chứng từ câu trả lời:</span>
                          <span className="italic">“{evidences[0].quote}”</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : isScoring ? (
        /* Processing state when scoring is active */
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-6 sm:p-8 text-center space-y-3">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md animate-pulse">
            <Bot className="size-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">
            AI đang phân tích cuộc hội thoại phỏng vấn của bạn...
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Hệ thống đang đối chiếu từng câu trả lời trong buổi trao đổi với yêu cầu chuyên môn để đúc kết nhận xét và xây dựng lời khuyên sửa chữa chi tiết.
          </p>
          {onRefresh && (
            <div className="pt-2">
              <Button variant="secondary" onClick={onRefresh} className="text-xs gap-1.5">
                <RefreshCw className="size-3.5" />
                Kiểm tra kết quả ngay
              </Button>
            </div>
          )}
        </div>
      ) : isError ? (
        /* Error state */
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-5 sm:p-6 text-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <span>Chưa hoàn tất chấm điểm tự động</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Toàn bộ câu trả lời của bạn đã được niêm phong an toàn. Quá trình kết nối AI để tạo nhận xét đang gặp gián đoạn tạm thời. Nhà tuyển dụng có thể kích hoạt chấm lại để hệ thống gửi lời khuyên đến bạn.
          </p>
          {onRefresh && (
            <Button variant="secondary" onClick={onRefresh} className="text-xs gap-1.5">
              <RefreshCw className="size-3.5" />
              Thử tải lại kết quả
            </Button>
          )}
        </div>
      ) : null}

      {/* Encouragement Sign-off */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-slate-50/60 p-4 text-center">
        <p className="text-xs sm:text-sm text-slate-600 flex items-center justify-center gap-2 font-medium">
          <HeartHandshake className="size-4.5 text-rose-500" aria-hidden="true" />
          <span>SmartHire AI chúc bạn tự tin và đạt kết quả xuất sắc trên hành trình sự nghiệp!</span>
        </p>
      </div>
    </div>
  );
}
