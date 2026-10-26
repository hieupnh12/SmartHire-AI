import { useEffect, useRef, useState } from "react";
import { Mic, MonitorUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ux/Button";
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

export function AssessmentProctorGate({ busy, label = "Bắt đầu làm bài", onReady }: Props) {
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
        const devices = await prepareProctorDevices(false, "monitor");
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
        !live(prepared.current.camera.getAudioTracks()) ||
        !live(prepared.current.screen.getVideoTracks())
      ) {
        throw new Error("Microphone hoặc chia sẻ màn hình đã dừng. Hãy kiểm tra thiết bị lại.");
      }
      if (!document.documentElement.requestFullscreen) {
        throw new Error("Trình duyệt không hỗ trợ chế độ toàn màn hình.");
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
        setError(cause instanceof Error ? cause.message : "Không thể hoàn tất kiểm tra thiết bị.");
      }
    } finally {
      preparingRef.current = false;
      setPreparing(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-4">
      <p className="text-sm font-semibold">Kiểm tra thiết bị</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5">
          <Mic className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> Microphone
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5">
          <MonitorUp className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> Cả màn hình
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
          Cho phép microphone và chia sẻ toàn bộ màn hình trong suốt bài thi. Tắt microphone hoặc dừng chia sẻ màn hình được tính là vi phạm.
        </span>
      </label>
      {error && (
        <p className="rounded-lg bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]" role="alert">
          {error}
        </p>
      )}
      {ready && (
        <p className="text-sm text-[var(--color-primary)]" role="status">
          Thiết bị sẵn sàng. Bấm để vào toàn màn hình và bắt đầu.
        </p>
      )}
      <Button size="lg" className="w-full" disabled={!accepted || preparing || busy} onClick={() => void prepare()}>
        <ShieldCheck className="size-4" aria-hidden="true" />
        {preparing || busy
          ? ready
            ? "Đang mở bài…"
            : "Đang kiểm tra…"
          : ready
            ? label
            : "Kiểm tra thiết bị"}
      </Button>
    </div>
  );
}
