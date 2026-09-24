import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Save, Trash2, X } from "lucide-react";
import type { Question, QuestionRequest } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { assessmentInput as input, FieldError } from "@/components/ux/assessmentUi";

const schema = z.object({
  questionText: z.string().trim().min(1, "Nhập câu hỏi.").max(10000),
  points: z.number().int().min(1, "Tối thiểu 1 điểm.").max(10000),
  questionOrder: z.number().int().min(0).max(2147483647),
  options: z.array(z.object({ optionText: z.string().trim().min(1, "Nhập lựa chọn.").max(5000), correct: z.boolean() }))
    .min(2).max(10).refine(options => options.filter(o => o.correct).length === 1, "Chọn đúng một đáp án đúng."),
});

export function QuestionForm({ question, order, busy, onSave, onCancel }: {
  question?: Question; order: number; busy: boolean; onSave: (data: QuestionRequest) => void; onCancel: () => void;
}) {
  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<QuestionRequest>({
    resolver: zodResolver(schema), defaultValues: question ?? { questionText: "", points: 1, questionOrder: order,
      options: [{ optionText: "", correct: true }, { optionText: "", correct: false }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const options = watch("options");
  return <form onSubmit={handleSubmit(onSave)} noValidate className="border-y border-[var(--color-outline-variant)] py-5">
    <fieldset disabled={busy} className="space-y-4">
      <h3 className="text-lg font-semibold">{question ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h3>
      <label className="block space-y-1 text-sm">Nội dung câu hỏi<textarea autoFocus rows={3} className={input} {...register("questionText")} /><FieldError message={errors.questionText?.message} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">Điểm<input className={input} type="number" min={1} max={10000} {...register("points", { valueAsNumber: true })} /><FieldError message={errors.points?.message} /></label>
        <label className="block text-sm">Thứ tự (từ 0)<input className={input} type="number" min={0} {...register("questionOrder", { valueAsNumber: true })} /><FieldError message={errors.questionOrder?.message} /></label>
      </div>
      <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Các lựa chọn · chọn đáp án đúng</legend>
        {fields.map((field, index) => <div key={field.id} className="flex items-start gap-2">
          <input type="radio" className="mt-3 size-5 shrink-0 accent-[var(--color-primary)]" name="correct-option" aria-label={`Đáp án ${index + 1} đúng`} checked={options[index]?.correct ?? false}
            onChange={() => fields.forEach((_, i) => setValue(`options.${i}.correct`, i === index, { shouldValidate: true }))} />
          <div className="min-w-0 flex-1"><input className={input} aria-label={`Lựa chọn ${index + 1}`} {...register(`options.${index}.optionText`)} /><FieldError message={errors.options?.[index]?.optionText?.message} /></div>
          <Tooltip content="Xóa lựa chọn"><Button variant="ghost" disabled={fields.length <= 2 || busy} aria-label={`Xóa lựa chọn ${index + 1}`} onClick={() => remove(index)}><Trash2 className="size-4" aria-hidden="true" /></Button></Tooltip>
        </div>)}
        <FieldError message={errors.options?.message ?? errors.options?.root?.message} />
        <Button variant="secondary" disabled={fields.length >= 10 || busy} onClick={() => append({ optionText: "", correct: false })}><Plus className="size-4" aria-hidden="true" />Thêm lựa chọn</Button>
      </fieldset>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}><Save className="size-4" aria-hidden="true" />{busy ? "Đang lưu…" : "Lưu câu hỏi"}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}><X className="size-4" aria-hidden="true" />Hủy</Button></div>
    </fieldset>
  </form>;
}
