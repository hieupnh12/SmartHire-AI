import { z } from "zod";
import { COMPETENCY_LABELS, type AiInterviewConfig, type CompetencyKey } from "@/api/types/aiInterview";
import { t as globalT, type TranslateFn } from "@/i18n";

export const COMPETENCY_KEYS = Object.keys(COMPETENCY_LABELS) as CompetencyKey[];

const int = (min: number, max: number, message: string) => z.coerce.number().int(message).min(min, message).max(max, message);

export function createAiInterviewConfigSchema(t: TranslateFn = globalT) {
  const stageSchema = z.object({
    title: z.string().trim().min(1, t("recruiter.interviews.ai.configSchema.stageTitleRequired")).max(120, t("recruiter.interviews.ai.configSchema.max120")),
    questionCount: int(1, 30, t("recruiter.interviews.ai.configSchema.questionRange")),
    competencies: z.array(z.string()).min(1, t("recruiter.interviews.ai.configSchema.selectCompetency")),
    skills: z.array(z.string()),
  });

  return z.object({
    enabled: z.boolean(),
    passingScore: z.coerce.number().min(0, t("recruiter.interviews.ai.configSchema.scoreRange")).max(100, t("recruiter.interviews.ai.configSchema.scoreRange")),
    questionCount: int(1, 30, t("recruiter.interviews.ai.configSchema.questionRange")),
    availableFrom: z.string(),
    availableUntil: z.string(),
    policy: z.object({
      availability: z.object({
        mode: z.enum(["RELATIVE", "ABSOLUTE"]),
        startDelayHours: z.coerce
          .number()
          .int(t("recruiter.interviews.ai.configSchema.intHours"))
          .min(0, t("recruiter.interviews.ai.configSchema.minZeroHours"))
          .max(8760, t("recruiter.interviews.ai.configSchema.maxHours"))
          .nullable(),
        completionWindowHours: z.coerce
          .number()
          .int(t("recruiter.interviews.ai.configSchema.intHours"))
          .min(1, t("recruiter.interviews.ai.configSchema.minOneHour"))
          .max(8760, t("recruiter.interviews.ai.configSchema.maxHours"))
          .nullable(),
      }).nullable().optional(),
      durationMinutes: int(1, 180, t("recruiter.interviews.ai.configSchema.durationRange")),
      maxAttempts: int(1, 5, t("recruiter.interviews.ai.configSchema.attemptsRange")),
      miniAssessmentEnabled: z.boolean(),
      miniQuestionCount: int(3, 10, t("recruiter.interviews.ai.configSchema.miniQuestionsRange")),
      miniWeight: int(0, 100, t("recruiter.interviews.ai.configSchema.percentRange")),
      miniAfterStage: z.coerce.number().int().min(0),
      weights: z.object(
        Object.fromEntries(
          COMPETENCY_KEYS.map((key) => [key, int(0, 100, t("recruiter.interviews.ai.configSchema.percentRange"))]),
        ) as Record<CompetencyKey, ReturnType<typeof int>>,
      ),
      selectedSkills: z.array(z.string()).max(30, t("recruiter.interviews.ai.configSchema.maxSkills")),
      stages: z.array(stageSchema).max(20, t("recruiter.interviews.ai.configSchema.maxStages")),
      schemaVersion: z.number().int().optional(),
    }),
  }).superRefine((value, ctx) => {
    const p = value.policy;
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    const total = COMPETENCY_KEYS.reduce((sum, key) => sum + p.weights[key], 0);
    if (p.availability?.mode === "RELATIVE") {
      if (p.availability.startDelayHours == null) issue(["policy", "availability", "startDelayHours"], t("recruiter.interviews.ai.configSchema.relativeStartDelayRequired"));
      if (p.availability.completionWindowHours == null) issue(["policy", "availability", "completionWindowHours"], t("recruiter.interviews.ai.configSchema.relativeWindowRequired"));
    } else {
      for (const key of ["availableFrom", "availableUntil"] as const) {
        if (value[key] && !Number.isFinite(new Date(value[key]).getTime())) issue([key], t("recruiter.interviews.ai.configSchema.invalidDateTime"));
        if (p.availability?.mode === "ABSOLUTE" && !value[key]) issue([key], t("recruiter.interviews.ai.configSchema.selectDateTime"));
      }
      if (value.availableFrom && value.availableUntil && new Date(value.availableFrom) >= new Date(value.availableUntil)) {
        issue(["availableUntil"], t("recruiter.interviews.ai.configSchema.untilAfterFrom"));
      }
    }
    if (total !== 100) issue(["policy", "weights"], t("recruiter.interviews.ai.configSchema.totalWeightMustBe100", { total }));
    if (p.miniAssessmentEnabled && (p.weights.TECHNICAL_KNOWLEDGE === 0 || p.selectedSkills.length === 0)) {
      issue(["policy", "miniAssessmentEnabled"], t("recruiter.interviews.ai.configSchema.miniAssessmentRequirement"));
    }
    // Process Engine V2 validates its process configuration on the backend; it does
    // not use the legacy roadmap fields below.
    if (p.schemaVersion != null && p.schemaVersion >= 2) return;
    if (p.miniAfterStage > p.stages.length) issue(["policy", "miniAfterStage"], t("recruiter.interviews.ai.configSchema.invalidMiniPosition"));
    if (!value.enabled && p.stages.length === 0) return;
    if (p.stages.length === 0) {
      issue(["policy", "stages"], t("recruiter.interviews.ai.configSchema.stageRequired"));
      return;
    }
    const planned = p.stages.reduce((sum, stage) => sum + stage.questionCount, 0);
    if (planned !== value.questionCount) {
      issue(["policy", "stages"], t("recruiter.interviews.ai.configSchema.plannedQuestionsMismatch", { planned, count: value.questionCount }));
    }
    const covered = new Set<string>(["COMMUNICATION"]);
    const skills = new Set<string>();
    p.stages.forEach((stage, index) => {
      stage.competencies.forEach((key) => covered.add(key));
      stage.skills.forEach((skill) => skills.add(skill));
      if (stage.competencies.some((key) => p.weights[key as CompetencyKey] === 0)) {
        issue(["policy", "stages", index, "competencies"], t("recruiter.interviews.ai.configSchema.zeroWeightCompetency"));
      }
      if (stage.skills.some((skill) => !p.selectedSkills.includes(skill))) {
        issue(["policy", "stages", index, "skills"], t("recruiter.interviews.ai.configSchema.selectedSkillsOnly"));
      }
    });
    const missingSkills = p.selectedSkills.filter((skill) => !skills.has(skill));
    const missingGroups = COMPETENCY_KEYS.filter((key) => p.weights[key] > 0 && !covered.has(key));
    if (missingSkills.length || missingGroups.length) {
      const items = [
        ...missingGroups.map((key) => t(`recruiter.interviews.competencies.${key}`)),
        ...missingSkills,
      ].join(", ");
      issue(["policy", "stages"], t("recruiter.interviews.ai.configSchema.uncoveredRoadmap", { items }));
    }
  });
}

