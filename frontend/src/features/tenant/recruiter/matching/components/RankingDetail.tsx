import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CalendarDays,
  Code2,
  FileText,
} from "lucide-react";
import { matchingApi } from "@/api/tenant/matchingApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import type { ScreeningRoundsView } from "@/api/types/applicant";
import type { RankingRow } from "../types/ranking";
import { applicationStatusLabel, scoreText, stickyDetailSidebar } from "./rankingUi";
import { Skeleton } from "@/components/ux/Skeleton";
import { HumanInterviewScheduleDialog } from "@/features/tenant/recruiter/interviews/components/HumanInterviewScheduleDialog";
import "@/features/tenant/recruiter/interviews/styles/human-interview-reference.css";
import { cn } from "@/lib/utils";

import { CandidateAiInterviewTab } from "./detail/CandidateAiInterviewTab";
import { CandidateAssessmentTab } from "./detail/CandidateAssessmentTab";
import { CandidateSchedulingTab } from "./detail/CandidateSchedulingTab";
import { CandidateOverviewTab } from "./detail/CandidateOverviewTab";

export type DetailTab = "ai_interview" | "assessment" | "schedule" | "overview";

function roundPassed(passed: boolean | null | undefined, status?: string) {
  return passed === true || status === "PASSED";
}

function canScheduleLiveInterview(rounds?: ScreeningRoundsView | null, cvScreeningStatus?: string | null) {
  if (!rounds) return cvScreeningStatus === "PASSED";
  const cvOk = roundPassed(rounds.cv.passed, rounds.cv.status) || cvScreeningStatus === "PASSED";
  const aiOk = roundPassed(rounds.aiInterview.passed, rounds.aiInterview.status);
  const assessmentOk = roundPassed(rounds.assessment.passed, rounds.assessment.status);
  return cvOk && aiOk && assessmentOk;
}

