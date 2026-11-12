import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  FileText,
  GitBranch,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { useLocale, useT, type Locale, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { button, primary, stickyDetailSidebar } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import {
  ComponentBars,
  FitTiles,
  formatScreeningScore,
  RequirementGroups,
  ScreeningAiPanel,
  ScreeningScoreCard,
} from "@/features/tenant/recruiter/cv-screening/components/ScreeningBreakdown";
import { GithubEvidencePanel } from "@/features/tenant/recruiter/cv-screening/components/GithubEvidencePanel";
import { CvScreeningDecision } from "@/features/tenant/recruiter/cv-screening/components/CvScreeningDecision";
import { CvStatusBadge, formatCvDate } from "@/features/tenant/recruiter/cv-screening/components/CvStatusBadge";
import type { CvDetail, GithubAnalysisView } from "@/api/types/cv";

type SectionTab = "overview" | "skills" | "github" | "file";
type OverviewSubTab = "ai" | "score";

const SECTION_TABS: readonly SectionTab[] = ["overview", "skills", "github", "file"];

function githubBadge(analysis: GithubAnalysisView | null | undefined, t: TranslateFn, locale: Locale) {
  if (!analysis) return t("recruiter.screening.cvDetail.githubBadge.noneYet");
  if (analysis.score != null) {
    return t("recruiter.screening.common.pointsShort", { score: formatScreeningScore(analysis.score, locale) });
  }
  switch (analysis.status) {
    case "NOT_PROVIDED":
      return t("recruiter.screening.cvDetail.githubBadge.notProvided");
    case "PENDING":
    case "PROCESSING":
      return t("recruiter.screening.cvDetail.githubBadge.running");
    case "FAILED":
      return t("recruiter.screening.cvDetail.githubBadge.failed");
    case "PARTIAL":
      return t("recruiter.screening.cvDetail.githubBadge.partial");
    default:
      return t("recruiter.screening.cvDetail.githubBadge.done");
  }
}

function fileBadge(filename: string, fallback: string) {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return fallback;
  return filename.slice(dot + 1, dot + 6).toUpperCase();
}

export function CvDetailPage() {
  const t = useT();
  const locale = useLocale();
  const { id: routeJobId, cvId: routeCvId } = useParams<{ id?: string; cvId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);

  const jobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const cvId = routeCvId && /^\d+$/.test(routeCvId) ? Number(routeCvId) : null;

  const backSearch = (location.state as { backSearch?: string } | null)?.backSearch ?? "";
  const listUrl = jobId ? `/recruiter/jobs/${jobId}/cvs${backSearch}` : "/recruiter";

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
    queryKey: queryKeys.cvs.detail(cvId ?? 0),
    queryFn: () => cvApi.get(cvId!),
    enabled: cvId !== null,
    refetchInterval: (q) => {
      const status = q.state.data?.data?.status;
      const ghStatus = q.state.data?.data?.githubAnalysis?.status;
      const cvBusy = status === "UPLOADED" || status === "PARSING" || status === "PARSED" || status === "EXTRACTING" || status === "ANALYZING";
      const ghBusy = ghStatus === "PENDING" || ghStatus === "PROCESSING";
      return cvBusy || ghBusy ? 4_000 : false;
    },
  });

  const jobQuery = useQuery({
    queryKey: ["jobs", "detail", String(jobId ?? "")],
    queryFn: () => jobApi.get(String(jobId!)),
    enabled: jobId !== null,
  });

  const retryParse = useMutation({
    mutationFn: (targetId: number) => cvApi.parse(targetId),
    onSuccess: (response, targetId) => {
      client.setQueryData(queryKeys.cvs.detail(targetId), response);
      void client.invalidateQueries({ queryKey: queryKeys.cvs.byJob(jobId ?? 0) });
      void detail.refetch();
      toast.success(t("recruiter.screening.cvDetail.toastAnalyzed"));
    },
  });

  const remove = useMutation({
    mutationFn: (targetId: number) => cvApi.remove(targetId),
    onSuccess: (_response, targetId) => {
      client.removeQueries({ queryKey: queryKeys.cvs.detail(targetId) });
      void client.invalidateQueries({ queryKey: queryKeys.cvs.byJob(jobId ?? 0) });
      toast.success(t("recruiter.screening.cvDetail.toastDeleted"));
      navigate(listUrl, { replace: true });
    },
  });

  if (!jobId || !cvId) {
    return <Navigate to={jobId ? `/recruiter/jobs/${jobId}/cvs` : "/recruiter"} replace />;
  }

  const cv = detail.data?.data;
  const jobTitle = jobQuery.data?.data?.title ?? t("recruiter.screening.cvDetail.jobFallback", { id: jobId });

  const confirmDelete = (target: CvDetail) =>
    askConfirm({
      title: t("recruiter.screening.cvDetail.confirmDeleteTitle"),
      description: t("recruiter.screening.cvDetail.confirmDeleteDesc", { name: target.candidateName }),
      confirmLabel: t("recruiter.screening.cvDetail.confirmDeleteBtn"),
      danger: true,
      onConfirm: async () => {
        await remove.mutateAsync(target.id);
      },
    });

  if (detail.isPending) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4" role="status" aria-busy="true">
        <Skeleton className="h-5 w-72 rounded-md" />
        <SkeletonCard className="h-24" />
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-96" />
        </div>
        <span className="sr-only">{t("recruiter.screening.cvDetail.loadingSr")}</span>
      </section>
    );
  }

  if (detail.isError || !cv) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-[var(--color-error)]" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">{t("recruiter.screening.cvDetail.errorTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]" role="alert">
            {detail.error ? getApiErrorMessage(detail.error) : t("recruiter.screening.cvDetail.errorFallback")}
          </p>
          <Link to={listUrl} className={cn(button, "mt-4 inline-flex")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("recruiter.screening.cvDetail.backToList")}
          </Link>
        </div>
      </section>
    );
  }

  const match = cv.match;
  const breakdown = match?.breakdown;
  const hasMatch = match != null;
  const passed = breakdown?.passed === true;
  const threshold = breakdown?.passThreshold;
  const canAnalyze = cv.status === "UPLOADED" || cv.status === "FAILED" || cv.status === "ANALYZED";
  const analyzed = cv.status === "ANALYZED";
  const matchedCount = breakdown?.matched?.length ?? 0;
  const partialCount = breakdown?.partialMatches?.length ?? 0;
  const missingCount = breakdown?.missing?.length ?? 0;
  const requiredMissingCount = breakdown?.requiredMissing?.length ?? 0;
  const totalReq = matchedCount + partialCount + missingCount;

  const navItems: Array<{
    id: SectionTab;
    label: string;
    badge: string;
    icon: typeof Sparkles;
  }> = [
    {
      id: "overview",
      label: t("recruiter.screening.cvDetail.tabs.overview"),
      badge: hasMatch
        ? t("recruiter.screening.common.pointsShort", { score: formatScreeningScore(match.score, locale) })
        : t("recruiter.screening.cvDetail.tabs.unscoredBadge"),
      icon: Sparkles,
    },
    {
      id: "skills",
      label: t("recruiter.screening.cvDetail.tabs.skills"),
      badge: totalReq > 0
        ? t("recruiter.screening.cvDetail.tabs.matchedRatio", { matched: matchedCount, total: totalReq })
        : t("recruiter.screening.cvDetail.tabs.skillCount", { count: cv.skills.length }),
      icon: ListChecks,
    },
    {
      id: "github",
      label: t("recruiter.screening.cvDetail.tabs.github"),
      badge: githubBadge(cv.githubAnalysis, t, locale),
      icon: GitBranch,
    },
    {
      id: "file",
      label: t("recruiter.screening.cvDetail.tabs.file"),
      badge: fileBadge(cv.originalFilename, t("recruiter.screening.cvDetail.tabs.fileDefaultBadge")),
      icon: FileText,
    },
  ];

  const modelLabel = match?.modelVersion
    ? (match.modelVersion === "hybrid-v1"
        ? t("recruiter.screening.breakdown.models.hybrid-v1")
        : match.modelVersion)
    : null;

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 pb-10 text-[var(--color-on-surface)]">
      {/* 1. Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 px-1 text-xs sm:text-sm">
        <Sparkles className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <Link
          to={listUrl}
          className="font-medium text-slate-600 transition-colors hover:text-[var(--color-primary)]"
        >
          {t("recruiter.screening.cvDetail.breadcrumbPrefix", { jobTitle })}
        </Link>
        <span className="text-slate-400" aria-hidden="true">/</span>
        <span className="truncate font-semibold text-slate-900">
          {cv.candidateName} <span className="font-normal text-slate-500">{t("recruiter.screening.cvDetail.cvCode", { id: cv.id })}</span>
        </span>
      </nav>

      {/* 2. Top Candidate Header Card */}
      <header className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-5 py-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            to={listUrl}
            aria-label={t("recruiter.screening.cvDetail.backToList")}
            title={t("recruiter.screening.cvDetail.backToList")}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">{cv.candidateName}</h1>
              <CvStatusBadge status={cv.status} />
              {hasMatch && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                  )}
                >
                  {passed ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <XCircle className="size-3.5" aria-hidden="true" />}
                  {passed ? t("recruiter.screening.cvDetail.cvPassed") : t("recruiter.screening.cvDetail.cvFailed")}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500 sm:text-[13px]">
              {cv.originalFilename} · {t("recruiter.screening.cvDetail.submittedAt", { date: formatCvDate(cv.createdAt, locale) })}
              {cv.extractionModel ? ` · ${cv.extractionModel}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
          {/* Score highlight */}
          <div className="lg:border-l lg:border-slate-200 lg:pl-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("recruiter.screening.breakdown.scoreCardTitle")}
            </p>
            <p className="mt-0.5 flex items-baseline gap-1.5 tabular-nums">
              <span className={cn("text-2xl font-bold", hasMatch ? (passed ? "text-emerald-600" : "text-[var(--color-primary)]") : "text-slate-400")}>
                {hasMatch ? formatScreeningScore(match.score, locale) : "—"}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
              {threshold != null && (
                <span className="text-xs font-medium text-slate-500">
                  {t("recruiter.screening.cvDetail.thresholdParen", { threshold: formatScreeningScore(threshold, locale) })}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canAnalyze && (
              <button
                type="button"
                className={primary}
                disabled={retryParse.isPending || remove.isPending}
                onClick={() => retryParse.mutate(cv.id)}
              >
                {retryParse.isPending
                  ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  : <RefreshCw className="size-4" aria-hidden="true" />}
                {retryParse.isPending
                  ? t("recruiter.screening.cvDetail.analyzingBtn")
                  : analyzed
                    ? t("recruiter.screening.cvDetail.reanalyzeBtn")
                    : t("recruiter.screening.cvDetail.analyzeBtn")}
              </button>
            )}
            <button
              type="button"
              className={cn(button, "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]")}
              disabled={remove.isPending}
              onClick={() => confirmDelete(cv)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {remove.isPending
                ? t("recruiter.screening.cvDetail.deletingBtn")
                : t("recruiter.screening.cvDetail.deleteBtn")}
            </button>
            <Link to={listUrl} className={button}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("recruiter.screening.common.back")}
            </Link>
          </div>
        </div>
      </header>

      {(cv.errorMessage || retryParse.isError) && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-[var(--color-error-container)] px-4 py-3 text-sm text-[var(--color-on-error-container)]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{retryParse.isError ? getApiErrorMessage(retryParse.error) : cv.errorMessage}</span>
        </div>
      )}

      {/* 3. Main 2-Column Workspace (Left Section Nav + Right Content Panel) */}
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Left Sidebar */}
        <aside className={cn("rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-2xs", stickyDetailSidebar)}>
          <p className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t("recruiter.screening.cvDetail.sidebarHeading")}
          </p>
          <nav className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1" aria-label={t("recruiter.screening.cvDetail.sidebarNavAria")}>
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
                    "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
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
            <>
              {hasMatch ? (
                <div className="space-y-5">
                  {/* Summary Header Card */}
                  <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                          <Sparkles className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">
                              {t("recruiter.screening.cvDetail.overview.cardTitle", { id: cv.id })}
                            </h2>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                              )}
                            >
                              <span className={cn("size-1.5 rounded-full", passed ? "bg-emerald-600" : "bg-rose-600")} aria-hidden="true" />
                              {passed
                                ? t("recruiter.screening.cvDetail.overview.passed")
                                : t("recruiter.screening.cvDetail.overview.failed")}
                            </span>
                            {modelLabel && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                {modelLabel}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {t("recruiter.screening.cvDetail.overview.extractedWith", {
                              jobTitle,
                              model: cv.extractionModel ?? t("recruiter.screening.cvDetail.overview.defaultModel"),
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-2.5 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {t("recruiter.screening.cvDetail.overview.screeningScoreLabel")}
                        </p>
                        <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", passed ? "text-emerald-600" : "text-[var(--color-primary)]")}>
                          {formatScreeningScore(match.score, locale)}
                          <span className="text-xs font-normal text-slate-400"> /100</span>
                        </p>
                      </div>
                    </div>

                    {/* 4 KPI Summary Tiles */}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <KpiBox
                        label={t("recruiter.screening.cvDetail.overview.kpiThreshold")}
                        value={threshold != null
                          ? `${formatScreeningScore(threshold, locale)} ${t("recruiter.screening.common.pointsOutOf", { total: 100 })}`
                          : t("recruiter.screening.cvDetail.overview.kpiThresholdNotSet")}
                      />
                      <KpiBox
                        label={t("recruiter.screening.cvDetail.overview.kpiSkillOverlap")}
                        value={breakdown?.jaccardSimilarity != null ? formatScreeningScore(breakdown.jaccardSimilarity, locale) : "—"}
                        hint={t("recruiter.screening.cvDetail.overview.kpiJaccardHint")}
                      />
                      <KpiBox
                        label={t("recruiter.screening.cvDetail.overview.kpiJobSkills")}
                        value={totalReq > 0
                          ? t("recruiter.screening.cvDetail.tabs.matchedRatio", { matched: matchedCount, total: totalReq })
                          : t("recruiter.screening.cvDetail.tabs.skillCount", { count: cv.skills.length })}
                        hint={requiredMissingCount > 0
                          ? t("recruiter.screening.cvDetail.overview.kpiMissingRequired", { count: requiredMissingCount })
                          : undefined}
                      />
                      <KpiBox
                        label={t("recruiter.screening.cvDetail.overview.kpiOverall")}
                        value={passed
                          ? t("recruiter.screening.cvDetail.overview.kpiOverallPass")
                          : t("recruiter.screening.cvDetail.overview.kpiOverallFail")}
                        tone={passed ? "pass" : "fail"}
                      />
                    </div>

                    {/* Sub-tabs inside Overview */}
                    <div className="mt-5 flex flex-wrap gap-6 border-b border-slate-200" role="tablist" aria-label={t("recruiter.screening.cvDetail.overview.subTabsAria")}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={overviewSubTab === "ai"}
                        onClick={() => setOverviewSubTab("ai")}
                        className={cn(
                          "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                          overviewSubTab === "ai"
                            ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                            : "border-transparent text-slate-500 hover:text-slate-800",
                        )}
                      >
                        <Sparkles className="size-4" aria-hidden="true" />
                        {t("recruiter.screening.cvDetail.overview.subTabAi")}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={overviewSubTab === "score"}
                        onClick={() => setOverviewSubTab("score")}
                        className={cn(
                          "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                          overviewSubTab === "score"
                            ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                            : "border-transparent text-slate-500 hover:text-slate-800",
                        )}
                      >
                        <SlidersHorizontal className="size-4" aria-hidden="true" />
                        {t("recruiter.screening.cvDetail.overview.subTabScore")}
                      </button>
                    </div>

                    <div className="mt-5">
                      {overviewSubTab === "ai" ? (
                        <ScreeningAiPanel breakdown={breakdown} extraction={cv.extraction} skills={cv.skills} />
                      ) : (
                        <div className="space-y-5">
                          <ScreeningScoreCard score={match.score} modelVersion={match.modelVersion} breakdown={breakdown} />
                          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 space-y-5">
                            <ComponentBars breakdown={breakdown} />
                            <FitTiles breakdown={breakdown} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {cv.applicationId != null && (
                    <CvScreeningDecision
                      applicationId={cv.applicationId}
                      onDecided={() => {
                        void detail.refetch();
                        void client.invalidateQueries({ queryKey: queryKeys.cvs.byJob(jobId) });
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-6 py-12 text-center">
                    <CircleDashed className="size-8 text-slate-400" aria-hidden="true" />
                    <h2 className="mt-3 text-base font-semibold text-slate-900">
                      {t("recruiter.screening.cvDetail.overview.emptyTitle")}
                    </h2>
                    <p className="mt-1 max-w-md text-sm text-slate-500">
                      {t("recruiter.screening.cvDetail.overview.emptyDesc")}
                    </p>
                  </div>
                  {cv.applicationId != null && (
                    <CvScreeningDecision
                      applicationId={cv.applicationId}
                      onDecided={() => void detail.refetch()}
                    />
                  )}
                </div>
              )}
            </>
          )}

          {activeSection === "skills" && (
            <div className="space-y-5">
              {hasMatch ? (
                <>
                  <div className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
                    <ComponentBars breakdown={breakdown} />
                    <FitTiles breakdown={breakdown} />
                  </div>
                  <RequirementGroups
                    wide
                    groups={[
                      { title: t("recruiter.screening.breakdown.reqMatched"), items: breakdown?.matched },
                      { title: t("recruiter.screening.breakdown.reqPartial"), items: breakdown?.partialMatches },
                      { title: t("recruiter.screening.breakdown.reqMissing"), items: breakdown?.missing },
                    ]}
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-8 text-center text-sm text-slate-500">
                  {t("recruiter.screening.cvDetail.skills.emptyCompare")}
                </div>
              )}

              {(cv.skills.length > 0 || cv.analysis?.yearsExperience != null) && (
                <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{t("recruiter.screening.cvDetail.skills.extractedTitle")}</h3>
                    {cv.analysis?.yearsExperience != null && (
                      <span className="rounded-full bg-[var(--color-surface-container-low)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-on-surface-variant)]">
                        {t("recruiter.screening.cvDetail.skills.yearsExp", { years: cv.analysis.yearsExperience })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cv.skills.map((skill) => (
                      <span key={skill.canonicalName} className="rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-xs font-medium">
                        {skill.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "github" && <GithubEvidencePanel analysis={cv.githubAnalysis} />}

          {activeSection === "file" && (
            <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-900">{cv.originalFilename}</h2>
                </div>
                <span className="text-xs text-slate-500">
                  {t("recruiter.screening.cvDetail.submittedAt", { date: formatCvDate(cv.createdAt, locale) })}
                </span>
              </div>
              <CvFilePreview cvId={cv.id} mimeType={cv.mimeType} filename={cv.originalFilename} />
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

