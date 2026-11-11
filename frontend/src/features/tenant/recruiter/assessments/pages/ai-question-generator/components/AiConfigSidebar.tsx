import { Plus, RotateCcw, Sliders, Sparkles, StopCircle } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { assessmentInput } from "@/components/ux/assessmentUi";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { JobDetail } from "@/api/types/job";
import {
  getDifficulties,
  getQuestionTypes,
  getQuickPrompts,
  type CodingLanguage,
  type QuestionKind,
} from "../types";

interface AiConfigSidebarProps {
  job: JobDetail | null | undefined;
  skills: string[];
  skill: string;
  setSkill: (s: string) => void;
  difficulty: "Easy" | "Medium" | "Hard";
  setDifficulty: (d: "Easy" | "Medium" | "Hard") => void;
  questionType: QuestionKind;
  setQuestionType: (qt: QuestionKind) => void;
  count: number;
  setCount: (c: number | ((prev: number) => number)) => void;
  topic: string;
  setTopic: (t: string | ((prev: string) => string)) => void;
  language: "vi" | "en";
  setLanguage: (l: "vi" | "en") => void;
  codingLanguage: CodingLanguage;
  setCodingLanguage: (cl: CodingLanguage) => void;
  includeJd: boolean;
  setIncludeJd: (val: boolean) => void;
  draftsCount: number;
  batchCount: number;
  generationMode: "APPEND" | "REPLACE";
  setGenerationMode: (m: "APPEND" | "REPLACE") => void;
  busy: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onCancel?: () => void;
}

export function AiConfigSidebar({
  job,
  skills,
  skill,
  setSkill,
  difficulty,
  setDifficulty,
  questionType,
  setQuestionType,
  count,
  setCount,
  topic,
  setTopic,
  language,
  setLanguage,
  codingLanguage,
  setCodingLanguage,
  includeJd,
  setIncludeJd,
  draftsCount,
  batchCount,
  generationMode,
  setGenerationMode,
  busy,
  isGenerating,
  onGenerate,
  onCancel,
}: AiConfigSidebarProps) {
  const t = useT();
  const questionTypes = getQuestionTypes(t);
  const difficulties = getDifficulties(t);
  const quickPrompts = getQuickPrompts(t);
  const coding = questionType === "CODING";
  const maxCount = coding ? 5 : 10;

  return (
    <aside className="sticky top-4 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
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
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] ring-2 ring-[var(--color-primary)]/20"
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

        {job && (
          <label className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={includeJd}
              disabled={busy}
              onChange={(e) => setIncludeJd(e.target.checked)}
              className="size-3.5 rounded border-slate-300 accent-[var(--color-primary)]"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {t("recruiter.assessments.aiStudio.includeJdLabel")}
            </span>
          </label>
        )}
      </div>

      {/* 5. Chế độ sinh (Khi đã có câu hỏi nháp) */}
      {draftsCount > 0 && (
        <div className="space-y-2 rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-subtle)] p-3.5">
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
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-2xs"
                  : "border-[var(--color-primary)]/25 bg-white text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-soft)]",
              )}
            >
              <Plus className="size-3.5" />
              <span>{t("recruiter.assessments.aiStudio.appendPrependBtn", { batch: batchCount + 1 })}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setGenerationMode("REPLACE")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all border",
                generationMode === "REPLACE"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-2xs"
                  : "border-[var(--color-primary)]/25 bg-white text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-soft)]",
              )}
            >
              <RotateCcw className="size-3.5" />
              <span>{t("recruiter.assessments.aiStudio.replaceBtn")}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            {generationMode === "APPEND"
              ? t("recruiter.assessments.aiStudio.appendPrependHint")
              : t("recruiter.assessments.aiStudio.replaceHint")}
          </p>
        </div>
      )}

      {/* Primary Action Button or Cancel Action */}
      {isGenerating ? (
        <button
          type="button"
          onClick={onCancel}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 active:scale-[0.98] transition-all"
        >
          <StopCircle className="size-4 animate-pulse" />
          <span>{t("recruiter.assessments.aiStudio.cancelGenerateBtn")}</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="primary"
          disabled={busy}
          onClick={onGenerate}
          className="w-full py-2.5 font-bold shadow-md gap-2"
        >
          <Sparkles className="size-4" />
          <span>
            {draftsCount === 0
              ? t("recruiter.assessments.aiStudio.generateFirstBtn", { count })
              : generationMode === "APPEND"
                ? t("recruiter.assessments.aiStudio.generateMoreBtn", { batch: batchCount + 1, count })
                : t("recruiter.assessments.aiStudio.generateReplaceBtn", { count })}
          </span>
        </Button>
      )}
    </aside>
  );
}
