import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Mic, MicOff, PanelRightClose, PanelRightOpen, Video, VideoOff } from "lucide-react";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { HumanInterviewScorecardPanel } from "@/features/tenant/recruiter/interviews/components/HumanInterviewScorecardPanel";
import { getApiErrorMessage } from "@/lib/axios";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils";
import { humanMeetingEngine, jitsiDomain, jitsiRoomName } from "./meetingEngine";
import { useSmartHireMeeting } from "./useSmartHireMeeting";

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
  const { interviewId: rawId } = useParams<{ interviewId: string }>();
  const interviewId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : NaN;
  const navigate = useNavigate();
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const displayName = user?.fullName?.trim() || user?.email || "SmartHire Guest";
  const isCandidate = user?.role === "CANDIDATE";
  const engine = humanMeetingEngine();
  const [scorecardOpen, setScorecardOpen] = useState(!isCandidate);

  const interview = useQuery({
    queryKey: ["human-interview", interviewId],
    queryFn: () => humanInterviewApi.get(interviewId),
    enabled: Number.isFinite(interviewId),
    refetchInterval: scorecardOpen ? 15_000 : false,
  });

  const meeting = useSmartHireMeeting({
    interviewId,
    displayName,
    enabled: Number.isFinite(interviewId) && interview.isSuccess && engine === "peerjs",
  });

  const evaluate = useMutation({
    mutationFn: (body: Parameters<typeof humanInterviewApi.evaluate>[1]) => humanInterviewApi.evaluate(interviewId, body),
    onSuccess: async () => {
      toast.success("Đã lưu phiếu đánh giá.");
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
        <p>Link phòng họp không hợp lệ.</p>
      </div>
    );
  }

  if (interview.isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md space-y-3">
          <p className="text-lg font-semibold">Không vào được phòng họp</p>
          <p className="text-sm text-slate-300">{getApiErrorMessage(interview.error)}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>Quay lại</Button>
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">SmartHire Meeting</p>
          {interview.isPending ? (
            <Skeleton className="mt-1 h-5 w-48 bg-white/20" />
          ) : (
            <h1 className="truncate text-sm font-semibold sm:text-base">
              {row?.jobTitle ?? "Phỏng vấn trực tiếp"} · {row?.candidateName}
            </h1>
          )}
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {engine === "jitsi" ? `Jitsi · ${jitsiDomain()}` : meeting.status}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isCandidate && (
            <button
              type="button"
              onClick={() => setScorecardOpen((v) => !v)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-600/90 px-3 text-xs font-semibold hover:bg-sky-500"
            >
              {scorecardOpen ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
              <ClipboardList className="size-3.5" aria-hidden="true" />
              Phiếu đánh giá
            </button>
          )}
          <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] sm:inline-flex">
            <Video className="size-3.5" aria-hidden="true" />
            Live · không ghi hình
          </span>
          <Link
            to={backTo}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold hover:bg-white/15"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Thoát phòng
          </Link>
        </div>
      </header>

      <div className={cn("flex min-h-0 flex-1", scorecardOpen && !isCandidate ? "flex-col lg:flex-row" : "flex-col")}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            {engine === "jitsi" ? (
              jitsiSrc ? (
                <iframe
                  title="Phòng phỏng vấn Jitsi"
                  src={jitsiSrc}
                  allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                  className="h-full w-full rounded-xl border-0 bg-black"
                  allowFullScreen
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-300">Đang mở Jitsi…</div>
              )
            ) : meeting.error ? (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-md space-y-2">
                  <p className="font-semibold text-red-300">Không kết nối được phòng họp</p>
                  <p className="text-sm text-slate-300">{meeting.error}</p>
                </div>
              </div>
            ) : (
              <div className={cn("grid h-full gap-3", gridClass)}>
                <VideoTile stream={meeting.localStream} label={`${displayName} (Bạn)${meeting.isHost ? " · mở phòng" : ""}`} muted mirror />
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
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold",
                  meeting.micOn ? "bg-white/10 hover:bg-white/15" : "bg-red-600 hover:bg-red-500",
                )}
              >
                {meeting.micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                {meeting.micOn ? "Tắt mic" : "Bật mic"}
              </button>
              <button
                type="button"
                onClick={meeting.toggleCam}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold",
                  meeting.camOn ? "bg-white/10 hover:bg-white/15" : "bg-red-600 hover:bg-red-500",
                )}
              >
                {meeting.camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
                {meeting.camOn ? "Tắt camera" : "Bật camera"}
              </button>
            </footer>
          )}
        </div>

        {scorecardOpen && !isCandidate && row && (
          <aside className="flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden border-t border-white/10 bg-white text-slate-900 lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Scorecard live</p>
                <p className="text-sm font-semibold">Chấm trong lúc phỏng vấn</p>
              </div>
              <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" onClick={() => setScorecardOpen(false)}>
                Ẩn
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <HumanInterviewScorecardPanel interview={row} pending={evaluate.isPending} onSubmit={(v) => evaluate.mutate(v)} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
