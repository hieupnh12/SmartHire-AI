import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ClipboardList, Plus, Settings2, Sparkles, Trash2, AlertCircle, Code2, FileText, ListChecks, Sliders, RotateCcw, Check, Scale } from "lucide-react";
import { assessmentGenerationApi } from "@/api/tenant/assessmentGenerationApi";
import type { AssessmentConfiguration, RubricCriterionConfig } from "@/api/types/assessmentGeneration";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

const rubricCriterionSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên tiêu chí"),
  weight: z.number().int().min(1, "Trọng số tối thiểu 1%").max(100, "Tối đa 100%"),
  guide: z.string().trim().optional(),
});

const schema = z.object({
  objectiveDurationMinutes: z.number().int().min(1).nullable().optional(),
  durationMinutes: z.number().int().min(1, "Thời lượng tối thiểu 1 phút").max(480, "Tối đa 480 phút"),
  passingPercent: z.number().int().min(0).max(100, "Ngưỡng đạt tối đa 100%"),
  autoAssign: z.boolean(),
  sections: z.array(z.object({
    skill: z.string().trim().min(1, "Chọn skill của job"),
    questionType: z.enum(["MCQ", "MULTIPLE_CHOICE", "ESSAY", "CODING"]),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    count: z.number().int().min(1, "Tối thiểu 1 câu").max(100),
    points: z.number().int().min(1, "Tối thiểu 1 điểm").max(10000),
  })).min(1, "Chọn ít nhất một skill và cấu hình nhóm bài tập").max(100),
  codingTestWeightPercent: z.number().int().min(0).max(100).optional(),
  codingAiWeightPercent: z.number().int().min(0).max(100).optional(),
  essayCriteria: z.array(rubricCriterionSchema).optional(),
  essayGradingGuide: z.string().trim().max(2000, "Tối đa 2000 ký tự").optional(),
}).refine(value => value.sections.reduce((sum, row) => sum + row.count, 0) <= 100, {
  path: ["sections"], message: "Một đề có tối đa 100 câu hỏi",
}).refine(value => {
  if (value.codingTestWeightPercent != null || value.codingAiWeightPercent != null) {
    const testW = value.codingTestWeightPercent ?? 80;
    const aiW = value.codingAiWeightPercent ?? 20;
    return testW + aiW === 100;
  }
  return true;
}, {
  path: ["codingTestWeightPercent"], message: "Tổng tỷ trọng Sandbox và AI Review phải bằng 100%",
}).refine(value => {
  if (value.essayCriteria && value.essayCriteria.length > 0) {
    const totalW = value.essayCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    return totalW === 100;
  }
  return true;
}, {
  path: ["essayCriteria"], message: "Tổng trọng số các tiêu chí Rubric phải đạt đúng 100%",
});

const defaultEssayCriteria: RubricCriterionConfig[] = [
  { name: "Bản chất cốt lõi & Khái niệm", weight: 40, guide: "Giải thích chính xác nguyên lý, bản chất và các khái niệm cốt lõi." },
  { name: "Phân tích so sánh & Trade-offs", weight: 30, guide: "Phân tích ưu, nhược điểm và điều kiện áp dụng của từng phương án." },
  { name: "Tính logic & Ứng dụng thực tế", weight: 30, guide: "Lập luận nhất quán, có ví dụ thực tế phù hợp từ production." },
];

const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900";

export function JobAssessmentConfiguration() {
  const job = useRecruitmentJob();
  const config = useQuery({
    queryKey: [...queryKeys.assessments.all(), "configuration", job.id],
    queryFn: () => assessmentGenerationApi.configuration(job.id),
  });

  if (config.isPending) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-8 text-center">
        <div className="size-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">Đang tải cấu hình bài tập của vị trí...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AssessmentError error={config.error} retry={() => void config.refetch()} />
      {config.isSuccess && <ConfigurationForm initial={config.data} />}
    </div>
  );
}

