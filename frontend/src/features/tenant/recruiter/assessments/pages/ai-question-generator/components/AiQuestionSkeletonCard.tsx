import { cn } from "@/lib/utils";

interface AiQuestionSkeletonCardProps {
  index: number;
  questionType?: string;
  className?: string;
}

export function AiQuestionSkeletonCard({
  index,
  questionType = "MCQ",
  className,
}: AiQuestionSkeletonCardProps) {
  const isCoding = questionType === "CODING";
  const isEssay = questionType === "ESSAY";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white p-5 shadow-sm space-y-4.5 dark:border-blue-900/40 dark:bg-slate-900/90",
        className,
      )}
    >
      {/* Shimmer sweep animation overlay */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-blue-500/5 to-transparent" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="size-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-5 w-20 rounded-md bg-blue-100 dark:bg-blue-950 animate-pulse" />
          <div className="h-4 w-14 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-16 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="size-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>

      {/* Question prompt lines */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium dark:text-blue-400">
            <span className="inline-block size-1.5 rounded-full bg-blue-600 animate-ping" />
            <span>Đang soạn thảo câu #{index + 1}...</span>
          </div>
        </div>
        <div className="h-4 w-11/12 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-4 w-4/5 rounded bg-slate-150 dark:bg-slate-800/80 animate-pulse" />
      </div>

      {/* Body preview (Options or Code or Rubric) */}
      {isCoding ? (
        <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-900 p-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
            <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="h-16 w-full rounded bg-slate-800/60 animate-pulse" />
        </div>
      ) : isEssay ? (
        <div className="space-y-2 rounded-xl border border-amber-200/50 bg-amber-50/30 p-3 dark:border-amber-900/30 dark:bg-amber-950/10">
          <div className="h-3 w-32 rounded bg-amber-200/60 dark:bg-amber-900/40 animate-pulse" />
          <div className="h-10 w-full rounded bg-amber-100/40 dark:bg-amber-950/30 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {[0, 1, 2, 3].map((optIdx) => (
            <div
              key={optIdx}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div className="size-3.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div
                className="h-3.5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"
                style={{ width: `${60 + (optIdx % 3) * 15}%` }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer explanation shimmer */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/70">
        <div className="size-3 rounded-full bg-blue-100 dark:bg-blue-950 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-slate-150 dark:bg-slate-800/60 animate-pulse" />
      </div>
    </div>
  );
}
