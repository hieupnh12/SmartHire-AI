import { createRubricSchema, createCodingSchema, contentError as getContentError } from "../utils/questionContentValidation";
import { QuestionContentFields, getRubricExample, codingAuthoringValue } from "./QuestionContentFields";
import { useOptionalRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Save, Trash2, X } from "lucide-react";
import type { Question, QuestionRequest } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { assessmentInput as input, FieldError } from "@/components/ux/assessmentUi";
import { useT, type TranslateFn } from "@/i18n";

function createQuestionSchema(t: TranslateFn) {
  return z
    .object({
      questionType: z.enum(["MCQ", "MULTIPLE_CHOICE", "ESSAY", "CODING"]).optional(),
      questionText: z.string().trim().min(1, t("recruiter.assessments.detail.questionForm.questionTextRequired")).max(10000),
      points: z.number().int().min(1, t("recruiter.assessments.detail.questionForm.min1Point")).max(10000).optional(),
      questionOrder: z.number().int().min(0).max(2147483647),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).nullable(),
      skill: z.string().trim().max(255).nullable(),
      explanation: z.string().trim().max(10000).nullable(),
      options: z
        .array(
          z.object({
            optionText: z.string().trim().min(1, t("recruiter.assessments.detail.questionForm.optionRequired")).max(5000),
            correct: z.boolean(),
          }),
        )
        .max(10),
    })
    .superRefine((data, context) => {
      const type = data.questionType ?? "MCQ";
      if (type === "ESSAY" || type === "CODING") return;
      if (!data.points || data.points < 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["points"],
          message: t("recruiter.assessments.detail.questionForm.min1Point"),
        });
      }
      const correct = data.options.filter((o) => o.correct).length;
      if (data.options.length < 2 || (type === "MCQ" ? correct !== 1 : correct < 2)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message:
            type === "MCQ"
              ? t("recruiter.assessments.detail.questionForm.selectOneCorrect")
              : t("recruiter.assessments.detail.questionForm.selectTwoCorrect"),
        });
      }
    });
}

function blankDefaults(order: number): QuestionRequest {
  return {
    questionType: "MCQ",
    questionText: "",
    points: 1,
    questionOrder: order,
    difficulty: null,
    skill: null,
    explanation: null,
    options: [{ optionText: "", correct: true }, { optionText: "", correct: false }],
  };
}

