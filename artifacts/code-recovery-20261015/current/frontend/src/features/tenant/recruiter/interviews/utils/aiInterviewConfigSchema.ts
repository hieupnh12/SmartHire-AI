import { z } from "zod";
import { COMPETENCY_LABELS, type AiInterviewConfig, type CompetencyKey } from "@/api/types/aiInterview";

export const COMPETENCY_KEYS = Object.keys(COMPETENCY_LABELS) as CompetencyKey[];

const int = (min: number, max: number, message: string) => z.coerce.number().int(message).min(min, message).max(max, message);

const stageSchema = z.object({
  title: z.string().trim().min(1, "Nhập chủ đề chặng").max(120, "Tối đa 120 ký tự"),
  questionCount: int(1, 30, "1–30 câu"),
  competencies: z.array(z.string()).min(1, "Chọn ít nhất một nhóm năng lực"),
  skills: z.array(z.string()),
});

export const configSchema = z.object({
  enabled: z.boolean(),
  passingScore: z.coerce.number().min(0, "0–100").max(100, "0–100"),
  questionCount: int(1, 30, "1–30 câu"),
  availableFrom: z.string().refine(value => !value || Number.isFinite(new Date(value).getTime()), "Thời gian không hợp lệ"),
  availableUntil: z.string().refine(value => !value || Number.isFinite(new Date(value).getTime()), "Thời gian không hợp lệ"),
  policy: z.object({
    durationMinutes: int(1, 180, "1–180 phút"),
    maxAttempts: int(1, 5, "1–5 lần"),
    miniAssessmentEnabled: z.boolean(),
    miniQuestionCount: int(3, 10, "3–10 câu"),
    miniWeight: int(0, 100, "0–100%"),
    miniAfterStage: z.coerce.number().int().min(0),
    weights: z.object(Object.fromEntries(COMPETENCY_KEYS.map(key => [key, int(0, 100, "0–100%")])) as Record<CompetencyKey, ReturnType<typeof int>>),
    selectedSkills: z.array(z.string()).max(30, "Tối đa 30 kỹ năng"),
    stages: z.array(stageSchema).max(20, "Tối đa 20 chặng"),
    schemaVersion: z.number().int().optional(),
  }),
}).superRefine((value, ctx) => {
  const p = value.policy;
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  const total = COMPETENCY_KEYS.reduce((sum, key) => sum + p.weights[key], 0);
  if (value.availableFrom && value.availableUntil && new Date(value.availableFrom) >= new Date(value.availableUntil)) {
    issue(["availableUntil"], "Hạn hoàn thành phải sau thời gian bắt đầu.");
  }
  if (total !== 100) issue(["policy", "weights"], `Tổng trọng số phải bằng 100% (hiện tại ${total}%).`);
  if (p.miniAssessmentEnabled && (p.weights.TECHNICAL_KNOWLEDGE === 0 || p.selectedSkills.length === 0)) {
    issue(["policy", "miniAssessmentEnabled"], "Mini Assessment cần Technical Knowledge > 0% và ít nhất một Job Skill.");
  }
  // Process Engine V2 validates its process configuration on the backend; it does
  // not use the legacy roadmap fields below.
  if (p.schemaVersion != null && p.schemaVersion >= 2) return;
  if (p.miniAfterStage > p.stages.length) issue(["policy", "miniAfterStage"], "Vị trí Mini Assessment không hợp lệ.");
  if (!value.enabled && p.stages.length === 0) return;
  if (p.stages.length === 0) { issue(["policy", "stages"], "Cần ít nhất một chặng phỏng vấn."); return; }
  const planned = p.stages.reduce((sum, stage) => sum + stage.questionCount, 0);
  if (planned !== value.questionCount) issue(["policy", "stages"], `Tổng số câu của các chặng (${planned}) phải bằng số câu phỏng vấn (${value.questionCount}).`);
  const covered = new Set<string>(["COMMUNICATION"]);
  const skills = new Set<string>();
  p.stages.forEach((stage, index) => {
    stage.competencies.forEach(key => covered.add(key));
    stage.skills.forEach(skill => skills.add(skill));
    if (stage.competencies.some(key => p.weights[key as CompetencyKey] === 0)) issue(["policy", "stages", index, "competencies"], "Nhóm năng lực có trọng số 0% không thể dùng.");
    if (stage.skills.some(skill => !p.selectedSkills.includes(skill))) issue(["policy", "stages", index, "skills"], "Chỉ dùng Job Skills đã chọn.");
  });
  const missingSkills = p.selectedSkills.filter(skill => !skills.has(skill));
  const missingGroups = COMPETENCY_KEYS.filter(key => p.weights[key] > 0 && !covered.has(key));
  if (missingSkills.length || missingGroups.length) {
    issue(["policy", "stages"], `Lộ trình chưa bao phủ: ${[...missingGroups.map(key => COMPETENCY_LABELS[key]), ...missingSkills].join(", ")}.`);
  }
});

export type ConfigValues = z.infer<typeof configSchema>;

export function toFormValues(config: AiInterviewConfig): ConfigValues {
  const local = (value: string | null) => {
    const date = value ? new Date(value) : null;
    return date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  };
  return { ...config, availableFrom: local(config.availableFrom), availableUntil: local(config.availableUntil), policy: { ...config.policy, weights: Object.fromEntries(COMPETENCY_KEYS.map(key => [key, key === "COMMUNICATION" ? 100 : 0])) as Record<CompetencyKey, number>, miniAssessmentEnabled: false, stages: [], schemaVersion: 2 } };
}

export function toRequest(values: ConfigValues): AiInterviewConfig {
  return {
    ...values,
    availableFrom: values.availableFrom ? new Date(values.availableFrom).toISOString() : null,
    availableUntil: values.availableUntil ? new Date(values.availableUntil).toISOString() : null,
  };
}
