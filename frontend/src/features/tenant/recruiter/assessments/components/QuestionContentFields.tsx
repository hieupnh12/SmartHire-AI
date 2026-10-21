import { assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import type { CodingContent, EssayRubric } from "@/api/types/assessment";
import { Code2, FlaskConical, Plus, Trash2 } from "lucide-react";

export const rubricExample = JSON.stringify({ category: "ESSAY_CONCEPTUAL", referenceAnswer: "", criteria: [{ description: "Nguyên lý và tính đúng đắn", weight: 60 }, { description: "Giải thích và ví dụ", weight: 40 }] }, null, 2);
export const codingExample = JSON.stringify({ category: "CODING_ALGORITHM", timeLimitMs: 2000, memoryMb: 256,
  starterCode: { python: "def solve(a, b):\n    return a + b" },
  harness: { python: "{{SOURCE}}\na, b = map(int, input().split())\nprint(solve(a, b))" },
  testCases: [{ input: "1 2", expectedOutput: "3", sample: true }, { input: "-2 5", expectedOutput: "3", sample: false }] }, null, 2);

export function codingAuthoringValue(value: string | undefined, language: string, snippet: string): string {
  if (value?.trim()) return value;
  const selected = ["java", "python", "javascript", "sql"].includes(language.toLowerCase()) ? language.toLowerCase() : "java";
  return JSON.stringify({ category: "CODING_ALGORITHM", timeLimitMs: 2000, memoryMb: 256,
    starterCode: { [selected]: snippet }, harness: { [selected]: "{{SOURCE}}" },
    testCases: [{ input: "", expectedOutput: "", sample: true }, { input: "", expectedOutput: "", sample: false }],
  });
}

export function CodingStarterFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  let coding: CodingContent;
  try { coding = JSON.parse(value) as CodingContent; } catch { return <FieldError message="Cấu hình code không hợp lệ. Kiểm tra lại bản nháp." />; }
  return <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4" aria-label="Mã khởi đầu theo ngôn ngữ">
    <div><h3 className="text-sm font-semibold">Mã khởi đầu · Hiển thị cho ứng viên</h3><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Chỉ nhập khung hàm hoặc mã gợi ý, không điền lời giải chuẩn. Có thể để trống.</p></div>
    {Object.entries(coding.starterCode ?? {}).map(([language, source]) => <div key={language} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-[var(--color-primary)]">{language}</span>
        <button type="button" aria-label={`Xóa ngôn ngữ ${language.toUpperCase()}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-error)] hover:bg-[var(--color-error-container)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={() => {
          const starterCode = { ...coding.starterCode };
          const harness = { ...coding.harness };
          delete starterCode[language];
          delete harness[language];
          onChange(JSON.stringify({ ...coding, starterCode, harness }));
        }}><Trash2 className="size-4" aria-hidden="true" />Xóa</button>
      </div>
      <label className="block"><span className="sr-only">Mã khởi đầu {language.toUpperCase()}</span><textarea rows={7} spellCheck={false} value={source} className={`${assessmentInput} font-mono`} onChange={event => onChange(JSON.stringify({ ...coding, starterCode: { ...coding.starterCode, [language]: event.target.value } }))} /></label>
    </div>)}
    {Object.keys(coding.starterCode ?? {}).length === 0 && <p role="status" className="text-xs text-[var(--color-on-surface-variant)]">Chưa có ngôn ngữ. Thêm ít nhất một ngôn ngữ trước khi lưu bài code.</p>}
    <label className="block text-xs">Thêm ngôn ngữ<select className={assessmentInput} value="" onChange={event => {
      const language = event.target.value;
      if (language) onChange(JSON.stringify({ ...coding, starterCode: { ...coding.starterCode, [language]: "" }, harness: { ...coding.harness, [language]: "{{SOURCE}}" } }));
    }}><option value="">Chọn ngôn ngữ</option>{["java", "python", "javascript", "sql"].filter(language => !(language in (coding.starterCode ?? {}))).map(language => <option key={language} value={language}>{language.toUpperCase()}</option>)}</select></label>
  </section>;
}

export function QuestionContentFields({ type, value, onChange, executionOnly = false }: { type: "ESSAY" | "CODING"; value: string; onChange: (value: string) => void; executionOnly?: boolean }) {
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
    <legend className="px-2 text-sm font-medium">{executionOnly ? "Thiết lập chạy bài" : "Bài lập trình"}</legend>
    {executionOnly && <p className="text-sm text-[var(--color-on-surface-variant)]">Testcase kiểm tra kết quả chạy code. Rubric ở phần 1 mô tả chất lượng lời giải. Mã khởi đầu và đáp án mẫu chỉ nhập ở phần 1.</p>}
    <details className="rounded-xl border border-[var(--color-border-default)] p-4" open={executionOnly ? undefined : true}>
    <summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary)]">Cấu hình chạy nâng cao · giới hạn tài nguyên & chương trình gọi hàm</summary>
    <div className="mt-4 space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Phân loại<select className={assessmentInput} value={coding.category} onChange={event => update({ category: event.target.value as CodingContent["category"] })}><option value="CODING_ALGORITHM">Thuật toán</option><option value="CODING_OOP">Hướng đối tượng</option><option value="SQL_QUERY">Truy vấn SQL</option></select></label>
      <label className="text-sm">Giới hạn thời gian (ms)<input type="number" min={100} max={10000} className={assessmentInput} value={coding.timeLimitMs} onChange={event => update({ timeLimitMs: Number(event.target.value) })} /></label>
      <label className="text-sm">Bộ nhớ (MB)<input type="number" min={32} max={512} className={assessmentInput} value={coding.memoryMb} onChange={event => update({ memoryMb: Number(event.target.value) })} /></label></div>
    {Object.entries(coding.starterCode ?? {}).map(([language, starter]) => <div key={language} className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3"><h4 className="flex items-center gap-2 text-sm font-semibold"><Code2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Chương trình gọi hàm (Harness)</h4><span className="rounded-md bg-[var(--color-primary-soft)] px-3 py-1 font-mono text-xs font-semibold uppercase text-[var(--color-primary)]">{language}</span></div>
      <div className={executionOnly ? "space-y-4" : "grid gap-4 lg:grid-cols-2"}>
      {!executionOnly && <label className="block space-y-2 text-xs font-medium">Mã khởi đầu · Hiển thị cho ứng viên<textarea rows={9} spellCheck={false} className="w-full resize-y rounded-xl border border-slate-700 bg-[#0f172a] p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" value={starter} onChange={event => update({ starterCode: { ...coding.starterCode, [language]: event.target.value } })} /></label>}
      <label className="block space-y-2 text-xs font-medium">Harness · Chỉ dành cho người biên soạn<textarea rows={9} spellCheck={false} className="w-full resize-y rounded-xl border border-slate-700 bg-[#0f172a] p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" value={coding.harness?.[language] ?? ""} onChange={event => update({ harness: { ...coding.harness, [language]: event.target.value } })} /></label>
      </div>
      <p className="text-xs">Đoạn này chỉ đọc input, gọi hàm ứng viên viết và in kết quả để so với testcase; không chứa lời giải bài toán. Dùng {"{{SOURCE}}"} để chèn mã ứng viên. Nếu ứng viên tự viết cả phần đọc input và in output, chỉ cần giữ {"{{SOURCE}}"}.</p>
    </div>)}
    {!executionOnly && <label className="block text-sm">Thêm ngôn ngữ<select className={assessmentInput} value="" onChange={event => { if (event.target.value) update({ starterCode: { ...coding.starterCode, [event.target.value]: "" }, harness: { ...coding.harness, [event.target.value]: "{{SOURCE}}" } }); }}><option value="">Chọn ngôn ngữ</option>{["java", "python", "javascript", "sql"].filter(language => !(language in (coding.starterCode ?? {}))).map(language => <option key={language}>{language}</option>)}</select></label>}
    <p className="text-xs text-[var(--color-on-surface-variant)]">Giới hạn áp dụng cho mỗi lần chạy code, không phải thời gian làm bài. Nếu ứng viên viết chương trình hoàn chỉnh, harness chỉ cần {"{{SOURCE}}"}.</p>
    </div></details>
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
