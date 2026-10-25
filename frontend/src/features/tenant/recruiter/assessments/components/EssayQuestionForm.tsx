import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import type { Question, QuestionRequest } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput as input, FieldError } from "@/components/ux/assessmentUi";

const criterion = z.object({ name: z.string().trim().min(1, "Nhập tên tiêu chí."), guide: z.string().trim().min(1, "Nhập hướng dẫn chấm."), weightPercentage: z.number().int().min(1).max(100), requiredKeywords: z.string() });
export const essayQuestionSchema = z.object({
  questionText: z.string().trim().min(20, "Đề bài cần ít nhất 20 ký tự.").max(10000),
  points: z.number().int().min(1).max(100).optional(), difficulty: z.enum(["Easy", "Medium", "Hard"]),
  skill: z.string().trim().min(1, "Nhập kỹ năng.").max(128), referenceAnswer: z.string().trim().min(1, "Nhập đáp án tham khảo.").max(10000),
  minWords: z.number().int().min(0).max(10000).optional(), rubric: z.array(criterion).min(1).max(5),
}).refine(value => value.rubric.reduce((sum, row) => sum + row.weightPercentage, 0) === 100, { path: ["rubric"], message: "Tổng trọng số phải bằng 100%." });
type Values = z.infer<typeof essayQuestionSchema>;
const template: Values["rubric"] = [
  { name: "Bản chất cốt lõi", weightPercentage: 40, guide: "Giải thích chính xác nguyên lý và các khái niệm cốt lõi.", requiredKeywords: "" },
  { name: "Phân tích & So sánh Trade-offs", weightPercentage: 30, guide: "Phân tích ưu, nhược điểm và điều kiện áp dụng của từng phương án.", requiredKeywords: "" },
  { name: "Tính logic & Thực tế", weightPercentage: 30, guide: "Lập luận nhất quán, có ví dụ thực tế phù hợp.", requiredKeywords: "" },
];

