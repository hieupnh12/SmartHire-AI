import type { ReactNode } from "react";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clock,
  Hourglass,
  Send,
  ShieldCheck,
  X,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { assessmentMuted as muted } from "@/components/ux/assessmentUi";
import { MOCK_EXAM_META, formatExamClock, type MockExamQuestion } from "../constants/mockExam";

type Props = {
  open: boolean;
  questions: MockExamQuestion[];
  answers: Record<number, string | null>;
  bookmarked: Set<number>;
  remainingSeconds: number;
  submitting: boolean;
  onClose: () => void;
  onJumpTo: (index: number) => void;
  onConfirm: () => void;
};

export function AssessmentSubmitModal({
  open,
  questions,
  answers,
  bookmarked,
  remainingSeconds,
  submitting,
  onClose,
  onJumpTo,
  onConfirm,
}: Props) {
  if (!open) return null;

  const answeredIds = questions.filter((q) => answers[q.id] != null).map((q) => q.id);
  const unansweredIds = questions.filter((q) => answers[q.id] == null).map((q) => q.id);
  const flaggedIds = questions.filter((q) => bookmarked.has(q.id)).map((q) => q.id);
  const pct = Math.round((answeredIds.length / questions.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-inverse-surface,#213145)]/60 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-[var(--color-surface-card)] shadow-[0_20px_50px_rgba(11,28,48,0.25)]">
        <div className="flex items-start justify-between px-6 py-5 md:px-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-fixed,#d8e2ff)] text-[var(--color-primary)] shadow-sm">
              <ClipboardCheck className="size-7" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="submit-modal-title" className="text-xl font-semibold text-[var(--color-on-surface)] md:text-2xl">
                  Xác nhận nộp bài thi
                </h2>
                <span className={`rounded-full bg-[var(--color-surface-container)] px-2 py-0.5 text-[11px] font-semibold ${muted}`}>
                  Đợt 1
                </span>
              </div>
              <p className={`mt-0.5 text-sm ${muted}`}>
                {MOCK_EXAM_META.title}{" "}
                <span className="text-[var(--color-outline)]">•</span>{" "}
                <span className="font-mono font-medium text-[var(--color-on-surface)]">Mã đề: {MOCK_EXAM_META.code}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
            aria-label="Đóng cửa sổ"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex max-h-[calc(85vh-140px)] flex-col gap-5 overflow-y-auto px-6 pb-5 md:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Đã làm"
              icon={<CheckCircle2 className="size-[18px] text-[var(--color-primary)]" aria-hidden="true" />}
              value={String(answeredIds.length).padStart(2, "0")}
              suffix={`/ ${questions.length}`}
              footer={`${pct}% hoàn thành`}
              tone="primary"
            />
            <StatCard
              label="Chưa trả lời"
              icon={<Clock className="size-[18px] text-[#ba1a1a]" aria-hidden="true" />}
              value={String(unansweredIds.length).padStart(2, "0")}
              suffix="câu"
              footer={unansweredIds.length ? unansweredIds.map((id) => `Câu ${id}`).join(", ") : "Không còn câu trống"}
              tone="error"
            />
            <StatCard
              label="Đang xem lại"
              icon={<Bookmark className="size-[18px] text-[var(--color-tertiary)]" aria-hidden="true" />}
              value={String(flaggedIds.length).padStart(2, "0")}
              suffix="câu"
              footer={flaggedIds.length ? flaggedIds.map((id) => `Câu ${id}`).join(", ") : "Không đánh dấu"}
              tone="flag"
            />
            <StatCard
              label="Thời gian còn"
              icon={<Hourglass className="size-[18px] text-[var(--color-on-surface-variant)]" aria-hidden="true" />}
              value={formatExamClock(remainingSeconds)}
              suffix=""
              footer={`Tổng số: ${MOCK_EXAM_META.durationMinutes} phút`}
              tone="neutral"
              mono
            />
          </div>

          {(unansweredIds.length > 0 || flaggedIds.length > 0) && (
            <div className="flex items-start gap-4 rounded-xl bg-[#ffdad6]/30 p-4">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ffdad6] text-[#93000a]">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-on-surface)]">Khuyến cáo quan trọng</h3>
                <p className={`mt-0.5 text-sm leading-relaxed ${muted}`}>
                  Bạn vẫn còn{" "}
                  {unansweredIds.length > 0 && (
                    <strong className="font-semibold text-[#ba1a1a]">{unansweredIds.length} câu hỏi chưa chọn đáp án</strong>
                  )}
                  {unansweredIds.length > 0 && flaggedIds.length > 0 && " và "}
                  {flaggedIds.length > 0 && (
                    <strong className="font-semibold text-[var(--color-tertiary)]">
                      {flaggedIds.length} câu hỏi đang đánh dấu xem lại
                    </strong>
                  )}
                  . Khi đã xác nhận nộp, hệ thống sẽ chốt điểm ngay lập tức. Bạn không thể quay lại chỉnh sửa hoặc làm lại bài thi.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-on-surface)]">Bảng trạng thái câu hỏi</span>
                <span className={`text-xs ${muted}`}>(Bấm vào số câu để xem lại trước khi nộp)</span>
              </div>
              <div className={`flex flex-wrap items-center gap-3 text-[11px] ${muted}`}>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-[var(--color-primary)]" /> Đã chọn
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-[var(--color-tertiary-container)]" /> Đánh dấu
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-[var(--color-surface-container-highest)]" /> Trống
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {questions.map((q, index) => {
                const answered = answers[q.id] != null;
                const flagged = bookmarked.has(q.id);
                const empty = !answered;
                let className =
                  "relative flex h-9 items-center justify-center rounded-lg font-mono text-xs font-semibold transition-all";
                if (empty) {
                  className += " animate-pulse bg-[#ffdad6]/60 font-bold text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white";
                } else if (flagged) {
                  className +=
                    " bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary,#fff)] hover:opacity-90";
                } else {
                  className +=
                    " bg-[var(--color-primary-fixed,#d8e2ff)] text-[var(--color-on-primary-fixed,#00174b)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary,#fff)]";
                }
                return (
                  <button
                    key={q.id}
                    type="button"
                    className={className}
                    title={empty ? `Câu ${q.id}: Chưa làm` : flagged ? `Câu ${q.id}: Đánh dấu xem lại` : `Câu ${q.id}: Đã làm`}
                    onClick={() => onJumpTo(index)}
                  >
                    {String(q.id).padStart(2, "0")}
                    {flagged && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-[var(--color-tertiary)] shadow-sm" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-container)] px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="size-2.5 animate-ping rounded-full bg-[var(--color-primary)]" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-semibold text-[var(--color-on-surface)]">Đồng bộ đám mây tức thời:</span>
                <span className={`text-xs ${muted}`}>
                  {answeredIds.length} câu trả lời đã lưu an toàn trên máy chủ. Không có dữ liệu chờ.
                </span>
              </div>
            </div>
            <span className="rounded bg-[var(--color-surface-card)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-primary)] shadow-sm">
              {MOCK_EXAM_META.syncCode}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 bg-[var(--color-surface-container-low)] px-6 py-5 sm:flex-row md:px-8">
          <div className={`flex items-center gap-1.5 text-xs ${muted}`}>
            <ShieldCheck className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            <span>SSL 256-bit • Mã hóa chữ ký thời gian thi SmartHire Vault</span>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button variant="secondary" onClick={onClose}>
              <ArrowLeft className="size-[18px]" aria-hidden="true" />
              Kiểm tra câu chưa làm
            </Button>
            <Button disabled={submitting} onClick={onConfirm}>
              {submitting ? (
                <>
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang nộp bài...
                </>
              ) : (
                <>
                  Nộp bài ngay
                  <Send className="size-[18px]" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  icon,
  value,
  suffix,
  footer,
  tone,
  mono,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  suffix: string;
  footer: string;
  tone: "primary" | "error" | "flag" | "neutral";
  mono?: boolean;
}) {
  const bg =
    tone === "error"
      ? "bg-[#ffdad6]/30 hover:bg-[#ffdad6]/40"
      : tone === "flag"
        ? "bg-[var(--color-secondary-container,#dae2fd)]/50 hover:bg-[var(--color-secondary-container,#dae2fd)]/70"
        : tone === "primary"
          ? "bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)]"
          : "bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)]";
  const valueClass =
    tone === "error"
      ? "text-[#ba1a1a]"
      : tone === "flag"
        ? "text-[var(--color-tertiary)]"
        : "text-[var(--color-on-surface)]";

  return (
    <div className={`flex flex-col justify-between rounded-xl p-4 transition-colors ${bg}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold tracking-tight ${mono ? "font-mono" : ""} ${valueClass}`}>{value}</span>
        {suffix && <span className={`text-sm ${muted}`}>{suffix}</span>}
      </div>
      <div className={`mt-1 text-[11px] font-medium ${tone === "primary" ? "text-[var(--color-primary)]" : muted}`}>
        {tone === "primary" && <span className="mr-1 inline-block size-2 rounded-full bg-[var(--color-primary)]" />}
        {footer}
      </div>
    </div>
  );
}
