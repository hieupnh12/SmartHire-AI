import { Link, useParams } from "react-router-dom";
import { Bot, CalendarDays, ClipboardList } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { StatusPill } from "@/components/ux/StatusPill";
import { button, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { assignmentStatusLabel } from "@/features/tenant/candidate/assessments/constants/mockAssignments";
import {
  interviewModeLabel,
  interviewStatusLabel,
} from "@/features/tenant/candidate/schedules/constants/mockInterviews";

/** Skeleton application hub: AI / Technical test / Official interview — one place to see next actions. */
export function ApplicationDetailPage() {
  const { id } = useParams();
  const applicationId = id ?? "501";

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="space-y-3">
        <Link className={`${button} w-fit`} to="/candidate/applications">
          ← Đơn của tôi
        </Link>
        <div>
          <p className={muted}>Đơn ứng tuyển #{applicationId}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Backend Engineer</h1>
          <p className={`mt-2 max-w-2xl ${muted}`}>
            Ba mục đánh giá gắn với đơn này. Trạng thái vòng đơn ≠ trạng thái phiên AI / bài test / lịch PV.
          </p>
        </div>
      </header>

      <PrototypeBanner note="hub sơ khai · dữ liệu mock cố định để hình dung luồng" />

      <div className="grid gap-4 lg:grid-cols-3">
        <article className={`${panel} flex flex-col gap-4`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Đánh giá AI</h2>
            </div>
            <StatusPill status="NOT_STARTED" label="Chưa mở" />
          </div>
          <p className={muted}>
            Phỏng vấn AI đầu vào theo JD. Chưa triển khai — giữ chỗ để nối sau technical test.
          </p>
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Kết quả sẽ lưu tiêu chí + nhận xét; chưa tự loại ứng viên.
          </p>
          <Link className={button} to="/candidate/interviews">
            Xem module AI
          </Link>
        </article>

        <article className={`${panel} flex flex-col gap-4`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Bài kiểm tra</h2>
            </div>
            <StatusPill status="ASSIGNED" label={assignmentStatusLabel.ASSIGNED} />
          </div>
          <p className="font-medium">Java & SQL — vòng kỹ thuật</p>
          <p className={muted}>45 phút · trắc nghiệm · có thể giao trước hoặc trong interview chính thức.</p>
          <div className="mt-auto flex flex-wrap gap-2">
            <Link className={primary} to="/candidate/assessments/12/take">
              Bắt đầu làm
            </Link>
            <Link className={button} to="/candidate/assessments">
              Tất cả bài test
            </Link>
          </div>
        </article>

        <article className={`${panel} flex flex-col gap-4`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Lịch phỏng vấn</h2>
            </div>
            <StatusPill status="PENDING" label={interviewStatusLabel.PENDING} />
          </div>
          <p className="font-medium">
            {interviewModeLabel.ONLINE} · 23/09/2026 10:00
          </p>
          <p className={muted}>Interviewer: Lê Minh · cần xác nhận tham dự.</p>
          <div className="mt-auto flex flex-wrap gap-2">
            <Link className={primary} to="/candidate/schedules">
              Xác nhận lịch
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
