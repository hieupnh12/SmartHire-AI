import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Plus, Settings2, Trash2, AlertCircle, Code2, FileText, ListChecks, Sliders, Check, Scale, BookOpen, GitCompare, Network, AlertTriangle, HelpCircle, Clock, RotateCcw, Save, Target, Zap } from "lucide-react";
import { assessmentGenerationApi } from "@/api/tenant/assessmentGenerationApi";
import type { AssessmentConfiguration, RubricCriterionConfig } from "@/api/types/assessmentGeneration";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
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
  autoGradingEnabled: z.boolean().optional(),
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

const essayPresets: Record<string, {
  label: string;
  badge: string;
  description: string;
  summaryWeights: string;
  criteria: RubricCriterionConfig[];
}> = {
  conceptual: {
    label: "Khái niệm & Nguyên lý",
    badge: "50% • 30% • 20%",
    description: "Giải thích chính xác nguyên lý, bản chất cốt lõi và ví dụ thực tế.",
    summaryWeights: "Chính xác (50%) • Bản chất (30%) • Ví dụ (20%)",
    criteria: [
      { name: "Tính chính xác của khái niệm / cơ chế", weight: 50, guide: "Giải thích chính xác nguyên lý, bản chất và các khái niệm cốt lõi." },
      { name: "Thuật ngữ chuyên môn & Bản chất hoạt động", weight: 30, guide: "Sử dụng đúng thuật ngữ kỹ thuật, giải thích rõ cách thức hoạt động bên dưới." },
      { name: "Ví dụ minh họa thực tế", weight: 20, guide: "Có ví dụ minh họa hoặc tình huống áp dụng thực tế phù hợp." },
    ],
  },
  comparison: {
    label: "So sánh & Đánh đổi (Trade-offs)",
    badge: "30% • 40% • 30%",
    description: "So sánh ưu/nhược điểm đa chiều và khuyến nghị bối cảnh ứng dụng thực tế.",
    summaryWeights: "Đặc điểm (30%) • Đánh đổi (40%) • Ngữ cảnh (30%)",
    criteria: [
      { name: "Hiểu rõ đặc điểm của từng công nghệ / giải pháp", weight: 30, guide: "Nắm vững bản chất, kiến trúc và đặc tính cốt lõi của từng phương án." },
      { name: "Phân tích ưu/nhược điểm đa chiều", weight: 40, guide: "So sánh toàn diện ưu và nhược điểm về hiệu năng, độ phức tạp, bảo trì và mở rộng." },
      { name: "Độ phù hợp của ngữ cảnh áp dụng thực tế", weight: 30, guide: "Đưa ra tiêu chí lựa chọn và khuyến nghị trường hợp nào nên dùng giải pháp nào." },
    ],
  },
  scenario: {
    label: "Tình huống & Sự cố (Troubleshooting)",
    badge: "30% • 40% • 30%",
    description: "Phân tích nguyên nhân gốc rễ, tính khả thi giải pháp và biện pháp phòng ngừa.",
    summaryWeights: "Root Cause (30%) • Giải pháp (40%) • Giám sát (30%)",
    criteria: [
      { name: "Phân tích nguyên nhân gốc rễ (Root Cause Analysis)", weight: 30, guide: "Xác định chính xác nguyên nhân tiềm ẩn và phương pháp điều tra, cô lập sự cố." },
      { name: "Tính khả thi và hiệu quả của giải pháp", weight: 40, guide: "Phương án khắc phục ngắn hạn và giải pháp dài hạn rõ ràng, có tính khả thi cao." },
      { name: "Biện pháp dự phòng / Giám sát lâu dài", weight: 30, guide: "Biện pháp phòng ngừa lặp lại, thiết lập monitoring, alerting và xử lý rủi ro." },
    ],
  },
  architecture: {
    label: "Thiết kế giải pháp / Kiến trúc",
    badge: "40% • 35% • 25%",
    description: "Thiết kế luồng dữ liệu, xử lý chịu lỗi / bảo mật và khả năng mở rộng.",
    summaryWeights: "Cấu trúc luồng (40%) • Chịu lỗi (35%) • Mở rộng (25%)",
    criteria: [
      { name: "Cấu trúc luồng và tính khả thi", weight: 40, guide: "Thiết kế kiến trúc / luồng dữ liệu hợp lý, phân tách trách nhiệm rõ ràng." },
      { name: "Xử lý edge-case, chịu lỗi và bảo mật", weight: 35, guide: "Tính toán kịch bản lỗi, bảo đảm tính toàn vẹn dữ liệu, idempotency và an toàn." },
      { name: "Khả năng mở rộng (Scalability)", weight: 25, guide: "Khả năng đáp ứng tải cao, tối ưu tài nguyên và chiến lược scale." },
    ],
  },
};

