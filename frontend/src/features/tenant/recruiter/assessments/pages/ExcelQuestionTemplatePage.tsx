import {
  CodingStarterFields,
  codingAuthoringValue,
  QuestionContentFields,
  AiRubricCriteriaEditor,
  getEssayArchetypes,
} from "../components/QuestionContentFields";
import { MonacoCodeEditor } from "../components/MonacoCodeEditor";
import { CodingTestVerification } from "../components/CodingTestVerification";
import type { EssayRubric } from "@/api/types/assessment";
import { ExcelImportReview } from "../components/ExcelImportReview";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Code2,
  HelpCircle,
  ListChecks,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ux/Button";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { t as globalT, useT, type TranslateFn } from "@/i18n";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils";
import {
  blankQuestion,
  getDictionaryRows,
  getQuestionTypeOptions,
  isChoiceKind,
  isSubjectiveKind,
  typeMeta,
  type BankQuestion,
  type QuestionKind,
  type ViewId,
} from "../constants/excelTemplateMock";
import {
  hasExcelQuestionDraft,
  loadExcelQuestionDraft,
  saveExcelQuestionDraft,
} from "../utils/excelQuestionDraft";

const COL_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"] as const;
const MAX_QUESTIONS = 999;

type TypeFilter = "ALL" | "TRAC_NGHIEM_DON" | "NHIEU_DAP_AN" | "SUBJECTIVE";

type ActiveEdit = {
  rowIndex: number;
  field: string;
};

type RowDragState = {
  anchorIndex: number;
  currentIndex: number;
};

function questionIdForIndex(index: number) {
  return `Q${String(Math.min(index + 1, MAX_QUESTIONS)).padStart(3, "0")}`;
}

function withAutoQuestionIds(rows: BankQuestion[]): BankQuestion[] {
  return rows.map((row, index) => {
    const id = questionIdForIndex(index);
    return row.id === id ? row : { ...row, id };
  });
}

function difficultyClass(tone: BankQuestion["difficultyTone"]) {
  if (tone === "easy") return "bg-emerald-50 text-emerald-700";
  if (tone === "hard") return "bg-amber-50 text-amber-700";
  return "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]";
}

function toneFromDifficulty(value: string): BankQuestion["difficultyTone"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("dễ") || normalized.includes("easy")) return "easy";
  if (normalized.includes("khó") || normalized.includes("hard")) return "hard";
  return "medium";
}

function parseKind(raw: string, fallback: QuestionKind, translate: TranslateFn = globalT): QuestionKind {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const typeOptions = getQuestionTypeOptions(translate);
  const byLabel = typeOptions.find((item) => item.label.toUpperCase() === trimmed.toUpperCase());
  if (byLabel) return byLabel.value;
  const value = trimmed.toUpperCase().replace(/\s+/g, "_");
  const ascii = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const direct = typeOptions.find((item) => item.value === value || item.value === ascii);
  if (direct) return direct.value;
  if (ascii.includes("NHIEU") || ascii.includes("MULTI") || value.includes("NHIỀU")) {
    return "NHIEU_DAP_AN";
  }
  if (
    ascii.includes("LY_THUYET") ||
    ascii.includes("THEORY") ||
    ascii.includes("TINH_HUONG") ||
    ascii.includes("SYSTEM")
  ) {
    return "TINH_HUONG_SYSTEM";
  }
  if (ascii.includes("CODE") || ascii.includes("TU_LUAN_CODE")) return "TU_LUAN_CODE";
  // Bare "Tự luận" / Essay → theory (not code). Prefer longer labels via typeLabelMatchers first.
  if (ascii === "TU_LUAN" || ascii === "ESSAY" || ascii === "TU_LUAN_LY_THUYET") return "TINH_HUONG_SYSTEM";
  if (ascii.includes("TU_LUAN")) return "TINH_HUONG_SYSTEM";
  if (ascii.includes("DON") || ascii.includes("SINGLE") || ascii.includes("TRAC_NGHIEM")) {
    return "TRAC_NGHIEM_DON";
  }
  return fallback;
}

function parseClipboardMatrix(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
  return lines.map((line) => {
    if (line.includes("\t")) return line.split("\t");
    // Some apps paste columns separated by 2+ spaces instead of tabs.
    if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map((cell) => cell.trim());
    return [line];
  });
}

function parseClipboardHtmlTable(html: string): string[][] | null {
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi);
  if (!trMatches?.length) return null;
  const rows: string[][] = [];
  for (const tr of trMatches) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) =>
      (match[1] ?? "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, " ")
        .trim(),
    );
    if (cells.some((cell) => cell)) rows.push(cells);
  }
  return rows.length > 0 ? rows : null;
}

function isKnownTypeLabel(value: string, translate: TranslateFn = globalT): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const typeOptions = getQuestionTypeOptions(translate);
  if (typeOptions.some((item) => item.label.toLowerCase() === trimmed.toLowerCase())) return true;
  if (/^(tự\s*luận|tu\s*luan|essay)$/i.test(trimmed)) return true;
  const ascii = trimmed
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  if (typeOptions.some((item) => item.value === ascii)) return true;
  return /TRAC.?NGHIEM|NHIEU.?DAP|TU.?LUAN|LY.?THUYET|TINH.?HUONG|THEORY|^SINGLE$|^MULTI$|CODE|SYSTEM|^ESSAY$/i.test(ascii);
}

/** Extra aliases users type/paste (matched after longer official labels). */
const TYPE_LABEL_ALIASES = ["Tự luận lý thuyết", "Tự luận code", "Tự luận", "Tu luan", "Essay", "ESSAY"];

function typeLabelMatchers(translate: TranslateFn = globalT): string[] {
  return [...getQuestionTypeOptions(translate)]
    .flatMap((item) => [item.label, item.value, item.value.replace(/_/g, " "), item.shortLabel])
    .concat(TYPE_LABEL_ALIASES)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

/** Strip "Đáp án mẫu:" / "Sample answer:" so paste lands in the sample field cleanly. */
function stripSamplePrefix(text: string): string {
  return text.replace(/^(?:đáp\s*án\s*mẫu|sample(?:\s*answer)?)\s*:\s*/i, "").trim();
}

function peelSampleAnswer(text: string): { body: string; sample: string } {
  const match = text.match(/^(.*?)(?:đáp\s*án\s*mẫu|sample(?:\s*answer)?)\s*:\s*([\s\S]+)$/i);
  if (match && ((match[1] ?? "").trim().length > 0 || (match[2] ?? "").trim().length > 0)) {
    return { body: (match[1] ?? "").trim(), sample: (match[2] ?? "").trim() };
  }
  return { body: text.trim(), sample: "" };
}

function isSampleAnswerOnlyLine(text: string): boolean {
  return /^(?:đáp\s*án\s*mẫu|sample(?:\s*answer)?)\s*:/i.test(text.trim());
}

/**
 * Recover a wide Excel row when tabs were lost and cells were concatenated, e.g.
 * "JWT...?Nhiều đáp án2.0MediumSecurityA. HeaderB. PayloadC. SignatureD. NoneA,B,C"
 * → [content, type, score, difficulty, skill, A, B, C, D, answer, explanation]
 */
function peelTrailingAnswer(text: string): { body: string; answer: string; explanation: string } {
  // Prefer multi-select keys first: ...A,B,C + optional explanation (may be stuck without space).
  const multi = text.match(/^(.*?)([A-D](?:,[A-D])+)\s*(.*)$/i);
  if (multi && (multi[1] ?? "").trim().length > 0) {
    return {
      body: (multi[1] ?? "").trim(),
      answer: (multi[2] ?? "").toUpperCase(),
      explanation: (multi[3] ?? "").trim(),
    };
  }
  const single = text.match(/^(.*[^A-Za-zÀ-ỹ0-9])([A-D])\s*(.*)$/i);
  if (single && (single[1] ?? "").trim().length > 0) {
    return {
      body: (single[1] ?? "").trim(),
      answer: (single[2] ?? "").toUpperCase(),
      explanation: (single[3] ?? "").trim(),
    };
  }
  // Collapsed single answer after PascalCase token: ...SessionA + explanation
  const stuck = text.match(/^([A-Za-zÀ-ỹ0-9]*[a-zà-ỹ0-9])([A-D])([A-ZÀ-Ý].*|)$/);
  if (stuck) {
    return {
      body: (stuck[1] ?? "").trim(),
      answer: (stuck[2] ?? "").toUpperCase(),
      explanation: (stuck[3] ?? "").trim(),
    };
  }
  return { body: text.trim(), answer: "", explanation: "" };
}

/** HeaderPayloadSignatureSession → [Header, Payload, Signature, Session] */
function splitPascalCaseTokens(text: string): string[] {
  const compact = text.replace(/\s+/g, "").trim();
  if (!compact) return [];
  return compact.match(/[A-ZÀ-Ý][a-zà-ỹ0-9]+|[A-ZÀ-Ý]+(?![a-zà-ỹ])/g) ?? [];
}

function splitCamelCollapsedOptions(body: string): {
  skill: string;
  options: [string, string, string, string];
} | null {
  const tokens = splitPascalCaseTokens(body);
  if (tokens.length < 2 || tokens.length > 6) return null;
  // Typical: 4 options, or skill + 4 options.
  if (tokens.length <= 4) {
    return {
      skill: "",
      options: [tokens[0] ?? "", tokens[1] ?? "", tokens[2] ?? "", tokens[3] ?? ""],
    };
  }
  return {
    skill: tokens[0] ?? "",
    options: [tokens[1] ?? "", tokens[2] ?? "", tokens[3] ?? "", tokens[4] ?? ""],
  };
}

function splitLabeledOptions(text: string): {
  skill: string;
  options: [string, string, string, string];
  answer: string;
  explanation: string;
} | null {
  const matches = [...text.matchAll(/([A-D])\s*[.)]\s*/gi)].filter((match) => {
    const index = match.index ?? 0;
    if (index === 0) return true;
    const prev = text[index - 1] ?? "";
    // Allow "SecurityA." (stuck after a word) or " A." / "|A."
    return /[\s|]/.test(prev) || /[a-zà-ỹ0-9]/i.test(prev);
  });
  if (matches.length < 2) return null;

  const firstIndex = matches[0]?.index ?? 0;
  const skill = text.slice(0, firstIndex).trim().replace(/\|+$/, "").trim();
  const options: [string, string, string, string] = ["", "", "", ""];

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    if (!match || match.index == null) continue;
    const letter = (match[1] ?? "").toUpperCase();
    const slot = letter.charCodeAt(0) - 65;
    if (slot < 0 || slot > 3) continue;
    const bodyStart = match.index + match[0].length;
    const bodyEnd = i + 1 < matches.length && matches[i + 1]?.index != null ? matches[i + 1]!.index! : text.length;
    options[slot] = text.slice(bodyStart, bodyEnd).trim().replace(/\|+$/, "").trim();
  }

  let answer = "";
  let explanation = "";
  const lastSlot = options.reduce((acc, item, index) => (item.trim() ? index : acc), -1);
  if (lastSlot >= 0) {
    const peeled = peelTrailingAnswer(options[lastSlot] ?? "");
    if (peeled.answer) {
      options[lastSlot] = peeled.body;
      answer = peeled.answer;
      explanation = peeled.explanation;
    }
  }

  return { skill, options, answer, explanation };
}

