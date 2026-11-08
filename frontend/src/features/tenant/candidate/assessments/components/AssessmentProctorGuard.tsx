import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Expand, TriangleAlert } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { Button } from "@/components/ux/Button";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import type { ProctorSession } from "@/features/tenant/candidate/interviews/utils/proctorDevices";
import { expandExamToScreen, examIsFullscreen } from "../utils/examFullscreen";
import { watchFacePresence, type FacePresenceStatus } from "../utils/facePresence";

const MAX_VIOLATIONS = 3;
const EXAM_ROOT_ID = "exam-room-root";

const FACE_LABEL: Record<FacePresenceStatus, string> = {
  loading: "Đang tải nhận diện…",
  ready: "Đang nhận diện…",
  present: "Mặt trong khung",
  absent: "Mất mặt",
  multi: "Nhiều người",
  unavailable: "Không nhận diện được",
};

const ProctorChromeContext = createContext<ReactNode>(null);
const ExpandContext = createContext<(() => Promise<void>) | null>(null);

/** Compact monitor chip. Render it in the exam header so it does not cover the editor. */
export function ExamMonitor() {
  return useContext(ProctorChromeContext);
}

export function ExamFullscreenButton() {
  const expand = useContext(ExpandContext);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <>
      {error && (
        <p className="mt-3 text-sm leading-6 text-[var(--color-on-surface-variant)]" role="status">
          {error}
        </p>
      )}
      <Button
        className="mt-5 w-full"
        disabled={pending || !expand}
        onClick={() => {
          if (!expand) return;
          setPending(true);
          setError(null);
          void expand()
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : "Không mở được toàn màn hình.");
            })
            .finally(() => setPending(false));
        }}
      >
        <Expand className="size-4" aria-hidden="true" />
        {pending ? "Đang mở toàn màn hình…" : "Mở toàn màn hình"}
      </Button>
    </>
  );
}

type Props = {
  submissionId: number;
  session?: ProctorSession | null;
  children: ReactNode;
  onAutoSubmit: () => void;
};

