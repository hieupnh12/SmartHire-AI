import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ClipboardList, Clock, Pencil, Plus, Send, Target, Trash2 } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { Question, QuestionRequest, TestRequest } from "@/api/types/assessment";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { AssessmentError, assessmentLink, assessmentMuted as muted, getAssessmentStatusLabel } from "@/components/ux/assessmentUi";
import { useT } from "@/i18n";
import { TestForm } from "../components/TestForm";
import { QuestionForm } from "../components/QuestionForm";
import { AssessmentQuestionCard } from "../components/AssessmentQuestionCard";
import { AssessmentSubNav } from "../components/AssessmentSubNav";

export function AssessmentDetailPage() {
  const t = useT();
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
    client.setQueryData(queryKeys.assessments.detail(result.id), result); setNotice(t("recruiter.assessments.detail.savedMetadataNotice")); await refresh();
    if (isNew) {
      navigate(`${listPath}/${result.id}`, { replace: true });
    }
  } });
  const saveQuestion = useMutation({ mutationFn: (body: QuestionRequest) => editor && editor !== "new" ? assessmentApi.updateQuestion(testId, editor.id, body) : assessmentApi.createQuestion(testId, body), onSuccess: async () => { setEditor(null); setNotice(t("recruiter.assessments.detail.savedQuestionNotice")); await refresh(); } });
  const remove = useMutation({ mutationFn: (questionId: number) => assessmentApi.deleteQuestion(testId, questionId), onSuccess: refresh });
  const publish = useMutation({ mutationFn: () => assessmentApi.publish(testId), onSuccess: async () => { setNotice(t("recruiter.assessments.detail.publishedNotice")); await refresh(); } });
  const busy = metadata.isPending || saveQuestion.isPending || remove.isPending || publish.isPending;
  const draft = isNew || test.data?.status === "DRAFT";
  const total = questions.data?.reduce((sum, q) => sum + q.points, 0) ?? 0;
  if (!isNew && !valid) return <p role="alert">{t("recruiter.assessments.detail.invalidTestId")}</p>;
  if (test.data && test.data.jobId !== job.id) return <p role="alert">{t("recruiter.assessments.detail.wrongJobError")} <Link className={assessmentLink} to={listPath}>{t("recruiter.assessments.detail.backToTestsList")}</Link></p>;
  return <section className="space-y-6 text-[var(--color-on-surface)]">
    <AssessmentSubNav jobId={job.id} activeTab="tests" />
    <header className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)] sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="mb-3 inline-flex rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">{isNew ? t("recruiter.assessments.detail.newTestBadge") : getAssessmentStatusLabel(test.data?.status ?? "DRAFT", t)}</p><h1 className="break-words text-xl font-semibold leading-snug sm:text-2xl">{isNew ? t("recruiter.assessments.detail.createTestHeading") : test.data?.title ?? t("recruiter.assessments.detail.fallbackTestTitle")}</h1></div>
      {!isNew && draft && <Button disabled={busy || dirty || !!editor || !questions.data?.length || questions.isError} onClick={() => { if (window.confirm(t("recruiter.assessments.detail.publishConfirm"))) publish.mutate(); }}><Send className="size-4" aria-hidden="true" />{t("recruiter.assessments.detail.publishBtn")}</Button>}
      </div>
      {test.data && <dl className="grid gap-4 border-t border-[var(--color-border-default)] pt-5 sm:grid-cols-3">
        <div className="flex items-center gap-3"><Clock className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className={muted}>{t("recruiter.assessments.detail.durationLabel")}</dt><dd className="font-semibold">{test.data.durationMinutes} {t("recruiter.assessments.common.minutesUnit")}</dd></div></div>
        <div className="flex items-center gap-3"><ClipboardList className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className={muted}>{t("recruiter.assessments.detail.structureLabel")}</dt><dd className="font-semibold">{questions.isPending || questions.isError ? t("recruiter.assessments.common.dash") : `${questions.data?.length ?? 0} ${t("recruiter.assessments.common.questionsUnit")} · ${total} ${t("recruiter.assessments.common.pointsUnit")}`}</dd></div></div>
        <div className="flex items-center gap-3"><Target className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className={muted}>{t("recruiter.assessments.detail.passingScoreLabel")}</dt><dd className="font-semibold">{test.data.passingScore === null ? t("recruiter.assessments.common.notSet") : `${test.data.passingScore} ${t("recruiter.assessments.common.pointsUnit")}`}</dd></div></div>
      </dl>}
    </header>
    {notice && <p role="status" className="text-sm text-[var(--color-primary)]">{notice}</p>}
    <AssessmentError error={test.error || questions.error} retry={() => void refresh()} />
    <AssessmentError error={metadata.error || saveQuestion.error || remove.error || publish.error} />
    {!isNew && test.isPending && (
      <div className="space-y-4">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-64" />
      </div>
    )}
    {(isNew || test.data) && <div className={`grid items-start gap-6 ${draft ? "xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" : "lg:grid-cols-[320px_minmax(0,1fr)]"}`}>
      <section className="min-w-0 space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)] sm:p-6"><h2 className="text-lg font-semibold">{t("recruiter.assessments.detail.testInfoHeading")}</h2>
        {draft ? <TestForm key={`${job.id}-${test.data?.id ?? "new"}`} test={test.data} jobs={jobs} lockedJobId={job.id} busy={busy}
          onDirty={setDirty} onSave={async body => { await metadata.mutateAsync(body); }} />
          : <dl className="space-y-5 text-sm"><div className="space-y-2"><dt className={muted}>{t("recruiter.assessments.detail.jobLabel")}</dt><dd className="break-words font-medium leading-6">{job.title}</dd></div><div className="space-y-2 border-t border-[var(--color-border-default)] pt-5"><dt className={muted}>{t("recruiter.assessments.detail.descriptionLabel")}</dt><dd className="whitespace-pre-wrap break-words leading-6">{test.data?.description || t("recruiter.assessments.detail.noDescription")}</dd></div></dl>}
      </section>
      <section className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{t("recruiter.assessments.detail.questionsContentHeading")}</h2><p className={muted}>{t("recruiter.assessments.detail.questionsContentSubtitle")}</p></div>
        {!isNew && draft && <Button variant="secondary" disabled={busy || !!editor || (questions.data?.length ?? 0) >= 100} onClick={() => { saveQuestion.reset(); setEditor("new"); }}><Plus className="size-4" aria-hidden="true" />{t("recruiter.assessments.detail.addQuestionBtn")}</Button>}
      </div>
      {isNew && <p className={muted}>{t("recruiter.assessments.detail.noQuestionsInNew")}</p>}
      {questions.isPending && !isNew && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="min-h-32" />
          ))}
        </div>
      )}
      {editor && <QuestionForm key={editor === "new" ? "new" : editor.id} question={editor === "new" ? undefined : editor} order={Math.max(-1, ...(questions.data ?? []).map(q => q.questionOrder)) + 1} busy={busy} onSave={(body: QuestionRequest) => saveQuestion.mutate(body)} onCancel={() => setEditor(null)} />}
      {questions.data?.map((q, index) => <AssessmentQuestionCard key={q.id} question={q} index={index} actions={draft ? <div className="flex shrink-0"><Tooltip content={t("recruiter.assessments.detail.editQuestionTooltip")}><Button variant="ghost" disabled={busy || !!editor} aria-label={t("recruiter.assessments.detail.editQuestionAria", { index: index + 1 })} onClick={() => { saveQuestion.reset(); setEditor(q); }}><Pencil className="size-4" aria-hidden="true" /></Button></Tooltip><Tooltip content={t("recruiter.assessments.detail.deleteQuestionTooltip")}><Button variant="ghost" disabled={busy || !!editor} aria-label={t("recruiter.assessments.detail.deleteQuestionAria", { index: index + 1 })} onClick={() => { if (window.confirm(t("recruiter.assessments.detail.deleteQuestionConfirm"))) remove.mutate(q.id); }}><Trash2 className="size-4" aria-hidden="true" /></Button></Tooltip></div> : undefined} />)}
      </section>
    </div>}
  </section>;
}
