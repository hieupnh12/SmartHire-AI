import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Play, Trash2 } from "lucide-react";
import type { Question, QuestionRequest } from "@/api/types/assessment";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentInput as input, FieldError } from "@/components/ux/assessmentUi";
import { MonacoCodeEditor } from "./MonacoCodeEditor";

const languages = ["java", "python", "javascript", "cpp", "sql"] as const;
const codeTemplates = z.record(z.string().max(10000));
export const codingProblemSchema = z.object({
  title: z.string().trim().min(1, "Nhập tên bài toán.").max(255), prompt: z.string().trim().min(20, "Mô tả cần ít nhất 20 ký tự.").max(10000),
  points: z.number().int().min(1).max(100).optional(), difficulty: z.enum(["Easy", "Medium", "Hard"]), skill: z.string().trim().min(1, "Nhập kỹ năng.").max(128),
  category: z.enum(["CODING_ALGORITHM", "CODING_OOP", "SQL_QUERY"]), timeLimitMs: z.number().int().min(500).max(5000), memoryMb: z.number().int().min(64).max(512),
  allowedLanguages: z.array(z.enum(languages)).min(1, "Chọn ít nhất một ngôn ngữ."), starterCode: codeTemplates, harness: codeTemplates,
  testCases: z.array(z.object({ input: z.string().max(10000), expectedOutput: z.string().max(10000), sample: z.boolean(), weight: z.number().min(0).max(100).multipleOf(0.01, "Trọng số tối đa hai chữ số thập phân.") })).min(3).max(50),
}).superRefine((value, context) => {
  for (const language of value.allowedLanguages) {
    if (!value.harness[language]?.includes("{{SOURCE}}")) context.addIssue({ code: "custom", path: ["harness", language], message: "Chương trình kiểm thử cần chứa {{SOURCE}} để chèn lời giải." });
  }
  const hidden = value.testCases.filter(row => !row.sample);
  if (!value.testCases.some(row => row.sample) || hidden.length < 2) context.addIssue({ code: "custom", path: ["testCases"], message: "Cần ít nhất 1 test công khai và 2 test ẩn." });
  if (hidden.some(row => row.weight <= 0) || Math.abs(hidden.reduce((sum, row) => sum + row.weight, 0) - 100) > 0.000001) context.addIssue({ code: "custom", path: ["testCases"], message: "Trọng số test ẩn phải dương và tổng bằng 100%." });
});
type Values = z.infer<typeof codingProblemSchema>;

function toRequest(value: Values, order: number, explanation: string | null): QuestionRequest {
  const select = (templates: Record<string, string>) => Object.fromEntries(value.allowedLanguages.map(language => [language, templates[language] ?? ""]));
  return { questionText: value.prompt, points: value.points ?? 10, questionOrder: order, difficulty: value.difficulty, skill: value.skill || null, explanation,
    options: [], questionType: "CODING", rubricJson: null, coding: { title: value.title, category: value.category, timeLimitMs: value.timeLimitMs, memoryMb: value.memoryMb,
      starterCode: select(value.starterCode), harness: select(value.harness), testCases: value.testCases.map(row => ({ ...row, weight: row.sample ? 0 : row.weight })) } };
}

