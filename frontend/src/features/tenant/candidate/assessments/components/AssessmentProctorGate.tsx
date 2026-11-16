import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Lock,
  Mic,
  MonitorUp,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { AvailableAssessment } from "@/api/types/assessment";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { Button } from "@/components/ux/Button";
import { useT } from "@/i18n";
import { toast } from "@/stores/toastStore";
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
  test?: AvailableAssessment | null;
  applicationId?: number;
  onReady: (session: ProctorSession) => void | Promise<void>;
  onRefreshTest?: () => void;
};

export function AssessmentProctorGate({ busy, label, test, applicationId, onReady, onRefreshTest }: Props) {
  const t = useT();
  const buttonLabel = label ?? t("candidate.assess.proctorGate.defaultStartLabel");
  const [accepted, setAccepted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [signalingReady, setSignalingReady] = useState(false);
  const prepared = useRef<ProctorSession | null>(null);
  const mounted = useRef(true);
  const preparingRef = useRef(false);

  const isStrictMode = !!test?.strictProctorEnabled;
  const isApproved = !isStrictMode || !!test?.proctorApproved;
  const isCandidateReady = !!test?.proctorCandidateReady;
  const meetUrl =
    test?.proctorMeetUrl ||
    `https://meet.jit.si/smarthire-proctor-test-${test?.id ?? 0}#config.prejoinPageEnabled=false&config.disableDeepLinking=true`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    meetUrl
  )}&margin=4`;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (prepared.current) stopProctorSession(prepared.current);
      prepared.current = null;
    };
  }, []);

  const copyMeetUrl = async () => {
    try {
      await navigator.clipboard.writeText(meetUrl);
      toast.success("Đã sao chép đường dẫn phòng giám sát!");
    } catch {
      toast.error("Không thể sao chép đường dẫn.");
    }
  };

  const handleSignalReady = async () => {
    if (!test || !applicationId) return;
    setSignalingReady(true);
    try {
      let subId = test.submissionId;
      if (!subId) {
        const sub = await assessmentApi.prepare(test.id, applicationId);
        subId = sub.id;
      }
      await assessmentApi.proctorReady(subId);
      toast.success("Đã thông báo tới Giám sát viên! Vui lòng giữ nguyên góc máy điện thoại.");
      onRefreshTest?.();
    } catch (err) {
      toast.error("Không thể gửi trạng thái sẵn sàng. Vui lòng thử lại.");
    } finally {
      setSignalingReady(false);
    }
  };

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
    <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-4">
      <div>
        <p className="text-sm font-semibold">{t("candidate.assess.proctorGate.title")}</p>
        <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
          {isStrictMode
            ? "Bài thi yêu cầu giám sát nâng cao: Kiểm tra thiết bị và kết nối Meet qua điện thoại phụ."
            : "Kiểm tra quyền truy cập microphone, camera và chia sẻ toàn màn hình."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-2xs">
          <Mic className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> {t("candidate.assess.proctorGate.microphoneChip")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-2xs">
          <MonitorUp className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> {t("candidate.assess.proctorGate.entireScreenChip")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-2xs">
          <Camera className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> {t("candidate.assess.proctorGate.cameraChip")}
        </span>
        {isStrictMode && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1.5 font-medium shadow-2xs">
            <Smartphone className="size-3.5 text-indigo-600" aria-hidden="true" /> Meet 45°
          </span>
        )}
      </div>

      {/* Strict Live Proctoring: Secondary Phone Meet & HR Approval */}
      {isStrictMode && (
        <div className="rounded-xl border border-indigo-200 bg-white p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-100 pb-2">
            <Smartphone className="size-4 text-indigo-600" />
            <span>Kết nối điện thoại giám sát (Góc nghiêng 45°)</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="size-28 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="QR Code Meet"
                className="size-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="text-xs text-slate-600 space-y-1.5 flex-1 min-w-0">
              <p className="font-medium text-slate-900">
                1. Dùng điện thoại quét mã QR để tham gia phòng Meet.
              </p>
              <p>
                2. Đặt điện thoại nghiêng <strong>45°</strong> bao quát: 2 bàn tay, bàn phím và màn hình máy tính.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={copyMeetUrl}
                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                >
                  <Copy className="size-3" /> Copy link Meet
                </button>
                <a
                  href={meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
                >
                  Mở Meet <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Readiness & Approval state */}
          <div className="pt-2 border-t border-slate-100">
            {!isCandidateReady ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full text-xs font-semibold"
                disabled={signalingReady}
                onClick={handleSignalReady}
              >
                <Smartphone className="size-3.5" />
                {signalingReady ? "Đang gửi tín hiệu..." : "Tôi đã vào Meet & đặt góc máy 45°"}
              </Button>
            ) : !isApproved ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200 animate-pulse">
                <Clock3 className="size-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Đang chờ Giám sát viên phê duyệt:</strong> HR đang kiểm tra góc máy điện thoại của bạn trên Meet. Nút làm bài sẽ tự mở khi được duyệt.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>Góc máy đã được phê duyệt!</strong> Bạn đã đủ điều kiện để bắt đầu bài thi.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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

      {ready && !isStrictMode && (
        <p className="text-sm text-[var(--color-primary)]" role="status">
          {t("candidate.assess.proctorGate.devicesReady")}
        </p>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={!accepted || preparing || busy || (ready && !isApproved)}
        onClick={() => void prepare()}
      >
        {!isApproved && ready ? (
          <Lock className="size-4" aria-hidden="true" />
        ) : (
          <ShieldCheck className="size-4" aria-hidden="true" />
        )}
        {preparing || busy
          ? ready
            ? t("candidate.assess.proctorGate.openingExam")
            : t("candidate.assess.proctorGate.checkingDevices")
          : ready
            ? isApproved
              ? buttonLabel
              : "Chờ Giám sát viên duyệt góc máy"
            : t("candidate.assess.proctorGate.checkDevicesButton")}
      </Button>
    </div>
  );
}
