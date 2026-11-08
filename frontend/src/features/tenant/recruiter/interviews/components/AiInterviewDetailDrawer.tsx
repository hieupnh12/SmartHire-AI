import { ConversationTranscript, useInterviewTranscript } from "./ConversationTranscript";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, CalendarClock, CheckCircle2, ChevronRight, CircleAlert, Gauge, LockKeyhole, Network, Pencil, Plus, RefreshCw, ShieldCheck, Sparkles, Timer, Trash2, X, type LucideIcon } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { COMPETENCY_LABELS, type AiAnswer, type AiFeedback, type AiInterview, type AiQuestion, type AiQuestionRequest, type CompetencyKey } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { AssessmentError, FieldError, assessmentInput } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { AI_QUESTION_TYPES, AiStatusBadge, formatDateTime } from "./aiInterviewUi";
import { InterviewRecordingReview } from "./InterviewRecordingReview";
import { AiInterviewReportView } from "./AiInterviewReportView";
import { AVAILABLE_INTERVIEW_PROCESS, visibleInterviewDetails } from "../utils/interviewProcessSettings";
import { parseChoiceAnswer } from "@/lib/interview-choice-answer";

type Props = { interviewId: number; jobId: number; candidateName: string; onClose: () => void };

export function AiInterviewDetailDrawer({ interviewId, jobId, candidateName, onClose }: Props) {
  const client = useQueryClient();
  const askConfirm = useUiStore(s => s.askConfirm);
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
  const interview = useMemo(() => detail.data ? visibleInterviewDetails(detail.data) : undefined, [detail.data]);
  const transcript = useInterviewTranscript(interviewId, !!interview?.conversational && !!interview.completedAt);
  const availableSession = !!detail.data?.processBased && !!detail.data.roadmap?.length
    && detail.data.roadmap.every(step => step.title.trim().toUpperCase() === AVAILABLE_INTERVIEW_PROCESS);
  const editable = availableSession && !!interview && !interview.startedAt && ["CREATED", "QUESTIONS_READY", "ERROR"].includes(interview.status);
  const planned = !!interview?.questions.some(q => q.stageTitle);
  const stageGroups = useMemo(() => interview ? groupQuestionsByStage(interview) : [], [interview]);
  const busy = generate.isPending || score.isPending;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50 duration-200" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-interview-detail-title"
        className="flex h-full w-full max-w-[min(1440px,calc(100vw-24px))] flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
                <span className="size-1.5 rounded-full bg-[#0066FF]" />
                AI Interview Session
              </span>
              <span className="font-mono text-xs text-slate-400">#AI-{interviewId}</span>
              {interview && <AiStatusBadge status={interview.status} />}
              {interview?.jobTitle && (
                <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline-flex">
                  {interview.jobTitle}
                </span>
              )}
            </div>
            <h2 id="ai-interview-detail-title" className="mt-1.5 truncate text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
              Chi tiết phiên · <span className="text-[#0066FF]">{candidateName}</span>
            </h2>
          </div>
          <button
            type="button"
            aria-label="Đóng chi tiết phiên"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        {/* Content Area */}
        <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
          <AssessmentError error={detail.error} retry={() => void detail.refetch()} />
          {detail.isPending && (
            <div className="space-y-6" role="status" aria-busy="true">
              <Skeleton className="h-10 w-72 rounded-xl" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
              <SkeletonCard className="h-64 rounded-2xl" />
              <span className="sr-only">Đang tải phiên phỏng vấn…</span>
            </div>
          )}

          {interview && (
            <>
              {/* Pipeline Progression Strip */}
              <PipelineStrip passed={interview.status === "PASSED"} />

              {/* Session Metrics Section */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#0066FF] border border-blue-100 dark:bg-blue-950 dark:text-blue-300 shadow-2xs">
                      <Gauge className="size-4.5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Thông số phiên AI Interview</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Cấu hình snapshot và trạng thái vận hành của phiên ứng viên.</p>
                    </div>
                  </div>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Snapshot Policy Active
                  </span>
                </div>

                <dl className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <Metric
                    icon={Network}
                    label={interview.conversational ? "Tiến độ hội thoại" : "Quy trình & câu hỏi"}
                    value={interview.conversational ? transcript.data ? `${transcript.data.candidateTurns}/${transcript.data.maxTurns} lượt` : `${interview.maxQuestionCount ?? interview.questionCount} câu`
                      : `${interview.roadmap?.length ?? 0} chặng / ${interview.questions.length}/${interview.questionCount} câu`}
                    hint={interview.conversational ? "Theo lượt trả lời transcript" : "Phân bổ theo chặng"}
                  />
                  <Metric icon={Timer} label="Thời lượng phiên" value={`${interview.durationMinutes ?? "—"} phút`} hint="Đếm ngược theo snapshot" />
                  <Metric icon={Gauge} label="Điểm đạt" value={`${interview.passingScore ?? "—"}/100`} hint="Ngưỡng đạt vòng tiếp" emphasized />
                  <Metric icon={RefreshCw} label="Lượt thi tối đa" value={`${interview.maxAttempts ?? interview.attemptNumber ?? 1} lần`} hint={`Lần thứ ${interview.attemptNumber ?? 1}`} />
                  <Metric icon={CalendarClock} label="Khung mở phòng" value={`${formatDateTime(interview.availableFrom)} → ${formatDateTime(interview.availableUntil)}`} hint="Thời gian được phép làm" />
                  <Metric icon={Bot} label="Trạng thái phiên" value={interview.status} hint={`Tạo lúc ${formatDateTime(interview.createdAt)}`} />
                </dl>

                <div className="mt-4 space-y-3">
                  {interview.errorMessage && (
                    <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
                      <span>{interview.errorMessage}</span>
                    </div>
                  )}
                  {interview.status === "GENERATING" && (
                    <div role="status" className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/70 p-3 text-xs font-medium text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300">
                      <Sparkles className="size-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                      Đang sinh câu hỏi từ yêu cầu và kỹ năng của Job…
                    </div>
                  )}
                  {availableSession && interview.status === "ERROR" && interview.completedAt && (
                    <button
                      type="button"
                      disabled={score.isPending}
                      onClick={() => score.mutate()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer"
                    >
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                      Thử chấm điểm lại
                    </button>
                  )}
                </div>
              </section>

              <AssessmentError error={generate.error ?? score.error} />

              {/* Transcript for conversational sessions */}
              {interview.conversational && interview.completedAt && (
                <ConversationTranscript interviewId={interviewId} />
              )}

              {/* Comprehensive AI Interview Report */}
              <AiInterviewReportView reportJson={interview.reportJson} questions={interview.questions} />

              {/* Questions List & Session Governance */}
              <div className="grid items-start gap-6 lg:grid-cols-12">
                {!interview.conversational && (
                  <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                          Câu hỏi ({interview.questions.length})
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Nội dung, câu trả lời và đánh giá theo từng câu hỏi.
                        </p>
                      </div>
                      {editable && !interview.conversational && (interview.questions.length === 0 || interview.processBased) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (!interview.questions.length) { generate.mutate(); return; }
                            askConfirm({
                              title: "Sinh lại bộ câu hỏi nháp?",
                              description: "AI sẽ dùng cấu hình đã lưu của phiên. Chỉ thay câu hỏi nháp chưa trả lời khi bộ mới hợp lệ; giữ nguyên lượt phỏng vấn.",
                              confirmLabel: "Sinh lại",
                              onConfirm: async () => { await generate.mutateAsync(); },
                            });
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                        >
                          <Sparkles className="size-3.5 text-[#0066FF]" aria-hidden="true" />
                          <span>{generate.isPending ? "Đang gửi yêu cầu…" : interview.questions.length ? "Sinh lại theo cấu hình" : "Sinh câu hỏi bằng AI"}</span>
                        </button>
                      )}
                    </div>

                    {!interview.questions.length && !stageGroups.length && interview.status !== "GENERATING" && (
                      <p className="text-xs text-slate-400 p-4">Chưa có lộ trình hoặc câu hỏi Communication.</p>
                    )}

                    <ol className="space-y-4" aria-label="Lộ trình và câu hỏi phỏng vấn">
                      {stageGroups.map((stage, stageIndex) => (
                        <StageQuestionGroup
                          key={`${stage.title}-${stageIndex}`}
                          stage={stage}
                          stageIndex={stageIndex}
                          interviewId={interviewId}
                          allQuestions={interview.questions}
                          completed={!!interview.completedAt}
                          editable={editable && !busy}
                          onChanged={refresh}
                        />
                      ))}
                    </ol>

                    {editable && !busy && !planned && (
                      <AddQuestionForm interviewId={interviewId} nextOrder={Math.max(-1, ...interview.questions.map(q => q.questionOrder)) + 1} onAdded={refresh} />
                    )}
                  </section>
                )}

                <div className={`space-y-5 ${interview.conversational ? "lg:col-span-12" : "lg:sticky lg:top-24 lg:col-span-4"}`}>
                  <SessionGovernance interview={interview} />

                  <details onToggle={event => setShowLogs(event.currentTarget.open)} className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <summary className="cursor-pointer list-none rounded-lg font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 [&::-webkit-details-marker]:hidden flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <ChevronRight className="size-4 text-[#0066FF] transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
                        Lịch sử xử lý AI Interview
                      </span>
                    </summary>
                    <AssessmentError error={logs.error} retry={() => void logs.refetch()} />
                    {showLogs && logs.isPending && (
                      <div className="mt-3 space-y-2" role="status" aria-busy="true">
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <span className="sr-only">Đang tải lịch sử…</span>
                      </div>
                    )}
                    <ol className="mt-3 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800">
                      {logs.data?.map(log => (
                        <li key={log.id} className="pt-2 text-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{log.event} · <span className="font-normal text-slate-400">{formatDateTime(log.createdAt)}</span></p>
                          <p className="mt-0.5 break-words text-slate-500 dark:text-slate-400 leading-relaxed">{log.detail}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
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

function StageQuestionGroup({ stage, stageIndex, interviewId, allQuestions, editable, completed, onChanged }: {
  stage: StageGroup;
  stageIndex: number;
  interviewId: number;
  allQuestions: AiQuestion[];
  completed: boolean;
  editable: boolean;
  onChanged: () => void;
}) {
  const kindLabel = stage.kind === "MCQ" ? "Trắc nghiệm" : stage.kind === "OPEN" ? "Tự luận" : "Kết hợp";
  const complete = stage.questions.length >= stage.configuredCount && stage.configuredCount > 0;

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 transition-all">
      <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-xs font-bold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
            {String(stageIndex + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
                Lộ trình {String(stageIndex + 1).padStart(2, "0")}
              </span>
              <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {kindLabel}
              </span>
            </div>
            <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {stage.title}
            </h4>
            <p className="mt-0.5 text-xs text-slate-400">
              Chặng đánh giá độc lập · câu hỏi và rubric được AI tạo theo cấu hình snapshot.
            </p>
          </div>
        </div>
        <span className={cn(
          "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          complete ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        )}>
          <span className="size-1.5 rounded-full bg-current" />
          {stage.questions.length}/{stage.configuredCount} câu đã tạo
        </span>
      </header>
      <div className="space-y-3 p-4">
        {stage.questions.length > 0 ? (
          <ol className="space-y-3">
            {stage.questions.map(question => (
              <QuestionItem
                key={question.id}
                index={allQuestions.findIndex(item => item.id === question.id)}
                interviewId={interviewId}
                question={question}
                completed={completed}
                editable={editable}
                onChanged={onChanged}
              />
            ))}
          </ol>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <Sparkles className="mx-auto size-5 text-[#0066FF]" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">AI chưa tạo câu hỏi cho lộ trình này</p>
            <p className="mt-0.5 text-xs text-slate-400">Dự kiến {stage.configuredCount} câu · {kindLabel}</p>
          </div>
        )}
      </div>
    </li>
  );
}

function PipelineStrip({ passed }: { passed: boolean }) {
  const steps = [
    { label: "CV Screening", meta: "Vòng 1 · Đã vượt qua", icon: CheckCircle2, state: "done" },
    { label: "AI Interview", meta: "Vòng 2 · Đang theo dõi", icon: Bot, state: "active" },
    { label: "Assessment Lab", meta: passed ? "Vòng 3 · Đã mở khóa" : "Mở khóa khi đạt AI Interview", icon: passed ? CheckCircle2 : LockKeyhole, state: passed ? "done" : "locked" },
    { label: "Tuyển dụng & Offer", meta: "Giai đoạn cuối", icon: LockKeyhole, state: "locked" },
  ] as const;

  return (
    <section aria-label="Tiến trình tuyển dụng" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          <Network className="size-4 text-[#0066FF]" aria-hidden="true" />
          Tiến trình Pipeline tuyển dụng
        </h3>
        <p className="text-xs text-slate-400">Vòng sau chỉ mở khi ứng viên đạt vòng trước.</p>
      </div>
      <ol className="grid gap-2.5 md:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = step.state === "active";
          return (
            <li
              key={step.label}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-all",
                active
                  ? "border-[#0066FF] bg-blue-50/50 shadow-2xs dark:bg-blue-950/40"
                  : "border-slate-200/70 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40"
              )}
            >
              <span className={cn(
                "grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold",
                active
                  ? "bg-[#0066FF] text-white"
                  : step.state === "done"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-400"
              )}>
                {active ? index + 1 : <Icon className="size-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[10px] font-bold uppercase tracking-wider", active ? "text-[#0066FF]" : "text-slate-400")}>
                  {step.meta}
                </span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {step.label}
                </span>
              </span>
            </li>
          );
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

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#0066FF] border border-blue-100 dark:bg-blue-950 dark:text-blue-300">
          <ShieldCheck className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Quản trị phiên</h3>
          <p className="text-[11px] text-slate-400">Dữ liệu thực tế và điều kiện khóa phiên.</p>
        </div>
      </div>
      <dl className="mt-3 space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="text-right font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Metric({ icon: Icon, label, value, hint, emphasized = false }: { icon: LucideIcon; label: string; value: string; hint: string; emphasized?: boolean }) {
  return (
    <div className="flex min-h-28 flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
      <div>
        <dt className="flex items-center justify-between gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>{label}</span>
          <Icon className="size-3.5 text-[#0066FF]" aria-hidden="true" />
        </dt>
        <dd className={cn("mt-1.5 break-words text-sm font-extrabold leading-snug", emphasized ? "text-[#0066FF]" : "text-slate-900 dark:text-slate-100")}>
          {value}
        </dd>
      </div>
      <p className="mt-2 text-[10px] text-slate-400 truncate">{hint}</p>
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
        try { await onSubmit(values); if (!onCancel) reset({ ...defaults, questionOrder: values.questionOrder + 1 }); } catch { /* Mutation error is shown without clearing draft */ }
      })}
    >
      <label className="block space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>Nội dung câu hỏi</span>
        <textarea className={cn(assessmentInput, "min-h-24")} {...register("questionText")} disabled={pending} />
        <FieldError message={errors.questionText?.message} />
      </label>
      {!lockStructure && (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Loại câu hỏi</span>
            <select className={assessmentInput} {...register("questionType")} disabled={pending}>
              {AI_QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Thứ tự</span>
            <input type="number" min={0} className={assessmentInput} {...register("questionOrder")} disabled={pending} />
            <FieldError message={errors.questionOrder?.message} />
          </label>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Huỷ
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer"
        >
          {pending ? "Đang lưu…" : submitLabel}
        </button>
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Thêm câu hỏi
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/40">
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

function QuestionItem({ index, interviewId, question, editable, completed, onChanged }: { completed: boolean; index: number; interviewId: number; question: AiQuestion; editable: boolean; onChanged: () => void }) {
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
  const tags = [...(question.competencies ?? []).filter(key => key === AVAILABLE_INTERVIEW_PROCESS).map(key => COMPETENCY_LABELS[key as CompetencyKey] ?? key), ...(question.skills ?? [])];

  return (
    <li className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-5">
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
          <div className="min-w-0 flex-1">
            <p className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0066FF] dark:text-blue-400">
              <span className="grid size-6 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
                {index + 1}
              </span>
              <span>{planned ? question.stageTitle : `${question.questionType} · thứ tự ${question.questionOrder}`}</span>
              {mcq && <span>· Trắc nghiệm</span>}
            </p>
            <p className="mt-2.5 whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
              {question.questionText}
            </p>
            {tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1" aria-label="Tiêu chí đánh giá">
                {tags.map(tag => (
                  <li key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            {mcq && (
              <ol className="mt-2.5 space-y-1.5 text-xs">
                {question.options!.map((option, i) => (
                  <li
                    key={i}
                    className={cn(
                      "p-2 rounded-lg border",
                      question.correctOption === i || question.correctOptions?.includes(i)
                        ? "border-emerald-300 bg-emerald-50/70 font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    )}
                  >
                    {String.fromCharCode(65 + i)}. {option}
                    {(question.correctOption === i || question.correctOptions?.includes(i)) && " (đáp án đúng)"}
                    {parseChoiceAnswer(answer?.answerText).selectedOptions.includes(i) && " · ứng viên chọn"}
                  </li>
                ))}
              </ol>
            )}
            {mcq && parseChoiceAnswer(answer?.answerText).explanation && (
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <strong>Ứng viên giải thích:</strong> {parseChoiceAnswer(answer?.answerText).explanation}
              </p>
            )}
            {mcq && question.explanation && (
              <p className="mt-1 text-[11px] text-slate-400">
                <strong>Giải thích:</strong> {question.explanation}
              </p>
            )}
          </div>
          {editable && !(planned && mcq) && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                aria-label="Sửa câu hỏi"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
              {!planned && (
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
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
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {answer ? (
        <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">
              Câu trả lời · {formatDateTime(answer.answeredAt)}{answer.answerDuration != null ? ` · ${answer.answerDuration}s` : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {!answer.answerText ? "Bỏ trống (0 điểm)" : mcq ? `Chọn ${String.fromCharCode(65 + Number(answer.answerText))}` : answer.answerText}
            </p>
          </div>
          <FeedbackView feedback={answer.feedback} answer={answer} />
          {completed && <InterviewRecordingReview interviewId={interviewId} answerId={answer.id} />}
        </div>
      ) : (
        <p className="text-xs italic text-slate-400">Ứng viên chưa trả lời.</p>
      )}
    </li>
  );
}

function FeedbackView({ feedback, answer }: { feedback: AiFeedback | null; answer: AiAnswer }) {
  let metrics: { durationMs?: number; voicedMs?: number; silenceMs?: number; pauseCount?: number; responseLatencyMs?: number | null } | undefined;
  let wordsPerMinute: number | undefined;
  try {
    const evaluation = JSON.parse(feedback?.evaluationJson ?? "{}");
    metrics = evaluation.speechMetrics;
    wordsPerMinute = evaluation.wordsPerMinute;
  } catch {
    /* ignore */
  }
  if (answer.speechMetrics) {
    metrics = answer.speechMetrics;
    wordsPerMinute = metrics.voicedMs && answer.answerText?.trim() ? answer.answerText.trim().split(/\s+/).length * 60000 / metrics.voicedMs : undefined;
  }

  return (
    <div className="space-y-2 text-xs">
      {feedback ? (
        <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-1.5">
          <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Đánh giá AI</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
              {feedback.score ?? "—"}/100
            </span>
          </p>
          <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">{feedback.feedbackText}</p>
          {feedback.strengths && <p className="text-emerald-700 dark:text-emerald-400"><strong>Điểm mạnh:</strong> {feedback.strengths}</p>}
          {feedback.weaknesses && <p className="text-amber-700 dark:text-amber-400"><strong>Cần cải thiện:</strong> {feedback.weaknesses}</p>}
        </div>
      ) : (
        <p className="text-slate-400 italic">Chưa có đánh giá AI.</p>
      )}
      {metrics && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 space-y-1 text-[11px]">
          <p className="font-bold text-slate-800 dark:text-slate-200">Tín hiệu lời nói (tham khảo)</p>
          <p>Thời lượng: {((metrics.durationMs ?? 0) / 1000).toFixed(1)}s · Thời gian nói: {((metrics.voicedMs ?? 0) / 1000).toFixed(1)}s · Khoảng dừng ≥ 0,6s: {metrics.pauseCount ?? 0}</p>
          <p>Im lặng: {((metrics.silenceMs ?? 0) / 1000).toFixed(1)}s · Tỷ lệ có tiếng nói: {metrics.durationMs ? `${Math.round((metrics.voicedMs ?? 0) * 100 / metrics.durationMs)}%` : "Chưa đủ dữ liệu"}</p>
          <p>Phản hồi: {metrics.responseLatencyMs == null ? "Chưa đủ dữ liệu" : `${(metrics.responseLatencyMs / 1000).toFixed(1)}s`}{wordsPerMinute != null && ` · Tốc độ: ${Math.round(wordsPerMinute)} từ/phút nói`}</p>
          <p className="text-[10px] text-slate-400 pt-1">Ước lượng từ micro của trình duyệt; không cộng tự động vào điểm nội dung.</p>
        </div>
      )}
    </div>
  );
}