export function EssayQuestionForm({ question, order, busy, onSave, onCancel }: {
  question?: Question; order: number; busy: boolean; onSave: (value: QuestionRequest) => void; onCancel: () => void;
}) {
  const { register, control, watch, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(essayQuestionSchema), defaultValues: {
    questionText: question?.questionText ?? "", points: question?.points ?? 10, difficulty: question?.difficulty ?? "Medium", skill: question?.skill ?? "",
    referenceAnswer: question?.rubricJson?.referenceAnswer ?? "", minWords: question?.rubricJson?.minWords,
    rubric: question?.rubricJson?.criteria.map(row => ({ name: row.name ?? row.description, guide: row.guide ?? row.description, weightPercentage: row.weight, requiredKeywords: row.keywords?.join(", ") ?? "" })) ?? template,
  } });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "rubric" });
  const total = watch("rubric").reduce((sum, row) => sum + (Number(row.weightPercentage) || 0), 0);
  return <form noValidate className="space-y-5" onSubmit={handleSubmit(values => onSave({
    questionType: "ESSAY", questionText: values.questionText, points: values.points ?? (question?.points ?? 10), difficulty: values.difficulty, skill: values.skill || null,
    questionOrder: question?.questionOrder ?? order, explanation: question?.explanation ?? null, options: [], coding: null,
    rubricJson: { category: question?.rubricJson?.category ?? "ESSAY_CONCEPTUAL", referenceAnswer: values.referenceAnswer, minWords: values.minWords,
      criteria: values.rubric.map(row => ({ name: row.name, guide: row.guide, description: `${row.name}: ${row.guide}`, weight: row.weightPercentage, keywords: row.requiredKeywords.split(",").map(word => word.trim()).filter(Boolean) })) },
  }))}>
    <fieldset disabled={busy} className="space-y-4">
      <h2 className="text-lg font-semibold">{question ? "Sửa" : "Soạn"} câu hỏi tự luận</h2>
      <label className="block text-sm">Đề bài / tình huống<textarea autoFocus rows={5} className={input} {...register("questionText")} /><FieldError message={errors.questionText?.message} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Độ khó<select className={input} {...register("difficulty")}><option value="Easy">Dễ</option><option value="Medium">Trung bình</option><option value="Hard">Khó</option></select></label>
        <label className="text-sm">Kỹ năng<input className={input} {...register("skill")} /><FieldError message={errors.skill?.message} /></label>
      </div>
      <p className="text-xs italic text-[var(--color-on-surface-variant)]">
        * Điểm số và bộ tiêu chuẩn chấm tự luận được cấu hình tự động trong mục <strong>Cấu hình bài tập</strong> của vị trí tuyển dụng.
      </p>
      <label className="block text-sm">Đáp án mẫu tham khảo<textarea rows={5} className={input} {...register("referenceAnswer")} /><FieldError message={errors.referenceAnswer?.message} /></label>
      <label className="block text-sm">Số từ tối thiểu gợi ý (tùy chọn)<input type="number" min={0} className={input} {...register("minWords", { setValueAs: value => value === "" ? undefined : Number(value) })} /><FieldError message={errors.minWords?.message} /></label>
      <section className="space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-primary-subtle)] p-4">
        <h3 className="font-semibold">Cấu hình tiêu chí chấm điểm tự động (AI Rubric)</h3>
        <Button variant="secondary" onClick={() => replace(template)}>Tải cấu hình mẫu chuẩn</Button>
        {fields.map((field, index) => <fieldset key={field.id} className="space-y-3 rounded-lg bg-[var(--color-surface-card)] p-4"><legend className="text-sm font-medium">Tiêu chí {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="text-sm">Tên tiêu chí<input className={input} {...register(`rubric.${index}.name`)} /><FieldError message={errors.rubric?.[index]?.name?.message} /></label>
            <label className="text-sm">Trọng số (%)<input type="number" min={1} max={100} className={input} {...register(`rubric.${index}.weightPercentage`, { valueAsNumber: true })} /><FieldError message={errors.rubric?.[index]?.weightPercentage?.message} /></label>
          </div>
          <label className="block text-sm">Hướng dẫn chấm<textarea rows={3} className={input} {...register(`rubric.${index}.guide`)} /><FieldError message={errors.rubric?.[index]?.guide?.message} /></label>
          <label className="block text-sm">Từ khóa kỹ thuật (phân cách bằng dấu phẩy)<input className={input} {...register(`rubric.${index}.requiredKeywords`)} /></label>
          <Button variant="ghost" disabled={fields.length <= 1} aria-label={`Xóa tiêu chí ${index + 1}`} onClick={() => remove(index)}><Trash2 className="size-4" aria-hidden="true" />Xóa tiêu chí</Button>
        </fieldset>)}
        <progress className="h-2 w-full accent-[var(--color-primary)]" max={100} value={Math.min(total, 100)} aria-label="Tổng trọng số rubric" />
        <p role={total === 100 ? "status" : "alert"} className={total === 100 ? "text-sm" : "text-sm text-[var(--color-error)]"}>{total === 100 ? "Tổng trọng số: 100%" : `Tổng trọng số các tiêu chí phải đạt 100% (Hiện tại: ${total}%)`}</p>
        <FieldError message={errors.rubric?.root?.message ?? errors.rubric?.message} />
        <Button variant="secondary" disabled={fields.length >= 5} onClick={() => append({ name: "", guide: "", weightPercentage: 1, requiredKeywords: "" })}><Plus className="size-4" aria-hidden="true" />Thêm tiêu chí</Button>
      </section>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || total !== 100}>{busy ? "Đang lưu…" : "Lưu câu hỏi tự luận"}</Button><Button variant="secondary" onClick={onCancel}>Hủy</Button></div>
    </fieldset>
  </form>;
}
