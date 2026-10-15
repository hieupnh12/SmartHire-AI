import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Save, Settings2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { type AiInterviewConfig, type InterviewProcessConfig } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { AssessmentError, FieldError, assessmentInput, assessmentMuted } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { configSchema, toFormValues, toRequest, type ConfigValues } from "../utils/aiInterviewConfigSchema";
import { ExerciseStructureConfigurator } from "./ExerciseStructureConfigurator";
import { ASSESSMENT_CRITERIA, conversationAssessmentSchema, defaultProcesses, interviewDurationMinutes, normalizeProcesses, processCount } from "../utils/interviewProcessSettings";

type Tab = "general" | "exercise";

export function InterviewConfigurationTabs({ jobId, config, jobSkills }: { jobId: number; config: AiInterviewConfig; jobSkills: string[] }) {
  const [tab, setTab] = useState<Tab>("general");
  const client = useQueryClient();
  const form = useForm<ConfigValues>({ resolver: zodResolver(configSchema), defaultValues: toFormValues(config) });
  const [processes, setProcesses] = useState<InterviewProcessConfig[]>(() => normalizeProcesses(config.policy.processes ?? defaultProcesses()));
  const [exerciseDirty, setExerciseDirty] = useState(() => JSON.stringify(config.policy.processes ?? []) !== JSON.stringify(normalizeProcesses(config.policy.processes ?? defaultProcesses())));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const processesRef = useRef(processes);
  useEffect(() => {
    form.setValue("questionCount", processCount(processes), { shouldValidate: true, shouldDirty: true });
    form.setValue("policy.durationMinutes", interviewDurationMinutes(processes), { shouldValidate: true, shouldDirty: true });
    form.setValue("policy.miniAssessmentEnabled", false);
    form.setValue("policy.schemaVersion", 2);
  }, [form, processes]);
  useEffect(() => {
    const selectedSkills = form.getValues("policy.selectedSkills");
    if (selectedSkills.length === 0 && jobSkills.length > 0) {
      form.setValue("policy.selectedSkills", jobSkills, { shouldDirty: false, shouldValidate: true });
    }
  }, [form, jobSkills]);
  const communication = processes.find(process => process.key === "COMMUNICATION")!;
  const assessmentValidation = conversationAssessmentSchema.safeParse(communication.config);
  const totalWeight = ASSESSMENT_CRITERIA.reduce((total, criterion) => total + (Number(communication.config[criterion.key]) || 0), 0);
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
  const availabilityMode = form.watch("policy.availability.mode");
  const startDelayHours = form.watch("policy.availability.startDelayHours");
  const completionWindowHours = form.watch("policy.availability.completionWindowHours");
  function updateProcesses(next: InterviewProcessConfig[]) {
    processesRef.current = next; setProcesses(next); setExerciseDirty(true);
  }
  function updateAssessment(key: string, value: string | number) {
    updateProcesses(processes.map(process => process.key === "COMMUNICATION"
      ? { ...process, config: { ...process.config, [key]: value } } : process));
  }

  function submitInvalid(errors: FieldErrors<ConfigValues>) {
    setSaveMessage(firstValidationMessage(errors) ?? "Cấu hình chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.");
  }

  return <form className="space-y-5" onSubmit={form.handleSubmit(values => {
    if (!assessmentValidation.success) { setTab(["maxFollowUp", "questionCount"].includes(String(assessmentValidation.error.issues[0].path[0])) ? "exercise" : "general"); setSaveMessage(assessmentValidation.error.issues[0].message); return; }
    save.mutate(values);
  }, submitInvalid)}>
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-surface-container-low)] p-1" role="tablist" aria-label="Cấu hình AI Interview">
      <TabButton active={tab === "general"} label="Cấu hình chung" icon={Settings2} onClick={() => setTab("general")} />
      <TabButton active={tab === "exercise"} label="Cấu hình bài tập" icon={ClipboardList} onClick={() => setTab("exercise")} />
    </div>

    {tab === "general" && <div role="tabpanel" className="space-y-5">
      <Intro title="Nội dung phỏng vấn và điều kiện đạt" description="AI đặt câu hỏi theo Job Skills, trọng tâm và tiêu chí bên dưới; dùng cùng thiết lập để đánh giá toàn bộ hội thoại." />
      <fieldset className={card}><legend>Thiết lập phiên</legend>
        <label className="mb-4 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" {...form.register("enabled")} disabled={busy} />Cho phép AI Interview và tự tạo lời mời khi CV đạt</label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Passing Score (/100)" error={form.formState.errors.passingScore?.message}><input className={assessmentInput} type="number" min={0} max={100} {...form.register("passingScore")} /></Field>
          <Field label="Cách đặt thời gian"><select className={assessmentInput} disabled={busy} {...form.register("policy.availability.mode")}><option value="RELATIVE">Theo số giờ từ lời mời</option><option value="ABSOLUTE">Theo ngày giờ cụ thể</option></select></Field>
          {availabilityMode === "RELATIVE" ? <>
            <Field label="Mở sau khi nhận lời mời (giờ)" error={form.formState.errors.policy?.availability?.startDelayHours?.message}><input className={assessmentInput} type="number" min={0} max={8760} step={1} disabled={busy} {...form.register("policy.availability.startDelayHours")} /><span className={assessmentMuted}>0 giờ: có thể bắt đầu ngay khi nhận lời mời.</span></Field>
            <Field label="Hạn hoàn thành sau khi mở (giờ)" error={form.formState.errors.policy?.availability?.completionWindowHours?.message}><input className={assessmentInput} type="number" min={1} max={8760} step={1} disabled={busy} {...form.register("policy.availability.completionWindowHours")} /><span className={assessmentMuted}>Tính từ thời điểm được phép bắt đầu.</span></Field>
          </> : <>
            <Field label="Thời gian có thể bắt đầu" error={form.formState.errors.availableFrom?.message}><input className={assessmentInput} type="datetime-local" disabled={busy} {...form.register("availableFrom")} /></Field>
            <Field label="Hạn hoàn thành" error={form.formState.errors.availableUntil?.message}><input className={assessmentInput} type="datetime-local" disabled={busy} {...form.register("availableUntil")} /></Field>
          </>}
          <Field label="Số lần được phép làm"><input className={assessmentInput} type="number" min={1} max={5} {...form.register("policy.maxAttempts")} /></Field>
        </div>
        {availabilityMode === "RELATIVE" && <p role="status" className={assessmentMuted}>Mở {Number(startDelayHours) === 0 ? "ngay khi nhận lời mời" : `sau ${startDelayHours ?? "…"} giờ từ lời mời`}; đóng sau {completionWindowHours ?? "…"} giờ kể từ lúc mở. Thời gian cụ thể được chốt riêng cho mỗi lời mời.</p>}
      </fieldset>
      <fieldset className={card}><legend>Tiêu chí hỏi và đánh giá hội thoại</legend>
        <p className={assessmentMuted}>AI thu thập bằng chứng cho các tiêu chí có trọng số lớn hơn 0%, gắn với yêu cầu công việc. Giao tiếp được quan sát xuyên suốt các câu trả lời. Điểm tổng là tổng điểm từng tiêu chí nhân trọng số.</p>
        <div className="grid gap-4 sm:grid-cols-2">{ASSESSMENT_CRITERIA.map(criterion => <div key={criterion.key} className="space-y-1">
          <Field label={`${criterion.label} (%)`} error={!assessmentValidation.success ? assessmentValidation.error.issues.find(issue => issue.path[0] === criterion.key)?.message : undefined}>
            <input className={assessmentInput} type="number" min={0} max={100} step={1} disabled={busy}
              value={Number.isNaN(Number(communication.config[criterion.key])) ? "" : Number(communication.config[criterion.key])}
              aria-invalid={!assessmentValidation.success && assessmentValidation.error.issues.some(issue => issue.path[0] === criterion.key)}
              onChange={event => updateAssessment(criterion.key, event.target.valueAsNumber)} />
          </Field><p className={assessmentMuted}>{criterion.description}</p>
        </div>)}</div>
        <p role="status" className={totalWeight === 100 ? assessmentMuted : "text-sm text-[var(--color-status-danger)]"}>Tổng trọng số: {totalWeight}%{totalWeight !== 100 && " — phải bằng 100%"}</p>
        <Field label="Trọng tâm phỏng vấn theo job" error={!assessmentValidation.success ? assessmentValidation.error.issues.find(issue => issue.path[0] === "assessmentFocus")?.message : undefined}>
          <textarea className={assessmentInput} rows={4} maxLength={2000} disabled={busy} value={String(communication.config.assessmentFocus ?? "")}
            placeholder="Ví dụ: tập trung thiết kế REST API, xử lý lỗi và giải thích lựa chọn database cho hệ thống bán hàng."
            onChange={event => updateAssessment("assessmentFocus", event.target.value)} />
        </Field>
        <p className={assessmentMuted}>AI dùng nội dung này cùng JD và Job Skills đã chọn. Không chấm giọng, accent hoặc đặc điểm cá nhân.</p>
      </fieldset>
      <fieldset className={card}><legend>Job Skills cần đánh giá</legend>
        <div className="flex flex-wrap gap-2">{jobSkills.map(skill => <label key={skill} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-3 text-sm has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-soft)]"><input type="checkbox" checked={form.watch("policy.selectedSkills").includes(skill)} onChange={() => { const selected = form.getValues("policy.selectedSkills"); form.setValue("policy.selectedSkills", selected.includes(skill) ? selected.filter(item => item !== skill) : [...selected, skill], { shouldDirty: true }); }} />{skill}</label>)}</div>
      </fieldset>
    </div>}

    <div className={tab === "exercise" ? undefined : "hidden"} aria-hidden={tab !== "exercise"}>
      <ExerciseStructureConfigurator jobSkills={form.watch("policy.selectedSkills")} processes={processes} onChange={updateProcesses} />
    </div>
    <AssessmentError error={save.error} />
    {saveMessage && <p role="status" className={save.isError ? "text-sm text-[var(--color-status-danger)]" : "text-sm text-[var(--color-status-success)]"}>{saveMessage}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-4"><p className={assessmentMuted}>Cấu hình chỉ áp dụng cho các phiên được tạo mới.</p><div className="flex items-center gap-3">{save.isSuccess && !form.formState.isDirty && !exerciseDirty && <span className="text-sm text-[var(--color-status-success)]">Đã lưu cấu hình.</span>}<Button type="submit" disabled={busy || (!form.formState.isDirty && !exerciseDirty)}><Save className="size-4" />{busy ? "Đang lưu…" : "Lưu cấu hình"}</Button></div></div>
  </form>;
}

function request(values: ConfigValues, processes: InterviewProcessConfig[]): AiInterviewConfig {
  const value = toRequest(values);
  const normalized = normalizeProcesses(processes);
  return { ...value, questionCount: processCount(normalized), policy: { ...value.policy, durationMinutes: interviewDurationMinutes(normalized), miniAssessmentEnabled: false, stages: [], schemaVersion: 2, processes: normalized } };
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


const card = "space-y-4 rounded-xl border border-[var(--color-border-default)] p-4";
function Intro({ title, description }: { title: string; description: string }) { return <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/40 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{description}</p></div>; }
function TabButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: typeof Settings2; onClick: () => void }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${active ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"}`}><Icon className="size-4" aria-hidden="true" />{label}</button>; }
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className="space-y-1.5 text-sm"><span className="block">{label}</span>{children}<FieldError message={error} /></label>; }
