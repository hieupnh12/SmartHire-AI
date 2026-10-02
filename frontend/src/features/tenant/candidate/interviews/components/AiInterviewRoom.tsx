import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Bot, CheckCircle2, Info, LockKeyhole, LogOut, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { getApiErrorMessage } from "@/lib/axios";
import { useUiStore } from "@/stores/uiStore";
import type { AiAnswer, AiQuestion } from "@/api/types/aiInterview";
import { candidateInterviewApi, type CandidateInterview } from "../api/candidateInterviewApi";
import { useCandidateInterviewScope } from "../hooks/useCandidateInterviews";
import { formatRemaining, useCountdown } from "../hooks/useCountdown";
import { interviewStatus } from "../constants/interviewStatus";
import { INTERVIEW_RULES } from "../constants/interviewRules";
import { InterviewQuestionPanel } from "./InterviewQuestionPanel";
import { InterviewRoadmap } from "./InterviewRoadmap";
import { InterviewProcessNavigator } from "./InterviewProcessNavigator";
import { parseChoiceAnswer } from "@/lib/interview-choice-answer";

const card = "rounded-xl bg-surface-card p-6 shadow-sm";
const answered = (q: AiQuestion) => !!q.answer?.answerText?.trim();

export function AiInterviewRoom({ id }: { id: number }) {
  const scope = useCandidateInterviewScope();
  const client = useQueryClient();
  const navigate = useNavigate();
  const askConfirm = useUiStore(s => s.askConfirm);
  const key = [...scope, id];
  const session = useQuery({ queryKey: key, queryFn: () => candidateInterviewApi.get(id), enabled: !!scope[2], refetchInterval: 15000 });
  const [selected, setSelected] = useState<number | null>(null);
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const [dirtyQuestions, setDirtyQuestions] = useState<Record<number, boolean>>({});
  const onDirty = useCallback((questionId: number, dirty: boolean) => setDirtyQuestions(previous => previous[questionId] === dirty ? previous : { ...previous, [questionId]: dirty }), []);
  function updated(value: CandidateInterview) {
    client.setQueryData(key, value);
    void client.invalidateQueries({ queryKey: scope });
  }
  function saved(questionId: number, answer: AiAnswer) {
    // Saving can advance to the next question and unmount its form before the clean-state effect runs.
    onDirty(questionId, false);
    setOpenedAt(Date.now());
    client.setQueryData<CandidateInterview>(key, previous => previous && ({ ...previous, questions: previous.questions.map(q => q.id === questionId ? { ...q, answer } : q) }));
    setSelected(null);
    void client.invalidateQueries({ queryKey: key });
  }
  const start = useMutation({ mutationFn: async () => { if (session.data?.voiceEnabled) await candidateInterviewApi.consent(id); return candidateInterviewApi.start(id); }, onSuccess: updated });
  const complete = useMutation({ mutationFn: () => candidateInterviewApi.complete(id), onSuccess: updated });
  const retry = useMutation({
    mutationFn: (applicationId: number) => candidateInterviewApi.requestStart(applicationId),
    onSuccess: next => { void client.invalidateQueries({ queryKey: scope }); navigate(`/candidate/interviews/${next.id}`); },
  });
  const data = session.data;
  const inProgress = data?.status === "IN_PROGRESS";
  const remaining = useCountdown(inProgress ? data.expiresAt : null);
  const timeUp = remaining === 0;
  // The backend submits saved answers once the deadline passes; reload to show the submitted state.
  const refetchSession = session.refetch;
  useEffect(() => { if (timeUp) void refetchSession(); }, [timeUp, refetchSession]);
  const busy = start.isPending || complete.isPending || retry.isPending;
  const error = start.error ?? complete.error ?? retry.error;
  const questions = data?.questions ?? [];
  const done = questions.filter(answered).length;
  const unaskedMain = data?.processBased ? Math.max(0, data.questionCount - questions.filter(question => question.questionRole !== "FOLLOW_UP").length) : 0;
  const unanswered = questions.length - done + unaskedMain;
  const dirty = Object.values(dirtyQuestions).some(Boolean);
  const planned = !!data?.expiresAt || !!data?.roadmap || questions.some(q => q.stageTitle);
  const firstOpen = questions.findIndex(q => !answered(q));
  const index = Math.min(selected ?? (firstOpen >= 0 ? firstOpen : 0), Math.max(0, questions.length - 1));
  const canSubmit = !busy && !dirty && !timeUp && questions.length > 0 && (planned || done === questions.length);
  const currentId = inProgress ? questions[index]?.id : undefined;
  useEffect(() => { setOpenedAt(Date.now()); }, [currentId]);
  const answerDuration = () => (questions[index]?.answer?.answerDuration ?? 0) + Math.round((Date.now() - openedAt) / 1000);

  function submit() {
    askConfirm({
      title: "Kết thúc và nộp bài?",
      description: `${unanswered > 0 ? `Còn ${unanswered} câu chưa trả lời sẽ được tính 0 điểm. ` : ""}Sau khi nộp, bạn không thể sửa câu trả lời.`,
      confirmLabel: "Nộp bài",
      danger: unanswered > 0,
      onConfirm: async () => { await complete.mutateAsync(); },
    });
  }

  const unavailable = data && !data.completedAt && (!data.processBased || data.roadmap?.some(step => step.title !== "Communication"));
  if (unavailable) return <section className={card}>
    <Link to="/candidate/interviews" className="inline-flex min-h-11 items-center text-brand-primary">← Về AI Interview</Link>
    <h1 className="text-lg font-semibold">Quy trình sẽ được mở rộng trong tương lai</h1>
    <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Hiện chỉ Communication đang hoạt động. Phiên này dùng quy trình cũ và không thể tiếp tục; vui lòng liên hệ nhà tuyển dụng để nhận phiên Communication mới.</p>
  </section>;

  return <section className="mx-auto max-w-[1720px] space-y-4 text-[var(--color-on-surface)]">
    <Link to="/candidate/interviews" className="inline-flex min-h-11 items-center text-brand-primary">← Về AI Interview</Link>
    {session.isPending && <p role="status">Đang tải phiên phỏng vấn…</p>}
    {session.isError && <div role="alert"><p>{getApiErrorMessage(session.error)}</p><Button onClick={() => void session.refetch()}>Thử lại</Button></div>}
    {data && <>
      <header className={`${card} ${inProgress ? "sticky top-2 z-10" : ""} flex flex-col gap-4 border border-[var(--color-border-default)] bg-[var(--color-surface-card)] lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-sm font-semibold text-brand-primary"><Bot className="size-5" aria-hidden="true" />AI Interview</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{data.jobTitle ?? "AI Interview"}</h1>
              <span className="rounded bg-[var(--color-surface-container)] px-2 py-0.5 font-mono text-xs text-[var(--color-on-surface-variant)]">#AI-{data.id}</span>
            </div>
            <p className="text-sm text-[var(--color-on-surface-variant)]">{interviewStatus[data.status]}{data.attemptNumber && data.attemptNumber > 1 ? ` · Lần làm thứ ${data.attemptNumber}` : ""}</p>
          </div>
        </div>
        {inProgress && <div className="flex items-center justify-between gap-3 lg:justify-end">
          {remaining != null && <div role="timer" aria-label={`Thời gian còn lại ${formatRemaining(remaining)}`}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 ${remaining <= 300 ? "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]" : "bg-[var(--color-surface-container)]"}`}>
            <Timer className="size-5 text-brand-primary" aria-hidden="true" />
            <div className="text-right">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Thời gian còn lại</span>
              <span className="font-mono text-base font-semibold tabular-nums">{timeUp ? "Hết giờ · đang nộp…" : formatRemaining(remaining)}
                {data.durationMinutes && !timeUp ? <span className="text-sm font-normal text-[var(--color-on-surface-variant)]"> / {formatRemaining(data.durationMinutes * 60)}</span> : null}</span>
            </div>
          </div>}
          <Button className="bg-[color:var(--color-error-container)] text-[color:var(--color-on-error-container)] shadow-none hover:bg-[color:var(--color-error-container)] hover:opacity-90" disabled={!canSubmit} onClick={submit}>
            <LogOut className="size-4" aria-hidden="true" />{complete.isPending ? "Đang nộp…" : "Kết thúc"}
          </Button>
        </div>}
      </header>
      {error && <p role="alert">{getApiErrorMessage(error)}</p>}

      {inProgress && <section className="grid gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 md:grid-cols-3" aria-label="Tiến trình tuyển dụng">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3"><CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden="true" /><div><p className="text-xs font-bold">VÒNG 1: CV SCREENING</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">Đã hoàn tất · bạn đã được mời phỏng vấn</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-3"><Bot className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><p className="text-xs font-bold text-[var(--color-primary)]">VÒNG 2: AI INTERVIEW</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">Đang thực hiện · câu trả lời được lưu theo từng câu</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-3"><LockKeyhole className="size-5 shrink-0 text-[var(--color-outline)]" aria-hidden="true" /><div><p className="text-xs font-semibold text-[var(--color-on-surface-variant)]">VÒNG 3: ASSESSMENT</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">Mở theo kết quả của AI Interview</p></div></div>
      </section>}

      {inProgress && <InterviewProcessNavigator steps={data.roadmap} questions={questions} current={index} onSelect={!dirty && !timeUp ? setSelected : undefined} />}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {inProgress && questions.length > 0 && <>
            <InterviewQuestionPanel recordingEnabled={data.recordingEnabled} interviewId={id} questions={questions} index={index} disabled={busy || timeUp} dirty={dirty}
              onSelect={setSelected} onSaved={saved} onDirty={onDirty} answerDuration={answerDuration} />
            <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
              <p className="text-sm">Đã lưu {done}/{questions.length} câu.{unanswered > 0 && planned ? ` Còn ${unanswered} câu chưa trả lời sẽ tính 0 điểm nếu nộp.` : ""}{!planned && unanswered > 0 ? " Cần trả lời đủ các câu trước khi nộp." : ""}</p>
              <Button disabled={!canSubmit} onClick={submit}>{complete.isPending ? "Đang nộp…" : "Nộp bài phỏng vấn"}</Button>
            </div>
          </>}
          {!inProgress && !data.completedAt && <InvitationCard data={data} busy={busy} onStart={() => start.mutate()} />}
          {data.completedAt && <ResultCard data={data} busy={busy} retrying={retry.isPending} onRetry={() => retry.mutate(data.applicationId)} />}
          {data.completedAt && questions.map((question, i) => <article key={question.id} className={`${card} space-y-3`}>
            <p className="text-xs text-[var(--color-on-surface-variant)]">Câu {i + 1}{question.stageTitle ? ` · ${question.stageTitle}` : ""}</p>
            <h3 className="font-semibold">{question.questionText}</h3>
            <p className="whitespace-pre-wrap rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">{submittedAnswer(question)}</p>
            {question.correctOptions?.length ? <p className="text-sm">Đáp án đúng: {question.correctOptions.map(option => String.fromCharCode(65 + option)).join(", ")}</p> : question.correctOption != null && <p className="text-sm">Đáp án đúng: {String.fromCharCode(65 + question.correctOption)}</p>}
            {question.explanation && <p className="whitespace-pre-wrap text-sm">Giải thích: {question.explanation}</p>}
          </article>)}
        </div>
        <aside className="flex flex-col gap-6 lg:col-span-4">
          <InterviewRoadmap steps={data.roadmap} questions={questions} current={inProgress ? index : null} openedAt={openedAt}
            durationMinutes={data.durationMinutes} onSelect={inProgress && !dirty && !timeUp ? setSelected : undefined} />
          <section className={`${card} space-y-2`} aria-labelledby="interview-rules">
            <h2 id="interview-rules" className="flex items-center gap-2 font-semibold"><Info className="size-5 text-brand-primary" aria-hidden="true" />Quy định AI Interview</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-on-surface-variant)]">{INTERVIEW_RULES.map(rule => <li key={rule}>{rule}</li>)}</ul>
          </section>
        </aside>
      </div>
    </>}
  </section>;
}

