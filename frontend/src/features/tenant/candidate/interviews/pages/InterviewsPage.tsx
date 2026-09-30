import { Link } from "react-router-dom";
import { ArrowRight, Bot } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { getApiErrorMessage } from "@/lib/axios";
import { useCandidateInterviews } from "../hooks/useCandidateInterviews";
import { interviewStatus } from "../constants/interviewStatus";

export function InterviewsPage() {
  const interviews = useCandidateInterviews();
  return <section className="space-y-6 text-[var(--color-on-surface)]">
    <header><h1 className="text-3xl font-semibold tracking-tight">AI Interview</h1><p className="mt-2 text-[var(--color-on-surface-variant)]">Lời mời phỏng vấn từ nhà tuyển dụng sau vòng sàng lọc CV.</p></header>
    {interviews.isPending && <p role="status">Đang tải lời mời phỏng vấn…</p>}
    {interviews.isError && <div role="alert" className="space-y-3"><p>{getApiErrorMessage(interviews.error)}</p><Button onClick={() => void interviews.refetch()}>Thử lại</Button></div>}
    {interviews.isSuccess && interviews.data.length === 0 && <div className="rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-6"><h2 className="font-semibold">Chưa có lời mời AI Interview</h2><p className="mt-2 text-[var(--color-on-surface-variant)]">Khi CV đạt yêu cầu, lời mời phỏng vấn sẽ xuất hiện tại đây và trong mục Thông báo.</p></div>}
    {interviews.data?.map(interview => <article key={interview.id} className="rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3"><Bot className="size-6 shrink-0 text-brand-primary" aria-hidden="true" /><div><p className="text-sm text-brand-primary">AI Interview · #{interview.id}</p><h2 className="mt-1 break-words text-xl font-semibold">{interview.jobTitle ?? `Hồ sơ #${interview.applicationId}`}</h2></div></div>
        <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-sm text-brand-primary">{interviewStatus[interview.status]}</span>
      </div>
      <p className="my-4 text-sm text-[var(--color-on-surface-variant)]">Nhận lời mời: {new Date(interview.createdAt).toLocaleString("vi-VN")}{interview.attemptNumber && interview.attemptNumber > 1 ? ` · Lần làm thứ ${interview.attemptNumber}` : ""}{interview.status === "FAILED" && interview.canRetry ? " · Còn lượt làm lại trước hạn" : ""}</p>
      <Link to={`/candidate/interviews/${interview.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-medium text-[var(--color-on-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">Xem lời mời<ArrowRight className="size-4" aria-hidden="true" /></Link>
    </article>)}
  </section>;
}
