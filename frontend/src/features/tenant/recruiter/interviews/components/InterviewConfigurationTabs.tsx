import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Save, Settings2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { COMPETENCY_LABELS, WEIGHT_PRESETS, type AiInterviewConfig, type InterviewProcessConfig } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { AssessmentError, FieldError, assessmentInput, assessmentMuted } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { COMPETENCY_KEYS, configSchema, toFormValues, toRequest, type ConfigValues } from "../utils/aiInterviewConfigSchema";
import { ExerciseStructureConfigurator } from "./ExerciseStructureConfigurator";

type Tab = "general" | "exercise";

export function InterviewConfigurationTabs({ jobId, config, jobSkills }: { jobId: number; config: AiInterviewConfig; jobSkills: string[] }) {
  const [tab, setTab] = useState<Tab>("general");
  const client = useQueryClient();
  const form = useForm<ConfigValues>({ resolver: zodResolver(configSchema), defaultValues: toFormValues(config) });
  const [processes, setProcesses] = useState<InterviewProcessConfig[]>(() => config.policy.processes ?? defaultProcesses());
  const [exerciseDirty, setExerciseDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const processesRef = useRef(processes);
  useEffect(() => {
    const selectedSkills = form.getValues("policy.selectedSkills");
    if (selectedSkills.length === 0 && jobSkills.length > 0) {
      form.setValue("policy.selectedSkills", jobSkills, { shouldDirty: false, shouldValidate: true });
    }
  }, [form, jobSkills]);
  const weights = form.watch("policy.weights");
  const totalWeight = COMPETENCY_KEYS.reduce((total, key) => total + (Number(weights[key]) || 0), 0);
  const save = useMutation({
    mutationFn: (values: ConfigValues) => aiInterviewApi.saveConfig(jobId, request(values, processesRef.current)),
    onMutate: () => setSaveMessage("Đang lưu toàn bộ cấu hình…"),
    onSuccess: saved => {
      form.reset(toFormValues(saved));
      if (saved.policy.processes) { processesRef.current = saved.policy.processes; setProcesses(saved.policy.processes); }
      setExerciseDirty(false);
      setSaveMessage("Đã lưu cấu hình thành công.");
      void client.invalidateQueries({ queryKey: ["ai-interview-config", jobId] });
      void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
    },
    onError: () => setSaveMessage("Không thể lưu cấu hình. Vui lòng kiểm tra lại các trường bắt buộc."),
  });
  const busy = save.isPending;
  function updateProcesses(next: InterviewProcessConfig[]) {
    processesRef.current = next; setProcesses(next); setExerciseDirty(true);
  }

  function submitInvalid(errors: FieldErrors<ConfigValues>) {
    setSaveMessage(firstValidationMessage(errors) ?? "Cấu hình chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.");
  }

  return <form className="space-y-5" onSubmit={form.handleSubmit(values => save.mutate(values), submitInvalid)}>
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-surface-container-low)] p-1" role="tablist" aria-label="Cấu hình AI Interview">
      <TabButton active={tab === "general"} label="Cấu hình chung" icon={Settings2} onClick={() => setTab("general")} />
      <TabButton active={tab === "exercise"} label="Cấu hình bài tập" icon={ClipboardList} onClick={() => setTab("exercise")} />
    </div>

    {tab === "general" && <div role="tabpanel" className="space-y-5">
      <Intro title="Điểm và điều kiện đạt" description="Thiết lập chung áp dụng cho toàn bộ bài tập trong phiên phỏng vấn AI." />
      <fieldset className={card}><legend>Thiết lập phiên</legend>
        <label className="mb-4 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" {...form.register("enabled")} disabled={busy} />Cho phép AI Interview và tự tạo lời mời khi CV đạt</label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Passing Score (/100)" error={form.formState.errors.passingScore?.message}><input className={assessmentInput} type="number" min={0} max={100} {...form.register("passingScore")} /></Field>
          <Field label="Số câu hỏi phỏng vấn" error={form.formState.errors.questionCount?.message}><input className={assessmentInput} type="number" min={1} max={30} {...form.register("questionCount")} /></Field>
          <Field label="Tổng thời gian (phút)" error={form.formState.errors.policy?.durationMinutes?.message}><input className={assessmentInput} type="number" min={1} max={180} {...form.register("policy.durationMinutes")} /></Field>
          <Field label="Hạn hoàn thành"><input className={assessmentInput} type="datetime-local" {...form.register("availableUntil")} /></Field>
          <Field label="Số lần được phép làm"><input className={assessmentInput} type="number" min={1} max={5} {...form.register("policy.maxAttempts")} /></Field>
        </div>
      </fieldset>
      <fieldset className={card}><legend>Nhóm năng lực và trọng số</legend>
        <div className="flex flex-wrap gap-2">{(Object.keys(WEIGHT_PRESETS) as (keyof typeof WEIGHT_PRESETS)[]).map(preset => <Button key={preset} type="button" variant="secondary" size="sm" onClick={() => form.setValue("policy.weights", WEIGHT_PRESETS[preset], { shouldDirty: true })}>{preset === "default" ? "Mặc định" : `Mẫu ${preset === "junior" ? "Junior" : "Senior"}`}</Button>)}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{COMPETENCY_KEYS.map(key => <Field key={key} label={`${COMPETENCY_LABELS[key]} (%)`}><input className={assessmentInput} type="number" min={0} max={100} {...form.register(`policy.weights.${key}`)} /></Field>)}</div>
        <p className={totalWeight === 100 ? assessmentMuted : "text-sm text-[var(--color-status-danger)]"}>Tổng trọng số: {totalWeight}%{totalWeight !== 100 && " — phải bằng 100%"}</p>
      </fieldset>
      <fieldset className={card}><legend>Job Skills cần đánh giá</legend>
        <div className="flex flex-wrap gap-2">{jobSkills.map(skill => <label key={skill} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-3 text-sm has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-soft)]"><input type="checkbox" checked={form.watch("policy.selectedSkills").includes(skill)} onChange={() => { const selected = form.getValues("policy.selectedSkills"); form.setValue("policy.selectedSkills", selected.includes(skill) ? selected.filter(item => item !== skill) : [...selected, skill], { shouldDirty: true }); }} />{skill}</label>)}</div>
      </fieldset>
    </div>}

    <div className={tab === "exercise" ? undefined : "hidden"} aria-hidden={tab !== "exercise"}>
      <ExerciseStructureConfigurator jobSkills={jobSkills} processes={processes} onChange={updateProcesses} />
    </div>
    <AssessmentError error={save.error} />
    {saveMessage && <p role="status" className={save.isError ? "text-sm text-[var(--color-status-danger)]" : "text-sm text-[var(--color-status-success)]"}>{saveMessage}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-4"><p className={assessmentMuted}>Cấu hình chỉ áp dụng cho các phiên được tạo mới.</p><div className="flex items-center gap-3">{save.isSuccess && !form.formState.isDirty && !exerciseDirty && <span className="text-sm text-[var(--color-status-success)]">Đã lưu cấu hình.</span>}<Button type="submit" disabled={busy || (!form.formState.isDirty && !exerciseDirty)}><Save className="size-4" />{busy ? "Đang lưu…" : "Lưu cấu hình"}</Button></div></div>
  </form>;
}