function InvitationCard({ data, busy, onStart }: { data: CandidateInterview; busy: boolean; onStart: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const count = (kind: "OPEN" | "MCQ") => data.roadmap?.filter(s => s.kind === kind).reduce((sum, s) => sum + s.questionCount, 0) ?? 0;
  const facts = [
    data.roadmap ? ["Câu hỏi phỏng vấn", `${count("OPEN")} câu`] : ["Số câu hỏi", `${data.questionCount} câu`],
    ...(data.roadmap && count("MCQ") > 0 ? [["Mini Assessment", `${count("MCQ")} câu trắc nghiệm`]] : []),
    ...(data.durationMinutes ? [["Tổng thời gian", `${data.durationMinutes} phút`]] : []),
    ["Ngưỡng đạt", `${data.passingScore ?? "—"}/100`],
  ];
  return <section className={`${card} space-y-5`} aria-labelledby="invitation-title">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Lời mời phỏng vấn</p>
      <h2 id="invitation-title" className="mt-1 text-xl font-semibold">Vòng AI Interview · {data.jobTitle ?? `Hồ sơ #${data.applicationId}`}</h2>
      <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">CV đã qua vòng sàng lọc. AI hỏi theo lượt và điều chỉnh câu tiếp theo dựa trên câu trả lời; bạn có thể nói hoặc nhập văn bản. Câu đã được đánh giá không thể sửa.</p>
    </div>
    <dl className="grid gap-3 sm:grid-cols-2">{facts.map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--color-surface-container-low)] p-3">
      <dt className="text-xs text-[var(--color-on-surface-variant)]">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
    {data.status === "GENERATING" && <p role="status">AI đang chuẩn bị câu hỏi. Trang sẽ tự cập nhật khi sẵn sàng.</p>}
    {data.status === "CREATED" && <p role="status">Nhà tuyển dụng đang chuẩn bị câu hỏi. Lời mời sẽ cập nhật khi phiên sẵn sàng.</p>}
    {data.status === "ERROR" && <p role="alert">{data.errorMessage ?? "Phiên gặp lỗi xử lý. Nhà tuyển dụng có thể thử lại."} Lỗi hệ thống không tính vào số lần làm.</p>}
    {data.status === "QUESTIONS_READY" && <div className="space-y-3">
      <p className="text-sm">Thời gian bắt đầu tính khi bạn bấm “Bắt đầu phỏng vấn”. Hãy chuẩn bị trước khi bắt đầu.</p>
      {data.voiceEnabled && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />Tôi đồng ý dùng micro, chuyển giọng nói thành transcript và phân tích tín hiệu lời nói{data.recordingEnabled ? ", lưu bản ghi âm riêng tư cho nhà tuyển dụng xem xét sau phiên" : ""}.</label>}
      <Button size="lg" disabled={busy || !!data.voiceEnabled && !accepted} onClick={onStart}>{busy ? "Đang bắt đầu…" : "Bắt đầu phỏng vấn"}</Button>
    </div>}
  </section>;
}

