import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  Eye,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type {
  GradeDecision,
  GradingReview,
  SubmissionGradingDetail as GradingDetail,
} from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { formatDateTime, formatNumber, t as globalT, useLocale, useT, type Locale } from "@/i18n";
import { localizeAiComment } from "@/features/tenant/candidate/assessments/utils/aiLocalization";

// --- Safe Data Helpers ---
function safeObject<T = Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      // ignore
    }
  }
  return {} as T;
}

function safeText(value: unknown, fallback = globalT("recruiter.assessments.grading.aiMissingFallback")): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    // Attempt parsing JSON string to extract human-readable text (e.g. '{"detail": "..."}')
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return safeText(parsed, fallback);
        }
      } catch {
        // use raw string
      }
    }
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of [
      "message",
      "detail",
      "analysis",
      "explanation",
      "comment",
      "description",
      "details",
      "text",
      "summary",
      "feedback",
      "complexity",
      "rating",
      "value",
    ]) {
      if (typeof obj[key] === "string" && (obj[key] as string).trim()) {
        return (obj[key] as string).trim();
      }
    }
    try {
      const json = JSON.stringify(value, null, 2);
      if (json && json !== "{}") return json;
    } catch {
      // ignore
    }
  }
  return fallback;
}

function safeNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function display(value: unknown, locale?: Locale, dash = "—"): string {
  const num = safeNumber(value);
  if (num == null) return dash;
  return formatNumber(Number(num.toFixed(2)), undefined, locale);
}



type CategoryTab = "ESSAY" | "CODING" | "INTEGRITY" | "OBJECTIVE";

