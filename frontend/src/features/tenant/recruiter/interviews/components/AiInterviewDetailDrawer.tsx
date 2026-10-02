import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, CalendarClock, CheckCircle2, ChevronRight, CircleAlert, Gauge, LockKeyhole, Network, Pencil, Plus, RefreshCw, ShieldCheck, Sparkles, Timer, Trash2, X, type LucideIcon } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { COMPETENCY_LABELS, type AiFeedback, type AiInterview, type AiQuestion, type AiQuestionRequest, type CompetencyKey } from "@/api/types/aiInterview";
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
  const stageGroups = useMemo(() => interview ? groupQuestionsByStage(interview) : [], [interview]);
  const busy = generate.isPending || score.isPending;
  return <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/45 backdrop-blur-[2px]" role="presentation" onClick={onClose}>
    <aside role="dialog" aria-modal="true" aria-labelledby="ai-interview-detail-title" className="flex h-full w-full max-w-[min(1440px,calc(100vw-24px))] flex-col overflow-y-auto bg-[var(--color-surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
      <header className="sticky top-0 z-20 flex min-h-[96px] items-center justify-between gap-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)]/95 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)]"><span className="size-1.5 rounded-full bg-[var(--color-primary)]" />AI Interview Session</span>
            <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">#AI-{interviewId}</span>
            {interview && <AiStatusBadge status={interview.status} />}
            {interview?.jobTitle && <span className="hidden rounded-full bg-[var(--color-surface-container)] px-2.5 py-1 text-xs text-[var(--color-on-surface-variant)] sm:inline-flex">{interview.jobTitle}</span>}
          </div>
          <h2 id="ai-interview-detail-title" className="mt-2 truncate text-xl font-semibold tracking-tight sm:text-2xl">Chi tiết phiên · <span className="text-[var(--color-primary)]">{candidateName}</span></h2>
        </div>
        <button type="button" aria-label="Đóng chi tiết phiên" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30">
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-8">
        <AssessmentError error={detail.error} retry={() => void detail.refetch()} />
        {detail.isPending && <p role="status">Đang tải phiên phỏng vấn…</p>}
        {interview && <>
          <PipelineStrip passed={interview.status === "PASSED"} />

          <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 border-b border-[var(--color-border-default)] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Gauge className="size-5" aria-hidden="true" /></span><div><h3 className="text-lg font-semibold">Thông số phiên AI Interview</h3><p className="text-sm text-[var(--color-on-surface-variant)]">Cấu hình snapshot và trạng thái vận hành của phiên ứng viên.</p></div></div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-secondary-container)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-secondary-container)]"><ShieldCheck className="size-4" aria-hidden="true" />Snapshot Policy Active</span>
            </div>
            <dl className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Metric icon={Network} label="Quy trình & câu hỏi" value={`${interview.roadmap?.length ?? 0} chặng / ${interview.questions.length}/${interview.questionCount} câu`} hint="Phân bổ theo từng chặng độc lập" />
              <Metric icon={Timer} label="Thời lượng phiên" value={`${interview.durationMinutes ?? "—"} phút`} hint="Đếm ngược theo snapshot duration" />
              <Metric icon={Gauge} label="Điểm đạt" value={`${interview.passingScore ?? "—"}/100`} hint="Đạt ngưỡng để mở vòng Assessment" emphasized />
              <Metric icon={RefreshCw} label="Lượt thi tối đa" value={`${interview.maxAttempts ?? interview.attemptNumber ?? 1} lần`} hint={`Đang ở lần ${interview.attemptNumber ?? 1}`} />
              <Metric icon={CalendarClock} label="Khung mở phòng" value={`${formatDateTime(interview.availableFrom)} → ${formatDateTime(interview.availableUntil)}`} hint="Thời gian ứng viên được phép bắt đầu" />
              <Metric icon={Bot} label="Trạng thái phiên" value={interview.status} hint={`Tạo ${formatDateTime(interview.createdAt)}`} />
            </dl>

            <div className="mt-5 space-y-3">
              {interview.errorMessage && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/55 p-3 text-sm text-[#93000a]"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{interview.errorMessage}</span></div>}
              {interview.status === "GENERATING" && <div role="status" className="flex items-center gap-2 rounded-xl bg-[var(--color-primary-soft)] p-3 text-sm font-medium text-[var(--color-primary)]"><Sparkles className="size-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" />Đang sinh câu hỏi từ yêu cầu và kỹ năng của Job…</div>}
              {interview.status === "ERROR" && interview.completedAt && <Button disabled={score.isPending} onClick={() => score.mutate()}><RefreshCw className="size-4" aria-hidden="true" />Thử chấm điểm lại</Button>}
            </div>
          </section>
          <AssessmentError error={generate.error ?? score.error} />
          <AiInterviewReportView reportJson={interview.reportJson} questions={interview.questions} />
          <div className="grid items-start gap-6 lg:grid-cols-12">
          <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-sm sm:p-6 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold tracking-tight">Câu hỏi ({interview.questions.length})</h3><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Nội dung, câu trả lời và đánh giá theo từng câu hỏi.</p></div>
              {editable && interview.questions.length === 0 && <Button variant="secondary" disabled={busy} onClick={() => generate.mutate()}><Sparkles className="size-4" aria-hidden="true" />{generate.isPending ? "Đang gửi yêu cầu…" : "Sinh câu hỏi bằng AI"}</Button>}
            </div>
            {!interview.questions.length && !stageGroups.length && interview.status !== "GENERATING" && <p className="text-sm">Chưa có lộ trình hoặc câu hỏi.</p>}
            <ol className="space-y-5" aria-label="Lộ trình và câu hỏi phỏng vấn">
              {stageGroups.map((stage, stageIndex) => <StageQuestionGroup
                key={`${stage.title}-${stageIndex}`}
                stage={stage}
                stageIndex={stageIndex}
                interviewId={interviewId}
                allQuestions={interview.questions}
                editable={editable && !busy}
                onChanged={refresh}
              />)}
            </ol>
            {editable && !busy && !planned && <AddQuestionForm interviewId={interviewId} nextOrder={Math.max(-1, ...interview.questions.map(q => q.questionOrder)) + 1} onAdded={refresh} />}
          </section>
          <div className="space-y-5 lg:sticky lg:top-28 lg:col-span-4">
          <SessionGovernance interview={interview} />
          <details onToggle={event => setShowLogs(event.currentTarget.open)} className="group rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-sm sm:p-5">
            <summary className="cursor-pointer list-none rounded-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 [&::-webkit-details-marker]:hidden"><span className="inline-flex items-center gap-2"><ChevronRight className="size-4 text-[var(--color-primary)] transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />Lịch sử xử lý AI Interview</span></summary>
            <AssessmentError error={logs.error} retry={() => void logs.refetch()} />
            {showLogs && logs.isPending && <p role="status">Đang tải lịch sử…</p>}
            <ol className="mt-3 space-y-3">{logs.data?.map(log => <li key={log.id} className="text-sm"><p className="font-medium">{log.event} · {formatDateTime(log.createdAt)}</p><p className="break-words text-[var(--color-on-surface-variant)]">{log.detail}</p></li>)}</ol>
          </details>
          </div>
          </div>
        </>}
      </div>
    </aside>
  </div>;
}