function ResultCard({ data, busy, retrying, onRetry }: { data: CandidateInterview; busy: boolean; retrying: boolean; onRetry: () => void }) {
  const finished = ["SCORED", "PASSED", "FAILED"].includes(data.status);
  return <section className={`${card} space-y-3`} aria-live="polite">
    <h2 className="text-xl font-semibold">{finished ? "Kết quả AI Interview" : "Đã nộp bài"}</h2>
    <p className="text-sm">Đã nộp lúc {new Date(data.completedAt!).toLocaleString("vi-VN")}.{finished ? "" : " Câu trả lời đang được đánh giá; trang sẽ tự cập nhật."}</p>
    {data.status === "ERROR" && <p role="alert">{data.errorMessage ?? "Đánh giá gặp lỗi. Nhà tuyển dụng sẽ chấm lại."} Lỗi hệ thống không tính vào số lần làm.</p>}
    {data.overallScore != null && <p>Điểm AI: <strong className="text-lg">{data.overallScore}/100</strong> · Ngưỡng đạt: {data.passingScore ?? "—"}/100</p>}
    {data.status === "PASSED" && <Link className="inline-flex min-h-11 items-center text-brand-primary underline" to="/candidate/assessments">Đến vòng Assessment</Link>}
    {data.status === "FAILED" && (data.canRetry
      ? <div className="space-y-2"><p>Bạn chưa đạt nhưng vẫn còn lượt làm lại trước hạn. Lần làm mới có bộ câu hỏi mới.</p>
          <Button disabled={busy} onClick={onRetry}><RotateCcw className="size-4" aria-hidden="true" />{retrying ? "Đang tạo lượt mới…" : "Làm lại AI Interview"}</Button></div>
      : <p>Bạn chưa đạt ngưỡng và không còn lượt làm lại.</p>)}
  </section>;
}

function submittedAnswer(question: AiQuestion) {
  const text = question.answer?.answerText?.trim();
  if (!text) return "Chưa trả lời (0 điểm)";
  if (question.options?.length) {
    const answer = parseChoiceAnswer(text);
    return answer.selectedOptions.map(i => `${String.fromCharCode(65 + i)}. ${question.options![i]}`).join("\n") + (answer.explanation ? `\nGiải thích: ${answer.explanation}` : "");
  }
  return text;
}
