import type { BankQuestion } from "../constants/excelTemplateMock";

const PREFIX = "smarthire:excel-question-draft:";

type DraftPayload = {
  questions: BankQuestion[];
  savedAt: string;
};

function draftKey(jobId: number) {
  return `${PREFIX}${jobId}`;
}

export function loadExcelQuestionDraft(jobId: number): BankQuestion[] | null {
  try {
    const raw = localStorage.getItem(draftKey(jobId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
    return parsed.questions;
  } catch {
    return null;
  }
}

export function saveExcelQuestionDraft(jobId: number, questions: BankQuestion[]) {
  const payload: DraftPayload = {
    questions,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(draftKey(jobId), JSON.stringify(payload));
}

export function clearExcelQuestionDraft(jobId: number) {
  localStorage.removeItem(draftKey(jobId));
}

export function hasExcelQuestionDraft(jobId: number): boolean {
  return loadExcelQuestionDraft(jobId) != null;
}