export const aiInterviewConfigSchema = createAiInterviewConfigSchema(globalT);
export const configSchema = aiInterviewConfigSchema;

export type ConfigValues = z.infer<ReturnType<typeof createAiInterviewConfigSchema>>;

export function toFormValues(config: AiInterviewConfig): ConfigValues {
  const local = (value: string | null) => {
    const date = value ? new Date(value) : null;
    return date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  };
  return { ...config, availableFrom: local(config.availableFrom), availableUntil: local(config.availableUntil), policy: { ...config.policy,
    availability: config.policy.availability ?? { mode: config.availableFrom || config.availableUntil ? "ABSOLUTE" : "RELATIVE", startDelayHours: 0, completionWindowHours: 24 },
    weights: Object.fromEntries(COMPETENCY_KEYS.map(key => [key, key === "COMMUNICATION" ? 100 : 0])) as Record<CompetencyKey, number>, miniAssessmentEnabled: false, stages: [], schemaVersion: 2 } };
}

export function toRequest(values: ConfigValues): AiInterviewConfig {
  return {
    ...values,
    availableFrom: values.policy.availability?.mode !== "RELATIVE" && values.availableFrom ? new Date(values.availableFrom).toISOString() : null,
    availableUntil: values.policy.availability?.mode !== "RELATIVE" && values.availableUntil ? new Date(values.availableUntil).toISOString() : null,
  };
}
