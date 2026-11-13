import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ChevronDown, CircleHelp, GraduationCap, Lightbulb, Loader2, MessageCircleQuestion, MinusCircle, Sparkles, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { formatNumber, useI18nStore, useLocale, useT, type Locale, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import type { MatchBreakdown, RequirementMatch, RequirementStatus, SkillView } from "@/api/types/cv";
import { useAiLocalization } from "@/hooks/useAiLocalization";

function translateOrFallback(t: TranslateFn, prefix: string, key: string | undefined | null) {
  if (!key) return "";
  const path = `${prefix}.${key}`;
  const value = t(path);
  return value === path ? key : value;
}

function screeningCopy(value: string, t: TranslateFn) {
  const missing = /^No (.+) experience found in the CV\.$/.exec(value);
  if (missing) return t("recruiter.screening.breakdown.copy.noExperience", { skill: missing[1] });
  const exact = /^Normalized CV skill matches (.+)\.$/.exec(value);
  if (exact) return t("recruiter.screening.breakdown.copy.skillMatches", { skill: exact[1] });

  const cleanedValue = value
    .replace(/ Điểm hybrid \(taxonomy \+ Jaccard \+ semantic\), không phải điểm Matching sau assessment\/interview\.?/, "")
    .trim();
  if (cleanedValue === "Job chưa có skill yêu cầu để sàng lọc.") {
    return t("recruiter.screening.breakdown.copy.noRequiredSkills");
  }
  const summaryMatch = /^(\d+)\/(\d+) skill yêu cầu;\s*(không thiếu skill bắt buộc|thiếu(?:\s+kỹ năng bắt buộc)?:\s*(.+?))\.?$/.exec(cleanedValue);
  if (summaryMatch) {
    const matched = summaryMatch[1];
    const total = summaryMatch[2];
    if (summaryMatch[3] === "không thiếu skill bắt buộc") {
      return t("recruiter.screening.breakdown.copy.summaryNoMissing", { matched, total });
    }
    const rawMissing = (summaryMatch[4] ?? "").replace(/^\[|\]$/g, "");
    const cleanedMissing = rawMissing
      .split(",")
      .map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
      .filter(Boolean)
      .join(", ");
    if (cleanedMissing) {
      return t("recruiter.screening.breakdown.copy.summaryMissing", {
        matched,
        total,
        missing: cleanedMissing,
      });
    }
  }

  const normalized = cleanedValue
    .replace("Job chưa có skill yêu cầu để sàng lọc.", t("recruiter.screening.breakdown.copy.noRequiredSkills"))
    .replace(" skill yêu cầu", t("recruiter.screening.breakdown.copy.requiredSkillsUnit"))
    .replace("không thiếu skill bắt buộc", t("recruiter.screening.breakdown.copy.noMissingRequired"))
    .replace("; thiếu: ", t("recruiter.screening.breakdown.copy.missingRequiredPrefix"));
  return normalized.replace(/thiếu kỹ năng bắt buộc:\s*\[([^\]]+)\]/g, (_all, inner: string) => {
    const cleaned = inner
      .split(",")
      .map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
      .filter(Boolean)
      .join(", ");
    return `${t("recruiter.screening.breakdown.copy.missingRequiredPrefix").replace(/^;\s*/, "")}${cleaned}`;
  });
}