export function ConfigurationForm({ initial }: { initial: AssessmentConfiguration | null }) {
  const job = useRecruitmentJob();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"general" | "exercise">("general");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssessmentConfiguration>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          ...initial,
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
          sections: [{ skill: job.skills[0]?.name ?? "", questionType: "MCQ", difficulty: "Easy", count: 5, points: 2 }],
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

  const sections = watch("sections");
  const count = sections.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const total = sections.reduce((sum, row) => sum + (Number(row.count) || 0) * (Number(row.points) || 0), 0);
  const selectedSkills = new Set(sections.map((section) => section.skill));
  const [exerciseFilter, setExerciseFilter] = useState<"ALL" | "MCQ" | "ESSAY" | "CODING">("ALL");

  const watchedEssayCriteria = watch("essayCriteria") || [];
  const totalRubricWeight = watchedEssayCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
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

  const toggleSkill = (skill: string) => {
    if (selectedSkills.has(skill)) {
      const indexes = sections.flatMap((section, index) => (section.skill === skill ? [index] : []));
      remove(indexes);
    } else {
      append({ skill, questionType: "MCQ", difficulty: "Easy", count: 1, points: 1 });
    }
  };

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
        setNotice("Đã lưu cấu hình bài tập. Hệ thống sẽ áp dụng cấu hình này để tự động tạo đề cho các hồ sơ ứng viên.");
      }
    },
  });

  const save = (generate: boolean) =>
    handleSubmit(
      (data) => {
        setNotice("");
        mutation.mutate({ data, generate });
      },
      (invalid) => {
        setTab(invalid.sections ? "exercise" : "general");
      },
    );

  return (
    <form noValidate onSubmit={save(false)} className="space-y-6">
      <div className={cardClass}>
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Cấu hình Assessment của Job</h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Thiết lập cấu trúc đề thi tự động cho vị trí <strong className="text-[var(--color-on-surface)]">{job.title}</strong>. Hệ thống sẽ tự động bốc câu hỏi từ ngân hàng để sinh đề riêng cho từng ứng viên.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-sm font-semibold text-[var(--color-primary-hover)]">
              {count} câu hỏi · {total} điểm
            </span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="mb-6 flex gap-2 border-b border-[var(--color-border-default)] pb-2" role="tablist" aria-label="Cấu hình Assessment">
          {([
            { id: "general", label: "Cấu hình chung", icon: Settings2 },
            { id: "exercise", label: "Cấu hình bài tập", icon: ClipboardList },
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
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all",
                tab === item.id
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] shadow-xs"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Cấu hình chung */}
        <div
          id="assessment-config-general"
          role="tabpanel"
          aria-labelledby="assessment-config-tab-general"
          hidden={tab !== "general"}
          className="space-y-5"
        >
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]/50 p-4">
            <h3 className="text-sm font-semibold">Điểm và điều kiện đạt</h3>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Thiết lập chung áp dụng cho toàn bộ bài tập của đề assessment.
            </p>
          </div>

          <fieldset className="rounded-xl border border-[var(--color-border-default)] p-5">
            <legend className="px-2 text-sm font-semibold">Thiết lập bài đánh giá</legend>
            <label className="mb-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                {...register("autoAssign")}
                disabled={mutation.isPending}
                className="mt-1 size-4 rounded accent-[var(--color-primary)]"
              />
              <span>
                <strong className="block text-base">Tự động tạo một đề riêng cho từng hồ sơ ở vòng Assessment</strong>
                <span className="mt-1 block text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
                  Ứng viên chỉ thấy đề được giao riêng cho hồ sơ của mình. Đề lấy câu từ ngân hàng theo các nhóm bài tập bên dưới, rồi gửi thông báo và email. Nếu thiếu câu hỏi phù hợp, hồ sơ sẽ chờ đến khi ngân hàng được bổ sung.
                </span>
              </span>
            </label>

            {!job.skills.length && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="alert">
                <AlertCircle className="size-4 shrink-0 text-amber-600" />
                Vị trí tuyển dụng chưa có kỹ năng (skills). Vui lòng thêm skill cho job trước khi cấu hình tạo tự động.
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium">
                Passing Score (/100)
                <input
                  type="number"
                  {...register("passingPercent", { valueAsNumber: true })}
                  min={0}
                  max={100}
                  className={inputClass}
                />
                <span className="text-xs text-[var(--color-error)]">{errors.passingPercent?.message}</span>
              </label>
              <label className="text-sm font-medium">
                Tổng số câu hỏi
                <input type="number" readOnly value={count} className={cn(inputClass, "bg-[var(--color-surface-container-low)] font-semibold")} />
                <span className="text-xs text-[var(--color-on-surface-variant)]">Tự động tính từ cấu hình bài tập</span>
              </label>
              <label className="text-sm font-medium">
                Tổng thời gian (phút)
                <input
                  type="number"
                  {...register("durationMinutes", { valueAsNumber: true })}
                  min={1}
                  max={480}
                  className={inputClass}
                />
                <span className="text-xs text-[var(--color-error)]">{errors.durationMinutes?.message}</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[var(--color-border-default)] p-5">
            <legend className="px-2 text-sm font-semibold">Nhóm bài tập và tỷ trọng điểm</legend>
            <p className="mb-4 text-sm text-[var(--color-on-surface-variant)]">
              Tỷ trọng được tính tự động từ số câu và điểm mỗi câu trong cấu hình bài tập. Người soạn câu hỏi không cần đặt điểm, hệ thống sẽ tự động tính theo cấu hình tại đây.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <ListChecks className="size-3.5 text-blue-600" /> Trắc nghiệm (MCQ)
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">{mcqPercent}%</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-snug">Chấm tự động 100% theo đáp án đúng</span>
                <span className="mt-auto pt-2 text-[11px] font-bold text-slate-900 dark:text-white">
                  {mcqCount} câu · {mcqPoints} điểm
                </span>
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <FileText className="size-3.5 text-amber-600" /> Tự luận lý thuyết
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">{essayPercent}%</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-snug">AI Auto-Grading theo tiêu chuẩn Rubric</span>
                <span className="mt-auto pt-2 text-[11px] font-bold text-slate-900 dark:text-white">
                  {essayCount} câu · {essayPoints} điểm
                </span>
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Code2 className="size-3.5 text-emerald-600" /> Tự luận Code
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">{codingPercent}%</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-snug">{codingTestWeight}% Sandbox + {codingAiWeight}% AI Review</span>
                <span className="mt-auto pt-2 text-[11px] font-bold text-slate-900 dark:text-white">
                  {codingCount} bài · {codingPoints} điểm
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs text-[var(--color-on-surface-variant)]">
              Tổng điểm dự kiến: <strong className="text-[var(--color-on-surface)]">{total} điểm</strong> · Điểm đạt tối thiểu:{" "}
              <strong className="text-[var(--color-on-surface)]">
                {Math.round(total * (Number(watch("passingPercent")) || 0)) / 100} điểm
              </strong>
            </p>
          </fieldset>

          <fieldset className="rounded-xl border border-[var(--color-border-default)] p-5">
            <legend className="px-2 text-sm font-semibold">Kỹ năng (Skills) của Job cần đánh giá</legend>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <label
                  key={skill.skillId}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-border-default)] px-3.5 py-1 text-sm transition-all has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-soft)] has-[:checked]:font-semibold has-[:checked]:text-[var(--color-primary-hover)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedSkills.has(skill.name)}
                    disabled={mutation.isPending}
                    onChange={() => toggleSkill(skill.name)}
                    className="size-4 rounded accent-[var(--color-primary)]"
                  />
                  {skill.name}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">
              Chọn skill để hệ thống tự thêm nhóm câu hỏi tương ứng. Bỏ chọn sẽ xóa các nhóm câu hỏi của skill đó trong bài tập.
            </p>
          </fieldset>

          <label className="block text-sm font-medium">
            Thời gian phần trắc nghiệm riêng (phút, tùy chọn)
            <input
              type="number"
              min={1}
              {...register("objectiveDurationMinutes", {
                setValueAs: (value) => (value === "" || value == null ? null : Number(value)),
              })}
              placeholder="Để trống nếu không giới hạn riêng phần trắc nghiệm"
              className={inputClass}
            />
            <span className="text-xs text-[var(--color-error)]">{errors.objectiveDurationMinutes?.message}</span>
          </label>
        </div>

        {/* Tab 2: Cấu hình bài tập */}
        <div
          id="assessment-config-exercise"
          role="tabpanel"
          aria-labelledby="assessment-config-tab-exercise"
          hidden={tab !== "exercise"}
          className="space-y-4"
        >
          {/* Header & Stats Overview */}
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]/40 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cấu hình bài tập theo từng phần (Trắc nghiệm · Lý thuyết · Code)
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Phân tách độc lập cấu hình điểm cho <strong>Trắc nghiệm</strong>, <strong>Tự luận lý thuyết</strong> và <strong>Tự luận Code</strong>.
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs dark:bg-white dark:text-slate-900">
                Toàn đề: {count} câu hỏi · {total} điểm
              </span>
            </div>

            {/* Sub-stat cards */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div
                onClick={() => setExerciseFilter(exerciseFilter === "MCQ" ? "ALL" : "MCQ")}
                className={cn(
                  "flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-white p-3.5 shadow-2xs transition-all dark:bg-slate-900",
                  exerciseFilter === "MCQ"
                    ? "border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <ListChecks className="size-4 text-blue-600" /> Trắc nghiệm
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
                    {mcqPercent}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{mcqItems.length} nhóm cấu hình</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{mcqCount} câu · {mcqPoints} đ</span>
                </div>
              </div>

              <div
                onClick={() => setExerciseFilter(exerciseFilter === "ESSAY" ? "ALL" : "ESSAY")}
                className={cn(
                  "flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-white p-3.5 shadow-2xs transition-all dark:bg-slate-900",
                  exerciseFilter === "ESSAY"
                    ? "border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <FileText className="size-4 text-amber-600" /> Tự luận lý thuyết
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
                    {essayPercent}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{essayItems.length} nhóm cấu hình</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{essayCount} câu · {essayPoints} đ</span>
                </div>
              </div>

              <div
                onClick={() => setExerciseFilter(exerciseFilter === "CODING" ? "ALL" : "CODING")}
                className={cn(
                  "flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-white p-3.5 shadow-2xs transition-all dark:bg-slate-900",
                  exerciseFilter === "CODING"
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Code2 className="size-4 text-emerald-600" /> Tự luận Code
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                    {codingPercent}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{codingItems.length} nhóm cấu hình</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{codingCount} bài · {codingPoints} đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filter Segmented Control */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1 dark:text-slate-400">Hiển thị phần:</span>
            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900">
              {([
                { id: "ALL", label: `Tất cả các phần (${fields.length} nhóm)`, dot: null },
                { id: "MCQ", label: `Trắc nghiệm (${mcqItems.length} nhóm)`, dot: "bg-blue-500" },
                { id: "ESSAY", label: `Tự luận lý thuyết (${essayItems.length} nhóm)`, dot: "bg-amber-500" },
                { id: "CODING", label: `Tự luận Code (${codingItems.length} nhóm)`, dot: "bg-emerald-500" },
              ] as const).map((filterItem) => (
                <button
                  key={filterItem.id}
                  type="button"
                  onClick={() => setExerciseFilter(filterItem.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-all",
                    exerciseFilter === filterItem.id
                      ? "bg-white font-bold text-slate-900 shadow-xs border border-slate-200/80 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                      : "font-medium text-slate-600 hover:text-slate-900 hover:bg-white/50 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  {filterItem.dot && <span className={cn("size-2 rounded-full shrink-0", filterItem.dot)} />}
                  {filterItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1. KHỐI TRẮC NGHIỆM */}
          {(exerciseFilter === "ALL" || exerciseFilter === "MCQ") && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
                    <ListChecks className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      1. Cấu hình điểm Trắc nghiệm (Multiple Choice)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Chấm điểm tự động 100% theo đáp án đúng. Hỗ trợ câu hỏi 1 đáp án (MCQ) và nhiều đáp án (MULTIPLE_CHOICE).
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-blue-50 px-3 py-1 font-mono text-xs font-bold text-blue-700 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
                  {mcqCount} câu · {mcqPoints} điểm ({mcqPercent}%)
                </span>
              </div>

              {mcqItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                  Chưa có nhóm câu hỏi trắc nghiệm nào trong cấu hình này.
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
                          <span className="size-2 rounded-full bg-blue-500" />
                          Nhóm trắc nghiệm {groupOrder + 1}
                        </legend>
                        <button
                          type="button"
                          disabled={fields.length === 1 || mutation.isPending}
                          onClick={() => remove(index)}
                          aria-label={`Xóa nhóm trắc nghiệm ${groupOrder + 1}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          Skill
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">Chọn skill</option>
                            {job.skills.map((skill) => (
                              <option key={skill.skillId} value={skill.name}>
                                {skill.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Dạng câu
                          <select {...register(`sections.${index}.questionType`)} className={inputClass}>
                            <option value="MCQ">Trắc nghiệm đơn</option>
                            <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Độ khó
                          <select {...register(`sections.${index}.difficulty`)} className={inputClass}>
                            <option value="Easy">Dễ (Easy)</option>
                            <option value="Medium">Trung bình (Medium)</option>
                            <option value="Hard">Khó (Hard)</option>
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Số câu
                          <input
                            type="number"
                            min={1}
                            max={100}
                            {...register(`sections.${index}.count`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Điểm / câu
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            {...register(`sections.${index}.points`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-slate-200/80 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:border-slate-800">
                        <span>
                          <strong>Quy tắc Trắc nghiệm:</strong> Chấm tự động 100% theo đáp án đúng
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono font-bold text-slate-900 border border-slate-200/60 dark:bg-slate-800 dark:text-white">
                          Nhóm {groupOrder + 1}: {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} điểm
                        </span>
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
                    skill: job.skills[0]?.name ?? "",
                    questionType: "MCQ",
                    difficulty: "Easy",
                    count: 1,
                    points: 1,
                  })
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-400 py-3 text-xs font-semibold text-slate-700 transition-all dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
              >
                <Plus className="size-4 text-blue-600" /> Thêm nhóm câu hỏi trắc nghiệm
              </button>
            </div>
          )}

          {/* 2. KHỐI TỰ LUẬN LÝ THUYẾT */}
          {(exerciseFilter === "ALL" || exerciseFilter === "ESSAY") && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      2. Cấu hình điểm Tự luận lý thuyết (Essay)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      AI Auto-Grading đối chiếu với Đáp án tham khảo chuẩn (Reference Answer) và chấm theo các tiêu chí Rubric (% trọng số).
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
                  {essayCount} câu · {essayPoints} điểm ({essayPercent}%)
                </span>
              </div>

              {essayItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                  Chưa có nhóm câu hỏi tự luận lý thuyết nào trong cấu hình này.
                </div>
              ) : (
                <div className="space-y-3">
                  {essayItems.map(({ field, index }, groupOrder) => (
                    <fieldset
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center justify-between pb-2">
                        <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <span className="size-2 rounded-full bg-amber-500" />
                          Nhóm tự luận lý thuyết {groupOrder + 1}
                        </legend>
                        <button
                          type="button"
                          disabled={fields.length === 1 || mutation.isPending}
                          onClick={() => remove(index)}
                          aria-label={`Xóa nhóm tự luận lý thuyết ${groupOrder + 1}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          Skill
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">Chọn skill</option>
                            {job.skills.map((skill) => (
                              <option key={skill.skillId} value={skill.name}>
                                {skill.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Độ khó
                          <select {...register(`sections.${index}.difficulty`)} className={inputClass}>
                            <option value="Easy">Dễ (Easy)</option>
                            <option value="Medium">Trung bình (Medium)</option>
                            <option value="Hard">Khó (Hard)</option>
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Số câu
                          <input
                            type="number"
                            min={1}
                            max={100}
                            {...register(`sections.${index}.count`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Điểm / câu
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            {...register(`sections.${index}.points`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-slate-200/80 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:border-slate-800">
                        <span>
                          <strong>Quy tắc Tự luận:</strong> AI đối chiếu Đáp án chuẩn và chấm theo bộ tiêu chuẩn Rubric của Job
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono font-bold text-slate-900 border border-slate-200/60 dark:bg-slate-800 dark:text-white">
                          Nhóm {groupOrder + 1}: {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} điểm
                        </span>
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
                    skill: job.skills[0]?.name ?? "",
                    questionType: "ESSAY",
                    difficulty: "Medium",
                    count: 1,
                    points: 5,
                  })
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-400 py-3 text-xs font-semibold text-slate-700 transition-all dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
              >
                <Plus className="size-4 text-amber-600" /> Thêm nhóm tự luận lý thuyết
              </button>

              {/* KHỐI CẤU HÌNH TÍNH ĐIỂM TỰ LUẬN LÝ THUYẾT (AI RUBRIC CRITERIA) */}
              <div className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 p-5 space-y-4 dark:border-amber-900/40 dark:bg-amber-950/10">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h5 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <Scale className="size-4 text-amber-600" /> Tiêu chuẩn chấm điểm tự luận (AI Rubric) áp dụng chung cho Job
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Toàn bộ câu hỏi tự luận lý thuyết trong đề sẽ được AI đánh giá tự động dựa trên các tiêu chí và tỷ trọng trọng số bên dưới.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => replaceRubric(defaultEssayCriteria)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <RotateCcw className="size-3.5 text-amber-600" /> Tải 3 tiêu chí mẫu chuẩn
                  </button>
                </div>

                {/* Status Bar tổng trọng số Rubric */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Tổng trọng số tiêu chí đã phân bổ:</span>
                    <span
                      className={cn(
                        "font-mono font-bold px-2 py-0.5 rounded-md",
                        totalRubricWeight === 100
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950 dark:text-rose-300"
                      )}
                    >
                      {totalRubricWeight}% / 100% {totalRubricWeight === 100 ? "✓ Hợp lệ" : "⚠ Chưa đủ 100%"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        totalRubricWeight === 100 ? "bg-emerald-500" : totalRubricWeight > 100 ? "bg-rose-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(totalRubricWeight, 100)}%` }}
                    />
                  </div>
                  {errors.essayCriteria && (
                    <p className="mt-1.5 text-xs text-[var(--color-error)] font-medium">
                      {errors.essayCriteria.message ?? errors.essayCriteria.root?.message}
                    </p>
                  )}
                </div>

                {/* Danh sách tiêu chí Rubric */}
                <div className="space-y-3">
                  {rubricFields.map((field, rIndex) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Tiêu chí {rIndex + 1}
                        </span>
                        <button
                          type="button"
                          disabled={rubricFields.length <= 1}
                          onClick={() => removeRubric(rIndex)}
                          title="Xóa tiêu chí này"
                          className="inline-flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5 grid gap-3 sm:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-3">
                          Tên tiêu chí đánh giá
                          <input
                            {...register(`essayCriteria.${rIndex}.name`)}
                            placeholder="Ví dụ: Bản chất cốt lõi & Khái niệm..."
                            className={inputClass}
                          />
                          {errors.essayCriteria?.[rIndex]?.name && (
                            <span className="text-[11px] text-[var(--color-error)]">{errors.essayCriteria[rIndex]?.name?.message}</span>
                          )}
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Trọng số (%)
                          <div className="relative mt-1">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              {...register(`essayCriteria.${rIndex}.weight`, { valueAsNumber: true })}
                              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-bold text-slate-900 transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                          </div>
                          {errors.essayCriteria?.[rIndex]?.weight && (
                            <span className="text-[11px] text-[var(--color-error)]">{errors.essayCriteria[rIndex]?.weight?.message}</span>
                          )}
                        </label>
                      </div>

                      <label className="mt-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Hướng dẫn chấm cho AI (Guide)
                        <input
                          {...register(`essayCriteria.${rIndex}.guide`)}
                          placeholder="Mô tả các ý cần có để đạt điểm tối đa..."
                          className={inputClass}
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => appendRubric({ name: "", weight: 10, guide: "" })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Plus className="size-3.5 text-amber-600" /> Thêm tiêu chí đánh giá
                </button>

                {/* Hướng dẫn chung cho AI khi chấm lý thuyết */}
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Lưu ý đặc biệt cho AI khi chấm phần Tự luận lý thuyết (Tùy chọn)
                    <textarea
                      rows={2}
                      {...register("essayGradingGuide")}
                      placeholder="Ví dụ: Chấp nhận thuật ngữ tiếng Anh tương đương; Ưu tiên câu trả lời đưa ra ví dụ minh họa thực tế; Không bắt bẻ lỗi chính tả nhỏ..."
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Nội dung này sẽ được chuyển thành System Prompt hướng dẫn AI khi phân tích câu trả lời của ứng viên.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. KHỐI TỰ LUẬN CODE */}
          {(exerciseFilter === "ALL" || exerciseFilter === "CODING") && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                    <Code2 className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      3. Cấu hình điểm Bài tập Code (Coding)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tỷ trọng chấm linh hoạt: Sandbox Test Cases ({codingTestWeight}%) + AI Code Review ({codingAiWeight}%).
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                  {codingCount} bài · {codingPoints} điểm ({codingPercent}%)
                </span>
              </div>

              {/* CARD CẤU HÌNH TỶ TRỌNG TÍNH ĐIỂM CODE */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-5 space-y-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h5 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <Sliders className="size-4 text-emerald-600" /> Tỷ trọng tính điểm bài tập Code của Job
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Quyết định bao nhiêu phần trăm điểm đến từ việc chạy đúng Test Cases trong Sandbox và bao nhiêu phần trăm đến từ chất lượng mã nguồn do AI đánh giá.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCodingTestWeightChange(80)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Chuẩn 80/20
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCodingTestWeightChange(70)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      70/30
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCodingTestWeightChange(50)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      50/50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCodingTestWeightChange(100)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      100% Test
                    </button>
                  </div>
                </div>

                {/* Stacked bar trực quan */}
                <div className="space-y-1.5">
                  <div className="flex h-7 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                    <div
                      className="flex items-center justify-center rounded-lg bg-emerald-500 font-mono text-xs font-bold text-white transition-all duration-300"
                      style={{ width: `${codingTestWeight}%` }}
                    >
                      {codingTestWeight >= 15 ? `${codingTestWeight}% Sandbox Tests` : `${codingTestWeight}%`}
                    </div>
                    <div
                      className="flex items-center justify-center rounded-lg bg-indigo-500 font-mono text-xs font-bold text-white transition-all duration-300"
                      style={{ width: `${codingAiWeight}%` }}
                    >
                      {codingAiWeight >= 15 ? `${codingAiWeight}% AI Review` : `${codingAiWeight}%`}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" /> Tầng 1: Sandbox Execution ({codingTestWeight}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-indigo-500" /> Tầng 2: AI Code Review ({codingAiWeight}%)
                    </span>
                  </div>
                </div>

                {/* 2 Cột Điều khiển */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" /> Tỷ trọng Sandbox Test Cases
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={codingTestWeight}
                          onChange={(e) => handleCodingTestWeightChange(Number(e.target.value) || 0)}
                          className="h-8 w-16 rounded-md border border-slate-300 bg-white px-2 text-right font-mono text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={codingTestWeight}
                      onChange={(e) => handleCodingTestWeightChange(Number(e.target.value))}
                      className="mt-3 w-full accent-emerald-600"
                    />
                    <p className="mt-2 text-[11px] text-slate-500 leading-relaxed dark:text-slate-400">
                      Chạy mã nguồn thực tế trong máy ảo Sandbox cách ly. Điểm tính theo tỷ lệ test ẩn vượt qua (Passed/Failed) hoặc theo trọng số từng test case ẩn.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-indigo-500" /> Tỷ trọng AI Code Review
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={codingAiWeight}
                          onChange={(e) => handleCodingAiWeightChange(Number(e.target.value) || 0)}
                          className="h-8 w-16 rounded-md border border-slate-300 bg-white px-2 text-right font-mono text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={codingAiWeight}
                      onChange={(e) => handleCodingAiWeightChange(Number(e.target.value))}
                      className="mt-3 w-full accent-indigo-600"
                    />
                    <p className="mt-2 text-[11px] text-slate-500 leading-relaxed dark:text-slate-400">
                      AI phân tích 5 tiêu chí: Clean Code, Time Complexity, Space Complexity, Naming Conventions và Exception Safety. Phát hiện nghi ngờ hardcoded.
                    </p>
                  </div>
                </div>

                {/* Box công thức tính điểm thực tế */}
                <div className="rounded-xl bg-white border border-slate-200/80 p-3 text-xs text-slate-600 space-y-1 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-600" /> Công thức tính điểm tự động của từng bài tập Code:
                  </div>
                  <div className="font-mono bg-slate-50 rounded-lg p-2 text-slate-800 border border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700">
                    Điểm đề xuất = Điểm bài × [ (Tỷ lệ pass test × <strong>{codingTestWeight}%</strong>) + (Điểm AI Review × <strong>{codingAiWeight}%</strong>) ]
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    Ví dụ bài 10 điểm: Ứng viên đạt 100% test ẩn và được AI chấm 80% về Clean Code/Complexity ➔ Tổng điểm = (10 × {codingTestWeight}%) + (8 × {codingAiWeight}%) = <strong>{(10 * codingTestWeight / 100 + 8 * codingAiWeight / 100).toFixed(1)} / 10 điểm</strong>.
                  </p>
                </div>
              </div>

              {codingItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                  Chưa có nhóm bài tập lập trình nào trong cấu hình này.
                </div>
              ) : (
                <div className="space-y-3">
                  {codingItems.map(({ field, index }, groupOrder) => (
                    <fieldset
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center justify-between pb-2">
                        <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          Nhóm bài tập code {groupOrder + 1}
                        </legend>
                        <button
                          type="button"
                          disabled={fields.length === 1 || mutation.isPending}
                          onClick={() => remove(index)}
                          aria-label={`Xóa nhóm bài tập code ${groupOrder + 1}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          Skill
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">Chọn skill</option>
                            {job.skills.map((skill) => (
                              <option key={skill.skillId} value={skill.name}>
                                {skill.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Độ khó
                          <select {...register(`sections.${index}.difficulty`)} className={inputClass}>
                            <option value="Easy">Dễ (Easy)</option>
                            <option value="Medium">Trung bình (Medium)</option>
                            <option value="Hard">Khó (Hard)</option>
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Số bài tập
                          <input
                            type="number"
                            min={1}
                            max={100}
                            {...register(`sections.${index}.count`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Điểm / bài
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            {...register(`sections.${index}.points`, { valueAsNumber: true })}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-slate-200/80 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:border-slate-800">
                        <span>
                          <strong>Quy tắc bài Code:</strong> {codingTestWeight}% Sandbox (Test Cases) + {codingAiWeight}% AI Code Review
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono font-bold text-slate-900 border border-slate-200/60 dark:bg-slate-800 dark:text-white">
                          Nhóm {groupOrder + 1}: {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} điểm
                        </span>
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
                    skill: job.skills[0]?.name ?? "",
                    questionType: "CODING",
                    difficulty: "Medium",
                    count: 1,
                    points: 10,
                  })
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-400 py-3 text-xs font-semibold text-slate-700 transition-all dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
              >
                <Plus className="size-4 text-emerald-600" /> Thêm nhóm bài tập lập trình
              </button>
            </div>
          )}

          <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
            {errors.sections?.root?.message ?? errors.sections?.message}
          </p>
        </div>

        <p className="mt-6 border-t border-[var(--color-border-default)] pt-4 text-xs text-[var(--color-on-surface-variant)]">
          Cấu hình này áp dụng chung cho việc tạo đề tự động của vị trí. Các thay đổi chỉ áp dụng cho những đề được tạo mới về sau.
        </p>
      </div>

      {/* Thông báo lỗi / thành công */}
      <AssessmentError error={mutation.error} />
      {notice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800" role="status">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          {notice}
        </div>
      )}



      {/* Hành động */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="submit" variant="primary" disabled={mutation.isPending || !job.skills.length}>
          {mutation.isPending ? "Đang lưu..." : "Lưu cấu hình bài tập"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={mutation.isPending || !job.skills.length}
          onClick={() => void save(true)()}
        >
          <Sparkles className="size-4" />
          {mutation.isPending ? "Đang xử lý…" : "Tạo đề mẫu thử nghiệm"}
        </Button>
      </div>
      <p className="text-right text-xs text-[var(--color-on-surface-variant)]">
        Đề mẫu thử nghiệm được tạo dưới dạng bản nháp để bạn kiểm tra cấu trúc. Đề chính thức của ứng viên sẽ được hệ thống tự động sinh khi hồ sơ chuyển sang vòng Assessment.
      </p>
    </form>
  );
}
