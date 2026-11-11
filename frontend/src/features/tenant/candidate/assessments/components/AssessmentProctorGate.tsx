import { useEffect, useRef, useState } from "react";
import { Camera, Mic, MonitorUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useT } from "@/i18n";
import {
  prepareProctorDevices,
  stopProctorSession,
  type ProctorSession,
} from "@/features/tenant/candidate/interviews/utils/proctorDevices";
import { expandExamToScreen } from "../utils/examFullscreen";

export type { ProctorSession };
export { stopProctorSession };

type Props = {
  busy: boolean;
  label?: string;
  onReady: (session: ProctorSession) => void | Promise<void>;
};

export function AssessmentProctorGate({ busy, label, onReady }: Props) {
  const t = useT();
  const buttonLabel = label ?? t("candidate.assess.proctorGate.defaultStartLabel");
  const [accepted, setAccepted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
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
        const devices = await prepareProctorDevices(true, "monitor");
        if (!mounted.current) {
          stopProctorSession(devices);
          return;
        }
        prepared.current = devices;
        setReady(true);
        return;
      }
      const live = (tracks: MediaStreamTrack[]) => tracks.some((track) => track.readyState === "live");
      if (
        !live(prepared.current.camera.getVideoTracks()) ||
        !live(prepared.current.camera.getAudioTracks()) ||
        (prepared.current.screen && !live(prepared.current.screen.getVideoTracks()))
      ) {
        throw new Error(t("candidate.assess.proctorGate.devicesStoppedError"));
      }
      if (!document.documentElement.requestFullscreen) {
        throw new Error(t("candidate.assess.proctorGate.fullscreenUnsupportedError"));
      }
      const devices = prepared.current;
      await expandExamToScreen(devices);
      if (!mounted.current) return;
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
        setError(cause instanceof Error ? cause.message : t("candidate.assess.proctorGate.checkFailedError"));
      }
    } finally {
      preparingRef.current = false;
      setPreparing(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-4">
      <p className="text-sm font-semibold">{t("candidate.assess.proctorGate.title")}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5">
          <Mic className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> {t("candidate.assess.proctorGate.microphoneChip")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5">
          <MonitorUp className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> {t("candidate.assess.proctorGate.entireScreenChip")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5">
          <Camera className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> {t("candidate.assess.proctorGate.cameraChip")}
        </span>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 text-sm leading-6">
        <input
          className="mt-1 size-4 accent-[var(--color-primary)]"
          type="checkbox"
          checked={accepted}
          disabled={preparing}
          onChange={(event) => {
            setAccepted(event.target.checked);
            if (prepared.current) stopProctorSession(prepared.current);
            prepared.current = null;
            setReady(false);
          }}
        />
        <span>
          {t("candidate.assess.proctorGate.consentLabel")}
        </span>
      </label>
      {error && (
        <p className="rounded-lg bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]" role="alert">
          {error}
        </p>
      )}
      {ready && (
        <p className="text-sm text-[var(--color-primary)]" role="status">
          {t("candidate.assess.proctorGate.devicesReady")}
        </p>
      )}
      <Button size="lg" className="w-full" disabled={!accepted || preparing || busy} onClick={() => void prepare()}>
        <ShieldCheck className="size-4" aria-hidden="true" />
        {preparing || busy
          ? ready
            ? t("candidate.assess.proctorGate.openingExam")
            : t("candidate.assess.proctorGate.checkingDevices")
          : ready
            ? buttonLabel
            : t("candidate.assess.proctorGate.checkDevicesButton")}
      </Button>
    </div>
  );
}
