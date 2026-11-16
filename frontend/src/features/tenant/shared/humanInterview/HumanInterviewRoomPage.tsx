import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  LoaderCircle,
  Mic,
  MicOff,
  PanelRightClose,
  PanelRightOpen,
  Radio,
  Square,
  Upload,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { HumanInterviewScorecardPanel } from "@/features/tenant/recruiter/interviews/components/HumanInterviewScorecardPanel";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils";
import { humanMeetingEngine, jitsiDomain, jitsiRoomName } from "./meetingEngine";
import { useSmartHireMeeting } from "./useSmartHireMeeting";

function formatDurationSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function VideoTile({ stream, label, muted, mirror }: { stream: MediaStream | null; label: string; muted?: boolean; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative min-h-0 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10">
      <video ref={ref} autoPlay playsInline muted={muted} className={cn("h-full w-full object-cover", mirror && "scale-x-[-1]")} />
      <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium">{label}</span>
    </div>
  );
}

export function HumanInterviewRoomPage() {
  const t = useT();
  const { interviewId: rawId } = useParams<{ interviewId: string }>();
  const interviewId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : NaN;
  const navigate = useNavigate();
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const displayName = user?.fullName?.trim() || user?.email || t("candidate.assess.humanMeeting.guestFallback");
  const isCandidate = user?.role === "CANDIDATE";
  const engine = humanMeetingEngine();
  const [scorecardOpen, setScorecardOpen] = useState(!isCandidate);

  // Recording State (Phương án 2: Trình ghi hình trực tiếp MediaRecorder trong SmartHire Room)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);

  // Timer for recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Clean up recording stream on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
      }
    };
  }, [recordedBlobUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
      });

      recordingStreamRef.current = stream;
      recordedChunksRef.current = [];

      let mimeType = "video/webm;codecs=vp9,opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "video/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const pureType = mimeType.split(";")[0] || "video/webm";
        const blob = new Blob(recordedChunksRef.current, { type: pureType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        setPreviewModalOpen(true);
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
        };
      }

      recorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);
      toast.info("Đã bắt đầu ghi hình SmartHire Room (màn hình & âm thanh cuộc họp).");
    } catch (err) {
      console.error("Recording start failed:", err);
      toast.error(t("candidate.assess.humanMeeting.recordPermissionError"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDownloadRecordedBlob = () => {
    if (!recordedBlob) return;
    const url = recordedBlobUrl || URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smarthire-room-session-${interviewId}-${Date.now()}.webm`;
    a.click();
    toast.success("Đang tải tệp ghi hình về máy tính...");
  };

  const handleSaveToInterview = async () => {
    if (!recordedBlob) return;
    setIsSavingRecording(true);
    try {
      await humanInterviewApi.uploadRecording(interviewId, recordedBlob, "SMARTHIRE_RECORDER");
      toast.success(t("candidate.assess.humanMeeting.saveSuccess"));
      await client.invalidateQueries({ queryKey: ["human-interview", interviewId] });
      await client.invalidateQueries({ queryKey: ["human-interviews"] });
      setPreviewModalOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsSavingRecording(false);
    }
  };

  const interview = useQuery({
    queryKey: ["human-interview", interviewId],
    queryFn: () => humanInterviewApi.get(interviewId),
    enabled: Number.isFinite(interviewId),
    refetchInterval: scorecardOpen ? 15_000 : false,
  });

  const isExpired = interview.data
    ? new Date(interview.data.end).getTime() < Date.now()
    : false;

  const meeting = useSmartHireMeeting({
    interviewId,
    displayName,
    enabled: Number.isFinite(interviewId) && interview.isSuccess && engine === "peerjs" && !isExpired,
  });

  const evaluate = useMutation({
    mutationFn: (body: Parameters<typeof humanInterviewApi.evaluate>[1]) => humanInterviewApi.evaluate(interviewId, body),
    onSuccess: async () => {
      toast.success(t("candidate.assess.humanMeeting.scorecardSaved"));
      await client.invalidateQueries({ queryKey: ["human-interview", interviewId] });
      await client.invalidateQueries({ queryKey: ["human-interviews"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const jitsiSrc = useMemo(() => {
    if (!interview.data || engine !== "jitsi") return null;
    const room = jitsiRoomName(interview.data.id, interview.data.jobId);
    const domain = jitsiDomain();
    return `https://${domain}/${encodeURIComponent(room)}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinConfig.enabled=true&config.disableDeepLinking=true`;
  }, [interview.data, displayName, engine]);

  if (!Number.isFinite(interviewId)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-white">
        <p>{t("candidate.assess.humanMeeting.invalidRoomLink")}</p>
      </div>
    );
  }

  if (interview.isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md space-y-3">
          <p className="text-lg font-semibold">{t("candidate.assess.humanMeeting.cannotJoinTitle")}</p>
          <p className="text-sm text-slate-300">{getApiErrorMessage(interview.error)}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>{t("candidate.assess.humanMeeting.backButton")}</Button>
        </div>
      </div>
    );
  }

  if (interview.isSuccess && isExpired) {
    const backToExpired = isCandidate
      ? "/interview-schedules"
      : `/recruiter/jobs/${interview.data.jobId}/interviews`;
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md space-y-3">
          <p className="text-2xl">⏰</p>
          <p className="text-lg font-semibold">{t("candidate.assess.humanMeeting.endedTitle")}</p>
          <p className="text-sm text-slate-300">
            {t("candidate.assess.humanMeeting.endedDesc")}
          </p>
          <Button variant="secondary" onClick={() => navigate(backToExpired)}>
            {t("candidate.assess.humanMeeting.backToList")}
          </Button>
        </div>
      </div>
    );
  }

  const row = interview.data;
  const backTo = row
    ? (isCandidate ? "/interview-schedules" : `/recruiter/jobs/${row.jobId}/interviews`)
    : "/";
  const tiles = meeting.remotes.length + (meeting.localStream ? 1 : 0);
  const gridClass = tiles <= 1 ? "grid-cols-1" : tiles === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">{t("candidate.assess.humanMeeting.eyebrow")}</p>
          {interview.isPending ? (
            <Skeleton className="mt-1 h-5 w-48 bg-white/20" />
          ) : (
            <h1 className="truncate text-sm font-semibold sm:text-base">
              {row?.jobTitle ?? t("candidate.assess.humanMeeting.defaultRoomTitle")} · {row?.candidateName}
            </h1>
          )}
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {engine === "jitsi"
              ? t("candidate.assess.humanMeeting.jitsiProvider", { domain: jitsiDomain() })
              : meeting.status}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Recording Control (SmartHire Room Phương án 2) */}
          {engine === "peerjs" && (
            isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white shadow-md hover:bg-rose-500 animate-pulse transition-all cursor-pointer"
                title={t("candidate.assess.humanMeeting.stopRecord")}
              >
                <Square className="size-3.5 fill-white" />
                <span>{t("candidate.assess.humanMeeting.recordingActive")} ({formatDurationSeconds(recordingSeconds)})</span>
                <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {t("candidate.assess.humanMeeting.stopRecord")}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20 hover:border-white/20 transition-all cursor-pointer"
                title="Bắt đầu ghi hình buổi phỏng vấn trực tiếp bằng SmartHire Room"
              >
                <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                <Radio className="size-3.5 text-rose-400" />
                <span>{t("candidate.assess.humanMeeting.startRecord")}</span>
              </button>
            )
          )}

          {!isCandidate && (
            <button
              type="button"
              onClick={() => setScorecardOpen((v) => !v)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-600/90 px-3 text-xs font-semibold hover:bg-sky-500 transition-colors"
            >
              {scorecardOpen ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
              <ClipboardList className="size-3.5" aria-hidden="true" />
              {t("candidate.assess.humanMeeting.scorecardButton")}
            </button>
          )}

          <Link
            to={backTo}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold hover:bg-white/15 transition-colors"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t("candidate.assess.humanMeeting.exitRoom")}
          </Link>
        </div>
      </header>

      <div className={cn("flex min-h-0 flex-1", scorecardOpen && !isCandidate ? "flex-col lg:flex-row" : "flex-col")}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            {engine === "jitsi" ? (
              jitsiSrc ? (
                <iframe
                  title={t("candidate.assess.humanMeeting.jitsiFrameTitle")}
                  src={jitsiSrc}
                  allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                  className="h-full w-full rounded-xl border-0 bg-black"
                  allowFullScreen
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-300">{t("candidate.assess.humanMeeting.openingJitsi")}</div>
              )
            ) : meeting.error ? (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-md space-y-2">
                  <p className="font-semibold text-red-300">{t("candidate.assess.humanMeeting.connectionErrorTitle")}</p>
                  <p className="text-sm text-slate-300">{meeting.error}</p>
                </div>
              </div>
            ) : (
              <div className={cn("grid h-full gap-3", gridClass)}>
                <VideoTile
                  stream={meeting.localStream}
                  label={
                    meeting.isHost
                      ? t("candidate.assess.humanMeeting.localTileHostLabel", { name: displayName })
                      : t("candidate.assess.humanMeeting.localTileLabel", { name: displayName })
                  }
                  muted
                  mirror
                />
                {meeting.remotes.map((remote) => (
                  <VideoTile key={remote.peerId} stream={remote.stream} label={remote.name} />
                ))}
              </div>
            )}
          </div>

          {engine === "peerjs" && (
            <footer className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={meeting.toggleMic}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold cursor-pointer transition-colors",
                  meeting.micOn ? "bg-white/10 hover:bg-white/15" : "bg-red-600 hover:bg-red-500",
                )}
              >
                {meeting.micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                {meeting.micOn ? t("candidate.assess.humanMeeting.muteMic") : t("candidate.assess.humanMeeting.unmuteMic")}
              </button>
              <button
                type="button"
                onClick={meeting.toggleCam}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold cursor-pointer transition-colors",
                  meeting.camOn ? "bg-white/10 hover:bg-white/15" : "bg-red-600 hover:bg-red-500",
                )}
              >
                {meeting.camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
                {meeting.camOn ? t("candidate.assess.humanMeeting.turnOffCam") : t("candidate.assess.humanMeeting.turnOnCam")}
              </button>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold cursor-pointer transition-colors",
                  isRecording ? "bg-rose-600 hover:bg-rose-500 animate-pulse text-white shadow-lg" : "bg-white/10 hover:bg-white/15 text-white",
                )}
              >
                {isRecording ? <Square className="size-4 fill-white" /> : <Radio className="size-4 text-rose-400" />}
                {isRecording
                  ? `${t("candidate.assess.humanMeeting.stopRecord")} (${formatDurationSeconds(recordingSeconds)})`
                  : t("candidate.assess.humanMeeting.startRecord")}
              </button>
            </footer>
          )}
        </div>

        {scorecardOpen && !isCandidate && row && (
          <aside className="flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden border-t border-white/10 bg-white text-slate-900 lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{t("candidate.assess.humanMeeting.scorecardEyebrow")}</p>
                <p className="text-sm font-semibold">{t("candidate.assess.humanMeeting.scorecardSubtitle")}</p>
              </div>
              <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer" onClick={() => setScorecardOpen(false)}>
                {t("candidate.assess.humanMeeting.hideScorecard")}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <HumanInterviewScorecardPanel interview={row} pending={evaluate.isPending} onSubmit={(v) => evaluate.mutate(v)} />
            </div>
          </aside>
        )}
      </div>

      {/* Modal Hoàn tất ghi hình SmartHire Room (Phương án 2) */}
      {previewModalOpen && recordedBlob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{t("candidate.assess.humanMeeting.recordingModalTitle")}</h3>
                  <p className="text-xs text-slate-400">
                    Thời lượng: {formatDurationSeconds(recordingSeconds)} · Dung lượng: {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="p-5 space-y-3.5">
              {recordedBlobUrl && (
                <div className="aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
                  <video src={recordedBlobUrl} controls playsInline className="h-full w-full object-contain" />
                </div>
              )}
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("candidate.assess.humanMeeting.recordingModalDesc")}
              </p>
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-800 bg-slate-950/40 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleDownloadRecordedBlob}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>{t("candidate.assess.humanMeeting.downloadLocal")}</span>
              </button>
              <button
                type="button"
                disabled={isSavingRecording}
                onClick={handleSaveToInterview}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSavingRecording ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                <span>{isSavingRecording ? t("candidate.assess.humanMeeting.saving") : t("candidate.assess.humanMeeting.saveToInterview")}</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
