import type { BankQuestionRequest } from "@/api/types/questionBank";
import type { CodingContent, QuestionRequest } from "@/api/types/assessment";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";
import {
  CheckCheck,
  Code2,
  FileText,
  ListChecks,
} from "lucide-react";

export const SKILLS = SKILL_CATALOG.flatMap((group) => group.skills);

export const HELP =
  "AI Question Studio cho phép biên soạn câu hỏi tự động theo kỹ năng và JD. Bạn có thể sinh nháp nhiều đợt, kiểm tra độ trùng lặp, trực tiếp chỉnh sửa đáp án và chọn lọc các câu ưng ý nhất trước khi nhập vào Ngân hàng.";

export type QuestionKind = "MCQ" | "MULTIPLE_CHOICE" | "ESSAY" | "CODING";
export type CodingLanguage = "java" | "python" | "javascript" | "sql";

export type Rubric = {
  referenceAnswer?: string;
  criteria?: { description: string; weight: number }[];
};

export type DraftItem = {
  id: string;
  batch: number;
  question: QuestionRequest;
  authoringMetadata: Record<string, unknown> | null;
};

export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function asRubric(value: unknown): Rubric | null {
  return value && typeof value === "object" ? (value as Rubric) : null;
}

export function similarIds(meta: Record<string, unknown> | null | undefined): number[] {
  const raw = meta?.similarQuestionIds;
  return Array.isArray(raw) ? raw.filter((id): id is number => typeof id === "number") : [];
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollCodingDrafts(
  body: {
    skill: string;
    difficulty: "Easy" | "Medium" | "Hard";
    count: number;
    language: CodingLanguage;
    instructions: string;
  },
  signal?: AbortSignal,
): Promise<BankQuestionRequest[]> {
  const started = await questionBankApi.generate(
    {
      skill: body.skill,
      questionType: "CODING",
      difficulty: body.difficulty,
      count: Math.max(1, Math.min(5, body.count)),
      language: body.language,
      instructions: body.instructions,
    },
    signal,
  );

  for (let attempt = 0; attempt < 90; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Thao tác sinh câu hỏi đã bị hủy.", "AbortError");
    }
    const status = await questionBankApi.generationStatus(started.id, signal);
    if (status.status === "READY") {
      const activeStudioModel =
        typeof window !== "undefined" ? localStorage.getItem("smarthire_active_ai_model") : null;
      const detectedModel =
        (typeof status.model === "string" && status.model.trim()) ||
        activeStudioModel ||
        "Coding AI Engine";
      return status.questions.map((question) => ({
        question,
        authoringMetadata: { aiGenerated: true, source: "AI", model: detectedModel, aiModel: detectedModel },
      }));
    }
    if (status.status === "FAILED") {
      throw new Error(status.error || "AI chưa tạo được câu code hợp lệ.");
    }
    await sleep(2000);
  }
  throw new Error("Hết thời gian chờ AI tạo câu code. Thử lại với ít câu hơn.");
}

export function codingSummary(coding: CodingContent | null | undefined) {
  if (!coding) return null;
  const langs = Object.keys(coding.starterCode ?? {});
  const sample = (coding.testCases ?? []).filter((item) => item.sample).length;
  const hidden = (coding.testCases ?? []).filter((item) => !item.sample).length;
  return {
    title: coding.title || "Bài code",
    category: coding.category,
    langs: langs.join(", ") || "—",
    sample,
    hidden,
  };
}

export const QUESTION_TYPES = [
  {
    id: "MCQ" as const,
    label: "Trắc nghiệm",
    badge: "1 đáp án",
    icon: ListChecks,
  },
  {
    id: "MULTIPLE_CHOICE" as const,
    label: "Nhiều đáp án",
    badge: "Multi-select",
    icon: CheckCheck,
  },
  {
    id: "ESSAY" as const,
    label: "Tự luận",
    badge: "Rubric AI",
    icon: FileText,
  },
  {
    id: "CODING" as const,
    label: "Lập trình",
    badge: "Code & Tests",
    icon: Code2,
  },
] as const;

export const DIFFICULTIES = [
  { id: "Easy" as const, label: "Dễ" },
  { id: "Medium" as const, label: "Trung bình" },
  { id: "Hard" as const, label: "Khó" },
] as const;

export const QUICK_PROMPTS = [
  "Kiến trúc & Design Patterns",
  "Tối ưu hóa hiệu năng",
  "Xử lý concurrency & đa luồng",
  "Bảo mật & Authentication",
  "Clean Code & SOLID",
  "Xử lý Transaction & Database",
];
