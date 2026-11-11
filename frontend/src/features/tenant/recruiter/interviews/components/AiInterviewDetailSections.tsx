import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Gauge,
  LockKeyhole,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import type { ScreeningRoundsView } from "@/api/types/applicant";
import {
  COMPETENCY_LABELS,
  type AiAnswer,
  type AiFeedback,
  type AiInterview,
  type AiInterviewLog,
  type AiQuestion,
  type AiQuestionRequest,
  type CompetencyKey,
} from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { AssessmentError, FieldError, assessmentInput } from "@/components/ux/assessmentUi";
import { parseChoiceAnswer } from "@/lib/interview-choice-answer";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { AVAILABLE_INTERVIEW_PROCESS } from "../utils/interviewProcessSettings";
import { AI_QUESTION_TYPES, formatDateTime, formatInterviewScore } from "./aiInterviewUi";
import { InterviewRecordingReview } from "./InterviewRecordingReview";

export type StageGroup = {
  title: string;
  kind: "OPEN" | "MCQ" | "MIXED";
  configuredCount: number;
  questions: AiQuestion[];
};

export function groupQuestionsByStage(interview: AiInterview): StageGroup[] {
  const normalize = (value: string | null | undefined) => value?.trim().toLocaleLowerCase() ?? "";
  const assigned = new Set<number>();
  const groups: StageGroup[] = (interview.roadmap ?? []).map((step) => {
    const questions = interview.questions.filter((question) => normalize(question.stageTitle) === normalize(step.title));
    questions.forEach((question) => assigned.add(question.id));
    return { title: step.title, kind: step.kind, configuredCount: step.questionCount, questions };
  });

  const namedStages = new Map<string, AiQuestion[]>();
  interview.questions
    .filter((question) => !assigned.has(question.id) && question.stageTitle)
    .forEach((question) => {
      const title = question.stageTitle!.trim();
      namedStages.set(title, [...(namedStages.get(title) ?? []), question]);
      assigned.add(question.id);
    });
  namedStages.forEach((questions, title) =>
    groups.push({ title, kind: stageKind(questions), configuredCount: questions.length, questions }),
  );

  const unassigned = interview.questions.filter((question) => !assigned.has(question.id));
  if (unassigned.length > 0) {
    groups.push({ title: "Câu hỏi bổ sung", kind: stageKind(unassigned), configuredCount: unassigned.length, questions: unassigned });
  }
  return groups;
}

function stageKind(questions: AiQuestion[]): StageGroup["kind"] {
  const mcqCount = questions.filter((question) => question.options?.length).length;
  if (mcqCount === 0) return "OPEN";
  if (mcqCount === questions.length) return "MCQ";
  return "MIXED";
}

function roundState(
  passed: boolean | null | undefined,
  status: string | undefined,
): "done" | "failed" | "active" | "locked" {
  if (passed === true || status === "PASSED") return "done";
  if (passed === false || status === "FAILED" || status === "ERROR") return "failed";
  if (status && status !== "MISSING" && status !== "NOT_STARTED") return "active";
  return "locked";
}

