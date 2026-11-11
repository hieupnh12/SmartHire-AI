import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ZodError } from "zod";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code2,
  FlaskConical,
  GitCompare,
  Network,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import type { CodingContent, EssayCategory, EssayRubric, SampleResult } from "@/api/types/assessment";
import { AssessmentError, assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { formatDateTime, t as globalT, useLocale, useT, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import { useOptionalRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { MonacoCodeEditor } from "./MonacoCodeEditor";
import { applyHarnessTemplate, getHarnessTemplateOptions, type HarnessTemplateId } from "../utils/codingHarnessTemplates";
import { createCodingSchema, contentError, type CodingLanguage } from "../utils/questionContentValidation";

export type EssayArchetypeDefinition = {
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  summaryWeights: string;
  criteria: Array<{
    name: string;
    guide: string;
    description: string;
    weight: number;
    keywords?: string[];
  }>;
};

function splitKeywords(raw: string): string[] {
  return raw
    .split(/[,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildArchetype(
  t: TranslateFn,
  key: "ESSAY_CONCEPTUAL" | "ESSAY_SYSTEM_DESIGN" | "ESSAY_SCENARIO" | "ESSAY_TRADE_OFF",
  weights: [number, number, number],
): EssayArchetypeDefinition {
  const base = `recruiter.assessments.coding.archetypes.${key}`;
  return {
    label: t(`${base}.label`),
    shortLabel: t(`${base}.shortLabel`),
    badge: t(`${base}.badge`),
    description: t(`${base}.description`),
    summaryWeights: t(`${base}.summaryWeights`),
    criteria: [
      {
        name: t(`${base}.c1Name`),
        guide: t(`${base}.c1Guide`),
        description: t(`${base}.c1Desc`),
        weight: weights[0],
        keywords: splitKeywords(t(`${base}.c1Keywords`)),
      },
      {
        name: t(`${base}.c2Name`),
        guide: t(`${base}.c2Guide`),
        description: t(`${base}.c2Desc`),
        weight: weights[1],
        keywords: splitKeywords(t(`${base}.c2Keywords`)),
      },
      {
        name: t(`${base}.c3Name`),
        guide: t(`${base}.c3Guide`),
        description: t(`${base}.c3Desc`),
        weight: weights[2],
        keywords: splitKeywords(t(`${base}.c3Keywords`)),
      },
    ],
  };
}

export function getEssayArchetypes(t: TranslateFn = globalT): Record<EssayCategory, EssayArchetypeDefinition> {
  const conceptual = buildArchetype(t, "ESSAY_CONCEPTUAL", [50, 30, 20]);
  const systemDesign = buildArchetype(t, "ESSAY_SYSTEM_DESIGN", [40, 30, 30]);
  const scenario = buildArchetype(t, "ESSAY_SCENARIO", [40, 40, 20]);
  const tradeOff = buildArchetype(t, "ESSAY_TRADE_OFF", [35, 35, 30]);
  return {
    ESSAY_CONCEPTUAL: conceptual,
    ESSAY_SYSTEM_DESIGN: systemDesign,
    ESSAY_SCENARIO: scenario,
    ESSAY_TRADE_OFF: tradeOff,
    ESSAY_ARCHITECTURE: systemDesign,
    ESSAY_COMPARISON: tradeOff,
  };
}

export function getDefaultRubricTemplate(t: TranslateFn = globalT): EssayRubric {
  return {
    category: "ESSAY_CONCEPTUAL",
    referenceAnswer: "",
    criteria: getEssayArchetypes(t).ESSAY_CONCEPTUAL.criteria.map((c) => ({ ...c })),
  };
}

export function getRubricExample(t: TranslateFn = globalT): string {
  return JSON.stringify(getDefaultRubricTemplate(t), null, 2);
}

export function getCodingExample(t: TranslateFn = globalT): string {
  return JSON.stringify(
    {
      title: t("recruiter.assessments.coding.example.title"),
      constraints: t("recruiter.assessments.coding.example.constraints"),
      category: "CODING_ALGORITHM",
      timeLimitMs: 2000,
      memoryMb: 256,
      starterCode: { python: "def solve(a, b):\n    return a + b" },
      harness: { python: "{{SOURCE}}\na, b = map(int, input().split())\nprint(solve(a, b))" },
      testCases: [
        { input: "1 2", expectedOutput: "3", sample: true, explanation: t("recruiter.assessments.coding.example.explanation"), weight: 0 },
        { input: "-2 5", expectedOutput: "3", sample: false, weight: 50 },
        { input: "10 20", expectedOutput: "30", sample: false, weight: 50 },
      ],
    },
    null,
    2,
  );
}

export function handleCodeKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>, currentValue: string, onUpdate: (val: string) => void) {
  if (event.key === "Tab") {
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = currentValue.substring(0, start) + "  " + currentValue.substring(end);
    onUpdate(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 2;
    });
  }
}

export type SupportedLanguage = {
  id: string;
  label: string;
};

export const ALL_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { id: "java", label: "JAVA" },
  { id: "python", label: "PYTHON" },
  { id: "javascript", label: "JAVASCRIPT" },
  { id: "typescript", label: "TYPESCRIPT" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "sql", label: "SQL" },
  { id: "csharp", label: "C#" },
  { id: "golang", label: "GO" },
  { id: "php", label: "PHP" },
];

export function resolveLanguageFromSkill(skillName?: string | null): SupportedLanguage | null {
  if (!skillName) return null;
  const norm = skillName.trim().toLowerCase();
  if (!norm) return null;

  if (/^java\b(?!script)/i.test(norm) || norm.includes("spring")) return { id: "java", label: "JAVA" };
  if (norm.includes("python") || norm.includes("django") || norm.includes("fastapi") || norm.includes("flask") || norm.includes("pandas")) return { id: "python", label: "PYTHON" };
  if (norm.includes("typescript") || norm.includes("nest") || norm.includes("angular") || norm === "ts") return { id: "typescript", label: "TYPESCRIPT" };
  if (norm.includes("javascript") || norm.includes("node") || norm.includes("react") || norm.includes("vue") || norm === "js") return { id: "javascript", label: "JAVASCRIPT" };
  if (norm.includes("c++") || norm.includes("cpp")) return { id: "cpp", label: "C++" };
  if (norm.includes("c#") || norm.includes("csharp") || norm.includes(".net") || norm.includes("dotnet")) return { id: "csharp", label: "C#" };
  if (norm === "c" || norm.startsWith("c ")) return { id: "c", label: "C" };
  if (norm.includes("sql") || norm.includes("postgres") || norm.includes("mysql") || norm.includes("oracle") || norm.includes("database")) return { id: "sql", label: "SQL" };
  if (norm === "go" || norm.includes("golang")) return { id: "golang", label: "GO" };
  if (norm.includes("php") || norm.includes("laravel")) return { id: "php", label: "PHP" };

  const found = ALL_SUPPORTED_LANGUAGES.find(lang => lang.id === norm || lang.label.toLowerCase() === norm);
  if (found) return found;

  return null;
}

export function getJobLanguages(jobSkills?: Array<{ name: string } | string>): SupportedLanguage[] {
  if (!jobSkills || jobSkills.length === 0) return [];
  const map = new Map<string, SupportedLanguage>();
  for (const s of jobSkills) {
    const name = typeof s === "string" ? s : s?.name;
    const lang = resolveLanguageFromSkill(name);
    if (lang) {
      map.set(lang.id, lang);
    }
  }
  return Array.from(map.values());
}

export function codingAuthoringValue(
  value: string | undefined,
  languageOrSkill: string | undefined,
  snippet: string,
  jobSkills?: Array<{ name: string } | string>
): string {
  if (value?.trim()) return value;
  const fromSkill = resolveLanguageFromSkill(languageOrSkill);
  const fromJob = getJobLanguages(jobSkills)[0];
  const selected = fromSkill?.id ?? fromJob?.id ?? "java";

  return JSON.stringify({
    category: "CODING_ALGORITHM", timeLimitMs: 2000, memoryMb: 256,
    starterCode: { [selected]: snippet || "" }, harness: { [selected]: "{{SOURCE}}" },
    testCases: [
      { input: "", expectedOutput: "", sample: true, weight: 0 },
      { input: "", expectedOutput: "", sample: false, weight: 50 },
      { input: "", expectedOutput: "", sample: false, weight: 50 }
    ],
  });
}

export function CodingStarterFields({
  value,
  onChange,
  jobSkills,
  questionSkill,
}: {
  value: string;
  onChange: (value: string) => void;
  jobSkills?: Array<{ name: string } | string>;
  questionSkill?: string | null;
}) {
  const t = useT();
  const jobFromContext = useOptionalRecruitmentJob();
  const rawSkills = jobSkills ?? jobFromContext?.skills ?? [];
  const jobLanguages = getJobLanguages(rawSkills);
  const questionLang = resolveLanguageFromSkill(questionSkill);
  const defaultCodingJson = useMemo(() => getCodingExample(t), [t]);

  const parse = <T,>(fallback: string): T => {
    try {
      return JSON.parse(value.trim() || fallback) as T;
    } catch {
      return JSON.parse(fallback) as T;
    }
  };

  const coding = parse<CodingContent>(defaultCodingJson);
  const currentLanguages = Object.keys(coding.starterCode ?? {});

  const addLanguage = (langId: string) => {
    if (!langId || currentLanguages.includes(langId)) return;
    onChange(
      JSON.stringify({
        ...coding,
        starterCode: { ...coding.starterCode, [langId]: "" },
        harness: { ...coding.harness, [langId]: "{{SOURCE}}" },
      })
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <div className="border-b border-[var(--color-border-default)] pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--color-on-surface)]">
            <Code2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            {t("recruiter.assessments.coding.starterHeading")}
          </h3>
          {questionLang && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="size-3" />
              {t("recruiter.assessments.coding.questionSkillBadge", { label: questionLang.label })}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
          {t("recruiter.assessments.coding.starterHint")}
        </p>
      </div>

      {Object.entries(coding.starterCode ?? {}).map(([language, source]) => (
        <div key={language} className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--color-primary)]">
              {language}
              {jobLanguages.some(jl => jl.id === language) && (
                <span className="rounded bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20">
                  {t("recruiter.assessments.coding.jobSkillBadge")}
                </span>
              )}
            </span>
            <button
              type="button"
              aria-label={t("recruiter.assessments.coding.removeLangAria", { lang: language.toUpperCase() })}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-error)] hover:bg-[var(--color-error-container)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              onClick={() => {
                const starterCode = { ...coding.starterCode };
                const harness = { ...coding.harness };
                delete starterCode[language];
                delete harness[language];
                onChange(JSON.stringify({ ...coding, starterCode, harness }));
              }}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t("recruiter.assessments.coding.removeLangBtn")}
            </button>
          </div>

          <MonacoCodeEditor
            height="180px"
            language={language}
            value={source}
            onChange={(val) => {
              onChange(
                JSON.stringify({
                  ...coding,
                  starterCode: { ...coding.starterCode, [language]: val },
                })
              );
            }}
            placeholder={t("recruiter.assessments.coding.starterPlaceholder", { lang: language.toUpperCase() })}
          />
        </div>
      ))}

      {currentLanguages.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <Code2 className="mx-auto size-8 text-slate-400" />
          <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("recruiter.assessments.coding.noLanguagesConfigured")}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {(questionLang ? [questionLang] : jobLanguages.length > 0 ? jobLanguages : ALL_SUPPORTED_LANGUAGES.slice(0, 3)).map((l) => (
              <button
                key={l.id}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                onClick={() => addLanguage(l.id)}
              >
                <Plus className="size-3.5" />
                {t("recruiter.assessments.coding.addLanguageBtn", { label: l.label })}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border-default)]">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t("recruiter.assessments.coding.addSupportedLangLabel")}
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {jobLanguages
            .filter((l) => !currentLanguages.includes(l.id))
            .map((l) => (
              <button
                key={l.id}
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary-soft)] px-2 py-1 text-[11px] font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25 hover:bg-[var(--color-primary-subtle)]"
                onClick={() => addLanguage(l.id)}
              >
                <Plus className="size-3" />
                {t("recruiter.assessments.coding.jobLangSuffix", { label: l.label })}
              </button>
            ))}

          <select
            className={cn(assessmentInput, "h-8 py-0 px-2 text-xs w-auto")}
            value=""
            onChange={(e) => addLanguage(e.target.value)}
          >
            <option value="">{t("recruiter.assessments.coding.selectOtherLangOption")}</option>
            {ALL_SUPPORTED_LANGUAGES.filter((l) => !currentLanguages.includes(l.id)).map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

export function AiRubricCriteriaEditor({
  value,
  onChange,
  referenceAnswer,
}: {
  value: string | undefined;
  onChange: (jsonText: string) => void;
  referenceAnswer?: string;
}) {
  const t = useT();
  const essayArchetypes = useMemo(() => getEssayArchetypes(t), [t]);
  const defaultRubricTemplate = useMemo(() => getDefaultRubricTemplate(t), [t]);
  const parse = (): EssayRubric => {
    try {
      if (value?.trim()) return JSON.parse(value) as EssayRubric;
    } catch { /* fallback */ }
    return defaultRubricTemplate;
  };
  const rubric = parse();
  const activeCategory: EssayCategory = rubric.category && rubric.category in essayArchetypes
    ? rubric.category
    : "ESSAY_CONCEPTUAL";
  const criteria = Array.isArray(rubric.criteria) && rubric.criteria.length > 0
    ? rubric.criteria
    : essayArchetypes[activeCategory].criteria.map((c) => ({ ...c }));

  const update = (patch: Partial<EssayRubric>) => {
    const updated: EssayRubric = {
      ...rubric,
      category: activeCategory,
      criteria,
      ...patch,
    };
    if (referenceAnswer !== undefined && !("referenceAnswer" in patch)) {
      updated.referenceAnswer = referenceAnswer;
    }
    onChange(JSON.stringify(updated, null, 2));
  };

  const applyArchetype = (cat: EssayCategory) => {
    const archetype = essayArchetypes[cat];
    const newCriteria = archetype.criteria.map((c) => ({
      name: c.name,
      guide: c.guide,
      description: c.description,
      weight: c.weight,
      keywords: c.keywords ? [...c.keywords] : [],
    }));
    onChange(
      JSON.stringify(
        {
          category: cat,
          referenceAnswer: rubric.referenceAnswer ?? referenceAnswer ?? "",
          criteria: newCriteria,
        },
        null,
        2
      )
    );
  };

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = totalWeight === 100;

  const autoDistribute = () => {
    const count = criteria.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    const nextCriteria = criteria.map((c, i) => ({
      ...c,
      weight: base + (i < remainder ? 1 : 0),
    }));
    update({ criteria: nextCriteria });
  };

  const addCriterion = () => {
    const remainingWeight = Math.max(0, 100 - totalWeight);
    const newCrit = {
      name: t("recruiter.assessments.coding.newCriterionName", { index: criteria.length + 1 }),
      guide: t("recruiter.assessments.coding.newCriterionGuide"),
      description: t("recruiter.assessments.coding.newCriterionDesc"),
      weight: remainingWeight || 10,
      keywords: [],
    };
    update({ criteria: [...criteria, newCrit] });
  };

  const removeCriterion = (idx: number) => {
    update({ criteria: criteria.filter((_, i) => i !== idx) });
  };

  const updateCriterion = (idx: number, patch: Partial<(typeof criteria)[number]>) => {
    const next = criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    update({ criteria: next });
  };

  const archetypeIcons: Record<EssayCategory, typeof BookOpen> = {
    ESSAY_CONCEPTUAL: BookOpen,
    ESSAY_SYSTEM_DESIGN: Network,
    ESSAY_ARCHITECTURE: Network,
    ESSAY_SCENARIO: AlertTriangle,
    ESSAY_TRADE_OFF: GitCompare,
    ESSAY_COMPARISON: GitCompare,
  };

  return (
    <div className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--color-on-surface)]">
            <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            {t("recruiter.assessments.coding.rubricEditorHeading")}
          </h3>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {t("recruiter.assessments.coding.rubricEditorHint")}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
          {t("recruiter.assessments.coding.rubricEditorSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {(["ESSAY_CONCEPTUAL", "ESSAY_SYSTEM_DESIGN", "ESSAY_SCENARIO", "ESSAY_TRADE_OFF"] as const).map(
          (key) => {
            const arch = essayArchetypes[key];
            const Icon = archetypeIcons[key];
            const isSelected = activeCategory === key ||
              (key === "ESSAY_SYSTEM_DESIGN" && activeCategory === "ESSAY_ARCHITECTURE") ||
              (key === "ESSAY_TRADE_OFF" && activeCategory === "ESSAY_COMPARISON");
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyArchetype(key)}
                className={cn(
                  "relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] shadow-xs"
                    : "border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary-soft)]"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div
                    className={cn(
                      "grid size-7 place-items-center rounded-lg",
                      isSelected
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-surface-card)] text-[var(--color-on-surface-variant)]"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)]">
                      <Check className="size-3.5" /> {t("recruiter.assessments.coding.selectedBadge")}
                    </span>
                  )}
                </div>
                <span className="mt-2.5 text-xs font-bold text-[var(--color-on-surface)]">
                  {arch.shortLabel}
                </span>
                <span className="text-[10px] text-[var(--color-on-surface-variant)] mt-0.5">
                  {arch.badge}
                </span>
                <p className="mt-2 line-clamp-2 text-[11px] text-[var(--color-on-surface-variant)] leading-normal">
                  {arch.description}
                </p>
              </button>
            );
          }
        )}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5",
          isWeightValid
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        )}
      >
        <div className="flex items-center gap-2">
          {!isWeightValid && <AlertTriangle className="size-4 shrink-0" />}
          <div>
            <p className="text-xs font-semibold">
              {t("recruiter.assessments.coding.totalWeightText")}<span className="font-bold">{totalWeight}%</span> / 100%
              {isWeightValid ? t("recruiter.assessments.coding.weightBalanced") : t("recruiter.assessments.coding.weightUnbalanced")}
            </p>
            <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className={cn("h-full transition-all", isWeightValid ? "bg-emerald-500" : "bg-amber-500")}
                style={{ width: `${Math.min(100, totalWeight)}%` }}
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={autoDistribute}
          className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-white/70 px-2.5 py-1 text-xs font-semibold hover:bg-white dark:bg-black/30 dark:hover:bg-black/50"
        >
          <RotateCcw className="size-3" />
          {t("recruiter.assessments.coding.distributeWeightsBtn")}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            {t("recruiter.assessments.coding.criteriaListHeading", { count: criteria.length })}
          </h4>
          <button
            type="button"
            onClick={addCriterion}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            <Plus className="size-3.5" /> {t("recruiter.assessments.coding.addCriterionBtn")}
          </button>
        </div>

        {criteria.map((crit, idx) => (
          <div
            key={idx}
            className="space-y-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={crit.name ?? crit.description}
                  onChange={(e) => updateCriterion(idx, { name: e.target.value, description: e.target.value })}
                  placeholder={t("recruiter.assessments.coding.criterionNamePlaceholder")}
                  className={cn(assessmentInput, "h-8 py-1 text-xs font-semibold flex-1")}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={crit.weight}
                    onChange={(e) => updateCriterion(idx, { weight: Number(e.target.value) || 0 })}
                    className={cn(assessmentInput, "h-8 w-16 py-1 text-center text-xs font-bold")}
                  />
                  <span className="text-xs font-bold text-[var(--color-on-surface-variant)]">%</span>
                </div>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    className="grid size-8 place-items-center rounded-lg text-[var(--color-error)] hover:bg-[var(--color-error-container)]"
                    aria-label={t("recruiter.assessments.coding.deleteCriterionAria", { index: idx + 1 })}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={2}
              value={crit.guide ?? ""}
              onChange={(e) => updateCriterion(idx, { guide: e.target.value })}
              placeholder={t("recruiter.assessments.coding.criterionGuidePlaceholder")}
              className={cn(assessmentInput, "text-xs resize-y")}
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                {t("recruiter.assessments.coding.aiKeywordsLabel")}
              </span>
              {(crit.keywords ?? []).map((kw, kidx) => (
                <span
                  key={kidx}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-card)] px-2 py-0.5 text-[11px] text-[var(--color-on-surface)] border border-[var(--color-border-default)]"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() =>
                      updateCriterion(idx, {
                        keywords: (crit.keywords ?? []).filter((_, ki) => ki !== kidx),
                      })
                    }
                    className="text-[var(--color-outline)] hover:text-[var(--color-error)]"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={t("recruiter.assessments.coding.addKeywordPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val && !(crit.keywords ?? []).includes(val)) {
                      updateCriterion(idx, {
                        keywords: [...(crit.keywords ?? []), val],
                      });
                      e.currentTarget.value = "";
                    }
                  }
                }}
                className="h-6 rounded border border-dashed border-[var(--color-border-default)] bg-transparent px-2 text-[11px] outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function passed(result: SampleResult) {
  return result.status?.id === 3;
}