export interface RankingCandidateDetailViewProps {
  row: RankingRow;
  jobId: number;
  jobTitle: string;
  tenantKey: string;
  preview?: boolean;
  fallback?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

export function RankingCandidateDetailView({
  row,
  jobId,
  jobTitle,
  tenantKey,
  preview = false,
  fallback = false,
  onClose,
  onBack,
}: RankingCandidateDetailViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as DetailTab | null;
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    if (tabParam && ["ai_interview", "assessment", "schedule", "overview"].includes(tabParam)) {
      return tabParam;
    }
    return "ai_interview";
  });
  const [scheduling, setScheduling] = useState(false);

  const handleTabChange = (tab: DetailTab) => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  const handleBack = onBack || onClose || (() => navigate(`/recruiter/jobs/${jobId}/rank`));

  useEffect(() => {
    if (!scheduling) return;
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href =
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
    document.head.appendChild(font);
    return () => font.remove();
  }, [scheduling]);

  const sources = useQuery({
    queryKey: ["ranking-sources", tenantKey, row.applicationId],
    queryFn: () => matchingApi.sources(row.applicationId),
    enabled: !preview && !fallback,
  });

  const application = useQuery({
    queryKey: ["applications", row.applicationId, "ranking-rounds"],
    queryFn: () => applicantApi.get(row.applicationId),
    enabled: !preview,
  });

  const interviewOptions = useQuery({
    queryKey: ["human-interviews", "options", jobId],
    queryFn: () => humanInterviewApi.options(jobId),
    enabled: scheduling,
  });

  const humanInterviews = useQuery({
    queryKey: ["human-interviews", jobId, row.applicationId],
    queryFn: () => humanInterviewApi.list({ jobId, size: 50 }),
    enabled: !preview,
  });

  const rounds = application.data?.data.rounds;
  const eligible = preview ? true : canScheduleLiveInterview(rounds, application.data?.data.cvScreeningStatus);

  const scheduledInterview = preview
    ? true
    : humanInterviews.data?.items?.some((i) => i.applicationId === row.applicationId);

  // Resolved sources IDs (from row or fetched sources)
  const effectiveInterviewId =
    row.sources?.aiInterviewId ||
    sources.data?.data.selected?.aiInterviewId ||
    sources.data?.data.aiInterviews?.[0]?.id ||
    null;

  const effectiveSubmissionId =
    row.sources?.submissionId ||
    sources.data?.data.selected?.submissionId ||
    sources.data?.data.submissions?.[0]?.id ||
    null;

  // Scores
  const aiScore = row.result.components.find((c) => c.key === "interview")?.score ?? null;
  const assessmentScore = row.result.components.find((c) => c.key === "assessment")?.score ?? null;
  const skillsScore = row.result.components.find((c) => c.key === "skills")?.score ?? null;

  const tabs = [
    {
      key: "ai_interview" as const,
      label: "AI Interview",
      icon: Bot,
      badge:
        aiScore != null
          ? `${scoreText(aiScore)} đ`
          : effectiveInterviewId
            ? "Đã làm"
            : "Chưa làm",
      activeText: "text-brand-primary",
      activeBg: "bg-brand-primary/10 dark:bg-brand-primary/20",
      activeBorder: "border-brand-primary/30",
    },
    {
      key: "assessment" as const,
      label: "Assessment",
      icon: Code2,
      badge:
        assessmentScore != null
          ? `${scoreText(assessmentScore)} đ`
          : effectiveSubmissionId
            ? "Đã nộp"
            : "Chưa làm",
      activeText: "text-indigo-600 dark:text-indigo-400",
      activeBg: "bg-indigo-50/80 dark:bg-indigo-950/50",
      activeBorder: "border-indigo-200 dark:border-indigo-800",
    },
    {
      key: "schedule" as const,
      label: "Đặt lịch phỏng vấn",
      icon: CalendarDays,
      badge: scheduledInterview ? "Đã đặt" : eligible ? "Đủ đ/k" : "Chưa đặt",
      activeText: "text-emerald-600 dark:text-emerald-400",
      activeBg: "bg-emerald-50/80 dark:bg-emerald-950/50",
      activeBorder: "border-emerald-200 dark:border-emerald-800",
    },
    {
      key: "overview" as const,
      label: "Tổng quan & CV",
      icon: FileText,
      badge: skillsScore != null ? `Match ${scoreText(skillsScore)}%` : "Tổng quan",
      activeText: "text-slate-900 dark:text-white",
      activeBg: "bg-slate-100 dark:bg-slate-800",
      activeBorder: "border-slate-300 dark:border-slate-700",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-4 text-slate-900 dark:text-slate-100">
      {/* 1. TOP HEADER BAR (Candidate Info, Total Score & Quick Actions) */}
      <header className="rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Back button + Candidate Details + Score divider */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Quay lại bảng xếp hạng"
              aria-label="Quay lại bảng xếp hạng"
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  id="ranking-detail-title"
                  className="text-base font-extrabold text-slate-900 dark:text-white truncate"
                >
                  {row.candidateName}
                </h1>
                <span className="rounded-full bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {applicationStatusLabel(row.status)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Hồ sơ #{row.applicationId} · {jobTitle}
              </p>
            </div>

            {/* Vertical divider */}
            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-800 sm:block mx-1" />

            {/* Total Score Display */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  TỔNG ĐIỂM XẾP HẠNG
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-brand-primary tabular-nums">
                    {row.result.score != null ? scoreText(row.result.score) : "—"}
                  </span>
                  <span className="text-xs text-slate-400">/ 100</span>
                  <span className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {row.result.complete ? `(Hạng #${row.rank ?? "—"})` : "(Tạm tính)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {eligible && (
              <button
                type="button"
                onClick={() => setScheduling(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover transition-all cursor-pointer"
              >
                <CalendarDays className="size-3.5" />
                <span>Đặt lịch phỏng vấn</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Quay lại</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: LEFT SIDEBAR TABS (1/4) + RIGHT CONTENT AREA (3/4) */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Navigation: Vertical Category Tabs */}
        <aside className={cn("w-full lg:w-64 shrink-0", stickyDetailSidebar)}>
          <div className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <span className="block px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              CÁC MỤC ĐÁNH GIÁ
            </span>

            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer border",
                    isActive
                      ? cn(tab.activeBg, tab.activeText, tab.activeBorder, "shadow-2xs")
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "size-4",
                        isActive ? tab.activeText : "text-slate-400 dark:text-slate-500"
                      )}
                    />
                    <span>{tab.label}</span>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                      isActive
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Main Content Area: Detailed work results for the selected category */}
        <main className="flex-1 min-w-0 space-y-6">
          {activeTab === "ai_interview" && (
            <CandidateAiInterviewTab
              applicationId={row.applicationId}
              interviewId={effectiveInterviewId}
              candidateName={row.candidateName}
              jobId={jobId}
              preview={preview}
            />
          )}

          {activeTab === "assessment" && (
            <CandidateAssessmentTab
              applicationId={row.applicationId}
              submissionId={effectiveSubmissionId}
              candidateName={row.candidateName}
              jobId={jobId}
              preview={preview}
            />
          )}

          {activeTab === "schedule" && (
            <CandidateSchedulingTab
              applicationId={row.applicationId}
              candidateName={row.candidateName}
              jobId={jobId}
              rounds={rounds}
              cvScreeningStatus={application.data?.data.cvScreeningStatus}
              preview={preview}
              onOpenScheduleDialog={() => setScheduling(true)}
            />
          )}

          {activeTab === "overview" && (
            <CandidateOverviewTab
              row={row}
              sourcesData={sources.data?.data}
              tenantKey={tenantKey}
              preview={preview}
            />
          )}
        </main>
      </div>

      {/* Schedule Dialog inside Dialog container */}
      {scheduling && interviewOptions.data && (
        <HumanInterviewScheduleDialog
          jobId={jobId}
          options={interviewOptions.data}
          lockedApplicationId={row.applicationId}
          onClose={() => setScheduling(false)}
          onSaved={(draft) => {
            setScheduling(false);
            toast.success(
              draft
                ? "Đã lưu bản nháp lịch phỏng vấn (chưa gửi thông báo)."
                : "Đã lưu lịch và gửi lời mời / thông báo tới ứng viên và hội đồng."
            );
            void application.refetch();
            void humanInterviews.refetch();
          }}
          onProfile={() =>
            navigate(`/recruiter/jobs/${jobId}/applicants?applicationId=${row.applicationId}`)
          }
          onAiReport={() =>
            navigate(`/recruiter/jobs/${jobId}/ai-interviews?applicationId=${row.applicationId}`)
          }
        />
      )}
      {scheduling && interviewOptions.isPending && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/40">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <Skeleton className="h-4 w-40" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
        </div>
      )}
      {scheduling && interviewOptions.isError && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/40 p-4">
          <div
            className="rounded-2xl border border-rose-200 bg-white p-6 shadow-xl dark:border-rose-900/50 dark:bg-slate-900"
            role="alert"
          >
            <p className="text-sm text-rose-600">{getApiErrorMessage(interviewOptions.error)}</p>
            <button
              type="button"
              className="mt-3 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              onClick={() => setScheduling(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const RankingDetailContent = RankingCandidateDetailView;

export function RankingDetailLoading() {
  return (
    <div className="flex w-full flex-col gap-4 py-2">
      {/* Header skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full lg:w-64 shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-4 w-24 mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex-1 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function RankingDetailError({
  message,
  onBack,
  onRetry,
}: {
  message?: string;
  onBack?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center py-12 text-center">
      <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-4">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Không thể tải chi tiết xếp hạng
        </h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {message || "Đã xảy ra lỗi khi tải dữ liệu chi tiết ứng viên."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Quay lại bảng xếp hạng</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function RankingDetail({
  applicationId,
  previewRow,
  fallbackRow,
  jobId,
  jobTitle,
  tenantKey,
  onClose,
}: {
  applicationId: number;
  previewRow?: RankingRow;
  fallbackRow?: RankingRow;
  jobId: number;
  jobTitle: string;
  tenantKey: string;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ["ranking-detail", tenantKey, applicationId],
    queryFn: () => matchingApi.detail(applicationId),
    enabled: !previewRow,
  });

  if (previewRow) {
    return (
      <RankingCandidateDetailView
        row={previewRow}
        jobId={jobId}
        jobTitle={jobTitle}
        tenantKey={tenantKey}
        preview
        onClose={onClose}
      />
    );
  }

  if (detail.isPending) {
    return <RankingDetailLoading />;
  }

  if (detail.isError && fallbackRow) {
    return (
      <RankingCandidateDetailView
        row={fallbackRow}
        jobId={jobId}
        jobTitle={jobTitle}
        tenantKey={tenantKey}
        fallback
        onClose={onClose}
      />
    );
  }

  if (detail.isError) {
    return (
      <RankingDetailError
        message={getApiErrorMessage(detail.error)}
        onBack={onClose}
        onRetry={() => void detail.refetch()}
      />
    );
  }

  return (
    <RankingCandidateDetailView
      row={detail.data.data}
      jobId={jobId}
      jobTitle={jobTitle}
      tenantKey={tenantKey}
      onClose={onClose}
    />
  );
}
