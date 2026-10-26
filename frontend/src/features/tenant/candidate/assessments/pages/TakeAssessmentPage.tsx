import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock3, Expand, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentMuted as muted } from "@/components/ux/assessmentUi";
import { useUiStore } from "@/stores/uiStore";
import { AssessmentResult } from "../components/AssessmentResult";
import { AssessmentAnswerInput } from "../components/AssessmentAnswerInput";
import { AssessmentProctorGuard, ExamFullscreenButton, ExamMonitor } from "../components/AssessmentProctorGuard";
import { examIsFullscreen } from "../utils/examFullscreen";
import type { ProctorSession } from "../components/AssessmentProctorGate";
import { ExamStepper } from "../components/ExamStepper";
import { hasAnswer } from "../utils/hasAnswer";
import { getAssessmentProctor, releaseAssessmentProctor } from "../utils/assessmentProctorHandoff";
import { useSubmission } from "../hooks/useSubmission";

const isQuiz = (type: string) => type === "MCQ" || type === "MULTIPLE_CHOICE" || type === "ESSAY";

function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function TakeAssessmentPage() {
  const { submissionId } = useParams();
  const id = Number(submissionId);
  return Number.isSafeInteger(id) && id > 0 ? <SubmissionRoom key={id} id={id} /> : <p role="alert">Mã bài làm không hợp lệ.</p>;
}