const defaultEssayCriteria: RubricCriterionConfig[] = essayPresets.conceptual.criteria;

const inputClass = "mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-normal text-[#101828] transition-all focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
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
    toast.info("Đã khôi phục cấu hình về giá trị ban đầu");
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
          "Đã lưu cấu hình bài tập",
          "Hệ thống sẽ áp dụng cấu hình này để tự động tạo đề cho các hồ sơ ứng viên.",
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
                {tab === "general" ? "Cài đặt chung" : "Cơ cấu bài tập"}
              </h2>
              <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
                {tab === "general"
                  ? "Thiết lập tiêu chuẩn điểm đạt, thời lượng làm bài và quy tắc giao đề tự động."
                  : "Phân bổ số lượng câu hỏi, điểm số và độ khó theo từng nhóm kỹ năng."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-semibold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">
                Tổng đề: {count} câu hỏi · {total} điểm
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={!isDirty || mutation.isPending}
                title="Khôi phục lại cấu hình ban đầu"
                className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Khôi phục</span>
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={mutation.isPending || !jobSkills.length}
                className="gap-1.5"
              >
                <Save className="size-3.5" aria-hidden="true" />
                {mutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#101828] dark:text-white">Cấu hình Assessment</h2>
                <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
                  Thiết lập cấu trúc đề thi tự động cho vị trí <strong className="text-[#101828] dark:text-white">{job.title}</strong>.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0066FF]">
                  {count} câu hỏi · {total} điểm
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
                  <span className="hidden sm:inline">Khôi phục</span>
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={mutation.isPending || !jobSkills.length}
                  className="gap-1.5"
                >
                  <Save className="size-3.5" aria-hidden="true" />
                  {mutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
                </Button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="mb-6 flex gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-800" role="tablist" aria-label="Cấu hình Assessment">
              {([
                { id: "general", label: "Cài đặt chung", icon: Settings2 },
                { id: "exercise", label: "Cơ cấu bài tập", icon: ClipboardList },
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
                      ? "bg-blue-50 text-[#0066FF] font-semibold shadow-2xs dark:bg-blue-950 dark:text-blue-300"
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
              <span>Vị trí tuyển dụng chưa có kỹ năng (skills). Vui lòng thêm skill cho job trước khi cấu hình.</span>
            </div>
          )}

          {/* Khối 1: Tiêu chuẩn đạt & Điểm số */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                <Target className="size-4" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                  Tiêu chuẩn đạt (Passing Score)
                </h3>
                <Tooltip
                  content="Tỷ lệ phần trăm điểm số tối thiểu để ứng viên được xét vượt qua bài kiểm tra chuyên môn."
                  side="top"
                >
                  <span className="inline-flex cursor-help items-center text-slate-400 hover:text-blue-600 transition-colors">
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                  </span>
                </Tooltip>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="block text-[13px] font-semibold text-[#344054] dark:text-slate-200">
                    Điểm đạt chuẩn (%)
                  </label>
                  <Tooltip
                    content="Ngưỡng tối thiểu được hệ thống dùng để phân loại tự động kết quả ứng viên (Đạt / Không đạt)."
                    side="top"
                  >
                    <span className="inline-flex cursor-help items-center text-slate-400 hover:text-blue-600 transition-colors">
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
              <div className="flex flex-col justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                    Ngưỡng điểm cần đạt thực tế
                  </span>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {passingPercent}%
                  </span>
                </div>
                <div className="my-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[#0066FF] dark:text-blue-400">
                      {minRequiredPoints}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      / {total} điểm tổng đề
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200/60 dark:bg-blue-900/40">
                    <div
                      className="h-full rounded-full bg-[#0066FF] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, Number(passingPercent) || 0))}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                  Ứng viên cần đạt tối thiểu <strong>{minRequiredPoints} điểm</strong> để hoàn thành bài test cho vị trí này.
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
                  Thời lượng làm bài (Time Limit)
                </h3>
                <Tooltip
                  content="Quy định giới hạn thời gian tính từ thời điểm ứng viên bấm nút bắt đầu làm bài."
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
                    Tổng thời gian làm bài (phút)
                  </label>
                  <Tooltip
                    content="Tổng thời lượng tối đa cho toàn bộ bài kiểm tra (bao gồm tất cả phần thi trắc nghiệm, tự luận, code)."
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
                    phút
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
                      Thời gian trắc nghiệm riêng (phút)
                    </label>
                    <Tooltip
                      content="Tự động khóa phần trắc nghiệm khi hết giờ quy định. Để trống nếu muốn tính chung vào tổng thời gian làm bài."
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-amber-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">Tuỳ chọn</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    {...register("objectiveDurationMinutes", {
                      setValueAs: (value) => (value === "" || value == null ? null : Number(value)),
                    })}
                    placeholder="Không giới hạn riêng"
                    className={cn(inputClass, "pr-14 font-semibold text-base")}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    phút
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
                  Quy tắc giao đề (Automation & Delivery)
                </h3>
                <Tooltip
                  content="Tự động hóa quy trình phân phối bài kiểm tra khi hồ sơ ứng viên tiến triển trong quy trình tuyển dụng."
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
                  className="size-4 shrink-0 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF] accent-[#0066FF]"
                />
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-bold text-[#101828] dark:text-white">
                    Tự động giao đề cho ứng viên khi vào vòng Assessment
                  </span>
                  <Tooltip
                    content="Hệ thống sẽ tự động bốc câu hỏi từ Ngân hàng câu hỏi theo đúng cơ cấu tỷ trọng đã cấu hình để sinh đề thi độc bản cho từng ứng viên ngay khi ứng viên chuyển sang giai đoạn Assessment."
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
                    Đang bật
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Thủ công
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Khối 4: Quy tắc chấm đề & Giao kết quả (Grading & Result Publishing) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                  Quy tắc chấm đề &amp; Giao kết quả (Grading &amp; Delivery)
                </h3>
                <Tooltip
                  content="Cấu hình cơ chế công bố điểm: Tự động gửi kết quả cho ứng viên ngay sau khi chấm hoặc chờ Nhà tuyển dụng duyệt."
                  side="top"
                >
                  <span className="inline-flex cursor-help items-center text-slate-400 hover:text-purple-600 transition-colors">
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
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF] accent-[#0066FF]"
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#101828] dark:text-white">
                      Tự động chấm điểm đề và giao kết quả cho ứng viên
                    </span>
                    <Tooltip
                      content="Nếu bật: Sau khi AI & Sandbox chấm xong bài, hệ thống sẽ tự động chốt điểm chính thức và gửi email kết quả cho ứng viên ngay lập tức, không cần Nhà tuyển dụng xác nhận."
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-purple-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    {autoGradingEnabled
                      ? "Đang bật: AI & Sandbox chấm xong sẽ chốt điểm và gửi email kết quả cho ứng viên ngay, không cần xác nhận thủ công."
                      : "Đang tắt: AI chấm đề xuất trước, Nhà tuyển dụng có thể vào xem bài thi, điều chỉnh điểm và duyệt kết quả như hiện tại."}
                  </p>
                </div>
              </label>
              <div className="shrink-0 self-start sm:self-center">
                {autoGradingEnabled ? (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/60">
                    Tự động gửi điểm
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Duyệt thủ công
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
                  label: "Trắc nghiệm",
                  count: mcqCount,
                  suffix: "câu",
                  points: mcqPoints,
                  percent: mcqPercent,
                  icon: ListChecks,
                  iconClass: "text-blue-600 dark:text-blue-400",
                  iconBg: "bg-blue-50 border-blue-200/60 dark:bg-blue-950 dark:border-blue-800",
                  badgeClass: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950 dark:text-blue-300",
                  activeBorder: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-400",
                },
                {
                  id: "ESSAY" as const,
                  label: "Tự luận lý thuyết",
                  count: essayCount,
                  suffix: "câu",
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
                  label: "Tự luận Code",
                  count: codingCount,
                  suffix: "bài",
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
                        {item.points} điểm
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {exerciseFilter !== "ALL" ? (
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Đang hiển thị dạng:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {exerciseFilter === "MCQ" ? "Trắc nghiệm" : exerciseFilter === "ESSAY" ? "Tự luận lý thuyết" : "Tự luận Code"}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setExerciseFilter("ALL")}
                  className="font-medium text-[#0066FF] hover:underline dark:text-blue-400 cursor-pointer"
                >
                  Hiển thị tất cả 3 phần
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Đang hiển thị đồng thời cả 3 phần bài tập</span>
                <button
                  type="button"
                  onClick={() => setExerciseFilter("MCQ")}
                  className="font-medium text-[#0066FF] hover:underline dark:text-blue-400 cursor-pointer"
                >
                  Chỉ xem dạng Trắc nghiệm
                </button>
              </div>
            )}
          </div>

          {/* 1. KHỐI TRẮC NGHIỆM */}
          {(exerciseFilter === "ALL" || exerciseFilter === "MCQ") && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
                    <ListChecks className="size-4" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Trắc nghiệm
                    </h4>
                    <Tooltip
                      content="Chấm điểm tự động 100% theo đáp án đúng. Hỗ trợ câu hỏi 1 đáp án (MCQ) và nhiều đáp án (MULTIPLE_CHOICE)."
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-blue-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
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
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
                            {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} đ
                          </span>
                          <button
                            type="button"
                            disabled={fields.length === 1 || mutation.isPending}
                            onClick={() => remove(index)}
                            aria-label={`Xóa nhóm trắc nghiệm ${groupOrder + 1}`}
                            className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          Skill
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">Chọn skill</option>
                            {jobSkills.map((skill) => (
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
                <Plus className="size-4 text-blue-600" /> Thêm nhóm câu hỏi trắc nghiệm
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
                      Tự luận lý thuyết
                    </h4>
                    <Tooltip
                      content="AI tự động đối chiếu Đáp án tham khảo chuẩn (Reference Answer) và chấm theo các tiêu chí Rubric (% trọng số)"
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-amber-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
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
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
                            {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} đ
                          </span>
                          <button
                            type="button"
                            disabled={fields.length === 1 || mutation.isPending}
                            onClick={() => remove(index)}
                            aria-label={`Xóa nhóm tự luận lý thuyết ${groupOrder + 1}`}
                            className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          Skill
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">Chọn skill</option>
                            {jobSkills.map((skill) => (
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

              {/* KHỐI CẤU HÌNH TÍNH ĐIỂM TỰ LUẬN LÝ THUYẾT (AI RUBRIC ARCHETYPES) */}
              <div className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 p-5 space-y-4 dark:border-amber-900/40 dark:bg-amber-950/10">
                <div className="flex items-center justify-between">
                  <h5 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Scale className="size-4 text-amber-600" /> Mẫu tiêu chuẩn chấm điểm tự luận AI (Rubric Archetypes)
                    <Tooltip
                      content="Bộ tiêu chuẩn mặc định cho Job. Khi soạn câu hỏi trong ngân hàng, câu hỏi sẽ kế thừa hoặc người ra đề có thể ghi đè riêng nếu có yêu cầu đặc thù."
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-amber-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </h5>
                </div>

                {/* 4 Thẻ chọn nhanh Rubric Archetype */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
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
                          "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
                          isMatching
                            ? "border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-500/30 dark:border-amber-600 dark:bg-amber-950/30"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "flex size-7 items-center justify-center rounded-lg text-xs",
                              isMatching ? "bg-amber-500 text-white shadow-2xs" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            )}>
                              <IconComp className="size-3.5" />
                            </span>
                            {isMatching ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                <Check className="size-3" /> Đang áp dụng
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] text-slate-500 font-semibold">{preset.badge}</span>
                            )}
                          </div>
                          <h6 className={cn("text-xs font-bold leading-tight", isMatching ? "text-amber-950 dark:text-amber-200" : "text-slate-800 dark:text-slate-200")}>
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
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lưu ý đặc biệt cho AI khi chấm tự luận (Tùy chọn)
                    <Tooltip
                      content="Nội dung này sẽ được chuyển thành System Prompt hướng dẫn AI khi chấm điểm và phân tích câu trả lời của ứng viên"
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-amber-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </label>
                  <textarea
                    rows={2}
                    {...register("essayGradingGuide")}
                    placeholder="Ví dụ: Chấp nhận thuật ngữ tiếng Anh tương đương; Ưu tiên câu trả lời đưa ra ví dụ minh họa thực tế; Không bắt bẻ lỗi chính tả nhỏ..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                      Tự luận Code
                    </h4>
                    <Tooltip
                      content="Chấm linh hoạt: Chạy Sandbox Test Cases kết hợp AI Code Review đánh giá cấu trúc, độ phức tạp & Clean Code"
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-emerald-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                  {codingCount} bài · {codingPoints} điểm ({codingPercent}%)
                </span>
              </div>

              {/* CARD CẤU HÌNH TỶ TRỌNG TÍNH ĐIỂM CODE */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-5 space-y-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h5 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Sliders className="size-4 text-emerald-600" /> Tỷ trọng tính điểm bài tập Code
                    <Tooltip
                      content="Tỷ lệ phân bổ điểm giữa việc vượt qua Test Cases trong Sandbox và chất lượng mã nguồn do AI đánh giá"
                      side="top"
                    >
                      <span className="inline-flex cursor-help items-center text-slate-400 hover:text-emerald-600 transition-colors">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </h5>
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
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                            {(Number(watch(`sections.${index}.count`)) || 0) * (Number(watch(`sections.${index}.points`)) || 0)} đ
                          </span>
                          <button
                            type="button"
                            disabled={fields.length === 1 || mutation.isPending}
                            onClick={() => remove(index)}
                            aria-label={`Xóa nhóm bài tập code ${groupOrder + 1}`}
                            className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 lg:col-span-2">
                          Skill
                          <select {...register(`sections.${index}.skill`)} className={inputClass}>
                            <option value="">Chọn skill</option>
                            {jobSkills.map((skill) => (
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
      </div>

      {/* Thông báo lỗi */}
      <AssessmentError error={mutation.error} />

      {/* Hành động (Sticky Bottom Bar) */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-6 mt-4 flex items-center justify-between border-t border-slate-200/80 bg-white/95 px-6 py-3.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:-mx-6 rounded-b-2xl shadow-lg">
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
              Có thay đổi chưa lưu
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200/60 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Cấu hình đã đồng bộ
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
            title="Khôi phục lại cấu hình ban đầu"
            className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Khôi phục</span>
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={mutation.isPending || !jobSkills.length}
            className="gap-1.5"
          >
            <Save className="size-3.5" aria-hidden="true" />
            {mutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      </div>
    </form>
  );
}