const STATUS_META: Record<RequirementStatus, { tone: string; icon: typeof CheckCircle2 }> = {
  MATCH: { tone: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  PARTIAL: { tone: "bg-amber-50 text-amber-700", icon: MinusCircle },
  MISSING: { tone: "bg-red-50 text-red-700", icon: XCircle },
  UNKNOWN: { tone: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]", icon: CircleHelp },
};

function summarizeList(items: string[], maxVisible: number, t: TranslateFn) {
  if (items.length <= maxVisible) return items.join(", ");
  return t("recruiter.screening.breakdown.listMore", {
    items: items.slice(0, maxVisible).join(", "),
    count: items.length - maxVisible,
  });
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function firstString(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function localVerdict(breakdown: MatchBreakdown, t: TranslateFn) {
  const matched = (breakdown.matched ?? []).length;
  const partial = (breakdown.partialMatches ?? []).length;
  const missing = (breakdown.missing ?? []).length;
  const total = matched + partial + missing;
  const reqMissing = breakdown.requiredMissing ?? [];
  const summary = total > 0
    ? t("recruiter.screening.breakdown.verdictWithTotal", { matched, total })
    : t("recruiter.screening.breakdown.verdictCompleted");
  if (reqMissing.length > 0) {
    return t("recruiter.screening.breakdown.verdictMissingRequired", {
      summary,
      missing: summarizeList(reqMissing, 6, t),
    });
  }
  if (breakdown.passed) {
    return t("recruiter.screening.breakdown.verdictPassed", { summary });
  }
  return t("recruiter.screening.breakdown.verdictBelow", { summary });
}

function localStrengths(
  breakdown: MatchBreakdown,
  t: TranslateFn,
  extraction?: Record<string, unknown> | null,
  skills?: SkillView[],
) {
  const bullets: string[] = [];
  const push = (text: string) => {
    const cleaned = text.trim();
    if (cleaned && !bullets.includes(cleaned) && bullets.length < 4) bullets.push(cleaned);
  };

  const matched = (breakdown.matched ?? []).map((item) => item.requirement).filter(Boolean);
  const partial = (breakdown.partialMatches ?? []).map((item) => item.requirement).filter(Boolean);
  if (matched.length > 0) {
    push(t("recruiter.screening.breakdown.strengthMatchedSkills", { skills: summarizeList(matched, 5, t) }));
  } else if (partial.length > 0) {
    push(t("recruiter.screening.breakdown.strengthPartialSkills", { skills: summarizeList(partial, 4, t) }));
  }

  const roles = asArray(extraction?.experience)
    .map((row) => {
      const title = firstString(row, ["title", "role", "position"]);
      const company = firstString(row, ["company", "organization"]);
      if (title && company) return t("recruiter.screening.breakdown.roleAtCompany", { title, company });
      return title || company;
    })
    .filter(Boolean)
    .slice(0, 2);
  const years = breakdown.experienceAnalysis?.candidateYears;
  if (years != null && years > 0 && roles.length > 0) {
    push(t("recruiter.screening.breakdown.strengthExpWithRoles", { years, roles: roles.join(", ") }));
  } else if (years != null && years > 0) {
    push(t("recruiter.screening.breakdown.strengthExpYears", { years }));
  } else if (roles.length > 0) {
    push(t("recruiter.screening.breakdown.strengthExpRoles", { roles: roles.join(", ") }));
  }

  const projects = asArray(extraction?.projects)
    .map((row) => firstString(row, ["name", "title"]))
    .filter(Boolean)
    .slice(0, 2);
  if (projects.length > 0) {
    push(t("recruiter.screening.breakdown.strengthProjects", { projects: projects.join(", ") }));
  }

  const eduRows = asArray(extraction?.education);
  const degree = (eduRows[0] ? firstString(eduRows[0], ["degree", "level", "major", "name"]) : "") || (breakdown.educationAnalysis?.candidateLevel ?? "");
  const school = eduRows[0] ? firstString(eduRows[0], ["school", "institution", "university"]) : "";
  if (degree && school) {
    push(t("recruiter.screening.breakdown.strengthEduDegreeSchool", { degree, school }));
  } else if (degree) {
    push(t("recruiter.screening.breakdown.strengthEduDegree", { degree }));
  } else if (school) {
    push(t("recruiter.screening.breakdown.strengthEduSchool", { school }));
  }

  const certs = asArray(extraction?.certifications)
    .map((row) => firstString(row, ["name", "title"]))
    .filter(Boolean)
    .slice(0, 2);
  if (certs.length > 0) {
    push(t("recruiter.screening.breakdown.strengthCerts", { certs: certs.join(", ") }));
  }

  if (bullets.length < 2 && skills && skills.length > 0) {
    const cvSkills = Array.from(new Set(skills.map((s) => s.skillName?.trim()).filter(Boolean)));
    if (cvSkills.length > 0) {
      push(t("recruiter.screening.breakdown.strengthSkillsGroup", { skills: summarizeList(cvSkills, 5, t) }));
    }
  }
  if (bullets.length < 2) {
    push(t("recruiter.screening.breakdown.strengthFallback1"));
  }
  if (bullets.length < 2) {
    push(t("recruiter.screening.breakdown.strengthFallback2"));
  }
  return bullets;
}

function localRisks(breakdown: MatchBreakdown, t: TranslateFn) {
  const bullets: string[] = [];
  const push = (text: string) => {
    const cleaned = text.trim();
    if (cleaned && !bullets.includes(cleaned) && bullets.length < 4) bullets.push(cleaned);
  };

  const reqMissing = breakdown.requiredMissing ?? [];
  if (reqMissing.length > 0) {
    push(t("recruiter.screening.breakdown.riskMissingRequired", { skills: summarizeList(reqMissing, 6, t) }));
  }

  const exp = breakdown.experienceAnalysis;
  if (exp?.requiredYears != null && exp.requiredYears > 0) {
    if (exp.candidateYears == null) {
      push(t("recruiter.screening.breakdown.riskExpUnclear", { years: exp.requiredYears }));
    } else if (exp.candidateYears < exp.requiredYears) {
      push(t("recruiter.screening.breakdown.riskExpBelow", { candidateYears: exp.candidateYears, requiredYears: exp.requiredYears }));
    }
  }

  const partial = (breakdown.partialMatches ?? []).map((item) => item.requirement).filter(Boolean);
  const optionalMissing = (breakdown.missing ?? [])
    .filter((item) => !item.mandatory && item.requirement)
    .map((item) => item.requirement);
  if (partial.length > 0) {
    push(t("recruiter.screening.breakdown.riskPartialVerify", { skills: summarizeList(partial, 5, t) }));
  } else if (optionalMissing.length > 0) {
    push(t("recruiter.screening.breakdown.riskOptionalMissing", { skills: summarizeList(optionalMissing, 5, t) }));
  }

  const edu = breakdown.educationAnalysis;
  if (edu?.requiredLevel && edu.match === false) {
    push(t("recruiter.screening.breakdown.riskEducation", { level: edu.requiredLevel }));
  }

  if (bullets.length < 2) {
    push(t("recruiter.screening.breakdown.riskFallback1"));
  }
  if (bullets.length < 2) {
    push(t("recruiter.screening.breakdown.riskFallback2"));
  }
  return bullets;
}

function localAdvice(breakdown: MatchBreakdown, t: TranslateFn) {
  const missing = breakdown.requiredMissing ?? [];
  const partial = (breakdown.partialMatches ?? []).map((item) => item.requirement).filter(Boolean);
  const matched = (breakdown.matched ?? []).map((item) => item.requirement).filter(Boolean);
  const exp = breakdown.experienceAnalysis;
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(t("recruiter.screening.breakdown.adviceClarifyMissing", { skills: missing.join(", ") }));
  }
  if (partial.length > 0) {
    parts.push(t("recruiter.screening.breakdown.adviceProbePartial", { skills: partial.join(", ") }));
  }
  if (exp?.requiredYears != null && exp.candidateYears != null && exp.candidateYears < exp.requiredYears) {
    parts.push(t("recruiter.screening.breakdown.adviceExpBelow", { candidateYears: exp.candidateYears, requiredYears: exp.requiredYears }));
  }
  if (breakdown.passed) {
    if (matched.length > 0) {
      parts.push(t("recruiter.screening.breakdown.advicePassedWithFocus", { skills: matched.slice(0, 4).join(", ") }));
    } else {
      parts.push(t("recruiter.screening.breakdown.advicePassedNoFocus"));
    }
  } else if (missing.length > 0) {
    parts.push(t("recruiter.screening.breakdown.adviceHoldMissing"));
  } else if (breakdown.passed === false) {
    parts.push(t("recruiter.screening.breakdown.adviceHoldBelow"));
  }
  return parts.join(" ");
}

export function formatScreeningScore(
  value: number | null | undefined,
  locale: Locale = useI18nStore.getState().locale,
) {
  if (value == null) return "—";
  return formatNumber(Number(value), { maximumFractionDigits: 2 }, locale);
}

export function ScreeningScoreCard({
  score,
  modelVersion,
  breakdown,
}: {
  score: number;
  modelVersion?: string | null;
  breakdown: MatchBreakdown | null | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const passed = breakdown?.passed === true;
  const threshold = breakdown?.passThreshold;
  const pct = Math.min(Math.max(Number(score ?? 0), 0), 100);
  const missingRequired = breakdown?.requiredMissing ?? [];
  const reason = passed
    ? t("recruiter.screening.breakdown.reasonPassed")
    : missingRequired.length > 0
      ? t("recruiter.screening.breakdown.reasonMissingRequired", { skills: missingRequired.join(", ") })
      : threshold != null && Number(score) < threshold
        ? t("recruiter.screening.breakdown.reasonBelowThreshold", { threshold: formatScreeningScore(threshold, locale) })
        : t("recruiter.screening.breakdown.reasonFailedDefault");

  return (
    <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            {t("recruiter.screening.breakdown.scoreCardTitle")}
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
            {formatScreeningScore(score, locale)}
            <span className="text-base font-normal text-[var(--color-on-surface-variant)]"> /100</span>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold",
            passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
          )}
        >
          {passed ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
          {passed ? t("recruiter.screening.breakdown.passed") : t("recruiter.screening.breakdown.failed")}
        </span>
      </div>

      <div className="relative mt-4 h-2.5 w-full overflow-visible rounded-full bg-[var(--color-surface-container-high)]">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
        {threshold != null && (
          <div
            className="absolute -top-1 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-[var(--color-on-surface)]"
            style={{ left: `${Math.min(Math.max(threshold, 0), 100)}%` }}
            title={t("recruiter.screening.breakdown.thresholdTitle", { threshold: formatScreeningScore(threshold, locale) })}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
        <span>{reason}</span>
        {threshold != null && (
          <span className="tabular-nums">
            {t("recruiter.screening.breakdown.thresholdLabel", { threshold: formatScreeningScore(threshold, locale) })}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {modelVersion && <MetaChip>{translateOrFallback(t, "recruiter.screening.breakdown.models", modelVersion)}</MetaChip>}
        {breakdown?.source && <MetaChip>{translateOrFallback(t, "recruiter.screening.breakdown.sources", breakdown.source)}</MetaChip>}
        {breakdown?.jaccardSimilarity != null && (
          <MetaChip>
            {t("recruiter.screening.breakdown.jaccardChip", { score: formatScreeningScore(breakdown.jaccardSimilarity, locale) })}
          </MetaChip>
        )}
      </div>
    </div>
  );
}

export function ScreeningAiPanel({
  breakdown,
  extraction,
  skills,
  cvId,
  contentHash,
  translationPending,
}: {
  breakdown: MatchBreakdown | null | undefined;
  extraction?: Record<string, unknown> | null;
  skills?: SkillView[];
  cvId?: number | null;
  contentHash?: string | null;
  translationPending?: boolean | null;
}) {
  const t = useT();

  const {
    displayContent,
    isTranslated,
    isTranslating,
    showOriginal,
    toggleOriginal,
  } = useAiLocalization({
    entityType: "CV_SCREENING",
    entityId: cvId,
    content: breakdown,
    contentHash: contentHash ?? (breakdown as any)?.contentHash,
    translationPending: translationPending ?? (breakdown as any)?.translationPending,
    sourceLocale: "vi",
  });

  if (!breakdown) return null;

  const activeContent = displayContent ?? breakdown;

  const rawVerdict = activeContent.verdict?.trim() ?? "";
  const verdictText = rawVerdict
    ? (isTranslated && !showOriginal ? rawVerdict : screeningCopy(rawVerdict, t))
    : localVerdict(breakdown, t);

  const serverStrengths = (activeContent.strengths ?? []).map((item) => item.trim()).filter(Boolean);
  const serverRisks = (activeContent.risks ?? []).map((item) => item.trim()).filter(Boolean);
  const strengths = serverStrengths.length > 0 ? serverStrengths : localStrengths(breakdown, t, extraction, skills);
  const risks = serverRisks.length > 0 ? serverRisks : localRisks(breakdown, t);
  const deepAi = breakdown.decisionSource !== "formula" && serverStrengths.length > 0 && serverRisks.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl bg-[var(--color-primary-subtle)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            <span>{t("recruiter.screening.breakdown.aiReviewTitle")}</span>
            {isTranslating && (
              <span className="inline-flex items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400 animate-pulse">
                <Loader2 className="size-3 animate-spin" />
                {t("recruiter.screening.breakdown.aiTranslating")}
              </span>
            )}
            {isTranslated && (
              <div className="inline-flex items-center gap-1.5 text-[11px]">
                <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 font-medium text-[var(--color-primary)]">
                  {t("recruiter.screening.breakdown.aiTranslated")}
                </span>
                <button
                  type="button"
                  onClick={toggleOriginal}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer transition-colors"
                >
                  {showOriginal
                    ? t("recruiter.screening.breakdown.viewTranslation")
                    : t("recruiter.screening.breakdown.viewOriginal")}
                </button>
              </div>
            )}
          </div>
          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
            {deepAi ? t("recruiter.screening.breakdown.deepEvaluation") : t("recruiter.screening.breakdown.summaryEvaluation")}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--color-on-surface)]">{verdictText}</p>

        <div className="grid gap-3 border-t border-[var(--color-primary)]/15 pt-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              {t("recruiter.screening.breakdown.strengthsHeading")}
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-[var(--color-on-surface)]">
              {strengths.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              {t("recruiter.screening.breakdown.risksHeading")}
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-[var(--color-on-surface)]">
              {risks.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <AdviceBlock breakdown={activeContent} isTranslated={isTranslated} showOriginal={showOriginal} />
    </div>
  );
}

export function ScreeningBreakdown({
  score,
  modelVersion,
  breakdown,
  wide = false,
  extraction,
  skills,
  cvId,
  contentHash,
  translationPending,
}: {
  score: number;
  modelVersion?: string | null;
  breakdown: MatchBreakdown | null | undefined;
  wide?: boolean;
  extraction?: Record<string, unknown> | null;
  skills?: SkillView[];
  cvId?: number | null;
  contentHash?: string | null;
  translationPending?: boolean | null;
}) {
  const t = useT();
  if (!breakdown && score == null) return null;
  const pair = wide ? "grid items-start gap-5 lg:grid-cols-2" : "space-y-5";
  return (
    <div className="space-y-5">
      <div className={pair}>
        <ScreeningScoreCard score={score} modelVersion={modelVersion} breakdown={breakdown} />
        <ScreeningAiPanel
          breakdown={breakdown}
          extraction={extraction}
          skills={skills}
          cvId={cvId}
          contentHash={contentHash}
          translationPending={translationPending}
        />
      </div>

      <ComponentBars breakdown={breakdown} />
      <FitTiles breakdown={breakdown} />

      <RequirementGroups
        wide={wide}
        groups={[
          { title: t("recruiter.screening.breakdown.reqMatched"), items: breakdown?.matched },
          { title: t("recruiter.screening.breakdown.reqPartial"), items: breakdown?.partialMatches },
          { title: t("recruiter.screening.breakdown.reqMissing"), items: breakdown?.missing },
        ]}
      />
    </div>
  );
}

function AdviceBlock({
  breakdown,
  isTranslated,
  showOriginal,
}: {
  breakdown: MatchBreakdown;
  isTranslated?: boolean;
  showOriginal?: boolean;
}) {
  const t = useT();
  const stored = breakdown.advice?.trim() ?? "";
  const text = stored
    ? (isTranslated && !showOriginal ? stored : screeningCopy(stored, t))
    : localAdvice(breakdown, t);
  const questions = breakdown.interviewQuestions ?? [];
  if (!text && questions.length === 0) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Lightbulb className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        {stored ? t("recruiter.screening.breakdown.aiAdviceTitle") : t("recruiter.screening.breakdown.suggestedHandlingTitle")}
      </div>
      {text && <p className="text-sm leading-relaxed text-[var(--color-on-surface)]">{text}</p>}
      {questions.length > 0 && (
        <div className="space-y-1.5 border-t border-[var(--color-border-default)]/70 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)]">
            <MessageCircleQuestion className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            {t("recruiter.screening.breakdown.interviewQuestionsTitle")}
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-on-surface)]">
            {questions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--color-surface-container-low)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
      {children}
    </span>
  );
}

export function ComponentBars({ breakdown }: { breakdown: MatchBreakdown | null | undefined }) {
  const t = useT();
  const locale = useLocale();
  if (!breakdown?.components || !breakdown.weights) return null;
  const rows = [
    ["required", t("recruiter.screening.breakdown.components.required"), breakdown.components.required, breakdown.weights.required],
    ["preferred", t("recruiter.screening.breakdown.components.preferred"), breakdown.components.preferred, breakdown.weights.preferred],
    ["jaccard", t("recruiter.screening.breakdown.components.jaccard"), breakdown.components.jaccard, breakdown.weights.jaccard],
    ["experience", t("recruiter.screening.breakdown.components.experience"), breakdown.components.experience, breakdown.weights.experience],
    ["education", t("recruiter.screening.breakdown.components.education"), breakdown.components.education, breakdown.weights.education],
    ["semantic", t("recruiter.screening.breakdown.components.semantic"), breakdown.components.semantic, breakdown.weights.semantic],
  ] as const;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{t("recruiter.screening.breakdown.componentsTitle")}</h3>
      <ul className="space-y-3">
        {rows.map(([key, label, value, weight]) => {
          const active = Boolean(weight);
          const pct = Math.min(Math.max(Number(value ?? 0), 0), 100);
          return (
            <li key={key} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5", !active && "opacity-60")}>
              <span className="text-sm">{label}</span>
              <span className="flex items-center gap-2 text-xs tabular-nums">
                <span className="font-semibold">{value == null ? "—" : formatScreeningScore(value, locale)}</span>
                <span className="rounded-full bg-[var(--color-surface-container-low)] px-2 py-0.5 text-[var(--color-on-surface-variant)]">
                  {active ? `${weight}%` : t("recruiter.screening.breakdown.notCounted")}
                </span>
              </span>
              <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]">
                <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${value == null ? 0 : pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FitTiles({ breakdown }: { breakdown: MatchBreakdown | null | undefined }) {
  const t = useT();
  const experience = breakdown?.experienceAnalysis;
  const education = breakdown?.educationAnalysis;
  const showExperience = experience && (experience.requiredYears != null || experience.candidateYears != null);
  const showEducation = education && (education.requiredLevel != null || education.candidateLevel != null);
  if (!showExperience && !showEducation) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showExperience && (
        <FitTile
          icon={BriefcaseBusiness}
          label={t("recruiter.screening.breakdown.fitExperience")}
          value={t("recruiter.screening.breakdown.fitExperienceYears", { years: experience.candidateYears ?? "—" })}
          requirement={experience.requiredYears == null
            ? t("recruiter.screening.breakdown.noRequirement")
            : t("recruiter.screening.breakdown.fitExperienceRequired", { years: experience.requiredYears })}
          match={experience.match}
        />
      )}
      {showEducation && (
        <FitTile
          icon={GraduationCap}
          label={t("recruiter.screening.breakdown.fitEducation")}
          value={education.candidateLevel ?? "—"}
          requirement={education.requiredLevel ?? t("recruiter.screening.breakdown.noRequirement")}
          match={education.match}
        />
      )}
    </div>
  );
}

function FitTile({ icon: Icon, label, value, requirement, match }: {
  icon: typeof GraduationCap;
  label: string;
  value: string;
  requirement: string;
  match?: boolean;
}) {
  const t = useT();
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[var(--color-surface-container-low)] p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-card)] text-[var(--color-primary)]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--color-on-surface-variant)]">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
        <p className="text-xs text-[var(--color-on-surface-variant)]">{requirement}</p>
      </div>
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", match ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
        {match ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <XCircle className="size-3.5" aria-hidden="true" />}
        {match ? t("recruiter.screening.breakdown.passed") : t("recruiter.screening.breakdown.failed")}
      </span>
    </div>
  );
}

export function RequirementGroups({ wide, groups }: { wide: boolean; groups: Array<{ title: string; items?: RequirementMatch[] }> }) {
  const visible = groups.filter((group) => group.items && group.items.length > 0);
  if (visible.length === 0) return null;
  const columns = !wide || visible.length === 1
    ? "grid-cols-1"
    : visible.length === 2
      ? "lg:grid-cols-2"
      : "lg:grid-cols-3";
  return (
    <div className={cn("grid items-start gap-4", columns)}>
      {visible.map((group) => (
        <RequirementList key={group.title} title={group.title} items={group.items ?? []} />
      ))}
    </div>
  );
}

function RequirementList({ title, items }: { title: string; items: RequirementMatch[] }) {
  const t = useT();
  return (
    <details className="group rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            {title} <span className="font-normal text-[var(--color-on-surface-variant)]">· {items.length}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
            <span className="group-open:hidden">{t("recruiter.screening.common.expand")}</span>
            <span className="hidden group-open:inline">{t("recruiter.screening.common.collapse")}</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </span>
        <span className="mt-3 flex flex-wrap gap-1.5 group-open:hidden">
          {items.map((item) => (
            <span key={`${item.requirement}-${item.status}`} className="rounded-full bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs font-medium">
              {item.requirement}
            </span>
          ))}
        </span>
      </summary>
      <ul className="max-h-72 divide-y divide-[var(--color-surface-container-low)] overflow-y-auto overscroll-contain border-t border-[var(--color-border-default)]">
        {items.map((item) => {
          const statusKey = item.status in STATUS_META ? item.status : "UNKNOWN";
          const meta = STATUS_META[statusKey];
          const Icon = meta.icon;
          return (
            <li key={`${item.requirement}-${item.status}`} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{item.requirement}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.tone)}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {translateOrFallback(t, "recruiter.screening.breakdown.reqStatus", statusKey)}
                </span>
                {item.mandatory && (
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-hover)]">
                    {t("recruiter.screening.breakdown.mandatoryBadge")}
                  </span>
                )}
                {item.matchType && item.matchType !== "NONE" && (
                  <span className="text-[11px] text-[var(--color-on-surface-variant)]">
                    {translateOrFallback(t, "recruiter.screening.breakdown.matchTypes", item.matchType)}
                  </span>
                )}
              </div>
              {item.evidence && <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">“{screeningCopy(item.evidence, t)}”</p>}
              {item.explanation && <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">{screeningCopy(item.explanation, t)}</p>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