export function CodingProblemForm({ question, order, busy, onSave, onCancel }: {
  question?: Question; order: number; busy: boolean; onSave: (value: QuestionRequest) => void; onCancel: () => void;
}) {
  const [tab, setTab] = useState<"description" | "code" | "tests">("description");
  const [language, setLanguage] = useState<string>(Object.keys(question?.coding?.starterCode ?? {})[0] ?? "java");
  const [solution, setSolution] = useState("");
  const hiddenCount = question?.coding?.testCases.filter(row => !row.sample).length ?? 2;
  let hiddenIndex = 0;
  const equalWeight = Math.floor(10000 / Math.max(1, hiddenCount)) / 100;
  const { register, control, watch, handleSubmit, setValue, formState: { errors } } = useForm<Values>({ resolver: zodResolver(codingProblemSchema), defaultValues: {
    title: question?.coding?.title ?? question?.questionText.slice(0, 255) ?? "", prompt: question?.questionText ?? "", points: question?.points ?? 10,
    difficulty: question?.difficulty ?? "Medium", skill: question?.skill ?? "", category: question?.coding?.category ?? "CODING_ALGORITHM",
    timeLimitMs: question?.coding?.timeLimitMs ?? 2000, memoryMb: question?.coding?.memoryMb ?? 256,
    allowedLanguages: Object.keys(question?.coding?.starterCode ?? { java: "" }) as Values["allowedLanguages"], starterCode: question?.coding?.starterCode ?? { java: "" }, harness: question?.coding?.harness ?? { java: "{{SOURCE}}" },
    testCases: question?.coding?.testCases.map(row => ({ ...row, weight: row.sample ? 0 : row.weight ?? (++hiddenIndex === hiddenCount ? Number((100 - equalWeight * (hiddenCount - 1)).toFixed(2)) : equalWeight) })) ?? [
      { input: "", expectedOutput: "", sample: true, weight: 0 }, { input: "", expectedOutput: "", sample: false, weight: 50 }, { input: "", expectedOutput: "", sample: false, weight: 50 },
    ],
  } });
  const { fields, append, remove } = useFieldArray({ control, name: "testCases" });
  const selectedLanguages = watch("allowedLanguages");
  const verificationLanguage = selectedLanguages.includes(language as Values["allowedLanguages"][number]) ? language : selectedLanguages[0] ?? "";
  const cases = watch("testCases");
  const hidden = cases.filter(row => !row.sample);
  const total = hidden.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
  const validTests = cases.some(row => row.sample) && hidden.length >= 2 && hidden.every(row => row.weight > 0) && Math.abs(total - 100) < 0.000001;
  const verify = useMutation({ mutationFn: (value: Values) => questionBankApi.verifyCoding({ coding: toRequest(value, order, null).coding!, language: verificationLanguage, source: solution }) });
  const invalidTab = (invalid: typeof errors) => setTab(invalid.harness || invalid.allowedLanguages || invalid.starterCode ? "code" : invalid.testCases ? "tests" : "description");
  const locked = busy || verify.isPending;
  return <form noValidate className="space-y-4" onChange={() => verify.reset()} onSubmit={handleSubmit(value => onSave(toRequest(value, question?.questionOrder ?? order, question?.explanation ?? null)), invalidTab)}>
    <h2 className="text-lg font-semibold">{question ? "Sửa" : "Soạn"} bài tập lập trình</h2>
    <nav aria-label="Các bước soạn bài code" className="flex flex-wrap gap-2">{([["description", "Mô tả & Cấu hình"], ["code", "Code mẫu"], ["tests", "Test cases"]] as const).map(([id, label]) => <Button key={id} variant={tab === id ? "primary" : "secondary"} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</Button>)}</nav>
    <fieldset disabled={locked} className="space-y-4">
      <div hidden={tab !== "description"} className="space-y-4">
        <label className="block text-sm">Tên bài toán<input className={input} {...register("title")} /><FieldError message={errors.title?.message} /></label>
        <label className="block text-sm">Mô tả Markdown (Input / Output / Constraints)<textarea rows={8} className={input} {...register("prompt")} /><FieldError message={errors.prompt?.message} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Giới hạn CPU (ms)<input type="number" min={500} max={5000} className={input} {...register("timeLimitMs", { valueAsNumber: true })} /><FieldError message={errors.timeLimitMs?.message} /></label>
          <label className="text-sm">Bộ nhớ (MB)<input type="number" min={64} max={512} className={input} {...register("memoryMb", { valueAsNumber: true })} /><FieldError message={errors.memoryMb?.message} /></label>
          <label className="text-sm">Kỹ năng<input className={input} {...register("skill")} /><FieldError message={errors.skill?.message} /></label>
          <label className="text-sm">Độ khó<select className={input} {...register("difficulty")}><option value="Easy">Dễ</option><option value="Medium">Trung bình</option><option value="Hard">Khó</option></select></label>
          <label className="text-sm sm:col-span-2">Loại bài<select className={input} {...register("category")}><option value="CODING_ALGORITHM">Thuật toán</option><option value="CODING_OOP">Hướng đối tượng</option><option value="SQL_QUERY">SQL</option></select></label>
        </div>
        <p className="text-xs italic text-[var(--color-on-surface-variant)]">
          * Điểm số bài tập Code được áp dụng tự động theo <strong>Cấu hình bài tập</strong> của vị trí. Trọng số chi tiết của từng test case được cấu hình ở tab &quot;Test cases&quot;.
        </p>
      </div>
      <div hidden={tab !== "code"} className="space-y-4">
        <fieldset><legend className="mb-2 text-sm">Ngôn ngữ được phép</legend><div className="flex flex-wrap gap-4">{languages.map(item => <label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" value={item} {...register("allowedLanguages")} />{item === "cpp" ? "C++" : item.toUpperCase()}</label>)}</div><FieldError message={errors.allowedLanguages?.message} /></fieldset>
        {selectedLanguages.map(item => <fieldset key={item} className="space-y-3 rounded-xl border border-[var(--color-border-default)] p-4"><legend className="text-sm font-semibold">{item.toUpperCase()}</legend>
          <div className="space-y-1.5"><span className="text-sm font-medium">Starter code</span>
            <MonacoCodeEditor
              height="160px"
              language={item}
              value={watch(`starterCode.${item}`) || ""}
              onChange={val => setValue(`starterCode.${item}`, val, { shouldValidate: true })}
            />
            <FieldError message={errors.starterCode?.[item]?.message} />
          </div>
          <div className="space-y-1.5"><span className="text-sm font-medium">Chương trình kiểm thử</span>
            <MonacoCodeEditor
              height="160px"
              language={item}
              value={watch(`harness.${item}`) || ""}
              onChange={val => setValue(`harness.${item}`, val, { shouldValidate: true })}
            />
            <FieldError message={errors.harness?.[item]?.message} />
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)]">Dùng {"{{SOURCE}}"} để chèn lời giải; chương trình đọc stdin và ghi kết quả ra stdout. Nếu lời giải là chương trình hoàn chỉnh, dùng {"{{SOURCE}}"}.</p>
        </fieldset>)}
      </div>
      <div hidden={tab !== "tests"} className="space-y-4">
        {fields.map((field, index) => <fieldset key={field.id} className="space-y-3 rounded-xl border border-[var(--color-border-default)] p-4"><legend className="text-sm font-semibold">Test {index + 1} · {cases[index]?.sample ? "Công khai" : "Ẩn"}</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register(`testCases.${index}.sample`)} onChange={event => { setValue(`testCases.${index}.sample`, event.target.checked); setValue(`testCases.${index}.weight`, event.target.checked ? 0 : 1); }} />Công khai cho ứng viên</label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Input<textarea rows={3} spellCheck={false} className={`${input} font-mono`} {...register(`testCases.${index}.input`)} /><FieldError message={errors.testCases?.[index]?.input?.message} /></label><label className="text-sm">Expected output<textarea rows={3} spellCheck={false} className={`${input} font-mono`} {...register(`testCases.${index}.expectedOutput`)} /><FieldError message={errors.testCases?.[index]?.expectedOutput?.message} /></label></div>
          {!cases[index]?.sample && <label className="block text-sm">Trọng số (%)<input type="number" min={0.01} max={100} step="0.01" className={input} {...register(`testCases.${index}.weight`, { valueAsNumber: true })} /><FieldError message={errors.testCases?.[index]?.weight?.message} /></label>}
          <Button variant="ghost" disabled={fields.length <= 3} onClick={() => { remove(index); verify.reset(); }} aria-label={`Xóa test ${index + 1}`}><Trash2 className="size-4" aria-hidden="true" />Xóa test</Button>
        </fieldset>)}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role={validTests ? "status" : "alert"} className={`text-sm ${validTests ? "font-medium text-emerald-700" : "text-[var(--color-error)]"}`}>{cases.length - hidden.length} test công khai · {hidden.length} test ẩn · Tổng trọng số ẩn: {total}% (cần 100%)</p>
          {hidden.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                const count = hidden.length;
                if (count === 0) return;
                const base = Math.floor(100 / count);
                const remainder = 100 - base * count;
                let hIndex = 0;
                cases.forEach((c, idx) => {
                  if (!c.sample) {
                    const extra = hIndex < remainder ? 1 : 0;
                    setValue(`testCases.${idx}.weight`, base + extra, { shouldValidate: true });
                    hIndex++;
                  }
                });
              }}
            >
              Tự động chia đều trọng số cho các test ẩn
            </Button>
          )}
        </div>
        <FieldError message={errors.testCases?.root?.message ?? errors.testCases?.message} />
        <Button variant="secondary" disabled={fields.length >= 50} onClick={() => { append({ input: "", expectedOutput: "", sample: false, weight: 1 }); verify.reset(); }}><Plus className="size-4" aria-hidden="true" />Thêm test case</Button>
        <section className="space-y-3 rounded-xl bg-[var(--color-surface-container-low)] p-4"><h3 className="font-semibold">Kiểm chứng lời giải chuẩn</h3>
          <label className="block text-sm">Ngôn ngữ<select className={input} value={verificationLanguage} onChange={event => { setLanguage(event.target.value); verify.reset(); }}>{selectedLanguages.map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label>
          <div className="space-y-1.5"><span className="text-sm font-medium">Model solution</span>
            <MonacoCodeEditor
              height="180px"
              language={verificationLanguage}
              value={solution}
              onChange={val => { setSolution(val); verify.reset(); }}
              placeholder={`// Dán code lời giải hoàn chỉnh (${verificationLanguage.toUpperCase()}) để verify test cases...`}
            />
          </div>
          <Button variant="secondary" disabled={!solution.trim() || !verificationLanguage} onClick={handleSubmit(value => verify.mutate(value), invalidTab)}><Play className="size-4" aria-hidden="true" />{verify.isPending ? "Đang kiểm tra…" : "Chạy kiểm tra test cases"}</Button>
          <AssessmentError error={verify.error} />
          {verify.data && <div role="status" className="space-y-2 text-sm">{verify.data.map((result, index) => <div key={index}>Test {index + 1}: {result.status?.description ?? "Chưa có kết quả"}{result.stderr || result.compile_output ? <pre className="overflow-auto whitespace-pre-wrap">{result.stderr || result.compile_output}</pre> : null}</div>)}</div>}
        </section>
      </div>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={locked || !validTests}>{busy ? "Đang lưu…" : "Lưu bài tập lập trình"}</Button><Button variant="secondary" onClick={onCancel}>Hủy</Button></div>
    </fieldset>
  </form>;
}