function splitSkillOptionsAnswer(rest: string): {
  skill: string;
  options: [string, string, string, string];
  answer: string;
  explanation: string;
} {
  const empty: [string, string, string, string] = ["", "", "", ""];
  if (!rest.trim()) return { skill: "", options: empty, answer: "", explanation: "" };

  const labeled = splitLabeledOptions(rest);
  if (labeled) return labeled;

  // skill | optA | optB | optC | optD | answer [| explanation]
  if (rest.includes("|")) {
    const parts = rest.split("|").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 5) {
      const skill = parts[0] ?? "";
      const options: [string, string, string, string] = [
        parts[1] ?? "",
        parts[2] ?? "",
        parts[3] ?? "",
        parts[4] ?? "",
      ];
      const tail = parts.slice(5).join(" | ");
      const peeled = peelTrailingAnswer(tail || (parts[5] ?? ""));
      return {
        skill,
        options,
        answer: peeled.answer || (parts[5] ?? "").replace(/\s+/g, "").toUpperCase(),
        explanation: peeled.explanation || (peeled.answer ? "" : parts.slice(6).join(" | ")),
      };
    }
  }

  // HeaderPayloadSignatureSessionA,B,CJWT gồm...
  const peeled = peelTrailingAnswer(rest);
  if (peeled.answer && peeled.body.length >= 2) {
    const camel = splitCamelCollapsedOptions(peeled.body);
    if (camel) {
      return {
        skill: camel.skill,
        options: camel.options,
        answer: peeled.answer,
        explanation: peeled.explanation,
      };
    }
    return { skill: peeled.body, options: empty, answer: peeled.answer, explanation: peeled.explanation };
  }

  // Options-only CamelCase without answer key yet
  const camelOnly = splitCamelCollapsedOptions(rest);
  if (camelOnly && camelOnly.options.filter((item) => item.trim()).length >= 2) {
    return { skill: camelOnly.skill, options: camelOnly.options, answer: "", explanation: "" };
  }

  return { skill: rest.trim(), options: empty, answer: "", explanation: "" };
}

function expandCollapsedQuestionLine(line: string): string[] | null {
  const text = line.trim();
  if (!text || text.includes("\t")) return null;

  for (const label of typeLabelMatchers()) {
    const lower = text.toLowerCase();
    const needle = label.toLowerCase();
    let from = 0;
    while (from < text.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      if (idx === 0) {
        from = idx + Math.max(label.length, 1);
        continue;
      }
      const after = text.slice(idx + label.length);
      if (after.length > 0 && !/^\d/.test(after) && !/^\s*\d/.test(after)) {
        from = idx + 1;
        continue;
      }
      const content = text.slice(0, idx).trim();
      if (content.length < 3) {
        from = idx + 1;
        continue;
      }

      let rest = after.trim();
      let score = "";
      let difficulty = "";
      const scoreMatch = rest.match(/^(\d+(?:\.\d+)?)([\s\S]*)$/);
      if (scoreMatch) {
        score = scoreMatch[1] ?? "";
        rest = (scoreMatch[2] ?? "").trim();
      }
      const diffMatch = rest.match(/^(Easy|Medium|Hard|Cơ bản|Vận dụng|Nâng cao)([\s\S]*)$/i);
      if (diffMatch) {
        difficulty = diffMatch[1] ?? "";
        rest = (diffMatch[2] ?? "").trim();
      }

      const peeledSample = peelSampleAnswer(rest);
      rest = peeledSample.body;
      const inlineSample = peeledSample.sample;

      const kind = parseKind(label, "TRAC_NGHIEM_DON");
      if (isSubjectiveKind(kind)) {
        // Essay / theory: content | type | score | difficulty | skill | sample
        const skill = rest.trim();
        const cells = [content, label, score, difficulty, skill, inlineSample];
        while (cells.length > 5 && !(cells[cells.length - 1] ?? "").trim()) cells.pop();
        if (cells.length >= 2 && isKnownTypeLabel(cells[1] ?? "")) return cells;
        from = idx + 1;
        continue;
      }

      const { skill, options, answer, explanation } = splitSkillOptionsAnswer(rest);
      const hasOptionsOrAnswer = Boolean(answer || explanation || options.some((item) => item.trim()));
      const cells = [
        content,
        label,
        score,
        difficulty,
        skill,
        options[0],
        options[1],
        options[2],
        options[3],
        answer,
        explanation || inlineSample,
      ];
      const minKeep = hasOptionsOrAnswer ? 10 : 5;
      while (cells.length > minKeep && !(cells[cells.length - 1] ?? "").trim()) cells.pop();
      while (hasOptionsOrAnswer && cells.length < 10) cells.push("");
      if (cells.length >= 2 && isKnownTypeLabel(cells[1] ?? "")) return cells;
      from = idx + 1;
    }
  }
  return null;
}

/** Attach a following "Đáp án mẫu: …" line to the previous subjective question row. */
function mergeSampleAnswerRows(matrix: string[][]): string[][] {
  const out: string[][] = [];
  for (const row of matrix) {
    const joined = row.length === 1 ? (row[0] ?? "").trim() : "";
    if (isSampleAnswerOnlyLine(joined) && out.length > 0) {
      const prev = [...(out[out.length - 1] ?? [])];
      const prevKind = parseKind(prev[1] ?? "", "TINH_HUONG_SYSTEM");
      if (isSubjectiveKind(prevKind) || (prev.length >= 2 && isKnownTypeLabel(prev[1] ?? ""))) {
        while (prev.length < 6) prev.push("");
        prev[5] = stripSamplePrefix(joined);
        out[out.length - 1] = prev;
        continue;
      }
    }
    out.push(row);
  }
  return out;
}

function isPasteHeaderRow(cells: string[]): boolean {
  const first = (cells[0] ?? "").trim().toLowerCase();
  const second = (cells[1] ?? "").trim().toLowerCase();
  return first === "content" || first === "content *" || (first.startsWith("content") && second.includes("type"));
}

function isScoreLike(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

/** User/Excel wide row: content, type, score, difficulty, skill, option_a..d, answer, explanation */
function isMetaFirstChoiceLayout(cells: string[]): boolean {
  return cells.length >= 10 && isScoreLike(cells[2] ?? "");
}

/** Pad recovered / partial meta rows so options + answer map correctly. */
function toMetaChoiceCells(cells: string[]): string[] {
  if (isMetaFirstChoiceLayout(cells)) return cells;
  if (!(cells.length >= 5 && isScoreLike(cells[2] ?? "") && isKnownTypeLabel(cells[1] ?? ""))) return cells;
  const next = [...cells];
  while (next.length < 10) next.push("");
  return next;
}

function stripPasteHeader(matrix: string[][]): string[][] {
  const rows = matrix.filter((row) => row.some((cell) => cell.trim()));
  if (rows.length > 0 && isPasteHeaderRow(rows[0] ?? [])) return rows.slice(1);
  return rows;
}

/**
 * When a horizontal Excel row loses tabs, each cell becomes its own line.
 * Detect that pattern and fold back into one row.
 */
function coercePasteMatrix(matrix: string[][]): string[][] {
  const rows = stripPasteHeader(matrix);
  if (rows.length < 3 || rows.length > 12) return rows;
  if (!rows.every((row) => row.length <= 1)) return rows;

  const values = rows.map((row) => (row[0] ?? "").trim());
  const second = values[1] ?? "";
  const third = values[2] ?? "";
  const looksLikeOneQuestion =
    isKnownTypeLabel(second) || (isScoreLike(third) && (values[0] ?? "").length >= 8);
  return looksLikeOneQuestion ? [values] : rows;
}

function expandMatrixCollapsedRows(matrix: string[][]): string[][] {
  return matrix.map((row) => {
    if (row.length !== 1) return row;
    const expanded = expandCollapsedQuestionLine(row[0] ?? "");
    return expanded && expanded.length >= 2 ? expanded : row;
  });
}

function resolveClipboardMatrix(event: ClipboardEvent<HTMLElement>): string[][] {
  const plain = event.clipboardData.getData("text/plain");
  const html = event.clipboardData.getData("text/html");
  let matrix = parseClipboardMatrix(plain || "");
  const plainMaxCols = Math.max(0, ...matrix.map((row) => row.length));
  const plainLooksVertical =
    stripPasteHeader(matrix).length > 1 && stripPasteHeader(matrix).every((row) => row.length <= 1);

  if (html) {
    const fromHtml = parseClipboardHtmlTable(html);
    if (fromHtml?.some((row) => row.length > 1)) {
      const htmlMaxCols = Math.max(0, ...fromHtml.map((row) => row.length));
      // Prefer HTML table when plain lost tabs (1 column) or HTML is wider.
      if (htmlMaxCols > plainMaxCols || (plainLooksVertical && htmlMaxCols > 1)) {
        matrix = fromHtml;
      }
    }
  }

  return mergeSampleAnswerRows(expandMatrixCollapsedRows(coercePasteMatrix(matrix)));
}

function looksLikeFullQuestionRow(cells: string[]): boolean {
  if (cells.length < 2) return false;
  if (cells.length >= 5) {
    if (isMetaFirstChoiceLayout(cells)) return true;
    return isKnownTypeLabel(cells[1] ?? "");
  }
  // content + type (+ optional score...) recovered from a collapsed paste
  return isKnownTypeLabel(cells[1] ?? "") && (cells[0] ?? "").trim().length >= 3;
}

/** One Excel row (tabs) or a column that was meant to be one horizontal option row. */
function choiceSequenceFromMatrix(matrix: string[][]): string[] | null {
  if (matrix.length === 0) return null;
  if (matrix.length === 1 && (matrix[0]?.length ?? 0) > 1) {
    return (matrix[0] ?? []).map((cell) => cell.trim());
  }
  if (matrix.length > 1 && matrix.every((row) => row.length <= 1)) {
    return matrix.map((row) => (row[0] ?? "").trim());
  }
  return null;
}

function choiceDistributeFields(kind: QuestionKind): Array<"optionA" | "optionB" | "optionC" | "optionD" | "answer" | "explanation" | "policyNote"> {
  return [
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "answer",
    kind === "NHIEU_DAP_AN" ? "policyNote" : "explanation",
  ];
}

function applyChoiceCellsToRow(
  row: BankQuestion,
  cells: string[],
  fallbackKind: QuestionKind,
): BankQuestion {
  const kind = parseKind(cells[1] ?? "", isChoiceKind(fallbackKind) ? fallbackKind : "TRAC_NGHIEM_DON");
  const base: BankQuestion = {
    ...row,
    ...blankQuestion(kind),
    id: row.id,
    kind,
    content: cells[0] ?? row.content,
    policy: kind === "NHIEU_DAP_AN" ? row.policy || "Partial Credit" : "",
  };

  if (isMetaFirstChoiceLayout(cells)) {
    const explanation = cells[10] ?? "";
    return {
      ...base,
      score: cells[2] || row.score || blankQuestion(kind).score,
      difficulty: cells[3] ?? row.difficulty,
      difficultyTone: toneFromDifficulty(cells[3] ?? row.difficulty),
      skill: cells[4] ?? row.skill,
      optionA: cells[5] ?? row.optionA,
      optionB: cells[6] ?? row.optionB,
      optionC: cells[7] ?? row.optionC,
      optionD: cells[8] ?? row.optionD,
      answer: cells[9] ?? row.answer,
      explanation: kind === "TRAC_NGHIEM_DON" ? explanation || row.explanation : row.explanation,
      policyNote: kind === "NHIEU_DAP_AN" ? explanation || row.policyNote : row.policyNote,
    };
  }

  return {
    ...base,
    optionA: cells[2] ?? row.optionA,
    optionB: cells[3] ?? row.optionB,
    optionC: cells[4] ?? row.optionC,
    optionD: cells[5] ?? row.optionD,
    answer: cells[6] ?? row.answer,
    score: cells[7] || row.score || "1.0",
    difficulty: cells[8] ?? row.difficulty,
    difficultyTone: toneFromDifficulty(cells[8] ?? row.difficulty),
    skill: cells[9] ?? row.skill,
    explanation: kind === "TRAC_NGHIEM_DON" ? cells[10] ?? row.explanation : row.explanation,
    policyNote: kind === "NHIEU_DAP_AN" ? cells[10] ?? row.policyNote : row.policyNote,
  };
}

const CHOICE_FORM_FIELDS = ["optionA", "optionB", "optionC", "optionD", "answer", "detail"] as const;
type ChoiceFormField = (typeof CHOICE_FORM_FIELDS)[number];

const MAX_UNDO = 40;

function cloneQuestions(rows: BankQuestion[]): BankQuestion[] {
  return rows.map((row) => ({
    ...row,
    rubric: row.rubric.map((item) => ({ ...item })),
  }));
}

function makeBlankRows(count: number, startFrom: number, kind: QuestionKind, translate: TranslateFn = globalT): BankQuestion[] {
  return Array.from({ length: count }, (_, offset) => {
    const row = blankQuestion(kind, translate);
    row.id = questionIdForIndex(startFrom + offset);
    return row;
  });
}

function AnswerBadge({ value }: { value: string }) {
  if (!value) return <span className="italic text-[var(--color-outline)]">--</span>;
  if (value.includes(",")) {
    return (
      <span className="inline-flex rounded bg-emerald-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
        {value}
      </span>
    );
  }
  return (
    <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
      {value}
    </span>
  );
}

function typeBadgeClass(kind: QuestionKind) {
  if (kind === "TRAC_NGHIEM_DON") return "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]";
  if (kind === "NHIEU_DAP_AN") return "bg-[#c9e6ff] text-[#004c6e]";
  if (kind === "TU_LUAN_CODE") return "bg-[var(--color-secondary-container)] text-[var(--color-on-surface)]";
  return "bg-amber-50 text-amber-800";
}

function detailPreview(row: BankQuestion, translate: TranslateFn = globalT) {
  if (isChoiceKind(row.kind)) {
    return row.answer
      ? translate("recruiter.assessments.excel.detailPreviewAnswer", { answer: row.answer })
      : translate("recruiter.assessments.excel.detailPreviewNoAnswer");
  }
  const trimmed = row.sample.trim();
  if (trimmed) {
    const sample = `${trimmed.slice(0, 80)}${trimmed.length > 80 ? "…" : ""}`;
    return translate("recruiter.assessments.excel.detailPreviewSample", { sample });
  }
  if (row.kind === "TU_LUAN_CODE") {
    return row.snippet
      ? translate("recruiter.assessments.excel.detailPreviewCodeOptional", { line: row.snippet.split("\n")[0] })
      : translate("recruiter.assessments.excel.detailPreviewMissingSample");
  }
  return row.snippet
    ? translate("recruiter.assessments.excel.detailPreviewTheoryOptional")
    : translate("recruiter.assessments.excel.detailPreviewMissingSample");
}

function Cell({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <td className={cn("max-w-0 truncate px-1.5 py-1.5 align-middle", className)} title={title}>
      {children}
    </td>
  );
}

function EditCell({
  selected,
  value,
  onSelect,
  onChange,
  onPaste,
  children,
  className,
  title,
}: {
  selected: boolean;
  value: string;
  onSelect: () => void;
  onChange: (value: string) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  const t = useT();
  return (
    <td
      className={cn(
        "max-w-0 cursor-text px-1.5 py-1.5 align-middle",
        !selected && "truncate",
        selected && "bg-white ring-2 ring-inset ring-[var(--color-primary)]",
        className,
      )}
      title={selected ? t("recruiter.assessments.excel.cellEditTitle") : title}
      onClick={onSelect}
    >
      {selected ? (
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          className="w-full bg-transparent text-[11px] text-[var(--color-on-surface)] outline-none"
          aria-label={t("recruiter.assessments.excel.cellEditInputAria")}
        />
      ) : (
        children
      )}
    </td>
  );
}

function HeaderCell({
  label,
  highlight,
  className,
}: {
  label: string;
  highlight?: "primary" | "answer";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "truncate px-1.5 text-left font-semibold",
        highlight === "primary" && "bg-[#dbe1ff] text-[var(--color-primary)]",
        highlight === "answer" && "bg-[#c9e6ff] text-[#004c6e]",
        className,
      )}
      title={label}
    >
      {label}
    </th>
  );
}

