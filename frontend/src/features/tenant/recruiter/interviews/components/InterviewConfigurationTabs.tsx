import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, RotateCcw, Save, Settings2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { type AiInterviewConfig, type InterviewProcessConfig } from "@/api/types/aiInterview";
import { AssessmentError, FieldError, assessmentInput, assessmentMuted } from "@/components/ux/assessmentUi";
import { useT } from "@/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { createAiInterviewConfigSchema, toFormValues, toRequest, type ConfigValues } from "../utils/aiInterviewConfigSchema";
import { ExerciseStructureConfigurator } from "./ExerciseStructureConfigurator";
import {
  createConversationAssessmentSchema,
  defaultProcesses,
  getAssessmentCriteria,
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
  const t = useT();
  const [internalTab, setInternalTab] = useState<Tab>("general");
  const tab = activeSubTab ?? internalTab;
  const setTab = (nextTab: Tab) => {
    setInternalTab(nextTab);
    onSubTabChange?.(nextTab);
  };

  const schema = useMemo(() => createAiInterviewConfigSchema(t), [t]);
  const assessmentSchema = useMemo(() => createConversationAssessmentSchema(t), [t]);
  const criteria = useMemo(() => getAssessmentCriteria(t), [t]);

  const client = useQueryClient();
  const form = useForm<ConfigValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(config) });
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
  const assessmentValidation = assessmentSchema.safeParse(communication.config);
  const totalWeight = criteria.reduce((total, criterion) => total + (Number(communication.config[criterion.key]) || 0), 0);

  const save = useMutation({
    mutationFn: (values: ConfigValues) => aiInterviewApi.saveConfig(jobId, request(values, processesRef.current)),
    onMutate: () => setSaveMessage(t("recruiter.interviews.ai.configTabs.savingAll")),
    onSuccess: saved => {
      form.reset(toFormValues(saved));
      if (saved.policy.processes) { processesRef.current = saved.policy.processes; setProcesses(saved.policy.processes); }
      setExerciseDirty(false);
      setSaveMessage(t("recruiter.interviews.ai.configTabs.savedSuccess"));
      void client.invalidateQueries({ queryKey: ["ai-interview-config", jobId] });
      void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
    },
    onError: () => setSaveMessage(t("recruiter.interviews.ai.configTabs.saveError")),
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
    setSaveMessage(firstValidationMessage(errors) ?? t("recruiter.interviews.ai.configTabs.invalidConfigFallback"));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(values => {
        if (!assessmentValidation.success) {
          setTab(["maxFollowUp", "questionCount"].includes(String(assessmentValidation.error.issues[0].path[0])) ? "exercise" : "general");
          setSaveMessage(assessmentValidation.error.issues[0].message);
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
              {tab === "general" ? t("recruiter.interviews.ai.configTabs.generalTitle") : t("recruiter.interviews.ai.configTabs.exerciseTitle")}
            </h2>
            <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
              {tab === "general"
                ? t("recruiter.interviews.ai.configTabs.generalDesc")
                : t("recruiter.interviews.ai.configTabs.exerciseDesc")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25">
              {t("recruiter.interviews.ai.configTabs.durationSummary", {
                minutes: interviewDurationMinutes(processes),
                count: processCount(processes),
              })}
            </span>
            <button
              type="button"
              onClick={() => {
                form.reset(toFormValues(config));
                setProcesses(normalizeProcesses(config.policy.processes ?? defaultProcesses()));
                setExerciseDirty(false);
              }}
              disabled={!form.formState.isDirty && !exerciseDirty}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>{t("recruiter.interviews.ai.configTabs.restore")}</span>
            </button>
            <button
              type="submit"
              disabled={busy || (!form.formState.isDirty && !exerciseDirty)}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>{busy ? t("recruiter.interviews.ai.configTabs.saving") : t("recruiter.interviews.ai.configTabs.saveConfig")}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto scrollbar-none" role="tablist" aria-label={t("recruiter.interviews.ai.configTabs.tablistAria")}>
          <TabButton active={tab === "general"} label={t("recruiter.interviews.ai.configTabs.tabGeneral")} icon={Settings2} onClick={() => setTab("general")} />
          <TabButton active={tab === "exercise"} label={t("recruiter.interviews.ai.configTabs.tabExercise")} icon={ClipboardList} onClick={() => setTab("exercise")} />
        </div>
      )}

      {tab === "general" && (
        <div role="tabpanel" className="space-y-5">
          <Intro
            title={t("recruiter.interviews.ai.configTabs.introTitle")}
            description={t("recruiter.interviews.ai.configTabs.introDesc")}
          />

          <fieldset className={card}>
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t("recruiter.interviews.ai.configTabs.sessionSettingsLegend")}
            </legend>
            <label className="mb-2 flex min-h-10 items-center gap-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input type="checkbox" className="size-4 accent-[var(--color-primary)] rounded cursor-pointer" {...form.register("enabled")} disabled={busy} />
              {t("recruiter.interviews.ai.configTabs.enableAiInterview")}
            </label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t("recruiter.interviews.ai.configTabs.passingScoreLabel")} error={form.formState.errors.passingScore?.message}>
                <input className={assessmentInput} type="number" min={0} max={100} {...form.register("passingScore")} />
              </Field>
              <Field label={t("recruiter.interviews.ai.configTabs.availabilityModeLabel")}>
                <select className={assessmentInput} disabled={busy} {...form.register("policy.availability.mode")}>
                  <option value="RELATIVE">{t("recruiter.interviews.ai.configTabs.modeRelative")}</option>
                  <option value="ABSOLUTE">{t("recruiter.interviews.ai.configTabs.modeAbsolute")}</option>
                </select>
              </Field>
              {availabilityMode === "RELATIVE" ? (
                <>
                  <Field label={t("recruiter.interviews.ai.configTabs.startDelayLabel")} error={form.formState.errors.policy?.availability?.startDelayHours?.message}>
                    <input className={assessmentInput} type="number" min={0} max={8760} step={1} disabled={busy} {...form.register("policy.availability.startDelayHours")} />
                    <span className={assessmentMuted}>{t("recruiter.interviews.ai.configTabs.startDelayHint")}</span>
                  </Field>
                  <Field label={t("recruiter.interviews.ai.configTabs.completionWindowLabel")} error={form.formState.errors.policy?.availability?.completionWindowHours?.message}>
                    <input className={assessmentInput} type="number" min={1} max={8760} step={1} disabled={busy} {...form.register("policy.availability.completionWindowHours")} />
                    <span className={assessmentMuted}>{t("recruiter.interviews.ai.configTabs.completionWindowHint")}</span>
                  </Field>
                </>
              ) : (
                <>
                  <Field label={t("recruiter.interviews.ai.configTabs.availableFromLabel")} error={form.formState.errors.availableFrom?.message}>
                    <input className={assessmentInput} type="datetime-local" disabled={busy} {...form.register("availableFrom")} />
                  </Field>
                  <Field label={t("recruiter.interviews.ai.configTabs.availableUntilLabel")} error={form.formState.errors.availableUntil?.message}>
                    <input className={assessmentInput} type="datetime-local" disabled={busy} {...form.register("availableUntil")} />
                  </Field>
                </>
              )}
              <Field label={t("recruiter.interviews.ai.configTabs.maxAttemptsLabel")}>
                <input className={assessmentInput} type="number" min={1} max={5} {...form.register("policy.maxAttempts")} />
              </Field>
            </div>
            {availabilityMode === "RELATIVE" && (
              <p role="status" className={assessmentMuted}>
                {t("recruiter.interviews.ai.configTabs.relativeSummary", {
                  when:
                    Number(startDelayHours) === 0
                      ? t("recruiter.interviews.ai.configTabs.relativeImmediately")
                      : t("recruiter.interviews.ai.configTabs.relativeAfterHours", { hours: startDelayHours ?? "…" }),
                  window: completionWindowHours ?? "…",
                })}
              </p>
            )}
          </fieldset>

          <fieldset className={card}>
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t("recruiter.interviews.ai.configTabs.criteriaLegend")}
            </legend>
            <p className={assessmentMuted}>
              {t("recruiter.interviews.ai.configTabs.criteriaDesc")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {criteria.map(criterion => (
                <div key={criterion.key} className="space-y-1">
                  <Field
                    label={t("recruiter.interviews.ai.configTabs.criterionPercentLabel", { label: criterion.label })}
                    error={!assessmentValidation.success ? assessmentValidation.error.issues.find(issue => issue.path[0] === criterion.key)?.message : undefined}
                  >
                    <input
                      className={assessmentInput}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      disabled={busy}
                      value={Number.isNaN(Number(communication.config[criterion.key])) ? "" : Number(communication.config[criterion.key])}
                      aria-invalid={!assessmentValidation.success && assessmentValidation.error.issues.some(issue => issue.path[0] === criterion.key)}
                      onChange={event => updateAssessment(criterion.key, event.target.valueAsNumber)}
                    />
                  </Field>
                  <p className={assessmentMuted}>{criterion.description}</p>
                </div>
              ))}
            </div>
            <p role="status" className={totalWeight === 100 ? assessmentMuted : "text-xs font-semibold text-rose-600 dark:text-rose-400"}>
              {t("recruiter.interviews.ai.configTabs.totalWeightLabel", { total: totalWeight })}
              {totalWeight !== 100 && t("recruiter.interviews.ai.configTabs.totalWeightMustEqual")}
            </p>
            <Field label={t("recruiter.interviews.ai.configTabs.assessmentFocusLabel")} error={!assessmentValidation.success ? assessmentValidation.error.issues.find(issue => issue.path[0] === "assessmentFocus")?.message : undefined}>
              <textarea
                className={cn(assessmentInput, "min-h-24 resize-y")}
                rows={4}
                maxLength={2000}
                disabled={busy}
                value={String(communication.config.assessmentFocus ?? "")}
                placeholder={t("recruiter.interviews.ai.configTabs.assessmentFocusPlaceholder")}
                onChange={event => updateAssessment("assessmentFocus", event.target.value)}
              />
            </Field>
            <p className={assessmentMuted}>{t("recruiter.interviews.ai.configTabs.assessmentFocusHint")}</p>
          </fieldset>

          <fieldset className={card}>
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t("recruiter.interviews.ai.configTabs.jobSkillsLegend")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {jobSkills.map(skill => (
                <label
                  key={skill}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-soft)] has-[:checked]:text-[var(--color-primary-hover)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--color-primary)] rounded"
                    checked={form.watch("policy.selectedSkills").includes(skill)}
                    onChange={() => {
                      const selected = form.getValues("policy.selectedSkills");
                      form.setValue("policy.selectedSkills", selected.includes(skill) ? selected.filter(item => item !== skill) : [...selected, skill], { shouldDirty: true });
                    }}
                  />
                  {skill}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      <div className={tab === "exercise" ? undefined : "hidden"} aria-hidden={tab !== "exercise"}>
        <ExerciseStructureConfigurator jobSkills={form.watch("policy.selectedSkills")} processes={processes} onChange={updateProcesses} />
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
          <p className={assessmentMuted}>{t("recruiter.interviews.ai.configTabs.configAppliesNewOnly")}</p>
          <div className="flex items-center gap-3">
            {save.isSuccess && !form.formState.isDirty && !exerciseDirty && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {t("recruiter.interviews.ai.configTabs.savedShort")}
              </span>
            )}
            <button
              type="submit"
              disabled={busy || (!form.formState.isDirty && !exerciseDirty)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="size-3.5" />
              <span>{busy ? t("recruiter.interviews.ai.configTabs.saving") : t("recruiter.interviews.ai.configTabs.saveConfig")}</span>
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
    <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)]/70 p-4">
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
          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
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
