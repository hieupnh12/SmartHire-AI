import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Clock3, Eye, LockKeyhole, Monitor, Pencil, Save, ShieldCheck, X } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { toQuestionRequest } from "../utils/assessmentQuestionRequest";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import {
  getQuestionKindLabel,
  hasAnswerValue,
  QuestionAnswerPanel,
  type AssessmentQuestionKind,
} from "@/components/ux/QuestionAnswerPanel";
import { useT } from "@/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { typeMeta, isSubjectiveKind } from "../constants/excelTemplateMock";
import type { ImportRow } from "../utils/excelImportValidation";
import { isPersistableQuestion } from "../utils/excelImportValidation";
import { clearExcelQuestionDraft } from "../utils/excelQuestionDraft";
import type { BankSaveActions } from "../utils/bankQuestionAuthoring";

const card = "rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]";
const muted = "text-[var(--color-on-surface-variant)]";
const field = "mt-1 h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70";

export function AssessmentPublishReview({
  active,
  rows,
  jobId,
  jobTitle,
  defaultScore,
  onBack,
  onEdit,
  generalBank,
}: {
  active: boolean;
  rows: ImportRow[];
  jobId: number;
  jobTitle: string;
  defaultScore: number;
  onBack: () => void;
  onEdit: (index: number) => void;
  generalBank?: BankSaveActions;
}) {
  const t = useT();
  const navigate = useNavigate();
  const client = useQueryClient();
  const listPath = `/recruiter/jobs/${jobId}/assessments`;
  const [view, setView] = useState<"audit" | "candidate">("audit");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showPublish, setShowPublish] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (active) heading.current?.focus();
  }, [active]);
  useEffect(() => {
    if (showPublish) dialog.current?.showModal();
    else dialog.current?.close();
  }, [showPublish]);

  const saveableRows = rows.filter(
    (item) => !item.skipped && item.status !== "INVALID" && isPersistableQuestion(item.row),
  );
  const reviewedCount = rows.filter((item) => !item.skipped).length;
  const total = saveableRows.reduce((sum, item) => sum + (item.row.score.trim() ? Number(item.row.score) : defaultScore), 0);
  const schema = z.object({
    title: z.string().trim().min(1).max(255),
    duration: z.string().regex(/^\d+$/).refine((value) => Number(value) > 0 && Number(value) <= 2147483647),
    passingScore: z.string().refine((value) => value === "" || (/^\d{1,8}(\.\d{1,2})?$/.test(value) && Number(value) <= total)),
  });
  const { register, watch } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { title: t("recruiter.assessments.publishReview.defaultTitle", { jobTitle }), duration: "30", passingScore: "" },
  });
  const [title, duration, passingScore] = watch(["title", "duration", "passingScore"]);
  const validTitle = schema.shape.title.safeParse(title).success;
  const validDuration = schema.shape.duration.safeParse(duration).success;
  const validPassing = schema.shape.passingScore.safeParse(passingScore).success;

  const kindSummary = [
    [t("recruiter.assessments.publishReview.kindSummary.single"), saveableRows.filter((item) => item.row.kind === "TRAC_NGHIEM_DON").length],
    [t("recruiter.assessments.publishReview.kindSummary.multi"), saveableRows.filter((item) => item.row.kind === "NHIEU_DAP_AN").length],
    [t("recruiter.assessments.publishReview.kindSummary.subjective"), saveableRows.filter((item) => isSubjectiveKind(item.row.kind)).length],
  ]
    .filter(([, count]) => Number(count) > 0)
    .map(([label, count]) => `${count} ${label}`)
    .join(" · ");

  const checks = generalBank ? [
    { title: t("recruiter.assessments.publishReview.checks.generalQuestionCountTitle"), value: saveableRows.length > 0 && saveableRows.length <= 999, detail: t("recruiter.assessments.publishReview.checks.generalQuestionCountDetail", { count: saveableRows.length }) },
    { title: t("recruiter.assessments.publishReview.checks.generalContentTitle"), value: saveableRows.length > 0 && saveableRows.every(item => item.status !== "INVALID" && isPersistableQuestion(item.row)), detail: t("recruiter.assessments.publishReview.checks.generalContentDetail") },
    { title: t("recruiter.assessments.publishReview.checks.generalSkillDifficultyTitle"), value: saveableRows.every(item => !!item.row.skill.trim() && item.row.skill.trim().length <= 128 && /^(easy|medium|hard)$/i.test(item.row.difficulty.trim())), detail: t("recruiter.assessments.publishReview.checks.generalSkillDifficultyDetail") },
    { title: t("recruiter.assessments.publishReview.checks.generalScoreTitle"), value: saveableRows.every(item => { const value = Number(item.row.score.trim() || defaultScore); return Number.isInteger(value) && value >= 1 && value <= 10000; }), detail: t("recruiter.assessments.publishReview.checks.generalScoreDetail") },
  ] : [
    { title: t("recruiter.assessments.publishReview.checks.infoTitle"), value: validTitle && validDuration, detail: t("recruiter.assessments.publishReview.checks.infoDetail") },
    {
      title: t("recruiter.assessments.publishReview.checks.countTitle"),
      value: saveableRows.length > 0 && saveableRows.length <= 100,
      detail:
        saveableRows.length === 0
          ? t("recruiter.assessments.publishReview.checks.countEmptyDetail", { reviewed: reviewedCount })
          : t("recruiter.assessments.publishReview.checks.countDetail", {
              saveable: saveableRows.length,
              summary: kindSummary || t("recruiter.assessments.publishReview.kindSummary.mixed"),
              reviewed: reviewedCount,
            }),
    },
    {
      title: t("recruiter.assessments.publishReview.checks.contentTitle"),
      value: saveableRows.length > 0 && saveableRows.every((item) => isPersistableQuestion(item.row)),
      detail: t("recruiter.assessments.publishReview.checks.contentDetail"),
    },
    {
      title: t("recruiter.assessments.publishReview.checks.scoringTitle"),
      value:
        total > 0 &&
        saveableRows.length > 0 &&
        saveableRows.every((item) => {
          const points = Number(item.row.score.trim() || defaultScore);
          return Number.isFinite(points) && points > 0 && points <= 10000;
        }),
      detail:
        total > 0
          ? t("recruiter.assessments.publishReview.checks.scoringValidDetail", { total, count: saveableRows.length })
          : t("recruiter.assessments.publishReview.checks.scoringInvalidDetail"),
    },
    { title: t("recruiter.assessments.publishReview.checks.passingTitle"), value: validPassing, detail: passingScore === "" ? t("recruiter.assessments.publishReview.checks.passingNoneDetail") : t("recruiter.assessments.publishReview.checks.passingRangeDetail", { total }) },
  ];
  const passed = checks.filter((check) => check.value).length;
  const canSave = passed === checks.length;
  const selected = rows[Math.min(current, Math.max(rows.length - 1, 0))];
  const difficulties = [
    { label: t("recruiter.assessments.common.difficulty.easy"), count: rows.filter((item) => item.row.difficulty.trim() && item.row.difficultyTone === "easy").length },
    { label: t("recruiter.assessments.common.difficulty.medium"), count: rows.filter((item) => item.row.difficulty.trim() && item.row.difficultyTone === "medium").length },
    { label: t("recruiter.assessments.common.difficulty.hard"), count: rows.filter((item) => item.row.difficulty.trim() && item.row.difficultyTone === "hard").length },
    { label: t("recruiter.assessments.common.difficulty.unclassified"), count: rows.filter((item) => !item.row.difficulty.trim()).length },
  ];

  const persist = useMutation({
    mutationFn: async () => {
      if (generalBank) {
        if (!canSave) throw new Error(t("recruiter.assessments.publishReview.persistErrors.generalChecksIncomplete"));
        await generalBank.onSave(saveableRows.map(item => ({ ...item.row, score: item.row.score.trim() || String(defaultScore) })));
        return null;
      }
      const toSave = saveableRows;
      if (toSave.length === 0) {
        throw new Error(t("recruiter.assessments.publishReview.persistErrors.noSaveableQuestions"));
      }
      if (toSave.length > 100) {
        throw new Error(t("recruiter.assessments.publishReview.persistErrors.max100Questions"));
      }
      const pointsTotal = toSave.reduce(
        (sum, item) => sum + (item.row.score.trim() ? Number(item.row.score) : defaultScore),
        0,
      );
      if (pointsTotal <= 0) {
        throw new Error(t("recruiter.assessments.publishReview.persistErrors.totalPointsMustBePositive", { total: pointsTotal }));
      }
      // Always create DRAFT — publish is done later from assessment detail.
      const test = await assessmentApi.create({
        jobId,
        title: title.trim(),
        description: null,
        durationMinutes: Number(duration),
        passingScore: passingScore === "" ? null : Number(passingScore),
      });
      for (let index = 0; index < toSave.length; index += 1) {
        await assessmentApi.createQuestion(test.id, toQuestionRequest(toSave[index], index, defaultScore, t));
      }
      return test;
    },
    onSuccess: async (test) => {
      if (!test) return;
      clearExcelQuestionDraft(jobId);
      await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      navigate(`${listPath}/${test.id}`, { replace: true });
    },
  });

  const busy = persist.isPending || !!generalBank?.busy;
  const saved = persist.isSuccess;
  const openSaveDialog = () => generalBank ? persist.mutate() : setShowPublish(true);

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={cn(muted, "text-xs")}>{generalBank ? t("recruiter.assessments.publishReview.breadcrumbGeneral") : t("recruiter.assessments.publishReview.breadcrumbAssessment", { jobTitle })}</p>
          <h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-semibold tracking-tight outline-none">
            {generalBank ? t("recruiter.assessments.publishReview.headingGeneral") : t("recruiter.assessments.publishReview.headingAssessment")}
          </h1>
          <p className="mt-2 text-xs text-[var(--color-primary)]">
            {generalBank ? t("recruiter.assessments.publishReview.subtitleGeneral") : t("recruiter.assessments.publishReview.subtitleAssessment")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onBack} disabled={busy || saved}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("recruiter.assessments.publishReview.backToCheckBtn")}
          </Button>
          <Button
            disabled={!canSave || busy || saved || !validTitle || !validDuration || !validPassing || saveableRows.length === 0}
            onClick={openSaveDialog}
          >
            <Save className="size-4" aria-hidden="true" />
            {busy ? t("recruiter.assessments.common.actions.saving") : generalBank ? t("recruiter.assessments.publishReview.saveToBankBtn") : t("recruiter.assessments.publishReview.saveDraftBtn")}
          </Button>
        </div>
      </header>

      <AssessmentError error={persist.error ?? generalBank?.error} />

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("recruiter.assessments.publishReview.stepsAria")}>
        {(generalBank
          ? [
              t("recruiter.assessments.publishReview.generalSteps.s1"),
              t("recruiter.assessments.publishReview.generalSteps.s2"),
              t("recruiter.assessments.publishReview.generalSteps.s3"),
              t("recruiter.assessments.publishReview.generalSteps.s4"),
            ]
          : [
              t("recruiter.assessments.publishReview.assessmentSteps.s1"),
              t("recruiter.assessments.publishReview.assessmentSteps.s2"),
              t("recruiter.assessments.publishReview.assessmentSteps.s3"),
              t("recruiter.assessments.publishReview.assessmentSteps.s4"),
            ]
        ).map((label, i) => (
          <li
            key={label}
            aria-current={i === (showPublish || saved ? 3 : 2) ? "step" : undefined}
            className={cn(card, "flex items-center gap-3 p-4", i === (showPublish || saved ? 3 : 2) && "ring-2 ring-[var(--color-primary)]")}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-subtle)] text-sm font-semibold text-[var(--color-primary)]">
              {i < 2 || saved ? <Check className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span>
              <span className={cn(muted, "block text-[10px] uppercase")}>{t("recruiter.assessments.common.stepLabel", { step: i + 1 })}</span>
              <span className="text-sm font-semibold">{label}</span>
            </span>
          </li>
        ))}
      </ol>

      {!generalBank && <fieldset disabled={busy || saved} className={cn(card, "grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5")}>
        <legend className="sr-only">{t("recruiter.assessments.publishReview.infoLegend")}</legend>
        <label className="text-xs font-medium sm:col-span-2 xl:col-span-2">
          {t("recruiter.assessments.publishReview.titleFieldLabel")}
          <input {...register("title")} aria-invalid={!validTitle} maxLength={255} className={field} />
          {!validTitle && <span className="mt-1 block text-[var(--color-error)]">{t("recruiter.assessments.publishReview.titleFieldError")}</span>}
        </label>
        <label className="text-xs font-medium">
          {t("recruiter.assessments.publishReview.durationFieldLabel")}
          <input type="number" min={1} step={1} {...register("duration")} aria-invalid={!validDuration} className={field} />
          {!validDuration && <span className="mt-1 block text-[var(--color-error)]">{t("recruiter.assessments.publishReview.durationFieldError")}</span>}
        </label>
        <label className="text-xs font-medium">
          {t("recruiter.assessments.publishReview.passingFieldLabel")}
          <input type="number" min={0} max={total} step="0.01" placeholder={t("recruiter.assessments.publishReview.passingFieldPlaceholder")} {...register("passingScore")} aria-invalid={!validPassing} className={field} />
          {!validPassing && <span className="mt-1 block text-[var(--color-error)]">{t("recruiter.assessments.publishReview.passingFieldError", { total })}</span>}
        </label>
        <div>
          <p className={cn(muted, "text-xs")}>{t("recruiter.assessments.publishReview.structureLabel")}</p>
          <p className="mt-2 text-lg font-semibold">
            {t("recruiter.assessments.publishReview.structureSummary", { count: rows.length, points: total })}
          </p>
          <p className={cn(muted, "mt-1 text-xs")}>{jobTitle}</p>
        </div>
      </fieldset>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.65fr)]">
        <aside className="space-y-5">
          <section className={cn(card, "p-5")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{generalBank ? t("recruiter.assessments.publishReview.auditHeadingGeneral") : t("recruiter.assessments.publishReview.auditHeadingAssessment")}</h2>
              <span className={cn("rounded-full px-2 py-1 text-xs font-medium", canSave ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]" : "bg-[var(--color-error-container)] text-[var(--color-error)]")}>
                {t("recruiter.assessments.publishReview.auditPassedCount", { passed, total: checks.length })}
              </span>
            </div>
            <div className="mt-4 divide-y divide-[var(--color-border-default)]">
              {checks.map((check) => (
                <div key={check.title} className="flex gap-3 py-3">
                  <ShieldCheck className={cn("mt-0.5 size-5 shrink-0", check.value ? "text-[var(--color-primary)]" : "text-[var(--color-error)]")} aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold">
                      {check.title}
                      <span className={cn("ml-2 text-xs font-normal", check.value ? muted : "text-[var(--color-error)]")}>{check.value ? t("recruiter.assessments.publishReview.checkPassLabel") : t("recruiter.assessments.publishReview.checkFixLabel")}</span>
                    </h3>
                    <p className={cn(muted, "mt-1 text-xs leading-5")}>{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className={cn(card, "p-5")}>
            <h2 className="font-semibold">{t("recruiter.assessments.publishReview.difficultyDistributionHeading")}</h2>
            <p className={cn(muted, "mt-1 text-xs")}>{t("recruiter.assessments.publishReview.difficultyDistributionHint")}</p>
            <div className="mt-4 space-y-3">
              {difficulties.map((group) => (
                <div key={group.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{group.label}</span>
                    <span>
                      {group.count} ({rows.length ? Math.round((group.count / rows.length) * 100) : 0}%)
                    </span>
                  </div>
                  <progress className="h-2 w-full overflow-hidden rounded-full accent-[var(--color-primary)]" value={group.count} max={Math.max(rows.length, 1)} aria-label={group.label} />
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-3 rounded-2xl bg-[var(--color-primary-subtle)] p-5">
            <LockKeyhole className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
            <h2 className="font-semibold">{t("recruiter.assessments.publishReview.saveDraftBtn")}</h2>
            <p className={cn(muted, "text-sm leading-6")}>
              {t("recruiter.assessments.publishReview.draftCardDescPrefix")}
              <code className="font-mono text-xs">create_draft_test</code>
              {t("recruiter.assessments.publishReview.draftCardDescMid")}
              <code className="font-mono text-xs">create_question</code>
              {t("recruiter.assessments.publishReview.draftCardDescSuffix")}
            </p>
            <Button className="w-full" disabled={!canSave || busy || saved} onClick={openSaveDialog}>
              <Save className="size-4" aria-hidden="true" />
              {t("recruiter.assessments.publishReview.confirmSaveDraftBtn")}
            </Button>
            <Button variant="ghost" className="w-full" disabled={busy || saved} onClick={onBack}>
              <Pencil className="size-4" aria-hidden="true" />
              {t("recruiter.assessments.publishReview.editImportBtn")}
            </Button>
          </section>
        </aside>

        <section className={cn(card, "min-w-0 overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] p-4">
            <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--color-surface-container-low)] p-1">
              {(
                [
                  { id: "audit", label: t("recruiter.assessments.publishReview.tabExaminer"), icon: ShieldCheck },
                  { id: "candidate", label: t("recruiter.assessments.publishReview.tabCandidate"), icon: Monitor },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={view === tab.id}
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]",
                    view === tab.id ? "bg-[var(--color-surface-card)] font-semibold text-[var(--color-primary)] shadow-sm" : muted,
                  )}
                >
                  <tab.icon className="size-4" aria-hidden="true" />
                  {tab.label}
                </button>
              ))}
            </div>
            <span className={cn(muted, "flex items-center gap-1 text-xs")}>
              <Clock3 className="size-4" aria-hidden="true" />
              {generalBank
                ? t("recruiter.assessments.publishReview.previewLabelGeneral")
                : t("recruiter.assessments.publishReview.previewLabelAssessment", {
                    duration: validDuration ? duration : t("recruiter.assessments.common.dash"),
                  })}
            </span>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            <p className="flex items-start gap-2 rounded-xl bg-[var(--color-surface-container-low)] p-3 text-xs leading-5">
              <Eye className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              {view === "audit"
                ? t("recruiter.assessments.publishReview.auditModeBanner")
                : t("recruiter.assessments.publishReview.candidateModeBanner")}
            </p>
            <div>
              <div className="mb-3 flex justify-between gap-2">
                <h2 className="text-sm font-semibold">{t("recruiter.assessments.publishReview.questionListHeading")}</h2>
                <span className={cn(muted, "text-xs")}>
                  {t("recruiter.assessments.publishReview.questionRatio", { current: selected ? current + 1 : 0, total: rows.length })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {rows.map((item, index) => (
                  <button
                    key={item.line}
                    type="button"
                    aria-label={t("recruiter.assessments.publishReview.viewQuestionAria", { index: index + 1 })}
                    aria-current={index === current ? "true" : undefined}
                    onClick={() => setCurrent(index)}
                    className={cn(
                      "grid size-10 place-items-center rounded-lg text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]",
                      index === current
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                        : hasAnswerValue(answers[item.line])
                          ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                          : "bg-[var(--color-surface-container-low)]",
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
            {selected ? (
              <article className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{t("recruiter.assessments.common.questionNumber", { index: current + 1 })}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--color-surface-container)] px-2 py-1 text-[11px] font-medium text-[var(--color-on-surface)]">
                      {getQuestionKindLabel(selected.row.kind as AssessmentQuestionKind, t) ?? typeMeta(selected.row.kind, t).label}
                    </span>
                    <span className="rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                      {selected.row.score.trim() || defaultScore} {t("recruiter.assessments.common.pointsUnit")}
                    </span>
                  </div>
                </div>
                <p className={cn(muted, "text-xs")}>
                  {selected.row.skill || t("recruiter.assessments.publishReview.unclassifiedSkill")} · {selected.row.difficulty || t("recruiter.assessments.publishReview.unclassifiedDifficulty")}
                </p>
                <p className="whitespace-pre-wrap break-words text-base font-medium leading-7">{selected.row.content}</p>
                <QuestionAnswerPanel
                  kind={selected.row.kind as AssessmentQuestionKind}
                  questionKey={selected.line}
                  mode={view}
                  value={answers[selected.line] ?? null}
                  onChange={(next) => setAnswers((previous) => ({ ...previous, [selected.line]: next }))}
                  correctAnswer={selected.row.answer}
                  sampleAnswer={selected.row.sample || selected.row.answer}
                  codeSnippet={selected.row.snippet}
                  language={selected.row.language}
                  options={[selected.row.optionA, selected.row.optionB, selected.row.optionC, selected.row.optionD]
                    .map((body, index) => ({
                      id: String.fromCharCode(65 + index),
                      label: String.fromCharCode(65 + index),
                      body,
                    }))
                    .filter((option) => option.body.trim())}
                />
                {view === "audit" && (
                  <div className="rounded-xl bg-[var(--color-surface-container-low)] p-4">
                    <h4 className="text-sm font-semibold">{t("recruiter.assessments.publishReview.examinerExplanationHeading")}</h4>
                    <p className={cn(muted, "mt-2 whitespace-pre-wrap break-words text-sm leading-6")}>
                      {(selected.row.kind === "NHIEU_DAP_AN"
                        ? selected.row.policyNote.trim() || selected.row.explanation.trim()
                        : selected.row.explanation.trim()) || t("recruiter.assessments.publishReview.noExplanationProvided")}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-4">
                  <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    {t("recruiter.assessments.publishReview.prevQuestionBtn")}
                  </Button>
                  {view === "candidate" && (
                    <span className={cn(muted, "text-xs")}>
                      {hasAnswerValue(answers[selected.line]) ? t("recruiter.assessments.publishReview.answeredPreviewStatus") : t("recruiter.assessments.publishReview.unansweredPreviewStatus")}
                    </span>
                  )}
                  <Button variant="secondary" disabled={current >= rows.length - 1} onClick={() => setCurrent(current + 1)}>
                    {t("recruiter.assessments.publishReview.nextQuestionBtn")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <Button variant="ghost" disabled={busy || saved} onClick={() => onEdit(selected.line - 2)}>
                  <Pencil className="size-4" aria-hidden="true" />
                  {t("recruiter.assessments.publishReview.editInExcelBtn")}
                </Button>
              </article>
            ) : (
              <p className={muted}>{t("recruiter.assessments.publishReview.noQuestionsToPreview")}</p>
            )}
          </div>
        </section>
      </div>

      <dialog
        ref={dialog}
        onCancel={() => !busy && setShowPublish(false)}
        onClose={() => setShowPublish(false)}
        aria-labelledby="publish-review-title"
        aria-describedby="publish-review-description"
        className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-0 text-[var(--color-on-surface)] shadow-xl backdrop:bg-black/40"
      >
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Save className="size-6" aria-hidden="true" />
            </span>
            <Button autoFocus variant="ghost" size="sm" aria-label={t("recruiter.assessments.publishReview.dialogCloseAria")} disabled={busy} onClick={() => setShowPublish(false)}>
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-primary)]">{t("recruiter.assessments.publishReview.dialogStepBadge")}</p>
            <h2 id="publish-review-title" className="mt-2 text-xl font-semibold">
              {t("recruiter.assessments.publishReview.dialogTitle")}
            </h2>
            <p id="publish-review-description" className={cn(muted, "mt-2 text-sm leading-6")}>
              {t("recruiter.assessments.publishReview.dialogDescription", { title, count: rows.length })}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-primary-subtle)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
              <ShieldCheck className="size-5" aria-hidden="true" />
              {t("recruiter.assessments.publishReview.dialogChecksPassed", { passed, total: checks.length })}
            </p>
            <p className={cn(muted, "mt-2 text-xs")}>
              {t("recruiter.assessments.publishReview.dialogMetaSummary", { jobTitle, duration, total })}
            </p>
          </div>
          <AssessmentError error={persist.error} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => setShowPublish(false)}>
              {t("recruiter.assessments.publishReview.recheckBtn")}
            </Button>
            <Button disabled={!canSave || busy} onClick={() => persist.mutate()}>
              <Save className="size-4" aria-hidden="true" />
              {busy ? t("recruiter.assessments.common.actions.saving") : t("recruiter.assessments.publishReview.confirmSaveDraftBtn")}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
