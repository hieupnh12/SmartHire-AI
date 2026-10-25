import { assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import type { CodingContent, EssayRubric } from "@/api/types/assessment";
import { Code2, FlaskConical, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonacoCodeEditor } from "./MonacoCodeEditor";

export const defaultRubricTemplate: EssayRubric = {
  category: "ESSAY_CONCEPTUAL",
  referenceAnswer: "",
  criteria: [
    { name: "Bản chất cốt lõi & Nguyên lý", guide: "Giải thích chính xác các khái niệm và nguyên lý hoạt động cơ bản.", description: "Bản chất cốt lõi: Giải thích chính xác nguyên lý hoạt động cơ bản", weight: 40, keywords: [] },
    { name: "Phân tích & Trade-offs", guide: "Phân tích được ưu nhược điểm, sự đánh đổi và điều kiện áp dụng.", description: "Phân tích Trade-offs: So sánh ưu nhược điểm và sự đánh đổi", weight: 30, keywords: [] },
    { name: "Tính logic & Thực tế", guide: "Lập luận mạch lạc, có ví dụ minh họa hoặc giải pháp kỹ thuật cụ thể.", description: "Tính thực tế: Có ví dụ và giải pháp kỹ thuật cụ thể", weight: 30, keywords: [] },
  ],
};

export const rubricExample = JSON.stringify(defaultRubricTemplate, null, 2);

export const codingExample = JSON.stringify({
  category: "CODING_ALGORITHM", timeLimitMs: 2000, memoryMb: 256,
  starterCode: { python: "def solve(a, b):\n    return a + b" },
  harness: { python: "{{SOURCE}}\na, b = map(int, input().split())\nprint(solve(a, b))" },
  testCases: [
    { input: "1 2", expectedOutput: "3", sample: true, weight: 0 },
    { input: "-2 5", expectedOutput: "3", sample: false, weight: 50 },
    { input: "10 20", expectedOutput: "30", sample: false, weight: 50 }
  ]
}, null, 2);

export function handleCodeKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>, currentValue: string, onUpdate: (val: string) => void) {
  if (event.key === "Tab") {
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = currentValue.substring(0, start) + "  " + currentValue.substring(end);
    onUpdate(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 2;
    });
  }
}

import { useOptionalRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

export type SupportedLanguage = {
  id: string;
  label: string;
};

export const ALL_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { id: "java", label: "JAVA" },
  { id: "python", label: "PYTHON" },
  { id: "javascript", label: "JAVASCRIPT" },
  { id: "typescript", label: "TYPESCRIPT" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "sql", label: "SQL" },
  { id: "csharp", label: "C#" },
  { id: "golang", label: "GO" },
  { id: "php", label: "PHP" },
];

export function resolveLanguageFromSkill(skillName?: string | null): SupportedLanguage | null {
  if (!skillName) return null;
  const norm = skillName.trim().toLowerCase();
  if (!norm) return null;

  if (/^java\b(?!script)/i.test(norm) || norm.includes("spring")) return { id: "java", label: "JAVA" };
  if (norm.includes("python") || norm.includes("django") || norm.includes("fastapi") || norm.includes("flask") || norm.includes("pandas")) return { id: "python", label: "PYTHON" };
  if (norm.includes("typescript") || norm.includes("nest") || norm.includes("angular") || norm === "ts") return { id: "typescript", label: "TYPESCRIPT" };
  if (norm.includes("javascript") || norm.includes("node") || norm.includes("react") || norm.includes("vue") || norm === "js") return { id: "javascript", label: "JAVASCRIPT" };
  if (norm.includes("c++") || norm.includes("cpp")) return { id: "cpp", label: "C++" };
  if (norm.includes("c#") || norm.includes("csharp") || norm.includes(".net") || norm.includes("dotnet")) return { id: "csharp", label: "C#" };
  if (norm === "c" || norm.startsWith("c ")) return { id: "c", label: "C" };
  if (norm.includes("sql") || norm.includes("postgres") || norm.includes("mysql") || norm.includes("oracle") || norm.includes("database")) return { id: "sql", label: "SQL" };
  if (norm === "go" || norm.includes("golang")) return { id: "golang", label: "GO" };
  if (norm.includes("php") || norm.includes("laravel")) return { id: "php", label: "PHP" };

  const found = ALL_SUPPORTED_LANGUAGES.find(lang => lang.id === norm || lang.label.toLowerCase() === norm);
  if (found) return found;

  return null;
}

