import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Sparkles, BookOpen, GitCompare, AlertTriangle, Network } from "lucide-react";
import type { EssayCategory, Question, QuestionRequest } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput as input, FieldError } from "@/components/ux/assessmentUi";

type CriterionItem = {
  name: string;
  weightPercentage: number;
  guide: string;
  requiredKeywords: string;
};

type ArchetypeDefinition = {
  label: string;
  shortLabel: string;
  icon: typeof BookOpen;
  description: string;
  criteria: CriterionItem[];
};

export const RUBRIC_ARCHETYPES: Record<EssayCategory, ArchetypeDefinition> = {
  ESSAY_CONCEPTUAL: {
    label: "Khái niệm & Nguyên lý",
    shortLabel: "Khái niệm",
    icon: BookOpen,
    description: "Giải thích chính xác nguyên lý, bản chất hoạt động và ví dụ minh họa.",
    criteria: [
      { name: "Tính chính xác của khái niệm / cơ chế", weightPercentage: 50, guide: "Giải thích chính xác nguyên lý, bản chất và các khái niệm cốt lõi.", requiredKeywords: "" },
      { name: "Thuật ngữ chuyên môn & Bản chất hoạt động", weightPercentage: 30, guide: "Sử dụng đúng thuật ngữ kỹ thuật, giải thích rõ cách thức hoạt động bên dưới.", requiredKeywords: "" },
      { name: "Ví dụ minh họa thực tế", weightPercentage: 20, guide: "Có ví dụ minh họa hoặc tình huống áp dụng thực tế phù hợp.", requiredKeywords: "" },
    ],
  },
  ESSAY_COMPARISON: {
    label: "So sánh & Đánh đổi (Trade-offs)",
    shortLabel: "So sánh",
    icon: GitCompare,
    description: "So sánh ưu/nhược điểm đa chiều và khuyến nghị bối cảnh ứng dụng thực tế.",
    criteria: [
      { name: "Hiểu rõ đặc điểm của từng công nghệ / giải pháp", weightPercentage: 30, guide: "Nắm vững bản chất, kiến trúc và đặc tính cốt lõi của từng phương án.", requiredKeywords: "" },
      { name: "Phân tích ưu/nhược điểm đa chiều", weightPercentage: 40, guide: "So sánh toàn diện ưu và nhược điểm về hiệu năng, độ phức tạp, bảo trì và mở rộng.", requiredKeywords: "" },
      { name: "Độ phù hợp của ngữ cảnh áp dụng thực tế", weightPercentage: 30, guide: "Đưa ra tiêu chí lựa chọn và khuyến nghị trường hợp nào nên dùng giải pháp nào.", requiredKeywords: "" },
    ],
  },
  ESSAY_SCENARIO: {
    label: "Tình huống & Sự cố (Troubleshooting)",
    shortLabel: "Tình huống",
    icon: AlertTriangle,
    description: "Phân tích nguyên nhân gốc rễ, tính khả thi giải pháp và biện pháp phòng ngừa.",
    criteria: [
      { name: "Phân tích nguyên nhân gốc rễ (Root Cause Analysis)", weightPercentage: 30, guide: "Xác định chính xác nguyên nhân tiềm ẩn và phương pháp điều tra, cô lập sự cố.", requiredKeywords: "" },
      { name: "Tính khả thi và hiệu quả của giải pháp", weightPercentage: 40, guide: "Phương án khắc phục ngắn hạn và giải pháp dài hạn rõ ràng, có tính khả thi cao.", requiredKeywords: "" },
      { name: "Biện pháp dự phòng / Giám sát lâu dài", weightPercentage: 30, guide: "Biện pháp phòng ngừa lặp lại, thiết lập monitoring, alerting và xử lý rủi ro.", requiredKeywords: "" },
    ],
  },
  ESSAY_ARCHITECTURE: {
    label: "Thiết kế giải pháp / Kiến trúc",
    shortLabel: "Kiến trúc",
    icon: Network,
    description: "Thiết kế luồng dữ liệu, xử lý chịu lỗi / bảo mật và khả năng mở rộng.",
    criteria: [
      { name: "Cấu trúc luồng và tính khả thi", weightPercentage: 40, guide: "Thiết kế kiến trúc / luồng dữ liệu hợp lý, phân tách trách nhiệm rõ ràng.", requiredKeywords: "" },
      { name: "Xử lý edge-case, chịu lỗi và bảo mật", weightPercentage: 35, guide: "Tính toán kịch bản lỗi, bảo đảm tính toàn vẹn dữ liệu, idempotency và an toàn.", requiredKeywords: "" },
      { name: "Khả năng mở rộng (Scalability)", weightPercentage: 25, guide: "Khả năng đáp ứng tải cao, tối ưu tài nguyên và chiến lược scale.", requiredKeywords: "" },
    ],
  },
};