type StageGroup = {
  title: string;
  kind: "OPEN" | "MCQ" | "MIXED";
  configuredCount: number;
  questions: AiQuestion[];
};

function groupQuestionsByStage(interview: AiInterview): StageGroup[] {
  const normalize = (value: string | null | undefined) => value?.trim().toLocaleLowerCase() ?? "";
  const assigned = new Set<number>();
  const groups: StageGroup[] = (interview.roadmap ?? []).map(step => {
    const questions = interview.questions.filter(question => normalize(question.stageTitle) === normalize(step.title));
    questions.forEach(question => assigned.add(question.id));
    return { title: step.title, kind: step.kind, configuredCount: step.questionCount, questions };
  });

  const namedStages = new Map<string, AiQuestion[]>();
  interview.questions.filter(question => !assigned.has(question.id) && question.stageTitle).forEach(question => {
    const title = question.stageTitle!.trim();
    namedStages.set(title, [...(namedStages.get(title) ?? []), question]);
    assigned.add(question.id);
  });
  namedStages.forEach((questions, title) => groups.push({ title, kind: stageKind(questions), configuredCount: questions.length, questions }));

  const unassigned = interview.questions.filter(question => !assigned.has(question.id));
  if (unassigned.length > 0) groups.push({ title: "Câu hỏi bổ sung", kind: stageKind(unassigned), configuredCount: unassigned.length, questions: unassigned });
  return groups;
}

function stageKind(questions: AiQuestion[]): StageGroup["kind"] {
  const mcqCount = questions.filter(question => question.options?.length).length;
  if (mcqCount === 0) return "OPEN";
  if (mcqCount === questions.length) return "MCQ";
  return "MIXED";
}

function StageQuestionGroup({ stage, stageIndex, interviewId, allQuestions, editable, onChanged }: {
  stage: StageGroup;
  stageIndex: number;
  interviewId: number;
  allQuestions: AiQuestion[];
  editable: boolean;
  onChanged: () => void;
}) {
  const kindLabel = stage.kind === "MCQ" ? "Trắc nghiệm" : stage.kind === "OPEN" ? "Tự luận" : "Kết hợp";
  const complete = stage.questions.length >= stage.configuredCount && stage.configuredCount > 0;
  return <li className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-sm transition-shadow hover:shadow-md">
    <header className="flex flex-col gap-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">{String(stageIndex + 1).padStart(2, "0")}</span>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">Lộ trình {String(stageIndex + 1).padStart(2, "0")}</span><span className="rounded-md bg-[var(--color-surface-container)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--color-on-surface-variant)]">{kindLabel}</span></div><h4 className="mt-2 text-base font-semibold leading-6 sm:text-lg">{stage.title}</h4><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Chặng đánh giá độc lập · câu hỏi và rubric được AI tạo theo cấu hình snapshot.</p></div>
      </div>
      <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><span className="size-1.5 rounded-full bg-current" />{stage.questions.length}/{stage.configuredCount} câu đã tạo</span>
    </header>
    <div className="space-y-3 p-3 sm:p-5">
      {stage.questions.length > 0 ? <ol className="space-y-3">{stage.questions.map(question => <QuestionItem key={question.id} index={allQuestions.findIndex(item => item.id === question.id)} interviewId={interviewId} question={question} editable={editable} onChanged={onChanged} />)}</ol> : <div className="rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]/40 px-4 py-8 text-center"><Sparkles className="mx-auto size-5 text-[var(--color-primary)]" aria-hidden="true" /><p className="mt-2 text-sm font-medium">AI chưa tạo câu hỏi cho lộ trình này</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Dự kiến {stage.configuredCount} câu · {kindLabel}</p></div>}
    </div>
  </li>;
}

