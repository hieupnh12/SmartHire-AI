import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { COMPETENCY_LABELS, type AiFeedback, type AiQuestion, type AiQuestionRequest, type CompetencyKey } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { AssessmentError, FieldError, assessmentInput } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { AI_QUESTION_TYPES, AiStatusBadge, formatDateTime } from "./aiInterviewUi";
import { AiInterviewReportView } from "./AiInterviewReportView";

type Props = { interviewId: number; jobId: number; candidateName: string; onClose: () => void };

export function AiInterviewDetailDrawer({ interviewId, jobId, candidateName, onClose }: Props) {
  const client = useQueryClient();
  const [showLogs, setShowLogs] = useState(false);
  const detail = useQuery({
    queryKey: queryKeys.aiInterviews.detail(interviewId),
    queryFn: () => aiInterviewApi.get(interviewId),
    refetchInterval: 5000,
  });
  const logs = useQuery({ queryKey: [...queryKeys.aiInterviews.detail(interviewId), "logs"], queryFn: () => aiInterviewApi.logs(interviewId), enabled: showLogs, refetchInterval: 5000 });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.detail(interviewId) });
    void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
  };
  const generate = useMutation({ mutationFn: () => aiInterviewApi.generate(interviewId), onSuccess: refresh });
  const score = useMutation({ mutationFn: () => aiInterviewApi.retryScore(interviewId), onSuccess: refresh });
  const interview = detail.data;
  const editable = !!interview && !interview.startedAt && ["CREATED", "QUESTIONS_READY", "ERROR"].includes(interview.status);
  // Roadmap-based sessions keep their generated slots; only open-question wording can be edited.
  const planned = !!interview?.questions.some(q => q.stageTitle);
  const busy = generate.isPending || score.isPending;
  return <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/40 backdrop-blur-sm" role="presentation" onClick={onClose}>
    <aside role="dialog" aria-modal="true" aria-labelledby="ai-interview-detail-title" className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-surface-card shadow-2xl" onClick={e => e.stopPropagation()}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] bg-surface-card px-6 py-4">
        <div className="min-w-0"><p className="font-mono text-xs text-[var(--color-on-surface-variant)]">#AI-{interviewId}</p><h2 id="ai-interview-detail-title" className="truncate text-xl font-semibold">{candidateName}</h2></div>
        <Button variant="ghost" aria-label="Đóng" onClick={onClose}><X className="size-4" aria-hidden="true" /></Button>
      </header>
      <div className="space-y-6 p-6">
        <AssessmentError error={detail.error} retry={() => void detail.refetch()} />
        {detail.isPending && <p role="status">Đang tải phiên phỏng vấn…</p>}
        {interview && <>
          <section className="space-y-4 rounded-2xl bg-[var(--color-surface-container-low)] p-4">
            <div className="flex flex-wrap items-center gap-3" role="status"><AiStatusBadge status={interview.status} /><span className="text-xs text-[var(--color-on-surface-variant)]">Tạo {formatDateTime(interview.createdAt)}</span></div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt>Bắt đầu</dt><dd>{formatDateTime(interview.startedAt)}</dd></div>
              <div><dt>Hoàn tất</dt><dd>{formatDateTime(interview.completedAt)}</dd></div>
              <div><dt>Đơn ứng tuyển</dt><dd>#{interview.applicationId}</dd></div>
              <div><dt>Ngưỡng đạt</dt><dd>{interview.passingScore ?? "—"}/100</dd></div>
              <div><dt>Điểm AI</dt><dd className="font-semibold">{interview.overallScore == null ? "Chưa có điểm" : `${interview.overallScore}/100`}</dd></div>
              <div><dt>Câu hỏi đã chuẩn bị</dt><dd>{interview.questions.length}/{interview.questionCount}</dd></div>
              <div><dt>Lần làm</dt><dd>{interview.attemptNumber ?? 1}{interview.canRetry ? " · còn lượt làm lại" : ""}</dd></div>
              {interview.expiresAt && <div><dt>Hạn nộp bài</dt><dd>{formatDateTime(interview.expiresAt)}</dd></div>}
            </dl>
            <p className="text-sm text-[var(--color-on-surface-variant)]">Trạng thái tự cập nhật theo câu hỏi, bài làm và kết quả AI. Bộ câu hỏi sẵn sàng khi đủ số lượng đã cấu hình cho Job.</p>
            {interview.errorMessage && <p role="alert">{interview.errorMessage}</p>}
            {interview.status === "GENERATING" && <p role="status">Đang sinh câu hỏi từ yêu cầu và kỹ năng của Job…</p>}
            {interview.status === "ERROR" && interview.completedAt && <Button disabled={score.isPending} onClick={() => score.mutate()}><RefreshCw className="size-4" aria-hidden="true" />Thử chấm điểm lại</Button>}
          </section>
          <AssessmentError error={generate.error ?? score.error} />
          <AiInterviewReportView reportJson={interview.reportJson} questions={interview.questions} />
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Câu hỏi ({interview.questions.length})</h3>
              {editable && interview.questions.length === 0 && <Button variant="secondary" disabled={busy} onClick={() => generate.mutate()}><Sparkles className="size-4" aria-hidden="true" />{generate.isPending ? "Đang gửi yêu cầu…" : "Sinh câu hỏi bằng AI"}</Button>}
            </div>
            {!interview.questions.length && interview.status !== "GENERATING" && <p className="text-sm">Chưa có câu hỏi.</p>}
            <ol className="space-y-3">{interview.questions.map((question, index) => <QuestionItem key={question.id} index={index} interviewId={interviewId} question={question} editable={editable && !busy} onChanged={refresh} />)}</ol>
            {editable && !busy && !planned && <AddQuestionForm interviewId={interviewId} nextOrder={Math.max(-1, ...interview.questions.map(q => q.questionOrder)) + 1} onAdded={refresh} />}
          </section>
          <details onToggle={event => setShowLogs(event.currentTarget.open)} className="rounded-xl border border-[var(--color-border-default)] p-4">
            <summary className="cursor-pointer font-medium">Lịch sử xử lý AI Interview</summary>
            <AssessmentError error={logs.error} retry={() => void logs.refetch()} />
            {showLogs && logs.isPending && <p role="status">Đang tải lịch sử…</p>}
            <ol className="mt-3 space-y-3">{logs.data?.map(log => <li key={log.id} className="text-sm"><p className="font-medium">{log.event} · {formatDateTime(log.createdAt)}</p><p className="break-words text-[var(--color-on-surface-variant)]">{log.detail}</p></li>)}</ol>
          </details>
        </>}
      </div>
    </aside>
  </div>;
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
  lockStructure = false,
}: {
  defaults: QuestionValues;
  pending: boolean;
  submitLabel: string;
  onSubmit: (values: AiQuestionRequest) => Promise<unknown>;
  onCancel?: () => void;
  lockStructure?: boolean;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: defaults,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(async (values) => {
        try { await onSubmit(values); if (!onCancel) reset({ ...defaults, questionOrder: values.questionOrder + 1 }); } catch { /* Mutation error is shown without clearing the draft. */ }
      })}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Nội dung</span>
        <textarea className={`${assessmentInput} min-h-24`} {...register("questionText")} disabled={pending} />
        <FieldError message={errors.questionText?.message} />
      </label>
      {!lockStructure && <div className="grid grid-cols-2 gap-3">
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
      </div>}
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
        onSubmit={(body) => add.mutateAsync(body)}
      />
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Đóng</Button>
    </div>
  );
}

