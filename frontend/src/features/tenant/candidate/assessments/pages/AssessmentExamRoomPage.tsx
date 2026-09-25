import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { Button } from "@/components/ux/Button";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { AssessmentExamRoomView } from "../components/AssessmentExamRoomView";
import { AssessmentSubmitModal } from "../components/AssessmentSubmitModal";
import {
  MOCK_EXAM_META,
  buildInitialAnswers,
  buildInitialBookmarks,
  mockExamQuestions,
} from "../constants/mockExam";
import { mockInvitationUser } from "../constants/mockInvitation";

export function AssessmentExamRoomPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const questions = mockExamQuestions;
  const [index, setIndex] = useState(14); // start on featured Q15
  const [answers, setAnswers] = useState(() => buildInitialAnswers(questions));
  const [bookmarked, setBookmarked] = useState(() => new Set(buildInitialBookmarks(questions)));
  const [remainingSeconds, setRemainingSeconds] = useState(18 * 60 + 42);
  const [lastSavedLabel, setLastSavedLabel] = useState(() =>
    new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
  );
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const candidateName = authUser?.fullName || mockInvitationUser.fullName;
  const candidateCode = `CAN-${String(authUser?.id ?? mockInvitationUser.id).padStart(4, "0")}`;

  useEffect(() => {
    if (submitted) return;
    const id = window.setInterval(() => {
      setRemainingSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setSubmitOpen(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [submitted]);

  const touchSave = () => {
    setLastSavedLabel(
      new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    );
  };

  const successReceipt = useMemo(() => MOCK_EXAM_META.receiptCode, []);

  if (submitted) {
    return (
      <section className="space-y-6 text-[var(--color-on-surface)]">
        <PrototypeBanner note="nộp bài mock · biên nhận ảo" />
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl bg-[var(--color-surface-card)] p-8 text-center shadow-md">
          <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary,#fff)]">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Bài thi đã nộp thành công!</h1>
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Dữ liệu {questions.length} câu hỏi đã được mã hóa và lưu trữ an toàn vào hệ thống SmartHire-AI Examination Hub.
          </p>
          <div className="font-mono text-xs font-semibold text-[var(--color-outline)]">Mã định danh biên nhận: {successReceipt}</div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button onClick={() => navigate("/candidate/assessments")}>Về lời mời assessment</Button>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-4 text-sm font-medium"
              to="/candidate"
            >
              Về trang ứng viên
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      <PrototypeBanner note="phòng thi mock · câu 15 volatile · modal nộp bài theo Stitch" />
      <AssessmentExamRoomView
        questions={questions}
        index={index}
        answers={answers}
        bookmarked={bookmarked}
        remainingSeconds={remainingSeconds}
        lastSavedLabel={lastSavedLabel}
        candidateName={candidateName}
        candidateCode={candidateCode}
        onSelect={(questionId, optionId) => {
          setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
          touchSave();
        }}
        onClear={(questionId) => {
          setAnswers((prev) => ({ ...prev, [questionId]: null }));
          touchSave();
        }}
        onToggleBookmark={(questionId) => {
          setBookmarked((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
          });
        }}
        onGo={setIndex}
        onSubmitClick={() => setSubmitOpen(true)}
      />
      <AssessmentSubmitModal
        open={submitOpen}
        questions={questions}
        answers={answers}
        bookmarked={bookmarked}
        remainingSeconds={remainingSeconds}
        submitting={submitting}
        onClose={() => setSubmitOpen(false)}
        onJumpTo={(i) => {
          setIndex(i);
          setSubmitOpen(false);
        }}
        onConfirm={() => {
          setSubmitting(true);
          window.setTimeout(() => {
            setSubmitting(false);
            setSubmitOpen(false);
            setSubmitted(true);
          }, 800);
        }}
      />
    </section>
  );
}
