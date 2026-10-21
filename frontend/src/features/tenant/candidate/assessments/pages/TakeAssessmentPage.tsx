import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Send } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentMuted as muted } from "@/components/ux/assessmentUi";
import { useUiStore } from "@/stores/uiStore";
import { AssessmentResult } from "../components/AssessmentResult";
import { AssessmentAnswerInput } from "../components/AssessmentAnswerInput";
import { AssessmentProctorGuard } from "../components/AssessmentProctorGuard";
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

  // Device check only lives on invite — bounce back if /take opened without an active proctor session.
  useEffect(() => {
    if (room.query.isPending || !submission) return;
    if (submission.status !== "IN_PROGRESS") return;
    const session = getAssessmentProctor(id);
    if (session) {
      setProctor(session);
      return;
    }
    navigate(invite, { replace: true });
  }, [id, invite, navigate, room.query.isPending, submission]);

  useEffect(() => {
    if (!active || !proctor) return;
    const blockLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const lockHistory = () => window.history.pushState({ examLock: true }, "", window.location.href);
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

  if (!proctor) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--color-surface-alt)] p-4 text-[var(--color-on-surface)]">
        <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">
          Đang chuyển về lời mời để kiểm tra thiết bị…
        </p>
      </main>
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
      <section className="flex h-dvh flex-col overflow-hidden bg-[var(--color-surface-alt)] text-[var(--color-on-surface)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-default)] bg-white px-4 py-2.5 sm:px-5">
          <ExamStepper
            quizCount={quiz.length}
            codingCount={coding.length}
            inCoding={inCoding}
            quizCompleted={!!submission.objectiveCompletedAt}
            quizRemaining={room.objectiveRemaining}
          />
          <div
            role="timer"
            aria-label="Thời gian còn lại"
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 font-semibold tabular-nums ${
              seconds < 60
                ? "border-[var(--color-status-danger)] bg-[var(--color-error-container)] text-[var(--color-status-danger)]"
                : "border-[var(--color-border-default)] bg-[var(--color-surface-alt)]"
            }`}
          >
            <Clock className="size-5 shrink-0" aria-hidden="true" />
            <span className="text-xl sm:text-2xl">{formatTimer(seconds)}</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          <AssessmentError error={room.query.error} retry={() => void room.query.refetch()} />
          <AssessmentError error={room.error} retry={seconds > 0 ? room.retrySave : undefined} />
          {room.query.isPending && <p role="status">Đang tải bài làm…</p>}
          {inCoding ? (
            <div className="flex h-full min-h-0 flex-col">
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
            <div className="flex h-full min-h-0 flex-col">
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
                <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white shadow-sm">
                  <div className="shrink-0 border-b border-[var(--color-border-default)] px-4 py-3 sm:px-5">
                    <p className={muted}>
                      Câu {safeIndex + 1} / {quiz.length} · {question.points} điểm
                    </p>
                    <h2 className="mt-1 whitespace-pre-wrap break-words text-lg font-semibold leading-7 sm:text-xl sm:leading-8">
                      {question.questionText}
                    </h2>
                  </div>
                  <fieldset disabled={locked} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
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

        <footer className="shrink-0 border-t border-[var(--color-border-default)] bg-white px-4 py-3 sm:px-5">
          {inCoding ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {coding.length > 1 && (
                  <>
                    <Button variant="secondary" disabled={safeIndex === 0} onClick={() => setIndex(Math.max(0, safeIndex - 1))}>
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Câu trước
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={safeIndex >= coding.length - 1}
                      onClick={() => setIndex(safeIndex + 1)}
                    >
                      Câu tiếp
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </>
                )}
                <p role="status" className={muted}>
                  {saveLabel} · {answered}/{submission.questions.length} câu đã trả lời
                </p>
              </div>
              <Button disabled={room.submitting} onClick={confirmSubmit}>
                <Send className="size-4" aria-hidden="true" />
                {room.submitting ? "Đang nộp…" : seconds === 0 ? "Hoàn tất bài" : "Nộp bài"}
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
                <Button disabled={locked} onClick={confirmCompleteObjective}>
                  Hoàn thành phần 1
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button disabled={room.submitting} onClick={confirmSubmit}>
                  <Send className="size-4" aria-hidden="true" />
                  {room.submitting ? "Đang nộp…" : seconds === 0 ? "Hoàn tất bài" : "Nộp bài"}
                </Button>
              )}
            </div>
          )}
        </footer>
      </section>
    </AssessmentProctorGuard>
  );
}