export function QuestionForm({ question, order, busy, onSave, onCancel }: {
  question?: Question; order: number; busy: boolean; onSave: (data: QuestionRequest) => void; onCancel: () => void;
}) {
  const t = useT();
  const schema = useMemo(() => createQuestionSchema(t), [t]);
  const rubricSchema = useMemo(() => createRubricSchema(t), [t]);
  const codingSchema = useMemo(() => createCodingSchema(t), [t]);
  const defaultRubricJson = useMemo(() => getRubricExample(t), [t]);
  const job = useOptionalRecruitmentJob();
  const [content, setContent] = useState(
    question?.questionType === "CODING"
      ? JSON.stringify(question.coding, null, 2)
      : question?.rubricJson
        ? JSON.stringify(question.rubricJson, null, 2)
        : defaultRubricJson
  );
  const [contentError, setContentError] = useState<string>();
  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<QuestionRequest>({
    resolver: zodResolver(schema),
    defaultValues: question
      ? {
          ...question,
          questionType: question.questionType as QuestionRequest["questionType"],
          difficulty: question.difficulty ?? null,
          skill: question.skill ?? null,
          explanation: question.explanation ?? null,
        }
      : blankDefaults(order),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const options = watch("options");
  const type = watch("questionType") ?? "MCQ";
  return <form onSubmit={handleSubmit(data => {
    try {
      const subjective = type === "ESSAY" || type === "CODING";
      const parsed = subjective ? (type === "ESSAY" ? rubricSchema : codingSchema).parse(JSON.parse(content)) : null;
      onSave({ ...data, points: subjective ? (question?.points ?? 10) : (data.points ?? 1), questionType: type, options: subjective ? [] : data.options, rubricJson: type === "ESSAY" ? rubricSchema.parse(parsed) : null, coding: type === "CODING" ? codingSchema.parse(parsed) : null,
        skill: data.skill?.trim() || null, explanation: data.explanation?.trim() || null });
      setContentError(undefined);
    } catch (error) { setContentError(getContentError(error, t)); }
  })} noValidate className="border-y border-[var(--color-outline-variant)] py-5">
    <fieldset disabled={busy} className="space-y-4">
      <h3 className="text-lg font-semibold">{question ? t("recruiter.assessments.detail.questionForm.editTitle") : t("recruiter.assessments.detail.questionForm.addTitle")}</h3>
      <label className="block text-sm">{t("recruiter.assessments.detail.questionForm.typeLabel")}<select className={input} {...register("questionType")} onChange={event => {
        const next = event.target.value as QuestionRequest["questionType"]; setValue("questionType", next);
        if (next === "ESSAY" || next === "CODING") {
          setValue("options", []);
          setContent(
            next === "ESSAY"
              ? defaultRubricJson
              : codingAuthoringValue(undefined, watch("skill") ?? undefined, "", job?.skills)
          );
        }
        else if (options.length === 0) setValue("options", [{ optionText: "", correct: true }, { optionText: "", correct: false }]);
      }}><option value="MCQ">{t("recruiter.assessments.common.questionTypes.singleChoice")}</option><option value="MULTIPLE_CHOICE">{t("recruiter.assessments.common.questionTypes.multipleChoice")}</option><option value="ESSAY">{t("recruiter.assessments.common.questionTypes.essayTheory")}</option><option value="CODING">{t("recruiter.assessments.common.questionTypes.coding")}</option></select></label>
      {(type === "ESSAY" || type === "CODING") && (
        <QuestionContentFields type={type} value={content} onChange={setContent} jobSkills={job?.skills} questionId={question?.id} />
      )}
      <FieldError message={contentError} />
      <label className="block space-y-1 text-sm">{t("recruiter.assessments.detail.questionForm.contentLabel")}<textarea autoFocus rows={3} className={input} {...register("questionText")} /><FieldError message={errors.questionText?.message} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        {type !== "ESSAY" && type !== "CODING" ? (
          <label className="block text-sm">
            {t("recruiter.assessments.detail.questionForm.pointsLabel")}
            <input className={input} type="number" min={1} max={10000} {...register("points", { valueAsNumber: true })} />
            <FieldError message={errors.points?.message} />
          </label>
        ) : (
          <div className="flex items-center rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-3 text-xs text-[var(--color-on-surface-variant)]">
            {t("recruiter.assessments.detail.questionForm.autoPointsHint")}
          </div>
        )}
        <label className="block text-sm">{t("recruiter.assessments.detail.questionForm.orderLabel")}<input className={input} type="number" min={0} {...register("questionOrder", { valueAsNumber: true })} /><FieldError message={errors.questionOrder?.message} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">{t("recruiter.assessments.detail.questionForm.difficultyLabel")}
          <select className={input} {...register("difficulty", { setValueAs: (v) => (v === "" || v == null ? null : v) })}>
            <option value="">{t("recruiter.assessments.common.noSelection")}</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <FieldError message={errors.difficulty?.message} />
        </label>
        <label className="block text-sm">{t("recruiter.assessments.detail.questionForm.skillLabel")}<input className={input} maxLength={255} {...register("skill")} /><FieldError message={errors.skill?.message} /></label>
      </div>
      <label className="block space-y-1 text-sm">{t("recruiter.assessments.detail.questionForm.explanationStaffLabel")}<textarea rows={2} className={input} {...register("explanation")} /><FieldError message={errors.explanation?.message} /></label>
      {(type === "MCQ" || type === "MULTIPLE_CHOICE") && <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">{t("recruiter.assessments.detail.questionForm.optionsLegend")}</legend>
        {fields.map((field, index) => <div key={field.id} className="flex items-start gap-2">
          <input type={type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"} className="mt-3 size-5 shrink-0 accent-[var(--color-primary)]" name="correct-option" aria-label={t("recruiter.assessments.detail.questionForm.optionCorrectAria", { index: index + 1 })} checked={options[index]?.correct ?? false}
            onChange={() => type === "MULTIPLE_CHOICE" ? setValue(`options.${index}.correct`, !options[index]?.correct, { shouldValidate: true }) : fields.forEach((_, i) => setValue(`options.${i}.correct`, i === index, { shouldValidate: true }))} />
          <div className="min-w-0 flex-1"><input className={input} aria-label={t("recruiter.assessments.detail.questionForm.optionTextAria", { index: index + 1 })} {...register(`options.${index}.optionText`)} /><FieldError message={errors.options?.[index]?.optionText?.message} /></div>
          <Tooltip content={t("recruiter.assessments.detail.questionForm.removeOptionTooltip")}><Button variant="ghost" disabled={fields.length <= 2 || busy} aria-label={t("recruiter.assessments.detail.questionForm.removeOptionAria", { index: index + 1 })} onClick={() => remove(index)}><Trash2 className="size-4" aria-hidden="true" /></Button></Tooltip>
        </div>)}
        <FieldError message={errors.options?.message ?? errors.options?.root?.message} />
        <Button variant="secondary" disabled={fields.length >= 10 || busy} onClick={() => append({ optionText: "", correct: false })}><Plus className="size-4" aria-hidden="true" />{t("recruiter.assessments.detail.questionForm.addOptionBtn")}</Button>
      </fieldset>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}><Save className="size-4" aria-hidden="true" />{busy ? t("recruiter.assessments.common.actions.saving") : t("recruiter.assessments.detail.questionForm.saveQuestionBtn")}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}><X className="size-4" aria-hidden="true" />{t("recruiter.assessments.common.actions.cancel")}</Button></div>
    </fieldset>
  </form>;
}
