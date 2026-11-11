import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCheck,
  CircleHelp,
  Code2,
  FileText,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import type { BankQuestionRequest } from "@/api/types/questionBank";
import type { CodingContent, QuestionRequest } from "@/api/types/assessment";
import { AssessmentError, assessmentInput } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";
import { t as globalT, useT, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

const SKILLS = SKILL_CATALOG.flatMap((group) => group.skills);

type QuestionKind = "MCQ" | "MULTIPLE_CHOICE" | "ESSAY" | "CODING";
type CodingLanguage = "java" | "python" | "javascript" | "sql";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultSkill?: string;
  defaultType?: QuestionKind;
  skillOptions?: string[];
  defaultTopic?: string;
  jobContext?: string;
};

type Rubric = { referenceAnswer?: string; criteria?: { description: string; weight: number }[] };

type DraftItem = {
  id: string;
  batch: number;
  question: QuestionRequest;
  authoringMetadata: Record<string, unknown> | null;
};

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function asRubric(value: unknown): Rubric | null {
  return value && typeof value === "object" ? (value as Rubric) : null;
}

function similarIds(meta: Record<string, unknown> | null | undefined): number[] {
  const raw = meta?.similarQuestionIds;
  return Array.isArray(raw) ? raw.filter((id): id is number => typeof id === "number") : [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollCodingDrafts(
  body: {
    skill: string;
    difficulty: "Easy" | "Medium" | "Hard";
    count: number;
    language: CodingLanguage;
    instructions: string;
  },
  translate: TranslateFn = globalT,
): Promise<BankQuestionRequest[]> {
  const started = await questionBankApi.generate({
    skill: body.skill,
    questionType: "CODING",
    difficulty: body.difficulty,
    count: Math.max(1, Math.min(5, body.count)),
    language: body.language,
    instructions: body.instructions,
  });
  for (let attempt = 0; attempt < 90; attempt++) {
    const status = await questionBankApi.generationStatus(started.id);
    if (status.status === "READY") {
      return status.questions.map((question) => ({
        question,
        authoringMetadata: { aiGenerated: true, source: "AI" },
      }));
    }
    if (status.status === "FAILED") {
      throw new Error(status.error || translate("recruiter.assessments.aiStudio.codingGenerateFailed"));
    }
    await sleep(2000);
  }
  throw new Error(translate("recruiter.assessments.aiStudio.codingGenerateTimeout"));
}

function codingSummary(coding: CodingContent | null | undefined, translate: TranslateFn = globalT) {
  if (!coding) return null;
  const langs = Object.keys(coding.starterCode ?? {});
  const sample = (coding.testCases ?? []).filter((item) => item.sample).length;
  const hidden = (coding.testCases ?? []).filter((item) => !item.sample).length;
  return {
    title: coding.title || translate("recruiter.assessments.aiStudio.codingFallbackTitle"),
    category: coding.category,
    langs: langs.join(", ") || translate("recruiter.assessments.common.dash"),
    sample,
    hidden,
  };
}

function getQuestionTypes(t: TranslateFn) {
  return [
    {
      id: "MCQ" as const,
      label: t("recruiter.assessments.aiStudio.questionTypes.mcqLabel"),
      badge: t("recruiter.assessments.aiStudio.questionTypes.mcqBadge"),
      icon: ListChecks,
    },
    {
      id: "MULTIPLE_CHOICE" as const,
      label: t("recruiter.assessments.aiStudio.questionTypes.multiLabel"),
      badge: t("recruiter.assessments.aiStudio.questionTypes.multiBadge"),
      icon: CheckCheck,
    },
    {
      id: "ESSAY" as const,
      label: t("recruiter.assessments.aiStudio.questionTypes.essayLabel"),
      badge: t("recruiter.assessments.aiStudio.questionTypes.essayBadge"),
      icon: FileText,
    },
    {
      id: "CODING" as const,
      label: t("recruiter.assessments.aiStudio.questionTypes.codingLabel"),
      badge: t("recruiter.assessments.aiStudio.questionTypes.codingBadge"),
      icon: Code2,
    },
  ] as const;
}

function getDifficulties(t: TranslateFn) {
  return [
    { id: "Easy" as const, label: t("recruiter.assessments.common.difficulty.easyShort") },
    { id: "Medium" as const, label: t("recruiter.assessments.common.difficulty.mediumShort") },
    { id: "Hard" as const, label: t("recruiter.assessments.common.difficulty.hardShort") },
  ] as const;
}

function getQuickPrompts(t: TranslateFn) {
  return [
    t("recruiter.assessments.aiStudio.quickPrompts.architecture"),
    t("recruiter.assessments.aiStudio.quickPrompts.performance"),
    t("recruiter.assessments.aiStudio.quickPrompts.concurrency"),
    t("recruiter.assessments.aiStudio.quickPrompts.security"),
    t("recruiter.assessments.aiStudio.quickPrompts.cleanCode"),
    t("recruiter.assessments.aiStudio.quickPrompts.transactions"),
  ];
}

export function AiQuestionGenerateDialog({
  open,
  onClose,
  onSaved,
  defaultSkill = "",
  defaultType = "MCQ",
  skillOptions,
  defaultTopic = "",
  jobContext = "",
}: Props) {
  const t = useT();
  const helpText = t("recruiter.assessments.aiStudio.dialogHelp");
  const questionTypes = getQuestionTypes(t);
  const difficulties = getDifficulties(t);
  const quickPrompts = getQuickPrompts(t);
  const skills = skillOptions?.length ? skillOptions : SKILLS;
  const [skill, setSkill] = useState(defaultSkill || skills[0] || "Java");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [questionType, setQuestionType] = useState<QuestionKind>(defaultType);
  const [count, setCount] = useState(3);
  const [topic, setTopic] = useState(defaultTopic);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [codingLanguage, setCodingLanguage] = useState<CodingLanguage>("java");
  const [includeJd, setIncludeJd] = useState(Boolean(jobContext.trim()));

  // Quản lý câu hỏi nháp & đợt sinh (Batching)
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchCount, setBatchCount] = useState(0);
  const [generationMode, setGenerationMode] = useState<"APPEND" | "REPLACE">("REPLACE");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!open) return;
    setSkill(defaultSkill || skills[0] || "Java");
    setQuestionType(defaultType);
    setTopic(defaultTopic);
    setIncludeJd(Boolean(jobContext.trim()));
  }, [open, defaultSkill, defaultType, defaultTopic, jobContext, skills]);

  const coding = questionType === "CODING";
  const maxCount = coding ? 5 : 10;

  const patchDraft = (id: string, patch: Partial<QuestionRequest>) => {
    setDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, question: { ...item.question, ...patch } } : item)),
    );
  };

  const patchOption = (
    id: string,
    optionIndex: number,
    patch: { optionText?: string; correct?: boolean },
  ) => {
    setDrafts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const options = (item.question.options ?? []).map((option, j) => {
          if (j !== optionIndex) {
            if (patch.correct === true && item.question.questionType === "MCQ") {
              return { ...option, correct: false };
            }
            return option;
          }
          return { ...option, ...patch };
        });
        return { ...item, question: { ...item.question, options } };
      }),
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((item) => item.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.info(t("recruiter.assessments.aiStudio.removedDraftToast"));
  };

  const generate = useMutation({
    mutationFn: async () => {
      const contextText = includeJd ? jobContext.trim() : "";
      if (questionType === "CODING") {
        const instructions = [topic.trim(), contextText].filter(Boolean).join("\n\n");
        return pollCodingDrafts({
          skill,
          difficulty,
          count,
          language: codingLanguage,
          instructions,
        }, t);
      }
      return questionBankApi.generateStream(
        {
          skill,
          difficulty,
          questionType,
          count,
          topic: topic.trim() || undefined,
          language,
          context: contextText || undefined,
        },
        {},
      );
    },
    onSuccess: (items) => {
      const nextBatch = batchCount + 1;
      setBatchCount(nextBatch);

      const newDraftItems: DraftItem[] = items.map((raw) => ({
        id: uid(),
        batch: nextBatch,
        question: raw.question,
        authoringMetadata: raw.authoringMetadata,
      }));

      if (generationMode === "APPEND" && drafts.length > 0) {
        setDrafts((prev) => [...prev, ...newDraftItems]);
        setSelected((prev) => {
          const next = new Set(prev);
          newDraftItems.forEach((d) => next.add(d.id));
          return next;
        });
        toast.success(
          t("recruiter.assessments.aiStudio.batchAppendTitle", { count: items.length, batch: nextBatch }),
          t("recruiter.assessments.aiStudio.batchAppendDesc"),
        );
      } else {
        setDrafts(newDraftItems);
        setSelected(new Set(newDraftItems.map((d) => d.id)));
        setGenerationMode("APPEND"); // Mặc định sau đợt đầu chuyển sang APPEND để tiện sinh đợt 2
        toast.success(
          t("recruiter.assessments.aiStudio.batchCreatedTitle", { count: items.length }),
          t("recruiter.assessments.aiStudio.batchCreatedDesc"),
        );
      }

      const dupes = items.filter((item) => similarIds(item.authoringMetadata).length > 0).length;
      if (dupes > 0) {
        toast.warning(
          t("recruiter.assessments.aiStudio.duplicateWarningTitle"),
          t("recruiter.assessments.aiStudio.duplicateWarningDesc", { count: dupes }),
        );
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t("recruiter.assessments.aiStudio.generateErrorFallback");
      toast.error(t("recruiter.assessments.aiStudio.generateErrorTitle"), msg);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const picked = drafts
        .filter((item) => selected.has(item.id))
        .map((item) => ({
          question: item.question,
          authoringMetadata: item.authoringMetadata,
        }));
      if (!picked.length) throw new Error(t("recruiter.assessments.aiStudio.pickAtLeastOneError"));
      return questionBankApi.create(picked);
    },
    onSuccess: (saved) => {
      toast.success(
        t("recruiter.assessments.aiStudio.saveSuccessTitle", { count: saved.length }),
        t("recruiter.assessments.aiStudio.saveSuccessDesc"),
      );
      setDrafts([]);
      setSelected(new Set());
      setBatchCount(0);
      setGenerationMode("REPLACE");
      onSaved();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t("recruiter.assessments.aiStudio.saveErrorFallback");
      toast.error(t("recruiter.assessments.aiStudio.saveErrorTitle"), msg);
    },
  });

  const busy = generate.isPending || save.isPending;
  const selectedCount = selected.size;

  const filteredDrafts = useMemo(() => {
    if (typeFilter === "ALL") return drafts;
    return drafts.filter((item) => item.question.questionType === typeFilter);
  }, [drafts, typeFilter]);

  const toggleSelectAll = () => {
    if (selected.size === filteredDrafts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredDrafts.map((d) => d.id)));
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in-50 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-gen-title"
    >
      <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        {/* Top Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/25 shadow-2xs">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="ai-gen-title" className="text-base font-bold text-[#101828] dark:text-white">
                  {t("recruiter.assessments.aiStudio.title")}
                </h2>
                <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary-hover)]">
                  {t("recruiter.assessments.aiStudio.engineBadge")}
                </span>
                <Tooltip content={helpText} side="right">
                  <span className="cursor-help text-slate-400 hover:text-slate-600 transition-colors">
                    <CircleHelp className="size-4" aria-hidden="true" />
                  </span>
                </Tooltip>
              </div>
              <p className="text-xs text-[#667085] dark:text-slate-400">
                {t("recruiter.assessments.aiStudio.dialogSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              onClick={onClose}
              disabled={busy}
              aria-label={t("recruiter.assessments.common.actions.close")}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Main Body - 2 Columns Studio Layout */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row overflow-hidden">
          {/* CỘT TRÁI: Bảng điều khiển tham số AI (AI Parameters & Prompt Panel) */}
          <aside className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-r border-slate-200/80 bg-slate-50/70 p-5 overflow-y-auto space-y-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="size-3.5 text-[var(--color-primary)]" /> {t("recruiter.assessments.aiStudio.configHeading")}
              </span>
              {batchCount > 0 && (
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                  {t("recruiter.assessments.aiStudio.batchesGenerated", { count: batchCount })}
                </span>
              )}
            </div>

            {/* 1. Kỹ năng & Ngôn ngữ */}
            <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t("recruiter.assessments.aiStudio.skillLabel")}
                </span>
                <select
                  disabled={busy}
                  className={cn(assessmentInput, "text-xs font-semibold")}
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                >
                  {skills.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              {coding ? (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t("recruiter.assessments.aiStudio.codingLangLabel")}
                  </span>
                  <select
                    disabled={busy}
                    className={cn(assessmentInput, "text-xs")}
                    value={codingLanguage}
                    onChange={(e) => setCodingLanguage(e.target.value as CodingLanguage)}
                  >
                    <option value="java">{t("recruiter.assessments.aiStudio.codingLangOptions.java")}</option>
                    <option value="python">{t("recruiter.assessments.aiStudio.codingLangOptions.python")}</option>
                    <option value="javascript">{t("recruiter.assessments.aiStudio.codingLangOptions.javascript")}</option>
                    <option value="sql">{t("recruiter.assessments.aiStudio.codingLangOptions.sql")}</option>
                  </select>
                </label>
              ) : (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t("recruiter.assessments.aiStudio.promptLangLabel")}
                  </span>
                  <select
                    disabled={busy}
                    className={cn(assessmentInput, "text-xs")}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
                  >
                    <option value="vi">{t("recruiter.assessments.aiStudio.langVi")}</option>
                    <option value="en">{t("recruiter.assessments.aiStudio.langEn")}</option>
                  </select>
                </label>
              )}
            </div>

            {/* 2. Loại câu hỏi (4 Cards) */}
            <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t("recruiter.assessments.aiStudio.questionFormatLabel")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {questionTypes.map((qt) => {
                  const Icon = qt.icon;
                  const isSelected = questionType === qt.id;
                  return (
                    <button
                      key={qt.id}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setQuestionType(qt.id);
                        setCount((prev) => Math.min(prev, qt.id === "CODING" ? 5 : 10));
                      }}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] ring-2 ring-[var(--color-primary)]/20"
                          : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300",
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className="size-4" />
                        <span className="text-[10px] font-medium opacity-75">{qt.badge}</span>
                      </div>
                      <span className="text-xs font-bold leading-tight">{qt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Độ khó & Số lượng */}
            <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t("recruiter.assessments.aiStudio.difficultyLabel")}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {difficulties.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setDifficulty(d.id)}
                      className={cn(
                        "rounded-lg py-1.5 text-xs font-semibold transition-all border",
                        difficulty === d.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] shadow-2xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t("recruiter.assessments.aiStudio.countLabel")}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-primary)]">{t("recruiter.assessments.aiStudio.countBadge", { count })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={maxCount}
                    value={count}
                    disabled={busy}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="flex-1 accent-[var(--color-primary)] cursor-pointer"
                  />
                  <input
                    type="number"
                    min={1}
                    max={maxCount}
                    value={count}
                    disabled={busy}
                    onChange={(e) =>
                      setCount(Math.max(1, Math.min(maxCount, Number(e.target.value) || 1)))
                    }
                    className={cn(assessmentInput, "w-14 text-center font-bold text-xs py-1")}
                  />
                </div>
              </div>
            </div>

            {/* 4. Yêu cầu chi tiết & Quick Prompts */}
            <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t("recruiter.assessments.aiStudio.topicLabel")}
                </span>
                <textarea
                  rows={2}
                  maxLength={2000}
                  disabled={busy}
                  className={cn(assessmentInput, "text-xs leading-relaxed resize-none")}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={
                    coding
                      ? t("recruiter.assessments.aiStudio.topicCodingPlaceholder")
                      : t("recruiter.assessments.aiStudio.topicGeneralPlaceholder")
                  }
                />
              </label>

              {/* Gợi ý chủ đề nhanh */}
              <div className="flex flex-wrap gap-1 pt-1">
                {quickPrompts.map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    disabled={busy}
                    onClick={() => setTopic((prev) => (prev ? `${prev}, ${qp}` : qp))}
                    className="rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    + {qp}
                  </button>
                ))}
              </div>

              {jobContext && (
                <label className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeJd}
                    disabled={busy}
                    onChange={(e) => setIncludeJd(e.target.checked)}
                    className="size-3.5 rounded border-slate-300 text-[var(--color-primary)] accent-[var(--color-primary)]"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {t("recruiter.assessments.aiStudio.includeJdLabel")}
                  </span>
                </label>
              )}
            </div>

            {/* 5. Chế độ sinh (Khi đã có câu hỏi nháp) */}
            {drafts.length > 0 && (
              <div className="space-y-2 rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/50 p-3.5">
                <span className="block text-xs font-bold text-[var(--color-primary-hover)]">
                  {t("recruiter.assessments.aiStudio.nextGenModeLabel")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setGenerationMode("APPEND")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all border",
                      generationMode === "APPEND"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-2xs"
                        : "border-[var(--color-primary)]/25 bg-white text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-soft)] dark:border-slate-700 dark:bg-slate-900 dark:text-[var(--color-primary)]",
                    )}
                  >
                    <Plus className="size-3.5" />
                    <span>{t("recruiter.assessments.aiStudio.appendBtn", { batch: batchCount + 1 })}</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setGenerationMode("REPLACE")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all border",
                      generationMode === "REPLACE"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-2xs"
                        : "border-[var(--color-primary)]/25 bg-white text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-soft)] dark:border-slate-700 dark:bg-slate-900 dark:text-[var(--color-primary)]",
                    )}
                  >
                    <RotateCcw className="size-3.5" />
                    <span>{t("recruiter.assessments.aiStudio.replaceBtn")}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[var(--color-primary-hover)]/90">
                  {generationMode === "APPEND"
                    ? t("recruiter.assessments.aiStudio.appendHint")
                    : t("recruiter.assessments.aiStudio.replaceHint")}
                </p>
              </div>
            )}

            {/* Primary Action Button */}
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => generate.mutate()}
              className="w-full py-2.5 font-bold shadow-md gap-2"
            >
              {generate.isPending ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>
                    {coding
                      ? t("recruiter.assessments.aiStudio.generatingCodingBtn")
                      : t("recruiter.assessments.aiStudio.generatingBtn", { count })}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>
                    {drafts.length === 0
                      ? t("recruiter.assessments.aiStudio.generateFirstBtn", { count })
                      : generationMode === "APPEND"
                        ? t("recruiter.assessments.aiStudio.generateMoreBtn", { batch: batchCount + 1, count })
                        : t("recruiter.assessments.aiStudio.generateReplaceBtn", { count })}
                  </span>
                </>
              )}
            </Button>
          </aside>

          {/* CỘT PHẢI: Không gian kiểm duyệt & Chỉnh sửa nháp (Review & Edit Workspace) */}
          <main className="flex-1 min-w-0 bg-white flex flex-col overflow-hidden dark:bg-slate-900">
            {/* Review Bar (Thanh công cụ kiểm duyệt) */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/50 px-6 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      filteredDrafts.length > 0 && selected.size === filteredDrafts.length
                    }
                    onChange={toggleSelectAll}
                    disabled={filteredDrafts.length === 0 || busy}
                    className="size-4 rounded border-slate-300 text-[var(--color-primary)] accent-[var(--color-primary)]"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t("recruiter.assessments.aiStudio.selectAllCount", { count: filteredDrafts.length })}
                  </span>
                </label>

                {drafts.length > 0 && (
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25">
                    {t("recruiter.assessments.aiStudio.selectedRatio", { selected: selectedCount, total: drafts.length })}
                  </span>
                )}
              </div>

              {/* Bộ lọc loại câu (Filter) & Nút xóa hết */}
              {drafts.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setTypeFilter("ALL")}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium transition-all",
                        typeFilter === "ALL"
                          ? "bg-slate-100 font-bold text-slate-900 dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
                      )}
                    >
                      {t("recruiter.assessments.aiStudio.filterAllCount", { count: drafts.length })}
                    </button>
                    {(["MCQ", "MULTIPLE_CHOICE", "ESSAY", "CODING"] as const).map((type) => {
                      const c = drafts.filter((d) => d.question.questionType === type).length;
                      if (!c) return null;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTypeFilter(type)}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-medium transition-all",
                            typeFilter === type
                              ? "bg-slate-100 font-bold text-slate-900 dark:bg-slate-700 dark:text-white"
                              : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
                          )}
                        >
                          {t(`recruiter.assessments.aiStudio.filterShort.${type}`)} ({c})
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t("recruiter.assessments.aiStudio.clearAllConfirm"))) {
                        setDrafts([]);
                        setSelected(new Set());
                        setBatchCount(0);
                        setGenerationMode("REPLACE");
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    <span>{t("recruiter.assessments.aiStudio.clearDraftsBtn")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Vùng danh sách câu hỏi nháp (Scrollable Question Review Cards) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              <AssessmentError error={generate.error || save.error} />

              {/* State 1: Chưa có câu hỏi nào */}
              {drafts.length === 0 && !generate.isPending && (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/25 mb-4 shadow-sm">
                    <Sparkles className="size-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("recruiter.assessments.aiStudio.emptyTitle")}
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t("recruiter.assessments.aiStudio.emptyDescPrefix")}
                    <strong>{t("recruiter.assessments.aiStudio.emptyDescBtnName")}</strong>.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                      <span className="font-bold text-[var(--color-primary)]">1.</span> {t("recruiter.assessments.aiStudio.emptyStep1")}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                      <span className="font-bold text-[var(--color-primary)]">2.</span> {t("recruiter.assessments.aiStudio.emptyStep2")}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                      <span className="font-bold text-[var(--color-primary)]">3.</span> {t("recruiter.assessments.aiStudio.emptyStep3")}
                    </span>
                  </div>
                </div>
              )}

              {/* State 2: Đang sinh câu hỏi */}
              {generate.isPending && (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/40 p-8 text-center animate-pulse">
                  <RefreshCw className="size-8 text-[var(--color-primary)] animate-spin mb-3" />
                  <h3 className="text-sm font-bold text-[var(--color-primary-hover)]">
                    {t("recruiter.assessments.aiStudio.pendingCardTitle")}
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-[var(--color-primary-hover)]/80">
                    {coding
                      ? t("recruiter.assessments.aiStudio.pendingCardCodingDesc")
                      : t("recruiter.assessments.aiStudio.pendingCardGeneralDesc")}
                  </p>
                </div>
              )}

              {/* State 3: Hiển thị danh sách câu hỏi đã sinh */}
              {filteredDrafts.map((item, index) => {
                const q = item.question;
                const checked = selected.has(item.id);
                const dups = similarIds(item.authoringMetadata);
                const rubric = asRubric(q.rubricJson);
                const code = codingSummary(q.coding, t);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border transition-all p-5 shadow-2xs space-y-4",
                      checked
                        ? "border-[var(--color-primary)]/60 bg-[var(--color-primary-soft)]/25 ring-1 ring-[var(--color-primary)]/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900",
                    )}
                  >
                    {/* Header câu hỏi */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy}
                            onChange={() => {
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            }}
                            className="size-4 rounded border-slate-300 text-[var(--color-primary)] accent-[var(--color-primary)]"
                          />
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {t("recruiter.assessments.common.questionHashNumber", { index: index + 1 })}
                          </span>
                        </label>

                        {/* Badges thông tin */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {batchCount > 1 && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {t("recruiter.assessments.common.batchLabel", { batch: item.batch })}
                            </span>
                          )}
                          <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25">
                            {q.questionType === "MCQ"
                              ? t("recruiter.assessments.common.questionTypes.badgeSingle")
                              : q.questionType === "MULTIPLE_CHOICE"
                                ? t("recruiter.assessments.common.questionTypes.badgeMulti")
                                : q.questionType === "ESSAY"
                                  ? t("recruiter.assessments.common.questionTypes.badgeEssay")
                                  : t("recruiter.assessments.common.questionTypes.badgeCode")}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                              q.difficulty === "Easy"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300"
                                : q.difficulty === "Hard"
                                  ? "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950 dark:text-amber-300",
                            )}
                          >
                            {q.difficulty === "Easy"
                              ? t("recruiter.assessments.common.difficulty.easyShort")
                              : q.difficulty === "Hard"
                                ? t("recruiter.assessments.common.difficulty.hardShort")
                                : t("recruiter.assessments.common.difficulty.mediumShort")}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {q.skill}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <span>{t("recruiter.assessments.aiStudio.pointsLabel")}</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            disabled={busy}
                            className={cn(assessmentInput, "w-14 text-center font-bold text-xs py-0.5")}
                            value={q.points}
                            onChange={(e) =>
                              patchDraft(item.id, {
                                points: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                              })
                            }
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => removeDraft(item.id)}
                          disabled={busy}
                          title={t("recruiter.assessments.aiStudio.removeCardTooltip")}
                          className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Cảnh báo câu tương đồng */}
                    {dups.length > 0 && (
                      <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
                        <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          {t("recruiter.assessments.aiStudio.duplicateBannerPrefix")}
                          <strong>
                            {dups.map((id) => `#QB-${String(id).padStart(3, "0")}`).join(", ")}
                          </strong>
                          {t("recruiter.assessments.aiStudio.duplicateBannerSuffix")}
                        </span>
                      </div>
                    )}

                    {/* Nội dung câu hỏi (Editable Textarea) */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {t("recruiter.assessments.aiStudio.questionBodyLabel")}
                      </label>
                      <textarea
                        rows={3}
                        disabled={busy}
                        className={cn(
                          assessmentInput,
                          "w-full text-sm leading-relaxed font-medium bg-slate-50/50 focus:bg-white resize-y",
                        )}
                        value={q.questionText}
                        onChange={(e) => patchDraft(item.id, { questionText: e.target.value })}
                      />
                    </div>

                    {/* Câu trắc nghiệm: Các lựa chọn đáp án */}
                    {(q.questionType === "MCQ" || q.questionType === "MULTIPLE_CHOICE") && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {t("recruiter.assessments.aiStudio.optionsHeading", { count: q.options?.length ?? 0 })}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {q.questionType === "MCQ"
                              ? t("recruiter.assessments.aiStudio.radioHint")
                              : t("recruiter.assessments.aiStudio.checkboxHint")}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options ?? []).map((option, optIdx) => {
                            const isCorrect = Boolean(option.correct);
                            return (
                              <div
                                key={optIdx}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-xl border p-2.5 transition-all",
                                  isCorrect
                                    ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-800 ring-1 ring-emerald-500/20"
                                    : "border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900",
                                )}
                              >
                                <input
                                  type={q.questionType === "MCQ" ? "radio" : "checkbox"}
                                  name={`draft-${item.id}-correct`}
                                  checked={isCorrect}
                                  disabled={busy}
                                  onChange={(e) =>
                                    patchOption(item.id, optIdx, { correct: e.target.checked })
                                  }
                                  className={cn(
                                    "size-4 shrink-0 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer",
                                  )}
                                />
                                <span className="font-mono text-xs font-bold text-slate-400">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <input
                                  className="flex-1 bg-transparent text-xs font-medium text-slate-800 outline-none dark:text-slate-100"
                                  disabled={busy}
                                  value={option.optionText}
                                  onChange={(e) =>
                                    patchOption(item.id, optIdx, { optionText: e.target.value })
                                  }
                                />
                                {isCorrect && (
                                  <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                    {t("recruiter.assessments.aiStudio.correctOptionTag")}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Câu tự luận: Đáp án tham khảo */}
                    {q.questionType === "ESSAY" && rubric && (
                      <div className="space-y-1.5 rounded-xl border border-amber-200/60 bg-amber-50/30 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                          {t("recruiter.assessments.aiStudio.referenceAnswerHeading")}
                        </span>
                        <textarea
                          rows={2}
                          disabled={busy}
                          className={cn(assessmentInput, "text-xs leading-relaxed bg-white")}
                          value={rubric.referenceAnswer ?? ""}
                          onChange={(e) =>
                            patchDraft(item.id, {
                              rubricJson: {
                                ...rubric,
                                referenceAnswer: e.target.value,
                                criteria: rubric.criteria ?? [],
                              },
                            })
                          }
                        />
                      </div>
                    )}

                    {/* Câu Coding: Tóm tắt bài toán & Test cases */}
                    {code && (
                      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                            {code.title}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            {t("recruiter.assessments.aiStudio.codingTestsSummary", { sample: code.sample, hidden: code.hidden })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {t("recruiter.assessments.aiStudio.supportedLanguagesPrefix")}<strong className="text-slate-900 dark:text-white">{code.langs}</strong>
                        </p>
                      </div>
                    )}

                    {/* Lời giải thích chi tiết */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {t("recruiter.assessments.aiStudio.explanationHeading")}
                      </label>
                      <textarea
                        rows={2}
                        disabled={busy}
                        className={cn(
                          assessmentInput,
                          "text-xs leading-relaxed bg-slate-50/50 focus:bg-white resize-y",
                        )}
                        value={q.explanation ?? ""}
                        placeholder={t("recruiter.assessments.aiStudio.explanationPlaceholder")}
                        onChange={(e) => patchDraft(item.id, { explanation: e.target.value })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action Footer */}
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 shadow-md">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                {selectedCount > 0 ? (
                  <span>
                    {t("recruiter.assessments.aiStudio.readyToSavePrefix")}<strong className="text-[var(--color-primary)]">{selectedCount}</strong>{t("recruiter.assessments.aiStudio.readyToSaveSuffix")}
                  </span>
                ) : drafts.length > 0 ? (
                  <span className="text-amber-600">{t("recruiter.assessments.aiStudio.pickOneToSaveWarning")}</span>
                ) : (
                  <span>{t("recruiter.assessments.aiStudio.pickParamsPrompt")}</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <Button variant="ghost" disabled={busy} onClick={onClose} size="sm">
                  {t("recruiter.assessments.common.actions.close")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy || selectedCount === 0}
                  onClick={() => save.mutate()}
                  size="sm"
                  className="gap-2 font-bold px-4 shadow-sm"
                >
                  {save.isPending ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>{t("recruiter.assessments.common.actions.saving")}</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      <span>
                        {selectedCount > 0
                          ? t("recruiter.assessments.aiStudio.saveCountIntoBankBtn", { count: selectedCount })
                          : t("recruiter.assessments.aiStudio.saveIntoBankBtn")}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