export function getJobLanguages(jobSkills?: Array<{ name: string } | string>): SupportedLanguage[] {
  if (!jobSkills || jobSkills.length === 0) return [];
  const map = new Map<string, SupportedLanguage>();
  for (const s of jobSkills) {
    const name = typeof s === "string" ? s : s?.name;
    const lang = resolveLanguageFromSkill(name);
    if (lang) {
      map.set(lang.id, lang);
    }
  }
  return Array.from(map.values());
}

export function codingAuthoringValue(
  value: string | undefined,
  languageOrSkill: string | undefined,
  snippet: string,
  jobSkills?: Array<{ name: string } | string>
): string {
  if (value?.trim()) return value;
  const fromSkill = resolveLanguageFromSkill(languageOrSkill);
  const fromJob = getJobLanguages(jobSkills)[0];
  const selected = fromSkill?.id ?? fromJob?.id ?? "java";

  return JSON.stringify({
    category: "CODING_ALGORITHM", timeLimitMs: 2000, memoryMb: 256,
    starterCode: { [selected]: snippet || "" }, harness: { [selected]: "{{SOURCE}}" },
    testCases: [
      { input: "", expectedOutput: "", sample: true, weight: 0 },
      { input: "", expectedOutput: "", sample: false, weight: 50 },
      { input: "", expectedOutput: "", sample: false, weight: 50 }
    ],
  });
}

