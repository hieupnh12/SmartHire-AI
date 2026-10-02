import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, CheckCircle2, Expand, Mic, MonitorUp, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { candidateInterviewApi, type ProctorEvent } from "../api/candidateInterviewApi";

const MAX_VIOLATIONS = 3;

export type ProctorSession = {
  camera: MediaStream;
  screen: MediaStream;
};

type StartProps = {
  busy: boolean;
  label?: string;
  onReady: (session: ProctorSession) => void;
};

export function ProctoringStart({ busy, label = "Bắt đầu phỏng vấn", onReady }: StartProps) {
  const [accepted, setAccepted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prepare() {
    if (!accepted || preparing || busy) return;
    setPreparing(true);
    setError(null);
    let camera: MediaStream | null = null;
    let screen: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Trình duyệt không hỗ trợ camera hoặc chia sẻ màn hình.");
      }
      await document.documentElement.requestFullscreen();
      camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      screen = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "monitor" }, audio: false });
      const displaySurface = screen.getVideoTracks()[0]?.getSettings().displaySurface;
      if (displaySurface && displaySurface !== "monitor") {
        throw new Error("Vui lòng chia sẻ toàn bộ màn hình, không chỉ một cửa sổ hoặc tab.");
      }
      onReady({ camera, screen });
    } catch (cause) {
      camera?.getTracks().forEach(track => track.stop());
      screen?.getTracks().forEach(track => track.stop());
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Không thể hoàn tất kiểm tra thiết bị.");
    } finally {
      setPreparing(false);
    }
  }

  return <div className="space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <Requirement icon={Camera} title="Camera" text="Bắt buộc trong suốt phiên" />
      <Requirement icon={Mic} title="Microphone" text="Theo dõi trạng thái thiết bị" />
      <Requirement icon={MonitorUp} title="Toàn màn hình" text="Chia sẻ toàn bộ màn hình" />
    </div>
    <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm leading-6">
      <input className="mt-1 size-4 accent-[var(--color-primary)]" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
      <span>Tôi đồng ý bật camera, microphone, chia sẻ toàn bộ màn hình và ghi nhận các sự kiện vi phạm trong thời gian thực hiện.</span>
    </label>
    {error && <p className="rounded-lg bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]" role="alert">{error}</p>}
    <Button size="lg" disabled={!accepted || preparing || busy} onClick={() => void prepare()}>
      <ShieldCheck className="size-4" aria-hidden="true" />{preparing ? "Đang kiểm tra thiết bị…" : label}
    </Button>
  </div>;
}

function Requirement({ icon: Icon, title, text }: { icon: typeof Camera; title: string; text: string }) {
  return <div className="flex gap-3 rounded-lg border border-[var(--color-border-default)] bg-white p-3">
    <Icon className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
    <div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-[var(--color-on-surface-variant)]">{text}</p></div>
  </div>;
}

type GuardProps = {
  interviewId: number;
  session: ProctorSession;
  children: ReactNode;
  onAutoSubmit: () => void;
};