function TypeSelect({
  value,
  onChange,
}: {
  value: QuestionKind;
  onChange: (kind: QuestionKind) => void;
}) {
  const t = useT();
  const options = getQuestionTypeOptions(t);
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as QuestionKind)}
      className={cn(
        "w-full max-w-full cursor-pointer rounded-full border-0 px-1.5 py-0.5 text-[10px] font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
        typeBadgeClass(value),
      )}
      aria-label={t("recruiter.assessments.excel.selectKindAria")}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ExcelQuestionTemplatePage() {
  const job = useRecruitmentJob();
  return <ExcelQuestionEditor job={job} />;
}

type GeneralBankEditor = {
  initialQuestions: BankQuestion[] | null;
  onSaveDraft: (questions: BankQuestion[]) => void;
  onSave: (questions: BankQuestion[]) => Promise<void>;
  busy: boolean;
  error: unknown;
};

export function ExcelQuestionEditor({ job, generalBank }: {
  job?: { id: number; title: string; skills?: Array<{ name: string }> };
  generalBank?: GeneralBankEditor;
}) {
  const t = useT();
  const dictionaryRows = useMemo(() => getDictionaryRows(t), [t]);
  const jobId = job?.id ?? 0;
  const basePath = generalBank ? "/recruiter" : `/recruiter/jobs/${jobId}/assessments`;
  const bankPath = generalBank ? "/recruiter/question-bank" : `${basePath}/question-bank`;
  const [validation, setValidation] = useState<string[]>([]);
  const validationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (validation.length) validationRef.current?.focus();
  }, [validation]);
  const [reviewingImport, setReviewingImport] = useState(false);
  const [view, setView] = useState<ViewId>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(() => {
    const draft = generalBank ? generalBank.initialQuestions : loadExcelQuestionDraft(jobId);
    return draft?.[0] && isSubjectiveKind(draft[0].kind) ? "SUBJECTIVE" : "ALL";
  });
  const [questions, setQuestions] = useState<BankQuestion[]>(() => {
    const draft = generalBank ? generalBank.initialQuestions : loadExcelQuestionDraft(jobId);
    if (draft?.length) return withAutoQuestionIds(draft);
    const row = blankQuestion("TRAC_NGHIEM_DON", t);
    row.id = questionIdForIndex(0);
    return [row];
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>({ rowIndex: 0, field: "content" });
  const [activeCell, setActiveCell] = useState("A2");
  const [savedNote, setSavedNote] = useState(() =>
    (generalBank ? generalBank.initialQuestions?.length : hasExcelQuestionDraft(jobId)) ? t("recruiter.assessments.excel.draftRestoredNote") : "",
  );
  const [rowDrag, setRowDrag] = useState<RowDragState | null>(null);
  const [capacityNote, setCapacityNote] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const undoStackRef = useRef<BankQuestion[][]>([]);
  const editSessionRef = useRef<string | null>(null);

  function pushUndo(rows: BankQuestion[]) {
    undoStackRef.current.push(cloneQuestions(rows));
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
  }

  function undoQuestions() {
    const previous = undoStackRef.current.pop();
    if (!previous) {
      setCapacityNote(t("recruiter.assessments.excel.noUndoNote"));
      toast.info(t("recruiter.assessments.excel.noUndoNote"));
      return;
    }
    editSessionRef.current = null;
    setQuestions(previous);
    setSavedNote("");
    setCapacityNote(t("recruiter.assessments.excel.undoneNote"));
    toast.info(t("recruiter.assessments.excel.undoneToast"));
  }

  const counts = useMemo(
    () => ({
      all: questions.length,
      single: questions.filter((q) => q.kind === "TRAC_NGHIEM_DON").length,
      multi: questions.filter((q) => q.kind === "NHIEU_DAP_AN").length,
      subjective: questions.filter((q) => isSubjectiveKind(q.kind)).length,
    }),
    [questions],
  );

  const visibleIndexes = useMemo(
    () =>
      questions
        .map((question, index) => ({ question, index }))
        .filter(({ question }) => {
          if (typeFilter === "ALL") return true;
          if (typeFilter === "SUBJECTIVE") return isSubjectiveKind(question.kind);
          return question.kind === typeFilter;
        })
        .map(({ index }) => index),
    [questions, typeFilter],
  );

  const selectedQuestion = questions[selectedIndex] ?? questions[0];

  const defaultKindForFilter = (): QuestionKind => {
    if (typeFilter === "NHIEU_DAP_AN") return "NHIEU_DAP_AN";
    if (typeFilter === "SUBJECTIVE") return "TU_LUAN_CODE";
    if (typeFilter === "TRAC_NGHIEM_DON") return "TRAC_NGHIEM_DON";
    return selectedQuestion?.kind ?? "TRAC_NGHIEM_DON";
  };

  const dragRange = useMemo(() => {
    if (!rowDrag) return null;
    return {
      from: Math.min(rowDrag.anchorIndex, rowDrag.currentIndex),
      to: Math.min(Math.max(rowDrag.anchorIndex, rowDrag.currentIndex), MAX_QUESTIONS - 1),
    };
  }, [rowDrag]);

  const tableIndexes = useMemo(() => {
    if (typeFilter !== "ALL") return visibleIndexes;
    const trailingGhost = questions.length < MAX_QUESTIONS ? questions.length : questions.length - 1;
    const last = Math.min(
      MAX_QUESTIONS - 1,
      Math.max(questions.length - 1, trailingGhost, dragRange?.to ?? -1, 0),
    );
    return Array.from({ length: last + 1 }, (_, index) => index);
  }, [typeFilter, visibleIndexes, questions.length, dragRange]);

  useEffect(() => {
    if (!rowDrag) return;

    function onMove(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest?.("[data-row-index]");
      if (!target) return;
      const nextIndex = Number((target as HTMLElement).dataset.rowIndex);
      if (Number.isNaN(nextIndex)) return;
      setRowDrag((prev) => (prev ? { ...prev, currentIndex: Math.min(nextIndex, MAX_QUESTIONS - 1) } : prev));
    }

        function onUp() {
          setRowDrag((prev) => {
            if (!prev) return null;
            const needed = Math.min(Math.max(prev.anchorIndex, prev.currentIndex) + 1, MAX_QUESTIONS);
            const selectedEnd = Math.min(Math.max(prev.anchorIndex, prev.currentIndex), MAX_QUESTIONS - 1);
            setQuestions((rows) => {
              if (rows.length >= needed) {
                setCapacityNote(t("recruiter.assessments.excel.dragSelectedRowsNote", { count: Math.abs(prev.currentIndex - prev.anchorIndex) + 1 }));
                return withAutoQuestionIds(rows);
              }
              pushUndo(rows);
              editSessionRef.current = null;
              const kind =
                typeFilter === "NHIEU_DAP_AN"
                  ? "NHIEU_DAP_AN"
                  : typeFilter === "SUBJECTIVE"
                    ? "TU_LUAN_CODE"
                    : "TRAC_NGHIEM_DON";
              const added = needed - rows.length;
              const grown = withAutoQuestionIds([...rows, ...makeBlankRows(added, rows.length, kind, t)]);
              setCapacityNote(
                needed >= MAX_QUESTIONS
                  ? t("recruiter.assessments.excel.maxQuestionsNote", { max: MAX_QUESTIONS })
                  : t("recruiter.assessments.excel.dragAddedRowsNote", { count: added }),
              );
              return grown;
            });
            setSelectedIndex(selectedEnd);
            setActiveEdit({ rowIndex: selectedEnd, field: "content" });
            setActiveCell(`A${selectedEnd + 2}`);
            return null;
          });
        }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [rowDrag, typeFilter]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      if (isUndo && undoStackRef.current.length > 0) {
        event.preventDefault();
        undoQuestions();
        return;
      }
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (!target || (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable)) {
          event.preventDefault();
          setShowHelpModal((prev) => !prev);
          return;
        }
      }
      handleCopyActiveCell(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeEdit, questions]);

  const formula = useMemo(() => {
    if (!activeEdit || !questions[activeEdit.rowIndex]) return "";
    const row = questions[activeEdit.rowIndex];
    if (activeEdit.field === "rubric") return row.rubric.map((item) => item.text).join(" | ");
    const value = row[activeEdit.field as keyof BankQuestion];
    return typeof value === "string" ? value : "";
  }, [activeEdit, questions]);

  function selectCell(rowIndex: number, field: string, colLetter: string, displayRow: number) {
    editSessionRef.current = null;
    setSelectedIndex(rowIndex);
    setActiveEdit({ rowIndex, field });
    setActiveCell(`${colLetter}${displayRow}`);
    setSavedNote("");
    setCapacityNote("");
  }

  function patchQuestion(rowIndex: number, patch: Partial<BankQuestion>) {
    const { id: _ignoredId, ...safePatch } = patch;
    void _ignoredId;
    const fields = Object.keys(safePatch);
    const sessionKey = fields.length === 1 ? `${rowIndex}:${fields[0]}` : null;
    setQuestions((rows) => {
      if (!sessionKey || editSessionRef.current !== sessionKey) {
        pushUndo(rows);
        editSessionRef.current = sessionKey;
      }
      return withAutoQuestionIds(rows.map((row, index) => {
        if (index !== rowIndex) return row;
        const next = { ...row, ...safePatch };
        if (next.kind === "TU_LUAN_CODE") {
          next.codingJsonText = codingAuthoringValue(next.codingJsonText, next.language, next.snippet);
          try {
            const coding = JSON.parse(next.codingJsonText) as { starterCode?: Record<string, string> };
            const first = Object.entries(coding.starterCode ?? {})[0];
            next.language = first?.[0] ?? "";
            next.snippet = first?.[1] ?? "";
          } catch { /* Keep malformed metadata for validation to report. */ }
        }
        if (next.kind === "TINH_HUONG_SYSTEM" && next.rubricJsonText && "sample" in safePatch) {
          try {
            const rubric = JSON.parse(next.rubricJsonText) as EssayRubric;
            next.rubricJsonText = JSON.stringify({ ...rubric, referenceAnswer: next.sample });
          } catch { /* Keep malformed metadata for validation to report. */ }
        }
        return next;
      }));
    });
    setSavedNote("");
  }

  function applyRowFromCells(row: BankQuestion, cells: string[], mode: TypeFilter): BankQuestion {
    const fallbackKind = row.kind || defaultKindForFilter();
    if (cells.length === 1) {
      return { ...row, content: cells[0] ?? row.content };
    }

    if (mode === "SUBJECTIVE") {
      const kind = parseKind(cells[1] ?? "", isSubjectiveKind(fallbackKind) ? fallbackKind : "TU_LUAN_CODE", t);
      const rubricText = cells[3] ?? "";
      const levels = ["excellent", "pass", "fail"] as const;
      const rubric = rubricText
        ? rubricText.split("|").map((text, index) => ({
            level: levels[Math.min(index, levels.length - 1)],
            text: text.trim(),
          }))
        : row.rubric;
      return {
        ...row,
        ...blankQuestion(kind, t),
        id: row.id,
        kind,
        content: cells[0] ?? row.content,
        snippet: cells[2] ?? row.snippet,
        rubric,
        score: cells[4] || row.score || "10.0",
        timeLimit: cells[5] ?? row.timeLimit,
        skill: cells[6] ?? row.skill,
      };
    }

    // Wide Excel row: content | type | score | difficulty | skill | options | answer | giải thích
    if (isMetaFirstChoiceLayout(cells) || isMetaFirstChoiceLayout(toMetaChoiceCells(cells))) {
      return applyChoiceCellsToRow(row, toMetaChoiceCells(cells), fallbackKind);
    }

    if (mode === "ALL") {
      const kind = parseKind(cells[1] ?? "", fallbackKind, t);
      if (isSubjectiveKind(kind)) {
        return {
          ...row,
          ...blankQuestion(kind, t),
          id: row.id,
          kind,
          content: cells[0] ?? row.content,
          score: cells[2] || row.score || blankQuestion(kind).score,
          difficulty: cells[3] ?? row.difficulty,
          difficultyTone: toneFromDifficulty(cells[3] ?? row.difficulty),
          skill: cells[4] ?? row.skill,
          sample: stripSamplePrefix(cells[5] ?? "") || row.sample,
          snippet: cells[6] ?? row.snippet,
        };
      }
      const metaCells = toMetaChoiceCells(cells);
      if (isChoiceKind(kind) && (cells.length >= 10 || isMetaFirstChoiceLayout(metaCells))) {
        return applyChoiceCellsToRow(row, metaCells, kind);
      }
      // Partial meta with at least one option/answer recovered
      if (
        isChoiceKind(kind) &&
        metaCells.length >= 10 &&
        isScoreLike(metaCells[2] ?? "") &&
        (metaCells[5] || metaCells[6] || metaCells[7] || metaCells[8] || metaCells[9])
      ) {
        return applyChoiceCellsToRow(row, metaCells, kind);
      }
      return {
        ...row,
        ...blankQuestion(kind),
        id: row.id,
        kind,
        content: cells[0] ?? row.content,
        score: cells[2] || row.score || blankQuestion(kind).score,
        difficulty: cells[3] ?? row.difficulty,
        difficultyTone: toneFromDifficulty(cells[3] ?? row.difficulty),
        skill: cells[4] ?? row.skill,
        explanation: isChoiceKind(kind) ? cells[5] ?? row.explanation : row.explanation,
        snippet: isSubjectiveKind(kind) ? cells[5] ?? row.snippet : row.snippet,
      };
    }

    return applyChoiceCellsToRow(row, cells, fallbackKind);
  }

  function ingestClipboardMatrix(matrix: string[][]) {
    const usable = stripPasteHeader(matrix);
    if (usable.length === 0) return 0;

    const start = selectedIndex >= 0 ? selectedIndex : questions.length;
    const needed = start + usable.length;
    const cappedNeeded = Math.min(needed, MAX_QUESTIONS);
    const rowsToApply = usable.slice(0, Math.max(0, cappedNeeded - start));
    const kind = defaultKindForFilter();

    setQuestions((rows) => {
      pushUndo(rows);
      editSessionRef.current = null;
      const next =
        rows.length < cappedNeeded ? [...rows, ...makeBlankRows(cappedNeeded - rows.length, rows.length, kind, t)] : [...rows];
      rowsToApply.forEach((cells, offset) => {
        const index = start + offset;
        if (index >= MAX_QUESTIONS) return;
        next[index] = applyRowFromCells(next[index] ?? blankQuestion(kind, t), cells, typeFilter);
      });
      return withAutoQuestionIds(next);
    });

    setSelectedIndex(Math.min(start + rowsToApply.length - 1, MAX_QUESTIONS - 1));
    setActiveEdit({ rowIndex: start, field: "content" });
    setActiveCell(`A${start + 2}`);
    setCapacityNote(
      needed > MAX_QUESTIONS
        ? t("recruiter.assessments.excel.pastedTruncatedNote", { count: rowsToApply.length, max: MAX_QUESTIONS })
        : t("recruiter.assessments.excel.pastedRowsNote", { count: rowsToApply.length }),
    );
    setTypeFilter("ALL");
    setView("all");
    return rowsToApply.length;
  }

  function applyChoiceSequenceToRow(
    rowIndex: number,
    startField: "optionA" | "optionB" | "optionC" | "optionD" | "answer" | "explanation" | "policyNote" | "detail",
    values: string[],
  ) {
    const row = questions[rowIndex];
    if (!row || !isChoiceKind(row.kind)) return;
    const fields = choiceDistributeFields(row.kind);
    const normalizedStart =
      startField === "detail" ? (row.kind === "NHIEU_DAP_AN" ? "policyNote" : "explanation") : startField;
    const startAt = fields.indexOf(normalizedStart);
    if (startAt < 0) return;

    const patch: Partial<BankQuestion> = {};
    values.forEach((raw, offset) => {
      const field = fields[startAt + offset];
      if (!field) return;
      const value = raw.trim();
      if (field === "explanation") {
        patch.explanation = value;
        if (value) patch.warning = undefined;
        return;
      }
      patch[field] = value;
    });
    patchQuestion(rowIndex, patch);
  }

  function handleChoiceFormPaste(startField: ChoiceFormField, event: ClipboardEvent<HTMLInputElement>) {
    if (selectedIndex < 0 || !selectedQuestion || !isChoiceKind(selectedQuestion.kind)) return;
    if (!event.clipboardData.getData("text/plain") && !event.clipboardData.getData("text/html")) return;

    const matrix = resolveClipboardMatrix(event);
    const usable = stripPasteHeader(matrix);
    const fullRows = usable.filter((row) => looksLikeFullQuestionRow(row));
    if (fullRows.length > 0 || (usable.length > 1 && usable.some((row) => row.length >= 5))) {
      event.preventDefault();
      ingestClipboardMatrix(matrix);
      return;
    }

    const values = choiceSequenceFromMatrix(usable);
    if (values && values.length > 1) {
      event.preventDefault();
      applyChoiceSequenceToRow(selectedIndex, startField, values);
      setCapacityNote(t("recruiter.assessments.excel.pastedHorizontalNote", { count: values.length }));
      return;
    }

    // Single-value paste into the focused choice field only (do not scatter into other columns).
    const plain = (values?.[0] ?? usable[0]?.[0] ?? event.clipboardData.getData("text/plain")).trimEnd();
    if (!plain) return;
    event.preventDefault();
    applyChoiceSequenceToRow(selectedIndex, startField, [plain]);
    setCapacityNote(t("recruiter.assessments.excel.pastedActiveCellNote"));
  }

  function handleTablePaste(event: ClipboardEvent<HTMLElement>) {
    if (!event.clipboardData.getData("text/plain") && !event.clipboardData.getData("text/html")) return;
    const matrix = resolveClipboardMatrix(event);
    const usable = stripPasteHeader(matrix);
    if (usable.length === 0) return;

    // Pasting "Đáp án mẫu: …" onto an essay row → sample field only.
    const plainTrim = event.clipboardData.getData("text/plain").trim();
    if (
      isSampleAnswerOnlyLine(plainTrim) &&
      selectedIndex >= 0 &&
      selectedQuestion &&
      isSubjectiveKind(selectedQuestion.kind) &&
      usable.length === 1 &&
      (usable[0]?.length ?? 0) <= 1 &&
      !looksLikeFullQuestionRow(usable[0] ?? [])
    ) {
      event.preventDefault();
      patchQuestion(selectedIndex, { sample: stripSamplePrefix(plainTrim) });
      setCapacityNote(t("recruiter.assessments.excel.pastedSampleNote"));
      return;
    }

    const optionStartFields = ["optionA", "optionB", "optionC", "optionD", "answer", "explanation", "policyNote"] as const;
    const startField = activeEdit?.field;
    const sequence = choiceSequenceFromMatrix(usable);
    const hasFullQuestionRows = usable.some((row) => looksLikeFullQuestionRow(row));
    const canDistributeOptions =
      selectedIndex >= 0 &&
      startField &&
      optionStartFields.includes(startField as (typeof optionStartFields)[number]) &&
      sequence &&
      sequence.length > 1 &&
      !looksLikeFullQuestionRow(sequence) &&
      !hasFullQuestionRows;

    if (canDistributeOptions && sequence && startField) {
      event.preventDefault();
      applyChoiceSequenceToRow(
        selectedIndex,
        startField as "optionA" | "optionB" | "optionC" | "optionD" | "answer" | "explanation" | "policyNote",
        sequence,
      );
      setCapacityNote(t("recruiter.assessments.excel.pastedHorizontalFromActiveNote", { count: sequence.length }));
      return;
    }

    // Excel-style multi-row / wide-row paste → create or fill questions.
    if (hasFullQuestionRows || usable.length > 1 || (usable[0]?.length ?? 0) > 1) {
      // Multi-line plain text into a long-text cell stays in that cell (not new questions).
      const textFields = new Set(["content", "explanation", "policyNote", "snippet", "sample", "rubric"]);
      const looksLikePlainParagraph =
        Boolean(activeEdit && textFields.has(activeEdit.field)) &&
        !hasFullQuestionRows &&
        usable.every((row) => row.length <= 1) &&
        !usable.some((row) => isKnownTypeLabel(row[0] ?? ""));
      if (looksLikePlainParagraph && activeEdit) {
        event.preventDefault();
        const pasted = usable.map((row) => row[0] ?? "").join("\n");
        applyEdit(activeEdit.field === "sample" ? stripSamplePrefix(pasted) : pasted);
        setCapacityNote(t("recruiter.assessments.excel.pastedActiveCellNote"));
        return;
      }

      // Wide clipboard with multiple columns: only fill the whole question when pasting
      // from content (or no cell) — never hijack an option/answer cell into a full-row ingest.
      const editingOptionCell =
        startField && optionStartFields.includes(startField as (typeof optionStartFields)[number]);
      if (editingOptionCell && !hasFullQuestionRows) {
        event.preventDefault();
        applyEdit((usable[0] ?? []).join("\t"));
        setCapacityNote(t("recruiter.assessments.excel.pastedActiveCellNote"));
        return;
      }

      event.preventDefault();
      ingestClipboardMatrix(matrix);
      return;
    }

    // Single-cell paste → only the active cell / formula bar field.
    if (!activeEdit) return;
    const value = usable[0]?.[0] ?? "";
    event.preventDefault();
    applyEdit(activeEdit.field === "sample" ? stripSamplePrefix(value) : value);
    setCapacityNote(t("recruiter.assessments.excel.pastedActiveCellNote"));
  }

  function handleCopyActiveCell(event: KeyboardEvent) {
    const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
    if (!isCopy || !activeEdit || !questions[activeEdit.rowIndex]) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      const input = target as HTMLInputElement | HTMLTextAreaElement;
      if (typeof input.selectionStart === "number" && input.selectionStart !== input.selectionEnd) return;
    }
    const row = questions[activeEdit.rowIndex];
    const raw =
      activeEdit.field === "rubric"
        ? row.rubric.map((item) => item.text).join(" | ")
        : row[activeEdit.field as keyof BankQuestion];
    const text = typeof raw === "string" ? raw : "";
    if (!text) return;
    event.preventDefault();
    void navigator.clipboard.writeText(text).then(() => {
      setCapacityNote(t("recruiter.assessments.excel.copiedCellNote"));
      toast.success(t("recruiter.assessments.common.actions.copiedToClipboard"));
    });
  }

  function applyEdit(value: string) {
    if (!activeEdit) return;
    const { rowIndex, field } = activeEdit;
    if (field === "difficulty") {
      patchQuestion(rowIndex, { difficulty: value, difficultyTone: toneFromDifficulty(value) });
      return;
    }
    if (field === "explanation") {
      const row = questions[rowIndex];
      patchQuestion(rowIndex, {
        explanation: value,
        warning: value.trim() ? undefined : row?.warning,
      });
      return;
    }
    if (field === "rubric") {
      const levels = ["excellent", "pass", "fail"] as const;
      const parts = value.split("|").map((part) => part.trim()).filter(Boolean);
      patchQuestion(rowIndex, {
        rubric: parts.map((text, index) => ({
          level: levels[Math.min(index, levels.length - 1)],
          text,
        })),
      });
      return;
    }
    patchQuestion(rowIndex, { [field]: value } as Partial<BankQuestion>);
  }

  function changeKind(rowIndex: number, kind: QuestionKind) {
    const current = questions[rowIndex];
    if (!current || current.kind === kind) return;
    const defaults = blankQuestion(kind, t);
    patchQuestion(rowIndex, {
      kind,
      score: current.score || defaults.score,
      policy: kind === "NHIEU_DAP_AN" ? current.policy || "Partial Credit" : "",
      language: isSubjectiveKind(kind) ? current.language || defaults.language : "",
      snippet: isSubjectiveKind(kind) ? current.snippet || defaults.snippet : current.snippet,
      timeLimit: isSubjectiveKind(kind) ? current.timeLimit || defaults.timeLimit : "",
      rubric: current.rubric.some((item) => item.text.replace(/\[.*?\]:\s*/, "").trim())
        ? current.rubric
        : defaults.rubric,
    });
    setSelectedIndex(rowIndex);
    setActiveEdit({ rowIndex, field: "content" });
    setActiveCell(`A${rowIndex + 2}`);
    if (isSubjectiveKind(kind)) setTypeFilter("SUBJECTIVE");
    else if (typeFilter !== "ALL") setTypeFilter(kind);
  }

  function addQuestion(kind: QuestionKind = "TRAC_NGHIEM_DON") {
    if (questions.length >= MAX_QUESTIONS) {
      setCapacityNote(t("recruiter.assessments.excel.maxQuestionsNote", { max: MAX_QUESTIONS }));
      return;
    }
    const next = blankQuestion(kind, t);
    if (kind === "TU_LUAN_CODE") next.codingJsonText = codingAuthoringValue(undefined, next.language, next.snippet);
    if (kind === "TINH_HUONG_SYSTEM") {
      next.rubricJsonText = JSON.stringify(
        {
          category: "ESSAY_CONCEPTUAL",
          referenceAnswer: "",
          criteria: getEssayArchetypes(t).ESSAY_CONCEPTUAL.criteria.map((c) => ({ ...c })),
        },
        null,
        2
      );
    }
    next.id = questionIdForIndex(questions.length);
    setQuestions((rows) => {
      pushUndo(rows);
      editSessionRef.current = null;
      return withAutoQuestionIds([...rows, next]);
    });
    const index = questions.length;
    setSelectedIndex(index);
    setActiveEdit({ rowIndex: index, field: "content" });
    setActiveCell(`A${index + 2}`);
    setTypeFilter(isSubjectiveKind(kind) ? "SUBJECTIVE" : kind);
    setView("all");
    setCapacityNote("");
  }

  function isSelected(rowIndex: number, field: string) {
    return activeEdit?.rowIndex === rowIndex && activeEdit.field === field;
  }

  function handleValidate() {
    setActiveEdit(null);
    if (generalBank) {
      setReviewingImport(true);
      return;
    }
    setReviewingImport(true);
  }

  function handleSaveDraft() {
    try {
      if (generalBank) generalBank.onSaveDraft(questions);
      else saveExcelQuestionDraft(jobId, questions);
      setSavedNote(t("recruiter.assessments.excel.draftSavedNote"));
      toast.success(t("recruiter.assessments.excel.draftSavedToast"));
    } catch {
      setValidation([t("recruiter.assessments.excel.draftSaveErrorNote")]);
      toast.error(t("recruiter.assessments.excel.draftSaveErrorToast"));
    }
    setCapacityNote("");
  }


  const filterTabs: { id: TypeFilter; label: string; count: number }[] = [
    { id: "ALL", label: t("recruiter.assessments.excel.filterTabs.all"), count: counts.all },
    { id: "TRAC_NGHIEM_DON", label: t("recruiter.assessments.excel.filterTabs.single"), count: counts.single },
    { id: "NHIEU_DAP_AN", label: t("recruiter.assessments.excel.filterTabs.multi"), count: counts.multi },
    { id: "SUBJECTIVE", label: t("recruiter.assessments.excel.filterTabs.subjective"), count: counts.subjective },
  ];

  const showAllColumns = typeFilter === "ALL";
  const showChoiceColumns = typeFilter === "TRAC_NGHIEM_DON" || typeFilter === "NHIEU_DAP_AN";
  const showSubjectiveColumns = typeFilter === "SUBJECTIVE";

  const colLetters = showAllColumns
    ? (["A", "B", "C", "D", "E", "F"] as const)
    : showChoiceColumns
      ? COL_LETTERS
      : (["A", "B", "C", "D", "E", "F", "G"] as const);

  if (reviewingImport && (job || generalBank)) return <ExcelImportReview questions={questions} jobId={job?.id ?? 0} jobTitle={job?.title ?? t("recruiter.assessments.excel.generalBankTitleFallback")}
    generalBank={generalBank}
    onBack={() => setReviewingImport(false)}
    onEdit={index => {
      setReviewingImport(false);
      setView("all");
      setTypeFilter(isSubjectiveKind(questions[index].kind) ? "SUBJECTIVE" : "ALL");
      setSelectedIndex(index);
      setActiveEdit({ rowIndex: index, field: "content" });
      setActiveCell(`A${index + 2}`);
    }} />;

  return (
    <section className="flex flex-col gap-3 text-[var(--color-on-surface)]">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={bankPath}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={t("recruiter.assessments.excel.backToBankTitle")}
            aria-label={t("recruiter.assessments.excel.backToBankTitle")}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
              {t("recruiter.assessments.excel.pageTitle")}
            </h1>
            {job?.title && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {job.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowHelpModal(true)}>
            <HelpCircle className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            {t("recruiter.assessments.excel.helpShortcutsBtn")}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleValidate}>
            <ListChecks className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            {t("recruiter.assessments.excel.validateBtn")}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleSaveDraft}>
            <Save className="size-3.5" aria-hidden="true" />
            {t("recruiter.assessments.excel.saveDraftBtn")}
          </Button>
          <Button type="button" size="sm" onClick={handleValidate}>
            <CloudUpload className="size-3.5" aria-hidden="true" />
            {generalBank ? t("recruiter.assessments.excel.saveToBankBtn") : t("recruiter.assessments.excel.createAssessmentBtn")}
          </Button>
        </div>
      </header>

      {generalBank && (
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          {t("recruiter.assessments.excel.generalBankHint")}
        </p>
      )}

      {validation.length > 0 && (
        <div
          ref={validationRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 shadow-2xs dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              {t("recruiter.assessments.excel.validationAlertTitle", { count: validation.length })}
            </p>
            <button
              type="button"
              onClick={() => setValidation([])}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 dark:text-rose-400"
            >
              {t("recruiter.assessments.common.actions.close")}
            </button>
          </div>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {validation.map((message, index) => (
              <li key={index}>
                {message}
                {/^(?:Dòng|Row|行)\s*\d+:/.test(message) && (
                  <button
                    type="button"
                    className="ml-2 font-medium underline text-rose-700 hover:text-rose-900 dark:text-rose-300"
                    onClick={() => {
                      const rowIndex = Number(message.match(/^(?:Dòng|Row|行)\s*(\d+):/)?.[1]) - 2;
                      const field = message.includes("kỹ năng") || message.toLowerCase().includes("skill") || message.includes("スキル") ? "skill" : message.includes("Độ khó") || message.toLowerCase().includes("difficulty") || message.includes("難易度") ? "difficulty" : "content";
                      setView("all");
                      setTypeFilter(questions[rowIndex] && isSubjectiveKind(questions[rowIndex].kind) ? "SUBJECTIVE" : "ALL");
                      setSelectedIndex(rowIndex);
                      setActiveEdit({ rowIndex, field });
                      setActiveCell(`${field === "skill" ? "E" : field === "difficulty" ? "D" : "A"}${rowIndex + 2}`);
                    }}
                  >
                    {t("recruiter.assessments.excel.fixRowBtn")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/75 p-2 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/80">
            {filterTabs.map((tab) => {
              const active = view === "all" && typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setView("all");
                    setTypeFilter(tab.id);
                    const first = questions.findIndex((q) => {
                      if (tab.id === "ALL") return true;
                      if (tab.id === "SUBJECTIVE") return isSubjectiveKind(q.kind);
                      return q.kind === tab.id;
                    });
                    if (first >= 0) {
                      setSelectedIndex(first);
                      setActiveEdit({ rowIndex: first, field: "content" });
                      setActiveCell("A2");
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-white font-semibold text-[var(--color-primary-hover)] shadow-2xs dark:bg-slate-900 dark:text-[var(--color-primary)]"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                      active
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]"
                        : "bg-slate-300/60 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
            <div className="mx-0.5 h-4 w-px bg-slate-300 dark:bg-slate-700" />
            <button
              type="button"
              onClick={() => setView("schema")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                view === "schema"
                  ? "bg-white font-semibold text-[var(--color-primary-hover)] shadow-2xs dark:bg-slate-900 dark:text-[var(--color-primary)]"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              {t("recruiter.assessments.excel.schemaDictTab")}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                  view === "schema"
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]"
                    : "bg-slate-300/60 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
                )}
              >
                {t("recruiter.assessments.excel.schemaColumnsCount", { count: dictionaryRows.length })}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400"
              onClick={() => setShowHelpModal(true)}
              title={t("recruiter.assessments.excel.guideTooltip")}
            >
              <HelpCircle className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              <span className="hidden sm:inline">{t("recruiter.assessments.excel.guideShortBtn")}</span>
            </Button>
            {view === "all" && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  addQuestion(
                    typeFilter === "SUBJECTIVE"
                      ? "TINH_HUONG_SYSTEM"
                      : typeFilter === "NHIEU_DAP_AN"
                        ? "NHIEU_DAP_AN"
                        : "TRAC_NGHIEM_DON",
                  )
                }
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {t("recruiter.assessments.excel.addRowBtn")}
              </Button>
            )}
          </div>
        </div>

        {view === "all" && (
          <>
            {typeFilter !== "SUBJECTIVE" && <>
                <div className="flex items-center gap-2.5 border-b border-slate-200/80 bg-slate-50/50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex h-7 min-w-14 items-center justify-center rounded-md border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-2 font-mono text-xs font-bold text-[var(--color-primary-hover)] shadow-2xs">
                    {activeCell}
                  </div>
                  <span className="select-none font-mono text-xs font-bold italic text-slate-400">fx</span>
                  <input
                    className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[var(--color-primary)] dark:disabled:bg-slate-800"
                    value={formula}
                    onChange={(event) => applyEdit(event.target.value)}
                    onPasteCapture={handleTablePaste}
                    disabled={!activeEdit}
                    placeholder={t("recruiter.assessments.excel.formulaPlaceholder")}
                    aria-label={t("recruiter.assessments.excel.formulaInputAria")}
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    {savedNote && (
                      <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex">
                        <Check className="size-3" aria-hidden="true" />
                        {t("recruiter.assessments.excel.autoDraftSavedBadge")}
                      </span>
                    )}
                    <span className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {t("recruiter.assessments.excel.totalSlashMax", { count: questions.length, max: MAX_QUESTIONS })}
                    </span>
                  </div>
                </div>

            <div className="overflow-x-auto" onPasteCapture={handleTablePaste}>
              <table className="w-full min-w-[880px] table-fixed border-collapse text-[11px] leading-snug">
                <thead className="bg-[var(--color-surface-container-low)]">
                  <tr className="h-5 font-mono text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                    <th className="w-8 bg-[var(--color-surface-container-high)]">&nbsp;</th>
                    {colLetters.map((letter, index) => (
                      <th
                        key={letter}
                        className={cn(
                          "bg-[var(--color-surface-container-high)] px-1 text-center font-semibold",
                          index === 0 && "text-[var(--color-primary)]",
                          letter === "G" && showChoiceColumns && "bg-[#b4c5ff] text-[var(--color-primary)]",
                        )}
                      >
                        {letter}
                      </th>
                    ))}
                  </tr>
                  <tr className="h-8 bg-[var(--color-surface-container)] text-[10px] font-semibold">
                    <th className="bg-[var(--color-surface-container-high)] text-center font-mono text-[10px]">1</th>
                    {showAllColumns && (
                      <>
                        <HeaderCell label="content *" highlight="primary" />
                        <HeaderCell label="type *" />
                        <HeaderCell label="score" highlight="answer" />
                        <HeaderCell label="difficulty" />
                        <HeaderCell label="skill" />
                        <HeaderCell label={t("recruiter.assessments.excel.colDetailsByType")} />
                      </>
                    )}
                    {showChoiceColumns && (
                      <>
                        <HeaderCell label="content *" highlight="primary" />
                        <HeaderCell label="type *" />
                        <HeaderCell label="option_a *" />
                        <HeaderCell label="option_b *" />
                        <HeaderCell label="option_c" />
                        <HeaderCell label="option_d" />
                        <HeaderCell label="answer *" highlight="answer" />
                        <HeaderCell label="score" />
                        <HeaderCell label="difficulty" />
                        <HeaderCell label="skill" />
                        <HeaderCell label={typeFilter === "NHIEU_DAP_AN" ? "policy" : "rubric"} />
                      </>
                    )}
                    {showSubjectiveColumns && (
                      <>
                        <HeaderCell label="content / scenario *" highlight="primary" />
                        <HeaderCell label="type *" />
                        <HeaderCell label={t("recruiter.assessments.excel.colFrameOptional")} />
                        <HeaderCell label={t("recruiter.assessments.excel.colRubric3Levels")} />
                        <HeaderCell label="max_score" highlight="answer" />
                        <HeaderCell label="time" />
                        <HeaderCell label="skill" />
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface-container)] bg-[var(--color-surface-card)]">
                  {tableIndexes.map((rowIndex, visiblePos) => {
                    const row = questions[rowIndex];
                    const rowNum = visiblePos + 2;
                    const rowActive = selectedIndex === rowIndex;
                    const inDragRange = Boolean(dragRange && rowIndex >= dragRange.from && rowIndex <= dragRange.to);

                    if (!row) {
                      return (
                        <tr
                          key={`ghost-${rowIndex}`}
                          className={cn(
                            "bg-[var(--color-surface-container-low)]/60",
                            inDragRange && "bg-[var(--color-primary-subtle)]",
                          )}
                        >
                          <td
                            data-row-index={rowIndex}
                            className={cn(
                              "cursor-ns-resize select-none bg-[var(--color-surface-container-high)] text-center font-mono text-[10px] font-semibold text-[var(--color-outline)]",
                              inDragRange && "bg-[var(--color-primary)] text-white",
                            )}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setRowDrag({
                                anchorIndex: selectedIndex,
                                currentIndex: rowIndex,
                              });
                            }}
                          >
                            {rowNum}
                          </td>
                          <td
                            colSpan={colLetters.length}
                            data-row-index={rowIndex}
                            className="px-2 py-1.5 italic text-[var(--color-outline)]"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setRowDrag({
                                anchorIndex: selectedIndex,
                                currentIndex: rowIndex,
                              });
                            }}
                          >
                            {t("recruiter.assessments.excel.ghostRowPrompt", { max: MAX_QUESTIONS })}
                          </td>
                        </tr>
                      );
                    }

                    const warn = Boolean(row.warning) && !row.explanation.trim() && row.kind === "TRAC_NGHIEM_DON";
                    const pick = (field: string, letter: string) => () => selectCell(rowIndex, field, letter, rowNum);

                    return (
                      <tr
                        key={`${row.id}-${rowIndex}`}
                        className={cn(
                          "hover:bg-[var(--color-surface-container-low)]",
                          rowActive && "bg-[var(--color-primary-subtle)]/40",
                          inDragRange && "bg-[var(--color-primary-subtle)]/70",
                          warn && "bg-amber-50",
                        )}
                      >
                        <td
                          data-row-index={rowIndex}
                          className={cn(
                            "relative cursor-ns-resize select-none bg-[var(--color-surface-container-low)] text-center font-mono text-[10px] font-semibold text-[var(--color-on-surface-variant)]",
                            rowActive && "bg-[var(--color-primary)] text-white",
                            inDragRange && "bg-[var(--color-primary)] text-white",
                          )}
                          title={t("recruiter.assessments.excel.rowHandleTitle")}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setSelectedIndex(rowIndex);
                            setRowDrag({ anchorIndex: rowIndex, currentIndex: rowIndex });
                          }}
                          onClick={pick("content", "A")}
                        >
                          {rowNum}
                          {rowActive && (
                            <span
                              className="absolute bottom-0 right-0 size-1.5 cursor-ns-resize bg-[var(--color-primary)]"
                              aria-hidden="true"
                            />
                          )}
                        </td>

                        <EditCell
                          selected={isSelected(rowIndex, "content")}
                          value={row.content}
                          onSelect={pick("content", "A")}
                          onChange={applyEdit}
                          title={row.content}
                        >
                          {row.content || <span className="italic text-[var(--color-outline)]">{t("recruiter.assessments.excel.contentPlaceholder")}</span>}
                        </EditCell>

                        <td className="px-1.5 py-1.5 align-middle">
                          <TypeSelect value={row.kind} onChange={(kind) => changeKind(rowIndex, kind)} />
                        </td>

                        {showAllColumns && (
                          <>
                            <EditCell
                              selected={isSubjectiveKind(row.kind) ? false : isSelected(rowIndex, "score")}
                              value={row.score}
                              onSelect={isSubjectiveKind(row.kind) ? () => {} : pick("score", "C")}
                              onChange={isSubjectiveKind(row.kind) ? () => {} : applyEdit}
                              className={cn(
                                "text-center font-mono",
                                isSubjectiveKind(row.kind)
                                  ? "bg-[var(--color-surface-container-low)] text-[10px] italic text-[var(--color-on-surface-variant)] cursor-not-allowed"
                                  : "font-semibold"
                              )}
                              title={isSubjectiveKind(row.kind) ? t("recruiter.assessments.excel.scoreAutoTooltip") : undefined}
                            >
                              {isSubjectiveKind(row.kind) ? (
                                <span className="rounded bg-[var(--color-surface-container)] px-1 py-0.5 text-[9px] font-medium text-[var(--color-on-surface-variant)]">
                                  {t("recruiter.assessments.excel.scoreByConfigBadge")}
                                </span>
                              ) : (
                                row.score
                              )}
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "difficulty")}
                              value={row.difficulty}
                              onSelect={pick("difficulty", "D")}
                              onChange={applyEdit}
                            >
                              {row.difficulty ? (
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", difficultyClass(row.difficultyTone))}>
                                  {row.difficulty}
                                </span>
                              ) : (
                                <span className="italic text-[var(--color-outline)]">--</span>
                              )}
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "skill")}
                              value={row.skill}
                              onSelect={pick("skill", "E")}
                              onChange={applyEdit}
                            >
                              {row.skill || <span className="italic text-[var(--color-outline)]">--</span>}
                            </EditCell>
                            <Cell title={detailPreview(row, t)} className="text-[var(--color-on-surface-variant)]">
                              {detailPreview(row, t)}
                            </Cell>
                          </>
                        )}

                        {showChoiceColumns && (
                          <>
                            {(["optionA", "optionB", "optionC", "optionD"] as const).map((field, optionIndex) => (
                              <EditCell
                                key={field}
                                selected={isSelected(rowIndex, field)}
                                value={row[field]}
                                onSelect={pick(field, COL_LETTERS[2 + optionIndex])}
                                onChange={applyEdit}
                                title={row[field]}
                                className="font-mono"
                              >
                                {row[field] || (
                                  <span className="italic text-[var(--color-outline)]">
                                    {String.fromCharCode(65 + optionIndex)}
                                  </span>
                                )}
                              </EditCell>
                            ))}
                            <EditCell
                              selected={isSelected(rowIndex, "answer")}
                              value={row.answer}
                              onSelect={pick("answer", "G")}
                              onChange={applyEdit}
                              className="bg-emerald-50 text-center"
                            >
                              <AnswerBadge value={row.answer} />
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "score")}
                              value={row.score}
                              onSelect={pick("score", "H")}
                              onChange={applyEdit}
                              className="text-center font-mono font-semibold"
                            >
                              {row.score}
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "difficulty")}
                              value={row.difficulty}
                              onSelect={pick("difficulty", "I")}
                              onChange={applyEdit}
                            >
                              {row.difficulty ? (
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", difficultyClass(row.difficultyTone))}>
                                  {row.difficulty}
                                </span>
                              ) : (
                                <span className="italic text-[var(--color-outline)]">--</span>
                              )}
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "skill")}
                              value={row.skill}
                              onSelect={pick("skill", "J")}
                              onChange={applyEdit}
                            >
                              {row.skill || <span className="italic text-[var(--color-outline)]">--</span>}
                            </EditCell>
                            {typeFilter === "NHIEU_DAP_AN" ? (
                              <EditCell
                                selected={isSelected(rowIndex, "policyNote")}
                                value={row.policyNote}
                                onSelect={pick("policyNote", "K")}
                                onChange={applyEdit}
                                title={`${row.policy}: ${row.policyNote}`}
                              >
                                <span className="font-semibold text-[var(--color-primary)]">{row.policy}</span>{" "}
                                {row.policyNote}
                              </EditCell>
                            ) : (
                              <EditCell
                                selected={isSelected(rowIndex, "explanation")}
                                value={row.explanation}
                                onSelect={pick("explanation", "K")}
                                onChange={applyEdit}
                                className={cn(warn && "font-medium text-amber-800")}
                              >
                                {warn ? (
                                  <span className="inline-flex items-center gap-1 italic">
                                    <AlertTriangle className="size-3 shrink-0 text-amber-500" aria-hidden="true" />
                                    {t("recruiter.assessments.excel.missingRubricBadge")}
                                  </span>
                                ) : (
                                  row.explanation || <span className="italic text-[var(--color-outline)]">--</span>
                                )}
                              </EditCell>
                            )}
                          </>
                        )}

                        {showSubjectiveColumns && (
                          <>
                            <EditCell
                              selected={isSelected(rowIndex, "snippet")}
                              value={row.snippet}
                              onSelect={pick("snippet", "C")}
                              onChange={applyEdit}
                              title={row.snippet}
                              className="font-mono text-[var(--color-primary)]"
                            >
                              {row.snippet.split("\n")[0]}
                              {row.snippet.includes("\n") ? "…" : ""}
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "rubric")}
                              value={row.rubric.map((item) => item.text).join(" | ")}
                              onSelect={pick("rubric", "D")}
                              onChange={applyEdit}
                              title={row.rubric.map((item) => item.text).join(" | ")}
                            >
                              {row.rubric.map((item) => (
                                <span
                                  key={item.level}
                                  className={cn(
                                    "mr-1 inline-block",
                                    item.level === "excellent" && "text-emerald-700",
                                    item.level === "pass" && "text-amber-700",
                                    item.level === "fail" && "text-red-600",
                                  )}
                                >
                                  {item.text.includes("]:") ? `${item.text.split("]:")[0]}]` : item.text}
                                </span>
                              ))}
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "score")}
                              value={row.score}
                              onSelect={pick("score", "E")}
                              onChange={applyEdit}
                              className="text-center font-mono font-bold text-[var(--color-primary)]"
                            >
                              {row.score}
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "timeLimit")}
                              value={row.timeLimit}
                              onSelect={pick("timeLimit", "F")}
                              onChange={applyEdit}
                              className="text-center font-mono"
                            >
                              {row.timeLimit}
                            </EditCell>
                            <EditCell
                              selected={isSelected(rowIndex, "skill")}
                              value={row.skill}
                              onSelect={pick("skill", "G")}
                              onChange={applyEdit}
                            >
                              {row.skill}
                            </EditCell>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedQuestion && isChoiceKind(selectedQuestion.kind) && typeFilter === "ALL" && (
              <div className="border-t border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", typeBadgeClass(selectedQuestion.kind))}>
                      {t("recruiter.assessments.excel.choicePanelBadge", { index: selectedIndex + 1, label: typeMeta(selectedQuestion.kind, t).label })}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t("recruiter.assessments.excel.choicePanelSubtitle")}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {t("recruiter.assessments.excel.choicePanelSwitchHint")}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
                  {(["optionA", "optionB", "optionC", "optionD"] as const).map((field, optionIndex) => {
                    const letter = String.fromCharCode(65 + optionIndex);
                    return (
                      <div
                        key={field}
                        className="flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900"
                      >
                        <span className="mr-2 flex size-5 shrink-0 items-center justify-center rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {letter}
                        </span>
                        <input
                          value={selectedQuestion[field]}
                          onChange={(event) => patchQuestion(selectedIndex, { [field]: event.target.value })}
                          onPasteCapture={(event) => handleChoiceFormPaste(field, event)}
                          className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                          placeholder={t("recruiter.assessments.excel.optionPlaceholder", { letter })}
                          aria-label={t("recruiter.assessments.excel.optionAria", { letter })}
                        />
                      </div>
                    );
                  })}
                  <div className="flex items-center rounded-lg border border-emerald-300 bg-emerald-50/80 px-2.5 py-1.5 shadow-2xs dark:border-emerald-800 dark:bg-emerald-950/40">
                    <span className="mr-2 flex h-5 shrink-0 items-center justify-center rounded bg-emerald-200 px-1 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
                      {t("recruiter.assessments.excel.answerShortTag")}
                    </span>
                    <input
                      value={selectedQuestion.answer}
                      onChange={(event) => patchQuestion(selectedIndex, { answer: event.target.value })}
                      onPasteCapture={(event) => handleChoiceFormPaste("answer", event)}
                      className="min-w-0 flex-1 bg-transparent text-center font-mono text-xs font-bold text-emerald-900 outline-none placeholder:text-emerald-500 dark:text-emerald-200"
                      placeholder={selectedQuestion.kind === "NHIEU_DAP_AN" ? "A,C" : "A"}
                      aria-label={t("recruiter.assessments.excel.correctAnswerAria")}
                    />
                  </div>
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
                    <span className="mr-2 shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {selectedQuestion.kind === "NHIEU_DAP_AN" ? t("recruiter.assessments.excel.policyLabel") : t("recruiter.assessments.excel.explanationLabel")}
                    </span>
                    <input
                      value={
                        selectedQuestion.kind === "NHIEU_DAP_AN"
                          ? selectedQuestion.policyNote
                          : selectedQuestion.explanation
                      }
                      onChange={(event) =>
                        patchQuestion(
                          selectedIndex,
                          selectedQuestion.kind === "NHIEU_DAP_AN"
                            ? { policyNote: event.target.value }
                            : { explanation: event.target.value, warning: undefined },
                        )
                      }
                      onPasteCapture={(event) => handleChoiceFormPaste("detail", event)}
                      className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                      placeholder={t("recruiter.assessments.excel.detailPlaceholder")}
                      aria-label={t("recruiter.assessments.excel.detailAria")}
                    />
                  </div>
                </div>
              </div>
            )}

            </>}
            {typeFilter === "SUBJECTIVE" && <section className="space-y-4 border-b border-[var(--color-border-default)] p-4 sm:p-6" aria-label={t("recruiter.assessments.excel.subjectiveSectionAria")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-semibold">{t("recruiter.assessments.excel.subjectiveHeading")}</h2><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.excel.subjectiveSubtitle")}</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => addQuestion("TINH_HUONG_SYSTEM")}><Plus className="size-4" aria-hidden="true" />{t("recruiter.assessments.excel.addTheoryBtn")}</Button>
                  <Button size="sm" onClick={() => addQuestion("TU_LUAN_CODE")}><Code2 className="size-4" aria-hidden="true" />{t("recruiter.assessments.excel.addCodingBtn")}</Button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border-default)]">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]"><tr><th className="p-3">{t("recruiter.assessments.excel.colIndex")}</th><th className="p-3">{t("recruiter.assessments.excel.colContent")}</th><th className="p-3">{t("recruiter.assessments.excel.colType")}</th><th className="p-3">{t("recruiter.assessments.excel.colDifficulty")}</th><th className="p-3">{t("recruiter.assessments.excel.colSkill")}</th></tr></thead>
                  <tbody>{questions.map((question, index) => isSubjectiveKind(question.kind) && <tr key={question.id} className={cn("border-t border-[var(--color-border-default)]", selectedIndex === index && "bg-[var(--color-primary-subtle)]")}>
                    <td className="p-3 font-mono">{index + 1}</td><td className="max-w-md p-3"><button type="button" aria-pressed={selectedIndex === index} className="w-full truncate text-left font-semibold text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2" onClick={() => setSelectedIndex(index)}>{question.content || t("recruiter.assessments.excel.untitledQuestion")}</button></td><td className="p-3">{typeMeta(question.kind, t).label}</td><td className="p-3">{question.difficulty || t("recruiter.assessments.common.dash")}</td><td className="p-3">{question.skill || t("recruiter.assessments.common.dash")}</td>
                  </tr>)}</tbody>
                </table>
                {counts.subjective === 0 && <p className="p-6 text-center text-sm text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.excel.emptySubjective")}</p>}
              </div>
            </section>}
            {typeFilter === "SUBJECTIVE" && selectedQuestion && isSubjectiveKind(selectedQuestion.kind) && (
              <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-8">
                <div className="mb-6 border-b border-[var(--color-border-default)] pb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary-subtle)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)]">
                      <Code2 className="size-3.5" aria-hidden="true" />
                      {selectedQuestion.kind === "TU_LUAN_CODE" ? t("recruiter.assessments.excel.codingFormBadge") : t("recruiter.assessments.excel.theoryFormBadge")}
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-[var(--color-on-surface)]">
                        {selectedQuestion.kind === "TU_LUAN_CODE" ? t("recruiter.assessments.excel.codingFormHeading") : t("recruiter.assessments.excel.theoryFormHeading")}
                      </h2>
                      <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.excel.subjectiveFormDesc")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <label className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs">
                      <span className="text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.excel.switchTypeLabel")}</span>
                      <select
                        aria-label={t("recruiter.assessments.excel.switchTypeAria")}
                        value={selectedQuestion.kind}
                        onChange={(e) => changeKind(selectedIndex, e.target.value as QuestionKind)}
                        className="rounded bg-transparent font-semibold text-[var(--color-primary)] outline-none cursor-pointer"
                      >
                        <option value="TINH_HUONG_SYSTEM">{t("recruiter.assessments.common.questionTypes.essayTheory")}</option>
                        <option value="TU_LUAN_CODE">{t("recruiter.assessments.common.questionTypes.codingEssay")}</option>
                      </select>
                    </label>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-card)] px-2 py-0.5 ring-1 ring-[var(--color-border-default)]">
                      <Clock3 className="size-3" aria-hidden="true" />
                      {selectedQuestion.timeLimit || "--"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="min-w-0 flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
                    <div className="flex items-center gap-3 border-b border-[var(--color-border-default)] pb-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-semibold text-[var(--color-primary)]">01</span>
                      <div>
                        <h3 className="text-sm font-semibold">
                          {selectedQuestion.kind === "TU_LUAN_CODE" ? t("recruiter.assessments.excel.step01CodeHeading") : t("recruiter.assessments.excel.step01TheoryHeading")}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                          {selectedQuestion.kind === "TU_LUAN_CODE" ? t("recruiter.assessments.excel.step01CodeDesc") : t("recruiter.assessments.excel.step01TheoryDesc")}
                        </p>
                      </div>
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.excel.promptMarkdownLabel")}</span>
                      <textarea
                        value={selectedQuestion.content}
                        onChange={(event) => patchQuestion(selectedIndex, { content: event.target.value })}
                        rows={4}
                        placeholder={selectedQuestion.kind === "TU_LUAN_CODE" ? t("recruiter.assessments.excel.promptCodePlaceholder") : t("recruiter.assessments.excel.promptTheoryPlaceholder")}
                        className="resize-y rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.excel.colSkill")}</span>
                        <input
                          value={selectedQuestion.skill}
                          onChange={(event) => patchQuestion(selectedIndex, { skill: event.target.value })}
                          placeholder={t("recruiter.assessments.excel.skillPlaceholder")}
                          className="h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.excel.colDifficulty")}</span>
                        <select
                          value={selectedQuestion.difficulty}
                          onChange={event => patchQuestion(selectedIndex, { difficulty: event.target.value, difficultyTone: toneFromDifficulty(event.target.value) })}
                          className="h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="">{t("recruiter.assessments.excel.selectDifficultyOption")}</option>
                          <option value="Easy">{t("recruiter.assessments.common.difficulty.easyLabel")}</option>
                          <option value="Medium">{t("recruiter.assessments.common.difficulty.mediumLabel")}</option>
                          <option value="Hard">{t("recruiter.assessments.common.difficulty.hardLabel")}</option>
                        </select>
                      </label>
                    </div>

                    <p className="mt-1 text-[11px] italic text-[var(--color-on-surface-variant)]">
                      {t("recruiter.assessments.excel.autoScoringNoticePrefix")}<strong>{t("recruiter.assessments.excel.autoScoringNoticeHighlight")}</strong>{t("recruiter.assessments.excel.autoScoringNoticeSuffix")}
                    </p>
                  </div>

                  <div className="min-w-0 flex flex-col gap-4">
                    {selectedQuestion.kind === "TU_LUAN_CODE" ? (
                      <CodingStarterFields
                        value={codingAuthoringValue(
                          selectedQuestion.codingJsonText,
                          selectedQuestion.language || selectedQuestion.skill,
                          selectedQuestion.snippet,
                          job?.skills
                        )}
                        onChange={value => patchQuestion(selectedIndex, { codingJsonText: value })}
                        jobSkills={job?.skills}
                        questionSkill={selectedQuestion.skill}
                      />
                    ) : (
                      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-[#0f172a] p-4 text-slate-100">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
                          <div>
                            <p className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                              <Code2 className="size-4 shrink-0" aria-hidden="true" />
                              {t("recruiter.assessments.excel.theoryOutlineTitle")}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{t("recruiter.assessments.excel.theoryOutlineDesc")}</p>
                          </div>
                          <span className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                            Markdown
                          </span>
                        </div>
                        <textarea
                          aria-label={t("recruiter.assessments.excel.theoryOutlineAria")}
                          value={selectedQuestion.snippet}
                          onChange={(event) => patchQuestion(selectedIndex, { snippet: event.target.value })}
                          rows={6}
                          spellCheck={false}
                          placeholder={t("recruiter.assessments.excel.theoryOutlinePlaceholder")}
                          className="min-h-36 flex-1 resize-y rounded-md border border-slate-700 bg-[#020617] px-3 py-2 font-mono text-[12px] leading-relaxed text-emerald-200 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/60"
                        />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-slate-700 bg-[#0f172a] p-4">
                      <div className="border-b border-slate-700 pb-3">
                        <span className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                          <ShieldCheck className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                          {selectedQuestion.kind === "TU_LUAN_CODE" ? t("recruiter.assessments.excel.modelSolutionTitle") : t("recruiter.assessments.excel.referenceAnswerTitle")}
                        </span>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {selectedQuestion.kind === "TU_LUAN_CODE"
                            ? t("recruiter.assessments.excel.modelSolutionDesc")
                            : t("recruiter.assessments.excel.referenceAnswerDesc")}
                        </p>
                      </div>
                      {selectedQuestion.kind === "TU_LUAN_CODE" ? (
                        <MonacoCodeEditor
                          height="200px"
                          language={selectedQuestion.language || "java"}
                          value={selectedQuestion.sample}
                          onChange={(val) => patchQuestion(selectedIndex, { sample: val })}
                          placeholder={t("recruiter.assessments.excel.modelSolutionPlaceholder")}
                        />
                      ) : (
                        <textarea
                          value={selectedQuestion.sample}
                          onChange={(event) => patchQuestion(selectedIndex, { sample: event.target.value })}
                          onPaste={(event) => {
                            const text = event.clipboardData.getData("text/plain");
                            if (!isSampleAnswerOnlyLine(text) && !/^(?:đáp\s*án\s*mẫu|sample)/i.test(text.trim())) return;
                            event.preventDefault();
                            patchQuestion(selectedIndex, { sample: stripSamplePrefix(text) });
                            setCapacityNote(t("recruiter.assessments.excel.pastedSampleNote"));
                          }}
                          rows={5}
                          placeholder={t("recruiter.assessments.excel.referenceAnswerPlaceholder")}
                          className="min-h-36 flex-1 resize-y rounded-lg border border-slate-700 bg-[#020617] px-3 py-2 font-mono text-[12px] text-slate-200 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/60"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {selectedQuestion.kind === "TU_LUAN_CODE" ? (
                  <div className="mt-6 border-t border-[var(--color-border-default)] pt-6">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-semibold text-[var(--color-primary)]">02</span>
                      <div>
                        <h3 className="text-sm font-semibold">{t("recruiter.assessments.excel.step02CodeHeading")}</h3>
                        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.excel.step02CodeDesc")}</p>
                      </div>
                    </div>
                    <QuestionContentFields
                      type="CODING"
                      executionOnly
                      value={codingAuthoringValue(selectedQuestion.codingJsonText, selectedQuestion.language, selectedQuestion.snippet)}
                      onChange={value => patchQuestion(selectedIndex, { codingJsonText: value })}
                    />
                    <div className="mt-4">
                      <CodingTestVerification
                        value={codingAuthoringValue(selectedQuestion.codingJsonText, selectedQuestion.language, selectedQuestion.snippet)}
                        solution={selectedQuestion.sample}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 border-t border-[var(--color-border-default)] pt-6">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-semibold text-[var(--color-primary)]">
                        02
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">
                          {t("recruiter.assessments.excel.step02TheoryHeading")}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                          {t("recruiter.assessments.excel.step02TheoryDesc")}
                        </p>
                      </div>
                    </div>
                    <AiRubricCriteriaEditor
                      value={
                        selectedQuestion.rubricJsonText ||
                        JSON.stringify(
                          {
                            category: "ESSAY_CONCEPTUAL",
                            referenceAnswer: selectedQuestion.sample,
                            criteria: getEssayArchetypes(t).ESSAY_CONCEPTUAL.criteria.map((c) => ({ ...c })),
                          },
                          null,
                          2
                        )
                      }
                      referenceAnswer={selectedQuestion.sample}
                      onChange={(value) => patchQuestion(selectedIndex, { rubricJsonText: value })}
                    />
                  </div>
                )}

                {/* Thanh thao tác nhanh chân Form (Action Footer) */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-5">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>{t("recruiter.assessments.excel.autoSyncHintPrefix")}<strong>{t("recruiter.assessments.excel.autoSyncHintQuestion", { index: selectedIndex + 1 })}</strong>{t("recruiter.assessments.excel.autoSyncHintSuffix")}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={questions.filter(q => isSubjectiveKind(q.kind)).length <= 1}
                      onClick={() => {
                        setQuestions(prev => prev.filter((_, idx) => idx !== selectedIndex));
                        setSelectedIndex(Math.max(0, selectedIndex - 1));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-30 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                    >
                      <Trash2 className="size-3.5" />
                      {t("recruiter.assessments.excel.deleteThisQuestionBtn")}
                    </button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveDraft}
                    >
                      <Save className="size-3.5" />
                      {t("recruiter.assessments.excel.saveDraftLongBtn")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleValidate}
                    >
                      <CloudUpload className="size-3.5" />
                      {generalBank ? t("recruiter.assessments.excel.saveToBankLongBtn") : t("recruiter.assessments.excel.createAssessmentBtn")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === "schema" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed border-collapse text-[11px] leading-snug">
              <thead className="bg-[var(--color-surface-container-low)]">
                <tr className="h-5 font-mono text-[10px] uppercase text-[var(--color-on-surface-variant)]">
                  <th className="w-8 bg-[var(--color-surface-container-high)]">&nbsp;</th>
                  {["A", "B", "C", "D", "E", "F", "G"].map((letter) => (
                    <th key={letter} className="bg-[var(--color-surface-container-high)] px-1 text-center font-semibold">
                      {letter}
                    </th>
                  ))}
                </tr>
                <tr className="h-8 bg-[var(--color-surface-container)] text-[10px] font-semibold">
                  <th className="bg-[var(--color-surface-container-high)] text-center font-mono text-[10px]">1</th>
                  <HeaderCell label={t("recruiter.assessments.excel.schemaHeaders.column")} />
                  <HeaderCell label={t("recruiter.assessments.excel.schemaHeaders.field")} />
                  <HeaderCell label={t("recruiter.assessments.excel.schemaHeaders.status")} />
                  <HeaderCell label={t("recruiter.assessments.excel.schemaHeaders.type")} />
                  <HeaderCell label={t("recruiter.assessments.excel.schemaHeaders.validValues")} />
                  <HeaderCell label={t("recruiter.assessments.excel.schemaHeaders.rule")} highlight="primary" />
                  <HeaderCell label={t("recruiter.assessments.excel.schemaHeaders.examples")} />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-surface-container)]">
                {dictionaryRows.map((row, index) => {
                  const statusClass = {
                    optional: "bg-emerald-50 text-emerald-700",
                    required: "bg-red-100 text-red-800",
                    partial: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
                    recommended: "bg-[var(--color-secondary-container)]",
                    default: "bg-emerald-50 text-emerald-700",
                  }[row.statusTone];
                  return (
                    <tr key={row.field}>
                      <td className="bg-[var(--color-surface-container-low)] text-center font-mono text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
                        {index + 2}
                      </td>
                      <Cell className="text-center font-mono font-bold text-[var(--color-primary)]">{row.excelCol}</Cell>
                      <Cell className="font-mono font-semibold text-[var(--color-primary)]">{row.field}</Cell>
                      <Cell>
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", statusClass)}>
                          {row.status}
                        </span>
                      </Cell>
                      <Cell className="font-mono text-[var(--color-on-surface-variant)]">{row.dataType}</Cell>
                      <Cell className="font-mono" title={row.validValues}>
                        {row.validValues}
                      </Cell>
                      <Cell title={row.rule}>{row.rule}</Cell>
                      <Cell title={`✓ ${row.exampleOk} / ✗ ${row.exampleBad}`}>
                        <span className="text-emerald-700">✓ {row.exampleOk}</span>
                        {" · "}
                        <span className={row.statusTone === "recommended" ? "text-amber-700" : "text-red-600"}>
                          {row.statusTone === "recommended" ? "⚠" : "✗"} {row.exampleBad}
                        </span>
                      </Cell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>
                {view === "schema"
                  ? t("recruiter.assessments.excel.footerSchemaStatus")
                  : capacityNote || (savedNote ? t("recruiter.assessments.excel.footerDraftStatus") : t("recruiter.assessments.excel.footerReadyStatus"))}
              </span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="hidden items-center gap-2 md:flex">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">Ctrl+C</kbd>
                <span>{t("recruiter.assessments.excel.shortcutCopyLabel")}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">Ctrl+V</kbd>
                <span>{t("recruiter.assessments.excel.shortcutPasteLabel")}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">Ctrl+Z</kbd>
                <span>{t("recruiter.assessments.excel.shortcutUndoLabel")}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">{t("recruiter.assessments.excel.shortcutDragKey")}</kbd>
                <span>{t("recruiter.assessments.excel.shortcutDragLabel")}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px]">
              {t("recruiter.assessments.excel.footerTotalSummary", {
                total: questions.length,
                max: MAX_QUESTIONS,
                single: counts.single,
                multi: counts.multi,
                subjective: counts.subjective,
              })}
            </span>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
            >
              <HelpCircle className="size-3.5" aria-hidden="true" />
              {t("recruiter.assessments.excel.guideModalBtn")}
            </button>
          </div>
        </div>
      </div>

      <DetailDialog
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title={t("recruiter.assessments.excel.guideModalTitle")}
        size="wide"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-[var(--color-primary)]">
              <ListChecks className="size-4" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("recruiter.assessments.excel.helpCard1Title")}</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">{t("recruiter.assessments.excel.helpCard1Item1Title")}</strong> {t("recruiter.assessments.excel.helpCard1Item1Body")}
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">{t("recruiter.assessments.excel.helpCard1Item2Title")}</strong> {t("recruiter.assessments.excel.helpCard1Item2BodyPrefix")}<span className="font-mono text-[11px] text-[var(--color-primary-hover)] dark:text-[var(--color-primary)]">...Authorization.Tự luận3.0MediumSecurity</span>{t("recruiter.assessments.excel.helpCard1Item2BodySuffix")}
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">{t("recruiter.assessments.excel.helpCard1Item3Title")}</strong> {t("recruiter.assessments.excel.helpCard1Item3BodyPrefix")}<span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">{t("recruiter.assessments.excel.helpCard1Item3BodySample")}</span>{t("recruiter.assessments.excel.helpCard1Item3BodySuffix")}
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Code2 className="size-4" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("recruiter.assessments.excel.helpCard2Title")}</h3>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {t("recruiter.assessments.excel.helpCard2Banner")}
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-emerald-700 dark:text-emerald-300">{t("recruiter.assessments.excel.helpCard2ExcellentTitle")}</strong> {t("recruiter.assessments.excel.helpCard2ExcellentBody")}
              </li>
              <li>
                <strong className="text-amber-700 dark:text-amber-300">{t("recruiter.assessments.excel.helpCard2PassTitle")}</strong> {t("recruiter.assessments.excel.helpCard2PassBody")}
              </li>
              <li>
                <strong className="text-rose-700 dark:text-rose-300">{t("recruiter.assessments.excel.helpCard2FailTitle")}</strong> {t("recruiter.assessments.excel.helpCard2FailBody")}
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-[var(--color-primary)]">
              <ShieldCheck className="size-4" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("recruiter.assessments.excel.helpCard3Title")}</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                <span>{t("recruiter.assessments.excel.helpCard3Item1")}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                <span>{t("recruiter.assessments.excel.helpCard3Item2")}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                <span>{t("recruiter.assessments.excel.helpCard3Item3")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("recruiter.assessments.excel.shortcutTableHeading")}
          </h4>
          <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-slate-600 dark:text-slate-300">{t("recruiter.assessments.excel.shortcutCellCopy")}</span>
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">Ctrl+C</kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-slate-600 dark:text-slate-300">{t("recruiter.assessments.excel.shortcutPasteLabel")}</span>
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">Ctrl+V</kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-slate-600 dark:text-slate-300">{t("recruiter.assessments.excel.shortcutUndoLabel")}</span>
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">Ctrl+Z</kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-slate-600 dark:text-slate-300">{t("recruiter.assessments.excel.shortcutCellDrag")}</span>
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">{t("recruiter.assessments.excel.shortcutDragValue")}</kbd>
            </div>
          </div>
        </div>
      </DetailDialog>
    </section>
  );
}