export function CodingStarterFields({
  value,
  onChange,
  jobSkills,
  questionSkill,
}: {
  value: string;
  onChange: (value: string) => void;
  jobSkills?: Array<{ name: string } | string>;
  questionSkill?: string;
}) {
  const jobFromContext = useOptionalRecruitmentJob();
  const rawSkills = jobSkills ?? jobFromContext?.skills ?? [];
  const baseJobLanguages = getJobLanguages(rawSkills);
  const fromQuestion = resolveLanguageFromSkill(questionSkill);
  const jobLanguages = fromQuestion && !baseJobLanguages.some(l => l.id === fromQuestion.id)
    ? [fromQuestion, ...baseJobLanguages]
    : baseJobLanguages;

  let coding: CodingContent;
  try {
    coding = JSON.parse(value) as CodingContent;
  } catch {
    return <FieldError message="Cấu hình code không hợp lệ. Kiểm tra lại bản nháp." />;
  }

  const existingLangs = new Set(Object.keys(coding.starterCode ?? {}));
  const availableJobLangs = jobLanguages.filter(l => !existingLangs.has(l.id));
  const availableOtherLangs = ALL_SUPPORTED_LANGUAGES.filter(
    l => !existingLangs.has(l.id) && !jobLanguages.some(jl => jl.id === l.id)
  );

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4" aria-label="Mã khởi đầu theo ngôn ngữ">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Mã khởi đầu · Hiển thị cho ứng viên</h3>
          {jobLanguages.length > 0 && (
            <span className="rounded-full bg-slate-200/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              Ngôn ngữ của Job: {jobLanguages.map(l => l.label).join(", ")}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
          Chỉ nhập khung hàm hoặc gợi ý ban đầu, không điền lời giải chuẩn. Nhấn Tab để thụt dòng.
        </p>
      </div>

      {Object.entries(coding.starterCode ?? {}).map(([language, source]) => (
        <div key={language} className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--color-primary)]">
              {language}
              {jobLanguages.some(jl => jl.id === language) && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
                  Kỹ năng Job
                </span>
              )}
            </span>
            <button
              type="button"
              aria-label={`Xóa ngôn ngữ ${language.toUpperCase()}`}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-error)] hover:bg-[var(--color-error-container)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              onClick={() => {
                const starterCode = { ...coding.starterCode };
                const harness = { ...coding.harness };
                delete starterCode[language];
                delete harness[language];
                onChange(JSON.stringify({ ...coding, starterCode, harness }));
              }}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Xóa
            </button>
          </div>
          <div className="space-y-1">
            <span className="sr-only">Mã khởi đầu {language.toUpperCase()}</span>
            <MonacoCodeEditor
              height="180px"
              language={language}
              value={source}
              onChange={val =>
                onChange(
                  JSON.stringify({ ...coding, starterCode: { ...coding.starterCode, [language]: val } })
                )
              }
              placeholder={`// Nhập mã khởi đầu ${language.toUpperCase()} cho ứng viên...`}
            />
          </div>
        </div>
      ))}

      {Object.keys(coding.starterCode ?? {}).length === 0 && (
        <p role="status" className="text-xs text-[var(--color-on-surface-variant)]">
          Chưa có ngôn ngữ. Thêm ít nhất một ngôn ngữ trước khi lưu bài code.
        </p>
      )}

      {/* Dropdown Thêm ngôn ngữ */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Thêm ngôn ngữ
          <select
            className={assessmentInput}
            value=""
            onChange={event => {
              const language = event.target.value;
              if (language) {
                onChange(
                  JSON.stringify({
                    ...coding,
                    starterCode: { ...coding.starterCode, [language]: "" },
                    harness: { ...coding.harness, [language]: "{{SOURCE}}" },
                  })
                );
              }
            }}
          >
            <option value="">+ Chọn ngôn ngữ để thêm...</option>

            {/* Nhóm 1: Ngôn ngữ theo kỹ năng cấu hình trong Job */}
            {availableJobLangs.length > 0 && (
              <optgroup label="Ngôn ngữ cấu hình trong Job (Ưu tiên)">
                {availableJobLangs.map(l => (
                  <option key={l.id} value={l.id}>
                    ★ {l.label} (Cấu hình theo Job)
                  </option>
                ))}
              </optgroup>
            )}

            {/* Nhóm 2: Ngôn ngữ khác */}
            {availableOtherLangs.length > 0 && (
              <optgroup label={jobLanguages.length > 0 ? "Các ngôn ngữ khác (mở rộng)" : "Danh sách ngôn ngữ"}>
                {availableOtherLangs.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {jobLanguages.length > 0 && availableJobLangs.length === 0 && (
          <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            ✓ Đã bao gồm đủ các ngôn ngữ được cấu hình trong Job ({jobLanguages.map(l => l.label).join(", ")}).
          </p>
        )}
      </div>
    </section>
  );
}

export function AiRubricCriteriaEditor({
  value,
  onChange,
  referenceAnswer,
}: {
  value: string | undefined;
  onChange: (jsonText: string) => void;
  referenceAnswer?: string;
}) {
  const parse = (): EssayRubric => {
    try {
      if (value?.trim()) return JSON.parse(value) as EssayRubric;
    } catch { /* fallback */ }
    return defaultRubricTemplate;
  };
  const rubric = parse();
  const criteria = Array.isArray(rubric.criteria) && rubric.criteria.length > 0 ? rubric.criteria : defaultRubricTemplate.criteria;
  const update = (patch: Partial<EssayRubric>) => {
    const updated: EssayRubric = { ...rubric, referenceAnswer: referenceAnswer ?? rubric.referenceAnswer, ...patch };
    onChange(JSON.stringify(updated, null, 2));
  };

  const totalWeight = criteria.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const isValid = totalWeight === 100;

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--color-primary)]" />
            Tiêu chuẩn đánh giá tự động (AI Rubric Criteria)
          </h3>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
            AI sẽ đối chiếu bài làm với Đáp án tham khảo và chấm điểm độc lập từng tiêu chí theo trọng số (%).
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
          onClick={() => update(defaultRubricTemplate)}
        >
          <Wand2 className="size-3.5" />
          Tải bộ tiêu chí mẫu chuẩn (40% - 30% - 30%)
        </button>
      </div>

      <div className="space-y-3">
        {criteria.map((criterion, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-default)] pb-2">
              <span className="text-xs font-semibold text-[var(--color-primary)]">
                Tiêu chí {index + 1}
              </span>
              <button
                type="button"
                disabled={criteria.length <= 1}
                className="text-xs font-medium text-[var(--color-error)] hover:underline disabled:opacity-40"
                onClick={() => update({ criteria: criteria.filter((_, i) => i !== index) })}
              >
                Xóa tiêu chí
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <label className="text-xs">
                Tên tiêu chí
                <input
                  type="text"
                  className={cn(assessmentInput, "mt-1")}
                  placeholder="Ví dụ: Bản chất cốt lõi & Nguyên lý"
                  value={criterion.name ?? criterion.description}
                  onChange={event => {
                    const name = event.target.value;
                    update({
                      criteria: criteria.map((item, i) => i === index ? { ...item, name, description: `${name}: ${item.guide ?? name}` } : item)
                    });
                  }}
                />
              </label>
              <label className="text-xs">
                Trọng số (%)
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={cn(assessmentInput, "mt-1 font-semibold")}
                  value={criterion.weight}
                  onChange={event => {
                    const weight = Number(event.target.value) || 0;
                    update({
                      criteria: criteria.map((item, i) => i === index ? { ...item, weight } : item)
                    });
                  }}
                />
              </label>
            </div>
            <label className="block text-xs">
              Hướng dẫn chấm chi tiết cho AI
              <textarea
                rows={2}
                className={cn(assessmentInput, "mt-1")}
                placeholder="Mô tả cụ thể những điểm ứng viên cần trình bày để đạt điểm tối đa ở tiêu chí này"
                value={criterion.guide ?? criterion.description}
                onChange={event => {
                  const guide = event.target.value;
                  update({
                    criteria: criteria.map((item, i) => i === index ? { ...item, guide, description: `${item.name ?? ""}: ${guide}` } : item)
                  });
                }}
              />
            </label>
            <label className="block text-xs">
              Từ khóa kỹ thuật gợi ý (phân cách bằng dấu phẩy)
              <input
                type="text"
                className={cn(assessmentInput, "mt-1")}
                placeholder="Ví dụ: B-Tree, Clustered Index, Non-clustered, I/O"
                value={Array.isArray(criterion.keywords) ? criterion.keywords.join(", ") : ""}
                onChange={event => {
                  const keywords = event.target.value.split(",").map(k => k.trim()).filter(Boolean);
                  update({
                    criteria: criteria.map((item, i) => i === index ? { ...item, keywords } : item)
                  });
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5",
        isValid ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"
      )}>
        <div>
          <p className="text-xs font-semibold">
            Tổng trọng số: {totalWeight}% / 100% {isValid ? "— Đạt yêu cầu" : "— Cần điều chỉnh để tổng đúng 100%"}
          </p>
          <progress className="mt-1 h-1.5 w-44 rounded-full accent-[var(--color-primary)]" max={100} value={Math.min(totalWeight, 100)} />
        </div>
        <button
          type="button"
          disabled={criteria.length >= 5}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] disabled:opacity-40"
          onClick={() => update({ criteria: [...criteria, { name: "", guide: "", description: "Tiêu chí mới", weight: 10, keywords: [] }] })}
        >
          <Plus className="size-3.5" />
          Thêm tiêu chí
        </button>
      </div>
    </div>
  );
}