export function ProctoredInterviewGuard({ interviewId, session, children, onAutoSubmit }: GuardProps) {
  const user = useAuthStore(state => state.user);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenAt = useRef<number | null>(null);
  const autoSubmitted = useRef(false);
  const autoSubmitRef = useRef(onAutoSubmit);
  const violationCount = useRef(0);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const send = useCallback((event: ProctorEvent) => {
    void candidateInterviewApi.proctorEvent(interviewId, event).catch(() => undefined);
  }, [interviewId]);

  useEffect(() => { autoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);

  const violate = useCallback((event: ProctorEvent["event"], message: string, durationSeconds?: number) => {
    send({ event, detail: message, durationSeconds });
    const next = violationCount.current + 1;
    violationCount.current = next;
    setViolations(next);
    setWarning(`${message} (${next}/${MAX_VIOLATIONS}). ${next >= MAX_VIOLATIONS ? "Bài sẽ được tự động nộp." : "Vui lòng quay lại phòng thi."}`);
    if (next >= MAX_VIOLATIONS && !autoSubmitted.current) {
      autoSubmitted.current = true;
      window.setTimeout(() => autoSubmitRef.current(), 800);
    }
  }, [send]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = session.camera;
    const cameraTrack = session.camera.getVideoTracks()[0];
    const microphoneTrack = session.camera.getAudioTracks()[0];
    const screenTrack = session.screen.getVideoTracks()[0];
    const cameraLost = () => violate("CAMERA_LOST", "Camera đã bị tắt");
    const microphoneLost = () => violate("MICROPHONE_LOST", "Microphone đã bị tắt");
    const screenLost = () => violate("SCREEN_SHARE_STOPPED", "Chia sẻ màn hình đã dừng");
    cameraTrack?.addEventListener("ended", cameraLost);
    microphoneTrack?.addEventListener("ended", microphoneLost);
    screenTrack?.addEventListener("ended", screenLost);
    return () => {
      cameraTrack?.removeEventListener("ended", cameraLost);
      microphoneTrack?.removeEventListener("ended", microphoneLost);
      screenTrack?.removeEventListener("ended", screenLost);
      session.camera.getTracks().forEach(track => track.stop());
      session.screen.getTracks().forEach(track => track.stop());
    };
  }, [session, violate]);

  useEffect(() => {
    const fullscreen = () => {
      if (!document.fullscreenElement) violate("FULLSCREEN_EXIT", "Bạn đã thoát chế độ toàn màn hình");
    };
    const visibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
        violate("PAGE_HIDDEN", "Bạn đã chuyển tab hoặc ẩn trang thi");
      } else if (hiddenAt.current) {
        send({ event: "HEARTBEAT", detail: "Page visible again", durationSeconds: Math.round((Date.now() - hiddenAt.current) / 1000) });
        hiddenAt.current = null;
      }
    };
    const blur = () => { if (!document.hidden) violate("WINDOW_BLUR", "Cửa sổ thi đã mất tiêu điểm"); };
    const block = (event: Event, type: ProctorEvent["event"], message: string) => { event.preventDefault(); violate(type, message); };
    const contextmenu = (event: MouseEvent) => block(event, "CONTEXT_MENU", "Menu chuột phải đã bị chặn");
    const copy = (event: ClipboardEvent) => block(event, "COPY_ATTEMPT", "Sao chép nội dung đã bị chặn");
    const paste = (event: ClipboardEvent) => block(event, "PASTE_ATTEMPT", "Dán nội dung đã bị chặn");
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blocked = event.key === "F12" || (event.ctrlKey && ["c", "v", "a", "p", "u"].includes(key))
        || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
      if (blocked) block(event, "BLOCKED_SHORTCUT", `Phím tắt ${event.key} đã bị chặn`);
    };
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    document.addEventListener("contextmenu", contextmenu);
    document.addEventListener("copy", copy);
    document.addEventListener("paste", paste);
    document.addEventListener("keydown", keydown, true);
    const heartbeat = window.setInterval(() => send({ event: "HEARTBEAT", detail: "Active proctored session" }), 20_000);
    return () => {
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      document.removeEventListener("contextmenu", contextmenu);
      document.removeEventListener("copy", copy);
      document.removeEventListener("paste", paste);
      document.removeEventListener("keydown", keydown, true);
      window.clearInterval(heartbeat);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [send, violate]);

  const watermark = `${user?.fullName ?? "Candidate"} · ${user?.email ?? "SmartHire"} · AI-${interviewId}`;
  return <div className="relative select-none">
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden opacity-[0.055]" aria-hidden="true">
      <div className="grid h-full -rotate-12 grid-cols-2 content-around gap-16 text-center text-sm font-bold text-slate-900 sm:grid-cols-3">
        {Array.from({ length: 18 }, (_, index) => <span key={index}>{watermark}</span>)}
      </div>
    </div>
    <div className="fixed bottom-4 right-4 z-50 w-44 overflow-hidden rounded-xl border border-white/20 bg-slate-950 p-2 text-white shadow-2xl">
      <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-slate-900 object-cover" />
      <div className="mt-2 flex items-center justify-between text-[11px]"><span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" />Đang giám sát</span><span>{violations}/{MAX_VIOLATIONS}</span></div>
    </div>
    {warning && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4" role="alertdialog" aria-modal="true" aria-labelledby="proctor-warning-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <TriangleAlert className="size-9 text-amber-600" aria-hidden="true" />
        <h2 id="proctor-warning-title" className="mt-3 text-xl font-semibold">Cảnh báo giám sát</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">{warning}</p>
        {violations < MAX_VIOLATIONS && <Button className="mt-5" onClick={async () => {
          setWarning(null);
          if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => undefined);
        }}><Expand className="size-4" aria-hidden="true" />Quay lại bài thi</Button>}
      </div>
    </div>}
    <div className="relative z-10">{children}</div>
  </div>;
}

export function MonitoringRequired({ busy, onReady }: { busy: boolean; onReady: (session: ProctorSession) => void }) {
  return <section className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-amber-200 bg-white p-6 shadow-[var(--shadow-card)]">
    <div className="flex gap-3"><ShieldAlert className="size-7 shrink-0 text-amber-600" aria-hidden="true" /><div><h1 className="text-xl font-semibold">Khôi phục không gian thi an toàn</h1><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Phiên đang làm cần bật lại giám sát trước khi hiển thị câu hỏi.</p></div></div>
    <ProctoringStart busy={busy} label="Bật giám sát và tiếp tục" onReady={onReady} />
    <p className="flex items-start gap-2 text-xs text-[var(--color-on-surface-variant)]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Thời gian vẫn được tính trên máy chủ trong lúc thiết lập lại thiết bị.</p>
  </section>;
}
