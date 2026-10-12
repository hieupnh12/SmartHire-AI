import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, BriefcaseBusiness, CalendarDays, ChevronDown, ClipboardList, MapPin } from "lucide-react";
import type { RoundItemView } from "@/api/types/applicant";
import { applicantApi } from "@/api/tenant/applicantApi";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { StatusPill } from "@/components/ux/StatusPill";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { RoundEvaluation, ROUND_TITLES, type RoundKey } from "../components/RoundEvaluations";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Đã nộp", IN_REVIEW: "Đang xem xét", ASSESSMENT: "Bài đánh giá", INTERVIEW: "Phỏng vấn AI", HUMAN_INTERVIEW: "Phỏng vấn trực tiếp",
  OFFER: "Đề nghị nhận việc", HIRED: "Đã tuyển", REJECTED: "Không phù hợp", WITHDRAWN: "Đã rút",
};

export function ApplicationDetailPage() {
  const { id } = useParams();
  const applicationId = id && /^\d+$/.test(id) ? id : undefined;
  const detail = useQuery({
    queryKey: queryKeys.applicants.detail(applicationId ?? 0),
    queryFn: () => applicantApi.get(applicationId!),
    enabled: Boolean(applicationId),
  });
  const application = detail.data?.data;
  const evaluation = useQuery({
    queryKey: ["applications", "evaluation", applicationId],
    queryFn: () => applicantApi.evaluation(applicationId!).then((r) => r.data),
    enabled: Boolean(applicationId),
  });
  const [openRound, setOpenRound] = useState<RoundKey | null>(null);

  if (!applicationId) return <ErrorMessage>Đường dẫn đơn ứng tuyển không hợp lệ.</ErrorMessage>;
  if (detail.isPending) return <PageSkeleton variant="detail" />;
  if (detail.isError) return <ErrorMessage>{getApiErrorMessage(detail.error)}</ErrorMessage>;
  if (!application) return null;

  const meta = [application.jobDepartment, application.jobLocation, application.jobWorkMode, application.jobEmploymentType].filter(Boolean);
  const rounds = application.rounds;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <Link to="/applications" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"><ArrowLeft className="size-4" aria-hidden="true" />Đơn đã ứng tuyển</Link>

      <header className="overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]">
        <div className="bg-[linear-gradient(135deg,var(--color-primary-subtle),white_60%)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Đơn ứng tuyển #{application.id}</p><h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">{application.jobTitle}</h1><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--color-on-surface-variant)]">{meta.length > 0 && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{meta.join(" · ")}</span>}<span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" />Ứng tuyển {formatDate(application.createdAt)}</span></div></div>
            <StatusPill status={application.status} label={STATUS_LABELS[application.status] ?? application.status} />
          </div>
          <div className="mt-6"><ApplicationPipeline status={application.status} /></div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--color-border-default)] px-5 py-4 sm:px-7"><Link to={`/jobs/${application.jobId}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-alt)]"><BriefcaseBusiness className="size-4" aria-hidden="true" />Xem công việc</Link>{application.status === "ASSESSMENT" && <Link to={`/assessments?applicationId=${application.id}`} className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white">Làm bài đánh giá</Link>}{application.status === "INTERVIEW" && <Link to="/interviews" className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white">Xem phỏng vấn AI</Link>}</div>
      </header>

      <div className="space-y-2">
        <p className="text-sm text-[var(--color-on-surface-variant)]">Bấm vào từng vòng để xem lý do điểm và kết quả.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {(["cv", "aiInterview", "assessment"] as const).map((key) => <RoundCard key={key} icon={key === "aiInterview" ? Bot : ClipboardList} title={ROUND_TITLES[key]} round={rounds?.[key]}
            open={openRound === key} onToggle={() => setOpenRound((value) => value === key ? null : key)} />)}
        </div>
      </div>

      {openRound && evaluation.isError && <ErrorMessage>{getApiErrorMessage(evaluation.error)}</ErrorMessage>}
      {openRound && evaluation.isPending && <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">Đang tải chi tiết đánh giá…</p>}
      {openRound && evaluation.data && <RoundEvaluation id="round-evaluation" round={openRound} data={evaluation.data} />}

      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="text-lg font-semibold">Lịch sử đơn ứng tuyển</h2>
        {application.history.length === 0 ? <p className="mt-4 text-sm text-[var(--color-on-surface-variant)]">Chưa có cập nhật mới.</p> : <ol className="mt-5 space-y-0">{application.history.map((item, index) => <li key={`${item.toStatus}-${item.createdAt}-${index}`} className="relative flex gap-4 pb-6 last:pb-0"><span className="relative z-10 mt-1.5 size-3 shrink-0 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-primary-subtle)]" aria-hidden="true" />{index < application.history.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-[var(--color-border-default)]" aria-hidden="true" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{STATUS_LABELS[item.toStatus] ?? item.toStatus}</p><time className="text-xs text-[var(--color-on-surface-variant)]" dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time></div>{item.note && <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{item.note}</p>}</div></li>)}</ol>}
      </section>
    </section>
  );
}

function RoundCard({ icon: Icon, title, round, open, onToggle }: { icon: typeof Bot; title: string; round?: RoundItemView; open: boolean; onToggle: () => void }) {
  const label = round ? roundStatus(round.status) : "Chưa bắt đầu";
  return <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="round-evaluation"
    className={cn("flex flex-col rounded-2xl border bg-white p-5 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-ambient)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30",
      open ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15" : "border-[var(--color-border-default)]")}>
    <span className="flex w-full items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span><StatusPill status={round?.status ?? "NOT_STARTED"} label={label} /></span>
    <span className="mt-4 font-semibold">{title}</span>
    {round?.score != null ? <span className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Điểm <strong className="text-[var(--color-on-surface)]">{round.score.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</strong>{round.threshold != null && ` / ngưỡng ${round.threshold}`}</span> : <span className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Kết quả sẽ xuất hiện khi vòng này hoàn tất.</span>}
    <span className="mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-[var(--color-primary)]">{open ? "Ẩn chi tiết" : "Xem chi tiết"}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" /></span>
  </button>;
}

function roundStatus(status: string) {
  return ({
    PENDING: "Đang chờ", PASSED: "Đã đạt", FAILED: "Chưa đạt", COMPLETED: "Hoàn tất", NOT_STARTED: "Chưa bắt đầu", MISSING: "Chưa bắt đầu",
    INVITED: "Đã mời", CREATED: "Đã mời", GENERATING: "Đang chuẩn bị", QUESTIONS_READY: "Sẵn sàng", IN_PROGRESS: "Đang làm",
    SCORING: "Đang chấm", SCORED: "Đã chấm", ERROR: "Đang xử lý lại", SUBMITTED: "Đang chờ chấm", GRADED: "Đã chấm", EXPIRED: "Hết hạn",
  } as Record<string, string>)[status] ?? status;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">{children}</p>;
}
