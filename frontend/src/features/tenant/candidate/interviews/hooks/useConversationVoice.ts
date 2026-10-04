import { useEffect, useRef, useState } from "react";
import { interviewConversationApi, voiceSocketUrl } from "@/api/tenant/interviewConversationApi";

type Status = "idle" | "connecting" | "recording" | "transcribing";
export function useConversationVoice(id: number, onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const socket = useRef<WebSocket | null>(null); const recorder = useRef<MediaRecorder | null>(null);
  const media = useRef<MediaStream | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onTranscript); callback.current = onTranscript;
  const mounted = useRef(true);
  function cleanup() {
    if (timer.current) clearTimeout(timer.current);
    const ws = socket.current; socket.current = null; if (ws) { ws.onclose = null; ws.close(); }
    if (recorder.current?.state === "recording") recorder.current.stop();
    media.current?.getTracks().forEach(track => track.stop()); media.current = null;
    setStatus("idle");
  }
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false;
    if (timer.current) clearTimeout(timer.current);
    socket.current?.close();
    if (recorder.current?.state === "recording") recorder.current.stop();
    media.current?.getTracks().forEach(track => track.stop());
  }; }, []);
  async function start() {
    if (socket.current) return;
    setError(null); setBlob(null); setStatus("connecting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Trình duyệt chưa hỗ trợ ghi âm. Hãy nhập câu trả lời.");
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find(value => MediaRecorder.isTypeSupported(value));
      if (!mime) throw new Error("Không có định dạng audio được hỗ trợ.");
      media.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { media.current.getTracks().forEach(track => track.stop()); media.current = null; return; }
      const ticket = await interviewConversationApi.ticket(id);
      if (!mounted.current) { media.current?.getTracks().forEach(track => track.stop()); media.current = null; return; }
      const ws = new WebSocket(voiceSocketUrl(ticket)); socket.current = ws;
      timer.current = setTimeout(() => { setError("Kết nối micro quá hạn. Vui lòng thử lại."); cleanup(); }, 15000);
      ws.onerror = () => { setError("Không thể kết nối dịch vụ giọng nói. Bạn vẫn có thể nhập văn bản."); cleanup(); };
      ws.onclose = () => { if (socket.current === ws) { setError("Kết nối giọng nói bị ngắt. Vui lòng thử lại."); cleanup(); } };
      ws.onmessage = event => {
        const value = JSON.parse(String(event.data)) as { type: string; text?: string; message?: string };
        if (value.type === "ready") ws.send(JSON.stringify({ type: "start", mimeType: mime }));
        if (value.type === "recording") {
          if (timer.current) clearTimeout(timer.current);
          const chunks: Blob[] = []; let size = 0; let sending = Promise.resolve();
          const recording = new MediaRecorder(media.current!, { mimeType: mime }); recorder.current = recording;
          recording.ondataavailable = event => {
            if (!event.data.size) return;
            chunks.push(event.data); size += event.data.size;
            if (size > 9 * 1024 * 1024) { setError("Bản ghi vượt 9 MB. Hãy thu lại câu trả lời ngắn hơn."); cleanup(); return; }
            sending = sending.then(async () => {
              const data = await event.data.arrayBuffer();
              for (let offset = 0; offset < data.byteLength; offset += 64 * 1024) {
                if (ws.readyState === WebSocket.OPEN) ws.send(data.slice(offset, offset + 64 * 1024));
              }
            });
          };
          recording.onstop = () => {
            if (timer.current) clearTimeout(timer.current);
            media.current?.getTracks().forEach(track => track.stop()); media.current = null;
            if (!mounted.current || socket.current !== ws) return;
            setBlob(new Blob(chunks, { type: mime })); setStatus("transcribing");
            void sending.then(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "end" })); });
            timer.current = setTimeout(() => { setError("Chuyển ngữ quá hạn. Vui lòng thử lại hoặc nhập câu trả lời."); cleanup(); }, 60000);
          };
          recording.start(250); setStatus("recording");
          timer.current = setTimeout(() => recording.stop(), 5 * 60 * 1000);
        }
        if (value.type === "transcript") {
          if (value.text?.trim()) callback.current(value.text.trim());
          else setError("Không nhận được lời nói. Hãy thu lại hoặc nhập câu trả lời.");
          cleanup();
        }
        if (value.type === "error") { setError(value.message ?? "Chuyển ngữ thất bại. Vui lòng thử lại."); cleanup(); }
      };
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Không thể mở micro."); cleanup(); }
  }
  return { status, error, blob, clear: () => setBlob(null), start, stop: () => { if (recorder.current?.state === "recording") recorder.current.stop(); } };
}
