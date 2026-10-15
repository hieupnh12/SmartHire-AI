import { assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import type { CodingContent, EssayRubric } from "@/api/types/assessment";
import { Code2, FlaskConical, Plus, Trash2 } from "lucide-react";

export const rubricExample = JSON.stringify({ category: "ESSAY_CONCEPTUAL", referenceAnswer: "", criteria: [{ description: "Nguyên lý và tính đúng đắn", weight: 60 }, { description: "Giải thích và ví dụ", weight: 40 }] }, null, 2);
export const codingExample = JSON.stringify({ category: "CODING_ALGORITHM", timeLimitMs: 2000, memoryMb: 256,
  starterCode: { python: "def solve(a, b):\n    return a + b" },
  harness: { python: "{{SOURCE}}\na, b = map(int, input().split())\nprint(solve(a, b))" },
  testCases: [{ input: "1 2", expectedOutput: "3", sample: true }, { input: "-2 5", expectedOutput: "3", sample: false }] }, null, 2);

export function QuestionContentFields({ type, value, onChange }: { type: "ESSAY" | "CODING"; value: string; onChange: (value: string) => void }) {
  let error: string | undefined;
  try { if (value.trim()) JSON.parse(value); } catch { error = "JSON không hợp lệ. Kiểm tra dấu ngoặc và dấu phẩy."; }
  const parse = <T,>(fallback: string): T => {
    try { return JSON.parse(value.trim() || fallback) as T; } catch { return JSON.parse(fallback) as T; }
  };
  if (type === "ESSAY") {
    const rubric = parse<EssayRubric>(rubricExample);
    const update = (patch: Partial<EssayRubric>) => onChange(JSON.stringify({ ...rubric, ...patch }));
    return <fieldset className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <legend className="px-2 text-sm font-medium">Tiêu chí chấm tự luận</legend>
      <label className="block text-sm">Phân loại<select className={assessmentInput} value={rubric.category ?? "ESSAY_CONCEPTUAL"} onChange={event => update({ category: event.target.value as EssayRubric["category"] })}><option value="ESSAY_CONCEPTUAL">Khái niệm / nguyên lý</option><option value="ESSAY_SCENARIO">Tình huống / kiến trúc</option></select></label>
      <label className="block text-sm">Đáp án tham khảo<textarea rows={4} value={rubric.referenceAnswer ?? ""} className={assessmentInput} onChange={event => update({ referenceAnswer: event.target.value })} /></label>
      {(Array.isArray(rubric.criteria) ? rubric.criteria : []).map((criterion, index) => <div key={index} className="grid items-start gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4 sm:grid-cols-[1fr_100px_auto]">
        <label className="text-sm">Tiêu chí {index + 1}<textarea rows={2} className={assessmentInput} value={criterion.description} onChange={event => update({ criteria: rubric.criteria.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} /></label>
        <label className="text-sm">Tỉ trọng %<input type="number" min={1} max={100} className={assessmentInput} value={criterion.weight} onChange={event => update({ criteria: rubric.criteria.map((item, i) => i === index ? { ...item, weight: Number(event.target.value) } : item) })} /></label>
        <button type="button" disabled={rubric.criteria.length <= 1} className="text-sm text-[var(--color-error)] disabled:opacity-40" onClick={() => update({ criteria: rubric.criteria.filter((_, i) => i !== index) })}>Xóa</button>
      </div>)}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-primary-subtle)] p-4">
        <div><p className="text-sm font-semibold">Tổng trọng số: {(rubric.criteria ?? []).reduce((sum, item) => sum + item.weight, 0)} / 100%</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Phân bổ đủ 100% cho các tiêu chí chấm điểm.</p></div>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]" onClick={() => update({ criteria: [...(rubric.criteria ?? []), { description: "", weight: 10 }] })}><Plus className="size-4" aria-hidden="true" />Thêm tiêu chí</button>
      </div><FieldError message={error} />
    </fieldset>;
  }
  const coding = parse<CodingContent>(codingExample);
  const update = (patch: Partial<CodingContent>) => onChange(JSON.stringify({ ...coding, ...patch }));
  return <fieldset className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
    <legend className="px-2 text-sm font-medium">Bài lập trình</legend>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Phân loại<select className={assessmentInput} value={coding.category} onChange={event => update({ category: event.target.value as CodingContent["category"] })}><option value="CODING_ALGORITHM">Thuật toán</option><option value="CODING_OOP">Hướng đối tượng</option><option value="SQL_QUERY">Truy vấn SQL</option></select></label>
      <label className="text-sm">Giới hạn thời gian (ms)<input type="number" min={100} max={10000} className={assessmentInput} value={coding.timeLimitMs} onChange={event => update({ timeLimitMs: Number(event.target.value) })} /></label>
      <label className="text-sm">Bộ nhớ (MB)<input type="number" min={32} max={512} className={assessmentInput} value={coding.memoryMb} onChange={event => update({ memoryMb: Number(event.target.value) })} /></label></div>
    {Object.entries(coding.starterCode ?? {}).map(([language, starter]) => <div key={language} className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3"><h4 className="flex items-center gap-2 text-sm font-semibold"><Code2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Mã nguồn & chương trình kiểm thử</h4><span className="rounded-md bg-[var(--color-primary-soft)] px-3 py-1 font-mono text-xs font-semibold uppercase text-[var(--color-primary)]">{language}</span></div>
      <div className="grid gap-4 lg:grid-cols-2">
      <label className="block space-y-2 text-xs font-medium">Mã khởi đầu · Hiển thị cho ứng viên<textarea rows={9} spellCheck={false} className="w-full resize-y rounded-xl border border-slate-700 bg-[#0f172a] p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" value={starter} onChange={event => update({ starterCode: { ...coding.starterCode, [language]: event.target.value } })} /></label>
      <label className="block space-y-2 text-xs font-medium">Harness · Chỉ dành cho người biên soạn<textarea rows={9} spellCheck={false} className="w-full resize-y rounded-xl border border-slate-700 bg-[#0f172a] p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" value={coding.harness?.[language] ?? ""} onChange={event => update({ harness: { ...coding.harness, [language]: event.target.value } })} /></label>
      </div>
      <p className="text-xs">Dùng {"{{SOURCE}}"} để chèn mã của ứng viên. Đọc input từ stdin và in kết quả ra stdout.</p>
    </div>)}
    <label className="block text-sm">Thêm ngôn ngữ<select className={assessmentInput} value="" onChange={event => { if (event.target.value) update({ starterCode: { ...coding.starterCode, [event.target.value]: "" }, harness: { ...coding.harness, [event.target.value]: "{{SOURCE}}" } }); }}><option value="">Chọn ngôn ngữ</option>{["java", "python", "javascript", "sql"].filter(language => !coding.starterCode?.[language]).map(language => <option key={language}>{language}</option>)}</select></label>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-default)] pt-5"><h4 className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Bộ kiểm thử ({coding.testCases?.length ?? 0})</h4><span className="text-xs text-[var(--color-on-surface-variant)]">{(coding.testCases ?? []).filter(test => test.sample).length} công khai · {(coding.testCases ?? []).filter(test => !test.sample).length} ẩn</span></div>
    {(coding.testCases ?? []).map((test, index) => <div key={index} className="grid gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4 sm:grid-cols-2">
      <div className="flex items-center justify-between gap-2 sm:col-span-2"><span className="text-sm font-semibold">Test case {String(index + 1).padStart(2, "0")}</span><span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 py-1 text-xs">{test.sample ? "Công khai cho ứng viên" : "Test ẩn"}</span></div>
      <label className="text-sm">Input {index + 1}<textarea rows={2} className={assessmentInput} value={test.input} onChange={event => update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, input: event.target.value } : item) })} /></label>
      <label className="text-sm">Output mong đợi<textarea rows={2} className={assessmentInput} value={test.expectedOutput} onChange={event => update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, expectedOutput: event.target.value } : item) })} /></label>
      <label className="text-sm"><input type="checkbox" checked={test.sample} onChange={event => update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, sample: event.target.checked } : item) })} /> Công khai cho ứng viên</label>
      <button type="button" className="inline-flex min-h-9 items-center justify-end gap-2 text-sm text-[var(--color-error)]" onClick={() => update({ testCases: coding.testCases.filter((_, i) => i !== index) })}><Trash2 className="size-4" aria-hidden="true" />Xóa test</button>
    </div>)}
    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]" onClick={() => update({ testCases: [...(coding.testCases ?? []), { input: "", expectedOutput: "", sample: false }] })}><Plus className="size-4" aria-hidden="true" />Thêm test case</button>
    {!value.trim() && <button type="button" className="ml-3 text-sm text-[var(--color-primary)]" onClick={() => onChange(codingExample)}>Sử dụng mẫu đang hiển thị</button>}<FieldError message={error} />
  </fieldset>;
}
