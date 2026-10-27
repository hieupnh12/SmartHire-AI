import { Link } from "react-router-dom";
import { ArrowLeft, CircleHelp, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import type { JobDetail } from "@/api/types/job";
import { HELP } from "../types";

interface AiStudioHeaderProps {
  job: JobDetail | null | undefined;
  backPath: string;
  busy: boolean;
  selectedCount: number;
  isSaving: boolean;
  onSave: () => void;
}

export function AiStudioHeader({
  job,
  backPath,
  busy,
  selectedCount,
  isSaving,
  onSave,
}: AiStudioHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <Link
          to={backPath}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          title="Quay lại Ngân hàng câu hỏi"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Studio Sinh câu hỏi bằng AI
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
              AI Generation Studio
            </span>
            <Tooltip content={HELP} side="right">
              <span className="cursor-help text-slate-400 hover:text-slate-600 transition-colors">
                <CircleHelp className="size-4" aria-hidden="true" />
              </span>
            </Tooltip>
          </div>
          <p className="mt-0.5 text-xs text-[#667085] dark:text-slate-400">
            {job ? (
              <>
                Soạn đề tự động cho vị trí tuyển dụng:{" "}
                <strong className="text-slate-800 dark:text-slate-200">{job.title}</strong>
              </>
            ) : (
              "Biên soạn và tích hợp câu hỏi chất lượng cao vào Ngân hàng câu hỏi chung của doanh nghiệp."
            )}
          </p>
        </div>
      </div>

      {/* Nút lưu nhanh trên Header */}
      <div className="flex items-center gap-2.5">
        <Link
          to={backPath}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          Quay lại
        </Link>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isSaving || selectedCount === 0}
          onClick={onSave}
          className="gap-2 font-bold px-4 shadow-sm"
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
    </div>
  );
}
