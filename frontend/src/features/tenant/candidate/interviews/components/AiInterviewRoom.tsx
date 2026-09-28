import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ux/Button";
import { getApiErrorMessage } from "@/lib/axios";
import { candidateInterviewApi, type CandidateInterview } from "../api/candidateInterviewApi";
import { useCandidateInterviewScope } from "../hooks/useCandidateInterviews";
import { interviewStatus } from "../constants/interviewStatus";
import { InterviewAnswerForm } from "./InterviewAnswerForm";

export function AiInterviewRoom({ id }: { id: number }) {
  const scope = useCandidateInterviewScope();
  const client = useQueryClient();
  const key = [...scope, id];
  const session = useQuery({ queryKey: key, queryFn: () => candidateInterviewApi.get(id), enabled: !!scope[2], refetchInterval: 15000 });
  const [dirtyQuestions, setDirtyQuestions] = useState<Record<number, boolean>>({});
  const onDirty = useCallback((questionId: number, dirty: boolean) => setDirtyQuestions(previous => previous[questionId] === dirty ? previous : { ...previous, [questionId]: dirty }), []);
  function updated(value: CandidateInterview) {
    client.setQueryData(key, value);
    void client.invalidateQueries({ queryKey: scope });
  }
  const start = useMutation({ mutationFn: () => candidateInterviewApi.start(id), onSuccess: updated });
  const complete = useMutation({ mutationFn: () => candidateInterviewApi.complete(id), onSuccess: updated });
  const data = session.data;
  const busy = start.isPending || complete.isPending;
  const error = start.error ?? complete.error;
  const answered = data?.questions.filter(q => q.answer?.answerText?.trim()).length ?? 0;
  const dirty = Object.values(dirtyQuestions).some(Boolean);

  return <section className="mx-auto max-w-4xl space-y-5 text-[var(--color-on-surface)]">
    <Link to="/candidate/interviews" className="inline-flex min-h-11 items-center text-brand-primary">← Về AI Interview</Link>
    {session.isPending && <p role="status">Đang tải phiên phỏng vấn…</p>}
    {session.isError && <div role="alert"><p>{getApiErrorMessage(session.error)}</p><Button onClick={() => void session.refetch()}>Thử lại</Button></div>}
    {data && <>
      <header className="space-y-3 rounded-xl bg-surface-card p-6 shadow-sm"><h1 className="text-2xl font-semibold">{data.jobTitle ?? "AI Interview"}</h1><p>Phiên #{data.id} · {interviewStatus[data.status]}</p>
        {data.status === "GENERATING" && <p role="status">AI đang chuẩn bị câu hỏi. Trang sẽ tự cập nhật khi sẵn sàng.</p>}
        {data.status === "ERROR" && <p role="alert">{data.errorMessage ?? "Phiên gặp lỗi xử lý. Nhà tuyển dụng có thể thử lại."}</p>}
        {data.overallScore != null && <p>Điểm AI: {data.overallScore}/100 · Ngưỡng đạt: {data.passingScore ?? "—"}/100</p>}
        {data.status === "PASSED" && <Link className="inline-flex min-h-11 items-center text-brand-primary underline" to="/candidate/assessments">Đến vòng Assessment</Link>}
        {data.status === "CREATED" && <p>Nhà tuyển dụng đang chuẩn bị câu hỏi. Lời mời này sẽ cập nhật khi phiên phỏng vấn sẵn sàng.</p>}
        {data.status === "QUESTIONS_READY" && <><p>Trả lời bằng văn bản và lưu từng câu trước khi nộp bài.</p><Button disabled={busy} onClick={() => start.mutate()}>Bắt đầu phỏng vấn</Button></>}
        {data.status === "IN_PROGRESS" && <p>Đã lưu {answered}/{data.questions.length} câu trả lời. Bạn có thể tiếp tục các câu đã lưu khi mở lại phiên.</p>}
        {data.completedAt && <p>Đã nộp lúc {new Date(data.completedAt).toLocaleString("vi-VN")}. Câu trả lời đã được lưu{["SCORED", "PASSED", "FAILED"].includes(data.status) ? " và đã có kết quả." : " và đang chờ đánh giá."}</p>}
      </header>
      {error && <p role="alert">{getApiErrorMessage(error)}</p>}
      {(data.status === "IN_PROGRESS" || data.completedAt) && data.questions.map((question, index) => <article key={question.id} className="space-y-4 rounded-xl bg-surface-card p-6 shadow-sm">
        <h2 className="font-semibold">Câu {index + 1}. {question.questionText}</h2>
        {data.status === "IN_PROGRESS" ? <InterviewAnswerForm interviewId={id} question={question} disabled={busy} onDirty={onDirty}
          onSaved={answer => client.setQueryData<CandidateInterview>(key, previous => previous && ({ ...previous, questions: previous.questions.map(q => q.id === question.id ? { ...q, answer } : q) }))} /> : <p className="whitespace-pre-wrap">{question.answer?.answerText}</p>}
      </article>)}
      {data.status === "IN_PROGRESS" && <div className="space-y-3"><p className="text-sm">Sau khi nộp bài, bạn không thể sửa câu trả lời.{dirty ? " Bạn còn thay đổi chưa lưu." : ""}</p><Button disabled={busy || !!dirty || answered === 0 || answered !== data.questions.length} onClick={() => complete.mutate()}>{complete.isPending ? "Đang nộp…" : "Nộp bài phỏng vấn"}</Button></div>}
    </>}
  </section>;
}
