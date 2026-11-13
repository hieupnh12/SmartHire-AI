import { useRef, useState } from "react";
import { Bold, Code, Eye, Italic, List, PencilLine } from "lucide-react";
import type { CandidateQuestion, SavedAnswer } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput } from "@/components/ux/assessmentUi";
import { formatNumber, formatTime, useLocale, useT } from "@/i18n";
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
  const t = useT();
  const locale = useLocale();
  const editor = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const text = answer?.answerText ?? "";
  const format = (prefix: string, suffix = prefix) => {
    if (locked || !editor.current) return;
    const start = editor.current.selectionStart;
    const end = editor.current.selectionEnd;
    const selection = text.slice(start, end) || t("candidate.assess.essay.defaultSelection");
    const next = text.slice(0, start) + prefix + selection + suffix + text.slice(end);
    if (next.length > 10000) return;
    onChange({ questionId: question.id, answerText: next });
    requestAnimationFrame(() => {
      editor.current?.focus();
      editor.current?.setSelectionRange(start + prefix.length, start + prefix.length + selection.length);
    });
  };
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 max-lg:grid-rows-[minmax(7.5rem,0.32fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:grid-rows-1">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
        <div className="shrink-0 border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="font-semibold">
            {t("candidate.assess.essay.heading", {
              number: number ?? question.questionOrder + 1,
              points: question.points,
            })}
          </h2>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <ExamMarkdown text={question.questionText} />
          <aside className="space-y-1 rounded-lg bg-[var(--color-primary-subtle)] p-3 text-sm">
            <h3 className="font-medium">{t("candidate.assess.essay.tipsHeading")}</h3>
            <p className="leading-6 text-[var(--color-on-surface-variant)]">
              {t("candidate.assess.essay.tipsBody")}
            </p>
          </aside>
        </div>
      </section>
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)] px-3 py-2">
          <div role="group" aria-label={t("candidate.assess.essay.toolbarAria")} className="flex flex-wrap gap-1">
            <Button variant="ghost" aria-label={t("candidate.assess.essay.boldAria")} disabled={locked || preview} onClick={() => format("**")}>
              <Bold className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" aria-label={t("candidate.assess.essay.italicAria")} disabled={locked || preview} onClick={() => format("*")}>
              <Italic className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" aria-label={t("candidate.assess.essay.inlineCodeAria")} disabled={locked || preview} onClick={() => format("`")}>
              <Code className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" aria-label={t("candidate.assess.essay.bulletListAria")} disabled={locked || preview} onClick={() => format("\n- ", "")}>
              <List className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Button variant="secondary" aria-pressed={preview} onClick={() => setPreview(!preview)}>
            {preview ? <PencilLine className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            {preview ? t("candidate.assess.essay.editMode") : t("candidate.assess.essay.previewMode")}
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <label htmlFor={`essay-${question.id}`} className="mb-2 shrink-0 text-sm font-medium">
            {t("candidate.assess.essay.answerLabel")}
          </label>
          {preview ? (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-[var(--color-border-default)] p-3">
              <ExamMarkdown text={text || t("candidate.assess.essay.emptyPreview")} />
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
            {t("candidate.assess.essay.wordAndCharCount", {
              words: formatNumber(wordCount, undefined, locale),
              chars: formatNumber(text.length, undefined, locale),
              max: formatNumber(10000, undefined, locale),
            })}
          </p>
          <p role="status" className={draftError ? "text-[var(--color-status-danger)]" : "text-[var(--color-primary)]"}>
            {draftError
              ? t("candidate.assess.essay.draftSaveError")
              : draftSavedAt
                ? t("candidate.assess.essay.draftSavedAt", {
                    time: formatTime(draftSavedAt, { hour: "2-digit", minute: "2-digit", second: "2-digit" }, locale),
                  })
                : t("candidate.assess.essay.draftHint")}
          </p>
        </footer>
      </section>
    </div>
  );
}