export function PipelineStrip({
  passed,
  failed,
  rounds,
}: {
  passed: boolean;
  failed?: boolean;
  rounds?: ScreeningRoundsView | null;
}) {
  const cvState = rounds ? roundState(rounds.cv.passed, rounds.cv.status) : "done";
  const aiState: "done" | "failed" | "active" = passed ? "done" : failed ? "failed" : "active";
  const assessState = rounds
    ? roundState(rounds.assessment.passed, rounds.assessment.status)
    : passed
      ? "done"
      : "locked";
  const offerState = cvState === "done" && aiState === "done" && assessState === "done" ? "done" : "locked";

  const steps = [
    {
      label: "CV Screening",
      meta: cvState === "done" ? "Vòng 1 · Đã vượt qua" : cvState === "failed" ? "Vòng 1 · Chưa đạt" : "Vòng 1 · Đang xét",
      icon: cvState === "failed" ? XCircle : CheckCircle2,
      state: cvState,
    },
    {
      label: "AI Interview",
      meta: aiState === "done" ? "Vòng 2 · Đã đạt" : aiState === "failed" ? "Vòng 2 · Chưa đạt" : "Vòng 2 · Đang theo dõi",
      icon: Bot,
      state: aiState,
    },
    {
      label: "Assessment Lab",
      meta:
        assessState === "done"
          ? "Vòng 3 · Đã đạt"
          : assessState === "failed"
            ? "Vòng 3 · Chưa đạt"
            : assessState === "active"
              ? "Vòng 3 · Đang thực hiện"
              : "Mở khóa khi đạt AI Interview",
      icon: assessState === "done" ? CheckCircle2 : assessState === "failed" ? XCircle : LockKeyhole,
      state: assessState,
    },
    {
      label: "Tuyển dụng & Offer",
      meta: offerState === "done" ? "Sẵn sàng vòng phỏng vấn trực tiếp" : "Giai đoạn cuối",
      icon: offerState === "done" ? CheckCircle2 : LockKeyhole,
      state: offerState,
    },
  ] as const;

  return (
    <section
      aria-label="Tiến trình tuyển dụng"
      className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs"
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          <Network className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          Tiến trình Pipeline tuyển dụng
        </h3>
        <p className="text-xs text-slate-400">Vòng sau chỉ mở khi ứng viên đạt vòng trước.</p>
      </div>
      <ol className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCurrent = step.label === "AI Interview";
          return (
            <li
              key={step.label}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-all",
                isCurrent
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] shadow-2xs"
                  : "border-slate-200/70 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold",
                  step.state === "done"
                    ? "border border-emerald-200/60 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    : step.state === "failed"
                      ? "border border-rose-200/60 bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                      : isCurrent
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-slate-200 text-slate-400 dark:bg-slate-700",
                )}
              >
                {isCurrent && step.state === "active" ? index + 1 : <Icon className="size-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[10px] font-bold uppercase tracking-wider",
                    isCurrent
                      ? step.state === "failed"
                        ? "text-rose-600"
                        : step.state === "done"
                          ? "text-emerald-600"
                          : "text-[var(--color-primary-hover)]"
                      : "text-slate-400",
                  )}
                >
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

export function SessionMetricsSection({
  interview,
  progressLabel,
  progressHint,
}: {
  interview: AiInterview;
  progressLabel: string;
  progressHint: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] shadow-2xs">
            <Gauge className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Thông số phiên AI Interview</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cấu hình snapshot và trạng thái vận hành của phiên ứng viên.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Snapshot Policy Active
        </span>
      </div>

      <dl className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          icon={Network}
          label={interview.conversational ? "Tiến độ hội thoại" : "Quy trình & câu hỏi"}
          value={progressLabel}
          hint={progressHint}
        />
        <Metric
          icon={Timer}
          label="Thời lượng phiên"
          value={`${interview.durationMinutes ?? "—"} phút`}
          hint="Đếm ngược theo snapshot"
        />
        <Metric
          icon={Gauge}
          label="Điểm đạt"
          value={`${interview.passingScore ?? "—"}/100`}
          hint="Ngưỡng đạt vòng tiếp"
          emphasized
        />
        <Metric
          icon={RefreshCw}
          label="Lượt thi tối đa"
          value={`${interview.maxAttempts ?? interview.attemptNumber ?? 1} lần`}
          hint={`Lần thứ ${interview.attemptNumber ?? 1}`}
        />
        <Metric
          icon={CalendarClock}
          label="Khung mở phòng"
          value={`${formatDateTime(interview.availableFrom)} → ${formatDateTime(interview.availableUntil)}`}
          hint="Thời gian được phép làm"
        />
        <Metric
          icon={Bot}
          label="Trạng thái phiên"
          value={interview.status}
          hint={`Tạo lúc ${formatDateTime(interview.createdAt)}`}
        />
      </dl>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  emphasized = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex min-h-26 flex-col justify-between rounded-xl border border-slate-200/70 bg-[var(--color-surface-alt)] p-3.5">
      <div>
        <dt className="flex items-center justify-between gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>{label}</span>
          <Icon className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
        </dt>
        <dd
          className={cn(
            "mt-1.5 break-words text-sm font-extrabold leading-snug",
            emphasized ? "text-[var(--color-primary-hover)]" : "text-slate-900 dark:text-slate-100",
          )}
        >
          {value}
        </dd>
      </div>
      <p className="mt-2 truncate text-[10px] text-slate-400">{hint}</p>
    </div>
  );
}

