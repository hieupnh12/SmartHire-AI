import { assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code2,
  FlaskConical,
  GitCompare,
  Network,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MonacoCodeEditor } from "./MonacoCodeEditor";
import type { CodingContent, EssayCategory, EssayRubric } from "@/api/types/assessment";

export const ESSAY_ARCHETYPES: Record<
  EssayCategory,
  {
    label: string;
    shortLabel: string;
    badge: string;
    description: string;
    summaryWeights: string;
    criteria: Array<{
      name: string;
      guide: string;
      description: string;
      weight: number;
      keywords?: string[];
    }>;
  }
> = {
  ESSAY_CONCEPTUAL: {
    label: "Khái niệm & Nguyên lý (Conceptual)",
    shortLabel: "Khái niệm",
    badge: "50% • 30% • 20%",
    description: "Đánh giá tính chuẩn xác của khái niệm, cơ chế hoạt động và ví dụ minh họa thực tế.",
    summaryWeights: "Tính chính xác (50%) • Bản chất hoạt động (30%) • Ví dụ thực tế (20%)",
    criteria: [
      {
        name: "Tính chính xác của khái niệm / cơ chế",
        guide: "Giải thích chính xác nguyên lý, bản chất cốt lõi và định nghĩa kỹ thuật.",
        description: "Tính chính xác: Giải thích đúng nguyên lý và khái niệm cốt lõi",
        weight: 50,
        keywords: [],
      },
      {
        name: "Thuật ngữ chuyên môn & Bản chất hoạt động",
        guide: "Sử dụng thuật ngữ chính xác, giải thích rõ cách thức hoạt động ngầm (under the hood).",
        description: "Thuật ngữ & Bản chất: Đúng thuật ngữ, giải thích rõ cơ chế hoạt động",
        weight: 30,
        keywords: [],
      },
      {
        name: "Ví dụ minh họa thực tế",
        guide: "Có ví dụ thực tế hoặc trường hợp áp dụng phù hợp.",
        description: "Ví dụ thực tế: Minh họa rõ ràng ngữ cảnh sử dụng",
        weight: 20,
        keywords: [],
      },
    ],
  },
  ESSAY_COMPARISON: {
    label: "So sánh & Đánh đổi (Comparison / Trade-offs)",
    shortLabel: "So sánh & Trade-offs",
    badge: "30% • 40% • 30%",
    description: "Đánh giá khả năng hiểu sâu đặc điểm các giải pháp, phân tích ưu/nhược điểm và sự đánh đổi.",
    summaryWeights: "Hiểu đặc điểm (30%) • Phân tích Trade-offs (40%) • Ngữ cảnh áp dụng (30%)",
    criteria: [
      {
        name: "Hiểu rõ đặc điểm của từng công nghệ / giải pháp",
        guide: "Nắm vững bản chất, kiến trúc và đặc tính cốt lõi của từng phương án được so sánh.",
        description: "Hiểu rõ đặc điểm: Nắm vững bản chất của từng phương án so sánh",
        weight: 30,
        keywords: [],
      },
      {
        name: "Phân tích ưu/nhược điểm đa chiều",
        guide: "So sánh toàn diện ưu và nhược điểm về hiệu năng, chi phí, độ phức tạp và bảo trì.",
        description: "Phân tích ưu/nhược điểm: So sánh đa chiều và sự đánh đổi (Trade-offs)",
        weight: 40,
        keywords: [],
      },
      {
        name: "Độ phù hợp của ngữ cảnh áp dụng thực tế",
        guide: "Đưa ra tiêu chí lựa chọn và khuyến nghị trường hợp nào nên dùng phương án nào.",
        description: "Ngữ cảnh áp dụng: Khuyến nghị bối cảnh phù hợp cho từng lựa chọn",
        weight: 30,
        keywords: [],
      },
    ],
  },
  ESSAY_SCENARIO: {
    label: "Tình huống & Sự cố (Scenario & Troubleshooting)",
    shortLabel: "Tình huống & Sự cố",
    badge: "30% • 40% • 30%",
    description: "Đánh giá tư duy điều tra sự cố, phân tích nguyên nhân gốc rễ và đề xuất giải pháp xử lý.",
    summaryWeights: "Nguyên nhân gốc rễ (30%) • Giải pháp khả thi (40%) • Dự phòng & Giám sát (30%)",
    criteria: [
      {
        name: "Phân tích nguyên nhân gốc rễ (Root Cause Analysis)",
        guide: "Xác định chính xác nguyên nhân tiềm ẩn, trình tự điều tra và cô lập sự cố.",
        description: "Phân tích nguyên nhân: Xác định đúng root cause và phương pháp cô lập",
        weight: 30,
        keywords: [],
      },
      {
        name: "Tính khả thi và hiệu quả của giải pháp",
        guide: "Phương án khắc phục ngắn hạn (workaround) và xử lý dài hạn rõ ràng, có tính khả thi.",
        description: "Giải pháp khả thi: Đề xuất phương án khắc phục triệt để và hiệu quả",
        weight: 40,
        keywords: [],
      },
      {
        name: "Biện pháp dự phòng / Giám sát lâu dài",
        guide: "Biện pháp phòng ngừa lặp lại, thiết lập monitoring, alert metrics và quy trình dự phòng.",
        description: "Dự phòng & Giám sát: Thiết lập biện pháp ngăn ngừa và quan sát hệ thống",
        weight: 30,
        keywords: [],
      },
    ],
  },
  ESSAY_ARCHITECTURE: {
    label: "Thiết kế giải pháp / Kiến trúc (Architecture)",
    shortLabel: "Kiến trúc hệ thống",
    badge: "40% • 35% • 25%",
    description: "Đánh giá cấu trúc luồng hệ thống, tính toàn vẹn, khả năng chịu lỗi và mở rộng khi tải cao.",
    summaryWeights: "Cấu trúc luồng (40%) • Chịu lỗi & Bảo mật (35%) • Khả năng mở rộng (25%)",
    criteria: [
      {
        name: "Cấu trúc luồng và tính khả thi",
        guide: "Thiết kế luồng dữ liệu, phân tách component hợp lý và các tương tác mạch lạc.",
        description: "Cấu trúc luồng: Luồng dữ liệu và thiết kế phân rã hợp lý",
        weight: 40,
        keywords: [],
      },
      {
        name: "Xử lý edge-case, chịu lỗi và bảo mật",
        guide: "Tính toán kịch bản lỗi, retry, circuit-breaker, idempotent và an toàn bảo mật.",
        description: "Chịu lỗi & Bảo mật: Xử lý lỗi, kịch bản edge-cases và an toàn dữ liệu",
        weight: 35,
        keywords: [],
      },
      {
        name: "Khả năng mở rộng (Scalability)",
        guide: "Khả năng đáp ứng tải cao, tối ưu tài nguyên, caching và chiến lược scale.",
        description: "Mở rộng (Scale): Khả năng chịu tải và tối ưu tài nguyên hệ thống",
        weight: 25,
        keywords: [],
      },
    ],
  },
};