export function SubmissionGradingDetail({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const client = useQueryClient();
  const askConfirm = useUiStore((state) => state.askConfirm);
  const key = [...queryKeys.assessments.all(), "grading-detail", id];

  const query = useQuery({
    queryKey: key,
    queryFn: () => assessmentApi.gradingDetail(id),
    refetchInterval: 12000,
    staleTime: 30_000,
  });

  const {
    register,
    watch,
    getValues,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<{ scores: Record<string, string> }>({
    defaultValues: { scores: {} },
  });

  const [userSelectedTab, setUserSelectedTab] = useState<CategoryTab | null>(null);
  const values = watch("scores");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch {
      // ignore
    }
  }, [id]);

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
  };

  // --- Mutations ---
  const approve = useMutation({
    mutationFn: (decision: GradeDecision) =>
      assessmentApi.approveGrade(id, decision.questionId, decision.score),
    onSuccess: async (_, decision) => {
      setValue(`scores.${decision.questionId}`, "");
      toast.success(t("recruiter.assessments.grading.approvedSuccess", { questionId: decision.questionId }));
      await refresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t("recruiter.assessments.grading.approveError"));
    },
  });

  const update = useMutation({
    mutationFn: (decisions: GradeDecision[]) =>
      assessmentApi.updateGradingResult(id, decisions),
    onSuccess: async (data, decisions) => {
      client.setQueryData(key, data);
      decisions.forEach((decision) => setValue(`scores.${decision.questionId}`, ""));
      if (data.score == null) {
        toast.info(t("recruiter.assessments.grading.partialUpdatedInfo"));
      } else {
        toast.success(t("recruiter.assessments.grading.finalizedSuccess"));
      }
      await refresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t("recruiter.assessments.grading.updateError"));
    },
  });

  const email = useMutation({
    mutationFn: () => assessmentApi.sendResultEmail(id),
    onSuccess: (result) => {
      if (result.status === "SENT") {
        toast.info(t("recruiter.assessments.grading.emailAlreadySentInfo"));
      } else if (result.status === "PENDING") {
        toast.success(t("recruiter.assessments.grading.emailQueuedSuccess"));
      } else {
        toast.warning(t("recruiter.assessments.grading.emailRetryWarning"));
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t("recruiter.assessments.grading.emailError"));
    },
  });

  const retry = useMutation({
    mutationFn: () => assessmentApi.retryGrading(id),
    onSuccess: async () => {
      toast.success(t("recruiter.assessments.grading.retrySuccess"));
      await refresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t("recruiter.assessments.grading.retryError"));
    },
  });

  const busy = approve.isPending || update.isPending || email.isPending || retry.isPending;
  const detail = query.data;
  const reviews = useMemo(() => (detail?.reviews ?? []).filter(Boolean), [detail?.reviews]);

  // Dirty entries in form - safely handle string/number/null values
  const dirtyEntries = Object.entries(values ?? {}).filter(([, val]) => {
    if (val == null) return false;
    if (typeof val === "string") return val.trim() !== "";
    if (typeof val === "number") return !Number.isNaN(val);
    return false;
  });
  const isDirty = dirtyEntries.length > 0;

  // Question validation
  const decisionFor = (review: GradingReview): GradeDecision | null => {
    const rawVal = getValues(`scores.${review.questionId}`);
    const raw = typeof rawVal === "string" ? rawVal.trim() : rawVal != null ? String(rawVal).trim() : "";
    if (!raw && review.suggestedScore == null) {
      setError(`scores.${review.questionId}`, {
        message: t("recruiter.assessments.grading.missingAiScoreError"),
      });
      return null;
    }
    const score = raw ? Number(raw) : null;
    const valid =
      !raw ||
      (/^\d+(\.\d{1,2})?$/.test(raw) &&
        z.number().finite().min(0).max(review.points).safeParse(score).success);
    if (!valid) {
      setError(`scores.${review.questionId}`, {
        message: t("recruiter.assessments.grading.scoreFormatError", { max: review.points }),
      });
      return null;
    }
    clearErrors(`scores.${review.questionId}`);
    return { questionId: review.questionId, score };
  };

  const validateReviews = (selected: GradingReview[]) => {
    const decisions = selected.map(decisionFor);
    if (decisions.some((d) => d == null)) {
      toast.error(t("recruiter.assessments.grading.invalidScoresToast"));
      return null;
    }
    return decisions as GradeDecision[];
  };

  // Quick accept AI score for one question
  const handleQuickApproveAi = (review: GradingReview) => {
    if (review.suggestedScore == null) {
      toast.warning(t("recruiter.assessments.grading.noAiSuggestionWarning"));
      return;
    }
    approve.mutate({ questionId: review.questionId, score: null });
  };

  const unreviewedReviews = reviews.filter((r) => !r.reviewedAt);

  const handleBack = () => {
    if (isDirty) {
      askConfirm({
        title: t("recruiter.assessments.grading.leaveConfirmTitle"),
        description: t("recruiter.assessments.grading.leaveConfirmDesc"),
        confirmLabel: t("recruiter.assessments.grading.leaveConfirmBtn"),
        onConfirm: onClose,
      });
    } else {
      onClose();
    }
  };

  // Category breakdown
  const essayReviews = useMemo(() => reviews.filter((r) => r.type === "ESSAY"), [reviews]);
  const codingReviews = useMemo(() => reviews.filter((r) => r.type === "CODING"), [reviews]);
  const unreviewedEssay = useMemo(() => essayReviews.filter((r) => !r.reviewedAt), [essayReviews]);
  const unreviewedCoding = useMemo(() => codingReviews.filter((r) => !r.reviewedAt), [codingReviews]);
  const proctorCount = safeNumber(detail?.integrity?.proctorEventCount) ?? 0;
  const hasObjective = (detail?.objective?.questionCount ?? 0) > 0;

  const tabs = useMemo(() => {
    const list: {
      key: CategoryTab;
      label: string;
      count: number;
      allGraded: boolean;
      icon: any;
    }[] = [];

    if (essayReviews.length > 0) {
      list.push({
        key: "ESSAY",
        label: t("recruiter.assessments.grading.tabs.essay"),
        count: essayReviews.length,
        allGraded: unreviewedEssay.length === 0,
        icon: unreviewedEssay.length === 0 ? CheckCircle2 : FileText,
      });
    }

    if (codingReviews.length > 0) {
      list.push({
        key: "CODING",
        label: t("recruiter.assessments.grading.tabs.coding"),
        count: codingReviews.length,
        allGraded: unreviewedCoding.length === 0,
        icon: unreviewedCoding.length === 0 ? CheckCircle2 : Code2,
      });
    }

    if (hasObjective) {
      list.push({
        key: "OBJECTIVE",
        label: t("recruiter.assessments.grading.tabs.objective"),
        count: detail?.objective?.questionCount ?? 0,
        allGraded: true,
        icon: CheckCircle2,
      });
    }

    list.push({
      key: "INTEGRITY",
      label: t("recruiter.assessments.grading.tabs.integrity"),
      count: proctorCount,
      allGraded: true,
      icon: proctorCount === 0 ? ShieldCheck : ShieldAlert,
    });

    return list;
  }, [
    essayReviews.length,
    codingReviews.length,
    unreviewedEssay.length,
    unreviewedCoding.length,
    proctorCount,
    hasObjective,
    detail?.objective?.questionCount,
    t,
  ]);

  const activeTab: CategoryTab =
    userSelectedTab && tabs.some((t) => t.key === userSelectedTab)
      ? userSelectedTab
      : tabs[0]?.key ?? (hasObjective ? "OBJECTIVE" : "INTEGRITY");

  // Loading skeleton matching new Split View layout with high-contrast borders and active spinner
  if (query.isPending) {
    return (
      <div className="space-y-6 text-[#101828] dark:text-slate-100">
        <header className="rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={t("recruiter.assessments.grading.backToSubmissionsTooltip")}
                aria-label={t("recruiter.assessments.grading.backToSubmissionsTooltip")}
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="space-y-1.5">
                <div className="h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-28 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-[var(--color-primary)]" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("recruiter.assessments.grading.loadingSubmission")}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row items-start gap-6">
          <div className="w-full lg:w-60 shrink-0">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex h-10 w-full items-center justify-between rounded-xl px-3.5 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-md bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
                    <div className="h-3.5 w-24 rounded-md bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
                  </div>
                  <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-4">
            <div className="h-6 w-36 rounded-lg bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="h-4 w-32 rounded-md bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
                <div className="h-4 w-20 rounded-md bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
              <div className="h-36 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (query.error || !detail) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center dark:border-rose-900/50 dark:bg-slate-900 space-y-3">
        <AssessmentError error={query.error} retry={() => void query.refetch()} />
        {!query.error && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("recruiter.assessments.grading.notFoundOrNotSubmitted")}
          </p>
        )}
        <div>
          <Button className="mt-2" onClick={onClose}>
            <ArrowLeft className="size-4" /> {t("recruiter.assessments.common.actions.backToList")}
          </Button>
        </div>
      </div>
    );
  }

  const objective = detail.objective ?? {
    correctCount: 0,
    questionCount: 0,
    score: 0,
    totalPoints: 0,
  };
  const integrity = detail.integrity;

  return (
    <div className="space-y-6 text-[#101828] dark:text-slate-100">
      {/* 1. COMPACT TOP HEADER BAR (Candidate Info, Total Score & Quick Actions) */}
      <header className="rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Back Button + Candidate Details + Total Score */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleBack}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={t("recruiter.assessments.grading.backToSubmissionsTooltip")}
              aria-label={t("recruiter.assessments.grading.backToSubmissionsTooltip")}
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="min-w-0">
              <h1
                ref={heading}
                tabIndex={-1}
                className="text-sm font-extrabold text-[#101828] dark:text-white sm:text-base truncate"
              >
                {detail.candidateName || t("recruiter.assessments.grading.candidateFallback")}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("recruiter.assessments.grading.submissionIdStatus", { id: detail.id })}
                <span
                  className={cn(
                    "font-bold",
                    detail.status === "GRADED"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : detail.status === "EXPIRED"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {detail.status === "GRADED"
                    ? t("recruiter.assessments.grading.statusGraded")
                    : detail.status === "EXPIRED"
                      ? t("recruiter.assessments.grading.statusExpired")
                      : t("recruiter.assessments.grading.statusPendingReview")}
                </span>
              </p>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

            <div className="hidden sm:block">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                {t("recruiter.assessments.grading.totalScoreLabel")}
              </div>
              <div className="text-xs font-bold text-[#101828] dark:text-white">
                {reviews.length > 0
                  ? t("recruiter.assessments.grading.reviewedQuestionsRatio", { reviewed: reviews.length - unreviewedReviews.length, total: reviews.length })
                  : t("recruiter.assessments.common.scoreOutOfShort", { score: display(detail.score, locale, t("recruiter.assessments.common.dash")), total: detail.totalPoints })}
              </div>
            </div>
          </div>

          {/* Right: Master Control Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Retry AI button */}
            <button
              type="button"
              disabled={busy}
              onClick={() => retry.mutate()}
              title={t("recruiter.assessments.grading.retryAiTooltip")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-[var(--color-primary)] disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", retry.isPending && "animate-spin")} />
              {t("recruiter.assessments.grading.retryAiBtn")}
            </button>

            {/* Send Result Email button */}
            <button
              type="button"
              disabled={
                busy ||
                detail.score == null ||
                !detail.emailAvailable ||
                isDirty ||
                unreviewedReviews.length > 0
              }
              onClick={() =>
                askConfirm({
                  title: t("recruiter.assessments.grading.sendEmailConfirmTitle"),
                  description: t("recruiter.assessments.grading.sendEmailConfirmDesc", {
                    score: display(detail.score, locale, t("recruiter.assessments.common.dash")),
                    total: detail.totalPoints,
                    email: detail.candidateEmail ?? "",
                  }),
                  confirmLabel: t("recruiter.assessments.grading.sendEmailConfirmBtn"),
                  onConfirm: () => email.mutate(),
                })
              }
              title={
                !detail.emailAvailable
                  ? t("recruiter.assessments.grading.emailUnavailableTooltip")
                  : isDirty
                    ? t("recruiter.assessments.grading.saveOverridesBeforeEmailTooltip")
                    : detail.score == null
                      ? t("recruiter.assessments.grading.finalizeAllBeforeEmailTooltip")
                      : t("recruiter.assessments.grading.sendEmailTooltip")
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-[var(--color-primary)] disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Mail className="size-3.5 text-slate-500" />
              {t("recruiter.assessments.grading.sendEmailBtn")}
            </button>

            {/* Close Button */}
            <button
              type="button"
              disabled={busy}
              onClick={handleBack}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {t("recruiter.assessments.common.actions.close")}
            </button>
          </div>
        </div>
      </header>

      {/* 2. SPLIT VIEW: Left Navigation Sidebar + Right Content Area */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Sidebar Nav (Gộp chung 1 section, cuộn tự nhiên theo trang) */}
        <aside className="w-full lg:w-60 shrink-0">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setUserSelectedTab(tab.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all text-left cursor-pointer",
                    isActive
                      ? "bg-slate-100 font-bold text-[#101828] dark:bg-slate-800 dark:text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        isActive
                          ? "text-[var(--color-primary)]"
                          : tab.allGraded && tab.count > 0 && (tab.key === "ESSAY" || tab.key === "CODING")
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400 dark:text-slate-500",
                      )}
                    />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                      isActive
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Main Content Panel */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Section Header Title & Bulk Action */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#101828] dark:text-white">
              {activeTab === "ESSAY"
                ? t("recruiter.assessments.grading.tabs.essay")
                : activeTab === "CODING"
                  ? t("recruiter.assessments.grading.tabs.coding")
                  : activeTab === "INTEGRITY"
                    ? t("recruiter.assessments.grading.tabs.integrity")
                    : t("recruiter.assessments.grading.tabs.objective")}
            </h2>

            {/* Bulk AI approve for current section if unreviewed */}
            {activeTab === "ESSAY" && unreviewedEssay.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  askConfirm({
                    title: t("recruiter.assessments.grading.approveAiEssayTitle"),
                    description: t("recruiter.assessments.grading.approveAiEssayDesc", { count: unreviewedEssay.length }),
                    confirmLabel: t("recruiter.assessments.grading.approveAndSaveBtn"),
                    onConfirm: () => {
                      const decisions: GradeDecision[] = unreviewedEssay.map((r) => ({
                        questionId: r.questionId,
                        score: null,
                      }));
                      update.mutate(decisions);
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/25 transition-all cursor-pointer"
              >
                <Sparkles className="size-3.5 text-[var(--color-primary)]" />
                {t("recruiter.assessments.grading.applyAiScoreCount", { count: unreviewedEssay.length })}
              </button>
            )}

            {activeTab === "CODING" && unreviewedCoding.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  askConfirm({
                    title: t("recruiter.assessments.grading.approveAiCodingTitle"),
                    description: t("recruiter.assessments.grading.approveAiCodingDesc", { count: unreviewedCoding.length }),
                    confirmLabel: t("recruiter.assessments.grading.approveAndSaveBtn"),
                    onConfirm: () => {
                      const decisions: GradeDecision[] = unreviewedCoding.map((r) => ({
                        questionId: r.questionId,
                        score: null,
                      }));
                      update.mutate(decisions);
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/25 transition-all cursor-pointer"
              >
                <Sparkles className="size-3.5 text-[var(--color-primary)]" />
                {t("recruiter.assessments.grading.applyAiScoreCount", { count: unreviewedCoding.length })}
              </button>
            )}
          </div>

          {/* Section 1: Essay Questions */}
          {activeTab === "ESSAY" && (
            <div className="space-y-6">
              {essayReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                  <h3 className="mt-2 text-sm font-bold text-[#101828] dark:text-white">
                    {t("recruiter.assessments.grading.noEssayQuestions")}
                  </h3>
                </div>
              ) : (
                essayReviews.map((review, idx) => (
                  <QuestionReviewCard
                    key={review.questionId}
                    index={idx + 1}
                    review={review}
                    submissionId={id}
                    busy={busy}
                    register={register}
                    errors={errors}
                    clearErrors={clearErrors}
                    onQuickApprove={handleQuickApproveAi}
                    onApprove={approve.mutate}
                    decisionFor={decisionFor}
                  />
                ))
              )}
            </div>
          )}

          {/* Section 2: Coding Questions */}
          {activeTab === "CODING" && (
            <div className="space-y-6">
              {codingReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                  <h3 className="mt-2 text-sm font-bold text-[#101828] dark:text-white">
                    {t("recruiter.assessments.grading.noCodingQuestions")}
                  </h3>
                </div>
              ) : (
                codingReviews.map((review, idx) => (
                  <QuestionReviewCard
                    key={review.questionId}
                    index={idx + 1}
                    review={review}
                    submissionId={id}
                    busy={busy}
                    register={register}
                    errors={errors}
                    clearErrors={clearErrors}
                    onQuickApprove={handleQuickApproveAi}
                    onApprove={approve.mutate}
                    decisionFor={decisionFor}
                  />
                ))
              )}
            </div>
          )}

          {/* Section 3: Integrity Timeline */}
          {activeTab === "INTEGRITY" && (
            integrity ? (
              <IntegrityTimelineSection integrity={integrity} />
            ) : (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <ShieldCheck className="mx-auto size-7 text-emerald-500/80 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("recruiter.assessments.grading.noIntegrityData")}
                </p>
              </section>
            )
          )}

          {/* Section 4: Objective MCQ Summary */}
          {activeTab === "OBJECTIVE" && (
            objective.questionCount > 0 ? (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                        {t("recruiter.assessments.grading.objectiveHeading")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("recruiter.assessments.grading.objectiveAutoDesc")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-start sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">{t("recruiter.assessments.grading.accuracyLabel")}</div>
                      <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {objective.questionCount
                          ? Math.round(((objective.correctCount ?? 0) / objective.questionCount) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">{t("recruiter.assessments.grading.earnedScoreLabel")}</div>
                      <div className="text-base font-extrabold text-[#101828] dark:text-white">
                        {display(objective.score, locale, t("recruiter.assessments.common.dash"))} / {objective.totalPoints ?? 0} {t("recruiter.assessments.common.pointsShort")}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-400 italic">
                  {t("recruiter.assessments.grading.noObjectiveQuestions")}
                </p>
              </section>
            )
          )}
        </main>
      </div>

      {/* 5. FLOATING DOCK ACTION BAR (When Recruiter entered overrides) */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <Zap className="size-4 animate-bounce" />
            {t("recruiter.assessments.grading.unsavedOverridesCount", { count: dirtyEntries.length })}
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const decisions = validateReviews(
                reviews.filter((r) => {
                  const v = values?.[r.questionId];
                  return typeof v === "string" ? v.trim() !== "" : v != null;
                }),
              );
              if (decisions) update.mutate(decisions);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer"
          >
            <Check className="size-3.5" />
            {t("recruiter.assessments.grading.saveAllCount", { count: dirtyEntries.length })}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => reset()}
            className="inline-flex items-center rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {t("recruiter.assessments.common.actions.cancelAction")}
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUBCOMPONENT: QUESTION REVIEW CARD
// ==========================================
function QuestionReviewCard({
  index,
  review,
  submissionId: _submissionId,
  busy,
  register,
  errors,
  clearErrors,
  onQuickApprove,
  onApprove,
  decisionFor,
}: {
  index: number;
  review: GradingReview;
  submissionId: number;
  busy: boolean;
  register: any;
  errors: any;
  clearErrors: any;
  onQuickApprove: (r: GradingReview) => void;
  onApprove: (d: GradeDecision) => void;
  decisionFor: (r: GradingReview) => GradeDecision | null;
}) {
  const t = useT();
  const locale = useLocale();
  if (!review) return null;
  const isEssay = review.type === "ESSAY";
  const isReviewed = review.reviewedAt != null;
  const fieldName = `scores.${review.questionId}`;
  const hasError = !!errors?.scores?.[String(review.questionId)];
  const points = review.points ?? 0;
  const dash = t("recruiter.assessments.common.dash");
  const answerText =
    typeof review.answerText === "string"
      ? review.answerText.trim()
      : review.answerText != null
        ? String(review.answerText).trim()
        : "";

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900 sm:p-6 space-y-5">
      {/* 1. Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {t("recruiter.assessments.grading.questionBadge", { index, id: review.questionId })}
          </span>

          {isEssay ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60">
              <FileText className="size-3.5" /> {t("recruiter.assessments.grading.essayTag")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25">
              <Code2 className="size-3.5" /> {t("recruiter.assessments.grading.codingTag")}
            </span>
          )}

          {review.language && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
              {String(review.language).toUpperCase()}
            </span>
          )}

          <span className="text-xs font-semibold text-slate-400">
            {t("recruiter.assessments.grading.scalePoints", { points })}
          </span>
        </div>

        {/* Status Pill */}
        <div>
          {isReviewed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              <Check className="size-3.5" /> {t("recruiter.assessments.grading.approvedScoreBadge", { score: display(review.score, locale, dash), points })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60">
              <Clock className="size-3.5" /> {t("recruiter.assessments.grading.pendingAiBadge", { score: display(review.suggestedScore, locale, dash) })}
            </span>
          )}
        </div>
      </div>

      {/* 2. Question Prompt */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-[#101828] dark:text-white leading-relaxed whitespace-pre-wrap break-words">
          {typeof review.prompt === "string" ? review.prompt : safeText(review.prompt, t("recruiter.assessments.grading.questionPromptFallback"))}
        </h3>
      </div>

      {/* 3. Candidate's Answer Presentation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{isEssay ? t("recruiter.assessments.grading.candidateEssayLabel") : t("recruiter.assessments.grading.candidateCodeLabel")}</span>
          <CopyButton text={answerText} />
        </div>

        {isEssay ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-[13px] leading-relaxed text-[#101828] dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 whitespace-pre-wrap break-words min-h-[5rem] max-h-96 overflow-y-auto">
            {answerText ? (
              answerText
            ) : (
              <span className="italic text-slate-400">{t("recruiter.assessments.grading.noEssayAnswer")}</span>
            )}
          </div>
        ) : (
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-100 dark:border-slate-800 dark:bg-slate-950 max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap break-words leading-relaxed">
              <code>{answerText || t("recruiter.assessments.grading.noCodeSubmitted")}</code>
            </pre>
          </div>
        )}
      </div>

      {/* 4. AI Evidence & Grading Rubrics */}
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-4">
        {isEssay ? <EssayEvidenceDetail review={review} /> : <CodingEvidenceDetail review={review} />}
      </div>

      {/* 5. Recruiter Score Approval & Override Strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Summary score text */}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t("recruiter.assessments.grading.aiSuggestedPrefix")}
          <strong className="text-[#101828] dark:text-white font-bold">
            {t("recruiter.assessments.common.scoreOutOfShort", { score: display(review.suggestedScore, locale, dash), total: review.points })}
          </strong>
          {isReviewed && (
            <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
              {t("recruiter.assessments.grading.approvedPrefix", { score: display(review.score, locale, dash) })}
            </span>
          )}
        </div>

        {/* Right: Quick approve or override input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Accept AI Score Button */}
          {review.suggestedScore != null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onQuickApprove(review)}
              title={t("recruiter.assessments.grading.acceptAiTooltip")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)] transition-all cursor-pointer"
            >
              <Sparkles className="size-3.5 text-[var(--color-primary)]" />
              {t("recruiter.assessments.grading.acceptAiBtn", { score: display(review.suggestedScore, locale, dash) })}
            </button>
          )}

          {/* Custom Score Override Input */}
          <div className="relative flex items-center">
            <input
              type="number"
              min={0}
              max={review.points}
              step="0.01"
              disabled={busy}
              placeholder={review.suggestedScore == null ? t("recruiter.assessments.grading.enterScorePlaceholder") : t("recruiter.assessments.grading.overrideScorePlaceholder")}
              {...register(fieldName, {
                onChange: () => clearErrors(fieldName),
              })}
              className={cn(
                "w-28 rounded-xl border bg-white px-2.5 py-1.5 text-xs font-semibold text-[#101828] focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white",
                hasError
                  ? "border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 dark:border-slate-700",
              )}
            />
            <span className="pointer-events-none absolute right-2.5 text-[11px] font-semibold text-slate-400">
              /{review.points}
            </span>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const d = decisionFor(review);
              if (d) onApprove(d);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--color-primary)] dark:bg-white dark:text-slate-900 dark:hover:bg-[var(--color-primary)] dark:hover:text-white transition-all cursor-pointer"
          >
            <Check className="size-3.5" />
            {t("recruiter.assessments.grading.saveScoreBtn")}
          </button>
        </div>
      </div>

      {hasError && (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {errors.scores?.[String(review.questionId)]?.message}
        </p>
      )}
    </article>
  );
}

// ==========================================
// SUBCOMPONENT: ESSAY EVIDENCE DETAIL
// ==========================================
type RubricCriterionView = {
  name?: string;
  description?: string;
  guide?: string;
  weight?: number;
};

type EssayEvaluation = {
  status?: string;
  general_comment?: string | null;
  criteria_results?: Array<Record<string, unknown>>;
};

type CodeReviewData = {
  time_complexity?: unknown;
  space_complexity?: unknown;
  clean_code?: unknown;
  naming_conventions?: unknown;
  exception_safety?: unknown;
  general_comment?: string | null;
};

type CodingEvaluation = {
  status?: string;
  manual_review_required?: boolean;
  hardcode_capped?: boolean;
  tests?: Array<Record<string, unknown>>;
  code_review?: CodeReviewData;
  hidden_passed?: number | string | null;
  hidden_total?: number | string | null;
  tests_percent?: number | string | null;
  ai_percent?: number | string | null;
  formula_percent?: number | string | null;
  test_weight?: number | string | null;
  ai_weight?: number | string | null;
  general_comment?: string | null;
};

function EssayEvidenceDetail({ review }: { review: GradingReview }) {
  const t = useT();
  const evaluation = safeObject<EssayEvaluation>(review.evaluation);
  const [showRef, setShowRef] = useState(false);

  const rubric = safeObject(review.rubric);
  const referenceAnswer = typeof rubric.referenceAnswer === "string" ? rubric.referenceAnswer : null;
  const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];
  const aiMissingFallback = t("recruiter.assessments.grading.aiMissingFallback");

  return (
    <div className="space-y-3.5 text-xs">
      {evaluation.status === "ERROR" && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60">
          <AlertCircle className="size-4 shrink-0 text-amber-600" />
          <span>{t("recruiter.assessments.grading.essayErrorBanner")}</span>
        </div>
      )}

      {/* Reference Answer Collapsible */}
      {Boolean(referenceAnswer) && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setShowRef(!showRef)}
            className="flex w-full items-center justify-between font-semibold text-slate-700 hover:text-[var(--color-primary)] dark:text-slate-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Eye className="size-3.5 text-slate-400" />
              {t("recruiter.assessments.grading.referenceAnswerToggle")}
            </span>
            {showRef ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          {showRef && (
            <div className="mt-2.5 border-t border-slate-100 pt-2.5 text-[12px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300 whitespace-pre-wrap">
              {referenceAnswer}
            </div>
          )}
        </div>
      )}

      {criteria.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                <th className="px-4 py-2.5 font-bold">{t("recruiter.assessments.grading.colCriterion")}</th>
                <th className="px-4 py-2.5 font-bold text-center w-36">{t("recruiter.assessments.grading.colWeight")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {criteria.map((cRaw, idx) => {
                const criterion: RubricCriterionView =
                  typeof cRaw === "string"
                    ? { name: cRaw, description: cRaw, weight: Math.round(100 / (criteria.length || 1)) }
                    : (safeObject(cRaw) as RubricCriterionView);
                const weight = safeNumber(criterion.weight) ?? Math.round(100 / (criteria.length || 1));

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-3 align-middle font-medium text-[#101828] dark:text-white">
                      {safeText(criterion.name || criterion.description, t("recruiter.assessments.grading.criterionFallback", { index: idx + 1 }))}
                      {Boolean(criterion.guide) && (
                        <p className="mt-0.5 text-[11px] font-normal text-slate-400">
                          {safeText(criterion.guide, aiMissingFallback)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-center text-slate-600 dark:text-slate-300 font-semibold">
                      {weight}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">
          {t("recruiter.assessments.grading.noDetailedRubric")}
        </p>
      )}

      {/* General AI Summary Comment */}
      {Boolean(evaluation.general_comment) && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--color-primary-soft)]/70 p-3.5 text-xs text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20">
          <Sparkles className="size-4 shrink-0 text-[var(--color-primary)] mt-0.5" />
          <div className="space-y-1 min-w-0">
            <span className="font-bold block">{t("recruiter.assessments.grading.aiSummaryHeading")}</span>
            <p className="leading-relaxed whitespace-pre-wrap">{localizeAiComment(safeText(evaluation.general_comment, aiMissingFallback), t)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUBCOMPONENT: CODING EVIDENCE DETAIL
// ==========================================
function CodingEvidenceDetail({ review }: { review: GradingReview }) {
  const t = useT();
  const locale = useLocale();
  const dash = t("recruiter.assessments.common.dash");
  const aiMissingFallback = t("recruiter.assessments.grading.aiMissingFallback");
  const evaluation = safeObject<CodingEvaluation>(review.evaluation);
  const tests = Array.isArray(evaluation.tests) ? evaluation.tests : [];
  const codeReview = safeObject<CodeReviewData>(evaluation.code_review);
  const hiddenPassed = safeNumber(evaluation.hidden_passed);
  const hiddenTotal = safeNumber(evaluation.hidden_total);
  const testsPercent = safeNumber(evaluation.tests_percent);
  const aiPercent = safeNumber(evaluation.ai_percent);
  const formulaPercent = safeNumber(evaluation.formula_percent);
  const testWeight = safeNumber(evaluation.test_weight) ?? 0.8;
  const aiWeight = safeNumber(evaluation.ai_weight) ?? 0.2;

  return (
    <div className="space-y-4 text-xs">
      {/* Sandbox / AI Error */}
      {evaluation.status === "ERROR" && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60">
          <AlertCircle className="size-4 shrink-0 text-amber-600" />
          <span>{t("recruiter.assessments.grading.codingErrorBanner")}</span>
        </div>
      )}

      {/* Manual Review Required (Hardcode Alert) */}
      {evaluation.manual_review_required === true && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200 border border-amber-500/30">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">{t("recruiter.assessments.grading.hardcodeAlertTitle")}</span>
            <p className="leading-relaxed">
              {t("recruiter.assessments.grading.hardcodeAlertDesc")}
              {evaluation.hardcode_capped === true && t("recruiter.assessments.grading.hardcodeCappedNote")}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Terminal className="size-4 text-[var(--color-primary)]" />
            <span>{t("recruiter.assessments.grading.sandboxExecutionHeading")}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {t("recruiter.assessments.grading.hiddenTestsLabel")} <strong>{display(hiddenPassed, locale, dash)} / {display(hiddenTotal, locale, dash)}</strong> {t("recruiter.assessments.grading.passedWord")}
            </span>
            {testsPercent != null && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-bold text-[11px]",
                  testsPercent === 100
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                )}
              >
                {t("recruiter.assessments.grading.passPercentBadge", { percent: display(testsPercent, locale, dash) })}
              </span>
            )}
          </div>
        </div>

        {/* Test Cases Table */}
        {tests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-3">{t("recruiter.assessments.grading.colTestCase")}</th>
                  <th className="py-2 pr-3">{t("recruiter.assessments.grading.colCategory")}</th>
                  <th className="py-2 pr-3">{t("recruiter.assessments.bank.general.statusFilterLabel")}</th>
                  <th className="py-2">{t("recruiter.assessments.grading.colSandboxDesc")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tests.map((raw, idx) => {
                  const testCase = safeObject(raw);
                  const isPassed = testCase.passed === true;
                  return (
                    <tr key={idx}>
                      <td className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">
                        {t("recruiter.assessments.grading.testNumber", { index: idx + 1 })}
                      </td>
                      <td className="py-2 pr-3 text-slate-500">
                        {testCase.sample === true ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {t("recruiter.assessments.grading.publicTag")}
                          </span>
                        ) : (
                          <span className="rounded bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-primary-hover)]">
                            {t("recruiter.assessments.grading.hiddenScoredTag")}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="size-3" /> {t("recruiter.assessments.grading.passedLabel")}
                          </span>
                        ) : testCase.passed === false ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                            {t("recruiter.assessments.grading.failedLabel")}
                          </span>
                        ) : (
                          <span className="text-slate-400">{t("recruiter.assessments.grading.noResultYet")}</span>
                        )}
                      </td>
                      <td className="py-2 text-slate-500 font-mono text-[11px]">
                        {safeText(testCase.status_description, dash)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 italic">{t("recruiter.assessments.grading.noTestDetails")}</p>
        )}
      </div>

      {/* 2. AI Code Review Matrix (4 Dimensions) */}
      {Object.keys(codeReview).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Sparkles className="size-4 text-[var(--color-primary)]" />
            <span>{t("recruiter.assessments.grading.aiCodeReviewHeading")}</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              { label: t("recruiter.assessments.grading.timeComplexityLabel"), val: codeReview.time_complexity },
              { label: t("recruiter.assessments.grading.spaceComplexityLabel"), val: codeReview.space_complexity },
              { label: t("recruiter.assessments.grading.cleanCodeLabel"), val: codeReview.clean_code || codeReview.naming_conventions },
              { label: t("recruiter.assessments.grading.exceptionSafetyLabel"), val: codeReview.exception_safety },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                  {item.label}
                </div>
                <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                  {safeText(item.val, t("recruiter.assessments.grading.aiDimensionFallback"))}
                </p>
              </div>
            ))}
          </div>

          {Boolean(codeReview.general_comment) && (
            <div className="rounded-xl bg-[var(--color-primary-soft)]/70 p-3 text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20">
              <span className="font-bold block mb-1">{t("recruiter.assessments.grading.aiOverallCommentHeading")}</span>
              <p className="leading-relaxed whitespace-pre-wrap">{localizeAiComment(safeText(codeReview.general_comment, aiMissingFallback), t)}</p>
            </div>
          )}
        </div>
      )}

      {/* Fallback AI comment when codeReview object is empty */}
      {Boolean(evaluation.general_comment) && Object.keys(codeReview).length === 0 && (
        <div className="rounded-xl bg-[var(--color-primary-soft)]/70 p-3 text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20">
          <span className="font-bold block mb-1">{t("recruiter.assessments.grading.aiOverallCommentHeading")}</span>
          <p className="leading-relaxed whitespace-pre-wrap">{localizeAiComment(safeText(evaluation.general_comment, aiMissingFallback), t)}</p>
        </div>
      )}

      {/* 3. Formula Transparency Chip */}
      {testsPercent != null && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            {t("recruiter.assessments.grading.formulaPrefix")}{" "}
            <strong>{display(testsPercent, locale, dash)}%</strong> × {display(testWeight * 100, locale, dash)}% {t("recruiter.assessments.grading.formulaTestTag")}{" "}
            + <strong>{display(aiPercent, locale, dash)}%</strong> × {display(aiWeight * 100, locale, dash)}% {t("recruiter.assessments.grading.formulaAiTag")}
          </span>
          <span className="font-bold text-[var(--color-primary)]">
            {t("recruiter.assessments.grading.formulaSuggestedResult", { formula: display(formulaPercent, locale, dash), score: display(review.suggestedScore, locale, dash), points: review.points })}
          </span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUBCOMPONENT: INTEGRITY TIMELINE SECTION
// ==========================================
function IntegrityTimelineSection({
  integrity,
}: {
  integrity: NonNullable<GradingDetail["integrity"]>;
}) {
  const t = useT();
  const locale = useLocale();
  const dash = t("recruiter.assessments.common.dash");
  const events = Array.isArray(integrity.proctorEvents) ? integrity.proctorEvents : [];
  const runs = Array.isArray(integrity.customRuns) ? integrity.customRuns : [];

  const riskLevelLabel =
    integrity.riskLevel === "HIGH"
      ? t("recruiter.assessments.grading.riskHigh")
      : integrity.riskLevel === "MEDIUM"
        ? t("recruiter.assessments.grading.riskMedium")
        : t("recruiter.assessments.grading.riskLow");

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5 font-bold text-sm text-[#101828] dark:text-white">
          <ShieldCheck className="size-4 text-[var(--color-primary)]" />
          <span>{t("recruiter.assessments.grading.proctoringHeading")}</span>
        </div>
        <div className="flex items-center gap-2">
          {integrity.riskLevel && (
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                integrity.riskLevel === "HIGH"
                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  : integrity.riskLevel === "MEDIUM"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {t("recruiter.assessments.grading.riskLevelPrefix", { level: riskLevelLabel, score: Math.round(Number(integrity.riskScore ?? 0)) })}
            </span>
          )}
          <span className="text-xs font-semibold text-slate-500">
            {t("recruiter.assessments.grading.totalProctorEvents", { count: integrity.proctorEventCount || 0 })}
          </span>
        </div>
      </div>

      {/* Custom Runs Summary */}
      {runs.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t("recruiter.assessments.grading.customRunsHeading")}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {runs.map((rawRun, i) => {
              const r = safeObject<{ questionId?: unknown; count?: unknown }>(rawRun);
              const qId = r.questionId ?? i + 1;
              const runCount = safeNumber(r.count) ?? 0;
              return (
                <div
                  key={String(qId)}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {t("recruiter.assessments.common.questionHashNumber", { index: String(qId) })}
                  </span>
                  <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-0.5 font-bold text-[var(--color-primary-hover)]">
                    {t("recruiter.assessments.grading.runsCount", { count: runCount })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events Table */}
      {events.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="p-3 font-bold">{t("recruiter.assessments.grading.colEventType")}</th>
                <th className="p-3 font-bold w-44">{t("recruiter.assessments.grading.colEventTime")}</th>
                <th className="p-3 font-bold">{t("recruiter.assessments.grading.colEventDetail")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((rawEvent, idx) => {
                const e = safeObject<{ eventType?: unknown; createdAt?: unknown; detail?: unknown }>(rawEvent);
                const formattedTime =
                  e.createdAt && (typeof e.createdAt === "string" || typeof e.createdAt === "number")
                    ? formatDateTime(e.createdAt, undefined, locale)
                    : dash;
                const detailStr = safeText(e.detail, dash);

                return (
                  <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-mono text-[11px]">
                        {safeText(e.eventType, "EVENT")}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {formattedTime}
                    </td>
                    <td
                      className="p-3 text-slate-600 dark:text-slate-300 leading-relaxed max-w-md truncate"
                      title={detailStr}
                    >
                      {detailStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-400">
          <ShieldCheck className="mx-auto size-7 text-emerald-500/80 mb-1.5" />
          {t("recruiter.assessments.grading.proctoringCleanDesc")}
        </div>
      )}
    </section>
  );
}

// ==========================================
// SUBCOMPONENT: COPY BUTTON
// ==========================================
function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("recruiter.assessments.common.actions.copiedToClipboard"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("recruiter.assessments.common.actions.copyFailed"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="size-3 text-emerald-600" />
          <span className="text-emerald-600 font-bold">{t("recruiter.assessments.common.actions.copied")}</span>
        </>
      ) : (
        <>
          <Copy className="size-3" />
          <span>{t("recruiter.assessments.common.actions.copy")}</span>
        </>
      )}
    </button>
  );
}
