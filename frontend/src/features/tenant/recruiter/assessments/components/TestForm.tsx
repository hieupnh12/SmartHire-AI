import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import type { JobTest, TestRequest } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput as input, FieldError } from "@/components/ux/assessmentUi";
import { useT, type TranslateFn } from "@/i18n";

function createTestFormSchema(t: TranslateFn) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, t("recruiter.assessments.detail.testForm.titleRequired"))
      .max(255, t("recruiter.assessments.detail.testForm.max255")),
    jobId: z.number().int().positive(t("recruiter.assessments.detail.testForm.invalidJob")),
    description: z.string().max(10000, t("recruiter.assessments.detail.testForm.max10000")),
    durationMinutes: z
      .number()
      .int(t("recruiter.assessments.detail.testForm.integerMinutes"))
      .min(1, t("recruiter.assessments.detail.testForm.min1Minute"))
      .max(2147483647),
    objectiveDurationMinutes: z
      .string()
      .refine((v) => v === "" || /^\d+$/.test(v), t("recruiter.assessments.detail.testForm.positiveIntMinutes")),
    passingScore: z
      .string()
      .refine(
        (v) => v === "" || /^\d{1,8}(\.\d{1,2})?$/.test(v),
        t("recruiter.assessments.detail.testForm.nonNegativeScore2Decimals"),
      ),
    codingTestWeightPercent: z
      .number()
      .int()
      .min(0, t("recruiter.assessments.detail.testForm.min0"))
      .max(100, t("recruiter.assessments.detail.testForm.max100")),
  });
}
type Form = z.infer<ReturnType<typeof createTestFormSchema>>;

export function TestForm({ test, jobs, lockedJobId, busy, onSave, onDirty }: {
  test?: JobTest; jobs: { id: number; title: string }[]; lockedJobId: number; busy: boolean;
  onSave: (request: TestRequest) => Promise<void>; onDirty: (dirty: boolean) => void;
}) {
  const t = useT();
  const schema = useMemo(() => createTestFormSchema(t), [t]);
  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { title: test?.title ?? "", jobId: lockedJobId,
      description: test?.description ?? "", durationMinutes: test?.durationMinutes ?? 30,
      objectiveDurationMinutes: String(test?.objectiveDurationMinutes ?? ""),
      passingScore: test?.passingScore == null ? "" : String(test.passingScore),
      codingTestWeightPercent: test?.codingTestWeightPercent ?? 90 },
  });
  const codingWeight = watch("codingTestWeightPercent");
  useEffect(() => { onDirty(isDirty); }, [isDirty, onDirty]);
  return <form className="space-y-4" onSubmit={handleSubmit(async values => {
    try {
      await onSave({ ...values, objectiveDurationMinutes: values.objectiveDurationMinutes ? Number(values.objectiveDurationMinutes) : null, description: values.description || null, passingScore: values.passingScore === "" ? null : Number(values.passingScore), codingTestWeightPercent: values.codingTestWeightPercent });
      reset(values);
    } catch { /* Keep input values; the page displays the mutation error. */ }
  })} noValidate>
    <fieldset disabled={busy} className="space-y-4">
      <label className="block space-y-1 text-sm">{t("recruiter.assessments.detail.testForm.titleLabel")} <input className={input} {...register("title")} aria-invalid={!!errors.title} /><FieldError message={errors.title?.message} /></label>
      <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 py-2 text-sm"><span className="text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.detail.testForm.jobPrefix")}</span><strong>{jobs.find((job) => job.id === lockedJobId)?.title ?? t("recruiter.assessments.detail.testForm.jobFallback", { jobId: lockedJobId })}</strong><input type="hidden" {...register("jobId", { valueAsNumber: true })} /></div>
      <label className="block space-y-1 text-sm">{t("recruiter.assessments.detail.testForm.descriptionLabel")} <textarea className={input} rows={3} {...register("description")} /><FieldError message={errors.description?.message} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">{t("recruiter.assessments.detail.testForm.durationLabel")}<input type="number" min={1} step={1} className={input} {...register("durationMinutes", { valueAsNumber: true })} /><FieldError message={errors.durationMinutes?.message} /></label>
        <label className="block space-y-1 text-sm">{t("recruiter.assessments.detail.testForm.passingScoreLabel")}<input type="number" min={0} step="0.01" className={input} {...register("passingScore")} /><FieldError message={errors.passingScore?.message} /></label>
      </div>
      <label className="block space-y-1 text-sm">{t("recruiter.assessments.detail.testForm.objectiveDurationLabel")}<input type="number" min={1} className={input} {...register("objectiveDurationMinutes")} /><FieldError message={errors.objectiveDurationMinutes?.message} /></label>
      <label className="block space-y-1 text-sm">{t("recruiter.assessments.detail.testForm.codingWeightLabel")}
        <input type="number" min={0} max={100} step={1} className={input} {...register("codingTestWeightPercent", { valueAsNumber: true })} />
        <FieldError message={errors.codingTestWeightPercent?.message} />
        <span className="mt-1 block text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.detail.testForm.codingWeightHint", { aiPercent: 100 - (Number.isFinite(codingWeight) ? codingWeight : 90) })}</span>
      </label>
      <Button type="submit" disabled={busy || (!!test && !isDirty)}><Save className="size-4" aria-hidden="true" />{busy ? t("recruiter.assessments.common.actions.saving") : test ? t("recruiter.assessments.common.actions.saveChanges") : t("recruiter.assessments.detail.testForm.createDraftBtn")}</Button>
    </fieldset>
  </form>;
}
