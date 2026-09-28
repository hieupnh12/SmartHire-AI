import { Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared question kinds for recruiter preview and candidate exam UI. */
export type AssessmentQuestionKind =
  | "TRAC_NGHIEM_DON"
  | "NHIEU_DAP_AN"
  | "TU_LUAN_CODE"
  | "TINH_HUONG_SYSTEM";

export type AnswerOption = {
  id: string;
  label: string;
  body: string;
  subtitle?: string;
};

export type QuestionAnswerValue = string;

export const QUESTION_KIND_LABEL: Record<AssessmentQuestionKind, string> = {
  TRAC_NGHIEM_DON: "Trắc nghiệm 1 đáp án",
  NHIEU_DAP_AN: "Nhiều đáp án",
  TU_LUAN_CODE: "Tự luận code",
  TINH_HUONG_SYSTEM: "Tự luận lý thuyết",
};

export function isChoiceKind(kind: AssessmentQuestionKind) {
  return kind === "TRAC_NGHIEM_DON" || kind === "NHIEU_DAP_AN";
}

export function isMultiChoiceKind(kind: AssessmentQuestionKind) {
  return kind === "NHIEU_DAP_AN";
}

export function isSubjectiveKind(kind: AssessmentQuestionKind) {
  return kind === "TU_LUAN_CODE" || kind === "TINH_HUONG_SYSTEM";
}

/** Normalize multi-select keys from "A,C" / "A; C" into sorted unique letters. */
export function parseMultiAnswer(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return [
    ...new Set(
      value
        .trim()
        .toUpperCase()
        .split(/[,;/|\s]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ].sort();
}

export function formatMultiAnswer(letters: string[]): string {
  return [...new Set(letters.map((letter) => letter.toUpperCase()).filter(Boolean))].sort().join(",");
}

export function hasAnswerValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

type Props = {
  kind: AssessmentQuestionKind;
  questionKey: string | number;
  options?: AnswerOption[];
  /** Candidate/preview selection. Multi = "A,C"; single = "A"; essay = free text. */
  value?: QuestionAnswerValue | null;
  onChange?: (value: QuestionAnswerValue) => void;
  /** Audit: reveal correct keys (single letter or "A,C") and mark options. */
  mode?: "candidate" | "audit";
  correctAnswer?: string;
  /** Essay audit extras */
  sampleAnswer?: string;
  codeSnippet?: string;
  language?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function QuestionAnswerPanel({
  kind,
  questionKey,
  options = [],
  value = null,
  onChange,
  mode = "candidate",
  correctAnswer = "",
  sampleAnswer = "",
  codeSnippet = "",
  language = "",
  placeholder,
  disabled = false,
}: Props) {
  const interactive = mode === "candidate" && !disabled && Boolean(onChange);
  const correctKeys = parseMultiAnswer(correctAnswer);

  if (isSubjectiveKind(kind)) {
    const text = value ?? "";
    return (
      <div className="space-y-3">
        {codeSnippet.trim() && (
          <div className="overflow-hidden rounded-xl bg-[var(--color-inverse-surface,#213145)] text-[var(--color-inverse-on-surface,#eaf1ff)]">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
              <span className="font-mono text-[11px] font-semibold text-[var(--color-tertiary-fixed,#c9e6ff)]">
                {kind === "TU_LUAN_CODE" ? "Đoạn mã tham chiếu" : "Ngữ cảnh tình huống"}
              </span>
              {language.trim() && <span className="font-mono text-[11px] opacity-70">{language}</span>}
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed opacity-90">
              <code>{codeSnippet}</code>
            </pre>
          </div>
        )}
        {mode === "audit" ? (
          <div className="space-y-3 rounded-xl bg-[var(--color-surface-container-low)] p-4">
            <h4 className="text-sm font-semibold">Đáp án mẫu / gợi ý chấm</h4>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-on-surface-variant)]">
              {sampleAnswer.trim() || correctAnswer.trim() || "Chưa có đáp án mẫu cho câu tự luận này."}
            </p>
          </div>
        ) : (
          <label className="block space-y-2">
            <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
              {kind === "TU_LUAN_CODE" ? "Viết câu trả lời / mã của bạn" : "Viết câu trả lời tự luận"}
            </span>
            <textarea
              name={`answer-${questionKey}`}
              rows={8}
              disabled={!interactive}
              value={text}
              placeholder={
                placeholder ??
                (kind === "TU_LUAN_CODE"
                  ? "Nhập mã hoặc giải thích lời giải…"
                  : "Nhập câu trả lời của bạn…")
              }
              onChange={(event) => onChange?.(event.target.value)}
              className="w-full resize-y rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70"
            />
            <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
              {text.trim() ? `${text.trim().length} ký tự` : "Chưa nhập câu trả lời"}
            </span>
          </label>
        )}
      </div>
    );
  }

  const multi = isMultiChoiceKind(kind);
  const selected = multi ? parseMultiAnswer(value) : value?.trim() ? [value.trim().toUpperCase()] : [];

  const toggleMulti = (id: string) => {
    if (!onChange) return;
    const upper = id.toUpperCase();
    const next = selected.includes(upper) ? selected.filter((item) => item !== upper) : [...selected, upper];
    onChange(formatMultiAnswer(next));
  };

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="sr-only">
        {multi ? "Chọn một hoặc nhiều đáp án" : "Chọn một đáp án"}
      </legend>
      {multi && mode === "candidate" && (
        <p className="text-xs text-[var(--color-on-surface-variant)]">Có thể chọn nhiều đáp án đúng.</p>
      )}
      {options.map((option) => {
        const active = selected.includes(option.id.toUpperCase());
        const correct = mode === "audit" && correctKeys.includes(option.id.toUpperCase());
        return (
          <label
            key={option.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-sm transition-colors",
              correct
                ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
                : active && mode === "candidate"
                  ? "border-[var(--color-primary)] bg-[var(--color-surface-container-low)]"
                  : "border-[var(--color-border-default)]",
              interactive && "cursor-pointer hover:bg-[var(--color-surface-container-low)]",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-7 shrink-0 place-items-center text-xs font-semibold",
                multi ? "rounded-md" : "rounded-full",
                active || correct
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]",
              )}
            >
              {active || correct ? <Check className="size-4" aria-hidden="true" /> : option.label}
            </span>
            <span className="flex-1 space-y-1">
              {option.subtitle && (
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                  {option.subtitle}
                </span>
              )}
              <span className="block whitespace-pre-wrap break-words leading-6">
                <span className="font-semibold">{option.label}. </span>
                {option.body}
              </span>
              {correct && (
                <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Đáp án chính xác
                </span>
              )}
            </span>
            {interactive && (
              <input
                type={multi ? "checkbox" : "radio"}
                name={`preview-${questionKey}`}
                aria-label={`Đáp án ${option.label}`}
                checked={active}
                onChange={() => {
                  if (multi) toggleMulti(option.id);
                  else onChange?.(option.id.toUpperCase());
                }}
                className="mt-1 accent-[var(--color-primary)]"
              />
            )}
          </label>
        );
      })}
      {!options.length && (
        <p className="rounded-xl bg-[var(--color-surface-container-low)] p-4 text-sm text-[var(--color-on-surface-variant)]">
          Câu hỏi chưa có phương án A–D.
        </p>
      )}
    </fieldset>
  );
}
