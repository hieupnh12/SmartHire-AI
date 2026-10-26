import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ZodError } from "zod";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code2,
  FlaskConical,
  GitCompare,
  Network,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import type { CodingContent, EssayCategory, EssayRubric, SampleResult } from "@/api/types/assessment";
import { AssessmentError, assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { cn } from "@/lib/utils";
import { useOptionalRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { MonacoCodeEditor } from "./MonacoCodeEditor";
import { applyHarnessTemplate, harnessTemplateOptions, type HarnessTemplateId } from "../utils/codingHarnessTemplates";
import { codingSchema, contentError, type CodingLanguage } from "../utils/questionContentValidation";

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
        guide: "Trình bày đúng định nghĩa cốt lõi, không nhầm lẫn thuật ngữ, nêu đúng bản chất kỹ thuật.",
        description: "Đúng định nghĩa, thuật ngữ chuẩn xác, nêu rõ bản chất vận hành.",
        weight: 50,
        keywords: ["định nghĩa", "nguyên lý", "cơ chế", "thuật ngữ"],
      },
      {
        name: "Giải thích cách hoạt động & tương tác",
        guide: "Làm rõ cách các thành phần phối hợp, luồng xử lý hoặc cấu trúc bên dưới (under the hood).",
        description: "Làm rõ luồng xử lý bên trong, cấu trúc dữ liệu hoặc vòng đời tương tác.",
        weight: 30,
        keywords: ["luồng xử lý", "vòng đời", "tương tác", "cấu trúc"],
      },
      {
        name: "Ví dụ minh họa & Ứng dụng thực tế",
        guide: "Đưa ra kịch bản thực tế, đoạn mã minh họa hoặc trường hợp sử dụng phù hợp.",
        description: "Minh họa bằng use-case cụ thể hoặc đoạn code ngắn làm sáng tỏ khái niệm.",
        weight: 20,
        keywords: ["ví dụ", "thực tế", "use-case", "minh họa"],
      },
    ],
  },
  ESSAY_SYSTEM_DESIGN: {
    label: "Kiến trúc hệ thống (System Design)",
    shortLabel: "Kiến trúc",
    badge: "40% • 30% • 30%",
    description: "Đánh giá khả năng phân rã kiến trúc, xử lý mở rộng (scalability) và cân nhắc đánh đổi (trade-offs).",
    summaryWeights: "Phân rã kiến trúc (40%) • Khả năng mở rộng & chịu lỗi (30%) • Phân tích đánh đổi (30%)",
    criteria: [
      {
        name: "Thiết kế kiến trúc & Phân chia trách nhiệm",
        guide: "Sơ đồ module, luồng dữ liệu giữa các dịch vụ, database, cache, message broker rõ ràng.",
        description: "Phân định ranh giới các dịch vụ, luồng dữ liệu và lưu trữ mạch lạc.",
        weight: 40,
        keywords: ["kiến trúc", "module", "service", "database", "luồng dữ liệu"],
      },
      {
        name: "Khả năng mở rộng (Scalability) & Chịu lỗi (Resilience)",
        guide: "Chiến lược horizontal scaling, caching, partitioning, circuit breaker, failover.",
        description: "Phương án chịu tải cao, tính sẵn sàng (HA) và xử lý sự cố.",
        weight: 30,
        keywords: ["mở rộng", "cache", "partitioning", "failover", "chịu lỗi"],
      },
      {
        name: "Phân tích đánh đổi (Trade-off Analysis)",
        guide: "So sánh các phương án (CAP theorem, sync vs async, SQL vs NoSQL) và lập luận chọn lựa.",
        description: "Biện luận vì sao chọn giải pháp này thay vì phương án khác, nêu rõ mặt hạn chế.",
        weight: 30,
        keywords: ["đánh đổi", "trade-off", "so sánh", "ưu nhược điểm", "lập luận"],
      },
    ],
  },
  ESSAY_SCENARIO: {
    label: "Tình huống & Khắc phục sự cố (Troubleshooting)",
    shortLabel: "Tình huống",
    badge: "40% • 40% • 20%",
    description: "Xử lý sự cố production: khoanh vùng nguyên nhân gốc (root cause), giải pháp tức thời và dài hạn.",
    summaryWeights: "Khoanh vùng nguyên nhân (40%) • Giải pháp xử lý (40%) • Phòng ngừa tái diễn (20%)",
    criteria: [
      {
        name: "Phương pháp xác định nguyên nhân gốc (Root Cause Analysis)",
        guide: "Trình tự điều tra từ logs, metrics, profiling, giả thuyết logic và cô lập vấn đề.",
        description: "Quy trình điều tra bài bản, sử dụng công cụ quan sát (logs/traces/metrics).",
        weight: 40,
        keywords: ["root cause", "logs", "metrics", "truy vết", "cô lập sự cố"],
      },
      {
        name: "Giải pháp khắc phục (Immediate Mitigation & Resolution)",
        guide: "Biện pháp cấp cứu tức thì để phục hồi dịch vụ (rollback, hotfix, scale) và sửa dứt điểm.",
        description: "Xử lý sự cố nhanh chóng, giảm thiểu downtime và khôi phục hoạt động.",
        weight: 40,
        keywords: ["khắc phục", "rollback", "hotfix", "giảm tải", "xử lý"],
      },
      {
        name: "Biện pháp phòng ngừa dài hạn (Prevention & Post-mortem)",
        guide: "Kế hoạch bổ sung alerting, automated test, health check, thay đổi quy trình release.",
        description: "Bài học kinh nghiệm, cải tiến hệ thống và quy trình để không tái diễn.",
        weight: 20,
        keywords: ["phòng ngừa", "post-mortem", "alerting", "test tự động", "cải tiến"],
      },
    ],
  },
  ESSAY_TRADE_OFF: {
    label: "Phân tích & So sánh giải pháp (Trade-off Analysis)",
    shortLabel: "So sánh giải pháp",
    badge: "35% • 35% • 30%",
    description: "So sánh đa chiều giữa các công nghệ/mô hình và đưa ra khuyến nghị phù hợp bối cảnh dự án.",
    summaryWeights: "Tiêu chí so sánh (35%) • Phân tích sâu từng phương án (35%) • Kết luận theo ngữ cảnh (30%)",
    criteria: [
      {
        name: "Xác lập tiêu chí so sánh đa chiều",
        guide: "Liệt kê rõ các góc nhìn: hiệu năng, chi phí vận hành, độ phức tạp bảo trì, cộng đồng hỗ trợ.",
        description: "Khung so sánh toàn diện bao quát cả kỹ thuật lẫn vận hành.",
        weight: 35,
        keywords: ["tiêu chí", "hiệu năng", "chi phí", "bảo trì", "độ phức tạp"],
      },
      {
        name: "Phân tích điểm mạnh / yếu của từng phương án",
        guide: "Mổ xẻ ưu - nhược điểm có dẫn chứng cụ thể, không thiên vị cảm tính.",
        description: "Khách quan, có bằng chứng thực tế cho từng công nghệ / mô hình.",
        weight: 35,
        keywords: ["ưu điểm", "nhược điểm", "phân tích", "bằng chứng", "khách quan"],
      },
      {
        name: "Khuyến nghị lựa chọn gắn với bối cảnh cụ thể",
        guide: "Đưa ra quyết định cuối cùng dựa trên ràng buộc của bài toán (quy mô, ngân sách, nhân sự).",
        description: "Đề xuất rõ ràng kèm điều kiện áp dụng, giải thích thuyết phục.",
        weight: 30,
        keywords: ["khuyến nghị", "bối cảnh", "ràng buộc", "quyết định", "kết luận"],
      },
    ],
  },
  ESSAY_ARCHITECTURE: {
    label: "Kiến trúc hệ thống (System Design)",
    shortLabel: "Kiến trúc",
    badge: "40% • 30% • 30%",
    description: "Đánh giá khả năng phân rã kiến trúc, xử lý mở rộng (scalability) và cân nhắc đánh đổi (trade-offs).",
    summaryWeights: "Phân rã kiến trúc (40%) • Khả năng mở rộng & chịu lỗi (30%) • Phân tích đánh đổi (30%)",
    criteria: [
      {
        name: "Thiết kế kiến trúc & Phân chia trách nhiệm",
        guide: "Sơ đồ module, luồng dữ liệu giữa các dịch vụ, database, cache, message broker rõ ràng.",
        description: "Phân định ranh giới các dịch vụ, luồng dữ liệu và lưu trữ mạch lạc.",
        weight: 40,
        keywords: ["kiến trúc", "module", "service", "database", "luồng dữ liệu"],
      },
      {
        name: "Khả năng mở rộng (Scalability) & Chịu lỗi (Resilience)",
        guide: "Chiến lược horizontal scaling, caching, partitioning, circuit breaker, failover.",
        description: "Phương án chịu tải cao, tính sẵn sàng (HA) và xử lý sự cố.",
        weight: 30,
        keywords: ["mở rộng", "cache", "partitioning", "failover", "chịu lỗi"],
      },
      {
        name: "Phân tích đánh đổi (Trade-off Analysis)",
        guide: "So sánh các phương án (CAP theorem, sync vs async, SQL vs NoSQL) và lập luận chọn lựa.",
        description: "Biện luận vì sao chọn giải pháp này thay vì phương án khác, nêu rõ mặt hạn chế.",
        weight: 30,
        keywords: ["đánh đổi", "trade-off", "so sánh", "ưu nhược điểm", "lập luận"],
      },
    ],
  },
  ESSAY_COMPARISON: {
    label: "Phân tích & So sánh giải pháp (Trade-off Analysis)",
    shortLabel: "So sánh giải pháp",
    badge: "35% • 35% • 30%",
    description: "So sánh đa chiều giữa các công nghệ/mô hình và đưa ra khuyến nghị phù hợp bối cảnh dự án.",
    summaryWeights: "Tiêu chí so sánh (35%) • Phân tích sâu từng phương án (35%) • Kết luận theo ngữ cảnh (30%)",
    criteria: [
      {
        name: "Xác lập tiêu chí so sánh đa chiều",
        guide: "Liệt kê rõ các góc nhìn: hiệu năng, chi phí vận hành, độ phức tạp bảo trì, cộng đồng hỗ trợ.",
        description: "Khung so sánh toàn diện bao quát cả kỹ thuật lẫn vận hành.",
        weight: 35,
        keywords: ["tiêu chí", "hiệu năng", "chi phí", "bảo trì", "độ phức tạp"],
      },
      {
        name: "Phân tích điểm mạnh / yếu của từng phương án",
        guide: "Mổ xẻ ưu - nhược điểm có dẫn chứng cụ thể, không thiên vị cảm tính.",
        description: "Khách quan, có bằng chứng thực tế cho từng công nghệ / mô hình.",
        weight: 35,
        keywords: ["ưu điểm", "nhược điểm", "phân tích", "bằng chứng", "khách quan"],
      },
      {
        name: "Khuyến nghị lựa chọn gắn với bối cảnh cụ thể",
        guide: "Đưa ra quyết định cuối cùng dựa trên ràng buộc của bài toán (quy mô, ngân sách, nhân sự).",
        description: "Đề xuất rõ ràng kèm điều kiện áp dụng, giải thích thuyết phục.",
        weight: 30,
        keywords: ["khuyến nghị", "bối cảnh", "ràng buộc", "quyết định", "kết luận"],
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
  title: "Tổng hai số",
  constraints: "−10^9 ≤ a, b ≤ 10^9\nKết quả vừa trong kiểu số nguyên 32-bit.",
  category: "CODING_ALGORITHM",
  timeLimitMs: 2000,
  memoryMb: 256,
  starterCode: { python: "def solve(a, b):\n    return a + b" },
  harness: { python: "{{SOURCE}}\na, b = map(int, input().split())\nprint(solve(a, b))" },
  testCases: [
    { input: "1 2", expectedOutput: "3", sample: true, explanation: "1 + 2 = 3.", weight: 0 },
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
  questionSkill?: string | null;
}) {
  const jobFromContext = useOptionalRecruitmentJob();
  const rawSkills = jobSkills ?? jobFromContext?.skills ?? [];
  const jobLanguages = getJobLanguages(rawSkills);
  const questionLang = resolveLanguageFromSkill(questionSkill);

  const parse = <T,>(fallback: string): T => {
    try {
      return JSON.parse(value.trim() || fallback) as T;
    } catch {
      return JSON.parse(fallback) as T;
    }
  };

  const coding = parse<CodingContent>(codingExample);
  const currentLanguages = Object.keys(coding.starterCode ?? {});

  const addLanguage = (langId: string) => {
    if (!langId || currentLanguages.includes(langId)) return;
    onChange(
      JSON.stringify({
        ...coding,
        starterCode: { ...coding.starterCode, [langId]: "" },
        harness: { ...coding.harness, [langId]: "{{SOURCE}}" },
      })
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <div className="border-b border-[var(--color-border-default)] pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--color-on-surface)]">
            <Code2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            Mã khởi đầu cho ứng viên (Starter Code)
          </h3>
          {questionLang && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="size-3" />
              Kỹ năng câu hỏi: {questionLang.label}
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
              Xóa ngôn ngữ
            </button>
          </div>

          <MonacoCodeEditor
            height="180px"
            language={language}
            value={source}
            onChange={(val) => {
              onChange(
                JSON.stringify({
                  ...coding,
                  starterCode: { ...coding.starterCode, [language]: val },
                })
              );
            }}
            placeholder={`// Nhập khung hàm bắt đầu cho ngôn ngữ ${language.toUpperCase()}...`}
          />
        </div>
      ))}

      {currentLanguages.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <Code2 className="mx-auto size-8 text-slate-400" />
          <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            Chưa có ngôn ngữ nào được cấu hình cho bài lập trình.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {(questionLang ? [questionLang] : jobLanguages.length > 0 ? jobLanguages : ALL_SUPPORTED_LANGUAGES.slice(0, 3)).map((l) => (
              <button
                key={l.id}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                onClick={() => addLanguage(l.id)}
              >
                <Plus className="size-3.5" />
                Thêm {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border-default)]">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Thêm ngôn ngữ hỗ trợ:
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {jobLanguages
            .filter((l) => !currentLanguages.includes(l.id))
            .map((l) => (
              <button
                key={l.id}
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                onClick={() => addLanguage(l.id)}
              >
                <Plus className="size-3" />
                {l.label} (Job)
              </button>
            ))}

          <select
            className={cn(assessmentInput, "h-8 py-0 px-2 text-xs w-auto")}
            value=""
            onChange={(e) => addLanguage(e.target.value)}
          >
            <option value="">+ Chọn ngôn ngữ khác...</option>
            {ALL_SUPPORTED_LANGUAGES.filter((l) => !currentLanguages.includes(l.id)).map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
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
      criteria,
      ...patch,
    };
    if (referenceAnswer !== undefined && !("referenceAnswer" in patch)) {
      updated.referenceAnswer = referenceAnswer;
    }
    onChange(JSON.stringify(updated, null, 2));
  };

  const applyArchetype = (cat: EssayCategory) => {
    const archetype = ESSAY_ARCHETYPES[cat];
    const newCriteria = archetype.criteria.map((c) => ({
      name: c.name,
      guide: c.guide,
      description: c.description,
      weight: c.weight,
      keywords: c.keywords ? [...c.keywords] : [],
    }));
    onChange(
      JSON.stringify(
        {
          category: cat,
          referenceAnswer: rubric.referenceAnswer ?? referenceAnswer ?? "",
          criteria: newCriteria,
        },
        null,
        2
      )
    );
  };

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = totalWeight === 100;

  const autoDistribute = () => {
    const count = criteria.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    const nextCriteria = criteria.map((c, i) => ({
      ...c,
      weight: base + (i < remainder ? 1 : 0),
    }));
    update({ criteria: nextCriteria });
  };

  const addCriterion = () => {
    const remainingWeight = Math.max(0, 100 - totalWeight);
    const newCrit = {
      name: `Tiêu chí ${criteria.length + 1}`,
      guide: "Mô tả kỳ vọng ứng viên trả lời để AI chấm đúng hướng.",
      description: "Tiêu chuẩn đánh giá",
      weight: remainingWeight || 10,
      keywords: [],
    };
    update({ criteria: [...criteria, newCrit] });
  };

  const removeCriterion = (idx: number) => {
    update({ criteria: criteria.filter((_, i) => i !== idx) });
  };

  const updateCriterion = (idx: number, patch: Partial<(typeof criteria)[number]>) => {
    const next = criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    update({ criteria: next });
  };

  const archetypeIcons: Record<EssayCategory, typeof BookOpen> = {
    ESSAY_CONCEPTUAL: BookOpen,
    ESSAY_SYSTEM_DESIGN: Network,
    ESSAY_ARCHITECTURE: Network,
    ESSAY_SCENARIO: AlertTriangle,
    ESSAY_TRADE_OFF: GitCompare,
    ESSAY_COMPARISON: GitCompare,
  };

  return (
    <div className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--color-on-surface)]">
            <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            Mô hình Rubric mẫu cho AI chấm tự luận
          </h3>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            Chọn mô hình chuẩn hoặc tùy chỉnh từng tiêu chí
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
          Mỗi dạng câu hỏi tự luận có cấu trúc kỳ vọng riêng. Chọn mô hình phù hợp giúp AI bám sát tiêu chuẩn và chấm điểm chuẩn xác.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {(["ESSAY_CONCEPTUAL", "ESSAY_SYSTEM_DESIGN", "ESSAY_SCENARIO", "ESSAY_TRADE_OFF"] as const).map(
          (key) => {
            const arch = ESSAY_ARCHETYPES[key];
            const Icon = archetypeIcons[key];
            const isSelected = activeCategory === key ||
              (key === "ESSAY_SYSTEM_DESIGN" && activeCategory === "ESSAY_ARCHITECTURE") ||
              (key === "ESSAY_TRADE_OFF" && activeCategory === "ESSAY_COMPARISON");
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyArchetype(key)}
                className={cn(
                  "relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] shadow-xs"
                    : "border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary-soft)]"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div
                    className={cn(
                      "grid size-7 place-items-center rounded-lg",
                      isSelected
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-surface-card)] text-[var(--color-on-surface-variant)]"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)]">
                      <Check className="size-3.5" /> Đang chọn
                    </span>
                  )}
                </div>
                <span className="mt-2.5 text-xs font-bold text-[var(--color-on-surface)]">
                  {arch.shortLabel}
                </span>
                <span className="text-[10px] text-[var(--color-on-surface-variant)] mt-0.5">
                  {arch.badge}
                </span>
                <p className="mt-2 line-clamp-2 text-[11px] text-[var(--color-on-surface-variant)] leading-normal">
                  {arch.description}
                </p>
              </button>
            );
          }
        )}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5",
          isWeightValid
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        )}
      >
        <div className="flex items-center gap-2">
          {!isWeightValid && <AlertTriangle className="size-4 shrink-0" />}
          <div>
            <p className="text-xs font-semibold">
              Tổng trọng số: <span className="font-bold">{totalWeight}%</span> / 100%
              {isWeightValid ? " — Cân bằng hợp lệ" : " — Chưa đủ 100%, hãy điều chỉnh"}
            </p>
            <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className={cn("h-full transition-all", isWeightValid ? "bg-emerald-500" : "bg-amber-500")}
                style={{ width: `${Math.min(100, totalWeight)}%` }}
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={autoDistribute}
          className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-white/70 px-2.5 py-1 text-xs font-semibold hover:bg-white dark:bg-black/30 dark:hover:bg-black/50"
        >
          <RotateCcw className="size-3" />
          Chia đều trọng số
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Danh sách tiêu chí đánh giá ({criteria.length})
          </h4>
          <button
            type="button"
            onClick={addCriterion}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            <Plus className="size-3.5" /> Thêm tiêu chí
          </button>
        </div>

        {criteria.map((crit, idx) => (
          <div
            key={idx}
            className="space-y-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={crit.name ?? crit.description}
                  onChange={(e) => updateCriterion(idx, { name: e.target.value, description: e.target.value })}
                  placeholder="Tên tiêu chí đánh giá..."
                  className={cn(assessmentInput, "h-8 py-1 text-xs font-semibold flex-1")}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={crit.weight}
                    onChange={(e) => updateCriterion(idx, { weight: Number(e.target.value) || 0 })}
                    className={cn(assessmentInput, "h-8 w-16 py-1 text-center text-xs font-bold")}
                  />
                  <span className="text-xs font-bold text-[var(--color-on-surface-variant)]">%</span>
                </div>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    className="grid size-8 place-items-center rounded-lg text-[var(--color-error)] hover:bg-[var(--color-error-container)]"
                    aria-label={`Xóa tiêu chí ${idx + 1}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={2}
              value={crit.guide ?? ""}
              onChange={(e) => updateCriterion(idx, { guide: e.target.value })}
              placeholder="Hướng dẫn cho AI: Ứng viên cần nêu được ý gì để đạt điểm tối đa ở tiêu chí này?"
              className={cn(assessmentInput, "text-xs resize-y")}
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                Từ khóa gợi ý AI:
              </span>
              {(crit.keywords ?? []).map((kw, kidx) => (
                <span
                  key={kidx}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-card)] px-2 py-0.5 text-[11px] text-[var(--color-on-surface)] border border-[var(--color-border-default)]"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() =>
                      updateCriterion(idx, {
                        keywords: (crit.keywords ?? []).filter((_, ki) => ki !== kidx),
                      })
                    }
                    className="text-[var(--color-outline)] hover:text-[var(--color-error)]"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ Thêm từ khóa (Enter)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val && !(crit.keywords ?? []).includes(val)) {
                      updateCriterion(idx, {
                        keywords: [...(crit.keywords ?? []), val],
                      });
                      e.currentTarget.value = "";
                    }
                  }
                }}
                className="h-6 rounded border border-dashed border-[var(--color-border-default)] bg-transparent px-2 text-[11px] outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function passed(result: SampleResult) {
  return result.status?.id === 3;
}

export function QuestionContentFields({
  type,
  value,
  onChange,
  executionOnly = false,
  jobSkills,
  questionId,
}: {
  type: "ESSAY" | "CODING";
  value: string;
  onChange: (value: string) => void;
  executionOnly?: boolean;
  jobSkills?: Array<{ name: string } | string>;
  questionId?: number;
}) {
  let error: string | undefined;
  try {
    if (value.trim()) JSON.parse(value);
  } catch {
    error = "JSON không hợp lệ. Kiểm tra dấu ngoặc và dấu phẩy.";
  }
  const parse = <T,>(fallback: string): T => {
    try {
      return JSON.parse(value.trim() || fallback) as T;
    } catch {
      return JSON.parse(fallback) as T;
    }
  };

  if (type === "ESSAY") {
    return <AiRubricCriteriaEditor value={value} onChange={onChange} />;
  }

  const jobFromContext = useOptionalRecruitmentJob();
  const rawSkills = jobSkills ?? jobFromContext?.skills ?? [];
  const jobLanguages = getJobLanguages(rawSkills);

  const coding = parse<CodingContent>(codingExample);
  const languages = Object.keys(coding.starterCode ?? {});
  const [verifyLanguage, setVerifyLanguage] = useState(languages[0] ?? "python");
  const [solution, setSolution] = useState(
    coding.starterCode?.[verifyLanguage] ?? coding.starterCode?.[languages[0] ?? ""] ?? ""
  );
  const [verifyMessage, setVerifyMessage] = useState<string>();
  const [templateId, setTemplateId] = useState<HarnessTemplateId | "">("");

  const update = (patch: Partial<CodingContent>) => onChange(JSON.stringify({ ...coding, ...patch }, null, 2));

  const verify = useMutation({
    mutationFn: async () => {
      const parsed = codingSchema.parse(coding);
      return questionBankApi.verifyCoding({ coding: parsed, language: verifyLanguage, source: solution, questionId });
    },
    onSuccess: (results) => {
      const ok = results.filter(passed).length;
      const allOk = ok === results.length;
      if (allOk && questionId) update({ verifiedAt: new Date().toISOString() });
      else if (!allOk) update({ verifiedAt: null });
      setVerifyMessage(
        allOk
          ? questionId
            ? `Lời giải mẫu đạt ${ok}/${results.length} test. Đã ghi nhận verify — có thể xuất bản đề.`
            : `Lời giải mẫu đạt ${ok}/${results.length} test. Lưu câu hỏi rồi chạy lại verify để ghi nhận trước khi xuất bản.`
          : `Lời giải mẫu đạt ${ok}/${results.length} test. Sửa harness, test hoặc lời giải trước khi xuất bản.`
      );
    },
    onError: () => setVerifyMessage(undefined),
  });

  const applyTemplate = () => {
    if (!templateId) return;
    const targets = (languages.length ? languages : ["python"]) as CodingLanguage[];
    const generated = applyHarnessTemplate(templateId, targets);
    if (!Object.keys(generated.starterCode).length) return;
    update({
      starterCode: { ...coding.starterCode, ...generated.starterCode },
      harness: { ...coding.harness, ...generated.harness },
    });
    const first = Object.keys(generated.starterCode)[0];
    if (first) {
      setVerifyLanguage(first);
      setSolution(generated.starterCode[first] ?? "");
    }
  };

  const hiddenTests = (coding.testCases ?? []).filter((t) => !t.sample);
  const sampleTests = (coding.testCases ?? []).filter((t) => t.sample);
  const hiddenTotalWeight = hiddenTests.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
  const isWeightValid = hiddenTests.length === 0 || hiddenTotalWeight === 100;

  const autoDistributeWeights = () => {
    const count = hiddenTests.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    let hIndex = 0;
    const nextCases = (coding.testCases ?? []).map((tc) => {
      if (tc.sample) return { ...tc, weight: 0 };
      const extra = hIndex < remainder ? 1 : 0;
      hIndex++;
      return { ...tc, weight: base + extra };
    });
    update({ testCases: nextCases });
  };

  return (
    <fieldset className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <legend className="px-2 text-sm font-medium">{executionOnly ? "Thiết lập chạy bài" : "Bài lập trình"}</legend>
      {executionOnly && (
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          Testcase kiểm tra kết quả chạy code. Rubric ở phần 1 mô tả chất lượng lời giải. Mã khởi đầu và đáp án mẫu chỉ nhập ở phần 1.
        </p>
      )}

      {coding.verifiedAt && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Đã verify lời giải mẫu lúc {new Date(coding.verifiedAt).toLocaleString("vi-VN")}{questionId ? "" : " (làm mới sau khi lưu)"}.
        </p>
      )}
      {!executionOnly && !questionId && (
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          Lưu câu hỏi trước, rồi chạy verify để ghi nhận điều kiện xuất bản.
        </p>
      )}

      {!executionOnly && (
        <>
          <label className="block text-sm">
            Tên bài toán
            <input
              className={assessmentInput}
              maxLength={255}
              value={coding.title ?? ""}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Ví dụ: Tổng hai số"
            />
          </label>
          <label className="block text-sm">
            Constraints
            <textarea
              rows={3}
              maxLength={5000}
              className={assessmentInput}
              value={coding.constraints ?? ""}
              onChange={(event) => update({ constraints: event.target.value })}
              placeholder={"Ví dụ:\n1 ≤ n ≤ 10^5\n−10^9 ≤ a_i ≤ 10^9"}
            />
          </label>
        </>
      )}

      <details className="rounded-xl border border-[var(--color-border-default)] p-4" open={executionOnly ? undefined : true}>
        <summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary)]">
          Cấu hình chạy nâng cao · giới hạn tài nguyên & chương trình gọi hàm (Harness)
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Phân loại bài
              <select
                className={assessmentInput}
                value={coding.category}
                onChange={(event) => update({ category: event.target.value as CodingContent["category"] })}
              >
                <option value="CODING_ALGORITHM">Thuật toán</option>
                <option value="CODING_OOP">Hướng đối tượng</option>
                <option value="SQL_QUERY">Truy vấn SQL</option>
              </select>
            </label>
            <label className="text-sm">
              Giới hạn thời gian (ms)
              <input
                type="number"
                min={100}
                max={10000}
                className={assessmentInput}
                value={coding.timeLimitMs}
                onChange={(event) => update({ timeLimitMs: Number(event.target.value) })}
              />
            </label>
            <label className="text-sm">
              Bộ nhớ (MB)
              <input
                type="number"
                min={32}
                max={512}
                className={assessmentInput}
                value={coding.memoryMb}
                onChange={(event) => update({ memoryMb: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
            <label className="min-w-56 flex-1 text-sm">
              Mẫu starter + harness
              <select
                className={assessmentInput}
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value as HarnessTemplateId | "")}
              >
                <option value="">Chọn mẫu I/O</option>
                {harnessTemplateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} — {option.hint}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="secondary" disabled={!templateId} onClick={applyTemplate}>
              Áp dụng cho ngôn ngữ đang có
            </Button>
            <p className="basis-full text-xs text-[var(--color-on-surface-variant)]">
              Ghi đè starter/harness của các ngôn ngữ đã thêm (bỏ trống ngôn ngữ thì mặc định Python). Có thể chỉnh tay sau khi áp dụng.
            </p>
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
                      onChange={(val) => update({ starterCode: { ...coding.starterCode, [language]: val } })}
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
                    onChange={(val) => update({ harness: { ...coding.harness, [language]: val } })}
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
                onChange={(event) => {
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
                {jobLanguages.filter((l) => !(l.id in (coding.starterCode ?? {}))).length > 0 && (
                  <optgroup label="Ngôn ngữ cấu hình trong Job (Ưu tiên)">
                    {jobLanguages
                      .filter((l) => !(l.id in (coding.starterCode ?? {})))
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          ★ {l.label} (Cấu hình theo Job)
                        </option>
                      ))}
                  </optgroup>
                )}
                {ALL_SUPPORTED_LANGUAGES.filter(
                  (l) => !(l.id in (coding.starterCode ?? {})) && !jobLanguages.some((jl) => jl.id === l.id)
                ).length > 0 && (
                  <optgroup label={jobLanguages.length > 0 ? "Các ngôn ngữ khác (mở rộng)" : "Danh sách ngôn ngữ"}>
                    {ALL_SUPPORTED_LANGUAGES.filter(
                      (l) => !(l.id in (coding.starterCode ?? {})) && !jobLanguages.some((jl) => jl.id === l.id)
                    ).map((l) => (
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
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5",
              isWeightValid
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            )}
          >
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
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    test.sample
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                  )}
                >
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
                onChange={(event) =>
                  update({
                    testCases: coding.testCases.map((item, i) => (i === index ? { ...item, input: event.target.value } : item)),
                  })
                }
              />
            </label>

            <label className="text-sm">
              Output mong đợi
              <textarea
                rows={2}
                className={cn(assessmentInput, "font-mono text-xs")}
                value={test.expectedOutput}
                onChange={(event) =>
                  update({
                    testCases: coding.testCases.map((item, i) => (i === index ? { ...item, expectedOutput: event.target.value } : item)),
                  })
                }
              />
            </label>

            {test.sample && (
              <label className="text-sm sm:col-span-2">
                Giải thích ví dụ
                <textarea
                  rows={2}
                  maxLength={5000}
                  className={assessmentInput}
                  value={test.explanation ?? ""}
                  onChange={(event) =>
                    update({
                      testCases: coding.testCases.map((item, i) => (i === index ? { ...item, explanation: event.target.value } : item)),
                    })
                  }
                  placeholder="Ví dụ: Vì sao output đúng với input này."
                />
              </label>
            )}

            <div className="flex flex-wrap items-center gap-4 sm:col-span-2 justify-between">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={test.sample}
                  className="accent-[var(--color-primary)]"
                  onChange={(event) =>
                    update({
                      testCases: coding.testCases.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              sample: event.target.checked,
                              weight: event.target.checked ? 0 : item.weight || 20,
                            }
                          : item
                      ),
                    })
                  }
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
                      onChange={(event) => {
                        const weight = event.target.value === "" ? undefined : Number(event.target.value);
                        update({
                          testCases: coding.testCases.map((item, i) => (i === index ? { ...item, weight } : item)),
                        });
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
            const currentHidden = currentCases.filter((t) => !t.sample);
            const currentTotal = currentHidden.reduce((sum, t) => sum + (Number(t.weight) || 0), 0);
            const defaultWeight = Math.max(1, 100 - currentTotal);
            update({ testCases: [...currentCases, { input: "", expectedOutput: "", sample: false, weight: defaultWeight }] });
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Thêm test case
        </button>
      </div>

      <section className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
        <h4 className="text-sm font-semibold">Kiểm chứng lời giải mẫu</h4>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          Chạy lời giải đúng trên toàn bộ sample + hidden trước khi lưu vào ngân hàng hoặc xuất bản đề. Cần sandbox Judge đã cấu hình.
        </p>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <label className="text-sm">
            Ngôn ngữ
            <select
              className={assessmentInput}
              value={verifyLanguage}
              onChange={(event) => {
                const next = event.target.value;
                setVerifyLanguage(next);
                setSolution(coding.starterCode?.[next] ?? "");
                verify.reset();
                setVerifyMessage(undefined);
              }}
            >
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Lời giải mẫu
            <textarea
              rows={6}
              spellCheck={false}
              className={`${assessmentInput} font-mono text-xs`}
              value={solution}
              onChange={(event) => {
                setSolution(event.target.value);
                verify.reset();
                setVerifyMessage(undefined);
              }}
            />
          </label>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={verify.isPending || !solution.trim() || !languages.includes(verifyLanguage)}
          onClick={() => {
            setVerifyMessage(undefined);
            verify.mutate();
          }}
        >
          <Play className="size-4" aria-hidden="true" />
          {verify.isPending ? "Đang chạy…" : "Chạy lời giải trên mọi test"}
        </Button>
        {verify.isError &&
          (verify.error instanceof ZodError ? (
            <FieldError message={contentError(verify.error)} />
          ) : (
            <AssessmentError error={verify.error} />
          ))}
        {verifyMessage && (
          <p
            role="status"
            className={`text-sm ${
              verify.data && verify.data.every(passed)
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-status-danger)]"
            }`}
          >
            {verifyMessage}
          </p>
        )}
        {verify.data && (
          <ul className="space-y-1 text-xs">
            {verify.data.map((result, index) => (
              <li key={index} className={passed(result) ? "text-emerald-700" : "text-[var(--color-status-danger)]"}>
                Test {index + 1}: {passed(result) ? "Passed" : "Failed"} · {result.status?.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!value.trim() && (
        <button type="button" className="ml-3 text-sm text-[var(--color-primary)]" onClick={() => onChange(codingExample)}>
          Sử dụng mẫu đang hiển thị
        </button>
      )}
      <FieldError message={error} />
    </fieldset>
  );
}