export const defaultRubricTemplate: EssayRubric = {
  category: "ESSAY_CONCEPTUAL",
  referenceAnswer: "",
  criteria: ESSAY_ARCHETYPES.ESSAY_CONCEPTUAL.criteria.map((c) => ({ ...c })),
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
  const activeCategory: EssayCategory = rubric.category && rubric.category in ESSAY_ARCHETYPES
    ? rubric.category
    : "ESSAY_CONCEPTUAL";
  const criteria = Array.isArray(rubric.criteria) && rubric.criteria.length > 0
    ? rubric.criteria
    : ESSAY_ARCHETYPES[activeCategory].criteria.map((c) => ({ ...c }));

  const update = (patch: Partial<EssayRubric>) => {
    const updated: EssayRubric = {
      ...rubric,
      category: activeCategory,
      referenceAnswer: referenceAnswer ?? rubric.referenceAnswer ?? "",
      ...patch,
    };
    onChange(JSON.stringify(updated, null, 2));
  };

  const handleSelectArchetype = (categoryKey: EssayCategory) => {
    const archetype = ESSAY_ARCHETYPES[categoryKey];
    update({
      category: categoryKey,
      criteria: archetype.criteria.map((c) => ({ ...c })),
    });
  };

  const handleResetToCurrentArchetype = () => {
    const archetype = ESSAY_ARCHETYPES[activeCategory];
    update({
      criteria: archetype.criteria.map((c) => ({ ...c })),
    });
  };

  const totalWeight = criteria.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const isValid = totalWeight === 100;

  const archetypeIcons: Record<EssayCategory, React.ComponentType<{ className?: string }>> = {
    ESSAY_CONCEPTUAL: BookOpen,
    ESSAY_COMPARISON: GitCompare,
    ESSAY_SCENARIO: AlertTriangle,
    ESSAY_ARCHITECTURE: Network,
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="size-4 text-amber-600" />
            Mẫu tiêu chuẩn chấm điểm AI (Rubric Archetypes)
          </h4>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Chọn mẫu phù hợp với loại câu hỏi để tự động thiết lập các tiêu chí đối chiếu ngữ nghĩa và tỷ trọng chấm của AI.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetToCurrentArchetype}
          title="Khôi phục các tiêu chí về nguyên mẫu chuẩn của Archetype này"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <RotateCcw className="size-3.5 text-amber-600" />
          Đặt lại theo mẫu gốc
        </button>
      </div>

      {/* 4 Thẻ chọn nhanh Rubric Archetype */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ESSAY_ARCHETYPES) as EssayCategory[]).map((key) => {
          const item = ESSAY_ARCHETYPES[key];
          const isSelected = activeCategory === key;
          const IconComp = archetypeIcons[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectArchetype(key)}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
                isSelected
                  ? "border-amber-500 bg-amber-50/40 shadow-sm ring-1 ring-amber-500/30 dark:border-amber-600 dark:bg-amber-950/20"
                  : "border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
              )}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg text-xs",
                      isSelected
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    <IconComp className="size-3.5" />
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      <Check className="size-3" /> Đang chọn
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <h5
                  className={cn(
                    "text-xs font-bold leading-tight",
                    isSelected ? "text-amber-950 dark:text-amber-200" : "text-slate-800 dark:text-slate-200"
                  )}
                >
                  {item.shortLabel}
                </h5>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                  {item.description}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                  {item.summaryWeights}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Bar tổng trọng số Rubric */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-600 dark:text-slate-400">
            Tổng trọng số tiêu chí đã phân bổ:
          </span>
          <span
            className={cn(
              "font-mono font-bold px-2 py-0.5 rounded-md",
              isValid
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950 dark:text-rose-300"
            )}
          >
            {totalWeight}% / 100% {isValid ? "✓ Hợp lệ" : "⚠ Cần điều chỉnh để đúng 100%"}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isValid ? "bg-emerald-500" : totalWeight > 100 ? "bg-rose-500" : "bg-amber-500"
            )}
            style={{ width: `${Math.min(totalWeight, 100)}%` }}
          />
        </div>
      </div>

      {/* Danh sách tiêu chí chi tiết */}
      <div className="space-y-3">
        {criteria.map((criterion, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                Tiêu chí {index + 1}
              </span>
              <button
                type="button"
                disabled={criteria.length <= 1}
                className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-30 dark:text-rose-400"
                onClick={() => update({ criteria: criteria.filter((_, i) => i !== index) })}
              >
                Xóa tiêu chí
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tên tiêu chí đánh giá
                <input
                  type="text"
                  className={cn(assessmentInput, "mt-1")}
                  placeholder="Ví dụ: Tính chính xác của khái niệm / cơ chế"
                  value={criterion.name ?? criterion.description}
                  onChange={(event) => {
                    const name = event.target.value;
                    update({
                      criteria: criteria.map((item, i) =>
                        i === index
                          ? { ...item, name, description: `${name}: ${item.guide ?? name}` }
                          : item
                      ),
                    });
                  }}
                />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Trọng số (%)
                <div className="relative mt-1">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={cn(assessmentInput, "font-mono font-bold pr-6")}
                    value={criterion.weight}
                    onChange={(event) => {
                      const weight = Number(event.target.value) || 0;
                      update({
                        criteria: criteria.map((item, i) =>
                          i === index ? { ...item, weight } : item
                        ),
                      });
                    }}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Hướng dẫn chấm cho AI (Guide)
              <textarea
                rows={2}
                className={cn(assessmentInput, "mt-1 text-xs")}
                placeholder="Mô tả cụ thể những điểm cốt lõi ứng viên cần đạt để AI đối chiếu chấm điểm..."
                value={criterion.guide ?? criterion.description}
                onChange={(event) => {
                  const guide = event.target.value;
                  update({
                    criteria: criteria.map((item, i) =>
                      i === index
                        ? { ...item, guide, description: `${item.name ?? ""}: ${guide}` }
                        : item
                    ),
                  });
                }}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Từ khóa chuyên môn gợi ý (tùy chọn, phân cách bằng dấu phẩy)
              <input
                type="text"
                className={cn(assessmentInput, "mt-1 text-xs")}
                placeholder="Ví dụ: Thread safety, Volatile, Synchronization, Memory barrier"
                value={Array.isArray(criterion.keywords) ? criterion.keywords.join(", ") : ""}
                onChange={(event) => {
                  const keywords = event.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean);
                  update({
                    criteria: criteria.map((item, i) =>
                      i === index ? { ...item, keywords } : item
                    ),
                  });
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          * AI sẽ sử dụng bộ tiêu chí và trọng số % này để phân tích câu trả lời của ứng viên đối chiếu với Đáp án tham khảo.
        </p>
        <button
          type="button"
          disabled={criteria.length >= 5}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          onClick={() =>
            update({
              criteria: [
                ...criteria,
                { name: "", guide: "", description: "Tiêu chí bổ sung", weight: 10, keywords: [] },
              ],
            })
          }
        >
          <Plus className="size-3.5 text-amber-600" />
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