function PipelineStrip({ passed }: { passed: boolean }) {
  const steps = [
    { label: "CV Screening", meta: "Vòng 1 · Đã vượt qua", icon: CheckCircle2, state: "done" },
    { label: "AI Interview", meta: "Vòng 2 · Đang theo dõi", icon: Bot, state: "active" },
    { label: "Assessment Lab", meta: passed ? "Vòng 3 · Đã mở khóa" : "Mở khóa khi đạt AI Interview", icon: passed ? CheckCircle2 : LockKeyhole, state: passed ? "done" : "locked" },
    { label: "Tuyển dụng & Offer", meta: "Giai đoạn cuối", icon: LockKeyhole, state: "locked" },
  ] as const;
  return (
    <section aria-label="Tiến trình tuyển dụng" className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]/75 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><Network className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Tiến trình Pipeline tuyển dụng</h3><p className="text-xs text-[var(--color-on-surface-variant)]">Vòng sau chỉ mở khi ứng viên đạt vòng trước.</p></div>
      <ol className="grid gap-2 md:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = step.state === "active";
          return <li key={step.label} className={`flex min-h-20 items-center gap-3 rounded-xl border p-3 ${active ? "border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm" : "border-[var(--color-border-default)] bg-[var(--color-surface-card)]"}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${active ? "bg-[var(--color-primary)] text-white" : step.state === "done" ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-[var(--color-surface-container)] text-[var(--color-outline)]"}`}>{active ? index + 1 : <Icon className="size-4" aria-hidden="true" />}</span>
            <span className="min-w-0"><span className={`block text-[10px] font-semibold uppercase tracking-wider ${active ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface-variant)]"}`}>{step.meta}</span><span className="mt-0.5 block truncate text-sm font-semibold">{step.label}</span></span>
          </li>;
        })}
      </ol>
    </section>
  );
}

function SessionGovernance({ interview }: { interview: AiInterview }) {
  const rows = [
    ["Đơn ứng tuyển", `#${interview.applicationId}`],
    ["Ứng viên", interview.candidateId ? `#${interview.candidateId}` : "—"],
    ["Điểm AI", interview.overallScore == null ? "Chưa có điểm" : `${interview.overallScore}/100`],
    ["Bắt đầu thực tế", formatDateTime(interview.startedAt)],
    ["Hoàn tất", formatDateTime(interview.completedAt)],
    ["Hạn nộp bài", formatDateTime(interview.expiresAt)],
  ];
  return <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-sm">
    <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[var(--color-surface-container)] text-[var(--color-primary)]"><ShieldCheck className="size-5" aria-hidden="true" /></span><div><h3 className="font-semibold">Quản trị phiên</h3><p className="text-xs text-[var(--color-on-surface-variant)]">Dữ liệu thực tế và điều kiện khóa phiên.</p></div></div>
    <dl className="mt-4 space-y-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]/60 p-3 text-xs">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3"><dt className="text-[var(--color-on-surface-variant)]">{label}</dt><dd className="text-right font-semibold text-[var(--color-on-surface)]">{value}</dd></div>)}</dl>
  </section>;
}

function Metric({ icon: Icon, label, value, hint, emphasized = false }: { icon: LucideIcon; label: string; value: string; hint: string; emphasized?: boolean }) {
  return (
    <div className="flex min-h-32 flex-col justify-between rounded-xl bg-[var(--color-surface-container-low)] p-4">
      <div><dt className="flex items-center justify-between gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-on-surface-variant)]"><span>{label}</span><Icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" /></dt><dd className={`mt-2 break-words text-base font-bold leading-5 ${emphasized ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface)]"}`}>{value}</dd></div>
      <p className="mt-3 text-[11px] leading-4 text-[var(--color-on-surface-variant)]">{hint}</p>
    </div>
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
    <li className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 transition-[border-color,box-shadow] hover:border-[var(--color-primary)]/25 hover:shadow-sm sm:p-5">
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
            <p className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]"><span className="grid size-6 place-items-center rounded-lg bg-[var(--color-primary-soft)]">{index + 1}</span>{planned ? question.stageTitle : `${question.questionType} · thứ tự ${question.questionOrder}`}{mcq ? " · Trắc nghiệm" : ""}</p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-6">{question.questionText}</p>
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
