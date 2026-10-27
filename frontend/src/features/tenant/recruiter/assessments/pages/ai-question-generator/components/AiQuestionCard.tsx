import { AlertTriangle, Sparkles, Trash2 } from "lucide-react";
import { assessmentInput } from "@/components/ux/assessmentUi";
import { cn } from "@/lib/utils";
import type { QuestionRequest } from "@/api/types/assessment";
import {
  asRubric,
  codingSummary,
  similarIds,
  type DraftItem,
} from "../types";

interface AiQuestionCardProps {
  item: DraftItem;
  index: number;
  isSelected: boolean;
  batchCount: number;
  busy: boolean;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onPatchDraft: (id: string, patch: Partial<QuestionRequest>) => void;
  onPatchOption: (
    id: string,
    optionIndex: number,
    patch: { optionText?: string; correct?: boolean },
  ) => void;
}

export function AiQuestionCard({
  item,
  index,
  isSelected,
  batchCount,
  busy,
  onToggleSelect,
  onRemove,
  onPatchDraft,
  onPatchOption,
}: AiQuestionCardProps) {
  const q = item.question;
  const dups = similarIds(item.authoringMetadata);
  const rubric = asRubric(q.rubricJson);
  const code = codingSummary(q.coding);
  const modelName = (() => {
    const meta = item.authoringMetadata as Record<string, unknown> | undefined;
    if (typeof meta?.model === "string" && meta.model.trim() && meta.model !== "Coding AI Engine") {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smarthire_active_ai_model", meta.model.trim());
        } catch {}
      }
      return meta.model.trim();
    }
    if (typeof meta?.aiModel === "string" && meta.aiModel.trim() && meta.aiModel !== "Coding AI Engine") {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smarthire_active_ai_model", meta.aiModel.trim());
        } catch {}
      }
      return meta.aiModel.trim();
    }
    // Resolve from active studio model if available
    const activeModel = typeof window !== "undefined" ? localStorage.getItem("smarthire_active_ai_model") : null;
    if (activeModel && activeModel.trim()) {
      return activeModel.trim();
    }
    if (q.questionType === "CODING") {
      return "Coding AI Engine";
    }
    return "AI Engine";
  })();

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all p-5 shadow-2xs space-y-4",
        isSelected
          ? "border-[#0066FF]/60 bg-blue-50/15 ring-1 ring-[#0066FF]/20 dark:border-blue-900/80 dark:bg-blue-950/10"
          : "border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900",
      )}
    >
      {/* Header câu hỏi */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              disabled={busy}
              onChange={() => onToggleSelect(item.id)}
              className="size-4 rounded border-slate-300 text-[#0066FF] accent-[#0066FF]"
            />
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              Câu #{index + 1}
            </span>
          </label>

          {/* Badges thông tin */}
          <div className="flex flex-wrap items-center gap-1.5">
            {batchCount > 1 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Đợt {item.batch}
              </span>
            )}
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
              {q.questionType === "MCQ"
                ? "Trắc nghiệm 1 ĐA"
                : q.questionType === "MULTIPLE_CHOICE"
                  ? "Nhiều ĐA đúng"
                  : q.questionType === "ESSAY"
                    ? "Tự luận Rubric"
                    : "Bài code"}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                q.difficulty === "Easy"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300"
                  : q.difficulty === "Hard"
                    ? "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950 dark:text-amber-300",
              )}
            >
              {q.difficulty}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {q.skill}
            </span>
            {modelName && (
              <span
                title={`Mô hình AI: ${modelName}`}
                className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-purple-50 to-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200/90 shadow-2xs dark:from-purple-950 dark:to-indigo-950 dark:text-purple-300 dark:border-purple-800"
              >
                <Sparkles className="size-3 text-purple-600 dark:text-purple-400" />
                <span>{modelName}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>Điểm:</span>
            <input
              type="number"
              min={1}
              max={100}
              disabled={busy}
              className={cn(assessmentInput, "w-14 text-center font-bold text-xs py-0.5")}
              value={q.points}
              onChange={(e) =>
                onPatchDraft(item.id, {
                  points: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                })
              }
            />
          </label>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={busy}
            title="Loại bỏ câu này khỏi danh sách"
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Cảnh báo câu tương đồng */}
      {dups.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            AI phát hiện nội dung có thể trùng với câu hỏi đã có:{" "}
            <strong>
              {dups.map((id) => `#QB-${String(id).padStart(3, "0")}`).join(", ")}
            </strong>
            . Vui lòng chỉnh sửa nội dung hoặc đáp án để tránh lặp lại.
          </span>
        </div>
      )}

      {/* Nội dung câu hỏi (Editable Textarea) */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Nội dung đề bài
        </label>
        <textarea
          rows={3}
          disabled={busy}
          className={cn(
            assessmentInput,
            "w-full text-sm leading-relaxed font-medium bg-slate-50/50 focus:bg-white resize-y",
          )}
          value={q.questionText}
          onChange={(e) => onPatchDraft(item.id, { questionText: e.target.value })}
        />
      </div>

      {/* Câu trắc nghiệm: Các lựa chọn đáp án */}
      {(q.questionType === "MCQ" || q.questionType === "MULTIPLE_CHOICE") && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Các lựa chọn đáp án ({q.options?.length ?? 0})
            </span>
            <span className="text-[11px] text-slate-400">
              {q.questionType === "MCQ"
                ? "Tích chọn 1 đáp án đúng (Radio)"
                : "Tích chọn các đáp án đúng (Checkbox)"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(q.options ?? []).map((option, optIdx) => {
              const isCorrect = Boolean(option.correct);
              return (
                <div
                  key={optIdx}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-2.5 transition-all",
                    isCorrect
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-800 ring-1 ring-emerald-500/20"
                      : "border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900",
                  )}
                >
                  <input
                    type={q.questionType === "MCQ" ? "radio" : "checkbox"}
                    name={`draft-${item.id}-correct`}
                    checked={isCorrect}
                    disabled={busy}
                    onChange={(e) =>
                      onPatchOption(item.id, optIdx, { correct: e.target.checked })
                    }
                    className="size-4 shrink-0 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-slate-400">
                    {String.fromCharCode(65 + optIdx)}.
                  </span>
                  <input
                    className="flex-1 bg-transparent text-xs font-medium text-slate-800 outline-none dark:text-slate-100"
                    disabled={busy}
                    value={option.optionText}
                    onChange={(e) =>
                      onPatchOption(item.id, optIdx, { optionText: e.target.value })
                    }
                  />
                  {isCorrect && (
                    <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                      Đáp án đúng
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Câu tự luận: Đáp án tham khảo */}
      {q.questionType === "ESSAY" && rubric && (
        <div className="space-y-1.5 rounded-xl border border-amber-200/60 bg-amber-50/30 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
          <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
            Đáp án chuẩn tham khảo (Reference Answer cho AI chấm)
          </span>
          <textarea
            rows={2}
            disabled={busy}
            className={cn(assessmentInput, "text-xs leading-relaxed bg-white")}
            value={rubric.referenceAnswer ?? ""}
            onChange={(e) =>
              onPatchDraft(item.id, {
                rubricJson: {
                  ...rubric,
                  referenceAnswer: e.target.value,
                  criteria: rubric.criteria ?? [],
                },
              })
            }
          />
        </div>
      )}

      {/* Câu Coding: Tóm tắt bài toán & Test cases */}
      {code && (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              {code.title}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {code.sample} test mẫu · {code.hidden} test ẩn
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Ngôn ngữ hỗ trợ: <strong className="text-slate-900 dark:text-white">{code.langs}</strong>
          </p>
        </div>
      )}

      {/* Lời giải thích chi tiết */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Giải thích đáp án & Kiến thức cần nhớ
        </label>
        <textarea
          rows={2}
          disabled={busy}
          className={cn(
            assessmentInput,
            "text-xs leading-relaxed bg-slate-50/50 focus:bg-white resize-y",
          )}
          value={q.explanation ?? ""}
          placeholder="Thêm giải thích để ứng viên hoặc hội đồng phỏng vấn đối chiếu..."
          onChange={(e) => onPatchDraft(item.id, { explanation: e.target.value })}
        />
      </div>
    </div>
  );
}
