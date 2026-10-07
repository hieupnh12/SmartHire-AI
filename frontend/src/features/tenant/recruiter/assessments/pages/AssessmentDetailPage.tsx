import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Clock, Pencil, Plus, Send, Target, Trash2 } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { Question, QuestionRequest, TestRequest } from "@/api/types/assessment";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { AssessmentError, assessmentLink, assessmentMuted as muted, assessmentStatus } from "@/components/ux/assessmentUi";
import { TestForm } from "../components/TestForm";
import { QuestionForm } from "../components/QuestionForm";
import { AssessmentQuestionCard } from "../components/AssessmentQuestionCard";

export function AssessmentDetailPage() {
  const job = useRecruitmentJob();
  const { assessmentId } = useParams();
  const testId = Number(assessmentId);
  const isNew = !assessmentId || assessmentId === "new";
  const valid = Number.isSafeInteger(testId) && testId > 0;
  const listPath = `/recruiter/jobs/${job.id}/assessments`;
  const navigate = useNavigate();
  const client = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [editor, setEditor] = useState<Question | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const test = useQuery({ queryKey: queryKeys.assessments.detail(testId), queryFn: () => assessmentApi.get(testId), enabled: valid });
  const questions = useQuery({ queryKey: queryKeys.assessments.questions(testId), queryFn: () => assessmentApi.questions(testId), enabled: valid && test.data?.jobId === job.id });
  const jobs = [job];
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
  const metadata = useMutation({ mutationFn: (body: TestRequest) => isNew ? assessmentApi.create(body) : assessmentApi.update(testId, body), onSuccess: async result => {
    client.setQueryData(queryKeys.assessments.detail(result.id), result); setNotice("Đã lưu thông tin đề."); await refresh();
    if (isNew) {
      navigate(`${listPath}/${result.id}`, { replace: true });
    }
  } });
  const saveQuestion = useMutation({ mutationFn: (body: QuestionRequest) => editor && editor !== "new" ? assessmentApi.updateQuestion(testId, editor.id, body) : assessmentApi.createQuestion(testId, body), onSuccess: async () => { setEditor(null); setNotice("Đã lưu câu hỏi."); await refresh(); } });
  const remove = useMutation({ mutationFn: (questionId: number) => assessmentApi.deleteQuestion(testId, questionId), onSuccess: refresh });
  const publish = useMutation({ mutationFn: () => assessmentApi.publish(testId), onSuccess: async () => { setNotice("Đề đã được xuất bản."); await refresh(); } });
  const busy = metadata.isPending || saveQuestion.isPending || remove.isPending || publish.isPending;
  const draft = isNew || test.data?.status === "DRAFT";
  const total = questions.data?.reduce((sum, q) => sum + q.points, 0) ?? 0;
  if (!isNew && !valid) return <p role="alert">Mã đề không hợp lệ.</p>;
  if (test.data && test.data.jobId !== job.id) return <p role="alert">Đề này không thuộc vị trí đang mở. <Link className={assessmentLink} to={listPath}>Về danh sách đề</Link></p>;
  return <section className="space-y-6 text-[var(--color-on-surface)]">
    <Link className={assessmentLink} to={listPath}><ArrowLeft className="size-4" aria-hidden="true" />Danh sách đề</Link>
    <header className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)] sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="mb-3 inline-flex rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">{isNew ? "Đề mới" : assessmentStatus[test.data?.status ?? "DRAFT"]}</p><h1 className="break-words text-xl font-semibold leading-snug sm:text-2xl">{isNew ? "Tạo đề kiểm tra" : test.data?.title ?? "Đề kiểm tra"}</h1></div>
      {!isNew && draft && <Button disabled={busy || dirty || !!editor || !questions.data?.length || questions.isError} onClick={() => { if (window.confirm("Xuất bản đề? Nội dung và thời lượng sẽ không thể sửa.")) publish.mutate(); }}><Send className="size-4" aria-hidden="true" />Xuất bản</Button>}
      </div>
      {test.data && <dl className="grid gap-4 border-t border-[var(--color-border-default)] pt-5 sm:grid-cols-3">
        <div className="flex items-center gap-3"><Clock className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className={muted}>Thời lượng</dt><dd className="font-semibold">{test.data.durationMinutes} phút</dd></div></div>
        <div className="flex items-center gap-3"><ClipboardList className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className={muted}>Cấu trúc đề</dt><dd className="font-semibold">{questions.isPending || questions.isError ? "—" : `${questions.data?.length ?? 0} câu · ${total} điểm`}</dd></div></div>
        <div className="flex items-center gap-3"><Target className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className={muted}>Điểm đạt</dt><dd className="font-semibold">{test.data.passingScore === null ? "Không đặt" : `${test.data.passingScore} điểm`}</dd></div></div>
      </dl>}
    </header>
    {notice && <p role="status" className="text-sm text-[var(--color-primary)]">{notice}</p>}
    <AssessmentError error={test.error || questions.error} retry={() => void refresh()} />
    <AssessmentError error={metadata.error || saveQuestion.error || remove.error || publish.error} />
    {!isNew && test.isPending && <p role="status">Đang tải đề…</p>}
    {(isNew || test.data) && <div className={`grid items-start gap-6 ${draft ? "xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" : "lg:grid-cols-[320px_minmax(0,1fr)]"}`}>
      <section className="min-w-0 space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)] sm:p-6"><h2 className="text-lg font-semibold">Thông tin đề</h2>
        {draft ? <TestForm key={`${job.id}-${test.data?.id ?? "new"}`} test={test.data} jobs={jobs} lockedJobId={job.id} busy={busy}
          onDirty={setDirty} onSave={async body => { await metadata.mutateAsync(body); }} />
          : <dl className="space-y-5 text-sm"><div className="space-y-2"><dt className={muted}>Vị trí tuyển dụng</dt><dd className="break-words font-medium leading-6">{job.title}</dd></div><div className="space-y-2 border-t border-[var(--color-border-default)] pt-5"><dt className={muted}>Mô tả đề</dt><dd className="whitespace-pre-wrap break-words leading-6">{test.data?.description || "Không có mô tả."}</dd></div></dl>}
      </section>
      <section className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Nội dung câu hỏi</h2><p className={muted}>Câu hỏi, phương án trả lời và giải thích đáp án.</p></div>
        {!isNew && draft && <Button variant="secondary" disabled={busy || !!editor || (questions.data?.length ?? 0) >= 100} onClick={() => { saveQuestion.reset(); setEditor("new"); }}><Plus className="size-4" aria-hidden="true" />Thêm câu</Button>}
      </div>
      {isNew && <p className={muted}>Chưa có câu hỏi.</p>}
      {questions.isPending && !isNew && <p role="status">Đang tải câu hỏi…</p>}
      {editor && <QuestionForm key={editor === "new" ? "new" : editor.id} question={editor === "new" ? undefined : editor} order={Math.max(-1, ...(questions.data ?? []).map(q => q.questionOrder)) + 1} busy={busy} onSave={body => saveQuestion.mutate(body)} onCancel={() => setEditor(null)} />}
      {questions.data?.map((q, index) => <AssessmentQuestionCard key={q.id} question={q} index={index} actions={draft ? <div className="flex shrink-0"><Tooltip content="Sửa câu hỏi"><Button variant="ghost" disabled={busy || !!editor} aria-label={`Sửa câu ${index + 1}`} onClick={() => { saveQuestion.reset(); setEditor(q); }}><Pencil className="size-4" aria-hidden="true" /></Button></Tooltip><Tooltip content="Xóa câu hỏi"><Button variant="ghost" disabled={busy || !!editor} aria-label={`Xóa câu ${index + 1}`} onClick={() => { if (window.confirm("Xóa câu hỏi này?")) remove.mutate(q.id); }}><Trash2 className="size-4" aria-hidden="true" /></Button></Tooltip></div> : undefined} />)}
      </section>
    </div>}
  </section>;
}
