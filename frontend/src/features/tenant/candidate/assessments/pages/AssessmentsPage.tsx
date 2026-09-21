import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { StatusPill } from "@/components/ux/StatusPill";
import { button, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import {
  assignmentStatusLabel,
  mockAssignments,
} from "@/features/tenant/candidate/assessments/constants/mockAssignments";

export function AssessmentsPage() {
  const open = mockAssignments.filter((row) => row.status === "ASSIGNED" || row.status === "IN_PROGRESS");
  const done = mockAssignments.filter((row) => row.status === "SUBMITTED" || row.status === "GRADED");

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Bài kiểm tra kỹ thuật</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Làm trắc nghiệm theo đề recruiter giao cho từng đơn ứng tuyển. Thời gian đếm từ lúc bắt đầu.
        </p>
      </header>

      <PrototypeBanner note="candidate làm MCQ · coding bổ sung sau" />

      <div className={`${panel} space-y-4`}>
        <h2 className="text-lg font-semibold">Cần làm</h2>
        {open.length === 0 && (
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
            <p className={muted}>Chưa có bài được giao. Khi recruiter giao đề, bài sẽ hiện ở đây.</p>
          </div>
        )}
        <ul className="space-y-3">
          {open.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] p-4"
            >
              <div>
                <p className="font-semibold">{row.testTitle}</p>
                <p className={muted}>
                  {row.jobTitle} · {row.durationMinutes} phút · Đơn #{row.applicationId}
                </p>
                <div className="mt-2">
                  <StatusPill status={row.status} label={assignmentStatusLabel[row.status]} />
                </div>
              </div>
              <Link className={primary} to={`/candidate/assessments/${row.id}/take`}>
                {row.status === "IN_PROGRESS" ? "Tiếp tục" : "Bắt đầu làm"}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={`${panel} space-y-4`}>
        <h2 className="text-lg font-semibold">Đã nộp / có điểm</h2>
        {done.length === 0 && <p className={muted}>Chưa có bài đã nộp.</p>}
        <ul className="space-y-3">
          {done.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3"
            >
              <div>
                <p className="font-medium">{row.testTitle}</p>
                <p className={muted}>
                  {row.jobTitle} · {row.score == null ? "Chờ chấm" : `Điểm ${row.score}%`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={row.status} label={assignmentStatusLabel[row.status]} />
                <Link className={button} to={`/candidate/applications/${row.applicationId}`}>
                  Xem trong đơn
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
