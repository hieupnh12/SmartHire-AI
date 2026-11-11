import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleDashed,
  ListChecks,
  LoaderCircle,
  MessageSquare,
  Network,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { button, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { AiInterviewReportView, parseAiInterviewReport } from "../components/AiInterviewReportView";
import {
  PipelineStrip,
  SessionGovernanceSection,
  SessionLogsSection,
  SessionMetricsSection,
  StageQuestionsSection,
  groupQuestionsByStage,
} from "../components/AiInterviewDetailSections";
import { ConversationTranscript, useInterviewTranscript } from "../components/ConversationTranscript";
import { AiStatusBadge, aiStatusLabel, formatDateTime, formatInterviewScore } from "../components/aiInterviewUi";
import { AVAILABLE_INTERVIEW_PROCESS, visibleInterviewDetails } from "../utils/interviewProcessSettings";

type SectionTab = "overview" | "content" | "pipeline" | "logs";
type OverviewSubTab = "ai" | "metrics";

const SECTION_TABS: readonly SectionTab[] = ["overview", "content", "pipeline", "logs"];

export function AiInterviewDetailPage() {
  const job = useRecruitmentJob();
  const { interviewId: routeInterviewId } = useParams<{ interviewId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);

  const interviewId = routeInterviewId && /^\d+$/.test(routeInterviewId) ? Number(routeInterviewId) : null;
  const backSearch = (location.state as { backSearch?: string } | null)?.backSearch ?? "";
  const listUrl = `/recruiter/jobs/${job.id}/ai-interviews${backSearch}`;

  const requestedSection = searchParams.get("section") as SectionTab | null;
  const activeSection: SectionTab = requestedSection && SECTION_TABS.includes(requestedSection) ? requestedSection : "overview";
  const [overviewSubTab, setOverviewSubTab] = useState<OverviewSubTab>("ai");

  const setActiveSection = (section: SectionTab) => {
    const next = new URLSearchParams(searchParams);
    if (section === "overview") next.delete("section");
    else next.set("section", section);
    setSearchParams(next, { replace: true });
  };

  const detail = useQuery({
    queryKey: queryKeys.aiInterviews.detail(interviewId ?? 0),
    queryFn: () => aiInterviewApi.get(interviewId!),
    enabled: interviewId !== null,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status) return false;
      return ["CREATED", "GENERATING", "QUESTIONS_READY", "IN_PROGRESS", "SCORING"].includes(status) ? 5_000 : false;
    },
  });

  const rawInterview = detail.data;
  const interview = useMemo(() => (rawInterview ? visibleInterviewDetails(rawInterview) : undefined), [rawInterview]);

  const applicationQuery = useQuery({
    queryKey: ["applications", interview?.applicationId ?? 0, "ai-interview-detail"],
    queryFn: () => applicantApi.get(interview!.applicationId),
    enabled: Boolean(interview?.applicationId),
  });

  const canFetchTranscript = Boolean(interview?.conversational && (interview.startedAt || interview.completedAt));
  const transcript = useInterviewTranscript(interviewId ?? 0, canFetchTranscript);

  const logs = useQuery({
    queryKey: [...queryKeys.aiInterviews.detail(interviewId ?? 0), "logs"],
    queryFn: () => aiInterviewApi.logs(interviewId!),
    enabled: interviewId !== null && activeSection === "logs",
    refetchInterval: activeSection === "logs" ? 5_000 : false,
  });

  const refresh = () => {
    if (!interviewId) return;
    void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.detail(interviewId) });
    void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(job.id) });
  };

  const generate = useMutation({
    mutationFn: () => aiInterviewApi.generate(interviewId!),
    onSuccess: () => {
      refresh();
      toast.success("Đã gửi yêu cầu sinh câu hỏi AI");
    },
  });

  const score = useMutation({
    mutationFn: () => aiInterviewApi.retryScore(interviewId!),
    onSuccess: () => {
      refresh();
      toast.success("Đã yêu cầu chấm điểm lại phiên phỏng vấn");
    },
  });

  const remove = useMutation({
    mutationFn: () => aiInterviewApi.remove(interviewId!),
    onSuccess: () => {
      if (interviewId) client.removeQueries({ queryKey: queryKeys.aiInterviews.detail(interviewId) });
      void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(job.id) });
      toast.success("Đã xóa phiên phỏng vấn AI");
      navigate(listUrl, { replace: true });
    },
  });

  if (!interviewId) {
    return <Navigate to={listUrl} replace />;
  }

  if (detail.isPending) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4" role="status" aria-busy="true">
        <Skeleton className="h-5 w-72 rounded-md" />
        <SkeletonCard className="h-24" />
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-96" />
        </div>
        <span className="sr-only">Đang tải chi tiết phiên phỏng vấn AI…</span>
      </section>
    );
  }

  if (detail.isError || !interview) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-[var(--color-error)]" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Không thể tải chi tiết phiên AI Interview</h1>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]" role="alert">
            {detail.error ? getApiErrorMessage(detail.error) : "Phiên phỏng vấn không tồn tại hoặc đã bị xóa."}
          </p>
          <Link to={listUrl} className={cn(button, "mt-4 inline-flex")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại danh sách phiên
          </Link>
        </div>
      </section>
    );
  }

  const appDetail = applicationQuery.data?.data;
  const candidateName =
    appDetail?.candidateName ?? (interview.candidateId ? `Ứng viên #${interview.candidateId}` : `Đơn #${interview.applicationId}`);
  const candidateEmail = appDetail?.candidateEmail;

  const availableSession =
    Boolean(rawInterview?.processBased) &&
    Boolean(rawInterview?.roadmap?.length) &&
    rawInterview!.roadmap!.every((step) => step.title.trim().toUpperCase() === AVAILABLE_INTERVIEW_PROCESS);
  const editable = availableSession && !interview.startedAt && ["CREATED", "QUESTIONS_READY", "ERROR"].includes(interview.status);
  const deletable = !interview.startedAt && ["CREATED", "QUESTIONS_READY", "ERROR"].includes(interview.status);
  const canRetryScore = availableSession && interview.status === "ERROR" && Boolean(interview.completedAt);
  const canGenerate = editable && !interview.conversational && (interview.questions.length === 0 || Boolean(interview.processBased));
  const planned = interview.questions.some((q) => Boolean(q.stageTitle));
  const stageGroups = groupQuestionsByStage(interview);
  const busy = generate.isPending || score.isPending || remove.isPending;

  const hasScore = interview.overallScore != null;
  const threshold = interview.passingScore;
  const passed =
    interview.status === "PASSED" ||
    (hasScore && (threshold != null ? interview.overallScore! >= threshold : interview.overallScore! >= 50));
  const failed =
    interview.status === "FAILED" ||
    (hasScore && !passed);
  const hasOutcome = passed || failed;

  const answeredCount = interview.questions.filter((q) => q.answer != null).length;
  const turnSummary = transcript.data
    ? `${transcript.data.candidateTurns}/${transcript.data.maxTurns} lượt`
    : `${interview.maxQuestionCount ?? interview.questionCount} lượt`;
  const progressValue = interview.conversational
    ? turnSummary
    : `${answeredCount}/${interview.questions.length} câu`;
  const progressHint = interview.conversational ? "Theo lượt trả lời transcript" : "Theo bộ câu hỏi";

  const parsedReport = parseAiInterviewReport(interview.reportJson);

  const navItems: Array<{
    id: SectionTab;
    label: string;
    badge: string;
    icon: typeof Sparkles;
  }> = [
    {
      id: "overview",
      label: "Tổng quan & AI",
      badge: hasScore ? `${formatInterviewScore(interview.overallScore)} đ` : "Chưa chấm",
      icon: Sparkles,
    },
    {
      id: "content",
      label: interview.conversational ? "Transcript hội thoại" : "Câu hỏi & Trả lời",
      badge: interview.conversational ? turnSummary : `${answeredCount}/${interview.questions.length} câu`,
      icon: interview.conversational ? MessageSquare : ListChecks,
    },
    {
      id: "pipeline",
      label: "Tiến trình & Thông số",
      badge: `${interview.durationMinutes ?? "—"} phút`,
      icon: Network,
    },
    {
      id: "logs",
      label: "Quản trị & Nhật ký",
      badge: `#AI-${interview.id}`,
      icon: ShieldCheck,
    },
  ];

  const confirmDelete = () =>
    askConfirm({
      title: `Xoá phiên #AI-${interview.id}?`,
      description: `Phiên phỏng vấn AI của ${candidateName} cùng câu hỏi và feedback sẽ bị xoá vĩnh viễn.`,
      confirmLabel: "Xoá phiên",
      danger: true,
      onConfirm: async () => {
        await remove.mutateAsync();
      },
    });

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 pb-10 text-[var(--color-on-surface)]">
      {/* 1. Breadcrumb Trail (khớp bố cục CvDetailPage) */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 px-1 text-xs sm:text-sm">
        <Sparkles className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <Link
          to={listUrl}
          className="font-medium text-slate-600 transition-colors hover:text-[var(--color-primary)]"
        >
          AI Phỏng vấn: {job.title}
        </Link>
        <span className="text-slate-400" aria-hidden="true">/</span>
        <span className="truncate font-semibold text-slate-900">
          {candidateName} <span className="font-normal text-slate-500">(Phiên #AI-{interview.id})</span>
        </span>
      </nav>

      {/* 2. Top Candidate Header Card */}
      <header className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-5 py-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            to={listUrl}
            aria-label="Quay lại danh sách phiên AI Interview"
            title="Quay lại danh sách phiên"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">{candidateName}</h1>
              <AiStatusBadge status={interview.status} />
              {hasOutcome && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                  )}
                >
                  {passed ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <XCircle className="size-3.5" aria-hidden="true" />}
                  {passed ? "Đạt vòng AI" : "Chưa đạt vòng AI"}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500 sm:text-[13px]">
              {candidateEmail ? `${candidateEmail} · ` : ""}
              Phiên #AI-{interview.id} · {interview.conversational ? "Hội thoại trực tiếp (AI)" : "Phỏng vấn theo lộ trình"} · Lần thứ{" "}
              {interview.attemptNumber ?? 1} · Tạo {formatDateTime(interview.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
          <div className="lg:border-l lg:border-slate-200 lg:pl-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Điểm AI Interview</p>
            <p className="mt-0.5 flex items-baseline gap-1.5 tabular-nums">
              <span
                className={cn(
                  "text-2xl font-bold",
                  hasScore ? (passed ? "text-emerald-600" : "text-[var(--color-primary)]") : "text-slate-400",
                )}
              >
                {hasScore ? formatInterviewScore(interview.overallScore) : "—"}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
              {threshold != null && (
                <span className="text-xs font-medium text-slate-500">(Ngưỡng: {formatInterviewScore(threshold)})</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canRetryScore && (
              <button
                type="button"
                className={primary}
                disabled={busy}
                onClick={() => score.mutate()}
              >
                {score.isPending ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <RefreshCw className="size-4" aria-hidden="true" />
                )}
                {score.isPending ? "Đang chấm lại…" : "Thử chấm điểm lại"}
              </button>
            )}
            {canGenerate && (
              <button
                type="button"
                className={primary}
                disabled={busy}
                onClick={() => {
                  if (!interview.questions.length) {
                    generate.mutate();
                    return;
                  }
                  askConfirm({
                    title: "Sinh lại bộ câu hỏi nháp?",
                    description:
                      "AI sẽ dùng cấu hình đã lưu của phiên. Chỉ thay câu hỏi nháp chưa trả lời khi bộ mới hợp lệ; giữ nguyên lượt phỏng vấn.",
                    confirmLabel: "Sinh lại",
                    onConfirm: async () => {
                      await generate.mutateAsync();
                    },
                  });
                }}
              >
                {generate.isPending ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Sparkles className="size-4" aria-hidden="true" />
                )}
                {generate.isPending
                  ? "Đang sinh câu hỏi…"
                  : interview.questions.length
                    ? "Sinh lại câu hỏi"
                    : "Sinh câu hỏi AI"}
              </button>
            )}
            {deletable && (
              <button
                type="button"
                className={cn(
                  button,
                  "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]",
                )}
                disabled={busy}
                onClick={confirmDelete}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {remove.isPending ? "Đang xóa…" : "Xóa phiên"}
              </button>
            )}
            <Link to={listUrl} className={button}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Quay lại
            </Link>
          </div>
        </div>
      </header>

      {/* Banners */}
      {(interview.errorMessage || generate.isError || score.isError || remove.isError) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-[var(--color-error-container)] px-4 py-3 text-sm text-[var(--color-on-error-container)]"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {generate.isError
              ? getApiErrorMessage(generate.error)
              : score.isError
                ? getApiErrorMessage(score.error)
                : remove.isError
                  ? getApiErrorMessage(remove.error)
                  : interview.errorMessage}
          </span>
        </div>
      )}

      {interview.status === "GENERATING" && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-subtle)] px-4 py-3 text-sm font-medium text-[var(--color-primary-hover)]"
        >
          <Sparkles className="size-4 animate-pulse motion-reduce:animate-none text-[var(--color-primary)]" aria-hidden="true" />
          <span>Đang sinh câu hỏi từ yêu cầu và kỹ năng của Job…</span>
        </div>
      )}

      {/* 3. Main 2-Column Workspace (khớp CvDetailPage) */}
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Left Sidebar Navigation */}
        <aside className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-2xs lg:sticky lg:top-4">
          <p className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Các mục đánh giá
          </p>
          <nav className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1" aria-label="Các mục đánh giá phiên AI Interview">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all cursor-pointer",
                    active
                      ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-subtle)] font-semibold text-[var(--color-primary-hover)] shadow-2xs"
                      : "border-transparent text-slate-600 hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon
                      className={cn("size-4 shrink-0", active ? "text-[var(--color-primary)]" : "text-slate-400")}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                      active
                        ? "border-[var(--color-primary)]/20 bg-white text-[var(--color-primary-hover)]"
                        : "border-slate-200/80 bg-slate-50 text-slate-600",
                    )}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Detail Panel */}
        <div className="min-w-0 space-y-5">
          {activeSection === "overview" && (
            <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
              {/* Summary Header Card (matching Kết quả sàng lọc CV / Kết quả phỏng vấn AI) */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                    <Bot className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">
                        Kết quả phỏng vấn AI · Phiên #AI-{interview.id}
                      </h2>
                      {hasOutcome && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                          )}
                        >
                          <span
                            className={cn("size-1.5 rounded-full", passed ? "bg-emerald-600" : "bg-rose-600")}
                            aria-hidden="true"
                          />
                          {passed ? "Đạt yêu cầu" : "Không đạt"}
                        </span>
                      )}
                      <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-hover)]">
                        {interview.conversational ? "Hội thoại trực tiếp (Voice / Chat)" : "Phỏng vấn theo lộ trình"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {interview.jobTitle ?? job.title} ·{" "}
                      {interview.startedAt
                        ? `Bắt đầu lúc ${formatDateTime(interview.startedAt)}`
                        : `Tạo lúc ${formatDateTime(interview.createdAt)}`}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-2.5 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Điểm AI Interview</p>
                  <p
                    className={cn(
                      "mt-0.5 text-2xl font-bold tabular-nums",
                      hasScore ? (passed ? "text-emerald-600" : "text-[var(--color-primary)]") : "text-slate-400",
                    )}
                  >
                    {hasScore ? formatInterviewScore(interview.overallScore) : "—"}
                    <span className="text-xs font-normal text-slate-400"> /100</span>
                  </p>
                </div>
              </div>

              {/* 4 KPI Summary Tiles */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiBox
                  label="Điểm đạt yêu cầu"
                  value={threshold != null ? `${formatInterviewScore(threshold)}/100 đ` : "Chưa đặt"}
                />
                <KpiBox
                  label={interview.conversational ? "Số lượt hội thoại" : "Số câu hỏi"}
                  value={progressValue}
                  hint={progressHint}
                />
                <KpiBox
                  label="Thời lượng phiên"
                  value={`${interview.durationMinutes ?? "—"} phút`}
                  hint={`Tối đa ${interview.maxAttempts ?? interview.attemptNumber ?? 1} lần thử`}
                />
                <KpiBox
                  label="Đánh giá chung"
                  value={hasOutcome ? (passed ? "Đạt yêu cầu" : "Chưa đạt") : aiStatusLabel[interview.status]}
                  tone={passed ? "pass" : failed ? "fail" : undefined}
                />
              </div>

              {/* Sub-tabs inside Overview matching CvDetailPage */}
              <div
                className="mt-5 flex flex-wrap gap-6 border-b border-slate-200"
                role="tablist"
                aria-label="Chi tiết đánh giá phiên AI Interview"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={overviewSubTab === "ai"}
                  onClick={() => setOverviewSubTab("ai")}
                  className={cn(
                    "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors cursor-pointer",
                    overviewSubTab === "ai"
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-transparent text-slate-500 hover:text-slate-800",
                  )}
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  Nhận xét &amp; Báo cáo AI
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={overviewSubTab === "metrics"}
                  onClick={() => setOverviewSubTab("metrics")}
                  className={cn(
                    "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors cursor-pointer",
                    overviewSubTab === "metrics"
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-transparent text-slate-500 hover:text-slate-800",
                  )}
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Năng lực &amp; Tiêu chí
                </button>
              </div>

              <div className="mt-5">
                {parsedReport ? (
                  <AiInterviewReportView
                    reportJson={interview.reportJson}
                    questions={interview.questions}
                    section={overviewSubTab === "ai" ? "summary" : "metrics"}
                    passingScore={interview.passingScore}
                    bare
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-6 py-10 text-center">
                    <CircleDashed className="size-8 text-slate-400" aria-hidden="true" />
                    <h3 className="mt-3 text-base font-semibold text-slate-900">
                      {interview.status === "SCORING"
                        ? "AI đang tổng hợp báo cáo đánh giá"
                        : interview.status === "IN_PROGRESS"
                          ? "Phiên phỏng vấn đang diễn ra"
                          : "Chưa có báo cáo đánh giá AI cho phiên này"}
                    </h3>
                    <p className="mt-1 max-w-md text-xs text-slate-500 leading-relaxed">
                      {interview.errorMessage
                        ? interview.errorMessage
                        : interview.conversational
                          ? "Báo cáo năng lực chi tiết và trích dẫn bằng chứng sẽ hiển thị sau khi ứng viên hoàn tất các lượt hội thoại."
                          : "Báo cáo tổng hợp sẽ được tạo sau khi ứng viên hoàn thành bộ câu hỏi phỏng vấn."}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSection("content")}
                        className={button}
                      >
                        {interview.conversational ? "Xem Transcript hội thoại" : "Xem bộ câu hỏi"}
                      </button>
                      {canRetryScore && (
                        <button
                          type="button"
                          onClick={() => score.mutate()}
                          disabled={busy}
                          className={primary}
                        >
                          <RefreshCw className="size-4" aria-hidden="true" />
                          Thử chấm điểm lại
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "content" && (
            <>
              {interview.conversational ? (
                canFetchTranscript ? (
                  <ConversationTranscript interviewId={interview.id} maxHeightClass="max-h-[70vh]" />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-6 py-12 text-center">
                    <MessageSquare className="size-8 text-slate-400" aria-hidden="true" />
                    <h2 className="mt-3 text-base font-semibold text-slate-900">Chưa có dữ liệu hội thoại</h2>
                    <p className="mt-1 max-w-md text-xs text-slate-500">
                      Ứng viên chưa bắt đầu phiên phỏng vấn. Nội dung trao đổi và bản ghi âm sẽ tự động hiển thị tại đây khi phiên bắt đầu.
                    </p>
                  </div>
                )
              ) : (
                <StageQuestionsSection
                  interview={interview}
                  stageGroups={stageGroups}
                  editable={editable}
                  planned={planned}
                  busy={busy}
                  generatePending={generate.isPending}
                  onGenerate={() => generate.mutate()}
                  onChanged={refresh}
                />
              )}
            </>
          )}

          {activeSection === "pipeline" && (
            <div className="space-y-5">
              <PipelineStrip passed={passed} failed={failed} rounds={appDetail?.rounds} />
              <SessionMetricsSection
                interview={interview}
                progressLabel={progressValue}
                progressHint={progressHint}
              />
            </div>
          )}

          {activeSection === "logs" && (
            <div className="space-y-5">
              <SessionGovernanceSection interview={interview} />
              <SessionLogsSection
                logs={logs.data}
                isPending={logs.isPending}
                error={logs.error}
                onRetry={() => void logs.refetch()}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function KpiBox({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "pass" | "fail";
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-[var(--color-surface-alt)] px-3.5 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-bold tabular-nums",
          tone === "pass" ? "text-emerald-600" : tone === "fail" ? "text-rose-600" : "text-slate-900",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
