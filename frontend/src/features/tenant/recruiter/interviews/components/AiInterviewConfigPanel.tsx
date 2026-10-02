import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { jobApi } from "@/api/tenant/jobApi";
import { COMPETENCY_LABELS, WEIGHT_PRESETS, type AiInterviewConfig, type CompetencyKey } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { AssessmentError, FieldError, assessmentInput, assessmentMuted } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { COMPETENCY_KEYS, configSchema, toFormValues, toRequest, type ConfigValues } from "../utils/aiInterviewConfigSchema";
import { InterviewConfigurationTabs } from "./InterviewConfigurationTabs";

const PRESET_LABELS = { default: "Mặc định", junior: "Mẫu Junior", senior: "Mẫu Senior" } as const;
const card = "space-y-4 rounded-xl border border-[var(--color-border-default)] p-4";
const chip = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-3 text-sm has-[:checked]:border-brand-primary has-[:checked]:bg-[var(--color-primary-soft)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

// Kept while the original roadmap editor remains available for a later migration of saved V1 configurations.
void ConfigForm;

export function AiInterviewConfigPanel({ jobId }: { jobId: number }) {
  const config = useQuery({ queryKey: ["ai-interview-config", jobId], queryFn: () => aiInterviewApi.config(jobId) });
  const skills = useQuery({ queryKey: ["job-skills", jobId], queryFn: () => jobApi.skills(jobId).then(r => r.data.map(s => s.name)) });
  return <section id="ai-interview-config" className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-6">
    <h2 className="text-lg font-semibold">Cấu hình AI Interview của Job</h2>
    <AssessmentError error={config.error ?? skills.error} retry={() => { void config.refetch(); void skills.refetch(); }} />
    {(config.isPending || skills.isPending) && <p role="status">Đang tải cấu hình…</p>}
    {config.data && skills.data && <InterviewConfigurationTabs key={jobId} jobId={jobId} config={config.data} jobSkills={skills.data} />}
  </section>;
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

function ConfigForm({ jobId, config, jobSkills }: { jobId: number; config: AiInterviewConfig; jobSkills: string[] }) {
  const client = useQueryClient();
  const { register, control, handleSubmit, reset, watch, setValue, getValues, formState: { errors, isDirty } } =
    useForm<ConfigValues>({ resolver: zodResolver(configSchema), defaultValues: toFormValues(config) });
  const stages = useFieldArray({ control, name: "policy.stages" });
  const save = useMutation({
    mutationFn: (values: ConfigValues) => aiInterviewApi.saveConfig(jobId, toRequest(values)),
    onSuccess: saved => {
      reset(toFormValues(saved));
      void client.invalidateQueries({ queryKey: ["ai-interview-config", jobId] });
      void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
    },
  });
  const suggest = useMutation({
    mutationFn: () => {
      const values = getValues();
      const draft = configSchema.innerType().safeParse({ ...values, policy: { ...values.policy, stages: [], miniAfterStage: 0 } });
      if (!draft.success) throw new Error("Sửa các trường đang lỗi trước khi đề xuất lộ trình.");
      return aiInterviewApi.suggestRoadmap(jobId, toRequest(draft.data));
    },
    onSuccess: proposed => {
      stages.replace(proposed.policy.stages);
      setValue("policy.miniAfterStage", proposed.policy.miniAfterStage, { shouldDirty: true });
    },
  });
  const weights = watch("policy.weights");
  const selectedSkills = watch("policy.selectedSkills");
  const miniEnabled = watch("policy.miniAssessmentEnabled");
  const miniWeight = Number(watch("policy.miniWeight")) || 0;
  const stageValues = watch("policy.stages");
  const totalWeight = COMPETENCY_KEYS.reduce((sum, key) => sum + (Number(weights[key]) || 0), 0);
  const plannedQuestions = stageValues.reduce((sum, stage) => sum + (Number(stage.questionCount) || 0), 0);
  const busy = save.isPending || suggest.isPending;

  return <form className="space-y-5" onSubmit={handleSubmit(values => save.mutate(values))}>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" {...register("enabled")} disabled={busy} />Cho phép AI Interview và tự tạo lời mời khi CV đạt</label>

    <fieldset className={card}>
      <legend className="px-1 font-semibold">Thiết lập phiên</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="Passing Score (/100)" error={errors.passingScore?.message} input={<input className={assessmentInput} type="number" min={0} max={100} step="0.01" {...register("passingScore")} />} />
        <NumberField label="Số câu hỏi phỏng vấn" error={errors.questionCount?.message} input={<input className={assessmentInput} type="number" min={1} max={30} {...register("questionCount")} />} />
        <NumberField label="Tổng thời gian (phút)" error={errors.policy?.durationMinutes?.message} input={<input className={assessmentInput} type="number" min={1} max={180} {...register("policy.durationMinutes")} />} />
        <NumberField label="Thời gian có thể bắt đầu" error={errors.availableFrom?.message} input={<input className={assessmentInput} type="datetime-local" {...register("availableFrom")} />} />
        <NumberField label="Hạn hoàn thành" error={errors.availableUntil?.message} input={<input className={assessmentInput} type="datetime-local" {...register("availableUntil")} />} />
        <NumberField label="Số lần được phép làm" error={errors.policy?.maxAttempts?.message} input={<input className={assessmentInput} type="number" min={1} max={5} {...register("policy.maxAttempts")} />} />
      </div>
      <p className={assessmentMuted}>Cấu hình và lộ trình được chốt khi tạo bộ câu hỏi; chỉnh sửa Job chỉ áp dụng cho phiên mới. Chỉ được làm lại khi chưa đạt, còn lượt và còn hạn.</p>
    </fieldset>

    <fieldset className={card}>
      <legend className="px-1 font-semibold">Nhóm năng lực và trọng số</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(WEIGHT_PRESETS) as (keyof typeof WEIGHT_PRESETS)[]).map(preset => <Button key={preset} variant="secondary" size="sm" disabled={busy}
          onClick={() => setValue("policy.weights", { ...WEIGHT_PRESETS[preset] }, { shouldDirty: true, shouldValidate: true })}>{PRESET_LABELS[preset]}</Button>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {COMPETENCY_KEYS.map(key => <NumberField key={key} label={`${COMPETENCY_LABELS[key]} (%)`} error={errors.policy?.weights?.[key]?.message}
          input={<input className={assessmentInput} type="number" min={0} max={100} {...register(`policy.weights.${key}`)} />} />)}
      </div>
      <p role="status" className={totalWeight === 100 ? assessmentMuted : "text-sm text-[var(--color-status-danger)]"}>Tổng trọng số: {totalWeight}%{totalWeight === 100 ? "" : " — phải bằng 100%"}</p>
      <FieldError message={errors.policy?.weights?.message} />
    </fieldset>

    <fieldset className={card}>
      <legend className="px-1 font-semibold">Job Skills cần đánh giá</legend>
      {jobSkills.length === 0 ? <p className={assessmentMuted}>Job chưa có kỹ năng. Thêm kỹ năng trong trang chỉnh sửa Job để đánh giá theo kỹ năng.</p> :
        <Controller control={control} name="policy.selectedSkills" render={({ field }) => <div className="flex flex-wrap gap-2">
          {jobSkills.map(skill => <label key={skill} className={chip}><input type="checkbox" checked={field.value.includes(skill)} disabled={busy}
            onChange={() => {
              field.onChange(toggle(field.value, skill));
              // Deselected skills cannot stay on any stage.
              getValues("policy.stages").forEach((stage, index) => stage.skills.includes(skill)
                && setValue(`policy.stages.${index}.skills`, stage.skills.filter(s => s !== skill), { shouldDirty: true }));
            }} />{skill}</label>)}
        </div>} />}
      <FieldError message={errors.policy?.selectedSkills?.message} />
    </fieldset>

    <fieldset className={card}>
      <legend className="px-1 font-semibold">Mini Assessment trong lộ trình</legend>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" {...register("policy.miniAssessmentEnabled")} disabled={busy} />Bật câu hỏi trắc nghiệm (4 lựa chọn, 1 đáp án đúng, hệ thống tự chấm)</label>
      <FieldError message={errors.policy?.miniAssessmentEnabled?.message} />
      {miniEnabled && <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Số câu trắc nghiệm (3–10)" error={errors.policy?.miniQuestionCount?.message} input={<input className={assessmentInput} type="number" min={3} max={10} {...register("policy.miniQuestionCount")} />} />
        <NumberField label="Tỷ trọng trong Technical Knowledge (%)" error={errors.policy?.miniWeight?.message} input={<input className={assessmentInput} type="number" min={0} max={100} {...register("policy.miniWeight")} />} />
        <NumberField label="Vị trí trong lộ trình" error={errors.policy?.miniAfterStage?.message} input={<select className={assessmentInput} {...register("policy.miniAfterStage")}>
          <option value={0}>Trước chặng 1</option>
          {stageValues.map((stage, index) => <option key={index} value={index + 1}>Sau chặng {index + 1}{stage.title ? `: ${stage.title}` : ""}</option>)}
        </select>} />
      </div>}
      {miniEnabled && <p className={assessmentMuted}>Technical Knowledge = Hỏi–đáp kỹ thuật × {100 - miniWeight}% + Mini Assessment × {miniWeight}%. Thời gian làm trắc nghiệm nằm trong tổng thời gian Interview. Giai đoạn thử nghiệm dùng 3–4 câu; vận hành thường dùng 5–10 câu.</p>}
      {!miniEnabled && <p className={assessmentMuted}>Không bật Mini Assessment: Technical Knowledge lấy hoàn toàn từ hỏi–đáp.</p>}
    </fieldset>

    <fieldset className={card}>
      <legend className="px-1 font-semibold">Lộ trình phỏng vấn</legend>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className={plannedQuestions === Number(watch("questionCount")) ? assessmentMuted : "text-sm text-[var(--color-status-danger)]"}>
          {stageValues.length} chặng · {plannedQuestions}/{watch("questionCount")} câu hỏi phỏng vấn{miniEnabled ? ` · thêm ${watch("policy.miniQuestionCount")} câu trắc nghiệm` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ai" size="sm" disabled={busy} onClick={() => suggest.mutate()}><Sparkles className="size-4" aria-hidden="true" />{suggest.isPending ? "AI đang đề xuất…" : "AI đề xuất lộ trình"}</Button>
          <Button variant="secondary" size="sm" disabled={busy || stages.fields.length >= 20}
            onClick={() => stages.append({ title: "", questionCount: 1, competencies: [], skills: [] })}><Plus className="size-4" aria-hidden="true" />Thêm chặng</Button>
        </div>
      </div>
      <p className={assessmentMuted}>AI đề xuất từ JD và Job Skills; bạn chỉnh trước khi lưu. Một kỹ năng có thể xuất hiện ở nhiều chặng. Communication được đánh giá xuyên suốt mọi chặng.</p>
      <AssessmentError error={suggest.error} />
      {suggest.isSuccess && <p role="status" className="text-sm">Đã điền lộ trình đề xuất. Kiểm tra rồi bấm “Lưu cấu hình” để áp dụng.</p>}
      <FieldError message={errors.policy?.stages?.root?.message ?? errors.policy?.stages?.message} />
      <ol className="space-y-3">
        {stages.fields.map((field, index) => <StageItem key={field.id} index={index} total={stages.fields.length} control={control} register={register}
          weights={weights} selectedSkills={selectedSkills} disabled={busy} errors={errors.policy?.stages?.[index]}
          onMove={to => stages.move(index, to)} onRemove={() => stages.remove(index)} />)}
      </ol>
    </fieldset>

    <AssessmentError error={save.error} />
    {save.isSuccess && !isDirty && <p role="status">Đã lưu cấu hình.</p>}
    <Button type="submit" disabled={!isDirty || busy}>{save.isPending ? "Đang lưu…" : "Lưu cấu hình"}</Button>
  </form>;
}

function NumberField({ label, error, input }: { label: string; error?: string; input: ReactNode }) {
  return <label className="space-y-2 text-sm"><span className="block">{label}</span>{input}<FieldError message={error} /></label>;
}

type StageErrors = { title?: { message?: string }; questionCount?: { message?: string }; competencies?: { message?: string }; skills?: { message?: string } };

function StageItem({ index, total, control, register, weights, selectedSkills, disabled, errors, onMove, onRemove }: {
  index: number; total: number; control: Control<ConfigValues>; register: UseFormRegister<ConfigValues>;
  weights: Record<CompetencyKey, number>; selectedSkills: string[]; disabled: boolean; errors?: StageErrors;
  onMove: (to: number) => void; onRemove: () => void;
}) {
  return <li className="space-y-3 rounded-lg bg-[var(--color-surface-container-low)] p-4">
    <div className="flex flex-wrap items-end gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-primary text-sm font-semibold text-[var(--color-on-primary)]" aria-hidden="true">{index + 1}</span>
      <label className="min-w-48 flex-1 space-y-1 text-sm"><span className="block">Chủ đề chặng {index + 1}</span><input className={assessmentInput} {...register(`policy.stages.${index}.title`)} disabled={disabled} /><FieldError message={errors?.title?.message} /></label>
      <label className="w-28 space-y-1 text-sm"><span className="block">Số câu</span><input className={assessmentInput} type="number" min={1} max={30} {...register(`policy.stages.${index}.questionCount`)} disabled={disabled} /><FieldError message={errors?.questionCount?.message} /></label>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" aria-label={`Đưa chặng ${index + 1} lên`} disabled={disabled || index === 0} onClick={() => onMove(index - 1)}><ArrowUp className="size-4" aria-hidden="true" /></Button>
        <Button variant="ghost" size="sm" aria-label={`Đưa chặng ${index + 1} xuống`} disabled={disabled || index === total - 1} onClick={() => onMove(index + 1)}><ArrowDown className="size-4" aria-hidden="true" /></Button>
        <Button variant="ghost" size="sm" aria-label={`Xoá chặng ${index + 1}`} disabled={disabled} onClick={onRemove}><Trash2 className="size-4" aria-hidden="true" /></Button>
      </div>
    </div>
    <Controller control={control} name={`policy.stages.${index}.competencies`} render={({ field }) => <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Nhóm năng lực</legend>
      <div className="flex flex-wrap gap-2">{COMPETENCY_KEYS.map(key => <label key={key} className={chip}>
        <input type="checkbox" checked={field.value.includes(key)} disabled={disabled || (Number(weights[key]) === 0 && !field.value.includes(key))}
          onChange={() => field.onChange(toggle(field.value, key))} />{COMPETENCY_LABELS[key]}</label>)}</div>
      <FieldError message={errors?.competencies?.message} />
    </fieldset>} />
    <Controller control={control} name={`policy.stages.${index}.skills`} render={({ field }) => <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Job Skills</legend>
      {selectedSkills.length === 0 ? <p className={assessmentMuted}>Chọn Job Skills ở phần trên trước.</p> :
        <div className="flex flex-wrap gap-2">{selectedSkills.map(skill => <label key={skill} className={chip}>
          <input type="checkbox" checked={field.value.includes(skill)} disabled={disabled} onChange={() => field.onChange(toggle(field.value, skill))} />{skill}</label>)}</div>}
      <FieldError message={errors?.skills?.message} />
    </fieldset>} />
  </li>;
}
