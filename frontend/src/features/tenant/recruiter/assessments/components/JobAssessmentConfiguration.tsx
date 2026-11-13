import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Plus, Settings2, Trash2, AlertCircle, Code2, FileText, ListChecks, Sliders, Check, CheckCircle2, Scale, BookOpen, GitCompare, Network, AlertTriangle, HelpCircle, Clock, RotateCcw, Save, Sparkles, Target, Zap } from "lucide-react";
import { assessmentGenerationApi } from "@/api/tenant/assessmentGenerationApi";
import type { AssessmentConfiguration, RubricCriterionConfig } from "@/api/types/assessmentGeneration";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { useT, type TranslateFn } from "@/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

function createConfigSchema(t: TranslateFn) {
  const rubricCriterionSchema = z.object({
    name: z.string().trim().min(1, t("recruiter.assessments.config.validation.criterionNameRequired")),
    weight: z
      .number()
      .int()
      .min(1, t("recruiter.assessments.config.validation.min1Percent"))
      .max(100, t("recruiter.assessments.config.validation.max100Percent")),
    guide: z.string().trim().optional(),
  });

  return z
    .object({
      objectiveDurationMinutes: z.number().int().min(1).nullable().optional(),
      durationMinutes: z
        .number()
        .int()
        .min(1, t("recruiter.assessments.config.validation.min1Minute"))
        .max(480, t("recruiter.assessments.config.validation.max480Minutes")),
      passingPercent: z
        .number()
        .int()
        .min(0)
        .max(100, t("recruiter.assessments.config.validation.max100Passing")),
      autoAssign: z.boolean(),
      autoGradingEnabled: z.boolean().optional(),
      sections: z
        .array(
          z.object({
            skill: z.string().trim().min(1, t("recruiter.assessments.config.validation.selectJobSkill")),
            questionType: z.enum(["MCQ", "MULTIPLE_CHOICE", "ESSAY", "CODING"]),
            difficulty: z.enum(["Easy", "Medium", "Hard"]),
            count: z.number().int().min(1, t("recruiter.assessments.config.validation.min1Question")).max(100),
            points: z.number().int().min(1, t("recruiter.assessments.config.validation.min1Point")).max(10000),
          }),
        )
        .min(1, t("recruiter.assessments.config.validation.min1Section"))
        .max(100),
      codingTestWeightPercent: z.number().int().min(0).max(100).optional(),
      codingAiWeightPercent: z.number().int().min(0).max(100).optional(),
      essayCriteria: z.array(rubricCriterionSchema).optional(),
      essayGradingGuide: z
        .string()
        .trim()
        .max(2000, t("recruiter.assessments.config.validation.max2000Chars"))
        .optional(),
    })
    .refine((value) => value.sections.reduce((sum, row) => sum + row.count, 0) <= 100, {
      path: ["sections"],
      message: t("recruiter.assessments.config.validation.max100QuestionsTotal"),
    })
    .refine(
      (value) => {
        if (value.codingTestWeightPercent != null || value.codingAiWeightPercent != null) {
          const testW = value.codingTestWeightPercent ?? 80;
          const aiW = value.codingAiWeightPercent ?? 20;
          return testW + aiW === 100;
        }
        return true;
      },
      {
        path: ["codingTestWeightPercent"],
        message: t("recruiter.assessments.config.validation.codingWeightsMustSum100"),
      },
    )
    .refine(
      (value) => {
        if (value.essayCriteria && value.essayCriteria.length > 0) {
          const totalW = value.essayCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
          return totalW === 100;
        }
        return true;
      },
      {
        path: ["essayCriteria"],
        message: t("recruiter.assessments.config.validation.rubricWeightsMustSum100"),
      },
    );
}

function buildEssayPresets(
  t: TranslateFn,
): Record<
  string,
  {
    label: string;
    badge: string;
    description: string;
    summaryWeights: string;
    criteria: RubricCriterionConfig[];
  }
> {
  return {
    conceptual: {
      label: t("recruiter.assessments.config.presets.conceptual.label"),
      badge: t("recruiter.assessments.config.presets.conceptual.badge"),
      description: t("recruiter.assessments.config.presets.conceptual.description"),
      summaryWeights: t("recruiter.assessments.config.presets.conceptual.summaryWeights"),
      criteria: [
        {
          name: t("recruiter.assessments.config.presets.conceptual.c1Name"),
          weight: 50,
          guide: t("recruiter.assessments.config.presets.conceptual.c1Guide"),
        },
        {
          name: t("recruiter.assessments.config.presets.conceptual.c2Name"),
          weight: 30,
          guide: t("recruiter.assessments.config.presets.conceptual.c2Guide"),
        },
        {
          name: t("recruiter.assessments.config.presets.conceptual.c3Name"),
          weight: 20,
          guide: t("recruiter.assessments.config.presets.conceptual.c3Guide"),
        },
      ],
    },
    comparison: {
      label: t("recruiter.assessments.config.presets.comparison.label"),
      badge: t("recruiter.assessments.config.presets.comparison.badge"),
      description: t("recruiter.assessments.config.presets.comparison.description"),
      summaryWeights: t("recruiter.assessments.config.presets.comparison.summaryWeights"),
      criteria: [
        {
          name: t("recruiter.assessments.config.presets.comparison.c1Name"),
          weight: 30,
          guide: t("recruiter.assessments.config.presets.comparison.c1Guide"),
        },
        {
          name: t("recruiter.assessments.config.presets.comparison.c2Name"),
          weight: 40,
          guide: t("recruiter.assessments.config.presets.comparison.c2Guide"),
        },
        {
          name: t("recruiter.assessments.config.presets.comparison.c3Name"),
          weight: 30,
          guide: t("recruiter.assessments.config.presets.comparison.c3Guide"),
        },
      ],
    },
    scenario: {
      label: t("recruiter.assessments.config.presets.scenario.label"),
      badge: t("recruiter.assessments.config.presets.scenario.badge"),
      description: t("recruiter.assessments.config.presets.scenario.description"),
      summaryWeights: t("recruiter.assessments.config.presets.scenario.summaryWeights"),
      criteria: [
        {
          name: t("recruiter.assessments.config.presets.scenario.c1Name"),
          weight: 30,
          guide: t("recruiter.assessments.config.presets.scenario.c1Guide"),
        },
        {
          name: t("recruiter.assessments.config.presets.scenario.c2Name"),
          weight: 40,
          guide: t("recruiter.assessments.config.presets.scenario.c2Guide"),
        },
        {
          name: t("recruiter.assessments.config.presets.scenario.c3Name"),
          weight: 30,
          guide: t("recruiter.assessments.config.presets.scenario.c3Guide"),
        },
      ],
    },
    architecture: {
      label: t("recruiter.assessments.config.presets.architecture.label"),
      badge: t("recruiter.assessments.config.presets.architecture.badge"),
      description: t("recruiter.assessments.config.presets.architecture.description"),
      summaryWeights: t("recruiter.assessments.config.presets.architecture.summaryWeights"),
      criteria: [
        {
          name: t("recruiter.assessments.config.presets.architecture.c1Name"),
          weight: 40,
          guide: t("recruiter.assessments.config.presets.architecture.c1Guide"),
        },
        {
          name: t("recruiter.assessments.config.presets.architecture.c2Name"),
          weight: 35,
          guide: t("recruiter.assessments.config.presets.architecture.c2Guide"),
        },
        {
          name: t("recruiter.assessments.config.presets.architecture.c3Name"),
          weight: 25,
          guide: t("recruiter.assessments.config.presets.architecture.c3Guide"),
        },
      ],
    },
  };
}

