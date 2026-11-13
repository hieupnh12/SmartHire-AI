import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  History,
  Info,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  StickyNote,
  Users,
  Workflow,
  XCircle,
} from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { CvRef } from "@/api/types/applicant";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { useLocale, useT, type TranslateFn } from "@/i18n";
import { ApplicantRounds } from "@/features/tenant/recruiter/applicants/components/ApplicantRounds";
import { HiringDecisionPanel } from "@/features/tenant/recruiter/applicants/components/HiringDecisionPanel";
import {
  ApplicantStatusPill,
  formatApplicantDateTime,
  getActionToast,
  getApplicantStatusLabel,
  sourceLabel,
  splitApplicantTags,
} from "@/features/tenant/recruiter/applicants/components/applicantUi";
import { CvScreeningDecision } from "@/features/tenant/recruiter/cv-screening/components/CvScreeningDecision";
import { GithubEvidencePanel } from "@/features/tenant/recruiter/cv-screening/components/GithubEvidencePanel";
import {
  formatScreeningScore,
  ScreeningBreakdown,
} from "@/features/tenant/recruiter/cv-screening/components/ScreeningBreakdown";
import { ApplicationPipeline, pipelineIndex } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { button, input, primary, stickyDetailSidebar } from "@/features/tenant/recruiter/matching/components/rankingUi";

type SectionTab = "overview" | "cv" | "manage" | "history";
type OverviewSubTab = "rounds" | "info";
type CvSubTab = "ai" | "file";

const SECTION_TABS: readonly SectionTab[] = ["overview", "cv", "manage", "history"];

function roundStatusSummary(t: TranslateFn, status?: string, passed?: boolean | null) {
  if (passed === true || status === "PASSED") return t("recruiter.ops.applicants.rounds.summaryStatus.PASSED");
  if (passed === false || status === "FAILED") return t("recruiter.ops.applicants.rounds.summaryStatus.FAILED");
  const code = status ?? "MISSING";
  const key = `recruiter.ops.applicants.rounds.summaryStatus.${code}`;
  const label = t(key);
  return label === key ? t("recruiter.ops.applicants.rounds.summaryStatus.MISSING") : label;
}

