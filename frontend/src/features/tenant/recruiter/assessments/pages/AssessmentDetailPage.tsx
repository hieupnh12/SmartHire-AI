import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { Question, QuestionRequest, TestRequest } from "@/api/types/assessment";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { AssessmentError, assessmentLink, assessmentMuted as muted, assessmentStatus } from "@/components/ux/assessmentUi";
import { TestForm } from "../components/TestForm";
import { QuestionForm } from "../components/QuestionForm";

export function AssessmentDetailPage() {
  const { id } = useParams();
  const testId = Number(id);
  const isNew = !id || id === "new";
  const valid = Number.isSafeInteger(testId) && testId > 0;
  const navigate = useNavigate();
  const client = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [editor, setEditor] = useState<Question | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const test = useQuery({ queryKey: queryKeys.assessments.detail(testId), queryFn: () => assessmentApi.get(testId), enabled: valid });
  const questions = useQuery({ queryKey: queryKeys.assessments.questions(testId), queryFn: () => assessmentApi.questions(testId), enabled: valid });
  const jobs = useQuery({ queryKey: [...queryKeys.assessments.all(), "jobs"], queryFn: jobApi.options });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
  const metadata = useMutation({ mutationFn: (body: TestRequest) => isNew ? assessmentApi.create(body) : assessmentApi.update(testId, body), onSuccess: async result => {
    client.setQueryData(queryKeys.assessments.detail(result.id), result); setNotice("Đã lưu thông tin đề."); await refresh();
    if (isNew) navigate(`/recruiter/assessments/${result.id}`, { replace: true });
  } });
  const saveQuestion = useMutation({ mutationFn: (body: QuestionRequest) => editor && editor !== "new" ? assessmentApi.updateQuestion(testId, editor.id, body) : assessmentApi.createQuestion(testId, body), onSuccess: async () => { setEditor(null); setNotice("Đã lưu câu hỏi."); await refresh(); } });
  const remove = useMutation({ mutationFn: (questionId: number) => assessmentApi.deleteQuestion(testId, questionId), onSuccess: refresh });
  const publish = useMutation({ mutationFn: () => assessmentApi.publish(testId), onSuccess: async () => { setNotice("Đề đã được xuất bản."); await refresh(); } });
  const busy = metadata.isPending || saveQuestion.isPending || remove.isPending || publish.isPending;
  const draft = isNew || test.data?.status === "DRAFT";
  const total = questions.data?.reduce((sum, q) => sum + q.points, 0) ?? 0;
  if (!isNew && !valid) return <p role="alert">Mã đề không hợp lệ.</p>;
  return <section className="space-y-6 text-[var(--color-on-surface)]">
    <Link className={assessmentLink} to="/recruiter/assessments"><ArrowLeft className="size-4" aria-hidden="true" />Danh sách đề</Link>
    <header className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className={muted}>{isNew ? "Đề mới" : assessmentStatus[test.data?.status ?? "DRAFT"]}</p><h1 className="break-words text-2xl font-semibold">{isNew ? "Tạo đề kiểm tra" : test.data?.title ?? "Đề kiểm tra"}</h1></div>
      {!isNew && draft && <Button disabled={busy || dirty || !!editor || !questions.data?.length || questions.isError} onClick={() => { if (window.confirm("Xuất bản đề? Nội dung và thời lượng sẽ không thể sửa.")) publish.mutate(); }}><Send className="size-4" aria-hidden="true" />Xuất bản</Button>}
    </header>
    {notice && <p role="status" className="text-sm text-[var(--color-primary)]">{notice}</p>}
    <AssessmentError error={test.error || questions.error || jobs.error} retry={() => void refresh()} />
    <AssessmentError error={metadata.error || saveQuestion.error || remove.error || publish.error} />
    {!isNew && test.isPending && <p role="status">Đang tải đề…</p>}
    {(isNew || test.data) && <div className="grid gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="min-w-0 space-y-4"><h2 className="text-lg font-semibold">Thông tin đề</h2>
        {draft ? <TestForm key={test.data?.id ?? "new"} test={test.data} jobs={jobs.data?.data ?? []} busy={busy || jobs.isPending || jobs.isError}
          onDirty={setDirty} onSave={async body => { await metadata.mutateAsync(body); }} />
          : <dl className="space-y-3 text-sm"><div><dt className={muted}>Vị trí</dt><dd>{jobs.data?.data.find(j => j.id === test.data?.jobId)?.title ?? `Job #${test.data?.jobId}`}</dd></div><div><dt className={muted}>Thời lượng</dt><dd>{test.data?.durationMinutes} phút</dd></div><div><dt className={muted}>Điểm đạt</dt><dd>{test.data?.passingScore ?? "Không đặt"}</dd></div><div><dt className={muted}>Mô tả</dt><dd className="whitespace-pre-wrap break-words">{test.data?.description || "Không có"}</dd></div></dl>}
      </section>
      <section className="min-w-0 space-y-4 xl:border-l xl:border-[var(--color-border-default)] xl:pl-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Câu hỏi</h2><p className={muted}>{questions.data?.length ?? 0} câu · {total} điểm</p></div>
        {!isNew && draft && <Button variant="secondary" disabled={busy || !!editor || (questions.data?.length ?? 0) >= 100} onClick={() => { saveQuestion.reset(); setEditor("new"); }}><Plus className="size-4" aria-hidden="true" />Thêm câu</Button>}
      </div>
      {isNew && <p className={muted}>Chưa có câu hỏi.</p>}
      {questions.isPending && !isNew && <p role="status">Đang tải câu hỏi…</p>}
      {editor && <QuestionForm key={editor === "new" ? "new" : editor.id} question={editor === "new" ? undefined : editor} order={Math.max(-1, ...(questions.data ?? []).map(q => q.questionOrder)) + 1} busy={busy} onSave={body => saveQuestion.mutate(body)} onCancel={() => setEditor(null)} />}
      {questions.data?.map((q, index) => <article key={q.id} className="space-y-3 border-t border-[var(--color-border-default)] py-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={muted}>Câu {index + 1} · {q.points} điểm</p><h3 className="whitespace-pre-wrap break-words font-medium">{q.questionText}</h3></div>
          {draft && <div className="flex shrink-0"><Tooltip content="Sửa câu hỏi"><Button variant="ghost" disabled={busy || !!editor} aria-label={`Sửa câu ${index + 1}`} onClick={() => { saveQuestion.reset(); setEditor(q); }}><Pencil className="size-4" aria-hidden="true" /></Button></Tooltip><Tooltip content="Xóa câu hỏi"><Button variant="ghost" disabled={busy || !!editor} aria-label={`Xóa câu ${index + 1}`} onClick={() => { if (window.confirm("Xóa câu hỏi này?")) remove.mutate(q.id); }}><Trash2 className="size-4" aria-hidden="true" /></Button></Tooltip></div>}
        </div><ul className="space-y-2">{q.options.map(o => <li key={o.id} className={`flex items-start gap-2 break-words text-sm ${o.correct ? "font-medium text-[var(--color-primary)]" : ""}`}><span className="inline-flex size-5 shrink-0">{o.correct && <Check className="size-4" aria-label="Đáp án đúng" />}</span><span className="min-w-0 whitespace-pre-wrap break-words">{o.optionText}</span></li>)}</ul>
      </article>)}
      </section>
    </div>}
  </section>;
}
