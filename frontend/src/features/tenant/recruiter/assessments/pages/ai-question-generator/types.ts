import type { BankQuestionRequest } from "@/api/types/questionBank";
import type { CodingContent, QuestionRequest } from "@/api/types/assessment";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";
import { t as globalT, type TranslateFn } from "@/i18n";
import {
  CheckCheck,
  Code2,
  FileText,
  ListChecks,
} from "lucide-react";

export const SKILLS = SKILL_CATALOG.flatMap((group) => group.skills);

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
  translate: TranslateFn = globalT,
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
      throw new DOMException(translate("recruiter.assessments.aiStudio.abortedError"), "AbortError");
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
      throw new Error(status.error || translate("recruiter.assessments.aiStudio.codingGenerateFailed"));
    }
    await sleep(2000);
  }
  throw new Error(translate("recruiter.assessments.aiStudio.codingGenerateTimeout"));
}

export function codingSummary(coding: CodingContent | null | undefined, translate: TranslateFn = globalT) {
  if (!coding) return null;
  const langs = Object.keys(coding.starterCode ?? {});
  const sample = (coding.testCases ?? []).filter((item) => item.sample).length;
  const hidden = (coding.testCases ?? []).filter((item) => !item.sample).length;
  return {
    title: coding.title || translate("recruiter.assessments.aiStudio.codingFallbackTitle"),
    category: coding.category,
    langs: langs.join(", ") || translate("recruiter.assessments.common.dash"),
    sample,
    hidden,
  };
}

export function getQuestionTypes(translate: TranslateFn = globalT) {
  return [
    {
      id: "MCQ" as const,
      label: translate("recruiter.assessments.aiStudio.questionTypes.mcqLabel"),
      badge: translate("recruiter.assessments.aiStudio.questionTypes.mcqBadge"),
      icon: ListChecks,
    },
    {
      id: "MULTIPLE_CHOICE" as const,
      label: translate("recruiter.assessments.aiStudio.questionTypes.multiLabel"),
      badge: translate("recruiter.assessments.aiStudio.questionTypes.multiBadge"),
      icon: CheckCheck,
    },
    {
      id: "ESSAY" as const,
      label: translate("recruiter.assessments.aiStudio.questionTypes.essayLabel"),
      badge: translate("recruiter.assessments.aiStudio.questionTypes.essayBadge"),
      icon: FileText,
    },
    {
      id: "CODING" as const,
      label: translate("recruiter.assessments.aiStudio.questionTypes.codingLabel"),
      badge: translate("recruiter.assessments.aiStudio.questionTypes.codingBadge"),
      icon: Code2,
    },
  ] as const;
}

export function getDifficulties(translate: TranslateFn = globalT) {
  return [
    { id: "Easy" as const, label: translate("recruiter.assessments.common.difficulty.easyShort") },
    { id: "Medium" as const, label: translate("recruiter.assessments.common.difficulty.mediumShort") },
    { id: "Hard" as const, label: translate("recruiter.assessments.common.difficulty.hardShort") },
  ] as const;
}

export function getQuickPrompts(translate: TranslateFn = globalT) {
  return [
    translate("recruiter.assessments.aiStudio.quickPrompts.architecture"),
    translate("recruiter.assessments.aiStudio.quickPrompts.performance"),
    translate("recruiter.assessments.aiStudio.quickPrompts.concurrency"),
    translate("recruiter.assessments.aiStudio.quickPrompts.security"),
    translate("recruiter.assessments.aiStudio.quickPrompts.cleanCode"),
    translate("recruiter.assessments.aiStudio.quickPrompts.transactions"),
  ];
}