export function QuestionContentFields({
  type,
  value,
  onChange,
  executionOnly = false,
  jobSkills,
}: {
  type: "ESSAY" | "CODING";
  value: string;
  onChange: (value: string) => void;
  executionOnly?: boolean;
  jobSkills?: Array<{ name: string } | string>;
}) {
  const jobFromContext = useOptionalRecruitmentJob();
  const rawSkills = jobSkills ?? jobFromContext?.skills ?? [];
  const jobLanguages = getJobLanguages(rawSkills);
  let error: string | undefined;
  try { if (value.trim()) JSON.parse(value); } catch { error = "JSON không hợp lệ. Kiểm tra dấu ngoặc và dấu phẩy."; }
  const parse = <T,>(fallback: string): T => {
    try { return JSON.parse(value.trim() || fallback) as T; } catch { return JSON.parse(fallback) as T; }
  };

  if (type === "ESSAY") {
    return <AiRubricCriteriaEditor value={value} onChange={onChange} />;
  }

  const coding = parse<CodingContent>(codingExample);

  const update = (patch: Partial<CodingContent>) => onChange(JSON.stringify({ ...coding, ...patch }, null, 2));

  const hiddenTests = (coding.testCases ?? []).filter(t => !t.sample);
  const sampleTests = (coding.testCases ?? []).filter(t => t.sample);
  const hiddenTotalWeight = hiddenTests.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
  const isWeightValid = hiddenTests.length === 0 || hiddenTotalWeight === 100;

  const autoDistributeWeights = () => {
    const count = hiddenTests.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    let hIndex = 0;
    const nextCases = (coding.testCases ?? []).map(tc => {
      if (tc.sample) return { ...tc, weight: 0 };
      const extra = hIndex < remainder ? 1 : 0;
      hIndex++;
      return { ...tc, weight: base + extra };
    });
    update({ testCases: nextCases });
  };

  return <fieldset className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
    <legend className="px-2 text-sm font-medium">{executionOnly ? "Thiết lập chạy bài" : "Bài lập trình"}</legend>

    <details className="rounded-xl border border-[var(--color-border-default)] p-4" open={executionOnly ? undefined : true}>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary)]">
        Cấu hình chạy nâng cao · giới hạn tài nguyên & chương trình gọi hàm (Harness)
      </summary>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Phân loại bài
            <select className={assessmentInput} value={coding.category} onChange={event => update({ category: event.target.value as CodingContent["category"] })}>
              <option value="CODING_ALGORITHM">Thuật toán</option>
              <option value="CODING_OOP">Hướng đối tượng</option>
              <option value="SQL_QUERY">Truy vấn SQL</option>
            </select>
          </label>
          <label className="text-sm">
            Giới hạn thời gian (ms)
            <input type="number" min={100} max={10000} className={assessmentInput} value={coding.timeLimitMs} onChange={event => update({ timeLimitMs: Number(event.target.value) })} />
          </label>
          <label className="text-sm">
            Bộ nhớ (MB)
            <input type="number" min={32} max={512} className={assessmentInput} value={coding.memoryMb} onChange={event => update({ memoryMb: Number(event.target.value) })} />
          </label>
        </div>

        {Object.entries(coding.starterCode ?? {}).map(([language, starter]) => (
          <div key={language} className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Code2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                Chương trình gọi hàm (Harness Code)
              </h4>
              <span className="rounded-md bg-[var(--color-primary-soft)] px-3 py-1 font-mono text-xs font-semibold uppercase text-[var(--color-primary)]">
                {language}
              </span>
            </div>
            <div className={executionOnly ? "space-y-4" : "grid gap-4 lg:grid-cols-2"}>
              {!executionOnly && (
                <div className="space-y-2 text-xs font-medium">
                  <span>Mã khởi đầu · Hiển thị cho ứng viên</span>
                  <MonacoCodeEditor
                    height="200px"
                    language={language}
                    value={starter}
                    onChange={val => update({ starterCode: { ...coding.starterCode, [language]: val } })}
                    placeholder={`// Khung hàm gợi ý ban đầu (${language.toUpperCase()})...`}
                  />
                </div>
              )}
              <div className="space-y-2 text-xs font-medium">
                <span>Harness · Bọc mã nguồn kiểm thử (chứa {"{{SOURCE}}"})</span>
                <MonacoCodeEditor
                  height="200px"
                  language={language}
                  value={coding.harness?.[language] ?? ""}
                  onChange={val => update({ harness: { ...coding.harness, [language]: val } })}
                  placeholder={`// Bọc code và thay thế {{SOURCE}} bằng mã ứng viên...`}
                />
              </div>
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Đoạn này đọc input, chèn mã ứng viên tại <code>{"{{SOURCE}}"}</code> và in kết quả ra stdout để so khớp với testcase.
            </p>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Thêm ngôn ngữ hỗ trợ
            <select
              className={cn(assessmentInput, "mt-1")}
              value=""
              onChange={event => {
                const language = event.target.value;
                if (language) {
                  update({
                    starterCode: { ...coding.starterCode, [language]: "" },
                    harness: { ...coding.harness, [language]: "{{SOURCE}}" },
                  });
                }
              }}
            >
              <option value="">+ Chọn ngôn ngữ để thêm...</option>
              {jobLanguages.filter(l => !(l.id in (coding.starterCode ?? {}))).length > 0 && (
                <optgroup label="Ngôn ngữ cấu hình trong Job (Ưu tiên)">
                  {jobLanguages
                    .filter(l => !(l.id in (coding.starterCode ?? {})))
                    .map(l => (
                      <option key={l.id} value={l.id}>
                        ★ {l.label} (Cấu hình theo Job)
                      </option>
                    ))}
                </optgroup>
              )}
              {ALL_SUPPORTED_LANGUAGES.filter(
                l => !(l.id in (coding.starterCode ?? {})) && !jobLanguages.some(jl => jl.id === l.id)
              ).length > 0 && (
                <optgroup label={jobLanguages.length > 0 ? "Các ngôn ngữ khác (mở rộng)" : "Danh sách ngôn ngữ"}>
                  {ALL_SUPPORTED_LANGUAGES.filter(
                    l => !(l.id in (coding.starterCode ?? {})) && !jobLanguages.some(jl => jl.id === l.id)
                  ).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        </div>
      </div>
    </details>

    <div className="space-y-4 border-t border-[var(--color-border-default)] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <FlaskConical className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          Bộ kiểm thử ({coding.testCases?.length ?? 0} Test cases)
        </h4>
        <span className="text-xs text-[var(--color-on-surface-variant)]">
          {sampleTests.length} công khai · {hiddenTests.length} ẩn
        </span>
      </div>

      {hiddenTests.length > 0 && (
        <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5",
          isWeightValid ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        )}>
          <div>
            <p className="text-xs font-semibold">
              Tổng trọng số test ẩn: {hiddenTotalWeight}% / 100% {isWeightValid ? "— Hợp lệ" : "— Cần điều chỉnh để tổng đúng 100%"}
            </p>
            <progress className="mt-1 h-1.5 w-48 rounded-full accent-[var(--color-primary)]" max={100} value={Math.min(hiddenTotalWeight, 100)} />
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            onClick={autoDistributeWeights}
          >
            Tự động chia đều trọng số cho các test ẩn
          </button>
        </div>
      )}

      {(coding.testCases ?? []).map((test, index) => (
        <div key={index} className="grid gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <span className="text-sm font-semibold">Test case {String(index + 1).padStart(2, "0")}</span>
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",
                test.sample ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              )}>
                {test.sample ? "Công khai cho ứng viên" : `Test ẩn (Trọng số: ${test.weight ?? 0}%)`}
              </span>
            </div>
          </div>

          <label className="text-sm">
            Input {index + 1}
            <textarea
              rows={2}
              className={cn(assessmentInput, "font-mono text-xs")}
              value={test.input}
              onChange={event => update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, input: event.target.value } : item) })}
            />
          </label>

          <label className="text-sm">
            Output mong đợi
            <textarea
              rows={2}
              className={cn(assessmentInput, "font-mono text-xs")}
              value={test.expectedOutput}
              onChange={event => update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, expectedOutput: event.target.value } : item) })}
            />
          </label>

          <div className="flex flex-wrap items-center gap-4 sm:col-span-2 justify-between">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={test.sample}
                className="accent-[var(--color-primary)]"
                onChange={event => update({
                  testCases: coding.testCases.map((item, i) => i === index ? {
                    ...item,
                    sample: event.target.checked,
                    weight: event.target.checked ? 0 : (item.weight || 20),
                  } : item)
                })}
              />
              Công khai cho ứng viên (chỉ để chạy thử, không tính điểm)
            </label>

            {!test.sample && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Trọng số tính điểm (%):</span>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={cn(assessmentInput, "w-24 font-bold text-slate-900 pr-6 dark:text-white")}
                    value={test.weight ?? ""}
                    placeholder="0"
                    onChange={event => {
                      const weight = event.target.value === "" ? undefined : Number(event.target.value);
                      update({ testCases: coding.testCases.map((item, i) => i === index ? { ...item, weight } : item) });
                    }}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
              </label>
            )}

            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1 text-xs text-[var(--color-error)] hover:underline ml-auto"
              onClick={() => update({ testCases: coding.testCases.filter((_, i) => i !== index) })}
            >
              <Trash2 className="size-3.5" />
              Xóa test
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]"
        onClick={() => {
          const currentCases = coding.testCases ?? [];
          const currentHidden = currentCases.filter(t => !t.sample);
          const currentTotal = currentHidden.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
          const defaultWeight = Math.max(1, 100 - currentTotal);
          update({ testCases: [...currentCases, { input: "", expectedOutput: "", sample: false, weight: defaultWeight }] });
        }}
      >
        <Plus className="size-4" aria-hidden="true" />
        Thêm test case
      </button>
    </div>

    <FieldError message={error} />
  </fieldset>;
}