const inputClass = "mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-normal text-[#101828] transition-all focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const cardClass = "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900";

export type JobAssessmentConfigProps = {
  activeSubTab?: "general" | "exercise";
  onSubTabChange?: (tab: "general" | "exercise") => void;
  hideInternalTabs?: boolean;
};

export function JobAssessmentConfiguration({
  activeSubTab,
  onSubTabChange,
  hideInternalTabs,
}: JobAssessmentConfigProps = {}) {
  const t = useT();
  const job = useRecruitmentJob();
  const config = useQuery({
    queryKey: [...queryKeys.assessments.all(), "configuration", job.id],
    queryFn: () => assessmentGenerationApi.configuration(job.id),
  });

  if (config.isPending) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-8 text-center">
        <div className="size-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.config.loadingConfig")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AssessmentError error={config.error} retry={() => void config.refetch()} />
      {config.isSuccess && (
        <ConfigurationForm
          initial={config.data}
          activeSubTab={activeSubTab}
          onSubTabChange={onSubTabChange}
          hideInternalTabs={hideInternalTabs}
        />
      )}
    </div>
  );
}

export function ConfigurationForm({
  initial,
  activeSubTab,
  onSubTabChange,
  hideInternalTabs,
}: {
  initial: AssessmentConfiguration | null;
  activeSubTab?: "general" | "exercise";
  onSubTabChange?: (tab: "general" | "exercise") => void;
  hideInternalTabs?: boolean;
}) {
  const t = useT();
  const schema = useMemo(() => createConfigSchema(t), [t]);
  const essayPresets = useMemo(() => buildEssayPresets(t), [t]);
  const defaultEssayCriteria = essayPresets.conceptual.criteria;
  const quickAiTags = [
    t("recruiter.assessments.config.quickAiTags.acceptEnglish"),
    t("recruiter.assessments.config.quickAiTags.preferRealExamples"),
    t("recruiter.assessments.config.quickAiTags.requireTradeoff"),
    t("recruiter.assessments.config.quickAiTags.ignoreMinorTypos"),
    t("recruiter.assessments.config.quickAiTags.emphasizeSecurity"),
  ];
  const job = useRecruitmentJob();
  const jobSkills = job?.skills ?? [];
  const client = useQueryClient();
  const navigate = useNavigate();
  const [internalTab, setInternalTab] = useState<"general" | "exercise">("general");

  const tab = activeSubTab ?? internalTab;
  const setTab = onSubTabChange ?? setInternalTab;

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<AssessmentConfiguration>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          ...initial,
          autoGradingEnabled: initial.autoGradingEnabled ?? false,
          sections: initial.sections && initial.sections.length > 0
            ? initial.sections
            : [{ skill: jobSkills[0]?.name ?? "", questionType: "MCQ", difficulty: "Easy", count: 5, points: 2 }],
          codingTestWeightPercent: initial.codingTestWeightPercent ?? 80,
          codingAiWeightPercent: initial.codingAiWeightPercent ?? 20,
          essayCriteria: initial.essayCriteria && initial.essayCriteria.length > 0 ? initial.essayCriteria : defaultEssayCriteria,
          essayGradingGuide: initial.essayGradingGuide ?? "",
        }
      : {
          durationMinutes: 30,
          objectiveDurationMinutes: null,
          passingPercent: 70,
          autoAssign: true,
          autoGradingEnabled: false,
          sections: [{ skill: jobSkills[0]?.name ?? "", questionType: "MCQ", difficulty: "Easy", count: 5, points: 2 }],
          codingTestWeightPercent: 80,
          codingAiWeightPercent: 20,
          essayCriteria: defaultEssayCriteria,
          essayGradingGuide: "",
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "sections" });
  const {
    fields: rubricFields,
    append: appendRubric,
    remove: removeRubric,
    replace: replaceRubric,
  } = useFieldArray({ control, name: "essayCriteria" });

  const sections = watch("sections") || [];
  const count = sections.reduce((sum, row) => sum + (Number(row?.count) || 0), 0);
  const total = sections.reduce((sum, row) => sum + (Number(row?.count) || 0) * (Number(row?.points) || 0), 0);
  const [exerciseFilter, setExerciseFilter] = useState<"ALL" | "MCQ" | "ESSAY" | "CODING">("MCQ");

  const passingPercent = watch("passingPercent") ?? 70;
  const autoAssign = watch("autoAssign");
  const autoGradingEnabled = watch("autoGradingEnabled");
  const minRequiredPoints = Math.ceil((total * (Number(passingPercent) || 0)) / 100);

  const handleReset = () => {
    reset();
    toast.info(t("recruiter.assessments.config.resetInfoToast"));
  };

  const handleAddAiTag = (tag: string) => {
    const current = getValues("essayGradingGuide") || "";
    const cleanTag = tag.replace(/^\+\s*/, "");
    if (current.includes(cleanTag)) return;
    const next = current.trim() ? `${current.trim()}; ${cleanTag}` : cleanTag;
    setValue("essayGradingGuide", next, { shouldDirty: true });
  };

  const watchedEssayCriteria = watch("essayCriteria") || [];
  const totalRubricWeight = watchedEssayCriteria.reduce((sum, c) => sum + (Number(c?.weight) || 0), 0);
  const codingTestWeight = watch("codingTestWeightPercent") ?? 80;
  const codingAiWeight = watch("codingAiWeightPercent") ?? 20;

  const handleCodingTestWeightChange = (newTestVal: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newTestVal)));
    setValue("codingTestWeightPercent", clamped, { shouldValidate: true });
    setValue("codingAiWeightPercent", 100 - clamped, { shouldValidate: true });
  };

  const handleCodingAiWeightChange = (newAiVal: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newAiVal)));
    setValue("codingAiWeightPercent", clamped, { shouldValidate: true });
    setValue("codingTestWeightPercent", 100 - clamped, { shouldValidate: true });
  };

  const mcqItems = fields
    .map((field, index) => ({ field, index, section: sections[index] }))
    .filter(({ section }) => !section || section.questionType === "MCQ" || section.questionType === "MULTIPLE_CHOICE");

  const essayItems = fields
    .map((field, index) => ({ field, index, section: sections[index] }))
    .filter(({ section }) => section?.questionType === "ESSAY");

  const codingItems = fields
    .map((field, index) => ({ field, index, section: sections[index] }))
    .filter(({ section }) => section?.questionType === "CODING");

  const mcqCount = mcqItems.reduce((sum, item) => sum + (Number(item.section?.count) || 0), 0);
  const mcqPoints = mcqItems.reduce((sum, item) => sum + (Number(item.section?.count) || 0) * (Number(item.section?.points) || 0), 0);
  const mcqPercent = total ? Math.round((mcqPoints / total) * 10000) / 100 : 0;

  const essayCount = essayItems.reduce((sum, item) => sum + (Number(item.section?.count) || 0), 0);
  const essayPoints = essayItems.reduce((sum, item) => sum + (Number(item.section?.count) || 0) * (Number(item.section?.points) || 0), 0);
  const essayPercent = total ? Math.round((essayPoints / total) * 10000) / 100 : 0;

  const codingCount = codingItems.reduce((sum, item) => sum + (Number(item.section?.count) || 0), 0);
  const codingPoints = codingItems.reduce((sum, item) => sum + (Number(item.section?.count) || 0) * (Number(item.section?.points) || 0), 0);
  const codingPercent = total ? Math.round((codingPoints / total) * 10000) / 100 : 0;

  const mutation = useMutation({
    mutationFn: async ({ data, generate }: { data: AssessmentConfiguration; generate: boolean }) => {
      await assessmentGenerationApi.save(job.id, data);
      return generate ? assessmentGenerationApi.generate(job.id) : null;
    },
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      if (result) {
        navigate(`/recruiter/jobs/${job.id}/assessments/${result.id}`);
      } else {
        toast.success(
          t("recruiter.assessments.config.savedConfigSuccessTitle"),
          t("recruiter.assessments.config.savedConfigSuccessDesc"),
        );
      }
    },
  });

  const save = (generate: boolean) =>
    handleSubmit(
      (data) => {
        mutation.mutate({ data, generate });
      },
      (invalid) => {
        const nextTab = invalid.sections ? "exercise" : "general";
        setTab(nextTab);
      },
    );

  return (
    <form noValidate onSubmit={save(false)} className="space-y-6">
      <div className={cardClass}>
        {hideInternalTabs ? (
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-[#101828] dark:text-white">
                {tab === "general"
                  ? t("recruiter.assessments.config.generalSettingsTitle")
                  : t("recruiter.assessments.config.exerciseStructureTitle")}
              </h2>
              <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
                {tab === "general"
                  ? t("recruiter.assessments.config.generalSettingsSubtitle")
                  : t("recruiter.assessments.config.exerciseStructureSubtitle")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25">
                {t("recruiter.assessments.config.totalSummaryPrefix", { count, points: total })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={!isDirty || mutation.isPending}
                title={t("recruiter.assessments.config.resetTooltip")}
                className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t("recruiter.assessments.config.resetBtn")}</span>
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={mutation.isPending || !jobSkills.length}
                className="gap-1.5"
              >
                <Save className="size-3.5" aria-hidden="true" />
                {mutation.isPending
                  ? t("recruiter.assessments.common.actions.saving")
                  : t("recruiter.assessments.config.saveConfigBtn")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#101828] dark:text-white">{t("recruiter.assessments.config.assessmentConfigHeading")}</h2>
                <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
                  {t("recruiter.assessments.config.assessmentConfigSubtitle")}
                  <strong className="text-[#101828] dark:text-white">{job.title}</strong>.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">
                  {t("recruiter.assessments.config.totalSummaryShort", { count, points: total })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={!isDirty || mutation.isPending}
                  className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("recruiter.assessments.config.resetBtn")}</span>
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={mutation.isPending || !jobSkills.length}
                  className="gap-1.5"
                >
                  <Save className="size-3.5" aria-hidden="true" />
                  {mutation.isPending
                    ? t("recruiter.assessments.common.actions.saving")
                    : t("recruiter.assessments.config.saveConfigBtn")}
                </Button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="mb-6 flex gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-800" role="tablist" aria-label={t("recruiter.assessments.config.assessmentConfigHeading")}>
              {([
                { id: "general", label: t("recruiter.assessments.config.generalSettingsTitle"), icon: Settings2 },
                { id: "exercise", label: t("recruiter.assessments.config.exerciseStructureTitle"), icon: ClipboardList },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  id={`assessment-config-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  aria-controls={`assessment-config-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all",
                    tab === item.id
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] font-semibold shadow-2xs"
                      : "text-[#667085] hover:bg-slate-50 hover:text-[#101828] dark:text-slate-400 dark:hover:bg-slate-800",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Tab 1: Cấu hình chung */}
        <div
          id="assessment-config-general"
          role="tabpanel"
          aria-labelledby="assessment-config-tab-general"
          hidden={tab !== "general"}
          className="space-y-6"
        >
          {!jobSkills.length && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3.5 text-[13px] text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60" role="alert">
              <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{t("recruiter.assessments.config.noSkillsWarning")}</span>
            </div>
          )}

          {/* Khối 1: Tiêu chuẩn đạt & Điểm số */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/25">
                <Target className="size-4" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                  {t("recruiter.assessments.config.passingSectionTitle")}
                </h3>
                <Tooltip
                  content={t("recruiter.assessments.config.passingSectionTooltip")}
                  side="top"
                >
                  <span className="inline-flex cursor-help items-center text-slate-400 hover:text-[var(--color-primary)] transition-colors">
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                  </span>
                </Tooltip>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="block text-[13px] font-semibold text-[#344054] dark:text-slate-200">
                    {t("recruiter.assessments.config.passingPercentLabel")}
                  </label>
                  <Tooltip
                    content={t("recruiter.assessments.config.passingPercentTooltip")}
                    side="top"
                  >
                    <span className="inline-flex cursor-help items-center text-slate-400 hover:text-[var(--color-primary)] transition-colors">
                      <HelpCircle className="size-3.5" aria-hidden="true" />
                    </span>
                  </Tooltip>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    {...register("passingPercent", { valueAsNumber: true })}
                    min={0}
                    max={100}
                    placeholder="70"
                    className={cn(inputClass, "pr-8 font-semibold text-base")}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    %
                  </span>
                </div>
                {errors.passingPercent && (
                  <span className="text-xs text-[var(--color-error)]">{errors.passingPercent.message}</span>
                )}
              </div>

              {/* Box Preview điểm đạt trực quan */}
              <div className="flex flex-col justify-between rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-primary-hover)]">
                    {t("recruiter.assessments.config.passingPreviewTitle")}
                  </span>
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-primary-hover)]">
                    {passingPercent}%
                  </span>
                </div>
                <div className="my-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[var(--color-primary)]">
                      {minRequiredPoints}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t("recruiter.assessments.config.passingPreviewDenominator", { total })}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-primary)]/20">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, Number(passingPercent) || 0))}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--color-primary-hover)]/85">
                  {t("recruiter.assessments.config.passingPreviewPrefix")}
                  <strong>{t("recruiter.assessments.config.passingPreviewPoints", { points: minRequiredPoints })}</strong>
                  {t("recruiter.assessments.config.passingPreviewSuffix")}
                </p>
              </div>
            </div>
          </div>

          {/* Khối 2: Quản lý thời lượng làm bài */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                <Clock className="size-4" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                  {t("recruiter.assessments.config.timeLimitSectionTitle")}
                </h3>
                <Tooltip
                  content={t("recruiter.assessments.config.timeLimitSectionTooltip")}
                  side="top"
                >
                  <span className="inline-flex cursor-help items-center text-slate-400 hover:text-amber-600 transition-colors">
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                  </span>
                </Tooltip>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="block text-[13px] font-semibold text-[#344054] dark:text-slate-200">
                    {t("recruiter.assessments.config.totalDurationLabel")}
                  </label>
                  <Tooltip
                    content={t("recruiter.assessments.config.totalDurationTooltip")}
                    side="top"
                  >
                    <span className="inline-flex cursor-help items-center text-slate-400 hover:text-amber-600 transition-colors">
                      <HelpCircle className="size-3.5" aria-hidden="true" />
                    </span>
                  </Tooltip>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    {...register("durationMinutes", { valueAsNumber: true })}
                    min={1}
                    max={480}
                    placeholder="45"
                    className={cn(inputClass, "pr-14 font-semibold text-base")}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    {t("recruiter.assessments.common.minutesUnit")}
                  </span>
                </div>
                {errors.durationMinutes && (
                  <span className="text-xs text-[var(--color-error)]">{errors.durationMinutes.message}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="block text-[13px] font-semibold text-[#344054] dark:text-slate-200">
                      {t("recruiter.assessments.config.objectiveDurationLabel")}
                    </label>
                    <Tooltip
                      content={t("recruiter.assessments.config.objectiveDurationTooltip")}
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-amber-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">{t("recruiter.assessments.common.optional")}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    {...register("objectiveDurationMinutes", {
                      setValueAs: (value) => (value === "" || value == null ? null : Number(value)),
                    })}
                    placeholder={t("recruiter.assessments.config.objectiveDurationPlaceholder")}
                    className={cn(inputClass, "pr-14 font-semibold text-base")}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    {t("recruiter.assessments.common.minutesUnit")}
                  </span>
                </div>
                {errors.objectiveDurationMinutes && (
                  <span className="text-xs text-[var(--color-error)]">{errors.objectiveDurationMinutes.message}</span>
                )}
              </div>
            </div>
          </div>

          {/* Khối 3: Quy tắc giao đề tự động (Automation) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                <Zap className="size-4" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                  {t("recruiter.assessments.config.automationSectionTitle")}
                </h3>
                <Tooltip
                  content={t("recruiter.assessments.config.automationSectionTooltip")}
                  side="top"
                >
                  <span className="inline-flex cursor-help items-center text-slate-400 hover:text-emerald-600 transition-colors">
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                  </span>
                </Tooltip>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3.5 cursor-pointer min-w-0 flex-1">
                <input
                  type="checkbox"
                  {...register("autoAssign")}
                  disabled={mutation.isPending}
                  className="size-4 shrink-0 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)]"
                />
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-bold text-[#101828] dark:text-white">
                    {t("recruiter.assessments.config.autoAssignLabel")}
                  </span>
                  <Tooltip
                    content={t("recruiter.assessments.config.autoAssignTooltip")}
                    side="top"
                  >
                    <span className="inline-flex cursor-help items-center text-slate-400 hover:text-emerald-600 transition-colors">
                      <HelpCircle className="size-3.5" aria-hidden="true" />
                    </span>
                  </Tooltip>
                </div>
              </label>
              <div>
                {autoAssign ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {t("recruiter.assessments.config.autoAssignOn")}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {t("recruiter.assessments.config.autoAssignOff")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Khối 4: Quy tắc chấm đề & Giao kết quả (Grading & Result Publishing) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/25">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                  {t("recruiter.assessments.config.gradingSectionTitle")}
                </h3>
                <Tooltip
                  content={t("recruiter.assessments.config.gradingSectionTooltip")}
                  side="top"
                >
                  <span className="inline-flex cursor-help items-center text-slate-400 hover:text-[var(--color-primary)] transition-colors">
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                  </span>
                </Tooltip>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-start gap-3.5 cursor-pointer min-w-0 flex-1">
                <input
                  type="checkbox"
                  {...register("autoGradingEnabled")}
                  disabled={mutation.isPending}
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)]"
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#101828] dark:text-white">
                      {t("recruiter.assessments.config.autoGradingLabel")}
                    </span>
                    <Tooltip
                      content={t("recruiter.assessments.config.autoGradingTooltip")}
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-[var(--color-primary)] transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    {autoGradingEnabled
                      ? t("recruiter.assessments.config.autoGradingOnDesc")
                      : t("recruiter.assessments.config.autoGradingOffDesc")}
                  </p>
                </div>
              </label>
              <div className="shrink-0 self-start sm:self-center">
                {autoGradingEnabled ? (
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25">
                    {t("recruiter.assessments.config.autoGradingOnBadge")}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {t("recruiter.assessments.config.autoGradingOffBadge")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab 2: Cấu hình bài tập */}
        <div
          id="assessment-config-exercise"
          role="tabpanel"
          aria-labelledby="assessment-config-tab-exercise"
          hidden={tab !== "exercise"}
          className="space-y-4"
        >
          {/* Tổng quan phân bổ cơ cấu bài tập & Bộ lọc 3 phần thi */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {([
                {
                  id: "MCQ" as const,
                  label: t("recruiter.assessments.common.questionTypes.quiz"),
                  count: mcqCount,
                  suffix: t("recruiter.assessments.common.questionsUnit"),
                  points: mcqPoints,
                  percent: mcqPercent,
                  icon: ListChecks,
                  iconClass: "text-[var(--color-primary)]",
                  iconBg: "bg-[var(--color-primary-soft)] border-[var(--color-primary)]/25",
                  badgeClass: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] border-[var(--color-primary)]/25",
                  activeBorder: "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/40",
                },
                {
                  id: "ESSAY" as const,
                  label: t("recruiter.assessments.common.questionTypes.essayTheory"),
                  count: essayCount,
                  suffix: t("recruiter.assessments.common.questionsUnit"),
                  points: essayPoints,
                  percent: essayPercent,
                  icon: FileText,
                  iconClass: "text-amber-600 dark:text-amber-400",
                  iconBg: "bg-amber-50 border-amber-200/60 dark:bg-amber-950 dark:border-amber-800",
                  badgeClass: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950 dark:text-amber-300",
                  activeBorder: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-400",
                },
                {
                  id: "CODING" as const,
                  label: t("recruiter.assessments.common.questionTypes.codingEssay"),
                  count: codingCount,
                  suffix: t("recruiter.assessments.common.exercisesUnit"),
                  points: codingPoints,
                  percent: codingPercent,
                  icon: Code2,
                  iconClass: "text-emerald-600 dark:text-emerald-400",
                  iconBg: "bg-emerald-50 border-emerald-200/60 dark:bg-emerald-950 dark:border-emerald-800",
                  badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300",
                  activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-400",
                },
              ]).map((item) => {
                const Icon = item.icon;
                const isSelected = exerciseFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExerciseFilter(item.id)}
                    className={cn(
                      "flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer",
                      isSelected
                        ? item.activeBorder
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", item.iconBg)}>
                          <Icon className={cn("size-4", item.iconClass)} />
                        </span>
                        <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {item.label}
                        </span>
                      </div>
                      <span className={cn("shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs font-bold", item.badgeClass)}>
                        {item.percent}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.count} {item.suffix}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {item.points} {t("recruiter.assessments.common.pointsUnit")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {exerciseFilter !== "ALL" ? (
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {t("recruiter.assessments.config.showingFilterPrefix")}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {exerciseFilter === "MCQ"
                      ? t("recruiter.assessments.common.questionTypes.quiz")
                      : exerciseFilter === "ESSAY"
                        ? t("recruiter.assessments.common.questionTypes.essayTheory")
                        : t("recruiter.assessments.common.questionTypes.codingEssay")}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setExerciseFilter("ALL")}
                  className="font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                >
                  {t("recruiter.assessments.config.showAllThreeSections")}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{t("recruiter.assessments.config.showingAllThreeSections")}</span>
                <button
                  type="button"
                  onClick={() => setExerciseFilter("MCQ")}
                  className="font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                >
                  {t("recruiter.assessments.config.showOnlyMcq")}
                </button>
              </div>
            )}
          </div>

          {/* 1. KHỐI TRẮC NGHIỆM */}
          {(exerciseFilter === "ALL" || exerciseFilter === "MCQ") && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/25">
                    <ListChecks className="size-4" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t("recruiter.assessments.common.questionTypes.quiz")}
                    </h4>
                    <Tooltip
                      content={t("recruiter.assessments.config.mcqTooltip")}
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-[var(--color-primary)] transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <span className="rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25">
                  {t("recruiter.assessments.config.sectionSummaryQuestions", { count: mcqCount, points: mcqPoints, percent: mcqPercent })}
                </span>
              </div>

              {mcqItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                  {t("recruiter.assessments.config.noMcqGroups")}
                </div>
              ) : (
                <div className="space-y-3">
                  {mcqItems.map(({ field, index }, groupOrder) => (
                    <fieldset
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center justify-between pb-2">
                        <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <span className="size-2 rounded-full bg-[var(--color-primary)]" />
                          {t("recruiter.assessments.config.mcqGroupTitle", { index: groupOrder + 1 })}
                        </legend>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-[var(--color-primary-soft)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25">
                            {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} {t("recruiter.assessments.common.pointsShort")}
                          </span>
                          <button
                            type="button"
                            disabled={fields.length === 1 || mutation.isPending}
                            onClick={() => remove(index)}
                            aria-label={t("recruiter.assessments.config.deleteMcqGroupAria", { index: groupOrder + 1 })}
                            className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          {t("recruiter.assessments.config.skillColLabel")}
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">{t("recruiter.assessments.config.selectSkillOption")}</option>
                            {jobSkills.map((skill) => (
                              <option key={skill.skillId} value={skill.name}>
                                {skill.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t("recruiter.assessments.config.questionFormatColLabel")}
                          <select {...register(`sections.${index}.questionType`)} className={inputClass}>
                            <option value="MCQ">{t("recruiter.assessments.common.questionTypes.singleChoice")}</option>
                            <option value="MULTIPLE_CHOICE">{t("recruiter.assessments.common.questionTypes.multipleChoice")}</option>
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t("recruiter.assessments.config.difficultyColLabel")}
                          <select {...register(`sections.${index}.difficulty`)} className={inputClass}>
                            <option value="Easy">{t("recruiter.assessments.common.difficulty.easyLabel")}</option>
                            <option value="Medium">{t("recruiter.assessments.common.difficulty.mediumLabel")}</option>
                            <option value="Hard">{t("recruiter.assessments.common.difficulty.hardLabel")}</option>
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t("recruiter.assessments.config.countColLabel")}
                          <input
                            type="number"
                            min={1}
                            max={100}
                            {...register(`sections.${index}.count`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t("recruiter.assessments.config.pointsPerQuestionLabel")}
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            {...register(`sections.${index}.points`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      {errors.sections?.[index] && (
                        <p className="mt-2 text-xs text-[var(--color-error)]">
                          {errors.sections?.[index]?.skill?.message ??
                            errors.sections?.[index]?.count?.message ??
                            errors.sections?.[index]?.points?.message}
                        </p>
                      )}
                    </fieldset>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={fields.length >= 100 || mutation.isPending}
                onClick={() =>
                  append({
                    skill: jobSkills[0]?.name ?? "",
                    questionType: "MCQ",
                    difficulty: "Easy",
                    count: 1,
                    points: 1,
                  })
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-400 py-3 text-xs font-semibold text-slate-700 transition-all dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
              >
                <Plus className="size-4 text-[var(--color-primary)]" /> {t("recruiter.assessments.config.addMcqGroupBtn")}
              </button>
            </div>
          )}

          {/* 2. KHỐI TỰ LUẬN LÝ THUYẾT */}
          {(exerciseFilter === "ALL" || exerciseFilter === "ESSAY") && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
                    <FileText className="size-4" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t("recruiter.assessments.common.questionTypes.essayTheory")}
                    </h4>
                    <Tooltip
                      content={t("recruiter.assessments.config.essayTooltip")}
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-amber-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
                  {t("recruiter.assessments.config.sectionSummaryQuestions", { count: essayCount, points: essayPoints, percent: essayPercent })}
                </span>
              </div>

              {essayItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                  {t("recruiter.assessments.config.noEssayGroups")}
                </div>
              ) : (
                <div className="space-y-3">
                  {essayItems.map(({ field, index }, groupOrder) => (
                    <fieldset
                      key={field.id}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <span className="size-2 rounded-full bg-amber-500" />
                          {t("recruiter.assessments.config.essayGroupTitle", { index: groupOrder + 1 })}
                        </legend>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
                            {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} {t("recruiter.assessments.common.pointsShort")}
                          </span>
                          <button
                            type="button"
                            disabled={fields.length === 1 || mutation.isPending}
                            onClick={() => remove(index)}
                            aria-label={t("recruiter.assessments.config.deleteEssayGroupAria", { index: groupOrder + 1 })}
                            className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 1 hàng ngang (Inline Form) chứa Skill, Độ khó, Số câu, Điểm/câu */}
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 items-end">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-5">
                          <span className="text-slate-500 text-[11px] block mb-0.5">{t("recruiter.assessments.config.skillFieldLabel")}</span>
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">{t("recruiter.assessments.config.selectSkillOption")}</option>
                            {jobSkills.map((skill) => (
                              <option key={skill.skillId} value={skill.name}>
                                {skill.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-3">
                          <span className="text-slate-500 text-[11px] block mb-0.5">{t("recruiter.assessments.config.difficultyColLabel")}</span>
                          <select {...register(`sections.${index}.difficulty`)} className={inputClass}>
                            <option value="Easy">{t("recruiter.assessments.common.difficulty.easyLabel")}</option>
                            <option value="Medium">{t("recruiter.assessments.common.difficulty.mediumLabel")}</option>
                            <option value="Hard">{t("recruiter.assessments.common.difficulty.hardLabel")}</option>
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          <span className="text-slate-500 text-[11px] block mb-0.5">{t("recruiter.assessments.config.countColLabel")}</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            {...register(`sections.${index}.count`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          <span className="text-slate-500 text-[11px] block mb-0.5">{t("recruiter.assessments.config.pointsPerQuestionLabel")}</span>
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            {...register(`sections.${index}.points`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      {errors.sections?.[index] && (
                        <p className="mt-1 text-xs text-[var(--color-error)]">
                          {errors.sections?.[index]?.skill?.message ??
                            errors.sections?.[index]?.count?.message ??
                            errors.sections?.[index]?.points?.message}
                        </p>
                      )}
                    </fieldset>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={fields.length >= 100 || mutation.isPending}
                onClick={() =>
                  append({
                    skill: jobSkills[0]?.name ?? "",
                    questionType: "ESSAY",
                    difficulty: "Medium",
                    count: 1,
                    points: 5,
                  })
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-400 py-3 text-xs font-semibold text-slate-700 transition-all dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 cursor-pointer"
              >
                <Plus className="size-4 text-amber-600" /> {t("recruiter.assessments.config.addEssayGroupBtn")}
              </button>

              {/* KHỐI CẤU HÌNH TÍNH ĐIỂM TỰ LUẬN LÝ THUYẾT (AI RUBRIC ARCHETYPES) */}
              <div className="mt-5 rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5 space-y-5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h5 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <Scale className="size-4 text-[var(--color-primary)]" /> {t("recruiter.assessments.config.rubricArchetypesHeading")}
                    <Tooltip
                      content={t("recruiter.assessments.config.rubricArchetypesTooltip")}
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-[var(--color-primary)] transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </h5>
                  <span className="text-[11px] font-medium text-slate-500">
                    {t("recruiter.assessments.config.clickPresetHint")}
                  </span>
                </div>

                {/* 2. Mẫu tiêu chuẩn (Rubric Archetypes) - Grid 4 cột có Radio & Active Border xanh */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(essayPresets).map(([key, preset]) => {
                    const IconComp = key === "conceptual" ? BookOpen : key === "comparison" ? GitCompare : key === "scenario" ? AlertTriangle : Network;
                    const isMatching = watchedEssayCriteria.length === preset.criteria.length &&
                      watchedEssayCriteria[0]?.name === preset.criteria[0]?.name;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => replaceRubric(preset.criteria.map(c => ({ ...c })))}
                        className={cn(
                          "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                          isMatching
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 shadow-xs ring-2 ring-[var(--color-primary)]/20"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "flex size-7 items-center justify-center rounded-lg text-xs transition-colors",
                              isMatching ? "bg-[var(--color-primary)] text-white shadow-2xs" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            )}>
                              <IconComp className="size-3.5" />
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isMatching ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary-hover)]">
                                  <Check className="size-2.5" /> {t("recruiter.assessments.config.applyingBadge")}
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] text-slate-500 font-semibold">{preset.badge}</span>
                              )}
                              {/* Radio indicator */}
                              <span
                                className={cn(
                                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-all",
                                  isMatching
                                    ? "border-[var(--color-primary)] bg-white dark:bg-slate-900 ring-2 ring-[var(--color-primary)]/20"
                                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
                                )}
                              >
                                {isMatching && <span className="size-2 rounded-full bg-[var(--color-primary)]" />}
                              </span>
                            </div>
                          </div>
                          <h6 className={cn("text-xs font-bold leading-tight", isMatching ? "text-[var(--color-primary-hover)]" : "text-slate-800 dark:text-slate-200")}>
                            {preset.label}
                          </h6>
                          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                            {preset.description}
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-mono text-slate-500 font-medium">{preset.summaryWeights}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 1. BẢNG TIÊU CHÍ CHẤM ĐIỂM (RUBRIC MATRIX DATA TABLE) */}
                <div className="space-y-2">
                  <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                            <th className="px-3.5 py-3 font-bold w-[34%]">{t("recruiter.assessments.config.colCriterion")}</th>
                            <th className="px-3.5 py-3 font-bold w-[16%] text-center">{t("recruiter.assessments.config.colWeight")}</th>
                            <th className="px-3.5 py-3 font-bold">{t("recruiter.assessments.config.colPromptGuide")}</th>
                            <th className="px-3.5 py-3 font-bold w-12 text-center">{t("recruiter.assessments.config.colAction")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {rubricFields.map((field, rIndex) => (
                            <tr key={field.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                              {/* 1. Tiêu chí đánh giá */}
                              <td className="p-3 align-top">
                                <input
                                  {...register(`essayCriteria.${rIndex}.name`)}
                                  placeholder={t("recruiter.assessments.config.criterionPlaceholder")}
                                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-[#101828] transition-all focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                                {errors.essayCriteria?.[rIndex]?.name && (
                                  <span className="mt-1 block text-[11px] font-medium text-[var(--color-error)]">
                                    {errors.essayCriteria[rIndex]?.name?.message}
                                  </span>
                                )}
                              </td>

                              {/* 2. Trọng số (%) */}
                              <td className="p-3 align-top">
                                <div className="relative mx-auto max-w-[110px]">
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    {...register(`essayCriteria.${rIndex}.weight`, { valueAsNumber: true })}
                                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-7 text-center text-xs font-bold text-slate-900 transition-all focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                    %
                                  </span>
                                </div>
                                {errors.essayCriteria?.[rIndex]?.weight && (
                                  <span className="mt-1 block text-center text-[11px] font-medium text-[var(--color-error)]">
                                    {errors.essayCriteria[rIndex]?.weight?.message}
                                  </span>
                                )}
                              </td>

                              {/* 3. Hướng dẫn chấm cho AI */}
                              <td className="p-3 align-top">
                                <textarea
                                  rows={1}
                                  {...register(`essayCriteria.${rIndex}.guide`)}
                                  placeholder={t("recruiter.assessments.config.guidePlaceholder")}
                                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 leading-relaxed transition-all focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 resize-y min-h-[36px]"
                                />
                              </td>

                              {/* 4. Thao tác xóa */}
                              <td className="p-3 align-middle text-center">
                                <button
                                  type="button"
                                  disabled={rubricFields.length <= 1}
                                  onClick={() => removeRubric(rIndex)}
                                  title={t("recruiter.assessments.config.deleteCriterionTitle")}
                                  className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20 cursor-pointer"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-slate-200/90 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
                          <tr>
                            <td colSpan={2} className="px-3.5 py-2.5">
                              <button
                                type="button"
                                onClick={() => appendRubric({ name: "", weight: 10, guide: "" })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-all cursor-pointer"
                              >
                                <Plus className="size-3.5 text-[var(--color-primary)]" />
                                <span>{t("recruiter.assessments.config.addCriterionBtn")}</span>
                              </button>
                            </td>
                            <td colSpan={2} className="px-3.5 py-2.5 text-right">
                              <div className="inline-flex items-center gap-2">
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t("recruiter.assessments.config.totalWeightLabel")}</span>
                                <span
                                  className={cn(
                                    "font-mono font-bold text-xs px-2.5 py-1 rounded-md transition-colors",
                                    totalRubricWeight === 100
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300"
                                  )}
                                >
                                  {totalRubricWeight}% / 100% {totalRubricWeight === 100 ? t("recruiter.assessments.config.weightValidSuffix") : t("recruiter.assessments.config.weightInvalidSuffix")}
                                </span>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {errors.essayCriteria && (
                    <p className="text-xs text-[var(--color-error)] font-medium">
                      {errors.essayCriteria.message ?? errors.essayCriteria.root?.message}
                    </p>
                  )}
                </div>

                {/* 3. LƯU Ý CHO AI: Textarea tự co giãn có sẵn các Tag gợi ý nhanh */}
                <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Sparkles className="size-3.5 text-[var(--color-primary)]" />
                      {t("recruiter.assessments.config.aiGuideLabel")}
                      <Tooltip
                        content={t("recruiter.assessments.config.aiGuideTooltip")}
                        side="top"
                      >
                        <span className="inline-flex cursor-help items-center text-slate-400 hover:text-[var(--color-primary)] transition-colors">
                          <HelpCircle className="size-3.5" aria-hidden="true" />
                        </span>
                      </Tooltip>
                    </label>
                    <span className="text-[11px] text-slate-400">{t("recruiter.assessments.config.quickInsertHint")}</span>
                  </div>

                  {/* Quick Suggestion Tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {quickAiTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddAiTag(tag)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-hover)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    {...register("essayGradingGuide")}
                    placeholder={t("recruiter.assessments.config.aiGuidePlaceholder")}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 leading-relaxed transition-all focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. KHỐI TỰ LUẬN CODE */}
          {(exerciseFilter === "ALL" || exerciseFilter === "CODING") && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                    <Code2 className="size-4" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t("recruiter.assessments.common.questionTypes.codingEssay")}
                    </h4>
                    <Tooltip
                      content={t("recruiter.assessments.config.codingTooltip")}
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-emerald-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                  {t("recruiter.assessments.config.sectionSummaryExercises", { count: codingCount, points: codingPoints, percent: codingPercent })}
                </span>
              </div>

              {/* 1. Danh sách các nhóm bài tập code (Inline Form) */}
              {codingItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                  {t("recruiter.assessments.config.noCodingGroups")}
                </div>
              ) : (
                <div className="space-y-3">
                  {codingItems.map(({ field, index }, groupOrder) => (
                    <fieldset
                      key={field.id}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          {t("recruiter.assessments.config.codingGroupTitle", { index: groupOrder + 1 })}
                        </legend>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                            {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} {t("recruiter.assessments.common.pointsShort")}
                          </span>
                          <button
                            type="button"
                            disabled={fields.length === 1 || mutation.isPending}
                            onClick={() => remove(index)}
                            aria-label={t("recruiter.assessments.config.deleteCodingGroupAria", { index: groupOrder + 1 })}
                            className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 1 hàng ngang (Inline Form) chứa Skill, Độ khó, Số bài tập, Điểm/bài */}
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 items-end">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-5">
                          <span className="text-slate-500 text-[11px] block mb-0.5">{t("recruiter.assessments.config.skillFieldLabel")}</span>
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">{t("recruiter.assessments.config.selectSkillOption")}</option>
                            {jobSkills.map((skill) => (
                              <option key={skill.skillId} value={skill.name}>
                                {skill.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-3">
                          <span className="text-slate-500 text-[11px] block mb-0.5">{t("recruiter.assessments.config.difficultyColLabel")}</span>
                          <select {...register(`sections.${index}.difficulty`)} className={inputClass}>
                            <option value="Easy">{t("recruiter.assessments.common.difficulty.easyLabel")}</option>
                            <option value="Medium">{t("recruiter.assessments.common.difficulty.mediumLabel")}</option>
                            <option value="Hard">{t("recruiter.assessments.common.difficulty.hardLabel")}</option>
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          <span className="text-slate-500 text-[11px] block mb-0.5">{t("recruiter.assessments.config.exerciseCountLabel")}</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            {...register(`sections.${index}.count`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          <span className="text-slate-500 text-[11px] block mb-0.5">{t("recruiter.assessments.config.pointsPerExerciseLabel")}</span>
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            {...register(`sections.${index}.points`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      {errors.sections?.[index] && (
                        <p className="mt-1 text-xs text-[var(--color-error)]">
                          {errors.sections?.[index]?.skill?.message ??
                            errors.sections?.[index]?.count?.message ??
                            errors.sections?.[index]?.points?.message}
                        </p>
                      )}
                    </fieldset>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={fields.length >= 100 || mutation.isPending}
                onClick={() =>
                  append({
                    skill: jobSkills[0]?.name ?? "",
                    questionType: "CODING",
                    difficulty: "Medium",
                    count: 1,
                    points: 10,
                  })
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-400 py-3 text-xs font-semibold text-slate-700 transition-all dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 cursor-pointer"
              >
                <Plus className="size-4 text-emerald-600" /> {t("recruiter.assessments.config.addCodingGroupBtn")}
              </button>

              {/* 2. KHỐI PHÂN BỔ TỶ TRỌNG (SANDBOX VS AI REVIEW) - ĐẶT Ở CUỐI TRANG */}
              <div className="mt-5 rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h5 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <Sliders className="size-4 text-emerald-600" /> {t("recruiter.assessments.config.codingWeightHeading")}
                    <Tooltip
                      content={t("recruiter.assessments.config.codingWeightTooltip")}
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-emerald-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </h5>

                  {/* Thao tác nhanh (Presets) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500 mr-0.5">{t("recruiter.assessments.config.quickPresetsLabel")}</span>
                    {[
                      { label: "80/20", test: 80 },
                      { label: "70/30", test: 70 },
                      { label: "50/50", test: 50 },
                      { label: t("recruiter.assessments.config.preset100Test"), test: 100 },
                    ].map((p) => {
                      const isSelected = codingTestWeight === p.test;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleCodingTestWeightChange(p.test)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                            isSelected
                              ? "bg-emerald-600 text-white shadow-2xs font-bold"
                              : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2 Ô Input có ràng buộc tổng = 100% */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Ô Sandbox */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" /> {t("recruiter.assessments.config.sandboxBoxTitle")}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={codingTestWeight}
                          onChange={(e) => handleCodingTestWeightChange(Number(e.target.value) || 0)}
                          className="h-8 w-16 rounded-lg border border-slate-300 bg-white px-2 text-right font-mono text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed dark:text-slate-400">
                      {t("recruiter.assessments.config.sandboxBoxDesc")}
                    </p>
                  </div>

                  {/* Ô AI Code Review */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[var(--color-primary)]" /> {t("recruiter.assessments.config.aiReviewBoxTitle")}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={codingAiWeight}
                          onChange={(e) => handleCodingAiWeightChange(Number(e.target.value) || 0)}
                          className="h-8 w-16 rounded-lg border border-slate-300 bg-white px-2 text-right font-mono text-xs font-bold text-slate-900 focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed dark:text-slate-400">
                      {t("recruiter.assessments.config.aiReviewBoxDesc")}
                    </p>
                  </div>
                </div>

                {/* Segmented Slider kép (Tự động chia 2 màu tương ứng với con số nhập vào) */}
                <div className="space-y-2">
                  <div className="relative flex h-8 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                    <div
                      className="flex items-center justify-center rounded-lg bg-emerald-600 font-mono text-xs font-bold text-white transition-all duration-200 shadow-2xs select-none"
                      style={{ width: `${codingTestWeight}%` }}
                    >
                      {codingTestWeight >= 15 ? t("recruiter.assessments.config.sandboxBarLabel", { percent: codingTestWeight }) : `${codingTestWeight}%`}
                    </div>
                    <div
                      className="flex items-center justify-center rounded-lg bg-[var(--color-primary)] font-mono text-xs font-bold text-white transition-all duration-200 shadow-2xs select-none"
                      style={{ width: `${codingAiWeight}%` }}
                    >
                      {codingAiWeight >= 15 ? t("recruiter.assessments.config.aiBarLabel", { percent: codingAiWeight }) : `${codingAiWeight}%`}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={codingTestWeight}
                    onChange={(e) => handleCodingTestWeightChange(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none dark:bg-slate-700"
                    title={t("recruiter.assessments.config.sliderTitle")}
                  />
                </div>

                {/* 2. Công thức tính điểm & Diễn giải - 1 dòng gọn nhẹ kèm Tooltip hover */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Tooltip
                      content={
                        <div className="p-1 space-y-1.5 max-w-xs text-xs">
                          <span className="font-bold block text-slate-900 dark:text-white">{t("recruiter.assessments.config.formulaExampleTitle")}</span>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {t("recruiter.assessments.config.formulaExampleDesc")}
                          </p>
                          <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40">
                            {t("recruiter.assessments.config.formulaExampleResult", {
                              testWeight: codingTestWeight,
                              aiWeight: codingAiWeight,
                              score: (10 * codingTestWeight / 100 + 8 * codingAiWeight / 100).toFixed(1),
                            })}
                          </div>
                        </div>
                      }
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
                        <HelpCircle className="size-4" aria-hidden="true" />
                      </span>
                    </Tooltip>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {t("recruiter.assessments.config.formulaPrefix")}
                      <strong className="font-mono text-[#101828] dark:text-white">
                        {t("recruiter.assessments.config.formulaExpression", { testWeight: codingTestWeight, aiWeight: codingAiWeight })}
                      </strong>
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 italic hidden sm:inline">
                    {t("recruiter.assessments.config.formulaTooltipHint")}
                  </span>
                </div>
              </div>
            </div>
          )}

          <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
            {errors.sections?.root?.message ?? errors.sections?.message}
          </p>
        </div>
      </div>

      {/* Thông báo lỗi */}
      <AssessmentError error={mutation.error} />

      {/* Hành động (Sticky Bottom Bar với hiệu ứng Glassmorphism & Shadow cao cấp) */}
      <div className="sticky bottom-0 z-20 -mx-6 -mb-6 mt-6 flex items-center justify-between border-t border-slate-200/90 bg-white/90 backdrop-blur-md px-6 py-3.5 rounded-b-2xl shadow-[0_-8px_25px_-6px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_-8px_25px_-6px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/70 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
              {t("recruiter.assessments.config.dirtyChangesBadge")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
              {t("recruiter.assessments.config.syncedBadge")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty || mutation.isPending}
            title={t("recruiter.assessments.config.resetTooltip")}
            className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>{t("recruiter.assessments.config.resetBtn")}</span>
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={mutation.isPending || !jobSkills.length}
            className="gap-1.5"
          >
            <Save className="size-3.5" aria-hidden="true" />
            {mutation.isPending
              ? t("recruiter.assessments.common.actions.saving")
              : t("recruiter.assessments.config.saveConfigBtn")}
          </Button>
        </div>
      </div>
    </form>
  );
}
