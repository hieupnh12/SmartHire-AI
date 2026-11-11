import { useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleAlert,
  Code2,
  FileSearch,
  Layers,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";
import { formatDateTime, formatNumber, useLocale, useT } from "@/i18n";
import type { RankingRow, RankingSources } from "../../types/ranking";
import { getRankingLabel, scoreText } from "../rankingUi";

const card = "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900";

function OverallGauge({ value }: { value: number | null }) {
  const t = useT();
  const locale = useLocale();
  const score = Math.max(0, Math.min(100, value ?? 0));
  const circumference = 2 * Math.PI * 42;
  return (
    <div
      className="relative grid size-28 shrink-0 place-items-center"
      aria-label={
        value === null
          ? t("recruiter.screening.overview.gaugeNoScoreAria")
          : t("recruiter.screening.overview.gaugeScoreAria", { score: scoreText(value, locale) })
      }
    >
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          className="text-brand-primary"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span className="absolute text-center">
        <strong className="block text-xl font-black text-slate-900 dark:text-white tabular-nums">
          {scoreText(value, locale)}
        </strong>
        <span className="text-[11px] text-slate-400">/ 100</span>
      </span>
    </div>
  );
}

function ComponentBreakdown({ row }: { row: RankingRow }) {
  const t = useT();
  const locale = useLocale();
  return (
    <section className={card} aria-labelledby="breakdown-title">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 id="breakdown-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Target className="size-4.5 text-brand-primary" aria-hidden="true" />
            {t("recruiter.screening.overview.breakdownTitle")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("recruiter.screening.overview.breakdownSubtitle")}
          </p>
        </div>
        <span className="text-xs text-slate-400">{t("recruiter.screening.overview.scaleLabel")}</span>
      </header>
      <div className="space-y-4">
        {row.result.components.map((part) => (
          <div key={part.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {getRankingLabel(part.key, t)}
              </span>
              <strong className="tabular-nums text-slate-900 dark:text-white font-bold">
                {scoreText(part.score, locale)} <span className="font-normal text-slate-400">/ 100</span>
              </strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-primary transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, part.score ?? 0))}%` }}
              />
            </div>
            <div className="flex justify-between gap-4 text-[11px] text-slate-400">
              <span>{getRankingLabel(part.state, t)}</span>
              <span className="font-semibold text-brand-primary">
                {t("recruiter.screening.overview.weightLabel", { weight: part.weight })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormulaTable({ row }: { row: RankingRow }) {
  const t = useT();
  const locale = useLocale();
  return (
    <details className={`${card} group`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 focus:outline-none">
        <div>
          <span className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Code2 className="size-4.5 text-brand-primary" aria-hidden="true" />
            {t("recruiter.screening.overview.formulaTitle")}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("recruiter.screening.overview.formulaSubtitle")}
          </p>
        </div>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="rounded-l-lg px-3 py-2.5">{t("recruiter.screening.overview.formulaComponentCol")}</th>
              <th className="px-3 py-2.5 text-center">{t("recruiter.screening.overview.formulaRawCol")}</th>
              <th className="px-3 py-2.5 text-center">{t("recruiter.screening.overview.formulaWeightCol")}</th>
              <th className="rounded-r-lg px-3 py-2.5 text-right">{t("recruiter.screening.overview.formulaContributionCol")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {row.result.components.map((part) => (
              <tr key={part.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                  {getRankingLabel(part.key, t)}
                </td>
                <td className="px-3 py-2.5 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                  {scoreText(part.score, locale)}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-slate-500">
                  {part.weight}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-brand-primary">
                  {scoreText(part.contribution, locale)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold dark:bg-slate-800/80">
              <td className="rounded-l-lg px-3 py-2.5">{t("recruiter.screening.overview.formulaTotalRow")}</td>
              <td className="px-3 py-2.5 text-center">—</td>
              <td className="px-3 py-2.5 text-center">100%</td>
              <td className="rounded-r-lg px-3 py-2.5 text-right text-sm text-brand-primary">
                {scoreText(row.result.score, locale)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </details>
  );
}

function SkillEvidence({ row }: { row: RankingRow }) {
  const t = useT();
  const locale = useLocale();
  return (
    <section className={card} aria-labelledby="skills-title">
      <header className="mb-4">
        <h3 id="skills-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <FileSearch className="size-4.5 text-brand-primary" aria-hidden="true" />
          {t("recruiter.screening.overview.skillEvidenceTitle")}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t("recruiter.screening.overview.skillEvidenceSubtitle")}
        </p>
      </header>

      <div className="space-y-4">
        {row.groups.map((group) => (
          <div key={group.category} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {getRankingLabel(group.category, t)}
              </strong>
              <span className="rounded-full bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-brand-primary">
                {t("recruiter.screening.overview.skillCoverage", {
                  score: scoreText(group.score, locale),
                  coverage: scoreText(group.coverage, locale),
                })}
              </span>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {group.matches.map((match) => (
                <li
                  key={match.requiredSkill}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                    {match.requiredSkill}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {match.evidence ?? t("recruiter.screening.overview.noSkillExcerpt")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {row.missingRequired.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <strong>{t("recruiter.screening.overview.missingSkillsLabel")}</strong> {row.missingRequired.join(", ")}
        </div>
      )}
    </section>
  );
}

function InsightPanel({ row }: { row: RankingRow }) {
  const t = useT();
  const locale = useLocale();
  if (!row.insight) return null;

  const translateOrRaw = (prefix: string, code: string) => {
    const path = `${prefix}.${code}`;
    const value = t(path);
    return value === path ? code : value;
  };

  return (
    <section className={card} aria-labelledby="insight-title">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 id="insight-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Sparkles className="size-4.5 text-brand-primary" aria-hidden="true" />
            {t("recruiter.screening.overview.insight.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("recruiter.screening.overview.insight.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 rounded-xl bg-brand-primary/5 border border-brand-primary/15 p-4 dark:bg-brand-primary/10 dark:border-brand-primary/20">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
          {t("recruiter.screening.overview.insight.eyebrow", { score: scoreText(row.result.score, locale) })}
        </p>
        <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
          {translateOrRaw("recruiter.screening.overview.insight.recommendations", row.insight.recommendation)}
        </p>
      </div>

      {row.insight.strengths.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Award className="size-4 text-brand-primary" />
            {t("recruiter.screening.overview.insight.strengths")}
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {row.insight.strengths.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <Check className="mt-0.5 size-3.5 text-emerald-600 shrink-0" />
                <span>{translateOrRaw("recruiter.screening.overview.insight.signals", item)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {row.insight.risks.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
            <CircleAlert className="size-4 text-amber-600" />
            {t("recruiter.screening.overview.insight.risks")}
          </h4>
          <ul className="mt-2 space-y-1.5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {row.insight.risks.map((item) => (
              <li key={item}>• {translateOrRaw("recruiter.screening.overview.insight.signals", item)}</li>
            ))}
          </ul>
        </div>
      )}

      {row.insight.questions.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Lightbulb className="size-4 text-brand-primary" />
            {t("recruiter.screening.overview.insight.questions")}
          </h4>
          <ol className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {row.insight.questions.map((item, index) => (
              <li key={item}>
                {t("recruiter.screening.overview.insight.questionTemplate", {
                  index: index + 1,
                  skill: item.replace("VERIFY_SKILL:", ""),
                })}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Timeline({ row }: { row: RankingRow }) {
  const t = useT();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? row.timeline : row.timeline.slice(-5);

  const eventLabel = (type: string) => {
    const path = `recruiter.screening.overview.timeline.events.${type}`;
    const value = t(path);
    return value === path ? type : value;
  };

  return (
    <section className={card} aria-labelledby="timeline-title">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 id="timeline-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <BriefcaseBusiness className="size-4.5 text-brand-primary" aria-hidden="true" />
            {t("recruiter.screening.overview.timeline.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("recruiter.screening.overview.timeline.subtitle")}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {t("recruiter.screening.overview.timeline.count", { count: row.timeline.length })}
        </span>
      </header>

      <ol className="relative ml-2 border-l border-slate-200 dark:border-slate-800">
        {visibleEvents.map((event, index) => (
          <li key={`${event.type}-${event.occurredAt ?? index}`} className="relative pb-3 pl-5 last:pb-0">
            <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-brand-primary ring-4 ring-white dark:ring-slate-900" />
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {eventLabel(event.type)}
              </p>
              <time className="shrink-0 text-[11px] text-slate-400">
                {event.occurredAt
                  ? formatDateTime(event.occurredAt, undefined, locale)
                  : t("recruiter.screening.overview.timeline.notRecorded")}
              </time>
            </div>
          </li>
        ))}
      </ol>
      {row.timeline.length > 5 && (
        <button
          type="button"
          className="mt-3 w-full text-center text-xs font-semibold text-brand-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? t("recruiter.screening.common.collapse")
            : t("recruiter.screening.overview.timeline.showAll", { count: row.timeline.length })}
        </button>
      )}
    </section>
  );
}

function SourceSelector({ data }: { data: RankingSources }) {
  const t = useT();
  const activeCv = data.cvs?.find((c) => c.id === data.selected?.cvId) ?? data.cvs?.[0];
  const activeSubmission = data.submissions?.find((s) => s.id === data.selected?.submissionId) ?? data.submissions?.[0];
  const activeInterview = data.aiInterviews?.find((i) => i.id === data.selected?.aiInterviewId) ?? data.aiInterviews?.[0];

  const sources = [
    {
      label: t("recruiter.screening.overview.sources.cvLabel"),
      active: activeCv,
      fallbackName: t("recruiter.screening.overview.sources.cvFallback"),
      icon: FileSearch,
    },
    {
      label: t("recruiter.screening.overview.sources.assessmentLabel"),
      active: activeSubmission,
      fallbackName: t("recruiter.screening.overview.sources.assessmentFallback"),
      icon: Code2,
    },
    {
      label: t("recruiter.screening.overview.sources.interviewLabel"),
      active: activeInterview,
      fallbackName: t("recruiter.screening.overview.sources.interviewFallback"),
      icon: Sparkles,
    },
  ];

  return (
    <section className={card} aria-labelledby="source-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="source-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Layers className="size-4.5 text-brand-primary" aria-hidden="true" />
            {t("recruiter.screening.overview.sources.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("recruiter.screening.overview.sources.subtitle")}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {sources.map((item) => {
          const Icon = item.icon;
          const isLinked = !!item.active;
          const statusText = item.active?.status
            ? getRankingLabel(item.active.status, t)
            : t("recruiter.screening.overview.sources.autoConnected");
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                    isLinked
                      ? "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20"
                      : "bg-slate-200/60 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {item.label}
                  </span>
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.active ? item.active.label : item.fallbackName}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                {isLinked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Check className="size-3" />
                    {statusText}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {t("recruiter.screening.overview.sources.notAvailable")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CandidateOverviewTab({
  row,
  sourcesData,
  tenantKey: _tenantKey,
}: {
  row: RankingRow;
  sourcesData?: RankingSources;
  tenantKey: string;
  preview?: boolean;
}) {
  const t = useT();
  const locale = useLocale();

  return (
    <div className="space-y-6">
      <section className={card}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <OverallGauge value={row.result.score} />
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                {t("recruiter.screening.overview.overallRankEyebrow")}
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {row.result.complete
                  ? t("recruiter.screening.overview.overallRankTitle", { rank: row.rank ?? "—" })
                  : t("recruiter.screening.overview.overallRankPending")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {row.result.complete
                  ? t("recruiter.screening.overview.overallRankCompleteDesc")
                  : t("recruiter.screening.overview.overallRankProgressDesc", {
                      completed: row.result.completedComponents,
                      required: row.result.requiredComponents,
                    })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
            {row.result.components.map((part) => (
              <div key={part.key} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/40 min-w-24">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {getRankingLabel(part.key, t)}
                </span>
                <strong className="mt-0.5 block text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {scoreText(part.score, locale)}
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <ComponentBreakdown row={row} />
          <SkillEvidence row={row} />

          <section className={card}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t("recruiter.screening.overview.workExpTitle")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {row.experienceMonths === null
                ? t("recruiter.screening.overview.workExpUnclear")
                : t("recruiter.screening.overview.workExpSummary", {
                    months: row.experienceMonths,
                    years: formatNumber(row.experienceMonths / 12, { minimumFractionDigits: 1, maximumFractionDigits: 1 }, locale),
                  })}
            </p>
            <div className="mt-3 space-y-2">
              {row.experienceEvidence.map((evidence, index) => (
                <blockquote
                  key={index}
                  className="rounded-xl border-l-3 border-brand-primary bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                >
                  "{evidence}"
                </blockquote>
              ))}
            </div>
          </section>

          <FormulaTable row={row} />
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <InsightPanel row={row} />
          <Timeline row={row} />
          {sourcesData && <SourceSelector data={sourcesData} />}
        </aside>
      </div>
    </div>
  );
}