function request(values: ConfigValues, processes: InterviewProcessConfig[]): AiInterviewConfig {
  const value = toRequest(values);
  return { ...value, policy: { ...value.policy, schemaVersion: 2, processes } };
}

function firstValidationMessage(errors: FieldErrors<ConfigValues>): string | undefined {
  for (const value of Object.values(errors)) {
    if (value && typeof value === "object") {
      if ("message" in value && typeof value.message === "string") return value.message;
      const nested = firstValidationMessage(value as FieldErrors<ConfigValues>);
      if (nested) return nested;
    }
  }
  return undefined;
}

function defaultProcesses(): InterviewProcessConfig[] {
  return [
    ["TECHNICAL_KNOWLEDGE", 35, 10], ["PROBLEM_SOLVING", 25, 2], ["PRACTICAL_EXPERIENCE", 20, 3],
    ["TECHNICAL_REASONING", 10, 3], ["BEHAVIORAL_SITUATIONAL", 5, 4], ["COMMUNICATION", 5, 3],
  ].map(([key, weight, questionCount], index) => ({ key: key as InterviewProcessConfig["key"], enabled: true, order: index + 1, weight: weight as number, config: { questionCount } }));
}

const card = "space-y-4 rounded-xl border border-[var(--color-border-default)] p-4";
function Intro({ title, description }: { title: string; description: string }) { return <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/40 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{description}</p></div>; }
function TabButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: typeof Settings2; onClick: () => void }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${active ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"}`}><Icon className="size-4" aria-hidden="true" />{label}</button>; }
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className="space-y-1.5 text-sm"><span className="block">{label}</span>{children}<FieldError message={error} /></label>; }
