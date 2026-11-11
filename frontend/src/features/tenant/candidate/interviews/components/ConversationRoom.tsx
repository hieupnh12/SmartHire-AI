import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Mic, Send, Square, Volume2, VolumeX, Sparkles, Keyboard, Zap, RotateCcw } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { interviewConversationApi, type Conversation, type ConversationMessage } from "@/api/tenant/interviewConversationApi";
import { formatNumber, useLocale, useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { useConversationVoice } from "../hooks/useConversationVoice";
import { useCandidateInterviewScope } from "../hooks/useCandidateInterviews";
import { getBrowserVoices, resolveBestVoice, prepareCleanSpeechText } from "../utils/speechVoiceUtils";

function createTurnSchema(t: TranslateFn) {
  return z
    .string()
    .trim()
    .min(1, t("candidate.assess.interviews.conversation.validationRequired"))
    .max(10000, t("candidate.assess.interviews.conversation.validationMax"));
}

export function ConversationRoom({ id, active, disabled, voiceEnabled, recordingEnabled, reportJson: _reportJson, status: _status, onActivity, onComplete }: {
  id: number; active: boolean; disabled: boolean; voiceEnabled: boolean; recordingEnabled: boolean;
  reportJson?: string | null; status?: string;
  onActivity: (busy: boolean, dirty: boolean) => void;
  onComplete?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const turnSchema = useMemo(() => createTurnSchema(t), [t]);
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

  const [speechEngine, setSpeechEngine] = useState<"browser" | "cloud">(() => {
    try {
      const saved = localStorage.getItem("smarthire_ai_speech_engine");
      return saved === "cloud" || saved === "browser" ? saved : "browser";
    } catch {
      return "browser";
    }
  });

  // Pre-fetch browser voices when Web Speech API is ready
  useEffect(() => {
    void getBrowserVoices();
  }, []);

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
  }, [voiceSubmission, voice.status, voice.error, active, disabled, send.isPending, pendingRecording, turnSchema]);

  useEffect(() => {
    const message = session.data?.messages.at(-1);
    if (!active || disabled || !voiceEnabled || !autoPlayVoice || busy || !message || message.role !== "ASSISTANT") return;
    const identity = `${id}:${message.id}`;
    if (lastRead.current === identity) return;
    lastRead.current = identity;
    void play(message);
  }, [id, session.data, active, disabled, voiceEnabled, autoPlayVoice, busy]);

  const autoSubmittedRef = useRef(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  // Auto-complete session when candidate finishes all turns and AI wraps up
  useEffect(() => {
    if (!active || disabled || !session.data?.dialogueComplete || autoSubmittedRef.current) return;
    if (speaking !== null || busy || send.isPending || !!partial) return;

    autoSubmittedRef.current = true;
    setAutoSubmitting(true);
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1800);

    return () => clearTimeout(timer);
  }, [active, disabled, session.data?.dialogueComplete, speaking, busy, send.isPending, partial, onComplete]);

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

  async function playViaBrowser(message: ConversationMessage, request: number): Promise<boolean> {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      return false;
    }
    window.speechSynthesis.cancel();
    const voices = await getBrowserVoices();
    const resolved = resolveBestVoice(session.data?.language, voices);

    // CRITICAL: If target language is Vietnamese or Japanese, but the browser has NO voice
    // for that language, do NOT let English voice (Microsoft David) speak and spell out letter-by-letter.
    // Return false so the system gracefully falls back to Cloud TTS (Gemini API).
    if (!resolved.isNativeMatch && resolved.lang !== "en-US") {
      return false;
    }

    const cleanContent = prepareCleanSpeechText(message.content);
    if (!cleanContent) return false;

    const utterance = new SpeechSynthesisUtterance(cleanContent);
    utterance.lang = resolved.lang;
    if (resolved.voice) utterance.voice = resolved.voice;
    utterance.rate = resolved.rate;

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
      if (event.error === "not-allowed") {
        const resumeOnInteraction = () => {
          window.removeEventListener("click", resumeOnInteraction);
          window.removeEventListener("keydown", resumeOnInteraction);
          if (active && autoPlayVoice) {
            void play(message);
          }
        };
        window.addEventListener("click", resumeOnInteraction, { once: true });
        window.addEventListener("keydown", resumeOnInteraction, { once: true });
      } else if (event.error !== "canceled" && event.error !== "interrupted") {
        setError(t("candidate.assess.interviews.conversation.playbackVoiceError"));
      }
    };
    setBrowserSpeech(true);
    window.speechSynthesis.speak(utterance);
    return true;
  }

  async function playViaCloud(message: ConversationMessage, request: number) {
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
        setError(t("candidate.assess.interviews.conversation.playbackAudioError"));
      }
    };
    await player.play();
  }

  async function play(message: ConversationMessage, forceEngine?: "browser" | "cloud") {
    if (speaking === message.id) {
      stopPlayback();
      return;
    }
    const request = ++playbackRequest.current;
    audio.current?.pause();
    if (audioUrl.current) {
      URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(message.id);
    setError(null);
    setBrowserSpeech(false);

    const engine = forceEngine || speechEngine;

    // Candidate's own recorded answer (USER role) is always played from audio blob
    if (message.role === "USER") {
      try {
        await playViaCloud(message, request);
      } catch (failure) {
        if (request === playbackRequest.current) {
          setError(getApiErrorMessage(failure));
          setSpeaking(null);
        }
      }
      return;
    }

    // ASSISTANT role (AI question / greeting):
    // 1. If engine is "browser", run Web Speech API immediately (< 50ms, zero network delay)
    if (engine === "browser") {
      const started = await playViaBrowser(message, request);
      if (started) return;
      // Fall through to cloud if browser speech is unavailable or lacks a native voice for this language
    }

    // 2. Play via Cloud TTS (Gemini via backend)
    try {
      await playViaCloud(message, request);
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
      // If cloud fails, fallback to browser speech
      const fallbackSuccess = await playViaBrowser(message, request);
      if (!fallbackSuccess) {
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
        <span className="sr-only">{t("candidate.assess.interviews.conversation.loadingLabel")}</span>
      </section>
    );
  }

  if (session.isError) {
    return (
      <div role="alert" className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700">
        <p className="mb-2 font-medium">{getApiErrorMessage(session.error)}</p>
        <Button onClick={() => void session.refetch()}>{t("candidate.assess.interviews.conversation.reloadRoom")}</Button>
      </div>
    );
  }

  if (!active) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-6 shadow-[var(--shadow-card)]" aria-label={t("candidate.assess.interviews.conversation.roomAriaLabel")}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
            <Bot className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-on-surface)]">{t("candidate.assess.interviews.conversation.interviewerName")}</h2>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              {t("candidate.assess.interviews.conversation.roomSubtitle")}
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
              title={autoPlayVoice ? t("candidate.assess.interviews.conversation.autoPlayDisableTitle") : t("candidate.assess.interviews.conversation.autoPlayEnableTitle")}
            >
              {autoPlayVoice ? <Volume2 className="size-3.5" aria-hidden="true" /> : <VolumeX className="size-3.5" aria-hidden="true" />}
              <span>{autoPlayVoice ? t("candidate.assess.interviews.conversation.autoPlayOn") : t("candidate.assess.interviews.conversation.autoPlayOff")}</span>
            </button>
          )}

          {voiceEnabled && active && (
            <button
              type="button"
              onClick={() => {
                const next = speechEngine === "browser" ? "cloud" : "browser";
                setSpeechEngine(next);
                try { localStorage.setItem("smarthire_ai_speech_engine", next); } catch {}
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                speechEngine === "browser"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
              }`}
              title={t("candidate.assess.interviews.conversation.speechEngineTitle")}
            >
              <Zap className="size-3.5" aria-hidden="true" />
              <span>{speechEngine === "browser" ? t("candidate.assess.interviews.conversation.speechEngineBrowser") : t("candidate.assess.interviews.conversation.speechEngineCloud")}</span>
            </button>
          )}

          {active && session.data?.messages.some(m => m.role === "ASSISTANT") && (
            <button
              type="button"
              onClick={() => {
                const lastMsg = [...(session.data?.messages ?? [])].reverse().find(m => m.role === "ASSISTANT");
                if (lastMsg) void play(lastMsg);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors cursor-pointer"
              title={t("candidate.assess.interviews.conversation.replayTitle")}
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>{t("candidate.assess.interviews.conversation.replayButton")}</span>
            </button>
          )}

          {speaking !== null && (
            <button
              type="button"
              onClick={stopPlayback}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              title={t("candidate.assess.interviews.conversation.stopSpeechTitle")}
            >
              <Square className="size-3" aria-hidden="true" />
              {t("candidate.assess.interviews.conversation.stopSpeechButton")}
            </button>
          )}

          <span className="rounded-full bg-[var(--color-surface-container)] px-3 py-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
            {session.data?.language ?? t("candidate.assess.interviews.conversation.defaultLanguage")}
          </span>
        </div>
      </div>

      {/* VOICE-FIRST INTERVIEW CALL STAGE (NO TEXT BUBBLES) */}
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
                  <div className="flex items-center justify-center gap-1.5 h-12" aria-label={t("candidate.assess.interviews.conversation.waveformAria")}>
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
                  {t("candidate.assess.interviews.conversation.badgeAiSpeaking")}
                </span>
              )}
              {voice.status === "recording" && (
                <span className="absolute -bottom-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-md animate-pulse">
                  <Mic className="size-3" />
                  {t("candidate.assess.interviews.conversation.badgeRecording")}
                </span>
              )}
              {(send.isPending || partial) && (
                <span className="absolute -bottom-2 inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-md">
                  <Sparkles className="size-3 animate-spin" />
                  {t("candidate.assess.interviews.conversation.badgeAiThinking")}
                </span>
              )}
            </div>

            {/* Dynamic Status Text */}
            <h3 className="text-lg font-bold text-[var(--color-on-surface)] sm:text-xl">
              {speaking !== null
                ? t("candidate.assess.interviews.conversation.statusHeadingAiSpeaking")
                : voice.status === "recording"
                ? t("candidate.assess.interviews.conversation.statusHeadingRecording")
                : send.isPending || partial
                ? t("candidate.assess.interviews.conversation.statusHeadingThinking")
                : session.data?.dialogueComplete
                ? t("candidate.assess.interviews.conversation.statusHeadingComplete")
                : t("candidate.assess.interviews.conversation.statusHeadingReady")}
            </h3>
            <p className="mt-1 max-w-md text-sm text-[var(--color-on-surface-variant)]">
              {speaking !== null
                ? t("candidate.assess.interviews.conversation.statusDescAiSpeaking")
                : voice.status === "recording"
                ? t("candidate.assess.interviews.conversation.statusDescRecording")
                : send.isPending || partial
                ? t("candidate.assess.interviews.conversation.statusDescThinking")
                : session.data?.dialogueComplete
                ? (speaking !== null
                    ? t("candidate.assess.interviews.conversation.statusDescCompleteSpeaking")
                    : autoSubmitting
                    ? t("candidate.assess.interviews.conversation.statusDescCompleteSubmitting")
                    : t("candidate.assess.interviews.conversation.statusDescCompleteDefault"))
                : t("candidate.assess.interviews.conversation.statusDescReady")}
            </p>

            {/* Natural Repetition Tip */}
            <div className="mt-5 inline-flex max-w-lg items-center gap-2 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-4 py-2.5 text-xs text-blue-800 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <Sparkles className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>
                {t("candidate.assess.interviews.conversation.repeatTipPrefix")}
                <strong>{t("candidate.assess.interviews.conversation.repeatTipPhrase")}</strong>
                {t("candidate.assess.interviews.conversation.repeatTipSuffix")}
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
                  <span>{voice.isRealtime ? t("candidate.assess.interviews.conversation.realtimeRecognizing") : t("candidate.assess.interviews.conversation.recordingAnswer")}</span>
                </div>
                <p className="text-sm italic text-[var(--color-on-surface)] min-h-[1.5rem]">
                  {liveTranscript || draft || t("candidate.assess.interviews.conversation.listeningPlaceholder")}
                </p>
              </div>
            )}

            {/* Auto-completion panel when dialogue is complete */}
            {session.data?.dialogueComplete && (
              <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-md">
                <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Sparkles className="size-4 animate-spin text-emerald-600" aria-hidden="true" />
                  <span>
                    {speaking !== null
                      ? t("candidate.assess.interviews.conversation.completeBannerSpeaking")
                      : t("candidate.assess.interviews.conversation.completeBannerSubmitting")}
                  </span>
                </div>
                {onComplete && (
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={onComplete}
                    className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 shadow-md min-w-[170px]"
                  >
                    {t("candidate.assess.interviews.conversation.submitNowButton")}
                  </Button>
                )}
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
                      {t("candidate.assess.interviews.conversation.pauseMicButton")}
                    </Button>
                    <Button
                      type="button"
                      disabled={disabled || send.isPending}
                      onClick={handleSendVoiceAnswer}
                      className="flex-1 min-w-[170px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 shadow-md"
                    >
                      <Send className="size-4 mr-1.5" aria-hidden="true" />
                      {send.isPending ? t("candidate.assess.interviews.conversation.sending") : t("candidate.assess.interviews.conversation.finishAndSendVoice")}
                    </Button>
                  </div>
                ) : speaking !== null ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-8 py-4 text-base font-medium text-blue-700 shadow-sm cursor-not-allowed dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
                    >
                      <Volume2 className="size-5 animate-pulse text-blue-600" aria-hidden="true" />
                      <span>{t("candidate.assess.interviews.conversation.waitAiQuestionButton")}</span>
                    </button>
                    <p className="text-xs text-[var(--color-on-surface-variant)] text-center">
                      {t("candidate.assess.interviews.conversation.waitAiQuestionHint")}
                    </p>
                  </div>
                ) : send.isPending || !!partial ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-8 py-4 text-base font-medium text-amber-700 shadow-sm cursor-not-allowed dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    <Sparkles className="size-5 animate-spin text-amber-600" aria-hidden="true" />
                    <span>{t("candidate.assess.interviews.conversation.aiProcessingButton")}</span>
                  </button>
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
                    className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-[var(--color-primary)]/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <Mic className="size-5 transition-transform group-hover:scale-110" aria-hidden="true" />
                    <span>{t("candidate.assess.interviews.conversation.startVoiceButton")}</span>
                  </button>
                )}

                {/* Keyboard Fallback Toggle */}
                <button
                  type="button"
                  onClick={() => setShowTextFallback(prev => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors underline-offset-4 hover:underline"
                >
                  <Keyboard className="size-3.5" aria-hidden="true" />
                  <span>{showTextFallback ? t("candidate.assess.interviews.conversation.hideKeyboardFallback") : t("candidate.assess.interviews.conversation.showKeyboardFallback")}</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Fallback Form (Hidden by default, used when mic hardware fails) */}
          {showTextFallback && !session.data?.dialogueComplete && (
            <form onSubmit={handleSubmit(submit)} className="space-y-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 shadow-sm">
              <label htmlFor={`conversation-draft-${id}`} className="block text-sm font-medium">
                {t("candidate.assess.interviews.conversation.fallbackLabel")}
              </label>
              <textarea
                id={`conversation-draft-${id}`}
                value={draft}
                onChange={e => setValue("content", e.target.value, { shouldDirty: true, shouldValidate: true })}
                aria-invalid={!!errors.content}
                disabled={speaking !== null || send.isPending || upload.isPending || disabled || !!pendingRecording}
                maxLength={10000}
                rows={4}
                placeholder={speaking !== null ? t("candidate.assess.interviews.conversation.fallbackPlaceholderWait") : t("candidate.assess.interviews.conversation.fallbackPlaceholderInput")}
                className="w-full resize-y rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-lowest)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[var(--color-on-surface-variant)]">
                  {t("candidate.assess.interviews.conversation.charCount", {
                    count: formatNumber(draft.length, undefined, locale),
                    max: formatNumber(10000, undefined, locale),
                  })}
                </span>
                <Button type="submit" disabled={speaking !== null || busy || disabled || !!pendingRecording || !draft.trim()}>
                  <Send className="size-4 mr-1.5" aria-hidden="true" />
                  {send.isPending ? t("candidate.assess.interviews.conversation.sending") : t("candidate.assess.interviews.conversation.sendAnswerButton")}
                </Button>
              </div>
            </form>
          )}
        </div>

      {/* System Status Indicators (Only displayed when active) */}
      <p role="status" aria-live="polite" className="text-sm text-[var(--color-on-surface-variant)]">
        {send.isPending
          ? t("candidate.assess.interviews.conversation.liveStatusSending")
          : voice.status === "recording"
          ? t("candidate.assess.interviews.conversation.liveStatusRecording")
          : voice.status === "transcribing"
          ? t("candidate.assess.interviews.conversation.liveStatusTranscribing")
          : voice.status === "connecting"
          ? t("candidate.assess.interviews.conversation.liveStatusConnecting")
          : session.data?.dialogueComplete
          ? t("candidate.assess.interviews.conversation.liveStatusComplete")
          : t("candidate.assess.interviews.conversation.liveStatusDefault")}
      </p>

      {browserSpeech && speechEngine === "cloud" && (
        <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">
          {t("candidate.assess.interviews.conversation.browserSpeechNotice")}
        </p>
      )}

      {(error || errors.content || voice.error || upload.error) && (
        <p id={`conversation-error-${id}`} role="alert" className="text-sm text-[var(--color-error)]">
          {error ?? errors.content?.message ?? voice.error ?? getApiErrorMessage(upload.error)}
        </p>
      )}

      {pendingRecording && !upload.isPending && (
        <Button onClick={() => upload.mutate(pendingRecording)}>{t("candidate.assess.interviews.conversation.retryAttachRecording")}</Button>
      )}
    </section>
  );
}