export function ApplicantDetailPage() {
  const t = useT();
  const locale = useLocale();
  const { id: routeJobId, applicationId: routeAppId } = useParams<{ id?: string; applicationId?: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);

  const jobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const applicationId = routeAppId && /^\d+$/.test(routeAppId) ? Number(routeAppId) : null;
  const backSearch = (location.state as { backSearch?: string } | null)?.backSearch ?? "";
  const listUrl = jobId ? `/recruiter/jobs/${jobId}/applicants${backSearch}` : "/recruiter";

  const requestedSection = searchParams.get("section") as SectionTab | null;
  const activeSection: SectionTab = requestedSection && SECTION_TABS.includes(requestedSection) ? requestedSection : "overview";
  const [overviewSubTab, setOverviewSubTab] = useState<OverviewSubTab>("rounds");
  const [cvSubTab, setCvSubTab] = useState<CvSubTab>("ai");

  const setActiveSection = (section: SectionTab) => {
    const next = new URLSearchParams(searchParams);
    if (section === "overview") next.delete("section");
    else next.set("section", section);
    setSearchParams(next, { replace: true });
  };

  const detailQuery = useQuery({
    queryKey: queryKeys.applicants.detail(applicationId ?? 0),
    queryFn: () => applicantApi.get(applicationId!),
    enabled: applicationId !== null,
    refetchInterval: 8_000,
  });

  const jobQuery = useQuery({
    queryKey: queryKeys.jobs.detail(jobId ?? 0),
    queryFn: () => jobApi.get(jobId!),
    enabled: jobId !== null,
  });

  const detail = detailQuery.data?.data;
  const activeCvs = useMemo(() => (detail?.cvs ?? []).filter((cv) => !cv.expired), [detail?.cvs]);
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const selectedCv: CvRef | null = useMemo(
    () => activeCvs.find((cv) => cv.id === selectedCvId) ?? activeCvs[0] ?? null,
    [activeCvs, selectedCvId],
  );

  const cvDetailQuery = useQuery({
    queryKey: queryKeys.cvs.detail(selectedCv?.id ?? 0),
    queryFn: () => cvApi.get(selectedCv!.id),
    enabled: selectedCv !== null,
    refetchInterval: (q) => {
      const st = q.state.data?.data?.status;
      return st === "UPLOADED" || st === "PARSING" || st === "PARSED" || st === "EXTRACTING" || st === "ANALYZING"
        ? 4_000
        : false;
    },
  });

  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!detail) return;
    setNotes(detail.notes ?? "");
    setTags(detail.tags ?? "");
  }, [detail?.id, detail?.notes, detail?.tags]);

  const refreshAll = () => {
    void detailQuery.refetch();
    void cvDetailQuery.refetch();
    void client.invalidateQueries({ queryKey: queryKeys.applicants.byJob(jobId ?? "all") });
  };

  const analyzeCv = useMutation({
    mutationFn: (cvId: number) => cvApi.parse(cvId),
    onSuccess: (response, cvId) => {
      client.setQueryData(queryKeys.cvs.detail(cvId), response);
      void cvDetailQuery.refetch();
      void detailQuery.refetch();
      void client.invalidateQueries({ queryKey: queryKeys.cvs.byJob(jobId ?? 0) });
      toast.success(t("recruiter.ops.applicants.detail.cvAnalyzedToast"));
    },
  });

  const saveManage = useMutation({
    mutationFn: () =>
      applicantApi.update(detail!.id, {
        notes,
        tags,
        assigneeEmail: assigneeEmail.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t("recruiter.ops.applicants.detail.manageSavedToast"));
      setAssigneeEmail("");
      refreshAll();
    },
  });

  const act = useMutation({
    mutationFn: (action: "reject" | "archive" | "restore") => {
      if (action === "reject") return applicantApi.reject(detail!.id, reason.trim() || undefined);
      if (action === "archive") return applicantApi.archive(detail!.id);
      return applicantApi.restore(detail!.id);
    },
    onSuccess: (_response, action) => {
      toast.success(getActionToast(action, t));
      refreshAll();
    },
  });

  if (!jobId || !applicationId) {
    return <Navigate to={jobId ? `/recruiter/jobs/${jobId}/applicants` : "/recruiter"} replace />;
  }

  if (detailQuery.isPending) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4" role="status" aria-busy="true">
        <Skeleton className="h-5 w-72 rounded-md" />
        <SkeletonCard className="h-24" />
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-96" />
        </div>
        <span className="sr-only">{t("recruiter.ops.applicants.detail.loadingSr")}</span>
      </section>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-[var(--color-error)]" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">{t("recruiter.ops.applicants.detail.loadErrorTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]" role="alert">
            {detailQuery.error
              ? getApiErrorMessage(detailQuery.error)
              : t("recruiter.ops.applicants.detail.notFoundFallback")}
          </p>
          <Link to={listUrl} className={cn(button, "mt-4 inline-flex")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("recruiter.ops.applicants.detail.backToList")}
          </Link>
        </div>
      </section>
    );
  }

  const jobTitle =
    detail.jobTitle ||
    jobQuery.data?.data?.title ||
    t("recruiter.ops.applicants.detail.jobFallbackTitle", { id: jobId });
  const rounds = detail.rounds;
  const gate = detail.gateScore;
  const cvDetail = cvDetailQuery.data?.data;
  const cvBreakdown = cvDetail?.match?.breakdown;

  const hasGateScore = gate?.score != null;
  const hasCvScore = rounds?.cv.score != null;
  const headerMetricLabel = hasGateScore
    ? t("recruiter.ops.applicants.detail.metricGate")
    : hasCvScore
      ? t("recruiter.ops.applicants.detail.metricCv")
      : t("recruiter.ops.applicants.detail.metricProgress");
  const headerMetricValue = hasGateScore
    ? formatScreeningScore(gate!.score)
    : hasCvScore
      ? formatScreeningScore(rounds!.cv.score)
      : "—";
  const headerMetricThreshold = hasGateScore ? gate?.passThreshold : hasCvScore ? rounds?.cv.threshold : null;
  const headerPassed = hasGateScore ? gate?.passed === true : hasCvScore ? rounds?.cv.passed === true : false;

  const stepIndex = pipelineIndex(detail.status);
  const currentStepBadge =
    stepIndex >= 0
      ? t("recruiter.ops.applicants.detail.stepBadge", { current: stepIndex + 1 })
      : getApplicantStatusLabel(detail.status, t);
  const tagList = splitApplicantTags(detail.tags);

  const navItems: Array<{
    id: SectionTab;
    label: string;
    badge: string;
    icon: typeof Sparkles;
  }> = [
    {
      id: "overview",
      label: t("recruiter.ops.applicants.detail.navOverview"),
      badge: hasGateScore
        ? t("recruiter.ops.applicants.detail.scoreBadgeShort", { score: formatScreeningScore(gate!.score) })
        : currentStepBadge,
      icon: Sparkles,
    },
    {
      id: "cv",
      label: t("recruiter.ops.applicants.detail.navCv"),
      badge: hasCvScore
        ? t("recruiter.ops.applicants.detail.scoreBadgeShort", { score: formatScreeningScore(rounds!.cv.score) })
        : activeCvs.length > 0
          ? t("recruiter.ops.applicants.detail.filesCountBadge", { count: activeCvs.length })
          : t("recruiter.ops.applicants.detail.cvNotSubmitted"),
      icon: FileText,
    },
    {
      id: "manage",
      label: t("recruiter.ops.applicants.detail.navManage"),
      badge:
        tagList.length > 0
          ? t("recruiter.ops.applicants.detail.tagsCountBadge", { count: tagList.length })
          : detail.notes
            ? t("recruiter.ops.applicants.detail.hasNotesBadge")
            : t("recruiter.ops.applicants.detail.manageBadge"),
      icon: StickyNote,
    },
    {
      id: "history",
      label: t("recruiter.ops.applicants.detail.navHistory"),
      badge: t("recruiter.ops.applicants.detail.historyCountBadge", { count: detail.history.length }),
      icon: History,
    },
  ];

  const canReject = detail.status !== "REJECTED" && detail.status !== "WITHDRAWN";
  const confirmReject = () =>
    askConfirm({
      title: t("recruiter.ops.applicants.detail.confirmRejectTitle"),
      description: t("recruiter.ops.applicants.detail.confirmRejectDesc", {
        name: detail.candidateName,
        reasonSuffix: reason.trim() ? "" : t("recruiter.ops.applicants.detail.confirmRejectNoReason"),
      }),
      danger: true,
      confirmLabel: t("recruiter.ops.applicants.detail.confirmRejectBtn"),
      onConfirm: async () => {
        await act.mutateAsync("reject");
      },
    });

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 pb-10 text-[var(--color-on-surface)]">
      {/* 1. Breadcrumb Trail (đồng bộ CvDetailPage) */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 px-1 text-xs sm:text-sm">
        <Users className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <Link
          to={listUrl}
          className="font-medium text-slate-600 transition-colors hover:text-[var(--color-primary)]"
        >
          {t("recruiter.ops.applicants.detail.breadcrumbApplicants", { jobTitle })}
        </Link>
        <span className="text-slate-400" aria-hidden="true">/</span>
        <span className="truncate font-semibold text-slate-900">
          {detail.candidateName}{" "}
          <span className="font-normal text-slate-500">
            {t("recruiter.ops.applicants.detail.breadcrumbApplicationId", { id: detail.id })}
          </span>
        </span>
      </nav>

      {/* 2. Top Candidate Header Card */}
      <header className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-5 py-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            to={listUrl}
            aria-label={t("recruiter.ops.applicants.detail.backToList")}
            title={t("recruiter.ops.applicants.detail.backToList")}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">{detail.candidateName}</h1>
              <ApplicantStatusPill status={detail.status} />
              {detail.candidateApplicationCount > 1 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  {t("recruiter.ops.applicants.detail.applicationCountBadge", {
                    count: detail.candidateApplicationCount,
                  })}
                </span>
              )}
              {detail.archived && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {t("recruiter.ops.applicants.list.archivedBadge")}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500 sm:text-[13px]">
              {t("recruiter.ops.applicants.detail.headerSubline", {
                email: detail.candidateEmail,
                date: formatApplicantDateTime(detail.createdAt, locale),
                source: sourceLabel(detail.source, t),
              })}
              {detail.assigneeName
                ? t("recruiter.ops.applicants.detail.headerAssigneeInline", { name: detail.assigneeName })
                : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
          <div className="lg:border-l lg:border-slate-200 lg:pl-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{headerMetricLabel}</p>
            <p className="mt-0.5 flex items-baseline gap-1.5 tabular-nums">
              <span
                className={cn(
                  "text-2xl font-bold",
                  hasGateScore || hasCvScore
                    ? headerPassed
                      ? "text-emerald-600"
                      : "text-[var(--color-primary)]"
                    : "text-slate-400",
                )}
              >
                {headerMetricValue}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
              {headerMetricThreshold != null && (
                <span className="text-xs font-medium text-slate-500">
                  {t("recruiter.ops.applicants.detail.thresholdParen", {
                    score: formatScreeningScore(headerMetricThreshold),
                  })}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedCv && (
              <button
                type="button"
                className={primary}
                disabled={analyzeCv.isPending || act.isPending}
                onClick={() => analyzeCv.mutate(selectedCv.id)}
              >
                {analyzeCv.isPending
                  ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  : <RefreshCw className="size-4" aria-hidden="true" />}
                {analyzeCv.isPending
                  ? t("recruiter.ops.applicants.detail.analyzingCv")
                  : selectedCv.status === "ANALYZED"
                    ? t("recruiter.ops.applicants.detail.reanalyzeCvBtn")
                    : t("recruiter.ops.applicants.detail.analyzeCvBtn")}
              </button>
            )}
            <button
              type="button"
              className={button}
              disabled={act.isPending}
              onClick={() => act.mutate(detail.archived ? "restore" : "archive")}
            >
              {detail.archived ? <ArchiveRestore className="size-4" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
              {detail.archived
                ? t("recruiter.ops.applicants.detail.restoreBtn")
                : t("recruiter.ops.applicants.detail.archiveBtn")}
            </button>
            <Link to={listUrl} className={button}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("recruiter.ops.common.back")}
            </Link>
          </div>
        </div>
      </header>

      {(analyzeCv.isError || act.isError) && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-[var(--color-error-container)] px-4 py-3 text-sm text-[var(--color-on-error-container)]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{getApiErrorMessage(analyzeCv.isError ? analyzeCv.error : act.error)}</span>
        </div>
      )}

      {/* 3. Main 2-Column Workspace (Left Section Nav + Right Content Panel) */}
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={cn("rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-2xs", stickyDetailSidebar)}>
          <p className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t("recruiter.ops.applicants.detail.sectionsLabel")}
          </p>
          <nav className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1" aria-label={t("recruiter.ops.applicants.detail.sectionsNavAria")}>
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
            <div className="space-y-5">
              {/* Summary Header Card (matching CvDetailPage) */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                      <Workflow className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {t("recruiter.ops.applicants.detail.applicationTitle", { id: detail.id })}
                        </h2>
                        <ApplicantStatusPill status={detail.status} />
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {sourceLabel(detail.source, t)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("recruiter.ops.applicants.detail.summaryMeta", {
                          jobTitle,
                          assignee: detail.assigneeName ?? t("recruiter.ops.common.unassigned"),
                        })}
                        {detail.referralCode
                          ? t("recruiter.ops.applicants.detail.referralInline", { code: detail.referralCode })
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-2.5 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {hasGateScore
                        ? t("recruiter.ops.applicants.detail.compositeScoreLabel")
                        : t("recruiter.ops.applicants.detail.cvScoreLabel")}
                    </p>
                    <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", headerPassed ? "text-emerald-600" : "text-[var(--color-primary)]")}>
                      {headerMetricValue}
                      <span className="text-xs font-normal text-slate-400"> /100</span>
                    </p>
                  </div>
                </div>

                {/* 4 KPI Summary Tiles */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KpiBox
                    label={t("recruiter.ops.applicants.rounds.cvScreening")}
                    value={
                      rounds?.cv.score != null
                        ? t("recruiter.ops.applicants.rounds.scoreOutOf100Pts", {
                            score: formatScreeningScore(rounds.cv.score),
                          })
                        : roundStatusSummary(t, rounds?.cv.status, rounds?.cv.passed)
                    }
                    hint={
                      rounds?.cv.threshold != null
                        ? t("recruiter.ops.applicants.detail.thresholdShort", {
                            score: formatScreeningScore(rounds.cv.threshold),
                          })
                        : undefined
                    }
                    tone={rounds?.cv.passed === true ? "pass" : rounds?.cv.passed === false ? "fail" : undefined}
                  />
                  <KpiBox
                    label={t("recruiter.ops.applicants.rounds.aiInterview")}
                    value={
                      rounds?.aiInterview.score != null
                        ? t("recruiter.ops.applicants.rounds.scoreOutOf100Pts", {
                            score: formatScreeningScore(rounds.aiInterview.score),
                          })
                        : roundStatusSummary(t, rounds?.aiInterview.status, rounds?.aiInterview.passed)
                    }
                    hint={roundStatusSummary(t, rounds?.aiInterview.status, rounds?.aiInterview.passed)}
                    tone={rounds?.aiInterview.passed === true ? "pass" : rounds?.aiInterview.passed === false ? "fail" : undefined}
                  />
                  <KpiBox
                    label={t("recruiter.ops.applicants.rounds.assessment")}
                    value={
                      rounds?.assessment.score != null
                        ? t("recruiter.ops.applicants.rounds.scoreOutOf100Pts", {
                            score: formatScreeningScore(rounds.assessment.score),
                          })
                        : roundStatusSummary(t, rounds?.assessment.status, rounds?.assessment.passed)
                    }
                    hint={roundStatusSummary(t, rounds?.assessment.status, rounds?.assessment.passed)}
                    tone={rounds?.assessment.passed === true ? "pass" : rounds?.assessment.passed === false ? "fail" : undefined}
                  />
                  <KpiBox
                    label={t("recruiter.ops.applicants.detail.overallEvalLabel")}
                    value={
                      gate?.complete
                        ? gate.passed
                          ? t("recruiter.ops.applicants.detail.gateQualified")
                          : t("recruiter.ops.applicants.detail.gateNotQualified")
                        : getApplicantStatusLabel(detail.status, t)
                    }
                    hint={
                      gate?.passThreshold != null
                        ? t("recruiter.ops.applicants.detail.gateTotalThreshold", {
                            score: formatScreeningScore(gate.passThreshold),
                          })
                        : currentStepBadge
                    }
                    tone={gate?.complete ? (gate.passed ? "pass" : "fail") : detail.status === "HIRED" ? "pass" : detail.status === "REJECTED" ? "fail" : undefined}
                  />
                </div>

                {/* Alerts inside summary card if present */}
                {(detail.candidateApplicationCount > 1 || detail.rejectReason || detail.withdrawReason) && (
                  <div className="mt-4 space-y-2">
                    {detail.candidateApplicationCount > 1 && (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
                        <Info className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
                        <span>
                          {t("recruiter.ops.applicants.detail.multipleApplicationsAlert", {
                            count: detail.candidateApplicationCount,
                          })}
                        </span>
                      </div>
                    )}
                    {detail.rejectReason && (
                      <div className="flex items-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                        <XCircle className="size-4 shrink-0 text-rose-600" aria-hidden="true" />
                        <span>
                          {t("recruiter.ops.applicants.detail.rejectReasonAlert", {
                            reason: detail.rejectReason,
                          })}
                        </span>
                      </div>
                    )}
                    {detail.withdrawReason && (
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700">
                        <Info className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                        <span>
                          {t("recruiter.ops.applicants.detail.withdrawReasonAlert", {
                            reason: detail.withdrawReason,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tabs inside Overview */}
                <div className="mt-5 flex flex-wrap gap-6 border-b border-slate-200" role="tablist" aria-label={t("recruiter.ops.applicants.detail.overviewSubTabsAria")}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={overviewSubTab === "rounds"}
                    onClick={() => setOverviewSubTab("rounds")}
                    className={cn(
                      "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                      overviewSubTab === "rounds"
                        ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                        : "border-transparent text-slate-500 hover:text-slate-800",
                    )}
                  >
                    <Workflow className="size-4" aria-hidden="true" />
                    {t("recruiter.ops.applicants.detail.subTabRounds")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={overviewSubTab === "info"}
                    onClick={() => setOverviewSubTab("info")}
                    className={cn(
                      "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                      overviewSubTab === "info"
                        ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                        : "border-transparent text-slate-500 hover:text-slate-800",
                    )}
                  >
                    <Info className="size-4" aria-hidden="true" />
                    {t("recruiter.ops.applicants.detail.subTabInfo")}
                  </button>
                </div>

                <div className="mt-5">
                  {overviewSubTab === "rounds" ? (
                    <div className="space-y-5">
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {t("recruiter.ops.applicants.detail.pipelineTitle")}
                        </p>
                        <ApplicationPipeline status={detail.status} />
                      </div>
                      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/50 p-4">
                        <ApplicantRounds rounds={detail.rounds} gate={detail.gateScore} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <MetaTile label={t("recruiter.ops.applicants.detail.metaFullName")} value={detail.candidateName} />
                        <MetaTile label={t("recruiter.ops.common.email")} value={detail.candidateEmail} />
                        <MetaTile label={t("recruiter.ops.applicants.detail.metaJobTitle")} value={jobTitle} />
                        <MetaTile label={t("recruiter.ops.applicants.detail.metaAppliedDate")} value={formatApplicantDateTime(detail.createdAt, locale)} />
                        <MetaTile
                          label={t("recruiter.ops.common.source")}
                          value={
                            detail.referralCode
                              ? t("recruiter.ops.applicants.detail.metaSourceReferral", {
                                  source: sourceLabel(detail.source, t),
                                  code: detail.referralCode,
                                })
                              : sourceLabel(detail.source, t)
                          }
                        />
                        <MetaTile
                          label={t("recruiter.ops.common.assignee")}
                          value={detail.assigneeName ?? t("recruiter.ops.common.unassigned")}
                        />
                      </dl>

                      {tagList.length > 0 && (
                        <div className="rounded-xl border border-slate-200/80 bg-[var(--color-surface-alt)] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {t("recruiter.ops.applicants.detail.internalTagsTitle")}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {tagList.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-hover)]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {detail.notes && (
                        <div className="rounded-xl border border-slate-200/80 bg-[var(--color-surface-alt)] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {t("recruiter.ops.applicants.detail.latestNotesTitle")}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-on-surface)]">
                            {detail.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button type="button" onClick={() => setActiveSection("manage")} className={button}>
                          <StickyNote className="size-4" aria-hidden="true" />
                          {t("recruiter.ops.applicants.detail.editNotesAssignBtn")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <CvScreeningDecision applicationId={detail.id} onDecided={refreshAll} />
              <HiringDecisionPanel detail={detail} onChanged={refreshAll} />
            </div>
          )}

          {activeSection === "cv" && (
            <div className="space-y-5">
              {selectedCv ? (
                <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                        <FileText className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-bold text-slate-900">{selectedCv.originalFilename}</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            {cvDetail?.status ?? selectedCv.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t("recruiter.ops.applicants.detail.cvMetaLine", {
                            id: selectedCv.id,
                            date: formatApplicantDateTime(selectedCv.createdAt, locale),
                          })}
                          {cvDetail?.extractionModel ? ` · ${cvDetail.extractionModel}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {activeCvs.length > 1 && (
                        <select
                          className={cn(input, "w-auto min-w-[180px]")}
                          aria-label={t("recruiter.ops.applicants.detail.selectCvAria")}
                          value={selectedCv.id}
                          onChange={(e) => setSelectedCvId(Number(e.target.value))}
                        >
                          {activeCvs.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.originalFilename} · {item.status}
                            </option>
                          ))}
                        </select>
                      )}
                      <Link
                        to={`/recruiter/jobs/${jobId}/cvs/${selectedCv.id}`}
                        className={button}
                      >
                        {t("recruiter.ops.applicants.detail.openCvDetailLink")}
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>

                  {/* Sub-tabs inside CV section */}
                  <div className="mt-4 flex flex-wrap gap-6 border-b border-slate-200" role="tablist" aria-label={t("recruiter.ops.applicants.detail.cvSubTabsAria")}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={cvSubTab === "ai"}
                      onClick={() => setCvSubTab("ai")}
                      className={cn(
                        "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                        cvSubTab === "ai"
                          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                          : "border-transparent text-slate-500 hover:text-slate-800",
                      )}
                    >
                      <Sparkles className="size-4" aria-hidden="true" />
                      {t("recruiter.ops.applicants.detail.cvSubTabAi")}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={cvSubTab === "file"}
                      onClick={() => setCvSubTab("file")}
                      className={cn(
                        "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                        cvSubTab === "file"
                          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                          : "border-transparent text-slate-500 hover:text-slate-800",
                      )}
                    >
                      <FileText className="size-4" aria-hidden="true" />
                      {t("recruiter.ops.applicants.detail.cvSubTabFile")}
                    </button>
                  </div>

                  <div className="mt-5 space-y-5">
                    {cvDetailQuery.isError && (
                      <p role="alert" className="text-xs text-red-700">{getApiErrorMessage(cvDetailQuery.error)}</p>
                    )}
                    {cvSubTab === "ai" ? (
                      <>
                        {cvDetailQuery.isPending ? (
                          <SkeletonCard className="h-52" />
                        ) : cvDetail?.match ? (
                          <ScreeningBreakdown
                            score={cvDetail.match.score}
                            modelVersion={cvDetail.match.modelVersion}
                            breakdown={cvBreakdown}
                            extraction={cvDetail.extraction}
                            skills={cvDetail.skills}
                            cvId={cvDetail.id}
                            contentHash={cvDetail.match.contentHash}
                            translationPending={cvDetail.match.translationPending}
                            wide
                          />
                        ) : (
                          <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] p-8 text-center text-sm text-slate-500">
                            {t("recruiter.ops.applicants.detail.cvNoAiScore")}
                          </div>
                        )}
                        <GithubEvidencePanel analysis={cvDetail?.githubAnalysis} />
                        {cvDetail && cvDetail.skills.length > 0 && (
                          <div className="space-y-2.5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              {t("recruiter.ops.applicants.detail.extractedSkillsTitle")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {cvDetail.skills.map((skill) => (
                                <span
                                  key={skill.canonicalName}
                                  className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-medium text-brand-primary"
                                >
                                  {skill.skillName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <CvFilePreview
                        cvId={selectedCv.id}
                        mimeType={cvDetail?.mimeType ?? null}
                        filename={selectedCv.originalFilename}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-8 text-center text-sm text-slate-500">
                  {t("recruiter.ops.applicants.detail.noCvSubmitted")}
                </div>
              )}
            </div>
          )}

          {activeSection === "manage" && (
            <div className="space-y-5">
              <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <StickyNote className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">{t("recruiter.ops.applicants.detail.manageCardTitle")}</h2>
                    <p className="text-xs text-slate-500">{t("recruiter.ops.applicants.detail.manageCardDesc")}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
                      {t("recruiter.ops.applicants.detail.tagLabel")}
                    </span>
                    <input
                      className={input}
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder={t("recruiter.ops.applicants.detail.tagPlaceholder")}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
                      {t("recruiter.ops.applicants.detail.assigneeEmailLabel")}
                    </span>
                    <input
                      className={input}
                      value={assigneeEmail}
                      onChange={(e) => setAssigneeEmail(e.target.value)}
                      placeholder={
                        detail.assigneeName
                          ? t("recruiter.ops.applicants.detail.assigneeCurrentPlaceholder", { name: detail.assigneeName })
                          : t("recruiter.ops.applicants.detail.assigneeEmailPlaceholder")
                      }
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
                    {t("recruiter.ops.common.notes")}
                  </span>
                  <textarea
                    className={input}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder={t("recruiter.ops.applicants.detail.notesPlaceholder")}
                  />
                </label>

                {saveManage.isError && <p role="alert" className="text-xs text-red-700">{getApiErrorMessage(saveManage.error)}</p>}
                <div className="flex justify-end">
                  <button className={primary} type="button" disabled={saveManage.isPending} onClick={() => saveManage.mutate()}>
                    <Save className="size-4" aria-hidden="true" />
                    {saveManage.isPending
                      ? t("recruiter.ops.common.saving")
                      : t("recruiter.ops.applicants.detail.saveChangesBtn")}
                  </button>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <XCircle className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">{t("recruiter.ops.applicants.detail.processTitle")}</h2>
                    <p className="text-xs text-slate-500">{t("recruiter.ops.applicants.detail.processDesc")}</p>
                  </div>
                </div>

                {canReject ? (
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
                      {t("recruiter.ops.applicants.detail.rejectReasonLabel")}
                    </span>
                    <input
                      className={input}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t("recruiter.ops.applicants.detail.rejectReasonPlaceholder")}
                    />
                  </label>
                ) : (
                  <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <CheckCircle2 className="size-4 text-slate-400" aria-hidden="true" />
                    {t("recruiter.ops.applicants.detail.currentStatusReadOnly", {
                      status: getApplicantStatusLabel(detail.status, t),
                    })}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {canReject && (
                    <button
                      className={cn(button, "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]")}
                      type="button"
                      disabled={act.isPending}
                      onClick={confirmReject}
                    >
                      <XCircle className="size-4" aria-hidden="true" />
                      {t("recruiter.ops.applicants.detail.rejectBtn")}
                    </button>
                  )}
                  {detail.archived ? (
                    <button className={button} type="button" disabled={act.isPending} onClick={() => act.mutate("restore")}>
                      <ArchiveRestore className="size-4" aria-hidden="true" />
                      {t("recruiter.ops.applicants.detail.restoreBtn")}
                    </button>
                  ) : (
                    <button className={button} type="button" disabled={act.isPending} onClick={() => act.mutate("archive")}>
                      <Archive className="size-4" aria-hidden="true" />
                      {t("recruiter.ops.applicants.detail.archiveBtn")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "history" && (
            <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
              <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <History className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{t("recruiter.ops.applicants.detail.historyTitle")}</h2>
                  <p className="text-xs text-slate-500">
                    {t("recruiter.ops.applicants.detail.historySubtitle", { id: detail.id })}
                  </p>
                </div>
              </div>

              {detail.history.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                  {t("recruiter.ops.applicants.detail.historyEmpty")}
                </p>
              ) : (
                <ol className="ml-2 space-y-4 border-l border-[var(--color-border-default)] pl-5">
                  {detail.history.map((row, index) => (
                    <li key={`${row.createdAt}-${index}`} className="relative">
                      <span
                        className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-white bg-[var(--color-primary)]"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-semibold text-slate-900">
                        {row.fromStatus ? `${getApplicantStatusLabel(row.fromStatus, t)} → ` : ""}
                        {getApplicantStatusLabel(row.toStatus, t)}
                      </p>
                      {row.note && <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{row.note}</p>}
                      <p className="mt-0.5 text-[11px] text-slate-400">{formatApplicantDateTime(row.createdAt, locale)}</p>
                    </li>
                  ))}
                </ol>
              )}
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

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-[var(--color-surface-alt)] px-3.5 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900" title={value}>{value}</dd>
    </div>
  );
}