/** Client-side exam proctoring (fullscreen, tab, copy/paste, device tracks). */
export function AssessmentProctorGuard({ submissionId, session = null, children, onAutoSubmit }: Props) {
  const user = useAuthStore((state) => state.user);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenAt = useRef<number | null>(null);
  const autoSubmitted = useRef(false);
  const autoSubmitRef = useRef(onAutoSubmit);
  const violationCount = useRef(0);
  const ignoreTransient = useRef(false);
  const onScreenEnded = useRef(() => {});
  const warningOpen = useRef(false);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<FacePresenceStatus>("loading");

  useEffect(() => {
    autoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  const report = useCallback((event: string, detail?: string) => {
    void assessmentApi.proctorEvent(submissionId, event, detail).catch(() => undefined);
  }, [submissionId]);

  const violate = useCallback((message: string, event?: string) => {
    if (event) report(event, message);
    const next = violationCount.current + 1;
    violationCount.current = next;
    setViolations(next);
    warningOpen.current = true;
    setWarning(
      `${message} (${next}/${MAX_VIOLATIONS}). ${next >= MAX_VIOLATIONS ? "Bài sẽ được tự động nộp." : "Vui lòng quay lại phòng thi."}`,
    );

    if (next >= MAX_VIOLATIONS && !autoSubmitted.current) {
      autoSubmitted.current = true;
      window.setTimeout(() => autoSubmitRef.current(), 800);
    }
  }, [report]);

  useEffect(() => {
    if (!session) return;
    const track = session.camera.getVideoTracks().find((item) => item.readyState === "live");
    if (!track) {
      setFaceStatus("unavailable");
      return;
    }
    let active = true;
    let handle: { stop: () => void } | null = null;
    void watchFacePresence({
      stream: session.camera,
      onStatus: (status) => {
        if (active) setFaceStatus(status);
      },
      onViolation: (reason) => {
        if (!active || ignoreTransient.current || warningOpen.current) return;
        if (reason === "multi") {
          violate("Phát hiện nhiều khuôn mặt trong khung hình camera", "MULTI_FACE");
          return;
        }
        violate("Khuôn mặt không còn trong khung hình camera", "LOST_FACE");
      },
    }).then((watcher) => {
      if (!active) {
        watcher.stop();
        return;
      }
      handle = watcher;
    });
    return () => {
      active = false;
      handle?.stop();
    };
  }, [session, violate]);

  const bindVideo = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && session) node.srcObject = session.camera;
  };

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Phòng thi";
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      document.title = previousTitle;
      root.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const microphoneTrack = session.camera.getAudioTracks()[0];
    const cameraTrack = session.camera.getVideoTracks()[0];
    const screenTrack = session.screen?.getVideoTracks()[0];
    const microphoneLost = () => violate("Microphone đã bị tắt", "MICROPHONE_LOST");
    const cameraLost = () => violate("Camera đã bị tắt", "CAMERA_LOST");
    const screenLost = () => onScreenEnded.current();
    microphoneTrack?.addEventListener("ended", microphoneLost);
    cameraTrack?.addEventListener("ended", cameraLost);
    screenTrack?.addEventListener("ended", screenLost);
    return () => {
      microphoneTrack?.removeEventListener("ended", microphoneLost);
      cameraTrack?.removeEventListener("ended", cameraLost);
      screenTrack?.removeEventListener("ended", screenLost);
    };
  }, [session, violate]);

  useEffect(() => {
    const fullscreen = () => {
      if (ignoreTransient.current) return;
      if (!examIsFullscreen()) violate("Bạn đã thoát chế độ toàn màn hình", "FULLSCREEN_EXIT");
    };
    const visibility = () => {
      if (ignoreTransient.current) return;
      if (document.hidden) {
        hiddenAt.current = Date.now();
        violate("Bạn đã chuyển tab hoặc ẩn trang thi", "PAGE_HIDDEN");
      } else {
        hiddenAt.current = null;
      }
    };
    const blur = () => {
      if (ignoreTransient.current) return;
      if (!document.hidden) violate("Cửa sổ thi đã mất tiêu điểm", "WINDOW_BLUR");
    };
    const block = (event: Event, message: string, code: string) => {
      event.preventDefault();
      violate(message, code);
    };
    const contextmenu = (event: MouseEvent) => block(event, "Menu chuột phải đã bị chặn", "CONTEXT_MENU");
    const copy = (event: ClipboardEvent) => block(event, "Sao chép nội dung đã bị chặn", "COPY_ATTEMPT");
    const paste = (event: ClipboardEvent) => block(event, "Dán nội dung đã bị chặn", "PASTE_ATTEMPT");
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blocked =
        event.key === "F12" ||
        (event.ctrlKey && ["c", "v", "a", "p", "u"].includes(key)) ||
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
      if (blocked) block(event, `Phím tắt ${event.key} đã bị chặn`, "BLOCKED_SHORTCUT");
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

  onScreenEnded.current = () => {
    if (ignoreTransient.current) return;
    violate("Chia sẻ màn hình đã dừng", "SCREEN_SHARE_STOPPED");
  };
  const expand = useCallback(() => {
    ignoreTransient.current = true;
    return expandExamToScreen(session ?? null).finally(() => {
      window.setTimeout(() => {
        ignoreTransient.current = false;
      }, 700);
    });
  }, [session]);

  const watermark = `${user?.fullName ?? "Candidate"} · ${user?.email ?? "SmartHire"} · ASM-${submissionId}`;
  const hasCamera = !!session && session.camera.getVideoTracks().length > 0;
  const faceDot =
    faceStatus === "present"
      ? "bg-emerald-400"
      : faceStatus === "absent" || faceStatus === "multi"
        ? "bg-amber-400"
        : faceStatus === "unavailable"
          ? "bg-slate-400"
          : "bg-sky-400 animate-pulse";
  const monitor = (
    <div className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-2.5 py-1 text-[11px] text-white">
      {hasCamera && (
        <video ref={bindVideo} autoPlay muted playsInline className="h-8 w-12 rounded bg-slate-900 object-cover" />
      )}
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className={`size-2 rounded-full ${hasCamera ? faceDot : "bg-emerald-400"}`} />
        {hasCamera ? FACE_LABEL[faceStatus] : "Toàn màn hình"}
      </span>
      <span className="tabular-nums">
        Vi phạm: <strong className="font-semibold text-rose-300">{violations}</strong>/{MAX_VIOLATIONS}
      </span>
    </div>
  );

  return createPortal(
    <div id={EXAM_ROOT_ID} className="fixed inset-0 z-[65] flex h-[100dvh] w-[100vw] flex-col overflow-hidden bg-[var(--color-surface-alt)] text-[var(--color-on-surface)] select-none">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.035]" aria-hidden="true">
        <div className="grid h-full -rotate-12 grid-cols-3 content-around gap-24 text-center text-xs font-semibold text-slate-900">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index}>{watermark}</span>
          ))}
        </div>
      </div>
      <ExpandContext.Provider value={expand}>
      <ProctorChromeContext.Provider value={monitor}>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </ProctorChromeContext.Provider>
      </ExpandContext.Provider>
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
                  warningOpen.current = false;
                  setWarning(null);
                  if (!examIsFullscreen()) await expand().catch(() => undefined);
                }}
              >
                <Expand className="size-4" aria-hidden="true" />
                Quay lại bài thi
              </Button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
