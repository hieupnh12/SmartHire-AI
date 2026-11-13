import { useMemo } from "react";
import { RefreshCw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { AssessmentError } from "@/components/ux/assessmentUi";
import type { QuestionRequest } from "@/api/types/assessment";
import type { DraftItem, QuestionKind } from "../types";
import { useT } from "@/i18n";
import { AiQuestionCard } from "./AiQuestionCard";
import {
  AiRealtimeProgressCard,
  type RealtimeStage,
  type SocketStatus,
} from "./AiRealtimeProgressCard";
import { AiQuestionSkeletonCard } from "./AiQuestionSkeletonCard";

interface AiReviewWorkspaceProps {
  drafts: DraftItem[];
  filteredDrafts: DraftItem[];
  selected: Set<string>;
  selectedCount: number;
  batchCount: number;
  coding: boolean;
  count: number;
  skill: string;
  questionType: QuestionKind;
  hasJdContext: boolean;
  busy: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  generateError: unknown;
  saveError: unknown;
  stage?: RealtimeStage;
  progressPercent?: number;
  socketStatus?: SocketStatus;
  statusMessage?: string;
  streamedCount?: number;
  onCancelGenerate?: () => void;
  backPath: string;
  onNavigateBack: () => void;
  onSave: () => void;
  onToggleSelect: (id: string) => void;
  onRemoveDraft: (id: string) => void;
  onPatchDraft: (id: string, patch: Partial<QuestionRequest>) => void;
  onPatchOption: (
    id: string,
    optionIndex: number,
    patch: { optionText?: string; correct?: boolean },
  ) => void;
}

export function AiReviewWorkspace({
  drafts,
  filteredDrafts,
  selected,
  selectedCount,
  batchCount,
  count,
  skill,
  questionType,
  hasJdContext,
  isGenerating,
  isSaving,
  generateError,
  saveError,
  stage,
  progressPercent,
  socketStatus,
  statusMessage,
  streamedCount = 0,
  onCancelGenerate,
  backPath: _backPath,
  onNavigateBack,
  onSave,
  onToggleSelect,
  onRemoveDraft,
  onPatchDraft,
  onPatchOption,
}: AiReviewWorkspaceProps) {
  const t = useT();
  // Xác định số thứ tự đợt sinh lớn nhất để gắn badge "Mới" cho các câu mới sinh
  const latestBatchNumber = useMemo(() => {
    if (drafts.length === 0) return 0;
    return Math.max(...drafts.map((d) => d.batch ?? 1));
  }, [drafts]);

  // Phân tách đợt đang sinh hiện tại (nếu đang sinh) và các đợt trước đó
  const isCurrentlyStreaming = isGenerating && stage !== "completed";
  const currentGeneratingBatch = batchCount + 1;
  const remainingCount = Math.max(0, count - streamedCount);

  const currentBatchDrafts = useMemo(() => {
    if (!isCurrentlyStreaming) return [];
    return filteredDrafts.filter((item) => item.batch === currentGeneratingBatch);
  }, [isCurrentlyStreaming, filteredDrafts, currentGeneratingBatch]);

  const olderBatchDrafts = useMemo(() => {
    if (!isCurrentlyStreaming) return [];
    return filteredDrafts.filter((item) => item.batch !== currentGeneratingBatch);
  }, [isCurrentlyStreaming, filteredDrafts, currentGeneratingBatch]);

  return (
    <main className="flex flex-col gap-4 min-w-0">

      {/* Vùng danh sách câu hỏi nháp */}
      <div className="space-y-4">
        <AssessmentError error={generateError || saveError} />

        {/* State 1: Chưa có câu hỏi nào */}
        {drafts.length === 0 && !isGenerating && (
          <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 mb-4 shadow-sm">
              <Sparkles className="size-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t("recruiter.assessments.aiStudio.emptyTitle")}
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t("recruiter.assessments.aiStudio.emptyDescPrefix")}
              <strong>{t("recruiter.assessments.aiStudio.emptyDescBtnName")}</strong>.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                <span className="font-bold text-[var(--color-primary)]">1.</span> {t("recruiter.assessments.aiStudio.emptyStep1")}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                <span className="font-bold text-[var(--color-primary)]">2.</span> {t("recruiter.assessments.aiStudio.emptyStep2")}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                <span className="font-bold text-[var(--color-primary)]">3.</span> {t("recruiter.assessments.aiStudio.emptyStep3")}
              </span>
            </div>
          </div>
        )}

        {/* State 2: Đang sinh câu hỏi - Real-time Progress Card */}
        {isGenerating && (
          <AiRealtimeProgressCard
            stage={stage || "analyzing"}
            progressPercent={progressPercent || 20}
            count={count}
            skill={skill}
            questionType={questionType}
            hasJdContext={hasJdContext}
            socketStatus={socketStatus}
            statusMessage={statusMessage}
            onCancel={onCancelGenerate}
          />
        )}

        {/* Danh sách câu hỏi đã sinh (hoặc đang sinh theo thời gian thực) */}
        {isCurrentlyStreaming ? (
          <>
            {/* 1. Các câu hỏi của đợt mới vừa được stream tới (nằm ngay trên đầu) */}
            {currentBatchDrafts.map((item, index) => (
              <div
                key={item.id}
                className="animate-in fade-in slide-in-from-top-2 duration-400"
              >
                <AiQuestionCard
                  item={item}
                  index={index}
                  isSelected={selected.has(item.id)}
                  batchCount={batchCount + 1}
                  isLatestBatch={true}
                  busy={isSaving}
                  onToggleSelect={onToggleSelect}
                  onRemove={onRemoveDraft}
                  onPatchDraft={onPatchDraft}
                  onPatchOption={onPatchOption}
                />
              </div>
            ))}

            {/* 2. Skeleton UI Cards cho các câu tiếp theo của đợt này đang chờ AI soạn thảo */}
            {remainingCount > 0 && (
              <div className="space-y-4">
                {Array.from({ length: remainingCount }).map((_, idx) => (
                  <AiQuestionSkeletonCard
                    key={`skeleton-${streamedCount + idx}`}
                    index={currentBatchDrafts.length + idx}
                    questionType={questionType}
                  />
                ))}
              </div>
            )}

            {/* 3. Các câu hỏi của các đợt trước đó (nằm phía dưới đợt mới) */}
            {olderBatchDrafts.map((item, index) => (
              <div
                key={item.id}
                className="opacity-90 transition-opacity"
              >
                <AiQuestionCard
                  item={item}
                  index={currentBatchDrafts.length + remainingCount + index}
                  isSelected={selected.has(item.id)}
                  batchCount={batchCount + 1}
                  isLatestBatch={false}
                  busy={isSaving}
                  onToggleSelect={onToggleSelect}
                  onRemove={onRemoveDraft}
                  onPatchDraft={onPatchDraft}
                  onPatchOption={onPatchOption}
                />
              </div>
            ))}
          </>
        ) : (
          /* Trạng thái bình thường: hiển thị toàn bộ danh sách đã sắp xếp (đợt mới nhất ở trên đầu) */
          filteredDrafts.map((item, index) => (
            <div
              key={item.id}
              className="animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <AiQuestionCard
                item={item}
                index={index}
                isSelected={selected.has(item.id)}
                batchCount={batchCount}
                isLatestBatch={batchCount > 1 && item.batch === latestBatchNumber}
                busy={isSaving}
                onToggleSelect={onToggleSelect}
                onRemove={onRemoveDraft}
                onPatchDraft={onPatchDraft}
                onPatchOption={onPatchOption}
              />
            </div>
          ))
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      {drafts.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-6 py-3.5 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            {selectedCount > 0 ? (
              <span>
                {t("recruiter.assessments.aiStudio.readyToSavePrefix")}<strong className="text-[var(--color-primary)]">{selectedCount}</strong>{t("recruiter.assessments.aiStudio.readyToSaveSuffix")}
              </span>
            ) : (
              <span className="text-amber-600">{t("recruiter.assessments.aiStudio.pickOneToSaveWarning")}</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={onNavigateBack}
              size="sm"
            >
              {t("recruiter.assessments.common.actions.cancelAction")}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSaving || selectedCount === 0}
              onClick={onSave}
              size="sm"
              className="gap-2 font-bold px-4 shadow-sm"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>{t("recruiter.assessments.common.actions.saving")}</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>{t("recruiter.assessments.aiStudio.saveCountIntoBankBtn", { count: selectedCount })}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
