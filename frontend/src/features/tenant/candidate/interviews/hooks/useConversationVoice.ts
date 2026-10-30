import { useEffect, useRef, useState } from "react";
import { interviewConversationApi, voiceSocketUrl } from "@/api/tenant/interviewConversationApi";
import { getApiErrorMessage } from "@/lib/axios";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition;
}

function resolveLangCode(language?: string): string {
  if (!language) return "vi-VN";
  const lower = language.toLowerCase();
  if (lower.includes("japan") || lower === "ja") return "ja-JP";
  if (lower.includes("eng") || lower === "en") return "en-US";
  return "vi-VN";
}

type Status = "idle" | "connecting" | "recording" | "transcribing";

export interface ConversationVoiceOptions {
  language?: string;
  onInterim?: (interimText: string) => void;
}

export function useConversationVoice(
  id: number,
  onTranscript: (text: string) => void,
  options?: ConversationVoiceOptions
) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);

  const socket = useRef<WebSocket | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const media = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callback = useRef(onTranscript);
  callback.current = onTranscript;
  const interimCallback = useRef(options?.onInterim);
  interimCallback.current = options?.onInterim;

  const isRecordingRef = useRef(false);
  const accumulatedFinalRef = useRef("");
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const lastRecognizedRef = useRef("");
  const mounted = useRef(true);

  function cleanup() {
    isRecordingRef.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      recognitionRef.current = null;
    }
    const ws = socket.current;
    socket.current = null;
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
    if (recorder.current?.state === "recording") recorder.current.stop();
    media.current?.getTracks().forEach(track => track.stop());
    media.current = null;
    setStatus("idle");
    setIsRealtime(false);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cleanup();
    };
  }, []);

  // Fallback WebSocket STT via Gemini backend
  async function startWebSocketFallback(audioStream: MediaStream, mime: string) {
    setIsRealtime(false);
    try {
      const ticket = await interviewConversationApi.ticket(id);
      if (!mounted.current) {
        audioStream.getTracks().forEach(track => track.stop());
        media.current = null;
        return;
      }
      const ws = new WebSocket(voiceSocketUrl(ticket));
      socket.current = ws;
      timer.current = setTimeout(() => {
        setError("Kết nối micro quá hạn. Vui lòng thử lại.");
        cleanup();
      }, 15000);

      ws.onerror = () => {
        setError("Không thể kết nối dịch vụ giọng nói. Bạn vẫn có thể nhập văn bản.");
        cleanup();
      };
      ws.onclose = () => {
        if (socket.current === ws) {
          setError("Kết nối giọng nói bị ngắt. Vui lòng thử lại.");
          cleanup();
        }
      };
      ws.onmessage = event => {
        let value: { type: string; text?: string; message?: string };
        try {
          value = JSON.parse(String(event.data)) as typeof value;
        } catch {
          setError("Phản hồi giọng nói không hợp lệ. Vui lòng thử lại.");
          cleanup();
          return;
        }
        if (value.type === "ready") ws.send(JSON.stringify({ type: "start", mimeType: mime }));
        if (value.type === "recording") {
          if (timer.current) clearTimeout(timer.current);
          const chunks: Blob[] = [];
          let size = 0;
          let sending = Promise.resolve();
          const recording = new MediaRecorder(audioStream, { mimeType: mime });
          recorder.current = recording;
          recording.onerror = () => {
            setError("Ghi âm bị gián đoạn. Hãy thu lại hoặc nhập câu trả lời.");
            cleanup();
          };
          recording.ondataavailable = ev => {
            if (!ev.data.size) return;
            chunks.push(ev.data);
            size += ev.data.size;
            if (size > 9 * 1024 * 1024) {
              setError("Bản ghi vượt 9 MB. Hãy thu lại câu trả lời ngắn hơn.");
              cleanup();
              return;
            }
            sending = sending.then(async () => {
              const data = await ev.data.arrayBuffer();
              for (let offset = 0; offset < data.byteLength; offset += 64 * 1024) {
                if (ws.readyState === WebSocket.OPEN) ws.send(data.slice(offset, offset + 64 * 1024));
              }
            });
          };
          recording.onstop = () => {
            if (timer.current) clearTimeout(timer.current);
            media.current?.getTracks().forEach(track => track.stop());
            media.current = null;
            if (!mounted.current || socket.current !== ws) return;
            setBlob(new Blob(chunks, { type: mime }));
            setStatus("transcribing");
            void sending.then(() => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "end" }));
            });
            timer.current = setTimeout(() => {
              setError("Chuyển ngữ quá hạn. Vui lòng thử lại hoặc nhập câu trả lời.");
              cleanup();
            }, 60000);
          };
          recording.start(250);
          setStatus("recording");
          timer.current = setTimeout(() => recording.stop(), 5 * 60 * 1000);
        }
        if (value.type === "transcript") {
          if (value.text?.trim()) callback.current(value.text.trim());
          else setError("Không nhận được lời nói. Hãy thu lại hoặc nhập câu trả lời.");
          cleanup();
        }
        if (value.type === "error") {
          setError(value.message ?? "Chuyển ngữ thất bại. Vui lòng thử lại.");
          cleanup();
        }
      };
    } catch (failure) {
      setError(getApiErrorMessage(failure));
      cleanup();
    }
  }

  async function start() {
    if (socket.current || isRecordingRef.current) return;
    setError(null);
    setBlob(null);
    setStatus("connecting");
    accumulatedFinalRef.current = "";
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    lastRecognizedRef.current = "";

    try {
      window.speechSynthesis?.cancel();
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Trình duyệt chưa hỗ trợ ghi âm. Hãy nhập câu trả lời.");
      }
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"].find(value =>
        MediaRecorder.isTypeSupported(value)
      );
      if (!mime) throw new Error("Không có định dạng audio được hỗ trợ.");

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      media.current = audioStream;
      if (!mounted.current) {
        audioStream.getTracks().forEach(track => track.stop());
        media.current = null;
        return;
      }

      const SpeechRecognitionClass = getSpeechRecognitionConstructor();

      // If Web Speech API is supported in Chrome/Edge/Safari, use real-time STT
      if (SpeechRecognitionClass) {
        setIsRealtime(true);
        isRecordingRef.current = true;

        // Start local MediaRecorder to capture audio Blob for attachment/review
        const chunks: Blob[] = [];
        const localRecorder = new MediaRecorder(audioStream, { mimeType: mime });
        recorder.current = localRecorder;
        localRecorder.ondataavailable = ev => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };
        localRecorder.onstop = () => {
          if (chunks.length > 0) {
            setBlob(new Blob(chunks, { type: mime }));
          }
        };
        localRecorder.start(250);

        // Setup Web Speech Recognition
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;
        recognition.lang = resolveLangCode(options?.language);
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let sessionFinal = "";
          let sessionInterim = "";
          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            if (item.isFinal) {
              sessionFinal += item[0].transcript + " ";
            } else {
              sessionInterim += item[0].transcript;
            }
          }
          finalTranscriptRef.current = sessionFinal.trim();
          interimTranscriptRef.current = sessionInterim.trim();

          const parts = [
            accumulatedFinalRef.current,
            finalTranscriptRef.current,
            interimTranscriptRef.current,
          ].filter(Boolean);
          const combined = parts.join(" ").replace(/\s+/g, " ").trim();
          if (combined) {
            lastRecognizedRef.current = combined;
            if (interimCallback.current) {
              interimCallback.current(combined);
            }
          }
        };

        recognition.onerror = event => {
          if (event.error === "no-speech") return;
          console.warn("SpeechRecognition notice:", event.error);
          // If permission denied, network error, or service error and no text was recognized yet, fallback to backend STT
          if (!lastRecognizedRef.current.trim() && !accumulatedFinalRef.current.trim()) {
            cleanup();
            void startWebSocketFallback(audioStream, mime);
          }
        };

        recognition.onend = () => {
          // Accumulate recognized text across browser silence timeouts (even if still in interim)
          const endingText = finalTranscriptRef.current || interimTranscriptRef.current;
          if (endingText) {
            accumulatedFinalRef.current = [accumulatedFinalRef.current, endingText]
              .filter(Boolean)
              .join(" ")
              .trim();
            finalTranscriptRef.current = "";
            interimTranscriptRef.current = "";
          }

          // Restart if candidate is still actively recording
          if (isRecordingRef.current && mounted.current) {
            try {
              recognition.start();
            } catch {
              setTimeout(() => {
                if (isRecordingRef.current && mounted.current && recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch {}
                }
              }, 50);
            }
          }
        };

        try {
          recognition.start();
          setStatus("recording");
          // Max 5 minutes per turn
          timer.current = setTimeout(() => stop(), 5 * 60 * 1000);
          return;
        } catch {
          // If start fails, fallback to WebSocket
          console.warn("Failed to start Web Speech API, falling back to WebSocket STT");
        }
      }

      // Fallback to WebSocket STT if Web Speech API is absent or threw error
      await startWebSocketFallback(audioStream, mime);
    } catch (failure) {
      setError(getApiErrorMessage(failure));
      cleanup();
    }
  }

  function stop() {
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      if (timer.current) clearTimeout(timer.current);

      // Stop recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore error
        }
        recognitionRef.current = null;
      }

      // Stop MediaRecorder
      if (recorder.current?.state === "recording") {
        recorder.current.stop();
      }

      // Stop media tracks
      media.current?.getTracks().forEach(track => track.stop());
      media.current = null;

      // Extract full recognized text from accumulated, current final, interim, or last recognized text
      const parts = [
        accumulatedFinalRef.current,
        finalTranscriptRef.current,
        interimTranscriptRef.current,
      ].filter(Boolean);
      const full = parts.join(" ").replace(/\s+/g, " ").trim() || lastRecognizedRef.current.trim();
      if (full) {
        setError(null);
        callback.current(full);
      } else {
        setError("Không nhận được lời nói. Hãy thu lại hoặc nhập câu trả lời.");
      }

      setStatus("idle");
      setIsRealtime(false);
      return;
    }

    // If running in WebSocket mode
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
    }
  }

  return {
    status,
    isRealtime,
    error,
    blob,
    clear: () => setBlob(null),
    start,
    stop,
  };
}