function SubmissionRoom({ id }: { id: number }) {
  const navigate = useNavigate();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const room = useSubmission(id);
  const [index, setIndex] = useState(0);
  const [proctor, setProctor] = useState<ProctorSession | null>(() => getAssessmentProctor(id));
  const [fullscreen, setFullscreen] = useState(examIsFullscreen);
  const submission = room.query.data;
  const quiz = submission?.questions.filter((q) => isQuiz(q.questionType)) ?? [];
  const coding = submission?.questions.filter((q) => q.questionType === "CODING") ?? [];
  const inCoding = quiz.length === 0 || !!submission?.objectiveCompletedAt;
  const visible = inCoding ? coding : quiz;
  const safeIndex = Math.min(index, Math.max(0, visible.length - 1));
  const question = visible[safeIndex];
  const active = submission?.status === "IN_PROGRESS";
  const locked = room.submitting || room.remaining === 0;
  const answered = submission?.questions.filter((q) => hasAnswer(room.choices[q.id])).length ?? 0;
  const seconds = room.remaining ?? submission?.remainingSeconds ?? 0;
  const back = `/assessments${submission ? `?applicationId=${submission.applicationId}` : ""}`;
  const invite =
    submission != null
      ? `/assessments/${submission.testId}/invite?applicationId=${submission.applicationId}`
      : "/assessments";

  const releaseProctor = useCallback(() => {
    releaseAssessmentProctor(id);
    setProctor(null);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, [id]);

  useEffect(() => {
    const sync = () => setFullscreen(examIsFullscreen());
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync as EventListener);
    const timer = window.setInterval(sync, 400);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync as EventListener);
      window.clearInterval(timer);
    };
  }, []);

  // Proctor session if available (pure fullscreen mode does not require media session).
  useEffect(() => {
    if (room.query.isPending || !submission) return;
    if (submission.status !== "IN_PROGRESS") return;
    const session = getAssessmentProctor(id);
    if (session) {
      setProctor(session);
    }
  }, [id, room.query.isPending, submission]);

  useEffect(() => {
    if (!active) return;
    const blockLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const lockHistory = () => {
      if (document.fullscreenElement) return;
      window.history.pushState({ examLock: true }, "", window.location.href);
    };
    lockHistory();
    const onPopState = () => lockHistory();
    window.addEventListener("beforeunload", blockLeave);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", blockLeave);
      window.removeEventListener("popstate", onPopState);
    };
  }, [active, proctor]);

  const finishExam = useCallback(
    async (expired: boolean) => {
      try {
        await room.finish(expired);
      } finally {
        releaseProctor();
      }
    },
    [releaseProctor, room],
  );

  const confirmSubmit = () => {
    if (!submission) return;
    if (seconds === 0) {
      void finishExam(true);
      return;
    }
    askConfirm({
      title: "Nộp bài?",
      description: `Bạn đã trả lời ${answered}/${submission.questions.length} câu. Sau khi nộp không thể sửa.`,
      confirmLabel: "Nộp bài",
      onConfirm: async () => {
        await finishExam(false);
      },
    });
  };

  const confirmRetake = () => {
    askConfirm({
      title: "Làm lại từ đầu?",
      description: "Bạn sẽ quay lại lời mời để đồng ý quy chế và kiểm tra thiết bị trước khi làm lại.",
      confirmLabel: "Đến lời mời",
      onConfirm: async () => {
        navigate(invite);
      },
    });
  };

  const confirmCompleteObjective = () => {
    askConfirm({
      title: "Chốt phần trắc nghiệm & tự luận?",
      description: "Sau khi chốt bạn sẽ chuyển sang phần lập trình và không thể sửa phần này.",
      confirmLabel: "Chốt phần 1",
      onConfirm: async () => {
        await room.completeObjective();
        setIndex(0);
      },
    });
  };

  if (!active) {
    return (
      <section className="flex h-dvh flex-col overflow-hidden bg-[var(--color-surface-alt)] px-4 py-4 text-[var(--color-on-surface)] sm:px-6 sm:py-5 lg:px-8">
        <AssessmentError error={room.query.error} retry={() => void room.query.refetch()} />
        {room.query.isPending && (
          <p role="status" className="grid flex-1 place-items-center text-sm text-[var(--color-on-surface-variant)]">
            Đang tải kết quả…
          </p>
        )}
        {submission && (
          <div className="min-h-0 flex-1">
            <AssessmentResult submission={submission} back={back} retaking={false} onRetake={confirmRetake} />
          </div>
        )}
      </section>
    );
  }

  const saveLabel = room.submitting
    ? "Đang nộp bài…"
    : room.saving
      ? "Đang lưu…"
      : room.unsaved
        ? "Chưa lưu hết thay đổi"
        : "Đã lưu";

  return (
    <AssessmentProctorGuard submissionId={id} session={proctor} onAutoSubmit={() => void finishExam(false)}>
      {!fullscreen ? (
        <main className="grid h-full min-h-0 flex-1 place-items-center bg-[var(--color-surface-alt)] p-6 text-[var(--color-on-surface)]">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
            <Expand className="size-9 text-[var(--color-primary)]" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-semibold">Mở toàn màn hình để làm bài</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">
              Bài kiểm tra yêu cầu làm ở chế độ toàn màn hình. Hãy bấm nút bên dưới để mở toàn màn hình và tiếp tục.
            </p>
            <ExamFullscreenButton />
          </div>
        </main>
      ) : (
      <section className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[var(--color-surface-alt)] text-[var(--color-on-surface)]">
        {/* HEADER BAR */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] bg-white px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)] shrink-0">
              <Sparkles className="size-3" /> {submission.title || "BÀI ĐÁNH GIÁ CHÍNH THỨC"}
            </span>
            <ExamStepper
              quizCount={quiz.length}
              codingCount={coding.length}
              inCoding={inCoding}
              quizCompleted={!!submission.objectiveCompletedAt}
              quizRemaining={room.objectiveRemaining}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ExamMonitor />
            <div
              role="timer"
              aria-label="Thời gian còn lại"
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 font-semibold tabular-nums shadow-xs ${
                seconds < 60
                  ? "border-[var(--color-status-danger)] bg-[var(--color-error-container)] text-[var(--color-status-danger)] animate-pulse"
                  : seconds < 300
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]"
              }`}
            >
              <Clock3 className={`size-4.5 shrink-0 ${seconds < 60 ? "text-[var(--color-status-danger)]" : "text-[var(--color-primary)]"}`} aria-hidden="true" />
              <span className="font-mono text-base sm:text-lg">{formatTimer(seconds)}</span>
            </div>
          </div>
        </header>

        {/* QUESTION NAVIGATOR SUB-HEADER */}
        {visible.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)]/70 bg-white px-4 py-2 sm:px-6 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none max-w-full">
              <span className="mr-1 text-xs font-semibold text-[var(--color-on-surface-variant)] shrink-0">
                {inCoding ? "Bài toán:" : "Danh sách câu:"}
              </span>
              {visible.map((q, idx) => {
                const isAnswered = hasAnswer(room.choices[q.id]);
                const isCurrent = idx === safeIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={locked}
                    onClick={() => setIndex(idx)}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-[var(--color-primary)] text-white shadow-xs ring-2 ring-[var(--color-primary)]/30"
                        : isAnswered
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                        : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)] hover:bg-slate-200"
                    }`}
                    title={`Câu ${idx + 1} · ${q.points} điểm`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-on-surface-variant)]">
              <span className="hidden sm:inline">Tiến độ:</span>
              <span className="font-bold text-emerald-700">
                {visible.filter((q) => hasAnswer(room.choices[q.id])).length} / {visible.length} câu đã trả lời
              </span>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-5">
          <AssessmentError error={room.query.error} retry={() => void room.query.refetch()} />
          <AssessmentError error={room.error} retry={seconds > 0 ? room.retrySave : undefined} />
          {room.query.isPending && <p role="status">Đang tải bài làm…</p>}
          {inCoding ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {!question && <p>Không có câu lập trình. Bạn có thể nộp bài.</p>}
              {question && (
                <div className="h-full min-h-0 flex-1">
                  <AssessmentAnswerInput
                    submissionId={id}
                    question={question}
                    answer={room.choices[question.id]}
                    onChange={room.choose}
                    locked={locked}
                    number={safeIndex + 1}
                    onSave={room.saveNow}
                    saving={room.saving}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {!question && (
                <p>Không có câu hỏi phần trắc nghiệm &amp; tự luận. Bạn có thể chuyển sang phần lập trình.</p>
              )}
              {question && question.questionType === "ESSAY" && (
                <div className="h-full min-h-0 flex-1">
                  <AssessmentAnswerInput
                    submissionId={id}
                    question={question}
                    answer={room.choices[question.id]}
                    onChange={room.choose}
                    locked={locked}
                    number={safeIndex + 1}
                    draftSavedAt={room.draftSavedAt}
                    draftError={room.draftError}
                  />
                </div>
              )}
              {question && question.questionType !== "ESSAY" && (
                <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-sm">
                  <div className="shrink-0 border-b border-[var(--color-border-default)] px-4 py-3.5 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">
                          Câu {safeIndex + 1} / {quiz.length}
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {question.points} điểm
                        </span>
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {question.questionType === "MULTIPLE_CHOICE" ? "Chọn nhiều đáp án" : "Trắc nghiệm một đáp án"}
                        </span>
                      </div>
                    </div>
                    <h2 className="mt-3 whitespace-pre-wrap break-words text-base font-semibold leading-7 sm:text-lg sm:leading-8">
                      {question.questionText}
                    </h2>
                  </div>
                  <fieldset disabled={locked} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                    <AssessmentAnswerInput
                      submissionId={id}
                      question={question}
                      answer={room.choices[question.id]}
                      onChange={room.choose}
                      locked={locked}
                      number={safeIndex + 1}
                      draftSavedAt={room.draftSavedAt}
                      draftError={room.draftError}
                    />
                  </fieldset>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-[var(--color-border-default)] bg-white px-4 py-3 sm:px-6">
          {inCoding ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {coding.length > 1 && (
                  <>
                    <Button variant="secondary" disabled={safeIndex === 0} onClick={() => setIndex(Math.max(0, safeIndex - 1))}>
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Bài trước
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={safeIndex >= coding.length - 1}
                      onClick={() => setIndex(safeIndex + 1)}
                    >
                      Bài tiếp
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </>
                )}
                <p role="status" className={muted}>
                  {saveLabel} · {answered}/{submission.questions.length} câu đã trả lời
                </p>
              </div>
              <Button disabled={room.submitting} onClick={confirmSubmit} className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold">
                <Send className="size-4" aria-hidden="true" />
                {room.submitting ? "Đang nộp…" : seconds === 0 ? "Hoàn tất bài" : "Nộp bài thi"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="secondary" disabled={safeIndex === 0} onClick={() => setIndex(Math.max(0, safeIndex - 1))}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Câu trước
              </Button>
              <p role="status" className={muted}>
                {room.saving ? "Đang lưu…" : room.unsaved ? "Chưa lưu hết thay đổi" : "Đã lưu"}
              </p>
              {safeIndex < quiz.length - 1 ? (
                <Button onClick={() => setIndex(safeIndex + 1)}>
                  Câu tiếp theo
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : coding.length > 0 ? (
                <Button disabled={locked} onClick={confirmCompleteObjective} className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold">
                  Hoàn thành phần 1 &amp; Sang phần Lập trình
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button disabled={room.submitting} onClick={confirmSubmit} className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold">
                  <Send className="size-4" aria-hidden="true" />
                  {room.submitting ? "Đang nộp…" : seconds === 0 ? "Hoàn tất bài" : "Nộp bài thi"}
                </Button>
              )}
            </div>
          )}
        </footer>
      </section>
      )}
    </AssessmentProctorGuard>
  );
}