export function QuestionContentFields({
  type,
  value,
  onChange,
  executionOnly = false,
  jobSkills,
  questionId,
}: {
  type: "ESSAY" | "CODING";
  value: string;
  onChange: (value: string) => void;
  executionOnly?: boolean;
  jobSkills?: Array<{ name: string } | string>;
  questionId?: number;
}) {
  const t = useT();
  const locale = useLocale();
  const codingSchema = useMemo(() => createCodingSchema(t), [t]);
  const harnessTemplateOptions = useMemo(() => getHarnessTemplateOptions(t), [t]);
  const defaultCodingJson = useMemo(() => getCodingExample(t), [t]);

  let error: string | undefined;
  try {
    if (value.trim()) JSON.parse(value);
  } catch {
    error = t("recruiter.assessments.coding.invalidJsonError");
  }
  const parse = <T,>(fallback: string): T => {
    try {
      return JSON.parse(value.trim() || fallback) as T;
    } catch {
      return JSON.parse(fallback) as T;
    }
  };

  if (type === "ESSAY") {
    return <AiRubricCriteriaEditor value={value} onChange={onChange} />;
  }

  const jobFromContext = useOptionalRecruitmentJob();
  const rawSkills = jobSkills ?? jobFromContext?.skills ?? [];
  const jobLanguages = getJobLanguages(rawSkills);

  const coding = parse<CodingContent>(defaultCodingJson);
  const languages = Object.keys(coding.starterCode ?? {});
  const [verifyLanguage, setVerifyLanguage] = useState(languages[0] ?? "python");
  const [solution, setSolution] = useState(
    coding.starterCode?.[verifyLanguage] ?? coding.starterCode?.[languages[0] ?? ""] ?? ""
  );
  const [verifyMessage, setVerifyMessage] = useState<string>();
  const [templateId, setTemplateId] = useState<HarnessTemplateId | "">("");

  const update = (patch: Partial<CodingContent>) => onChange(JSON.stringify({ ...coding, ...patch }, null, 2));

  const verify = useMutation({
    mutationFn: async () => {
      const parsed = codingSchema.parse(coding);
      return questionBankApi.verifyCoding({ coding: parsed, language: verifyLanguage, source: solution, questionId });
    },
    onSuccess: (results) => {
      const ok = results.filter(passed).length;
      const allOk = ok === results.length;
      if (allOk && questionId) update({ verifiedAt: new Date().toISOString() });
      else if (!allOk) update({ verifiedAt: null });
      setVerifyMessage(
        allOk
          ? questionId
            ? t("recruiter.assessments.coding.verifyPassedSaved", { ok, total: results.length })
            : t("recruiter.assessments.coding.verifyPassedUnsaved", { ok, total: results.length })
          : t("recruiter.assessments.coding.verifyFailed", { ok, total: results.length })
      );
    },
    onError: () => setVerifyMessage(undefined),
  });

  const applyTemplate = () => {
    if (!templateId) return;
    const targets = (languages.length ? languages : ["python"]) as CodingLanguage[];
    const generated = applyHarnessTemplate(templateId, targets, t);
    if (!Object.keys(generated.starterCode).length) return;
    update({
      starterCode: { ...coding.starterCode, ...generated.starterCode },
      harness: { ...coding.harness, ...generated.harness },
    });
    const first = Object.keys(generated.starterCode)[0];
    if (first) {
      setVerifyLanguage(first);
      setSolution(generated.starterCode[first] ?? "");
    }
  };

  const hiddenTests = (coding.testCases ?? []).filter((t) => !t.sample);
  const sampleTests = (coding.testCases ?? []).filter((t) => t.sample);
  const hiddenTotalWeight = hiddenTests.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
  const isWeightValid = hiddenTests.length === 0 || hiddenTotalWeight === 100;

  const autoDistributeWeights = () => {
    const count = hiddenTests.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    let hIndex = 0;
    const nextCases = (coding.testCases ?? []).map((tc) => {
      if (tc.sample) return { ...tc, weight: 0 };
      const extra = hIndex < remainder ? 1 : 0;
      hIndex++;
      return { ...tc, weight: base + extra };
    });
    update({ testCases: nextCases });
  };

  return (
    <fieldset className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <legend className="px-2 text-sm font-medium">
        {executionOnly ? t("recruiter.assessments.coding.legendExecutionOnly") : t("recruiter.assessments.coding.legendCodingProblem")}
      </legend>
      {executionOnly && (
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          {t("recruiter.assessments.coding.executionOnlyHint")}
        </p>
      )}

      {coding.verifiedAt && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("recruiter.assessments.coding.verifiedAtNotice", {
            time: formatDateTime(coding.verifiedAt, undefined, locale),
            unsavedNote: questionId ? "" : t("recruiter.assessments.coding.verifiedAtUnsavedSuffix"),
          })}
        </p>
      )}
      {!executionOnly && !questionId && (
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          {t("recruiter.assessments.coding.saveBeforeVerifyHint")}
        </p>
      )}

      {!executionOnly && (
        <>
          <label className="block text-sm">
            {t("recruiter.assessments.coding.problemTitleLabel")}
            <input
              className={assessmentInput}
              maxLength={255}
              value={coding.title ?? ""}
              onChange={(event) => update({ title: event.target.value })}
              placeholder={t("recruiter.assessments.coding.problemTitlePlaceholder")}
            />
          </label>
          <label className="block text-sm">
            {t("recruiter.assessments.coding.constraintsLabel")}
            <textarea
              rows={3}
              maxLength={5000}
              className={assessmentInput}
              value={coding.constraints ?? ""}
              onChange={(event) => update({ constraints: event.target.value })}
              placeholder={t("recruiter.assessments.coding.constraintsPlaceholder")}
            />
          </label>
        </>
      )}

      <details className="rounded-xl border border-[var(--color-border-default)] p-4" open={executionOnly ? undefined : true}>
        <summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary)]">
          {t("recruiter.assessments.coding.advancedSummary")}
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              {t("recruiter.assessments.coding.categoryLabel")}
              <select
                className={assessmentInput}
                value={coding.category}
                onChange={(event) => update({ category: event.target.value as CodingContent["category"] })}
              >
                <option value="CODING_ALGORITHM">{t("recruiter.assessments.coding.categoryAlgorithm")}</option>
                <option value="CODING_OOP">{t("recruiter.assessments.coding.categoryOop")}</option>
                <option value="SQL_QUERY">{t("recruiter.assessments.coding.categorySql")}</option>
              </select>
            </label>
            <label className="text-sm">
              {t("recruiter.assessments.coding.timeLimitLabel")}
              <input
                type="number"
                min={100}
                max={10000}
                className={assessmentInput}
                value={coding.timeLimitMs}
                onChange={(event) => update({ timeLimitMs: Number(event.target.value) })}
              />
            </label>
            <label className="text-sm">
              {t("recruiter.assessments.coding.memoryLimitLabel")}
              <input
                type="number"
                min={32}
                max={512}
                className={assessmentInput}
                value={coding.memoryMb}
                onChange={(event) => update({ memoryMb: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
            <label className="min-w-56 flex-1 text-sm">
              {t("recruiter.assessments.coding.templateSelectLabel")}
              <select
                className={assessmentInput}
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value as HarnessTemplateId | "")}
              >
                <option value="">{t("recruiter.assessments.coding.templateDefaultOption")}</option>
                {harnessTemplateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} — {option.hint}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="secondary" disabled={!templateId} onClick={applyTemplate}>
              {t("recruiter.assessments.coding.applyTemplateBtn")}
            </Button>
            <p className="basis-full text-xs text-[var(--color-on-surface-variant)]">
              {t("recruiter.assessments.coding.applyTemplateHint")}
            </p>
          </div>

          {Object.entries(coding.starterCode ?? {}).map(([language, starter]) => (
            <div key={language} className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <Code2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                  {t("recruiter.assessments.coding.harnessTitle")}
                </h4>
                <span className="rounded-md bg-[var(--color-primary-soft)] px-3 py-1 font-mono text-xs font-semibold uppercase text-[var(--color-primary)]">
                  {language}
                </span>
              </div>
              <div className={executionOnly ? "space-y-4" : "grid gap-4 lg:grid-cols-2"}>
                {!executionOnly && (
                  <div className="space-y-2 text-xs font-medium">
                    <span>{t("recruiter.assessments.coding.starterFieldLabel")}</span>
                    <MonacoCodeEditor
                      height="200px"
                      language={language}
                      value={starter}
                      onChange={(val) => update({ starterCode: { ...coding.starterCode, [language]: val } })}
                      placeholder={t("recruiter.assessments.coding.starterFieldPlaceholder", { lang: language.toUpperCase() })}
                    />
                  </div>
                )}
                <div className="space-y-2 text-xs font-medium">
                  <span>{t("recruiter.assessments.coding.harnessFieldLabel")}</span>
                  <MonacoCodeEditor
                    height="200px"
                    language={language}
                    value={coding.harness?.[language] ?? ""}
                    onChange={(val) => update({ harness: { ...coding.harness, [language]: val } })}
                    placeholder={t("recruiter.assessments.coding.harnessFieldPlaceholder")}
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {t("recruiter.assessments.coding.harnessHelp")}
              </p>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("recruiter.assessments.coding.addLanguageToSupportLabel")}
              <select
                className={cn(assessmentInput, "mt-1")}
                value=""
                onChange={(event) => {
                  const language = event.target.value;
                  if (language) {
                    update({
                      starterCode: { ...coding.starterCode, [language]: "" },
                      harness: { ...coding.harness, [language]: "{{SOURCE}}" },
                    });
                  }
                }}
              >
                <option value="">{t("recruiter.assessments.coding.selectLangToAddOption")}</option>
                {jobLanguages.filter((l) => !(l.id in (coding.starterCode ?? {}))).length > 0 && (
                  <optgroup label={t("recruiter.assessments.coding.jobLangOptgroup")}>
                    {jobLanguages
                      .filter((l) => !(l.id in (coding.starterCode ?? {})))
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {t("recruiter.assessments.coding.jobLangOption", { label: l.label })}
                        </option>
                      ))}
                  </optgroup>
                )}
                {ALL_SUPPORTED_LANGUAGES.filter(
                  (l) => !(l.id in (coding.starterCode ?? {})) && !jobLanguages.some((jl) => jl.id === l.id)
                ).length > 0 && (
                  <optgroup label={jobLanguages.length > 0 ? t("recruiter.assessments.coding.otherLangOptgroup") : t("recruiter.assessments.coding.allLangOptgroup")}>
                    {ALL_SUPPORTED_LANGUAGES.filter(
                      (l) => !(l.id in (coding.starterCode ?? {})) && !jobLanguages.some((jl) => jl.id === l.id)
                    ).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          </div>
        </div>
      </details>

      <div className="space-y-4 border-t border-[var(--color-border-default)] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            {t("recruiter.assessments.coding.testSuiteHeading", { count: coding.testCases?.length ?? 0 })}
          </h4>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {t("recruiter.assessments.coding.testSuiteCounts", { sample: sampleTests.length, hidden: hiddenTests.length })}
          </span>
        </div>

        {hiddenTests.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5",
              isWeightValid
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            )}
          >
            <div>
              <p className="text-xs font-semibold">
                {t("recruiter.assessments.coding.hiddenTotalWeight", {
                  total: hiddenTotalWeight,
                  status: isWeightValid ? t("recruiter.assessments.coding.hiddenWeightValid") : t("recruiter.assessments.coding.hiddenWeightInvalid"),
                })}
              </p>
              <progress className="mt-1 h-1.5 w-48 rounded-full accent-[var(--color-primary)]" max={100} value={Math.min(hiddenTotalWeight, 100)} />
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              onClick={autoDistributeWeights}
            >
              {t("recruiter.assessments.coding.autoDistributeHiddenBtn")}
            </button>
          </div>
        )}

        {(coding.testCases ?? []).map((test, index) => (
          <div key={index} className="grid gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 sm:col-span-2">
              <span className="text-sm font-semibold">{t("recruiter.assessments.coding.testCaseTitle", { index: String(index + 1).padStart(2, "0") })}</span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    test.sample
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  {test.sample
                    ? t("recruiter.assessments.coding.samplePublicBadge")
                    : t("recruiter.assessments.coding.hiddenWeightedBadge", { weight: test.weight ?? 0 })}
                </span>
              </div>
            </div>

            <label className="text-sm">
              {t("recruiter.assessments.coding.inputLabel", { index: index + 1 })}
              <textarea
                rows={2}
                className={cn(assessmentInput, "font-mono text-xs")}
                value={test.input}
                onChange={(event) =>
                  update({
                    testCases: coding.testCases.map((item, i) => (i === index ? { ...item, input: event.target.value } : item)),
                  })
                }
              />
            </label>

            <label className="text-sm">
              {t("recruiter.assessments.coding.expectedOutputLabel")}
              <textarea
                rows={2}
                className={cn(assessmentInput, "font-mono text-xs")}
                value={test.expectedOutput}
                onChange={(event) =>
                  update({
                    testCases: coding.testCases.map((item, i) => (i === index ? { ...item, expectedOutput: event.target.value } : item)),
                  })
                }
              />
            </label>

            {test.sample && (
              <label className="text-sm sm:col-span-2">
                {t("recruiter.assessments.coding.sampleExplanationLabel")}
                <textarea
                  rows={2}
                  maxLength={5000}
                  className={assessmentInput}
                  value={test.explanation ?? ""}
                  onChange={(event) =>
                    update({
                      testCases: coding.testCases.map((item, i) => (i === index ? { ...item, explanation: event.target.value } : item)),
                    })
                  }
                  placeholder={t("recruiter.assessments.coding.sampleExplanationPlaceholder")}
                />
              </label>
            )}

            <div className="flex flex-wrap items-center gap-4 sm:col-span-2 justify-between">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={test.sample}
                  className="accent-[var(--color-primary)]"
                  onChange={(event) =>
                    update({
                      testCases: coding.testCases.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              sample: event.target.checked,
                              weight: event.target.checked ? 0 : item.weight || 20,
                            }
                          : item
                      ),
                    })
                  }
                />
                {t("recruiter.assessments.coding.publicCheckboxLabel")}
              </label>

              {!test.sample && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>{t("recruiter.assessments.coding.weightPercentLabel")}</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className={cn(assessmentInput, "w-24 font-bold text-slate-900 pr-6 dark:text-white")}
                      value={test.weight ?? ""}
                      placeholder="0"
                      onChange={(event) => {
                        const weight = event.target.value === "" ? undefined : Number(event.target.value);
                        update({
                          testCases: coding.testCases.map((item, i) => (i === index ? { ...item, weight } : item)),
                        });
                      }}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </label>
              )}

              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1 text-xs text-[var(--color-error)] hover:underline ml-auto"
                onClick={() => update({ testCases: coding.testCases.filter((_, i) => i !== index) })}
              >
                <Trash2 className="size-3.5" />
                {t("recruiter.assessments.coding.deleteTestBtn")}
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]"
          onClick={() => {
            const currentCases = coding.testCases ?? [];
            const currentHidden = currentCases.filter((t) => !t.sample);
            const currentTotal = currentHidden.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
            const defaultWeight = Math.max(1, 100 - currentTotal);
            update({ testCases: [...currentCases, { input: "", expectedOutput: "", sample: false, weight: defaultWeight }] });
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("recruiter.assessments.coding.addTestCaseBtn")}
        </button>
      </div>

      <section className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
        <h4 className="text-sm font-semibold">{t("recruiter.assessments.coding.verifySectionTitle")}</h4>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          {t("recruiter.assessments.coding.verifySectionDesc")}
        </p>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <label className="text-sm">
            {t("recruiter.assessments.coding.verifyLangLabel")}
            <select
              className={assessmentInput}
              value={verifyLanguage}
              onChange={(event) => {
                const next = event.target.value;
                setVerifyLanguage(next);
                setSolution(coding.starterCode?.[next] ?? "");
                verify.reset();
                setVerifyMessage(undefined);
              }}
            >
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            {t("recruiter.assessments.coding.verifySolutionLabel")}
            <textarea
              rows={6}
              spellCheck={false}
              className={`${assessmentInput} font-mono text-xs`}
              value={solution}
              onChange={(event) => {
                setSolution(event.target.value);
                verify.reset();
                setVerifyMessage(undefined);
              }}
            />
          </label>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={verify.isPending || !solution.trim() || !languages.includes(verifyLanguage)}
          onClick={() => {
            setVerifyMessage(undefined);
            verify.mutate();
          }}
        >
          <Play className="size-4" aria-hidden="true" />
          {verify.isPending ? t("recruiter.assessments.coding.verifyRunningBtn") : t("recruiter.assessments.coding.verifyRunBtn")}
        </Button>
        {verify.isError &&
          (verify.error instanceof ZodError ? (
            <FieldError message={contentError(verify.error, t)} />
          ) : (
            <AssessmentError error={verify.error} />
          ))}
        {verifyMessage && (
          <p
            role="status"
            className={`text-sm ${
              verify.data && verify.data.every(passed)
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-status-danger)]"
            }`}
          >
            {verifyMessage}
          </p>
        )}
        {verify.data && (
          <ul className="space-y-1 text-xs">
            {verify.data.map((result, index) => (
              <li key={index} className={passed(result) ? "text-emerald-700" : "text-[var(--color-status-danger)]"}>
                {t("recruiter.assessments.coding.testResultLine", {
                  index: index + 1,
                  status: passed(result) ? t("recruiter.assessments.coding.testPassedWord") : t("recruiter.assessments.coding.testFailedWord"),
                  description: result.status?.description ?? "",
                })}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!value.trim() && (
        <button type="button" className="ml-3 text-sm text-[var(--color-primary)]" onClick={() => onChange(defaultCodingJson)}>
          {t("recruiter.assessments.coding.useDisplayedExampleBtn")}
        </button>
      )}
      <FieldError message={error} />
    </fieldset>
  );
}
