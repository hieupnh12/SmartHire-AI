import { useRef, useState } from "react";
import { Bold, Code, Eye, Italic, List, PencilLine } from "lucide-react";
import type { CandidateQuestion, SavedAnswer } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput } from "@/components/ux/assessmentUi";
import { ExamMarkdown } from "./ExamMarkdown";

export function CandidateEssayWorkspace({
  question,
  answer,
  onChange,
  locked,
  number,
  draftSavedAt,
  draftError,
}: {
  question: CandidateQuestion;
  answer: SavedAnswer | undefined;
  onChange: (answer: SavedAnswer) => void;
  locked: boolean;
  number?: number;
  draftSavedAt?: number;
  draftError?: boolean;
}) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const text = answer?.answerText ?? "";
  const format = (prefix: string, suffix = prefix) => {
    if (locked || !editor.current) return;
    const start = editor.current.selectionStart;
    const end = editor.current.selectionEnd;
    const selection = text.slice(start, end) || "nội dung";
    const next = text.slice(0, start) + prefix + selection + suffix + text.slice(end);
    if (next.length > 10000) return;
    onChange({ questionId: question.id, answerText: next });
    requestAnimationFrame(() => {
      editor.current?.focus();
      editor.current?.setSelectionRange(start + prefix.length, start + prefix.length + selection.length);
    });
  };

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
        <div className="shrink-0 border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="font-semibold">
            Câu hỏi tự luận {number ?? question.questionOrder + 1} · {question.points} điểm
          </h2>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <ExamMarkdown text={question.questionText} />
          <aside className="space-y-1 rounded-lg bg-[var(--color-primary-subtle)] p-3 text-sm">
            <h3 className="font-medium">Gợi ý trình bày</h3>
            <p className="leading-6 text-[var(--color-on-surface-variant)]">
              Trả lời đúng trọng tâm, giải thích nguyên lý và phân tích ưu/nhược điểm. Liên hệ ví dụ thực tế và nêu rõ giả định của bạn.
            </p>
          </aside>
        </div>
      </section>
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)] px-3 py-2">
          <div role="group" aria-label="Định dạng câu trả lời" className="flex flex-wrap gap-1">
            <Button variant="ghost" aria-label="In đậm" disabled={locked || preview} onClick={() => format("**")}>
              <Bold className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" aria-label="In nghiêng" disabled={locked || preview} onClick={() => format("*")}>
              <Italic className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" aria-label="Code inline" disabled={locked || preview} onClick={() => format("`")}>
              <Code className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" aria-label="Gạch đầu dòng" disabled={locked || preview} onClick={() => format("\n- ", "")}>
              <List className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Button variant="secondary" aria-pressed={preview} onClick={() => setPreview(!preview)}>
            {preview ? <PencilLine className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            {preview ? "Soạn thảo" : "Xem trước"}
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <label htmlFor={`essay-${question.id}`} className="mb-2 shrink-0 text-sm font-medium">
            Câu trả lời tự luận (hỗ trợ nhập Markdown)
          </label>
          {preview ? (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-[var(--color-border-default)] p-3">
              <ExamMarkdown text={text || "Chưa có nội dung trả lời."} />
            </div>
          ) : (
            <div className="relative min-h-0 flex-1">
              <textarea
                ref={editor}
                id={`essay-${question.id}`}
                className={`${assessmentInput} absolute inset-0 h-full resize-none leading-7`}
                value={text}
                maxLength={10000}
                disabled={locked}
                aria-describedby={`essay-status-${question.id}`}
                onChange={(event) => onChange({ questionId: question.id, answerText: event.target.value })}
              />
            </div>
          )}
        </div>
        <footer
          id={`essay-status-${question.id}`}
          className="shrink-0 space-y-1 border-t border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-4 py-2 text-xs sm:px-5"
        >
          <p>
            {text.trim().split(/\s+/).filter(Boolean).length} từ · {text.length}/10.000 ký tự
          </p>
          <p role="status" className={draftError ? "text-[var(--color-status-danger)]" : "text-[var(--color-primary)]"}>
            {draftError
              ? "Không thể lưu nháp trên thiết bị. Giữ trang mở và lưu lên máy chủ."
              : draftSavedAt
                ? `Đã tự động lưu nháp trên thiết bị lúc ${new Date(draftSavedAt).toLocaleTimeString("vi-VN")}`
                : "Nháp lưu trên thiết bị sau 1 giây; đồng bộ máy chủ mỗi 10 giây."}
          </p>
        </footer>
      </section>
    </div>
  );
}
