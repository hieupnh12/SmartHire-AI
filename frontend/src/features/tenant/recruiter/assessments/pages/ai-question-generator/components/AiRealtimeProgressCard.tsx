import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  StopCircle,
} from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export type RealtimeStage = "analyzing" | "generating" | "verifying" | "completed";

export type SocketStatus = "connected" | "reconnecting" | "polling_fallback" | "idle";

interface AiRealtimeProgressCardProps {
  stage: RealtimeStage;
  progressPercent: number;
  count: number;
  skill: string;
  questionType: string;
  hasJdContext: boolean;
  socketStatus?: SocketStatus;
  statusMessage?: string;
  onCancel?: () => void;
  className?: string;
}

export function AiRealtimeProgressCard({
  stage,
  progressPercent,
  count,
  skill,
  questionType,
  hasJdContext,
  socketStatus = "connected",
  statusMessage,
  onCancel,
  className,
}: AiRealtimeProgressCardProps) {
  const t = useT();
  const typeLabel =
    questionType === "CODING"
      ? t("recruiter.assessments.common.questionTypes.badgeCode")
      : questionType === "ESSAY"
        ? t("recruiter.assessments.aiStudio.questionTypes.essayLabel")
        : t("recruiter.assessments.aiStudio.questionTypes.mcqLabel");

  const getStageContent = () => {
    switch (stage) {
      case "analyzing":
        return {
          icon: Sparkles,
          iconColor: "text-amber-500",
          bgColor: "bg-amber-500/10 border-amber-500/20",
          title: hasJdContext
            ? t("recruiter.assessments.aiStudio.stageAnalyzingJd")
            : t("recruiter.assessments.aiStudio.stageAnalyzingSkill", { skill }),
          description: t("recruiter.assessments.aiStudio.stageAnalyzingDesc"),
          step: 1,
        };
      case "generating":
        return {
          icon: Brain,
          iconColor: "text-[var(--color-primary)]",
          bgColor: "bg-[var(--color-primary-soft)] border-[var(--color-primary)]/20",
          title: t("recruiter.assessments.aiStudio.stageGeneratingTitle", { count, type: typeLabel, skill }),
          description: t("recruiter.assessments.aiStudio.stageGeneratingDesc"),
          step: 2,
        };
      case "verifying":
        return {
          icon: ShieldCheck,
          iconColor: "text-[var(--color-primary-hover)]",
          bgColor: "bg-[var(--color-primary-subtle)] border-[var(--color-primary)]/25",
          title: t("recruiter.assessments.aiStudio.stageVerifyingTitle"),
          description: t("recruiter.assessments.aiStudio.stageVerifyingDesc"),
          step: 3,
        };
      case "completed":
        return {
          icon: CheckCircle2,
          iconColor: "text-emerald-500",
          bgColor: "bg-emerald-500/10 border-emerald-500/20",
          title: t("recruiter.assessments.aiStudio.stageCompletedTitle", { count }),
          description: t("recruiter.assessments.aiStudio.stageCompletedDesc"),
          step: 3,
        };
    }
  };

  const current = getStageContent();
  const IconComponent = current.icon;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all p-5 shadow-sm",
        stage === "completed"
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          : "border-[var(--color-primary)]/25 bg-[var(--color-primary-subtle)]",
        className,
      )}
    >
      {/* Top bar: Realtime Connection Badge & Cancel Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {socketStatus === "connected" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("recruiter.assessments.aiStudio.realtimeConnected")}
            </span>
          )}
          {socketStatus === "reconnecting" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
              <RefreshCw className="size-3 animate-spin text-amber-600" />
              {t("recruiter.assessments.aiStudio.realtimeReconnecting")}
            </span>
          )}
          {socketStatus === "polling_fallback" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
              <Radio className="size-3 text-slate-500" />
              {t("recruiter.assessments.aiStudio.realtimeFallback")}
            </span>
          )}

          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {t("recruiter.assessments.aiStudio.stepProgress", { step: current.step })}
          </span>
        </div>

        {onCancel && stage !== "completed" && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-colors dark:text-rose-400 dark:border-rose-900 dark:hover:bg-rose-950/40"
          >
            <StopCircle className="size-3.5" />
            <span>{t("recruiter.assessments.aiStudio.cancelOperationBtn")}</span>
          </button>
        )}
      </div>

      {/* Connection Warning Banner if reconnecting */}
      {socketStatus === "reconnecting" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <span>{t("recruiter.assessments.aiStudio.reconnectingBanner")}</span>
        </div>
      )}

      {/* Main Status Display */}
      <div className="mt-4 flex items-start gap-3.5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs",
            current.bgColor,
          )}
        >
          <IconComponent
            className={cn(
              "size-5.5",
              current.iconColor,
              stage !== "completed" && "animate-pulse",
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
            {statusMessage || current.title}
          </h4>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {current.description}
          </p>

          {/* Progress Bar & Percentage */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span>{t("recruiter.assessments.aiStudio.progressLabel")}</span>
              <span className="font-bold text-[var(--color-primary)]">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(8, progressPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Steps Matrix Indicator */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 dark:border-slate-800">
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl p-2 text-center text-[11px] transition-all",
            current.step >= 1
              ? "bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20"
              : "bg-slate-50 text-slate-400 dark:bg-slate-800/40",
          )}
        >
          <span>{t("recruiter.assessments.aiStudio.matrixStep1")}</span>
        </div>
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl p-2 text-center text-[11px] transition-all",
            current.step >= 2
              ? "bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20"
              : "bg-slate-50 text-slate-400 dark:bg-slate-800/40",
          )}
        >
          <span>{t("recruiter.assessments.aiStudio.matrixStep2")}</span>
        </div>
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl p-2 text-center text-[11px] transition-all",
            current.step >= 3
              ? "bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20"
              : "bg-slate-50 text-slate-400 dark:bg-slate-800/40",
          )}
        >
          <span>{t("recruiter.assessments.aiStudio.matrixStep3")}</span>
        </div>
      </div>
    </div>
  );
}
