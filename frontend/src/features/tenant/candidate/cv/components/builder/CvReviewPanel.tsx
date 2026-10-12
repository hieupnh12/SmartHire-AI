import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { CvReview, ReviewTarget } from "../../utils/reviewCv";

const selectors: Record<ReviewTarget["kind"], string> = {
  field: "data-cv-field",
  section: "data-cv-section",
  item: "data-cv-item",
};

function focusTarget(target: ReviewTarget) {
  const element = document.querySelector<HTMLElement>(`[${selectors[target.kind]}="${CSS.escape(target.id)}"]`);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.classList.add("cv-review-flash");
  window.setTimeout(() => element.classList.remove("cv-review-flash"), 1600);
  element.querySelector<HTMLElement>('[contenteditable="true"]')?.focus({ preventScroll: true });
}

export function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

export function CvReviewPanel({ review, pages, onClose }: { review: CvReview; pages: number; onClose: () => void }) {
  const errors = review.issues.filter((issue) => issue.level === "error");
  const warnings = review.issues.filter((issue) => issue.level === "warning");
  return (
    <aside aria-label="Đánh giá CV" className="cv-print-hidden fixed bottom-4 right-4 top-20 z-40 flex w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Đánh giá CV</h2>
          <p className="mt-0.5 text-xs text-slate-500">Theo bộ quy tắc CV IT, cập nhật khi bạn gõ. Chỉ để tham khảo.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="size-4" aria-hidden="true" /></button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-bold ${scoreTone(review.score)}`}>{review.score}</span>
          <span className="pb-1 text-sm text-slate-500">/ 100 · {errors.length} lỗi, {warnings.length} nhắc nhở</span>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-2"><dt className="text-[11px] text-slate-500">Chỉ số định lượng</dt><dd className="text-lg font-semibold text-slate-800">{review.metrics}</dd></div>
          <div className="rounded-xl bg-slate-50 px-2 py-2"><dt className="text-[11px] text-slate-500">Số trang</dt><dd className="text-lg font-semibold text-slate-800">{pages}/{review.pageLimit}</dd></div>
          <div className="rounded-xl bg-slate-50 px-2 py-2"><dt className="text-[11px] text-slate-500">Kinh nghiệm</dt><dd className="text-lg font-semibold text-slate-800">{review.years === null ? "—" : `${Math.round(review.years * 10) / 10} năm`}</dd></div>
        </dl>
        {review.issues.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" />CV đã đạt các quy tắc cơ bản.</p>
        ) : (
          <ul className="space-y-2">
            {[...errors, ...warnings].map((issue) => {
              const Icon = issue.level === "error" ? AlertCircle : AlertTriangle;
              const tone = issue.level === "error" ? "text-red-600" : "text-amber-600";
              const content = <><Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden="true" /><span>{issue.message}</span></>;
              return (
                <li key={issue.id}>
                  {issue.target ? (
                    <button type="button" onClick={() => focusTarget(issue.target!)} className="flex w-full gap-2 rounded-xl border border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:border-[var(--color-primary)] hover:bg-slate-50">{content}</button>
                  ) : (
                    <p className="flex gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700">{content}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
