import { rubricSchema, codingSchema, contentError as getContentError } from "../utils/questionContentValidation";
import { QuestionContentFields, rubricExample, codingExample } from "./QuestionContentFields";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Save, Trash2, X } from "lucide-react";
import type { Question, QuestionRequest } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { assessmentInput as input, FieldError } from "@/components/ux/assessmentUi";

const schema = z.object({
  questionType: z.enum(["MCQ", "MULTIPLE_CHOICE", "ESSAY", "CODING"]).optional(),
  questionText: z.string().trim().min(1, "Nhập câu hỏi.").max(10000),
  points: z.number().int().min(1, "Tối thiểu 1 điểm.").max(10000),
  questionOrder: z.number().int().min(0).max(2147483647),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).nullable(),
  skill: z.string().trim().max(255).nullable(),
  explanation: z.string().trim().max(10000).nullable(),
  options: z.array(z.object({ optionText: z.string().trim().min(1, "Nhập lựa chọn.").max(5000), correct: z.boolean() }))
    .max(10),
}).superRefine((data, context) => {
  const type = data.questionType ?? "MCQ";
  if (type === "ESSAY" || type === "CODING") return;
  const correct = data.options.filter(o => o.correct).length;
  if (data.options.length < 2 || (type === "MCQ" ? correct !== 1 : correct < 2)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: type === "MCQ" ? "Chọn đúng một đáp án đúng." : "Chọn ít nhất hai đáp án đúng." });
});

function blankDefaults(order: number): QuestionRequest {
  return {
    questionType: "MCQ",
    questionText: "",
    points: 1,
    questionOrder: order,
    difficulty: null,
    skill: null,
    explanation: null,
    options: [{ optionText: "", correct: true }, { optionText: "", correct: false }],
  };
}

export function QuestionForm({ question, order, busy, onSave, onCancel }: {
  question?: Question; order: number; busy: boolean; onSave: (data: QuestionRequest) => void; onCancel: () => void;
}) {
  const [content, setContent] = useState(question?.questionType === "CODING" ? JSON.stringify(question.coding, null, 2) : question?.rubricJson ? JSON.stringify(question.rubricJson, null, 2) : rubricExample);
  const [contentError, setContentError] = useState<string>();
  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<QuestionRequest>({
    resolver: zodResolver(schema),
    defaultValues: question
      ? {
          ...question,
          questionType: question.questionType as QuestionRequest["questionType"],
          difficulty: question.difficulty ?? null,
          skill: question.skill ?? null,
          explanation: question.explanation ?? null,
        }
      : blankDefaults(order),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const options = watch("options");
  const type = watch("questionType") ?? "MCQ";
  return <form onSubmit={handleSubmit(data => {
    try {
      const subjective = type === "ESSAY" || type === "CODING";
      const parsed = subjective ? (type === "ESSAY" ? rubricSchema : codingSchema).parse(JSON.parse(content)) : null;
      onSave({ ...data, questionType: type, options: subjective ? [] : data.options, rubricJson: type === "ESSAY" ? rubricSchema.parse(parsed) : null, coding: type === "CODING" ? codingSchema.parse(parsed) : null,
        skill: data.skill?.trim() || null, explanation: data.explanation?.trim() || null });
      setContentError(undefined);
    } catch (error) { setContentError(getContentError(error)); }
  })} noValidate className="border-y border-[var(--color-outline-variant)] py-5">
    <fieldset disabled={busy} className="space-y-4">
      <h3 className="text-lg font-semibold">{question ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h3>
      <label className="block text-sm">Loại câu hỏi<select className={input} {...register("questionType")} onChange={event => {
        const next = event.target.value as QuestionRequest["questionType"]; setValue("questionType", next);
        if (next === "ESSAY" || next === "CODING") { setValue("options", []); setContent(next === "ESSAY" ? rubricExample : codingExample); }
        else if (options.length === 0) setValue("options", [{ optionText: "", correct: true }, { optionText: "", correct: false }]);
      }}><option value="MCQ">Trắc nghiệm đơn</option><option value="MULTIPLE_CHOICE">Nhiều đáp án</option><option value="ESSAY">Tự luận lý thuyết</option><option value="CODING">Bài tập Code</option></select></label>
      {(type === "ESSAY" || type === "CODING") && <QuestionContentFields type={type} value={content} onChange={setContent} />}
      <FieldError message={contentError} />
      <label className="block space-y-1 text-sm">Nội dung câu hỏi<textarea autoFocus rows={3} className={input} {...register("questionText")} /><FieldError message={errors.questionText?.message} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">Điểm<input className={input} type="number" min={1} max={10000} {...register("points", { valueAsNumber: true })} /><FieldError message={errors.points?.message} /></label>
        <label className="block text-sm">Thứ tự (từ 0)<input className={input} type="number" min={0} {...register("questionOrder", { valueAsNumber: true })} /><FieldError message={errors.questionOrder?.message} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">Độ khó
          <select className={input} {...register("difficulty", { setValueAs: (v) => (v === "" || v == null ? null : v) })}>
            <option value="">Không chọn</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <FieldError message={errors.difficulty?.message} />
        </label>
        <label className="block text-sm">Kỹ năng<input className={input} maxLength={255} {...register("skill")} /><FieldError message={errors.skill?.message} /></label>
      </div>
      <label className="block space-y-1 text-sm">Giải thích (staff)<textarea rows={2} className={input} {...register("explanation")} /><FieldError message={errors.explanation?.message} /></label>
      {(type === "MCQ" || type === "MULTIPLE_CHOICE") && <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Các lựa chọn · chọn đáp án đúng</legend>
        {fields.map((field, index) => <div key={field.id} className="flex items-start gap-2">
          <input type={type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"} className="mt-3 size-5 shrink-0 accent-[var(--color-primary)]" name="correct-option" aria-label={`Đáp án ${index + 1} đúng`} checked={options[index]?.correct ?? false}
            onChange={() => type === "MULTIPLE_CHOICE" ? setValue(`options.${index}.correct`, !options[index]?.correct, { shouldValidate: true }) : fields.forEach((_, i) => setValue(`options.${i}.correct`, i === index, { shouldValidate: true }))} />
          <div className="min-w-0 flex-1"><input className={input} aria-label={`Lựa chọn ${index + 1}`} {...register(`options.${index}.optionText`)} /><FieldError message={errors.options?.[index]?.optionText?.message} /></div>
          <Tooltip content="Xóa lựa chọn"><Button variant="ghost" disabled={fields.length <= 2 || busy} aria-label={`Xóa lựa chọn ${index + 1}`} onClick={() => remove(index)}><Trash2 className="size-4" aria-hidden="true" /></Button></Tooltip>
        </div>)}
        <FieldError message={errors.options?.message ?? errors.options?.root?.message} />
        <Button variant="secondary" disabled={fields.length >= 10 || busy} onClick={() => append({ optionText: "", correct: false })}><Plus className="size-4" aria-hidden="true" />Thêm lựa chọn</Button>
      </fieldset>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}><Save className="size-4" aria-hidden="true" />{busy ? "Đang lưu…" : "Lưu câu hỏi"}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}><X className="size-4" aria-hidden="true" />Hủy</Button></div>
    </fieldset>
  </form>;
}
