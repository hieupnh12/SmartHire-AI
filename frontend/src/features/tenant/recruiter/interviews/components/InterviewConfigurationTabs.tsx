import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, RotateCcw, Save, Settings2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { type AiInterviewConfig, type InterviewProcessConfig } from "@/api/types/aiInterview";
import { AssessmentError, FieldError, assessmentInput, assessmentMuted } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { configSchema, toFormValues, toRequest, type ConfigValues } from "../utils/aiInterviewConfigSchema";
import { ExerciseStructureConfigurator } from "./ExerciseStructureConfigurator";
import {
  ASSESSMENT_CRITERIA,
  conversationAssessmentSchema,
  defaultProcesses,
  interviewDurationMinutes,
  normalizeProcesses,
  processCount,
} from "../utils/interviewProcessSettings";

type Tab = "general" | "exercise";

type Props = {
  jobId: number;
  config: AiInterviewConfig;
  jobSkills: string[];
  activeSubTab?: Tab;
  onSubTabChange?: (tab: Tab) => void;
  hideInternalTabs?: boolean;
};

export function InterviewConfigurationTabs({
  jobId,
  config,
  jobSkills,
  activeSubTab,
  onSubTabChange,
  hideInternalTabs = false,
}: Props) {
  const [internalTab, setInternalTab] = useState<Tab>("general");
  const tab = activeSubTab ?? internalTab;
  const setTab = (nextTab: Tab) => {
    setInternalTab(nextTab);
    onSubTabChange?.(nextTab);
  };

  const client = useQueryClient();
  const form = useForm<ConfigValues>({ resolver: zodResolver(configSchema), defaultValues: toFormValues(config) });
  const [processes, setProcesses] = useState<InterviewProcessConfig[]>(() => normalizeProcesses(config?.policy?.processes ?? defaultProcesses()));
  const [exerciseDirty, setExerciseDirty] = useState(() => JSON.stringify(config?.policy?.processes ?? []) !== JSON.stringify(normalizeProcesses(config?.policy?.processes ?? defaultProcesses())));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const processesRef = useRef(processes);

  useEffect(() => {
    form.setValue("questionCount", processCount(processes), { shouldValidate: true, shouldDirty: true });
    form.setValue("policy.durationMinutes", interviewDurationMinutes(processes), { shouldValidate: true, shouldDirty: true });
    form.setValue("policy.miniAssessmentEnabled", false);
    form.setValue("policy.schemaVersion", 2);
  }, [form, processes]);

  useEffect(() => {
    const selectedSkills = form.getValues("policy.selectedSkills") ?? [];
    if (selectedSkills.length === 0 && (jobSkills ?? []).length > 0) {
      form.setValue("policy.selectedSkills", jobSkills, { shouldDirty: false, shouldValidate: true });
    }
  }, [form, jobSkills]);

  const communication = processes.find(process => process.key === "COMMUNICATION") ?? {
    key: "COMMUNICATION",
    enabled: true,
    order: 1,
    weight: 100,
    config: {},
  };
  const commConfig = (communication.config ?? {}) as Record<string, unknown>;
  const assessmentValidation = conversationAssessmentSchema.safeParse(commConfig);
  const totalWeight = ASSESSMENT_CRITERIA.reduce((total, criterion) => total + (Number(commConfig[criterion.key]) || 0), 0);

  const save = useMutation({
    mutationFn: (values: ConfigValues) => aiInterviewApi.saveConfig(jobId, request(values, processesRef.current)),
    onMutate: () => setSaveMessage("Đang lưu toàn bộ cấu hình…"),
    onSuccess: saved => {
      form.reset(toFormValues(saved));
      if (saved.policy?.processes) { processesRef.current = saved.policy.processes; setProcesses(saved.policy.processes); }
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
      ? { ...process, config: { ...(process.config ?? {}), [key]: value } } : process));
  }

  function submitInvalid(errors: FieldErrors<ConfigValues>) {
    setSaveMessage(firstValidationMessage(errors) ?? "Cấu hình chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.");
  }

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(values => {
        if (!assessmentValidation.success) {
          const firstIssue = assessmentValidation.error.issues[0];
          const firstKey = firstIssue?.path[0] ? String(firstIssue.path[0]) : "";
          setTab(["maxFollowUp", "questionCount"].includes(firstKey) ? "exercise" : "general");
          setSaveMessage(firstIssue?.message ?? "Cấu hình đánh giá chưa hợp lệ.");
          return;
        }
        save.mutate(values);
      }, submitInvalid)}
    >
      {/* Header section matching AssessmentCreationPage */}
      {hideInternalTabs ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight text-[#101828] dark:text-white">
              {tab === "general" ? "Cài đặt chung" : "Cơ cấu bài tập"}
            </h2>
            <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
              {tab === "general"
                ? "Thiết lập tiêu chuẩn điểm đạt, thời lượng làm bài và quy tắc giao đề tự động."
                : "Phân bổ số lượng câu hỏi, quy trình phỏng vấn và ma trận rubric."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-semibold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">
              Thời lượng: {interviewDurationMinutes(processes)} phút · {processCount(processes)} câu hỏi
            </span>
            <button
              type="button"
              onClick={() => {
                form.reset(toFormValues(config));
                setProcesses(normalizeProcesses(config?.policy?.processes ?? defaultProcesses()));
                setExerciseDirty(false);
              }}
              disabled={!form.formState.isDirty && !exerciseDirty}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Khôi phục</span>
            </button>
            <button
              type="submit"
              disabled={busy || (!form.formState.isDirty && !exerciseDirty)}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>{busy ? "Đang lưu…" : "Lưu cấu hình"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto scrollbar-none" role="tablist" aria-label="Cấu hình AI Interview">
          <TabButton active={tab === "general"} label="Cấu hình chung" icon={Settings2} onClick={() => setTab("general")} />
          <TabButton active={tab === "exercise"} label="Cấu hình bài tập" icon={ClipboardList} onClick={() => setTab("exercise")} />
        </div>
      )}

      {tab === "general" && (
        <div role="tabpanel" className="space-y-5">
          <Intro
            title="Nội dung phỏng vấn và điều kiện đạt"
            description="AI đặt câu hỏi theo Job Skills, trọng tâm và tiêu chí bên dưới; dùng cùng thiết lập để đánh giá toàn bộ hội thoại."
          />

          <fieldset className={card}>
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Thiết lập phiên
            </legend>
            <label className="mb-2 flex min-h-10 items-center gap-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input type="checkbox" className="size-4 accent-[#0066FF] rounded cursor-pointer" {...form.register("enabled")} disabled={busy} />
              Cho phép AI Interview và tự tạo lời mời khi CV đạt
            </label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Passing Score (/100)" error={form.formState.errors.passingScore?.message}>
                <input className={assessmentInput} type="number" min={0} max={100} {...form.register("passingScore")} />
              </Field>
              <Field label="Cách đặt thời gian">
                <select className={assessmentInput} disabled={busy} {...form.register("policy.availability.mode")}>
                  <option value="RELATIVE">Theo số giờ từ lời mời</option>
                  <option value="ABSOLUTE">Theo ngày giờ cụ thể</option>
                </select>
              </Field>
              {availabilityMode === "RELATIVE" ? (
                <>
                  <Field label="Mở sau khi nhận lời mời (giờ)" error={form.formState.errors.policy?.availability?.startDelayHours?.message}>
                    <input className={assessmentInput} type="number" min={0} max={8760} step={1} disabled={busy} {...form.register("policy.availability.startDelayHours")} />
                    <span className={assessmentMuted}>0 giờ: có thể bắt đầu ngay khi nhận lời mời.</span>
                  </Field>
                  <Field label="Hạn hoàn thành sau khi mở (giờ)" error={form.formState.errors.policy?.availability?.completionWindowHours?.message}>
                    <input className={assessmentInput} type="number" min={1} max={8760} step={1} disabled={busy} {...form.register("policy.availability.completionWindowHours")} />
                    <span className={assessmentMuted}>Tính từ thời điểm được phép bắt đầu.</span>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Thời gian có thể bắt đầu" error={form.formState.errors.availableFrom?.message}>
                    <input className={assessmentInput} type="datetime-local" disabled={busy} {...form.register("availableFrom")} />
                  </Field>
                  <Field label="Hạn hoàn thành" error={form.formState.errors.availableUntil?.message}>
                    <input className={assessmentInput} type="datetime-local" disabled={busy} {...form.register("availableUntil")} />
                  </Field>
                </>
              )}
              <Field label="Số lần được phép làm">
                <input className={assessmentInput} type="number" min={1} max={5} {...form.register("policy.maxAttempts")} />
              </Field>
            </div>
            {availabilityMode === "RELATIVE" && (
              <p role="status" className={assessmentMuted}>
                Mở {Number(startDelayHours) === 0 ? "ngay khi nhận lời mời" : `sau ${startDelayHours ?? "…"} giờ từ lời mời`}; đóng sau {completionWindowHours ?? "…"} giờ kể từ lúc mở. Thời gian cụ thể được chốt riêng cho mỗi lời mời.
              </p>
            )}
          </fieldset>

          <fieldset className={card}>
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Tiêu chí hỏi và đánh giá hội thoại
            </legend>
            <p className={assessmentMuted}>
              AI thu thập bằng chứng cho các tiêu chí có trọng số lớn hơn 0%, gắn với yêu cầu công việc. Giao tiếp được quan sát xuyên suốt các câu trả lời. Điểm tổng là tổng điểm từng tiêu chí nhân trọng số.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {ASSESSMENT_CRITERIA.map(criterion => (
                <div key={criterion.key} className="space-y-1">
                  <Field label={`${criterion.label} (%)`} error={!assessmentValidation.success ? assessmentValidation.error.issues.find(issue => issue.path[0] === criterion.key)?.message : undefined}>
                    <input
                      className={assessmentInput}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      disabled={busy}
                      value={Number.isNaN(Number(commConfig[criterion.key])) ? "" : Number(commConfig[criterion.key])}
                      aria-invalid={!assessmentValidation.success && assessmentValidation.error.issues.some(issue => issue.path[0] === criterion.key)}
                      onChange={event => updateAssessment(criterion.key, event.target.valueAsNumber)}
                    />
                  </Field>
                  <p className={assessmentMuted}>{criterion.description}</p>
                </div>
              ))}
            </div>
            <p role="status" className={totalWeight === 100 ? assessmentMuted : "text-xs font-semibold text-rose-600 dark:text-rose-400"}>
              Tổng trọng số: {totalWeight}%{totalWeight !== 100 && " — phải bằng 100%"}
            </p>
            <Field label="Trọng tâm phỏng vấn theo job" error={!assessmentValidation.success ? assessmentValidation.error.issues.find(issue => issue.path[0] === "assessmentFocus")?.message : undefined}>
              <textarea
                className={cn(assessmentInput, "min-h-24 resize-y")}
                rows={4}
                maxLength={2000}
                disabled={busy}
                value={String(commConfig.assessmentFocus ?? "")}
                placeholder="Ví dụ: tập trung thiết kế REST API, xử lý lỗi và giải thích lựa chọn database cho hệ thống bán hàng."
                onChange={event => updateAssessment("assessmentFocus", event.target.value)}
              />
            </Field>
            <p className={assessmentMuted}>AI dùng nội dung này cùng JD và Job Skills đã chọn. Không chấm giọng, accent hoặc đặc điểm cá nhân.</p>
          </fieldset>

          <fieldset className={card}>
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Job Skills cần đánh giá
            </legend>
            <div className="flex flex-wrap gap-2">
              {(jobSkills ?? []).map(skill => {
                const currentSelected = form.watch("policy.selectedSkills") ?? [];
                return (
                  <label
                    key={skill}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 has-[:checked]:border-[#0066FF] has-[:checked]:bg-blue-50 has-[:checked]:text-[#0066FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:has-[:checked]:bg-blue-950/60 dark:has-[:checked]:text-blue-300"
                  >
                    <input
                      type="checkbox"
                      className="accent-[#0066FF] rounded"
                      checked={currentSelected.includes(skill)}
                      onChange={() => {
                        const selected = form.getValues("policy.selectedSkills") ?? [];
                        form.setValue("policy.selectedSkills", selected.includes(skill) ? selected.filter(item => item !== skill) : [...selected, skill], { shouldDirty: true });
                      }}
                    />
                    {skill}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      <div className={tab === "exercise" ? undefined : "hidden"} aria-hidden={tab !== "exercise"}>
        <ExerciseStructureConfigurator jobSkills={form.watch("policy.selectedSkills") ?? []} processes={processes} onChange={updateProcesses} />
      </div>

      <AssessmentError error={save.error} />
      {saveMessage && (
        <p role="status" className={cn("text-xs font-semibold", save.isError ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
          {saveMessage}
        </p>
      )}

      {/* Bottom Save Bar (when not in hideInternalTabs mode, or as fallback) */}
      {!hideInternalTabs && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className={assessmentMuted}>Cấu hình chỉ áp dụng cho các phiên được tạo mới.</p>
          <div className="flex items-center gap-3">
            {save.isSuccess && !form.formState.isDirty && !exerciseDirty && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Đã lưu cấu hình.
              </span>
            )}
            <button
              type="submit"
              disabled={busy || (!form.formState.isDirty && !exerciseDirty)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="size-3.5" />
              <span>{busy ? "Đang lưu…" : "Lưu cấu hình"}</span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
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

const card = "space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-5 dark:border-slate-800 dark:bg-slate-900/40";

function Intro({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function TabButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: typeof Settings2; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
        active
          ? "border-[#0066FF] text-[#0066FF] dark:text-blue-400 dark:border-blue-400"
          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
      <span className="block">{label}</span>
      {children}
      <FieldError message={error} />
    </label>
  );
}
