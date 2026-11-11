import { Link } from "react-router-dom";
import { ArrowLeft, CircleHelp, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import type { JobDetail } from "@/api/types/job";
import { cn } from "@/lib/utils";
import { HELP, type DraftItem } from "../types";

interface AiStudioHeaderProps {
  job: JobDetail | null | undefined;
  backPath: string;
  busy?: boolean;
  selectedCount: number;
  isSaving: boolean;
  onSave: () => void;
  drafts?: DraftItem[];
  filteredDrafts?: DraftItem[];
  selected?: Set<string>;
  typeFilter?: string;
  setTypeFilter?: (filter: string) => void;
  toggleSelectAll?: () => void;
  clearAllDrafts?: () => void;
}

export function AiStudioHeader({
  job,
  backPath,
  selectedCount,
  isSaving,
  onSave,
  drafts = [],
  filteredDrafts = [],
  selected,
  typeFilter = "ALL",
  setTypeFilter,
  toggleSelectAll,
  clearAllDrafts,
}: AiStudioHeaderProps) {
  const hasDrafts = drafts.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
      {/* Cụm trái: Nút quay lại + Tiêu đề Studio */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <Link
          to={backPath}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          title="Quay lại Ngân hàng câu hỏi"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">
              Studio Sinh câu hỏi bằng AI
            </h1>
            <Tooltip content={HELP} side="right">
              <span className="cursor-help text-slate-400 hover:text-slate-600 transition-colors">
                <CircleHelp className="size-4" aria-hidden="true" />
              </span>
            </Tooltip>
          </div>
          {job?.title && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
              {job.title}
            </p>
          )}
        </div>
      </div>

      {/* Cụm phải: Bộ điều khiển kiểm duyệt (Review Controls) & Nút lưu */}
      {hasDrafts && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Checkbox Chọn tất cả */}
          {toggleSelectAll && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800/70">
              <input
                type="checkbox"
                checked={
                  filteredDrafts.length > 0 &&
                  Boolean(selected && selected.size === filteredDrafts.length)
                }
                onChange={toggleSelectAll}
                disabled={filteredDrafts.length === 0 || isSaving}
                className="size-3.5 rounded border-slate-300 accent-[var(--color-primary)]"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                Chọn tất cả ({filteredDrafts.length})
              </span>
            </label>
          )}

          {/* Badge: Đã chọn x / y câu */}
          <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20 whitespace-nowrap">
            Đã chọn {selectedCount} / {drafts.length} câu
          </span>

          {/* Trạng thái: Đã tự động lưu nháp */}
          <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đã tự động lưu nháp
          </span>

          {/* Bộ lọc loại câu (Filter Tabs) */}
          {setTypeFilter && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-all whitespace-nowrap",
                  typeFilter === "ALL"
                    ? "bg-white font-bold text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
                )}
              >
                Tất cả ({drafts.length})
              </button>
              {["MCQ", "MULTIPLE_CHOICE", "ESSAY", "CODING"].map((type) => {
                const c = drafts.filter((d) => d.question.questionType === type).length;
                if (!c) return null;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium transition-all whitespace-nowrap",
                      typeFilter === type
                        ? "bg-white font-bold text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
                    )}
                  >
                    {type === "MCQ"
                      ? "Trắc nghiệm"
                      : type === "MULTIPLE_CHOICE"
                        ? "Nhiều ĐA"
                        : type === "ESSAY"
                          ? "Tự luận"
                          : "Code"}{" "}
                    ({c})
                  </button>
                );
              })}
            </div>
          )}

          {/* Nút Xóa nháp */}
          {clearAllDrafts && (
            <button
              type="button"
              disabled={isSaving}
              onClick={clearAllDrafts}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap cursor-pointer"
              title="Xóa toàn bộ bản nháp hiện tại"
            >
              <Trash2 className="size-3.5" />
              <span>Xóa nháp</span>
            </button>
          )}

          {/* Nút Lưu vào Ngân hàng */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSaving || selectedCount === 0}
            onClick={onSave}
            className="gap-1.5 font-bold px-3.5 shadow-2xs whitespace-nowrap"
          >
            {isSaving ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Lưu {selectedCount ? `${selectedCount} câu` : "vào Ngân hàng"}</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
