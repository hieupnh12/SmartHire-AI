import { ExcelImportReview } from "../components/ExcelImportReview";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useState, type ClipboardEvent, type ReactNode } from "react";
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
  const value = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (!value) return fallback;
  const direct = QUESTION_TYPE_OPTIONS.find((item) => item.value === value);
  if (direct) return direct.value;
  if (value.includes("NHIEU") || value.includes("MULTI") || value === "NHIỀU" || value === "NHIEU") {
    return "NHIEU_DAP_AN";
  }
  if (value.includes("SYSTEM") || value.includes("TINH_HUONG")) return "TINH_HUONG_SYSTEM";
  if (value.includes("CODE") || value.includes("TU_LUAN")) return "TU_LUAN_CODE";
  if (value.includes("DON") || value.includes("SINGLE") || value === "ĐƠN" || value === "DON") {
    return "TRAC_NGHIEM_DON";
  }
  const byLabel = QUESTION_TYPE_OPTIONS.find((item) => item.label.toUpperCase() === raw.trim().toUpperCase());
  return byLabel?.value ?? fallback;
}

function parseClipboardMatrix(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
  return lines.map((line) => line.split("\t"));
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
  if (row.kind === "TU_LUAN_CODE") {
    return row.snippet ? `Code: ${row.snippet.split("\n")[0]}…` : "Chưa có starter code";
  }
  return row.snippet ? row.snippet.split("\n")[0] : "Chưa có yêu cầu";
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
  children,
  className,
  title,
}: {
  selected: boolean;
  value: string;
  onSelect: () => void;
  onChange: (value: string) => void;
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
      title={selected ? "Đang sửa ô này" : title}
      onClick={onSelect}
    >
      {selected ? (
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
    const row = blankQuestion("TRAC_NGHIEM_DON");
    row.id = questionIdForIndex(0);
    return [row];
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>({ rowIndex: 0, field: "content" });
  const [activeCell, setActiveCell] = useState("A2");
  const [savedNote, setSavedNote] = useState("");
  const [rowDrag, setRowDrag] = useState<RowDragState | null>(null);
  const [capacityNote, setCapacityNote] = useState("");

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

  const formula = useMemo(() => {
    if (!activeEdit || !questions[activeEdit.rowIndex]) return "";
    const row = questions[activeEdit.rowIndex];
    if (activeEdit.field === "rubric") return row.rubric.map((item) => item.text).join(" | ");
    const value = row[activeEdit.field as keyof BankQuestion];
    return typeof value === "string" ? value : "";
  }, [activeEdit, questions]);

  function selectCell(rowIndex: number, field: string, colLetter: string, displayRow: number) {
    setSelectedIndex(rowIndex);
    setActiveEdit({ rowIndex, field });
    setActiveCell(`${colLetter}${displayRow}`);
    setSavedNote("");
    setCapacityNote("");
  }

  function patchQuestion(rowIndex: number, patch: Partial<BankQuestion>) {
    const { id: _ignoredId, ...safePatch } = patch;
    void _ignoredId;
    setQuestions((rows) => withAutoQuestionIds(rows.map((row, index) => (index === rowIndex ? { ...row, ...safePatch } : row))));
    setSavedNote("");
  }

  function applyRowFromCells(row: BankQuestion, cells: string[], mode: TypeFilter): BankQuestion {
    const fallbackKind = row.kind || defaultKindForFilter();
    if (cells.length === 1) {
      return { ...row, content: cells[0] ?? row.content };
    }

    if (mode === "ALL") {
      const kind = parseKind(cells[1] ?? "", fallbackKind);
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

    const kind = parseKind(
      cells[1] ?? "",
      mode === "NHIEU_DAP_AN" ? "NHIEU_DAP_AN" : isChoiceKind(fallbackKind) ? fallbackKind : "TRAC_NGHIEM_DON",
    );
    return {
      ...row,
      ...blankQuestion(kind),
      id: row.id,
      kind,
      content: cells[0] ?? row.content,
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
      policy: kind === "NHIEU_DAP_AN" ? row.policy || "Partial Credit" : "",
    };
  }

  function handleTablePaste(event: ClipboardEvent<HTMLElement>) {
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    const matrix = parseClipboardMatrix(text);
    const isMulti = matrix.length > 1 || (matrix[0]?.length ?? 0) > 1;
    if (!isMulti) return;

    event.preventDefault();
    const start = selectedIndex >= 0 ? selectedIndex : questions.length;
    const needed = start + matrix.length;
    const cappedNeeded = Math.min(needed, MAX_QUESTIONS);
    const usable = matrix.slice(0, Math.max(0, cappedNeeded - start));
    const kind = defaultKindForFilter();

    setQuestions((rows) => {
      const next = rows.length < cappedNeeded ? [...rows, ...makeBlankRows(cappedNeeded - rows.length, rows.length, kind)] : [...rows];
      usable.forEach((cells, offset) => {
        const index = start + offset;
        if (index >= MAX_QUESTIONS) return;
        next[index] = applyRowFromCells(next[index] ?? blankQuestion(kind), cells, typeFilter);
      });
      return withAutoQuestionIds(next);
    });

    setSelectedIndex(Math.min(start + usable.length - 1, MAX_QUESTIONS - 1));
    setActiveEdit({ rowIndex: start, field: "content" });
    setActiveCell(`A${start + 2}`);
    setCapacityNote(
      needed > MAX_QUESTIONS
        ? `Đã dán ${usable.length} câu (cắt vì giới hạn ${MAX_QUESTIONS}).`
        : `Đã dán ${usable.length} câu từ clipboard.`,
    );
    setTypeFilter("ALL");
    setView("all");
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
    setQuestions((rows) => withAutoQuestionIds([...rows, next]));
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

  const filterTabs: { id: TypeFilter; label: string; count: number }[] = [
    { id: "ALL", label: "Tất cả câu hỏi", count: counts.all },
    { id: "TRAC_NGHIEM_DON", label: "Trắc nghiệm đơn", count: counts.single },
    { id: "NHIEU_DAP_AN", label: "Nhiều đáp án", count: counts.multi },
    { id: "SUBJECTIVE", label: "Tự luận & Rubric", count: counts.subjective },
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
          <Button type="button" size="sm" onClick={() => setSavedNote("Đã lưu nội dung đang soạn trên bảng.")}>
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
                onPaste={handleTablePaste}
                disabled={!activeEdit}
                placeholder="Chọn một ô để sửa · Ctrl+V dán nhiều dòng từ Excel"
                aria-label="Thanh sửa nội dung ô"
              />
              <span className="shrink-0 font-mono text-[10px] text-[var(--color-on-surface-variant)]">
                {questions.length}/{MAX_QUESTIONS}
              </span>
            </div>

            <div className="overflow-x-auto" onPaste={handleTablePaste}>
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
                        <HeaderCell label="starter / yêu cầu" />
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
                      {selectedQuestion.kind === "TU_LUAN_CODE" ? "Form tự luận code" : "Form tình huống hệ thống"}
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
                          ? "Starter code (ứng viên viết tiếp)"
                          : "Yêu cầu / ràng buộc kỹ thuật"}
                      </p>
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                        {selectedQuestion.language || "Code"}
                      </span>
                    </div>
                    <textarea
                      value={selectedQuestion.snippet}
                      onChange={(event) => patchQuestion(selectedIndex, { snippet: event.target.value })}
                      rows={12}
                      spellCheck={false}
                      className="min-h-48 flex-1 resize-y rounded-md border border-slate-700 bg-[#020617] px-3 py-2 font-mono text-[12px] leading-relaxed text-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500/60"
                    />
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-300">Đáp án mẫu (ẩn với ứng viên)</span>
                      <textarea
                        value={selectedQuestion.sample}
                        onChange={(event) => patchQuestion(selectedIndex, { sample: event.target.value })}
                        rows={3}
                        className="resize-y rounded-md border border-slate-700 bg-[#020617] px-3 py-2 text-[11px] text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                  : capacityNote || "Ctrl+V dán nhiều dòng · kéo số dòng để thêm câu"}
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
              <strong className="text-[var(--color-on-surface)]">Dán Excel:</strong> Ctrl+V nhiều dòng → tự thêm câu (≤
              {MAX_QUESTIONS})
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
