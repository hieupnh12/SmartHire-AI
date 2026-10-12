import { assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import type { CodingContent, EssayRubric } from "@/api/types/assessment";

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
    return <fieldset className="space-y-3 rounded-lg border border-[var(--color-border-default)] p-3">
      <legend className="px-2 text-sm font-medium">Tiêu chí chấm tự luận</legend>
      <label className="block text-sm">Phân loại<select className={assessmentInput} value={rubric.category ?? "ESSAY_CONCEPTUAL"} onChange={event => update({ category: event.target.value as EssayRubric["category"] })}><option value="ESSAY_CONCEPTUAL">Khái niệm / nguyên lý</option><option value="ESSAY_SCENARIO">Tình huống / kiến trúc</option></select></label>
      <label className="block text-sm">Đáp án tham khảo<textarea rows={4} value={rubric.referenceAnswer ?? ""} className={assessmentInput} onChange={event => update({ referenceAnswer: event.target.value })} /></label>
      {(Array.isArray(rubric.criteria) ? rubric.criteria : []).map((criterion, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
        <label className="text-sm">Tiêu chí {index + 1}<textarea rows={2} className={assessmentInput} value={criterion.description} onChange={event => update({ criteria: rubric.criteria.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} /></label>
        <label className="text-sm">Tỉ trọng %<input type="number" min={1} max={100} className={assessmentInput} value={criterion.weight} onChange={event => update({ criteria: rubric.criteria.map((item, i) => i === index ? { ...item, weight: Number(event.target.value) } : item) })} /></label>
        <button type="button" disabled={rubric.criteria.length <= 1} className="text-sm text-[var(--color-error)] disabled:opacity-40" onClick={() => update({ criteria: rubric.criteria.filter((_, i) => i !== index) })}>Xóa</button>
      </div>)}
      <p className="text-xs">Tổng tỉ trọng: {(rubric.criteria ?? []).reduce((sum, item) => sum + item.weight, 0)}% · Cần đúng 100%</p>
      <button type="button" className="text-sm text-[var(--color-primary)]" onClick={() => update({ criteria: [...(rubric.criteria ?? []), { description: "", weight: 10 }] })}>Thêm tiêu chí</button><FieldError message={error} />
    </fieldset>;
  }
  const coding = parse<CodingContent>(codingExample);
  const update = (patch: Partial<CodingContent>) => onChange(JSON.stringify({ ...coding, ...patch }));
  return <fieldset className="space-y-3 rounded-lg border border-[var(--color-border-default)] p-3">
    <legend className="px-2 text-sm font-medium">Bài lập trình</legend>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Phân loại<select className={assessmentInput} value={coding.category} onChange={event => update({ category: event.target.value as CodingContent["category"] })}><option value="CODING_ALGORITHM">Thuật toán</option><option value="CODING_OOP">Hướng đối tượng</option><option value="SQL_QUERY">Truy vấn SQL</option></select></label>
      <label className="text-sm">Giới hạn thời gian (ms)<input type="number" min={100} max={10000} className={assessmentInput} value={coding.timeLimitMs} onChange={event => update({ timeLimitMs: Number(event.target.value) })} /></label>
      <label className="text-sm">Bộ nhớ (MB)<input type="number" min={32} max={512} className={assessmentInput} value={coding.memoryMb} onChange={event => update({ memoryMb: Number(event.target.value) })} /></label></div>
    {Object.entries(coding.starterCode ?? {}).map(([language, starter]) => <div key={language} className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3">
      <p className="text-sm font-medium">{language}</p><label className="block text-sm">Mã khởi đầu<textarea rows={4} className={`${assessmentInput} font-mono text-xs`} value={starter} onChange={event => update({ starterCode: { ...coding.starterCode, [language]: event.target.value } })} /></label>
      <label className="block text-sm">Chương trình kiểm thử (chỉ người biên soạn)<textarea rows={4} className={`${assessmentInput} font-mono text-xs`} value={coding.harness?.[language] ?? ""} onChange={event => update({ harness: { ...coding.harness, [language]: event.target.value } })} /></label>
      <p className="text-xs">Dùng {"{{SOURCE}}"} để chèn mã của ứng viên. Đọc input từ stdin và in kết quả ra stdout.</p>
    </div>)}
    <label className="block text-sm">Thêm ngôn ngữ<select className={assessmentInput} value="" onChange={event => { if (event.target.value) update({ starterCode: { ...coding.starterCode, [event.target.value]: "" }, harness: { ...coding.harness, [event.target.value]: "{{SOURCE}}" } }); }}><option value="">Chọn ngôn ngữ</option>{["java", "python", "javascript", "sql"].filter(language => !coding.starterCode?.[language]).map(language => <option key={language}>{language}</option>)}</select></label>
    {(coding.testCases ?? []).map((test, index) => <div key={index} className="grid gap-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 sm:grid-cols-2">
      <label className="text-sm">Input {index + 1}<textarea rows={2} className={assessmentInput} value={test.input} onChange={event => update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, input: event.target.value } : item) })} /></label>
      <label className="text-sm">Output mong đợi<textarea rows={2} className={assessmentInput} value={test.expectedOutput} onChange={event => update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, expectedOutput: event.target.value } : item) })} /></label>
      <label className="text-sm"><input type="checkbox" checked={test.sample} onChange={event => update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, sample: event.target.checked } : item) })} /> Công khai cho ứng viên</label>
      <button type="button" className="text-sm text-[var(--color-error)]" onClick={() => update({ testCases: coding.testCases.filter((_, i) => i !== index) })}>Xóa test</button>
    </div>)}
    <button type="button" className="text-sm text-[var(--color-primary)]" onClick={() => update({ testCases: [...(coding.testCases ?? []), { input: "", expectedOutput: "", sample: false }] })}>Thêm test case</button>
    {!value.trim() && <button type="button" className="ml-3 text-sm text-[var(--color-primary)]" onClick={() => onChange(codingExample)}>Sử dụng mẫu đang hiển thị</button>}<FieldError message={error} />
  </fieldset>;
}
