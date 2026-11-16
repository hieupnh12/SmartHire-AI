import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  LockKeyhole,
  Pencil,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Video,
  X,
} from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import type { AiInterview } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { toast } from "@/stores/toastStore";
import { formatDateTime } from "./aiInterviewUi";

type Props = {
  interview: AiInterview;
  onRefresh: () => void;
};

const FRAUD_REASONS = [
  "Có tiếng người ngoài nhắc bài",
  "Ứng viên chạm vào bàn phím / chuột máy tính",
  "Camera điện thoại bị tắt hoặc che khuất góc quay",
  "Sử dụng tài liệu hoặc công cụ AI trái phép",
  "Tư thế ngồi không hợp lệ / Rời khỏi khung hình",
];

export function LiveProctoringPanel({ interview, onRefresh }: Props) {
  const defaultJitsiUrl = `https://meet.jit.si/smarthire-proctor-${interview.id}#config.prejoinPageEnabled=false&config.disableDeepLinking=true`;
  const [editingUrl, setEditingUrl] = useState(false);
  const [meetUrlInput, setMeetUrlInput] = useState(
    interview.proctorMeetUrl || defaultJitsiUrl
  );
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState(FRAUD_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  const meetUrl = interview.proctorMeetUrl || defaultJitsiUrl;
  const isApproved = !!interview.proctorApproved;
  const isTerminated = !!interview.proctorTerminated;
  const inProgress = interview.status === "IN_PROGRESS";
  const isFinished = !!interview.completedAt || ["SCORED", "PASSED", "FAILED"].includes(interview.status);

  // Approve Proctor Mutation
  const approve = useMutation({
    mutationFn: () => aiInterviewApi.approveProctorSetup(interview.id),
    onSuccess: () => {
      toast.success("Đã xác nhận góc quay đạt chuẩn! Ứng viên có thể bắt đầu phỏng vấn.");
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể phê duyệt góc quay");
    },
  });

  // Unapprove Proctor Mutation
  const unapprove = useMutation({
    mutationFn: () => aiInterviewApi.unapproveProctorSetup(interview.id),
    onSuccess: () => {
      toast.warning("Đã hủy duyệt. Yêu cầu ứng viên điều chỉnh lại góc quay điện thoại.");
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể hủy phê duyệt");
    },
  });

  // Update Meet URL Mutation
  const updateUrl = useMutation({
    mutationFn: (newUrl: string) => aiInterviewApi.updateProctorMeetLink(interview.id, newUrl),
    onSuccess: () => {
      toast.success("Đã cập nhật link phòng họp Google Meet!");
      setEditingUrl(false);
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể cập nhật link phòng họp");
    },
  });

  // Terminate for Fraud Mutation
  const terminate = useMutation({
    mutationFn: (reason: string) => aiInterviewApi.terminateByProctor(interview.id, reason),
    onSuccess: () => {
      toast.error("Đã dừng phiên phỏng vấn và ghi nhận vi phạm gian lận.");
      setShowTerminateDialog(false);
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể dừng phiên phỏng vấn");
    },
  });

  const copyMeetUrl = async () => {
    try {
      await navigator.clipboard.writeText(meetUrl);
      toast.success("Đã sao chép link Google Meet giám sát!");
    } catch {
      toast.error("Không thể sao chép link.");
    }
  };

  const handleConfirmTerminate = () => {
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    terminate.mutate(finalReason);
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950 dark:text-purple-300">
            <Video className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Giám sát Trực tiếp (Dual-Device)
            </h3>
            <p className="text-[11px] text-slate-400">
              Quan sát camera điện thoại ứng viên &amp; phê duyệt bắt đầu
            </p>
          </div>
        </div>

        {/* Live Badge */}
        {isTerminated ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-300">
            <Ban className="size-3" />
            Đã dừng (Gian lận)
          </span>
        ) : inProgress ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300 animate-pulse">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Đang thi (Zero-Touch)
          </span>
        ) : isApproved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="size-3" />
            Đã duyệt góc quay
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <LockKeyhole className="size-3" />
            Chờ duyệt góc quay
          </span>
        )}
      </div>

      {/* Terminated Notice if applicable */}
      {isTerminated && (
        <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50/90 p-3 text-xs text-rose-900">
          <p className="font-bold flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="size-4 text-rose-600" />
            Phiên đã bị Giám sát viên chấm dứt khẩn cấp
          </p>
          <p className="mt-1 text-slate-700 leading-relaxed">
            Lý do: <strong>{interview.proctorTerminationReason || "Phát hiện gian lận trong phiên"}</strong>
          </p>
        </div>
      )}

      {/* Video Proctor Room Box */}
      <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Smartphone className="size-3.5 text-[#0066FF]" />
            Phòng họp trực tuyến giám sát (Jitsi Meet):
          </span>
          {!editingUrl && !isFinished && (
            <button
              type="button"
              onClick={() => {
                setEditingUrl(true);
                setMeetUrlInput(meetUrl);
              }}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Pencil className="size-3" /> Đổi link Meet/Teams
            </button>
          )}
        </div>

        {editingUrl ? (
          <div className="flex items-center gap-2">
            <input
              type="url"
              className="h-8 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="https://meet.google.com/..."
              value={meetUrlInput}
              onChange={(e) => setMeetUrlInput(e.target.value)}
            />
            <Button
              size="sm"
              disabled={updateUrl.isPending || !meetUrlInput.trim()}
              onClick={() => updateUrl.mutate(meetUrlInput.trim())}
            >
              <Save className="size-3" /> Lưu
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingUrl(false)}>
              Hủy
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-xs">
            <a
              href={meetUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate font-mono text-blue-600 hover:underline"
              title={meetUrl}
            >
              {meetUrl}
            </a>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={copyMeetUrl}
                title="Sao chép liên kết"
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Copy className="size-3.5" />
              </button>
              <a
                href={meetUrl}
                target="_blank"
                rel="noreferrer"
                title="Tham gia phòng họp giám sát"
                className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 inline-flex items-center"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <a
            href={meetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex justify-center items-center gap-1.5 h-8 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900 transition-colors"
          >
            <Camera className="size-3.5" />
            Mở xem camera ứng viên (Jitsi Meet)
          </a>
        </div>
      </div>

      {/* Control Actions */}
      <div className="mt-4 space-y-2.5">
        {/* Approve / Unapprove Button */}
        {!isFinished && !interview.startedAt && (
          <div>
            {!isApproved ? (
              <Button
                variant="primary"
                size="md"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                disabled={approve.isPending}
                onClick={() => approve.mutate()}
              >
                <ShieldCheck className="size-4" />
                {approve.isPending ? "Đang phê duyệt..." : "Xác nhận góc quay đạt chuẩn (Phê duyệt)"}
              </Button>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50/70 border border-emerald-200 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Đã duyệt góc quay ({formatDateTime(interview.proctorApprovedAt)})
                </span>
                <button
                  type="button"
                  disabled={unapprove.isPending}
                  onClick={() => unapprove.mutate()}
                  className="font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Hủy duyệt
                </button>
              </div>
            )}
          </div>
        )}

        {/* Emergency Terminate Button (Active during IN_PROGRESS or before finish) */}
        {!isFinished && (
          <Button
            variant="danger"
            size="md"
            className="w-full font-bold shadow-xs flex items-center justify-center gap-2"
            onClick={() => setShowTerminateDialog(true)}
          >
            <Ban className="size-4" />
            Dừng phiên phỏng vấn (Phát hiện gian lận)
          </Button>
        )}
      </div>

      {/* Terminate Fraud Dialog Modal */}
      {showTerminateDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-rose-200 dark:border-rose-900 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-700">
                  <ShieldAlert className="size-6" />
                </span>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Dừng phiên phỏng vấn khẩn cấp
                  </h4>
                  <p className="text-xs text-slate-500">
                    Hệ thống sẽ ngay lập tức ngắt phiên thi của ứng viên và đánh dấu FAILED.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTerminateDialog(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Chọn lý do gian lận phát hiện:
              </label>
              <div className="space-y-2">
                {FRAUD_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? "border-rose-300 bg-rose-50/70 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fraudReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-rose-600 size-3.5"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="pt-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Chi tiết vi phạm khác (tùy chọn):
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  rows={2}
                  placeholder="Mô tả cụ thể vi phạm quan sát được qua camera hoặc âm thanh..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowTerminateDialog(false)}
                disabled={terminate.isPending}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled={terminate.isPending}
                onClick={handleConfirmTerminate}
              >
                {terminate.isPending ? "Đang xử lý dừng phiên..." : "Xác nhận Dừng & Đánh trượt"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