export function SessionGovernanceSection({ interview }: { interview: AiInterview }) {
  const rows = [
    ["Đơn ứng tuyển", `#${interview.applicationId}`],
    ["Ứng viên", interview.candidateId ? `#${interview.candidateId}` : "—"],
    ["Điểm AI", interview.overallScore == null ? "Chưa có điểm" : `${formatInterviewScore(interview.overallScore)}/100`],
    ["Bắt đầu thực tế", formatDateTime(interview.startedAt)],
    ["Hoàn tất", formatDateTime(interview.completedAt)],
    ["Hạn nộp bài", formatDateTime(interview.expiresAt)],
  ];

  return (
    <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <span className="grid size-9 place-items-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
          <ShieldCheck className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Quản trị phiên
          </h3>
          <p className="text-[11px] text-slate-400">Dữ liệu thực tế và điều kiện khóa phiên.</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200/70 bg-[var(--color-surface-alt)] px-3.5 py-2.5 text-xs">
            <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function SessionLogsSection({
  logs,
  isPending,
  error,
  onRetry,
}: {
  logs: AiInterviewLog[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <ChevronRight className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Lịch sử xử lý AI Interview
        </h3>
      </div>

      <AssessmentError error={error} retry={onRetry} />

      {isPending && (
        <div className="mt-3 space-y-2" role="status" aria-busy="true">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <span className="sr-only">Đang tải lịch sử…</span>
        </div>
      )}

      {!isPending && !error && (!logs || logs.length === 0) && (
        <p className="mt-3 text-xs text-slate-400">Chưa ghi nhận sự kiện xử lý nào cho phiên này.</p>
      )}

      {logs && logs.length > 0 && (
        <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((log) => (
            <li key={log.id} className="py-2.5 text-xs first:pt-0 last:pb-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {log.event} · <span className="font-normal text-slate-400">{formatDateTime(log.createdAt)}</span>
              </p>
              {log.detail && <p className="mt-0.5 break-words leading-relaxed text-slate-500 dark:text-slate-400">{log.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function StageQuestionsSection({
  interview,
  stageGroups,
  editable,
  planned,
  busy,
  generatePending,
  onGenerate,
  onChanged,
}: {
  interview: AiInterview;
  stageGroups: StageGroup[];
  editable: boolean;
  planned: boolean;
  busy: boolean;
  generatePending: boolean;
  onGenerate: () => void;
  onChanged: () => void;
}) {
  const askConfirm = useUiStore((s) => s.askConfirm);

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
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
              if (!interview.questions.length) {
                onGenerate();
                return;
              }
              askConfirm({
                title: "Sinh lại bộ câu hỏi nháp?",
                description:
                  "AI sẽ dùng cấu hình đã lưu của phiên. Chỉ thay câu hỏi nháp chưa trả lời khi bộ mới hợp lệ; giữ nguyên lượt phỏng vấn.",
                confirmLabel: "Sinh lại",
                onConfirm: async () => {
                  onGenerate();
                },
              });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 transition-all hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-subtle)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Sparkles className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            <span>
              {generatePending
                ? "Đang gửi yêu cầu…"
                : interview.questions.length
                  ? "Sinh lại theo cấu hình"
                  : "Sinh câu hỏi bằng AI"}
            </span>
          </button>
        )}
      </div>

      {!interview.questions.length && !stageGroups.length && interview.status !== "GENERATING" && (
        <p className="p-4 text-xs text-slate-400">Chưa có lộ trình hoặc câu hỏi Communication.</p>
      )}

      <ol className="space-y-4" aria-label="Lộ trình và câu hỏi phỏng vấn">
        {stageGroups.map((stage, stageIndex) => (
          <StageQuestionGroup
            key={`${stage.title}-${stageIndex}`}
            stage={stage}
            stageIndex={stageIndex}
            interviewId={interview.id}
            allQuestions={interview.questions}
            completed={!!interview.completedAt}
            editable={editable && !busy}
            onChanged={onChanged}
          />
        ))}
      </ol>

      {editable && !busy && !planned && (
        <AddQuestionForm
          interviewId={interview.id}
          nextOrder={Math.max(-1, ...interview.questions.map((q) => q.questionOrder)) + 1}
          onAdded={onChanged}
        />
      )}
    </section>
  );
}

function StageQuestionGroup({
  stage,
  stageIndex,
  interviewId,
  allQuestions,
  editable,
  completed,
  onChanged,
}: {
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
    <li className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)]">
            {String(stageIndex + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
                Lộ trình {String(stageIndex + 1).padStart(2, "0")}
              </span>
              <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {kindLabel}
              </span>
            </div>
            <h4 className="mt-1 text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">{stage.title}</h4>
            <p className="mt-0.5 text-xs text-slate-400">
              Chặng đánh giá độc lập · câu hỏi và rubric được AI tạo theo cấu hình snapshot.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            complete ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {stage.questions.length}/{stage.configuredCount} câu đã tạo
        </span>
      </header>
      <div className="space-y-3 p-4">
        {stage.questions.length > 0 ? (
          <ol className="space-y-3">
            {stage.questions.map((question) => (
              <QuestionItem
                key={question.id}
                index={allQuestions.findIndex((item) => item.id === question.id)}
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
            <Sparkles className="mx-auto size-5 text-[var(--color-primary)]" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              AI chưa tạo câu hỏi cho lộ trình này
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Dự kiến {stage.configuredCount} câu · {kindLabel}
            </p>
          </div>
        )}
      </div>
    </li>
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: defaults,
  });

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSubmit(values);
          if (!onCancel) reset({ ...defaults, questionOrder: values.questionOrder + 1 });
        } catch {
          /* Mutation error is shown without clearing draft */
        }
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
              {AI_QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
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
            className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            Huỷ
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[var(--color-primary-hover)] cursor-pointer"
        >
          {pending ? "Đang lưu…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function AddQuestionForm({
  interviewId,
  nextOrder,
  onAdded,
}: {
  interviewId: number;
  nextOrder: number;
  onAdded: () => void;
}) {
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
        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Đóng
      </Button>
    </div>
  );
}

function QuestionItem({
  index,
  interviewId,
  question,
  editable,
  completed,
  onChanged,
}: {
  completed: boolean;
  index: number;
  interviewId: number;
  question: AiQuestion;
  editable: boolean;
  onChanged: () => void;
}) {
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
  const tags = [
    ...(question.competencies ?? [])
      .filter((key) => key === AVAILABLE_INTERVIEW_PROCESS)
      .map((key) => COMPETENCY_LABELS[key as CompetencyKey] ?? key),
    ...(question.skills ?? []),
  ];

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
            <p className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
              <span className="grid size-6 place-items-center rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)]">
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
                {tags.map((tag) => (
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
                      "rounded-lg border p-2",
                      question.correctOption === i || question.correctOptions?.includes(i)
                        ? "border-emerald-300 bg-emerald-50/70 font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
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
                className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Sửa câu hỏi"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
              {!planned && (
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  aria-label="Xoá câu hỏi"
                  onClick={() =>
                    askConfirm({
                      title: "Xoá câu hỏi này?",
                      description: "Câu trả lời và feedback của câu hỏi cũng bị xoá.",
                      confirmLabel: "Xoá",
                      danger: true,
                      onConfirm: async () => {
                        await aiInterviewApi.deleteQuestion(interviewId, question.id);
                        onChanged();
                      },
                    })
                  }
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
              Câu trả lời · {formatDateTime(answer.answeredAt)}
              {answer.answerDuration != null ? ` · ${answer.answerDuration}s` : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
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
    wordsPerMinute =
      metrics.voicedMs && answer.answerText?.trim()
        ? (answer.answerText.trim().split(/\s+/).length * 60000) / metrics.voicedMs
        : undefined;
  }

  return (
    <div className="space-y-2 text-xs">
      {feedback ? (
        <div className="space-y-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)]/70 p-3">
          <p className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
            <span>Đánh giá AI</span>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary-hover)]">
              {feedback.score ?? "—"}/100
            </span>
          </p>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">{feedback.feedbackText}</p>
          {feedback.strengths && (
            <p className="text-emerald-700 dark:text-emerald-400">
              <strong>Điểm mạnh:</strong> {feedback.strengths}
            </p>
          )}
          {feedback.weaknesses && (
            <p className="text-amber-700 dark:text-amber-400">
              <strong>Cần cải thiện:</strong> {feedback.weaknesses}
            </p>
          )}
        </div>
      ) : (
        <p className="italic text-slate-400">Chưa có đánh giá AI.</p>
      )}
      {metrics && (
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <p className="font-bold text-slate-800 dark:text-slate-200">Tín hiệu lời nói (tham khảo)</p>
          <p>
            Thời lượng: {((metrics.durationMs ?? 0) / 1000).toFixed(1)}s · Thời gian nói: {((metrics.voicedMs ?? 0) / 1000).toFixed(1)}s · Khoảng dừng ≥ 0,6s:{" "}
            {metrics.pauseCount ?? 0}
          </p>
          <p>
            Im lặng: {((metrics.silenceMs ?? 0) / 1000).toFixed(1)}s · Tỷ lệ có tiếng nói:{" "}
            {metrics.durationMs ? `${Math.round(((metrics.voicedMs ?? 0) * 100) / metrics.durationMs)}%` : "Chưa đủ dữ liệu"}
          </p>
          <p>
            Phản hồi: {metrics.responseLatencyMs == null ? "Chưa đủ dữ liệu" : `${(metrics.responseLatencyMs / 1000).toFixed(1)}s`}
            {wordsPerMinute != null && ` · Tốc độ: ${Math.round(wordsPerMinute)} từ/phút nói`}
          </p>
          <p className="pt-1 text-[10px] text-slate-400">Ước lượng từ micro của trình duyệt; không cộng tự động vào điểm nội dung.</p>
        </div>
      )}
    </div>
  );
}
