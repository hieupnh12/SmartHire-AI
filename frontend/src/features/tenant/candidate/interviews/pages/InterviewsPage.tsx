import { Link } from "react-router-dom";
import { ArrowRight, Bot, CalendarClock, Clock3, FileSearch, RefreshCw, ShieldCheck } from "lucide-react";
import type { AiInterview, AiInterviewStatus } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { useCandidateInterviews } from "../hooks/useCandidateInterviews";
import { interviewStatus } from "../constants/interviewStatus";

const STATUS_TONE: Record<AiInterviewStatus, string> = {
  CREATED: "bg-slate-100 text-slate-700", GENERATING: "bg-amber-50 text-amber-700",
  QUESTIONS_READY: "bg-blue-50 text-blue-700", IN_PROGRESS: "bg-violet-50 text-violet-700",
  SCORING: "bg-amber-50 text-amber-700", SCORED: "bg-cyan-50 text-cyan-700",
  PASSED: "bg-emerald-50 text-emerald-700", FAILED: "bg-red-50 text-red-700", ERROR: "bg-red-50 text-red-700",
};

export function InterviewsPage() {
  const interviews = useCandidateInterviews();
  const rows = [...(interviews.data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const ready = rows.filter((item) => item.status === "QUESTIONS_READY" || item.status === "IN_PROGRESS").length;
  const completed = rows.filter((item) => ["SCORED", "PASSED", "FAILED"].includes(item.status)).length;

  return <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="interviews-title">
    <header className="overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_62%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Vòng phỏng vấn tự động</p><h1 id="interviews-title" className="mt-2 text-3xl font-semibold tracking-tight">AI Interview</h1><p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">Quản lý lời mời phỏng vấn từ nhà tuyển dụng, kiểm tra thời hạn và tiếp tục phiên đang thực hiện.</p></div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3"><Metric value={rows.length} label="Lời mời" /><Metric value={ready} label="Cần thực hiện" /><Metric value={completed} label="Đã hoàn tất" /></div>
      </div>
    </header>

    <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary)]/15 bg-[var(--color-primary-subtle)] p-4 text-sm"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><p className="leading-6 text-[var(--color-on-surface-variant)]"><strong className="text-[var(--color-on-surface)]">Trước khi bắt đầu:</strong> kiểm tra kết nối mạng, chọn không gian yên tĩnh và dành đủ thời gian để hoàn thành phiên trong một lần.</p></div>

    {interviews.isPending && <LoadingState className="grid gap-4 lg:grid-cols-2" label="Đang tải lời mời phỏng vấn">{[0, 1, 2, 3].map((item) => <SkeletonCard key={item} className="min-h-72" />)}</LoadingState>}
    {interviews.isError && <div role="alert" className="rounded-2xl border border-[var(--color-error-container)] bg-[var(--color-error-container)] p-5"><p className="text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(interviews.error)}</p><Button className="mt-4" variant="secondary" onClick={() => void interviews.refetch()}><RefreshCw className="size-4" aria-hidden="true" />Thử lại</Button></div>}

    {interviews.isSuccess && rows.length === 0 && <div className="rounded-3xl border border-dashed border-[var(--color-border-default)] bg-white px-6 py-14 text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Bot className="size-8" aria-hidden="true" /></span><h2 className="mt-5 text-xl font-semibold">Chưa có lời mời AI Interview</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--color-on-surface-variant)]">Lời mời được tạo khi hồ sơ của bạn vượt qua vòng CV và công việc có bật AI Interview. Bạn có thể theo dõi trạng thái xét tuyển trong danh sách đơn.</p><Link to="/applications" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">Xem đơn đã ứng tuyển<ArrowRight className="size-4" aria-hidden="true" /></Link></div>}

    {rows.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{rows.map((interview) => <InterviewCard key={interview.id} interview={interview} />)}</div>}
  </section>;
}

function InterviewCard({ interview }: { interview: AiInterview }) {
  const action = actionLabel(interview.status);
  const expired = interview.availableUntil ? new Date(interview.availableUntil).getTime() < Date.now() : false;
  return <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[var(--color-primary)]/30 hover:shadow-[var(--shadow-ambient)]">
    <div className="flex-1 p-5 sm:p-6">
      <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Bot className="size-6" aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">AI Interview #{interview.id}</p><h2 className="mt-1 break-words text-lg font-semibold leading-6">{interview.jobTitle ?? `Hồ sơ #${interview.applicationId}`}</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[interview.status]}`}>{interviewStatus[interview.status]}</span></div></div></div>
      <div className="mt-5 grid gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm sm:grid-cols-2"><Fact icon={CalendarClock} label="Có thể bắt đầu" value={formatDateTime(interview.availableFrom, "Khi câu hỏi sẵn sàng")} /><Fact icon={Clock3} label="Hạn hoàn thành" value={formatDateTime(interview.availableUntil, "Không giới hạn")} /><Fact icon={Clock3} label="Thời lượng" value={`${interview.durationMinutes ?? 30} phút`} /><Fact icon={FileSearch} label="Số câu hỏi" value={`${interview.questionCount || "—"} câu`} /></div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-on-surface-variant)]"><span>Nhận lời mời {formatDateTime(interview.createdAt, interview.createdAt)}</span>{(interview.attemptNumber ?? 1) > 1 && <span>Lần thực hiện thứ {interview.attemptNumber}</span>}{interview.overallScore != null && <span className="font-semibold text-[var(--color-on-surface)]">Kết quả {interview.overallScore.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} điểm</span>}</div>
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3 sm:px-6"><span className="text-xs text-[var(--color-on-surface-variant)]">Tối đa {interview.maxAttempts ?? 1} lần thực hiện</span>{expired && !["SCORED", "PASSED", "FAILED"].includes(interview.status) ? <span className="text-sm font-semibold text-[var(--color-error)]">Đã hết hạn</span> : <Link to={`/interviews/${interview.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">{action}<ArrowRight className="size-4" aria-hidden="true" /></Link>}</div>
  </article>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="min-w-20 rounded-2xl border border-[var(--color-primary)]/15 bg-white/80 px-3 py-3 text-center"><strong className="block text-xl text-[var(--color-primary)]">{value}</strong><span className="mt-0.5 block text-[10px] font-medium text-[var(--color-on-surface-variant)] sm:text-xs">{label}</span></div>;
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="flex gap-2"><Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><p className="text-xs text-[var(--color-on-surface-variant)]">{label}</p><p className="mt-0.5 font-medium">{value}</p></div></div>;
}

function actionLabel(status: AiInterviewStatus) {
  if (status === "QUESTIONS_READY") return "Bắt đầu";
  if (status === "IN_PROGRESS") return "Tiếp tục phỏng vấn";
  if (["SCORED", "PASSED", "FAILED"].includes(status)) return "Xem kết quả";
  return "Bắt đầu";
}

function formatDateTime(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}