const criterion = z.object({
  name: z.string().trim().min(1, "Nhập tên tiêu chí."),
  guide: z.string().trim().min(1, "Nhập hướng dẫn chấm."),
  weightPercentage: z.number().int().min(1).max(100),
  requiredKeywords: z.string(),
});

export const essayQuestionSchema = z.object({
  category: z.enum(["ESSAY_CONCEPTUAL", "ESSAY_COMPARISON", "ESSAY_SCENARIO", "ESSAY_ARCHITECTURE"]),
  questionText: z.string().trim().min(20, "Đề bài cần ít nhất 20 ký tự.").max(10000),
  points: z.number().int().min(1).max(100).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  skill: z.string().trim().min(1, "Nhập kỹ năng.").max(128),
  referenceAnswer: z.string().trim().min(1, "Nhập đáp án tham khảo.").max(10000),
  minWords: z.number().int().min(0).max(10000).optional(),
  rubric: z.array(criterion).min(1).max(5),
}).refine(value => value.rubric.reduce((sum, row) => sum + row.weightPercentage, 0) === 100, {
  path: ["rubric"], message: "Tổng trọng số phải bằng 100%.",
});

type Values = z.infer<typeof essayQuestionSchema>;

export function EssayQuestionForm({ question, order, busy, onSave, onCancel }: {
  question?: Question; order: number; busy: boolean; onSave: (value: QuestionRequest) => void; onCancel: () => void;
}) {
  const initialCategory: EssayCategory = (question?.rubricJson?.category as EssayCategory) ?? "ESSAY_CONCEPTUAL";
  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(essayQuestionSchema),
    defaultValues: {
      category: initialCategory,
      questionText: question?.questionText ?? "",
      points: question?.points ?? 10,
      difficulty: question?.difficulty ?? "Medium",
      skill: question?.skill ?? "",
      referenceAnswer: question?.rubricJson?.referenceAnswer ?? "",
      minWords: question?.rubricJson?.minWords,
      rubric: question?.rubricJson?.criteria?.map(row => ({
        name: row.name ?? row.description,
        guide: row.guide ?? row.description,
        weightPercentage: row.weight,
        requiredKeywords: row.keywords?.join(", ") ?? "",
      })) ?? RUBRIC_ARCHETYPES[initialCategory].criteria.map(c => ({ ...c })),
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "rubric" });
  const selectedCategory = watch("category");
  const total = watch("rubric").reduce((sum, row) => sum + (Number(row.weightPercentage) || 0), 0);

  const applyPreset = (cat: EssayCategory) => {
    setValue("category", cat);
    replace(RUBRIC_ARCHETYPES[cat].criteria.map(c => ({ ...c })));
  };

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(values => onSave({
        questionType: "ESSAY",
        questionText: values.questionText,
        points: values.points ?? (question?.points ?? 10),
        difficulty: values.difficulty,
        skill: values.skill || null,
        questionOrder: question?.questionOrder ?? order,
        explanation: question?.explanation ?? null,
        options: [],
        coding: null,
        rubricJson: {
          category: values.category,
          referenceAnswer: values.referenceAnswer,
          minWords: values.minWords,
          criteria: values.rubric.map((row: Values["rubric"][number]) => ({
            name: row.name,
            guide: row.guide,
            description: `${row.name}: ${row.guide}`,
            weight: row.weightPercentage,
            keywords: row.requiredKeywords.split(",").map((word: string) => word.trim()).filter(Boolean),
          })),
        },
      }))}
    >
      <fieldset disabled={busy} className="space-y-4">
        <h2 className="text-lg font-semibold">{question ? "Sửa" : "Soạn"} câu hỏi tự luận lý thuyết</h2>

        {/* LỰA CHỌN THỂ LOẠI CÂU HỎI (RUBRIC ARCHETYPE) */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Thể loại câu hỏi & Bộ tiêu chí chuẩn (Archetype)</label>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Mỗi thể loại tự luận có trọng tâm đánh giá khác nhau. Chọn thể loại để tự động nạp bộ tiêu chí và trọng số phù hợp nhất:
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(RUBRIC_ARCHETYPES) as EssayCategory[]).map(catKey => {
              const archetype = RUBRIC_ARCHETYPES[catKey];
              const Icon = archetype.icon;
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => applyPreset(catKey)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] shadow-xs"
                      : "border-[var(--color-border-default)] bg-[var(--color-surface-card)] hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                    <Icon className="size-4 shrink-0" />
                    <span>{archetype.label}</span>
                  </div>
                  <span className="text-[11px] leading-tight text-[var(--color-on-surface-variant)] line-clamp-2">
                    {archetype.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block text-sm">
          Đề bài / tình huống
          <textarea autoFocus rows={5} className={input} {...register("questionText")} />
          <FieldError message={errors.questionText?.message} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Độ khó
            <select className={input} {...register("difficulty")}>
              <option value="Easy">Dễ</option>
              <option value="Medium">Trung bình</option>
              <option value="Hard">Khó</option>
            </select>
          </label>
          <label className="text-sm">
            Kỹ năng
            <input className={input} {...register("skill")} />
            <FieldError message={errors.skill?.message} />
          </label>
        </div>

        <p className="text-xs italic text-[var(--color-on-surface-variant)]">
          * Điểm số bài tự luận được tự động tính theo tỷ trọng trong cấu hình bài tập của vị trí tuyển dụng.
        </p>

        <label className="block text-sm">
          Đáp án mẫu tham khảo
          <textarea rows={5} className={input} {...register("referenceAnswer")} />
          <FieldError message={errors.referenceAnswer?.message} />
        </label>

        <label className="block text-sm">
          Số từ tối thiểu gợi ý (tùy chọn)
          <input
            type="number"
            min={0}
            className={input}
            {...register("minWords", { setValueAs: value => (value === "" ? undefined : Number(value)) })}
          />
          <FieldError message={errors.minWords?.message} />
        </label>

        {/* KHỐI TIÊU CHÍ RUBRIC */}
        <section className="space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-primary-subtle)] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-sm">Tiêu chí chấm điểm tự động (AI Rubric)</h3>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                Đang áp dụng mẫu: <strong>{RUBRIC_ARCHETYPES[selectedCategory]?.label}</strong>
              </p>
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={() => replace(RUBRIC_ARCHETYPES[selectedCategory].criteria.map(c => ({ ...c })))}
            >
              <Sparkles className="size-4" /> Khôi phục mẫu {RUBRIC_ARCHETYPES[selectedCategory]?.shortLabel}
            </Button>
          </div>

          {fields.map((field, index) => (
            <fieldset key={field.id} className="space-y-3 rounded-lg bg-[var(--color-surface-card)] p-4">
              <legend className="text-sm font-medium">Tiêu chí {index + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="text-sm">
                  Tên tiêu chí
                  <input className={input} {...register(`rubric.${index}.name`)} />
                  <FieldError message={errors.rubric?.[index]?.name?.message} />
                </label>
                <label className="text-sm">
                  Trọng số (%)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={input}
                    {...register(`rubric.${index}.weightPercentage`, { valueAsNumber: true })}
                  />
                  <FieldError message={errors.rubric?.[index]?.weightPercentage?.message} />
                </label>
              </div>
              <label className="block text-sm">
                Hướng dẫn chấm cho AI
                <textarea rows={3} className={input} {...register(`rubric.${index}.guide`)} />
                <FieldError message={errors.rubric?.[index]?.guide?.message} />
              </label>
              <label className="block text-sm">
                Từ khóa kỹ thuật bắt buộc (phân cách bằng dấu phẩy)
                <input className={input} {...register(`rubric.${index}.requiredKeywords`)} />
              </label>
              <Button
                variant="ghost"
                disabled={fields.length <= 1}
                aria-label={`Xóa tiêu chí ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Xóa tiêu chí
              </Button>
            </fieldset>
          ))}

          <progress
            className="h-2 w-full accent-[var(--color-primary)]"
            max={100}
            value={Math.min(total, 100)}
            aria-label="Tổng trọng số rubric"
          />
          <p
            role={total === 100 ? "status" : "alert"}
            className={total === 100 ? "text-sm text-emerald-600 font-medium" : "text-sm text-[var(--color-error)]"}
          >
            {total === 100
              ? "Tổng trọng số: 100% (Hợp lệ)"
              : `Tổng trọng số các tiêu chí phải đạt 100% (Hiện tại: ${total}%)`}
          </p>
          <FieldError message={errors.rubric?.root?.message ?? errors.rubric?.message} />
          <Button
            variant="secondary"
            type="button"
            disabled={fields.length >= 5}
            onClick={() => append({ name: "", guide: "", weightPercentage: 1, requiredKeywords: "" })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Thêm tiêu chí
          </Button>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || total !== 100}>
            {busy ? "Đang lưu…" : "Lưu câu hỏi tự luận"}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Hủy
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

