import { Link } from "react-router-dom";
import { Bot, ClipboardList, FileSearch } from "lucide-react";
import type { GateScoreView, ScreeningRoundsView } from "@/api/types/applicant";
import { button, muted, scoreText } from "@/features/tenant/recruiter/matching/components/rankingUi";

const row = "flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 py-3";
const chip = "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium";
const passChip = `${chip} bg-[var(--color-primary-container)] text-[var(--color-on-primary)]`;
const waitChip = `${chip} bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]`;
const failChip = `${chip} bg-[var(--color-tertiary-container)] text-[var(--color-on-primary)]`;

const cvLabel: Record<string, string> = {
  MISSING: "Chưa có điểm",
  PASSED: "Đạt",
  FAILED: "Chưa đạt",
};
const aiLabel: Record<string, string> = {
  MISSING: "Chưa có phiên",
  INVITED: "Đã gửi lời mời",
  CREATED: "Đã tạo phiên",
  QUESTIONS_READY: "Sẵn sàng câu hỏi",
  IN_PROGRESS: "Đang phỏng vấn",
  SCORING: "Đang chấm",
  SCORED: "Đã chấm",
  FAILED: "Lỗi phiên",
};
const testLabel: Record<string, string> = {
  MISSING: "Chưa làm bài",
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  GRADED: "Đã chấm",
  EXPIRED: "Hết hạn",
};

export function ApplicantRounds({
  rounds,
  gate,
}: {
  rounds?: ScreeningRoundsView | null;
  gate?: GateScoreView | null;
}) {
  const invited = rounds?.aiInterviewInvitedAt
    ? new Date(rounds.aiInterviewInvitedAt).toLocaleString("vi-VN")
    : null;
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">Kết quả vòng</p>
        <p className={muted}>Điểm thật từ CV, phỏng vấn AI và bài kiểm tra — không dùng dữ liệu mẫu.</p>
      </div>
      <ul className="space-y-2">
        <li className={row}>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <FileSearch className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              Sàng lọc CV
            </p>
            <p className={muted}>
              {rounds?.cv.score != null ? `${scoreText(rounds.cv.score)} / 100` : "Chưa phân tích"}
              {rounds?.cv.threshold != null ? ` · ngưỡng ${scoreText(rounds.cv.threshold)}` : ""}
            </p>
          </div>
          <span className={tone(rounds?.cv.status, rounds?.cv.passed)}>{cvLabel[rounds?.cv.status ?? "MISSING"] ?? rounds?.cv.status}</span>
        </li>
        <li className={row}>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <Bot className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              Phỏng vấn AI
            </p>
            <p className={muted}>
              {rounds?.aiInterview.score != null ? `${scoreText(rounds.aiInterview.score)} / 100` : "Chưa có điểm"}
              {invited ? ` · gửi lúc ${invited}` : rounds?.cv.passed ? " · sẽ gửi mail khi SMTP sẵn sàng" : ""}
            </p>
          </div>
          <span className={tone(rounds?.aiInterview.status, rounds?.aiInterview.passed)}>{aiLabel[rounds?.aiInterview.status ?? "MISSING"] ?? rounds?.aiInterview.status}</span>
        </li>
        <li className={row}>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <ClipboardList className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              Bài kiểm tra
            </p>
            <p className={muted}>
              {rounds?.assessment.score != null ? `${scoreText(rounds.assessment.score)} / 100` : "Chưa có điểm"}
            </p>
          </div>
          <span className={tone(rounds?.assessment.status, rounds?.assessment.passed)}>{testLabel[rounds?.assessment.status ?? "MISSING"] ?? rounds?.assessment.status}</span>
        </li>
      </ul>
      {gate && (
        <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">Vòng gửi xe</p>
            <p className="font-mono text-xl">{scoreText(gate.score)}</p>
          </div>
          <p className={`mt-1 ${muted}`}>
            {gate.complete ? (gate.passed ? "Đạt ngưỡng tổng" : "Chưa đạt ngưỡng tổng") : "Chưa đủ điểm CV / phỏng vấn AI / assessment"}
            {gate.passThreshold != null ? ` · ngưỡng ${scoreText(gate.passThreshold)}` : ""}
          </p>
          <p className={`mt-1 ${muted}`}>
            CV {gate.cvScore ?? "—"} × {gate.cvWeight ?? "—"}%
            {" · "}AI {gate.aiInterviewScore ?? "—"} × {gate.aiInterviewWeight ?? "—"}%
            {" · "}Assessment {gate.assessmentScore ?? "—"} × {gate.assessmentWeight ?? "—"}%
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link className={button} to="/recruiter/assessments">Quản lý đề</Link>
        <Link className={button} to="/recruiter/interviews">Phỏng vấn AI</Link>
        <Link className={button} to="/recruiter/schedules">Đặt lịch PV</Link>
      </div>
    </div>
  );
}

function tone(status?: string, passed?: boolean | null) {
  if (passed === true || status === "PASSED" || status === "SCORED" || status === "GRADED" || status === "INVITED") {
    return passChip;
  }
  if (passed === false || status === "FAILED" || status === "EXPIRED") return failChip;
  return waitChip;
}
