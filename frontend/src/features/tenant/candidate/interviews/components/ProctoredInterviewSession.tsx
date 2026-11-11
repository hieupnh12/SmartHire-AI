import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, CheckCircle2, Expand, Mic, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useT } from "@/i18n";
import { candidateInterviewApi, type ProctorEvent } from "../api/candidateInterviewApi";
import { prepareProctorDevices, stopProctorSession, type ProctorSession } from "../utils/proctorDevices";
export type { ProctorSession } from "../utils/proctorDevices";

const MAX_VIOLATIONS = 3;

type StartProps = {
  busy: boolean;
  label?: string;
  onReady: (session: ProctorSession) => void | Promise<void>;
};

export function ProctoringStart({ busy, label, onReady }: StartProps) {
  const t = useT();
  const startLabel = label ?? t("candidate.assess.interviews.proctor.defaultStartLabel");
  const [accepted, setAccepted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [enableCamera, setEnableCamera] = useState(true);
  const prepared = useRef<ProctorSession | null>(null);
  const mounted = useRef(true);
  const preparingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (prepared.current) stopProctorSession(prepared.current);
      prepared.current = null;
    };
  }, []);

  async function prepare() {
    if (!accepted || preparingRef.current || busy) return;
    preparingRef.current = true;
    setPreparing(true);
    setError(null);
    let handedOff: ProctorSession | null = null;
    try {
      if (!prepared.current) {
        const devices = await prepareProctorDevices(enableCamera);
        if (!mounted.current) { stopProctorSession(devices); return; }
        prepared.current = devices;
        setReady(true);
        return;
      }
      if (prepared.current.camera.getAudioTracks().some(track => track.readyState !== "live")) {
        throw new Error(t("candidate.assess.interviews.proctor.micStoppedError"));
      }
      if (!document.documentElement.requestFullscreen) {
        throw new Error(t("candidate.assess.interviews.proctor.fullscreenUnsupportedError"));
      }
      await document.documentElement.requestFullscreen();
      if (!mounted.current) return;
      const devices = prepared.current;
      handedOff = devices;
      prepared.current = null;
      await onReady(devices);
    } catch (cause) {
      if (handedOff) stopProctorSession(handedOff);
      if (prepared.current) stopProctorSession(prepared.current);
      prepared.current = null;
      setReady(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : t("candidate.assess.interviews.proctor.checkFailedError"));
      }
    } finally {
      preparingRef.current = false;
      setPreparing(false);
    }
  }

  return <div className="space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <Requirement icon={Camera} title={t("candidate.assess.interviews.proctor.cameraTitle")} text={t("candidate.assess.interviews.proctor.cameraDesc")} />
      <Requirement icon={Mic} title={t("candidate.assess.interviews.proctor.micTitle")} text={t("candidate.assess.interviews.proctor.micDesc")} />
      <Requirement icon={Expand} title={t("candidate.assess.interviews.proctor.fullscreenTitle")} text={t("candidate.assess.interviews.proctor.fullscreenDesc")} />
    </div>
    <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm leading-6">
      <input className="mt-1 size-4 accent-[var(--color-primary)]" type="checkbox" checked={accepted} disabled={preparing} onChange={event => {
        setAccepted(event.target.checked);
        if (prepared.current) stopProctorSession(prepared.current);
        prepared.current = null;
        setReady(false);
      }} />
      <span>{t("candidate.assess.interviews.proctor.consentLabel")}</span>
    </label>
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" checked={enableCamera} disabled={preparing || ready} onChange={event => setEnableCamera(event.target.checked)} />
      {t("candidate.assess.interviews.proctor.enableCameraLabel")}
    </label>
    {error && <p className="rounded-lg bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]" role="alert">{error}</p>}
    {!ready && <p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.proctor.grantPermissionHint")}</p>}
    {ready && (
      <p className="text-sm font-medium text-emerald-600" role="status">
        {enableCamera && !prepared.current?.camera.getVideoTracks().length
          ? t("candidate.assess.interviews.proctor.readyMicFallback")
          : t("candidate.assess.interviews.proctor.readyFull")}
      </p>
    )}
    <Button size="lg" disabled={!accepted || preparing || busy} onClick={() => void prepare()}>
      <ShieldCheck className="size-4" aria-hidden="true" />
      {preparing || busy
        ? ready
          ? t("candidate.assess.interviews.proctor.openingSession")
          : t("candidate.assess.interviews.proctor.checkingDevices")
        : ready
          ? startLabel
          : t("candidate.assess.interviews.proctor.checkDevicesStep")}
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
  const t = useT();
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
    setWarning(
      next >= MAX_VIOLATIONS
        ? t("candidate.assess.interviews.proctor.violationAutoSubmit", { message, count: next, max: MAX_VIOLATIONS })
        : t("candidate.assess.interviews.proctor.violationWarning", { message, count: next, max: MAX_VIOLATIONS }),
    );
    if (next >= MAX_VIOLATIONS && !autoSubmitted.current) {
      autoSubmitted.current = true;
      window.setTimeout(() => autoSubmitRef.current(), 800);
    }
  }, [send, t]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = session.camera;
    const microphoneTrack = session.camera.getAudioTracks()[0];
    const cameraTrack = session.camera.getVideoTracks()[0];
    const microphoneLost = () => violate("MICROPHONE_LOST", t("candidate.assess.interviews.proctor.micLost"));
    const cameraLost = () => violate("CAMERA_LOST", t("candidate.assess.interviews.proctor.cameraLost"));
    microphoneTrack?.addEventListener("ended", microphoneLost);
    cameraTrack?.addEventListener("ended", cameraLost);
    return () => {
      microphoneTrack?.removeEventListener("ended", microphoneLost);
      cameraTrack?.removeEventListener("ended", cameraLost);
      // The room owns device lifetime; this guard only attaches monitoring listeners.
    };
  }, [session, violate, t]);

  useEffect(() => {
    const fullscreen = () => {
      if (!document.fullscreenElement) violate("FULLSCREEN_EXIT", t("candidate.assess.interviews.proctor.fullscreenExit"));
    };
    const visibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
        violate("PAGE_HIDDEN", t("candidate.assess.interviews.proctor.pageHidden"));
      } else if (hiddenAt.current) {
        send({ event: "HEARTBEAT", detail: "Page visible again", durationSeconds: Math.round((Date.now() - hiddenAt.current) / 1000) });
        hiddenAt.current = null;
      }
    };
    const blur = () => { if (!document.hidden) violate("WINDOW_BLUR", t("candidate.assess.interviews.proctor.windowBlur")); };
    const block = (event: Event, type: ProctorEvent["event"], message: string) => { event.preventDefault(); violate(type, message); };
    const contextmenu = (event: MouseEvent) => block(event, "CONTEXT_MENU", t("candidate.assess.interviews.proctor.contextMenu"));
    const copy = (event: ClipboardEvent) => block(event, "COPY_ATTEMPT", t("candidate.assess.interviews.proctor.copyAttempt"));
    const paste = (event: ClipboardEvent) => block(event, "PASTE_ATTEMPT", t("candidate.assess.interviews.proctor.pasteAttempt"));
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blocked = event.key === "F12" || (event.ctrlKey && ["c", "v", "a", "p", "u"].includes(key))
        || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
      if (blocked) block(event, "BLOCKED_SHORTCUT", t("candidate.assess.interviews.proctor.blockedShortcut", { key: event.key }));
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
    };
  }, [send, violate, t]);

  const watermark = `${user?.fullName ?? t("candidate.assess.interviews.proctor.defaultCandidate")} · ${user?.email ?? "SmartHire"} · AI-${interviewId}`;
  return <div className="relative select-none">
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden opacity-[0.055]" aria-hidden="true">
      <div className="grid h-full -rotate-12 grid-cols-2 content-around gap-16 text-center text-sm font-bold text-slate-900 sm:grid-cols-3">
        {Array.from({ length: 18 }, (_, index) => <span key={index}>{watermark}</span>)}
      </div>
    </div>
    <div className="fixed bottom-4 right-4 z-50 w-48 overflow-hidden rounded-xl border border-white/20 bg-slate-950 p-2 text-white shadow-2xl">
      {session.camera.getVideoTracks().length > 0
        ? <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-slate-900 object-cover" />
        : <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg bg-slate-900 p-2 text-center text-xs text-slate-400">
            <Camera className="mb-1 size-5 text-slate-500" />
            <span>{t("candidate.assess.interviews.proctor.cameraOff")}</span>
          </div>}
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="size-2 animate-pulse rounded-full bg-emerald-400" />{t("candidate.assess.interviews.proctor.monitoringActive")}
        </span>
        <span className="font-mono text-slate-300">{violations}/{MAX_VIOLATIONS}</span>
      </div>
    </div>
    {warning && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4" role="alertdialog" aria-modal="true" aria-labelledby="proctor-warning-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <TriangleAlert className="size-9 text-amber-600" aria-hidden="true" />
        <h2 id="proctor-warning-title" className="mt-3 text-xl font-semibold">{t("candidate.assess.interviews.proctor.warningTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">{warning}</p>
        {violations < MAX_VIOLATIONS && <Button className="mt-5" onClick={async () => {
          setWarning(null);
          if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => undefined);
        }}><Expand className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.proctor.returnToExam")}</Button>}
      </div>
    </div>}
    <div className="relative z-10">{children}</div>
  </div>;
}

export function MonitoringRequired({ busy, onReady, preparing = false }: { busy: boolean; onReady: (session: ProctorSession) => void; preparing?: boolean }) {
  const t = useT();
  return <section className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-amber-200 bg-white p-6 shadow-[var(--shadow-card)]">
    <div className="flex gap-3">
      <ShieldAlert className="size-7 shrink-0 text-amber-600" aria-hidden="true" />
      <div>
        <h1 className="text-xl font-semibold">{t("candidate.assess.interviews.proctor.recoverTitle")}</h1>
        <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.proctor.recoverDesc")}</p>
      </div>
    </div>
    <ProctoringStart busy={busy} label={t("candidate.assess.interviews.proctor.recoverButton")} onReady={onReady} />
    <p className="flex items-start gap-2 text-xs text-[var(--color-on-surface-variant)]">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {preparing ? t("candidate.assess.interviews.proctor.recoverPreparingNote") : t("candidate.assess.interviews.proctor.recoverTimerNote")}
    </p>
  </section>;
}
