import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Expand, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import type { ProctorSession } from "./AssessmentProctorGate";

const MAX_VIOLATIONS = 3;

type Props = {
  submissionId: number;
  session: ProctorSession;
  children: ReactNode;
  onAutoSubmit: () => void;
};

/** Client-side exam proctoring (fullscreen, tab, copy/paste, device tracks). */
export function AssessmentProctorGuard({ submissionId, session, children, onAutoSubmit }: Props) {
  const user = useAuthStore((state) => state.user);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenAt = useRef<number | null>(null);
  const autoSubmitted = useRef(false);
  const autoSubmitRef = useRef(onAutoSubmit);
  const violationCount = useRef(0);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    autoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  const violate = useCallback((message: string) => {
    const next = violationCount.current + 1;
    violationCount.current = next;
    setViolations(next);
    setWarning(
      `${message} (${next}/${MAX_VIOLATIONS}). ${next >= MAX_VIOLATIONS ? "Bài sẽ được tự động nộp." : "Vui lòng quay lại phòng thi."}`,
    );
    if (next >= MAX_VIOLATIONS && !autoSubmitted.current) {
      autoSubmitted.current = true;
      window.setTimeout(() => autoSubmitRef.current(), 800);
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = session.camera;
    const microphoneTrack = session.camera.getAudioTracks()[0];
    const screenTrack = session.screen.getVideoTracks()[0];
    const microphoneLost = () => violate("Microphone đã bị tắt");
    const screenLost = () => violate("Chia sẻ tab làm bài đã dừng");
    microphoneTrack?.addEventListener("ended", microphoneLost);
    screenTrack?.addEventListener("ended", screenLost);
    return () => {
      microphoneTrack?.removeEventListener("ended", microphoneLost);
      screenTrack?.removeEventListener("ended", screenLost);
    };
  }, [session, violate]);

  useEffect(() => {
    const fullscreen = () => {
      if (!document.fullscreenElement) violate("Bạn đã thoát chế độ toàn màn hình");
    };
    const visibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
        violate("Bạn đã chuyển tab hoặc ẩn trang thi");
      } else {
        hiddenAt.current = null;
      }
    };
    const blur = () => {
      if (!document.hidden) violate("Cửa sổ thi đã mất tiêu điểm");
    };
    const block = (event: Event, message: string) => {
      event.preventDefault();
      violate(message);
    };
    const contextmenu = (event: MouseEvent) => block(event, "Menu chuột phải đã bị chặn");
    const copy = (event: ClipboardEvent) => block(event, "Sao chép nội dung đã bị chặn");
    const paste = (event: ClipboardEvent) => block(event, "Dán nội dung đã bị chặn");
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blocked =
        event.key === "F12" ||
        (event.ctrlKey && ["c", "v", "a", "p", "u"].includes(key)) ||
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
      if (blocked) block(event, `Phím tắt ${event.key} đã bị chặn`);
    };
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    document.addEventListener("contextmenu", contextmenu);
    document.addEventListener("copy", copy);
    document.addEventListener("paste", paste);
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      document.removeEventListener("contextmenu", contextmenu);
      document.removeEventListener("copy", copy);
      document.removeEventListener("paste", paste);
      document.removeEventListener("keydown", keydown, true);
    };
  }, [violate]);

  const watermark = `${user?.fullName ?? "Candidate"} · ${user?.email ?? "SmartHire"} · ASM-${submissionId}`;

  return (
    <div className="relative h-full min-h-0 select-none">
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden opacity-[0.05]" aria-hidden="true">
        <div className="grid h-full -rotate-12 grid-cols-2 content-around gap-16 text-center text-sm font-bold text-slate-900 sm:grid-cols-3">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index}>{watermark}</span>
          ))}
        </div>
      </div>
      <div className="fixed bottom-4 right-4 z-50 w-44 overflow-hidden rounded-xl border border-white/20 bg-slate-950 p-2 text-white shadow-2xl">
        {session.camera.getVideoTracks().length > 0 ? (
          <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-slate-900 object-cover" />
        ) : (
          <p className="p-3 text-xs">Đang giám sát microphone và tab làm bài.</p>
        )}
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-400" />
            Đang giám sát
          </span>
          <span>
            {violations}/{MAX_VIOLATIONS}
          </span>
        </div>
      </div>
      {warning && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="assessment-proctor-warning-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <TriangleAlert className="size-9 text-amber-600" aria-hidden="true" />
            <h2 id="assessment-proctor-warning-title" className="mt-3 text-xl font-semibold">
              Cảnh báo giám sát
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">{warning}</p>
            {violations < MAX_VIOLATIONS && (
              <Button
                className="mt-5"
                onClick={async () => {
                  setWarning(null);
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen().catch(() => undefined);
                  }
                }}
              >
                <Expand className="size-4" aria-hidden="true" />
                Quay lại bài thi
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="relative z-10 h-full min-h-0">{children}</div>
    </div>
  );
}
