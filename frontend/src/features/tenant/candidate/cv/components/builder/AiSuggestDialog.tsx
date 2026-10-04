import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import type { CvWritingRequest } from "@/api/types/cv";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { getApiErrorMessage } from "@/lib/axios";

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Summary → one paragraph; description → bullet list (one point per line). */
export function suggestionToHtml(kind: CvWritingRequest["kind"], text: string) {
  if (kind === "summary") return `<p>${escapeHtml(text)}</p>`;
  const lines = text.split("\n").map((line) => line.replace(/^[\s•\-*]+/, "").trim()).filter(Boolean);
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

export function AiSuggestDialog({ request, onApply, onClose }: {
  request: CvWritingRequest;
  onApply: (html: string) => void;
  onClose: () => void;
}) {
  const suggest = useMutation({ mutationFn: () => cvApi.suggest(request) });
  const run = suggest.mutate;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  const suggestions = suggest.data?.data.suggestions ?? [];

  return createPortal(
    <div className="cv-print-hidden">
      <DetailDialog open title={request.kind === "summary" ? "AI gợi ý phần giới thiệu" : "AI gợi ý mô tả"} onClose={onClose}>
        <p className="text-sm text-slate-500">AI chỉ diễn đạt lại thông tin bạn đã nhập. Thay các chỗ như <code>[X%]</code> bằng số liệu thật trước khi lưu.</p>
        {suggest.isPending && (
          <p className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Đang tạo gợi ý…</p>
        )}
        {suggest.isError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{getApiErrorMessage(suggest.error)}</p>}
        <ul className="mt-4 space-y-3">
          {suggestions.map((text, index) => (
            <li key={index} className="rounded-2xl border border-slate-200 p-4">
              {request.kind === "summary" ? (
                <p className="text-sm leading-relaxed text-slate-700">{text}</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                  {text.split("\n").filter((line) => line.trim()).map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^[\s•\-*]+/, "")}</li>)}
                </ul>
              )}
              <button
                type="button"
                onClick={() => {
                  onApply(suggestionToHtml(request.kind, text));
                  onClose();
                }}
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
              >
                <Sparkles className="size-4" aria-hidden="true" />Dùng gợi ý này
              </button>
            </li>
          ))}
        </ul>
        {!suggest.isPending && (
          <button type="button" onClick={() => run()} className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
            <RefreshCw className="size-4" aria-hidden="true" />Tạo gợi ý khác
          </button>
        )}
      </DetailDialog>
    </div>,
    document.body,
  );
}
