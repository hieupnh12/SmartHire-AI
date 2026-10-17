import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Send } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentLink, assessmentMuted as muted, assessmentStatus } from "@/components/ux/assessmentUi";
import { AssessmentResult } from "../components/AssessmentResult";
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
  const [practicalType, setPracticalType] = useState<"ESSAY" | "CODING">("ESSAY");
  const objective = submission?.questions.filter(q => q.questionType === "MCQ" || q.questionType === "MULTIPLE_CHOICE") ?? [];
  const practical = submission?.questions.filter(q => q.questionType === "ESSAY" || q.questionType === "CODING") ?? [];
  const isPractical = objective.length === 0 || !!submission?.objectiveCompletedAt;
  const practicalKinds = (["ESSAY", "CODING"] as const).filter(type => practical.some(q => q.questionType === type));
  const selectedType = practicalKinds.includes(practicalType) ? practicalType : practicalKinds[0];
  const visible = isPractical ? practical.filter(q => q.questionType === selectedType) : objective;
  const safeIndex = Math.min(index, Math.max(0, visible.length - 1));
  const question = visible[safeIndex];
  const active = submission?.status === "IN_PROGRESS";
  const locked = room.submitting || room.remaining === 0;
  const answered = submission?.questions.filter(q => hasAnswer(room.choices[q.id])).length ?? 0;
  const seconds = room.remaining ?? submission?.remainingSeconds ?? 0;
  const back = `/assessments${submission ? `?applicationId=${submission.applicationId}` : ""}`;
  return <section className={`space-y-6 text-[var(--color-on-surface)] ${submission && !active ? "mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8" : ""}`}>
    <Link className={assessmentLink} to={back}><ArrowLeft className="size-4" aria-hidden="true" />Bài kiểm tra</Link>
    <AssessmentError error={room.query.error} retry={() => void room.query.refetch()} />
    {room.query.isPending && <p role="status">Đang tải bài làm…</p>}
    {submission && <>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border-default)] pb-5"><div className="min-w-0"><p className={muted}>Bài làm #{submission.id}</p><h1 className="break-words text-2xl font-semibold">{submission.title}</h1></div>
        {active ? <div role="timer" aria-label="Thời gian còn lại" className={`flex min-w-28 items-center gap-2 text-xl font-semibold tabular-nums ${seconds < 60 ? "text-[var(--color-status-danger)]" : ""}`}><Clock className="size-5" aria-hidden="true" />{Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}</div> : <span className={muted}>{assessmentStatus[submission.status]}</span>}
      </header>
      {active && <nav aria-label="Các phần bài đánh giá" className="flex flex-wrap gap-3 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
        {objective.length > 0 && <span aria-current={!isPractical ? "step" : undefined} className={!isPractical ? "font-semibold text-[var(--color-primary)]" : muted}>1. Trắc nghiệm · {objective.length} câu {submission.objectiveCompletedAt ? "· Đã chốt" : room.objectiveRemaining != null ? `· ${Math.floor(room.objectiveRemaining / 60)}:${String(room.objectiveRemaining % 60).padStart(2, "0")}` : ""}</span>}
        {practical.length > 0 && <span aria-current={isPractical ? "step" : undefined} className={isPractical ? "font-semibold text-[var(--color-primary)]" : muted}>2. Tự luận & lập trình · {practical.length} câu</span>}
      </nav>}
      <AssessmentError error={room.error} retry={active && seconds > 0 ? room.retrySave : undefined} />
      {!active ? <AssessmentResult submission={submission} back={back} />
        : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <section className="min-w-0 space-y-5">
            {isPractical && <nav aria-label="Loại bài thực hành" className="flex flex-wrap gap-2">{practicalKinds.map(type => <Button key={type} variant={selectedType === type ? "primary" : "secondary"} onClick={() => { setPracticalType(type); setIndex(0); }} aria-pressed={selectedType === type}>{type === "ESSAY" ? "Tự luận lý thuyết" : "Lập trình"}</Button>)}</nav>}
            {!question && <p>Đã hoàn thành phần trắc nghiệm. Bạn có thể nộp bài.</p>}
            {question && <fieldset disabled={locked} className="space-y-4"><legend className="mb-4 w-full"><span className={muted}>Câu {safeIndex + 1} / {visible.length} · {question.points} điểm</span><span className="mt-2 block whitespace-pre-wrap break-words text-lg font-medium">{question.questionText}</span></legend>
              <AssessmentAnswerInput submissionId={id} question={question} answer={room.choices[question.id]} onChange={room.choose} locked={locked} />
            </fieldset>}
            <div className="flex justify-between gap-3"><Button variant="secondary" disabled={safeIndex === 0} onClick={() => setIndex(Math.max(0, safeIndex - 1))}><ArrowLeft className="size-4" aria-hidden="true" />Trước</Button><Button variant="secondary" disabled={safeIndex >= visible.length - 1} onClick={() => setIndex(safeIndex + 1)}>Tiếp<ArrowRight className="size-4" aria-hidden="true" /></Button></div>
          </section>
          <aside className="min-w-0 space-y-5 border-t border-[var(--color-border-default)] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><h2 className="font-semibold">Tiến độ</h2><p className={muted}>{answered}/{submission.questions.length} câu đã trả lời</p>
            <nav aria-label="Danh sách câu hỏi" className="grid grid-cols-5 gap-2">{visible.map((q, i) => <button type="button" key={q.id} aria-label={`Câu ${i + 1}${hasAnswer(room.choices[q.id]) ? ", đã trả lời" : ", chưa trả lời"}`} aria-current={safeIndex === i ? "step" : undefined}
              className={`aspect-square min-h-10 rounded-md border text-sm focus-visible:outline focus-visible:outline-2 ${safeIndex === i ? "ring-2 ring-[var(--color-primary)] ring-offset-2" : ""} ${hasAnswer(room.choices[q.id]) ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "border-[var(--color-outline-variant)]"}`} onClick={() => setIndex(i)}>{i + 1}</button>)}</nav>
            <p role="status" className={muted}>{room.submitting ? "Đang nộp bài…" : room.saving ? "Đang lưu…" : room.unsaved ? "Chưa lưu hết thay đổi" : "Đã lưu"}</p>
            {!isPractical && practical.length > 0 && <Button className="w-full" disabled={locked} onClick={() => {
              if (window.confirm("Chốt đáp án trắc nghiệm và chuyển sang phần tự luận & lập trình? Sau khi chốt không thể sửa phần này.")) void room.completeObjective().then(() => setIndex(0));
            }}>Hoàn thành phần 1<ArrowRight className="size-4" aria-hidden="true" /></Button>}
            <Button className="w-full" disabled={room.submitting || (!isPractical && practical.length > 0 && seconds > 0)} onClick={() => {
              if (seconds === 0 || window.confirm(`Nộp bài với ${answered}/${submission.questions.length} câu đã trả lời? Sau khi nộp không thể sửa.`)) void room.finish(seconds === 0);
            }}><Send className="size-4" aria-hidden="true" />{room.submitting ? "Đang nộp…" : seconds === 0 ? "Hoàn tất bài" : "Nộp bài"}</Button>
          </aside>
        </div>}
    </>}
  </section>;
}
