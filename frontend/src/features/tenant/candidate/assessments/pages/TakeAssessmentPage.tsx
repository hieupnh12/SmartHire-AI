import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Send } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentLink, assessmentMuted as muted, assessmentStatus } from "@/components/ux/assessmentUi";
import { AssessmentAnswerInput } from "../components/AssessmentAnswerInput";
import { hasAnswer } from "../utils/hasAnswer";
import { useSubmission } from "../hooks/useSubmission";

export function TakeAssessmentPage() {
  const { submissionId } = useParams();
  const id = Number(submissionId);
  return Number.isSafeInteger(id) && id > 0 ? <SubmissionRoom key={id} id={id} /> : <p role="alert">Mã bài làm không hợp lệ.</p>;
}

function SubmissionRoom({ id }: { id: number }) {
  const room = useSubmission(id);
  const [index, setIndex] = useState(0);
  const submission = room.query.data;
  const question = submission?.questions[index];
  const active = submission?.status === "IN_PROGRESS";
  const locked = room.submitting || room.remaining === 0;
  const answered = submission?.questions.filter(q => hasAnswer(room.choices[q.id])).length ?? 0;
  const seconds = room.remaining ?? submission?.remainingSeconds ?? 0;
  const back = `/candidate/assessments${submission ? `?applicationId=${submission.applicationId}` : ""}`;
  return <section className="space-y-6 text-[var(--color-on-surface)]">
    <Link className={assessmentLink} to={back}><ArrowLeft className="size-4" aria-hidden="true" />Bài kiểm tra</Link>
    <AssessmentError error={room.query.error} retry={() => void room.query.refetch()} />
    {room.query.isPending && <p role="status">Đang tải bài làm…</p>}
    {submission && <>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border-default)] pb-5"><div className="min-w-0"><p className={muted}>Bài làm #{submission.id}</p><h1 className="break-words text-2xl font-semibold">{submission.title}</h1></div>
        {active ? <div role="timer" aria-label="Thời gian còn lại" className={`flex min-w-28 items-center gap-2 text-xl font-semibold tabular-nums ${seconds < 60 ? "text-[var(--color-status-danger)]" : ""}`}><Clock className="size-5" aria-hidden="true" />{Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}</div> : <span className={muted}>{assessmentStatus[submission.status]}</span>}
      </header>
      <AssessmentError error={room.error} retry={active && seconds > 0 ? room.retrySave : undefined} />
      {!active ? <section className="space-y-4 py-6"><CheckCircle2 className="size-10 text-[var(--color-primary)]" aria-hidden="true" /><h2 className="text-xl font-semibold">{submission.status === "EXPIRED" ? "Đã hết thời gian làm bài" : "Bài làm đã được ghi nhận"}</h2><p className="text-3xl font-semibold tabular-nums">{submission.score ?? "Đang chấm"}{submission.score !== null && <span className="text-lg font-normal"> / {submission.totalPoints} điểm</span>}</p>{submission.passed !== null && <p>{submission.passed ? "Đạt ngưỡng điểm của đề." : "Chưa đạt ngưỡng điểm của đề."}</p>}<p className={muted}>{submission.submittedAt && `Nộp lúc ${new Date(submission.submittedAt).toLocaleString("vi-VN")}`}</p></section>
        : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <section className="min-w-0 space-y-5">
            {question && <fieldset disabled={locked} className="space-y-4"><legend className="mb-4 w-full"><span className={muted}>Câu {index + 1} / {submission.questions.length} · {question.points} điểm</span><span className="mt-2 block whitespace-pre-wrap break-words text-lg font-medium">{question.questionText}</span></legend>
              <AssessmentAnswerInput question={question} answer={room.choices[question.id]} onChange={room.choose} locked={locked} />
            </fieldset>}
            <div className="flex justify-between gap-3"><Button variant="secondary" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft className="size-4" aria-hidden="true" />Trước</Button><Button variant="secondary" disabled={index >= submission.questions.length - 1} onClick={() => setIndex(i => i + 1)}>Tiếp<ArrowRight className="size-4" aria-hidden="true" /></Button></div>
          </section>
          <aside className="min-w-0 space-y-5 border-t border-[var(--color-border-default)] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><h2 className="font-semibold">Tiến độ</h2><p className={muted}>{answered}/{submission.questions.length} câu đã trả lời</p>
            <nav aria-label="Danh sách câu hỏi" className="grid grid-cols-5 gap-2">{submission.questions.map((q, i) => <button type="button" key={q.id} aria-label={`Câu ${i + 1}${hasAnswer(room.choices[q.id]) ? ", đã trả lời" : ", chưa trả lời"}`} aria-current={index === i ? "step" : undefined}
              className={`aspect-square min-h-10 rounded-md border text-sm focus-visible:outline focus-visible:outline-2 ${index === i ? "ring-2 ring-[var(--color-primary)] ring-offset-2" : ""} ${hasAnswer(room.choices[q.id]) ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "border-[var(--color-outline-variant)]"}`} onClick={() => setIndex(i)}>{i + 1}</button>)}</nav>
            <p role="status" className={muted}>{room.submitting ? "Đang nộp bài…" : room.saving ? "Đang lưu…" : room.unsaved ? "Chưa lưu hết thay đổi" : "Đã lưu"}</p>
            <Button className="w-full" disabled={room.submitting} onClick={() => {
              if (seconds === 0 || window.confirm(`Nộp bài với ${answered}/${submission.questions.length} câu đã trả lời? Sau khi nộp không thể sửa.`)) void room.finish(seconds === 0);
            }}><Send className="size-4" aria-hidden="true" />{room.submitting ? "Đang nộp…" : seconds === 0 ? "Hoàn tất bài" : "Nộp bài"}</Button>
          </aside>
        </div>}
    </>}
  </section>;
}
