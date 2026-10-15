import { z } from "zod";
import type { SavedAnswer, Submission } from "@/api/types/assessment";

const draftSchema = z.array(z.object({ questionId: z.number().int().positive(), answerText: z.string().max(10000), language: z.string().max(32).nullable().optional() })).max(100);

export function loadSubmissionDraft(key: string, submission: Submission): SavedAnswer[] {
  if (submission.status !== "IN_PROGRESS") return [];
  try {
    const rows = draftSchema.parse(JSON.parse(localStorage.getItem(key) ?? "[]"));
    const canEdit = submission.objectiveCompletedAt || !submission.questions.some(question => ["MCQ", "MULTIPLE_CHOICE"].includes(question.questionType));
    if (!canEdit) return [];
    return rows.filter(row => {
      const question = submission.questions.find(question => question.id === row.questionId);
      return question?.questionType === "ESSAY" ? !row.language : question?.questionType === "CODING" && !!row.language && Object.hasOwn(question.coding?.starterCode ?? {}, row.language);
    });
  } catch { return []; }
}

export function sameAnswer(first: SavedAnswer | undefined, second: SavedAnswer): boolean {
  return first?.questionId === second.questionId && (first.answerText ?? "") === (second.answerText ?? "") && (first.language ?? null) === (second.language ?? null);
}
