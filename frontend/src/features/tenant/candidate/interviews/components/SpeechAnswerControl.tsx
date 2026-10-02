import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ux/Button";
import type { SpeechCapture } from "@/api/types/aiInterview";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; abort: () => void;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>; resultIndex: number }) => void) | null;
  onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function SpeechAnswerControl({ language, disabled, onTranscript, onCapture, onBusy, onReset }: {
  language?: string; disabled: boolean; onTranscript: (text: string) => void;
  onCapture: (capture: SpeechCapture) => void; onBusy: (busy: boolean) => void; onReset: () => void;
}) {
  const recognition = useRef<Recognition | null>(null); const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null); const context = useRef<AudioContext | null>(null); const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacks = useRef({ onTranscript, onCapture, onBusy, onReset }); callbacks.current = { onTranscript, onCapture, onBusy, onReset };
  const openedAt = useRef(Date.now()); const mounted = useRef(true);
  const [listening, setListening] = useState(false); const [opening, setOpening] = useState(false); const [error, setError] = useState<string | null>(null);
  const Constructor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
  function release() { if (timer.current) clearInterval(timer.current); timer.current = null; stream.current?.getTracks().forEach(track => track.stop()); if (context.current && context.current.state !== "closed") void context.current.close().catch(() => {}); context.current = null; stream.current = null; }
  function stop() { recognition.current?.stop(); if (recorder.current?.state === "recording") recorder.current.stop(); }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; recognition.current?.abort(); if (recorder.current?.state === "recording") recorder.current.stop(); release(); }; }, []);
  useEffect(() => { if (disabled) stop(); }, [disabled]);
  async function start() {
    if (!Constructor || !navigator.mediaDevices || !window.MediaRecorder) { setError("Trình duyệt chưa hỗ trợ đầy đủ STT/ghi âm. Bạn có thể nhập văn bản."); return; }
    window.speechSynthesis?.cancel();
    setError(null); callbacks.current.onBusy(true); setListening(true); setOpening(true);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { mic.getTracks().forEach(track => track.stop()); return; }
      stream.current = mic; const audio = new AudioContext(); context.current = audio; await audio.resume();
      const analyser = audio.createAnalyser(); analyser.fftSize = 1024; audio.createMediaStreamSource(mic).connect(analyser);
      const samples = new Float32Array(analyser.fftSize); const started = Date.now(); let lastSample = started; let voiced = 0; let silence = 0; let pauses = 0; let gap = 0; let firstSpeech: number | null = null;
      timer.current = setInterval(() => {
        const now = Date.now(); const elapsed = now - lastSample; lastSample = now; analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        if (rms > 0.015) { voiced += elapsed; if (firstSpeech === null) firstSpeech = now; if (gap >= 600) pauses++; gap = 0; }
        else { silence += elapsed; if (firstSpeech !== null) gap += elapsed; }
      }, 100);
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("Unsupported audio format");
      const instance = new MediaRecorder(mic, { mimeType: mime }); recorder.current = instance; const chunks: Blob[] = []; let bytes = 0; let failed = false;
      instance.ondataavailable = event => { if (event.data.size) { chunks.push(event.data); bytes += event.data.size; if (bytes > 9 * 1024 * 1024) { failed = true; setError("Bản ghi đạt giới hạn 9 MB; hãy ghi lại câu trả lời ngắn hơn."); stop(); } } };
      instance.onerror = () => { failed = true; setError("Ghi âm bị gián đoạn. Hãy ghi lại hoặc gửi câu trả lời bằng văn bản."); stop(); };
      instance.onstop = () => {
        const durationMs = Date.now() - started; release();
        if (!mounted.current) return;
        if (!failed && bytes <= 9 * 1024 * 1024 && bytes > 0) callbacks.current.onCapture({ blob: new Blob(chunks, { type: mime }), metrics: {
          durationMs, voicedMs: voiced, silenceMs: silence, pauseCount: pauses,
          responseLatencyMs: firstSpeech === null ? null : firstSpeech - openedAt.current,
        } });
        callbacks.current.onBusy(false); setListening(false);
      };
      const stt = new Constructor(); recognition.current = stt; stt.lang = language === "English" ? "en-US" : language === "Japanese" ? "ja-JP" : "vi-VN";
      stt.continuous = true; stt.interimResults = false;
      stt.onresult = event => { if (!mounted.current) return; let text = ""; for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) text += event.results[i][0].transcript + " "; if (text.trim()) callbacks.current.onTranscript(text.trim()); };
      stt.onerror = () => { setError("STT không nhận được giọng nói. Dừng ghi âm và kiểm tra hoặc nhập transcript trước khi gửi."); stop(); };
      stt.onend = () => { if (recorder.current?.state === "recording") recorder.current.stop(); };
      callbacks.current.onReset(); stt.start(); instance.start(1000); setOpening(false);
    } catch { recognition.current?.abort(); release(); setOpening(false); setListening(false); callbacks.current.onBusy(false); setError("Không mở được micro/ghi âm. Kiểm tra quyền micro và HTTPS hoặc nhập văn bản."); }
  }
  return <div className="space-y-2 rounded-lg border border-[var(--color-border-default)] p-3 text-sm">
    <p>Nhận giọng nói và ghi âm câu trả lời. Kiểm tra transcript trước khi gửi; audio được lưu riêng tư nếu Job bật ghi âm. STT có thể dùng dịch vụ nhận dạng của trình duyệt.</p>
    <Button type="button" variant="secondary" disabled={disabled || opening} onClick={() => listening ? stop() : void start()}>
      {listening ? <Square className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}{listening ? "Dừng và kiểm tra transcript" : "Bắt đầu trả lời bằng giọng nói"}
    </Button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