function QuestionItem({ index, interviewId, question, editable, onChanged }: { index: number; interviewId: number; question: AiQuestion; editable: boolean; onChanged: () => void }) {
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
  const planned = !!question.stageTitle;
  const mcq = !!question.options?.length;
  const tags = [...(question.competencies ?? []).map(key => COMPETENCY_LABELS[key as CompetencyKey] ?? key), ...(question.skills ?? [])];

  return (
    <li className="space-y-3 rounded-xl border border-[var(--color-border-default)] p-4">
      {editing && editable ? (
        <>
          <AssessmentError error={update.error} />
          <QuestionFields
            defaults={{ questionText: question.questionText, questionType: question.questionType, questionOrder: question.questionOrder }}
            pending={update.isPending}
            submitLabel="Lưu"
            onSubmit={(body) => update.mutateAsync(body)}
            onCancel={() => setEditing(false)}
            lockStructure={planned}
          />
        </>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-on-surface-variant)]">Câu {index + 1} · {planned ? question.stageTitle : `${question.questionType} · thứ tự ${question.questionOrder}`}{mcq ? " · Trắc nghiệm" : ""}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{question.questionText}</p>
            {tags.length > 0 && <ul className="mt-2 flex flex-wrap gap-1" aria-label="Tiêu chí đánh giá">{tags.map(tag => <li key={tag} className="rounded-full bg-[var(--color-surface-container-low)] px-2 py-0.5 text-xs">{tag}</li>)}</ul>}
            {mcq && <ol className="mt-2 space-y-1 text-sm">{question.options!.map((option, i) => <li key={i} className={question.correctOption === i ? "font-semibold text-brand-primary" : ""}>
              {String.fromCharCode(65 + i)}. {option}{question.correctOption === i ? " (đáp án đúng)" : ""}{answer?.answerText === String(i) ? " · ứng viên chọn" : ""}</li>)}</ol>}
            {mcq && question.explanation && <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Giải thích: {question.explanation}</p>}
          </div>
          {editable && !(planned && mcq) && <div className="flex shrink-0 gap-1">
            <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted" aria-label="Sửa câu hỏi" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            {!planned && <button
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
            </button>}
          </div>}
        </div>
      )}

      {answer ? (
        <div className="space-y-3 rounded-lg bg-[var(--color-surface-container-low)] p-3">
          <div>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Câu trả lời · {formatDateTime(answer.answeredAt)}{answer.answerDuration != null ? ` · ${answer.answerDuration}s` : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{!answer.answerText ? "Bỏ trống (0 điểm)" : mcq ? `Chọn ${String.fromCharCode(65 + Number(answer.answerText))}` : answer.answerText}</p>
          </div>
          <FeedbackView feedback={answer.feedback} />
        </div>
      ) : (
        <p className="text-xs italic text-[var(--color-on-surface-variant)]">Ứng viên chưa trả lời.</p>
      )}
    </li>
  );
}

function FeedbackView({ feedback }: { feedback: AiFeedback | null }) {
  if (!feedback) return <p className="text-sm text-[var(--color-on-surface-variant)]">Chưa có đánh giá AI.</p>;
  return <div className="space-y-2 text-sm">
    <p className="font-semibold">Đánh giá AI · {feedback.score ?? "—"}/100</p>
    <p className="whitespace-pre-wrap">{feedback.feedbackText}</p>
    {feedback.strengths && <p><strong>Điểm mạnh:</strong> {feedback.strengths}</p>}
    {feedback.weaknesses && <p><strong>Cần cải thiện:</strong> {feedback.weaknesses}</p>}
  </div>;
}
