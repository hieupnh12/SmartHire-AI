import { ExcelImportReview } from "../components/ExcelImportReview";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudUpload,
  Code2,
  Folder,
  ListChecks,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { cn } from "@/lib/utils";
import {
  DICTIONARY_ROWS,
  QUESTION_TYPE_OPTIONS,
  blankQuestion,
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

function parseKind(raw: string, fallback: QuestionKind): QuestionKind {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const byLabel = QUESTION_TYPE_OPTIONS.find((item) => item.label.toUpperCase() === trimmed.toUpperCase());
  if (byLabel) return byLabel.value;
  const value = trimmed.toUpperCase().replace(/\s+/g, "_");
  const ascii = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const direct = QUESTION_TYPE_OPTIONS.find((item) => item.value === value || item.value === ascii);
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

function isKnownTypeLabel(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (QUESTION_TYPE_OPTIONS.some((item) => item.label.toLowerCase() === trimmed.toLowerCase())) return true;
  if (/^(tự\s*luận|tu\s*luan|essay)$/i.test(trimmed)) return true;
  const ascii = trimmed
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  if (QUESTION_TYPE_OPTIONS.some((item) => item.value === ascii)) return true;
  return /TRAC.?NGHIEM|NHIEU.?DAP|TU.?LUAN|LY.?THUYET|TINH.?HUONG|THEORY|^SINGLE$|^MULTI$|CODE|SYSTEM|^ESSAY$/i.test(ascii);
}

/** Extra aliases users type/paste (matched after longer official labels). */
const TYPE_LABEL_ALIASES = ["Tự luận lý thuyết", "Tự luận code", "Tự luận", "Tu luan", "Essay", "ESSAY"];

function typeLabelMatchers(): string[] {
  return [...QUESTION_TYPE_OPTIONS]
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

function makeBlankRows(count: number, startFrom: number, kind: QuestionKind): BankQuestion[] {
  return Array.from({ length: count }, (_, offset) => {
    const row = blankQuestion(kind);
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

function detailPreview(row: BankQuestion) {
  if (isChoiceKind(row.kind)) {
    return row.answer ? `Đáp án: ${row.answer}` : "Chưa có đáp án";
  }
  if (row.sample.trim()) {
    return `Đáp án mẫu: ${row.sample.trim().slice(0, 80)}${row.sample.trim().length > 80 ? "…" : ""}`;
  }
  if (row.kind === "TU_LUAN_CODE") {
    return row.snippet ? `Khung code (tuỳ chọn): ${row.snippet.split("\n")[0]}…` : "Thiếu đáp án mẫu";
  }
  return row.snippet ? `Khung lý thuyết (tuỳ chọn)` : "Thiếu đáp án mẫu";
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
  return (
    <td
      className={cn(
        "max-w-0 cursor-text px-1.5 py-1.5 align-middle",
        !selected && "truncate",
        selected && "bg-white ring-2 ring-inset ring-[var(--color-primary)]",
        className,
      )}
      title={selected ? "Đang sửa ô này · Ctrl+V dán · Ctrl+C sao chép" : title}
      onClick={onSelect}
    >
      {selected ? (
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          className="w-full bg-transparent text-[11px] text-[var(--color-on-surface)] outline-none"
          aria-label="Sửa nội dung ô"
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
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as QuestionKind)}
      className={cn(
        "w-full max-w-full cursor-pointer rounded-full border-0 px-1.5 py-0.5 text-[10px] font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
        typeBadgeClass(value),
      )}
      aria-label="Chọn loại câu hỏi"
    >
      {QUESTION_TYPE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ExcelQuestionTemplatePage() {
  const job = useRecruitmentJob();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const [reviewingImport, setReviewingImport] = useState(false);
  const [view, setView] = useState<ViewId>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [questions, setQuestions] = useState<BankQuestion[]>(() => {
    const draft = loadExcelQuestionDraft(job.id);
    if (draft?.length) return withAutoQuestionIds(draft);
    const row = blankQuestion("TRAC_NGHIEM_DON");
    row.id = questionIdForIndex(0);
    return [row];
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>({ rowIndex: 0, field: "content" });
  const [activeCell, setActiveCell] = useState("A2");
  const [savedNote, setSavedNote] = useState(() =>
    hasExcelQuestionDraft(job.id) ? "Đã khôi phục bản nháp đã lưu tạm." : "",
  );
  const [rowDrag, setRowDrag] = useState<RowDragState | null>(null);
  const [capacityNote, setCapacityNote] = useState("");
  const undoStackRef = useRef<BankQuestion[][]>([]);
  const editSessionRef = useRef<string | null>(null);

  function pushUndo(rows: BankQuestion[]) {
    undoStackRef.current.push(cloneQuestions(rows));
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
  }

  function undoQuestions() {
    const previous = undoStackRef.current.pop();
    if (!previous) {
      setCapacityNote("Không còn thao tác để hoàn tác.");
      return;
    }
    editSessionRef.current = null;
    setQuestions(previous);
    setSavedNote("");
    setCapacityNote("Đã hoàn tác (Ctrl+Z).");
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
                setCapacityNote(`Đã chọn ${Math.abs(prev.currentIndex - prev.anchorIndex) + 1} dòng.`);
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
              const grown = withAutoQuestionIds([...rows, ...makeBlankRows(added, rows.length, kind)]);
              setCapacityNote(
                needed >= MAX_QUESTIONS
                  ? `Đã đạt giới hạn ${MAX_QUESTIONS} câu.`
                  : `Đã thêm ${added} dòng trống bằng kéo chuột.`,
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
      return withAutoQuestionIds(rows.map((row, index) => (index === rowIndex ? { ...row, ...safePatch } : row)));
    });
    setSavedNote("");
  }

  function applyRowFromCells(row: BankQuestion, cells: string[], mode: TypeFilter): BankQuestion {
    const fallbackKind = row.kind || defaultKindForFilter();
    if (cells.length === 1) {
      return { ...row, content: cells[0] ?? row.content };
    }

    if (mode === "SUBJECTIVE") {
      const kind = parseKind(cells[1] ?? "", isSubjectiveKind(fallbackKind) ? fallbackKind : "TU_LUAN_CODE");
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
        ...blankQuestion(kind),
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
      const kind = parseKind(cells[1] ?? "", fallbackKind);
      if (isSubjectiveKind(kind)) {
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
        rows.length < cappedNeeded ? [...rows, ...makeBlankRows(cappedNeeded - rows.length, rows.length, kind)] : [...rows];
      rowsToApply.forEach((cells, offset) => {
        const index = start + offset;
        if (index >= MAX_QUESTIONS) return;
        next[index] = applyRowFromCells(next[index] ?? blankQuestion(kind), cells, typeFilter);
      });
      return withAutoQuestionIds(next);
    });

    setSelectedIndex(Math.min(start + rowsToApply.length - 1, MAX_QUESTIONS - 1));
    setActiveEdit({ rowIndex: start, field: "content" });
    setActiveCell(`A${start + 2}`);
    setCapacityNote(
      needed > MAX_QUESTIONS
        ? `Đã dán ${rowsToApply.length} câu (cắt vì giới hạn ${MAX_QUESTIONS}).`
        : `Đã dán ${rowsToApply.length} câu từ clipboard.`,
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
      setCapacityNote(`Đã dán ${values.length} ô option/đáp án theo hàng ngang.`);
      return;
    }

    // Single-value paste into the focused choice field only (do not scatter into other columns).
    const plain = (values?.[0] ?? usable[0]?.[0] ?? event.clipboardData.getData("text/plain")).trimEnd();
    if (!plain) return;
    event.preventDefault();
    applyChoiceSequenceToRow(selectedIndex, startField, [plain]);
    setCapacityNote("Đã dán vào ô đang chọn.");
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
      setCapacityNote("Đã dán đáp án mẫu.");
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
      setCapacityNote(`Đã dán ${sequence.length} ô option/đáp án theo hàng ngang từ ô đang chọn.`);
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
        setCapacityNote("Đã dán văn bản vào ô đang chọn.");
        return;
      }

      // Wide clipboard with multiple columns: only fill the whole question when pasting
      // from content (or no cell) — never hijack an option/answer cell into a full-row ingest.
      const editingOptionCell =
        startField && optionStartFields.includes(startField as (typeof optionStartFields)[number]);
      if (editingOptionCell && !hasFullQuestionRows) {
        event.preventDefault();
        applyEdit((usable[0] ?? []).join("\t"));
        setCapacityNote("Đã dán vào ô đang chọn.");
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
    setCapacityNote("Đã dán vào ô đang chọn.");
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
      setCapacityNote("Đã sao chép ô đang chọn.");
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
    const defaults = blankQuestion(kind);
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
    if (typeFilter !== "ALL") {
      if (isSubjectiveKind(kind)) setTypeFilter("SUBJECTIVE");
      else setTypeFilter(kind);
    }
  }

  function addQuestion(kind: QuestionKind = "TRAC_NGHIEM_DON") {
    if (questions.length >= MAX_QUESTIONS) {
      setCapacityNote(`Đã đạt giới hạn ${MAX_QUESTIONS} câu.`);
      return;
    }
    const next = blankQuestion(kind);
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
    setTypeFilter("ALL");
    setView("all");
    setCapacityNote("");
  }

  function isSelected(rowIndex: number, field: string) {
    return activeEdit?.rowIndex === rowIndex && activeEdit.field === field;
  }

  function handleValidate() {
    setActiveEdit(null);
    setReviewingImport(true);
  }

  function handleSaveDraft() {
    saveExcelQuestionDraft(job.id, questions);
    setSavedNote("Đã lưu tạm. Rời trang hoặc sang trang khác vẫn giữ nội dung đang soạn.");
    setCapacityNote("");
  }

  const filterTabs: { id: TypeFilter; label: string; count: number }[] = [
    { id: "ALL", label: "Tất cả câu hỏi", count: counts.all },
    { id: "TRAC_NGHIEM_DON", label: "Trắc nghiệm đơn", count: counts.single },
    { id: "NHIEU_DAP_AN", label: "Nhiều đáp án", count: counts.multi },
    { id: "SUBJECTIVE", label: "Tự luận code & lý thuyết", count: counts.subjective },
  ];

  const showAllColumns = typeFilter === "ALL";
  const showChoiceColumns = typeFilter === "TRAC_NGHIEM_DON" || typeFilter === "NHIEU_DAP_AN";
  const showSubjectiveColumns = typeFilter === "SUBJECTIVE";

  const colLetters = showAllColumns
    ? (["A", "B", "C", "D", "E", "F"] as const)
    : showChoiceColumns
      ? COL_LETTERS
      : (["A", "B", "C", "D", "E", "F", "G"] as const);

  if (reviewingImport) return <ExcelImportReview questions={questions} jobId={job.id} jobTitle={job.title}
    onBack={() => setReviewingImport(false)}
    onEdit={index => {
      setReviewingImport(false);
      setView("all");
      setTypeFilter("ALL");
      setSelectedIndex(index);
      setActiveEdit({ rowIndex: index, field: "content" });
      setActiveCell(`A${index + 2}`);
    }} />;

  return (
    <section className="flex flex-col gap-3 text-[var(--color-on-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
          <Folder className="size-3.5" aria-hidden="true" />
          <Link to={basePath} className="hover:text-[var(--color-primary)]">
            Assessment
          </Link>
          <ChevronRight className="size-3 text-[var(--color-outline-variant)]" aria-hidden="true" />
          <Link to={`${basePath}/question-bank`} className="hover:text-[var(--color-primary)]">
            Ngân hàng câu hỏi
          </Link>
          <ChevronRight className="size-3 text-[var(--color-outline-variant)]" aria-hidden="true" />
          <span className="font-semibold text-[var(--color-primary)]">Soạn câu hỏi trên bảng</span>
        </nav>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="secondary" size="sm" onClick={handleValidate}>
            <ListChecks className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            Kiểm tra
          </Button>
          <Button type="button" size="sm" onClick={handleSaveDraft}>
            <Save className="size-3.5" aria-hidden="true" />
            Lưu nội dung
          </Button>
          <Button type="button" size="sm" onClick={handleValidate}>
            <CloudUpload className="size-3.5" aria-hidden="true" />
            Tạo bài đánh giá
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 py-2 shadow-[var(--shadow-card)]">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded bg-[#107c41] text-white">
            <Table2 className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              Ngân hàng câu hỏi
              <span className="ml-2 rounded-full bg-[var(--color-primary-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                Đang soạn
              </span>
            </p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">
              Dán từ Excel hoặc kéo số dòng để thêm câu (tối đa {MAX_QUESTIONS}). Cột type đổi form từng câu.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
          <Pencil className="size-3" aria-hidden="true" />
          {savedNote || "Có thể chỉnh sửa"}
        </span>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-1">
          <div className="flex flex-wrap gap-1">
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
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-[var(--color-surface-card)] font-semibold text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]/20"
                      : "font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "rounded px-1 py-0.5 text-[10px] font-semibold",
                      active
                        ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                        : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
                    )}
                  >
                    {tab.count} câu
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setView("schema")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                view === "schema"
                  ? "bg-[var(--color-surface-card)] font-semibold text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]/20"
                  : "font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]",
              )}
            >
              Từ điển Schema
              <span className="rounded bg-[var(--color-surface-container)] px-1 py-0.5 text-[10px] font-semibold">
                {DICTIONARY_ROWS.length} cột
              </span>
            </button>
          </div>
          {view === "all" && (
            <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion("TRAC_NGHIEM_DON")}>
              <Plus className="size-3.5" aria-hidden="true" />
              Thêm câu
            </Button>
          )}
        </div>

        {view === "all" && (
          <>
            <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2 py-1.5">
              <div className="flex h-7 min-w-14 items-center justify-center rounded bg-[var(--color-surface-card)] px-2 font-mono text-xs font-semibold text-[var(--color-primary)]">
                {activeCell}
              </div>
              <span className="font-mono text-xs italic text-[var(--color-on-surface-variant)]">fx</span>
              <input
                className="h-7 min-w-0 flex-1 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-2 font-mono text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                value={formula}
                onChange={(event) => applyEdit(event.target.value)}
                onPasteCapture={handleTablePaste}
                disabled={!activeEdit}
                placeholder="Chọn một ô để sửa · Ctrl+C sao chép · Ctrl+V dán từ Excel"
                aria-label="Thanh sửa nội dung ô"
              />
              <span className="shrink-0 font-mono text-[10px] text-[var(--color-on-surface-variant)]">
                {questions.length}/{MAX_QUESTIONS}
              </span>
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
                        <HeaderCell label="chi tiết theo type" />
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
                        <HeaderCell label="khung (tuỳ chọn)" />
                        <HeaderCell label="rubric 3 mức *" />
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
                            Kéo chuột tới dòng này để thêm câu hỏi trống (tối đa {MAX_QUESTIONS})
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
                          title="Kéo chuột lên/xuống để chọn nhiều dòng và thêm dòng trống"
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
                          {row.content || <span className="italic text-[var(--color-outline)]">Nhập câu hỏi...</span>}
                        </EditCell>

                        <td className="px-1.5 py-1.5 align-middle">
                          <TypeSelect value={row.kind} onChange={(kind) => changeKind(rowIndex, kind)} />
                        </td>

                        {showAllColumns && (
                          <>
                            <EditCell
                              selected={isSelected(rowIndex, "score")}
                              value={row.score}
                              onSelect={pick("score", "C")}
                              onChange={applyEdit}
                              className="text-center font-mono font-semibold"
                            >
                              {row.score}
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
                            <Cell title={detailPreview(row)} className="text-[var(--color-on-surface-variant)]">
                              {detailPreview(row)}
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
                                    Thiếu rubric
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
              <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", typeBadgeClass(selectedQuestion.kind))}>
                    Form {typeMeta(selectedQuestion.kind).label}
                  </span>
                  <span className="text-[11px] text-[var(--color-on-surface-variant)]">
                    Đổi type trên dòng để chuyển sang form khác.
                  </span>
                </div>
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
                  <table className="w-full min-w-[720px] table-fixed border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[var(--color-surface-container)] text-[10px] font-semibold">
                        <HeaderCell label="option_a *" />
                        <HeaderCell label="option_b *" />
                        <HeaderCell label="option_c" />
                        <HeaderCell label="option_d" />
                        <HeaderCell label="answer *" highlight="answer" />
                        <HeaderCell label={selectedQuestion.kind === "NHIEU_DAP_AN" ? "policy" : "giải thích"} />
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {(["optionA", "optionB", "optionC", "optionD"] as const).map((field, optionIndex) => (
                          <td key={field} className="border-t border-[var(--color-surface-container)] px-1.5 py-1.5">
                            <input
                              value={selectedQuestion[field]}
                              onChange={(event) => patchQuestion(selectedIndex, { [field]: event.target.value })}
                              onPasteCapture={(event) => handleChoiceFormPaste(field, event)}
                              className="w-full rounded border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-1.5 py-1 font-mono text-[11px] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                              placeholder={String.fromCharCode(65 + optionIndex)}
                              aria-label={`Phương án ${String.fromCharCode(65 + optionIndex)}`}
                            />
                          </td>
                        ))}
                        <td className="border-t border-[var(--color-surface-container)] bg-emerald-50 px-1.5 py-1.5">
                          <input
                            value={selectedQuestion.answer}
                            onChange={(event) => patchQuestion(selectedIndex, { answer: event.target.value })}
                            onPasteCapture={(event) => handleChoiceFormPaste("answer", event)}
                            className="w-full rounded border border-[var(--color-border-default)] bg-white px-1.5 py-1 text-center font-mono text-[11px] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            placeholder={selectedQuestion.kind === "NHIEU_DAP_AN" ? "A,C" : "A"}
                            aria-label="Đáp án đúng"
                          />
                        </td>
                        <td className="border-t border-[var(--color-surface-container)] px-1.5 py-1.5">
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
                            className="w-full rounded border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-1.5 py-1 text-[11px] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            aria-label="Chi tiết chấm điểm"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedQuestion && isSubjectiveKind(selectedQuestion.kind) && (
              <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-2 py-1 text-[11px] font-semibold text-white">
                      <Code2 className="size-3.5" aria-hidden="true" />
                      {selectedQuestion.kind === "TU_LUAN_CODE" ? "Form tự luận code" : "Form tự luận lý thuyết"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-card)] px-2 py-0.5 ring-1 ring-[var(--color-border-default)]">
                      <Clock3 className="size-3" aria-hidden="true" />
                      {selectedQuestion.timeLimit || "--"}
                    </span>
                    <span className="rounded-full bg-[var(--color-surface-card)] px-2 py-0.5 font-mono font-semibold text-[var(--color-primary)] ring-1 ring-[var(--color-border-default)]">
                      {selectedQuestion.score || "0"} điểm
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">Đề bài</span>
                      <textarea
                        value={selectedQuestion.content}
                        onChange={(event) => patchQuestion(selectedIndex, { content: event.target.value })}
                        rows={2}
                        className="resize-y rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">Kỹ năng</span>
                        <input
                          value={selectedQuestion.skill}
                          onChange={(event) => patchQuestion(selectedIndex, { skill: event.target.value })}
                          className="h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">Ngôn ngữ</span>
                        <input
                          value={selectedQuestion.language}
                          onChange={(event) => patchQuestion(selectedIndex, { language: event.target.value })}
                          className="h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">Rubric 3 mức</p>
                      {selectedQuestion.rubric.map((item) => (
                        <textarea
                          key={item.level}
                          value={item.text}
                          onChange={(event) =>
                            patchQuestion(selectedIndex, {
                              rubric: selectedQuestion.rubric.map((rubricItem) =>
                                rubricItem.level === item.level ? { ...rubricItem, text: event.target.value } : rubricItem,
                              ),
                            })
                          }
                          rows={2}
                          className="w-full resize-y rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2 py-1.5 font-mono text-[11px] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[#0f172a] p-3 text-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-slate-300">
                        {selectedQuestion.kind === "TU_LUAN_CODE"
                          ? "Starter code (tuỳ chọn — có thể để trống)"
                          : "Khung lý thuyết (tuỳ chọn — có thể để trống)"}
                      </p>
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                        {selectedQuestion.language || (selectedQuestion.kind === "TU_LUAN_CODE" ? "Code" : "Theory")}
                      </span>
                    </div>
                    <textarea
                      value={selectedQuestion.snippet}
                      onChange={(event) => patchQuestion(selectedIndex, { snippet: event.target.value })}
                      rows={12}
                      spellCheck={false}
                      placeholder={
                        selectedQuestion.kind === "TU_LUAN_CODE"
                          ? "// Không bắt buộc — để trống nếu ứng viên tự viết từ đầu"
                          : "Không bắt buộc — gợi ý khung trả lời cho ứng viên (có thể để trống)"
                      }
                      className="min-h-48 flex-1 resize-y rounded-md border border-slate-700 bg-[#020617] px-3 py-2 font-mono text-[12px] leading-relaxed text-emerald-200 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/60"
                    />
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Đáp án mẫu * (đáp án chính để so sánh — ẩn với ứng viên)
                      </span>
                      <textarea
                        value={selectedQuestion.sample}
                        onChange={(event) => patchQuestion(selectedIndex, { sample: event.target.value })}
                        onPaste={(event) => {
                          const text = event.clipboardData.getData("text/plain");
                          if (!isSampleAnswerOnlyLine(text) && !/^(?:đáp\s*án\s*mẫu|sample)/i.test(text.trim())) return;
                          event.preventDefault();
                          patchQuestion(selectedIndex, { sample: stripSamplePrefix(text) });
                          setCapacityNote("Đã dán đáp án mẫu.");
                        }}
                        rows={3}
                        placeholder="Bắt buộc — đáp án chuẩn do recruiter đưa ra để đối chiếu khi chấm"
                        className="resize-y rounded-md border border-slate-700 bg-[#020617] px-3 py-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/60"
                      />
                    </label>
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
                  <HeaderCell label="Cột" />
                  <HeaderCell label="Trường Schema" />
                  <HeaderCell label="Trạng thái" />
                  <HeaderCell label="Kiểu" />
                  <HeaderCell label="Giá trị hợp lệ" />
                  <HeaderCell label="Quy tắc" highlight="primary" />
                  <HeaderCell label="Ví dụ đúng / sai" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-surface-container)]">
                {DICTIONARY_ROWS.map((row, index) => {
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 py-1.5 text-[11px] text-[var(--color-on-surface-variant)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              <strong className="text-[var(--color-on-surface)]">
                {view === "schema"
                  ? "Schema Data Dictionary"
                  : capacityNote || "Ctrl+C sao chép · Ctrl+V dán · Ctrl+Z hoàn tác · kéo số dòng để thêm câu"}
              </strong>
            </span>
            <span>
              {questions.length}/{MAX_QUESTIONS} câu · Đơn {counts.single} · Nhiều {counts.multi} · Tự luận{" "}
              {counts.subjective}
            </span>
          </div>
          {selectedQuestion && view === "all" && (
            <span className="text-[11px]">
              Đang soạn: {typeMeta(selectedQuestion.kind).label}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <article className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-[var(--shadow-card)]">
          <div className="mb-1.5 flex items-center gap-2">
            <ListChecks className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Cách dùng</h3>
          </div>
          <ul className="space-y-1 text-[11px] text-[var(--color-on-surface-variant)]">
            <li>
              <strong className="text-[var(--color-on-surface)]">Dán Excel:</strong> dán đúng ô đang chọn. Clipboard
              có tab/Excel hoặc chuỗi dính liền có type (vd.{" "}
              <span className="font-mono">…Authorization.Tự luận3.0MediumSecurity</span>) sẽ tách cột content / type /
              score / difficulty / skill. Option A–D chỉ khi đứng ở cột option/đáp án.
            </li>
            <li>
              <strong className="text-[var(--color-on-surface)]">Tự luận:</strong> dán thêm dòng{" "}
              <span className="font-mono">Đáp án mẫu: …</span> (cùng lần dán hoặc dán vào ô đáp án mẫu) — hệ thống bỏ
              tiền tố và ghi vào sample.
            </li>
            <li>
              <strong className="text-[var(--color-on-surface)]">Sao chép:</strong> Ctrl+C sao chép nội dung ô đang chọn
            </li>
            <li>
              <strong className="text-[var(--color-on-surface)]">Hoàn tác:</strong> Ctrl+Z để đảo ngược dán / sửa gần nhất
            </li>
            <li>
              <strong className="text-[var(--color-on-surface)]">Kéo chuột:</strong> giữ kéo cột số dòng xuống để thêm
              dòng trống
            </li>
          </ul>
        </article>
        <article className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-[var(--shadow-card)]">
          <div className="mb-1.5 flex items-center gap-2">
            <Code2 className="size-4 text-[var(--color-secondary)]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Rubric 3 mức</h3>
          </div>
          <p className="rounded bg-[var(--color-surface-container-low)] p-2 font-mono text-[10px] leading-relaxed">
            [Xuất sắc 9-10đ] · [Đạt 6-8đ] · [Chưa đạt 0-5đ]
          </p>
        </article>
        <article className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-[var(--shadow-card)]">
          <div className="mb-1.5 flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#005a82]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">AI kiểm tra</h3>
          </div>
          <ul className="space-y-1 text-[11px] text-[var(--color-on-surface-variant)]">
            <li className="flex items-center gap-1">
              <Check className="size-3 text-emerald-500" aria-hidden="true" />
              Đáp án rỗng / sai regex
            </li>
            <li className="flex items-center gap-1">
              <Check className="size-3 text-emerald-500" aria-hidden="true" />
              Rubric tự luận thiếu tiêu chí
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
