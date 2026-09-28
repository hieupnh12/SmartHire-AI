import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import type { AiFeedback, AiInterview, AiInterviewStatus, AiQuestion, AiQuestionRequest } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { AssessmentError, FieldError, assessmentInput } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import {
  AI_INTERVIEW_STATUSES,
  AI_QUESTION_TYPES,
  AiStatusBadge,
  MockTag,
  aiStatusLabel,
  formatDateTime,
} from "./aiInterviewUi";

const scoreField = z
  .string()
  .trim()
  .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 10), "Điểm từ 0 đến 10");
const toScore = (v: string) => (v.trim() === "" ? null : Number(v));
const toText = (v: string) => (v.trim() === "" ? null : v.trim());

type Props = { interviewId: number; jobId: number; candidateName: string; onClose: () => void };

export function AiInterviewDetailDrawer({ interviewId, jobId, candidateName, onClose }: Props) {
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: queryKeys.aiInterviews.detail(interviewId),
    queryFn: () => aiInterviewApi.get(interviewId),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.detail(interviewId) });
    void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
  };
  const interview = detail.data;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/40 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-interview-detail-title"
        className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-surface-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] bg-surface-card px-6 py-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-[var(--color-on-surface-variant)]">#AI-{interviewId}</p>
            <h2 id="ai-interview-detail-title" className="truncate text-xl font-semibold">{candidateName}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-surface-muted" aria-label="Đóng">
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-6 p-6">
          <AssessmentError error={detail.error} retry={() => void detail.refetch()} />
          {detail.isPending && <p role="status">Đang tải phiên phỏng vấn…</p>}
          {interview && (
            <>
              <SessionPanel key={`${interview.status}-${interview.overallScore}`} interview={interview} onSaved={refresh} />
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">Câu hỏi ({interview.questions.length})</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toast.info("Chưa có API sinh câu hỏi bằng AI", "Backend cần POST /ai-interviews/{id}/questions/generate.")}
                  >
                    <Sparkles className="size-4" aria-hidden="true" />
                    Sinh câu hỏi bằng AI
                    <MockTag title="Chưa có API sinh câu hỏi" />
                  </Button>
                </div>
                {interview.questions.length === 0 && (
                  <p className="text-sm text-[var(--color-on-surface-variant)]">Chưa có câu hỏi. Thêm thủ công bên dưới.</p>
                )}
                <ol className="space-y-3">
                  {interview.questions.map((question, index) => (
                    <QuestionItem key={question.id} index={index} interviewId={interviewId} question={question} onChanged={refresh} />
                  ))}
                </ol>
                <AddQuestionForm interviewId={interviewId} nextOrder={interview.questions.length} onAdded={refresh} />
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

const sessionSchema = z.object({ status: z.enum(AI_INTERVIEW_STATUSES as [AiInterviewStatus, ...AiInterviewStatus[]]), overallScore: scoreField });
type SessionValues = z.infer<typeof sessionSchema>;

function SessionPanel({ interview, onSaved }: { interview: AiInterview; onSaved: () => void }) {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<SessionValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { status: interview.status, overallScore: interview.overallScore?.toString() ?? "" },
  });
  const save = useMutation({
    mutationFn: (values: SessionValues) => {
      const now = new Date().toISOString();
      return aiInterviewApi.update(interview.id, {
        status: values.status,
        overallScore: toScore(values.overallScore),
        startedAt: values.status === "IN_PROGRESS" && !interview.startedAt ? now : undefined,
        completedAt: values.status === "SCORED" && !interview.completedAt ? now : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Đã cập nhật phiên");
      onSaved();
    },
  });

  return (
    <form className="space-y-4 rounded-2xl bg-[var(--color-surface-container-low)] p-4" onSubmit={handleSubmit((v) => save.mutate(v))}>
      <div className="flex flex-wrap items-center gap-3">
        <AiStatusBadge status={interview.status} />
        <span className="text-xs text-[var(--color-on-surface-variant)]">Tạo {formatDateTime(interview.createdAt)}</span>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-[var(--color-on-surface-variant)]">Bắt đầu</dt><dd>{formatDateTime(interview.startedAt)}</dd></div>
        <div><dt className="text-xs text-[var(--color-on-surface-variant)]">Hoàn tất</dt><dd>{formatDateTime(interview.completedAt)}</dd></div>
        <div><dt className="text-xs text-[var(--color-on-surface-variant)]">Đơn ứng tuyển</dt><dd>#{interview.applicationId}</dd></div>
        <div><dt className="text-xs text-[var(--color-on-surface-variant)]">Vòng workflow</dt><dd>{interview.workflowStageId ? `#${interview.workflowStageId}` : "—"}</dd></div>
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Trạng thái</span>
          <select className={assessmentInput} {...register("status")}>
            {AI_INTERVIEW_STATUSES.map((s) => <option key={s} value={s}>{aiStatusLabel[s]}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Điểm tổng (/10)</span>
          <input className={assessmentInput} inputMode="decimal" placeholder="VD: 8.5" {...register("overallScore")} />
          <FieldError message={errors.overallScore?.message} />
        </label>
      </div>
      <AssessmentError error={save.error} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!isDirty || save.isPending}>
          <Save className="size-4" aria-hidden="true" />
          {save.isPending ? "Đang lưu…" : "Lưu phiên"}
        </Button>
      </div>
    </form>
  );
}

const questionSchema = z.object({
  questionText: z.string().trim().min(1, "Nhập nội dung câu hỏi").max(20000, "Tối đa 20.000 ký tự"),
  questionType: z.string().trim().min(1).max(32),
  questionOrder: z.coerce.number().int().min(0, "Thứ tự ≥ 0"),
});
type QuestionValues = z.infer<typeof questionSchema>;

function QuestionFields({
  defaults,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaults: QuestionValues;
  pending: boolean;
  submitLabel: string;
  onSubmit: (values: AiQuestionRequest) => void;
  onCancel?: () => void;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: defaults,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((values) => {
        onSubmit(values);
        if (!onCancel) reset({ ...defaults, questionOrder: values.questionOrder + 1 });
      })}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Nội dung</span>
        <textarea className={`${assessmentInput} min-h-24`} {...register("questionText")} disabled={pending} />
        <FieldError message={errors.questionText?.message} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Loại</span>
          <select className={assessmentInput} {...register("questionType")} disabled={pending}>
            {AI_QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Thứ tự</span>
          <input type="number" min={0} className={assessmentInput} {...register("questionOrder")} disabled={pending} />
          <FieldError message={errors.questionOrder?.message} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>Huỷ</Button>}
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Đang lưu…" : submitLabel}</Button>
      </div>
    </form>
  );
}

function AddQuestionForm({ interviewId, nextOrder, onAdded }: { interviewId: number; nextOrder: number; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const add = useMutation({
    mutationFn: (body: AiQuestionRequest) => aiInterviewApi.addQuestion(interviewId, body),
    onSuccess: () => {
      toast.success("Đã thêm câu hỏi");
      onAdded();
    },
  });
  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Thêm câu hỏi
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-[var(--color-outline-variant)] p-4">
      <AssessmentError error={add.error} />
      <QuestionFields
        key={nextOrder}
        defaults={{ questionText: "", questionType: "TECHNICAL", questionOrder: nextOrder }}
        pending={add.isPending}
        submitLabel="Thêm"
        onSubmit={(body) => add.mutate(body)}
      />
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Đóng</Button>
    </div>
  );
}

function QuestionItem({ index, interviewId, question, onChanged }: { index: number; interviewId: number; question: AiQuestion; onChanged: () => void }) {
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [editing, setEditing] = useState(false);
  const update = useMutation({
    mutationFn: (body: AiQuestionRequest) => aiInterviewApi.updateQuestion(interviewId, question.id, body),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const answer = question.answer;

  return (
    <li className="space-y-3 rounded-xl border border-[var(--color-border-default)] p-4">
      {editing ? (
        <>
          <AssessmentError error={update.error} />
          <QuestionFields
            defaults={{ questionText: question.questionText, questionType: question.questionType, questionOrder: question.questionOrder }}
            pending={update.isPending}
            submitLabel="Lưu"
            onSubmit={(body) => update.mutate(body)}
            onCancel={() => setEditing(false)}
          />
        </>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-on-surface-variant)]">Câu {index + 1} · {question.questionType} · thứ tự {question.questionOrder}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{question.questionText}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted" aria-label="Sửa câu hỏi" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6]"
              aria-label="Xoá câu hỏi"
              onClick={() => askConfirm({
                title: "Xoá câu hỏi này?",
                description: "Câu trả lời và feedback của câu hỏi cũng bị xoá.",
                confirmLabel: "Xoá",
                danger: true,
                onConfirm: async () => {
                  await aiInterviewApi.deleteQuestion(interviewId, question.id);
                  onChanged();
                },
              })}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {answer ? (
        <div className="space-y-3 rounded-lg bg-[var(--color-surface-container-low)] p-3">
          <div>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Câu trả lời · {formatDateTime(answer.answeredAt)}{answer.answerDuration != null ? ` · ${answer.answerDuration}s` : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{answer.answerText || "—"}</p>
          </div>
          <FeedbackForm interviewId={interviewId} answerId={answer.id} feedback={answer.feedback} onSaved={onChanged} />
        </div>
      ) : (
        <p className="text-xs italic text-[var(--color-on-surface-variant)]">Ứng viên chưa trả lời.</p>
      )}
    </li>
  );
}

const feedbackSchema = z.object({
  score: scoreField,
  feedbackText: z.string().max(20000),
  strengths: z.string().max(20000),
  weaknesses: z.string().max(20000),
});
type FeedbackValues = z.infer<typeof feedbackSchema>;

function FeedbackForm({
  interviewId,
  answerId,
  feedback,
  onSaved,
}: {
  interviewId: number;
  answerId: number;
  feedback: AiFeedback | null;
  onSaved: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      score: feedback?.score?.toString() ?? "",
      feedbackText: feedback?.feedbackText ?? "",
      strengths: feedback?.strengths ?? "",
      weaknesses: feedback?.weaknesses ?? "",
    },
  });
  const save = useMutation({
    mutationFn: (v: FeedbackValues) => aiInterviewApi.upsertFeedback(interviewId, answerId, {
      score: toScore(v.score),
      feedbackText: toText(v.feedbackText),
      strengths: toText(v.strengths),
      weaknesses: toText(v.weaknesses),
    }),
    onSuccess: () => {
      toast.success("Đã lưu feedback");
      onSaved();
    },
  });
  return (
    <form className="space-y-2 border-t border-[var(--color-border-default)] pt-3" onSubmit={handleSubmit((v) => save.mutate(v))}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Feedback</p>
      <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
        <label className="space-y-1 text-xs">
          <span>Điểm (/10)</span>
          <input className={assessmentInput} inputMode="decimal" {...register("score")} />
          <FieldError message={errors.score?.message} />
        </label>
        <label className="space-y-1 text-xs">
          <span>Nhận xét</span>
          <textarea className={`${assessmentInput} min-h-16`} {...register("feedbackText")} />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span>Điểm mạnh</span>
          <textarea className={`${assessmentInput} min-h-16`} {...register("strengths")} />
        </label>
        <label className="space-y-1 text-xs">
          <span>Điểm yếu</span>
          <textarea className={`${assessmentInput} min-h-16`} {...register("weaknesses")} />
        </label>
      </div>
      <AssessmentError error={save.error} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!isDirty || save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu feedback"}</Button>
      </div>
    </form>
  );
}
