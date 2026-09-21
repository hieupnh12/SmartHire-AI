import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Clock } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { button, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { mockAssignments } from "@/features/tenant/candidate/assessments/constants/mockAssignments";

export function TakeAssessmentPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const assignment = useMemo(
    () => mockAssignments.find((row) => String(row.id) === assignmentId && row.questions.length > 0),
    [assignmentId],
  );

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [secondsLeft, setSecondsLeft] = useState((assignment?.durationMinutes ?? 0) * 60);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!assignment || submitted) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [assignment, submitted]);

  if (!assignment) {
    return (
      <section className="space-y-4 text-[var(--color-on-surface)]">
        <p role="alert">Không tìm thấy bài làm, hoặc bài này đã nộp.</p>
        <Link className={button} to="/candidate/assessments">Về danh sách bài test</Link>
      </section>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const answered = Object.keys(answers).length;

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl space-y-6 text-[var(--color-on-surface)]">
        <div className={`${panel} space-y-3`}>
          <h1 className="text-2xl font-semibold">Đã nộp bài (mock)</h1>
          <p className={muted}>
            Hệ thống sẽ chấm trắc nghiệm tự động. “Đã hoàn thành” chưa đồng nghĩa “đã vượt vòng”.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className={primary} to={`/candidate/applications/${assignment.applicationId}`}>
              Về chi tiết đơn
            </Link>
            <Link className={button} to="/candidate/assessments">
              Danh sách bài test
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={muted}>{assignment.jobTitle}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{assignment.testTitle}</h1>
          <p className={`mt-2 ${muted}`}>
            Đã trả lời {answered}/{assignment.questions.length} · lưu nháp local (chưa API)
          </p>
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-4 py-2 font-mono text-lg"
          aria-live="polite"
        >
          <Clock className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
          {mm}:{ss}
        </div>
      </header>

      <PrototypeBanner note="timer chỉ demo · chuyển tab chưa xử lý chống gian lận" />

      <ol className="space-y-4">
        {assignment.questions.map((question, index) => (
          <li key={question.id} className={`${panel} space-y-3`}>
            <p className="font-semibold">
              Câu {index + 1}. {question.text}
            </p>
            <div className="grid gap-2">
              {question.options.map((option, optIndex) => {
                const selected = answers[question.id] === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition-colors ${
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
                        : "border-[var(--color-border-default)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      name={`q-${question.id}`}
                      checked={selected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                    />
                    <span>
                      <span className="mr-2 font-mono text-[var(--color-on-surface-variant)]">
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      {option.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          onClick={() => window.alert("Đã lưu nháp cục bộ (mock).")}
        >
          Lưu nháp
        </button>
        <button
          type="button"
          className={primary}
          onClick={() => {
            if (answered < assignment.questions.length) {
              const ok = window.confirm("Còn câu chưa trả lời. Vẫn nộp?");
              if (!ok) return;
            }
            setSubmitted(true);
          }}
        >
          Nộp bài
        </button>
        <button type="button" className={button} onClick={() => navigate("/candidate/assessments")}>
          Thoát
        </button>
      </div>
    </section>
  );
}
