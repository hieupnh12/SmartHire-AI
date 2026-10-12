import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { GradingReview } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentInput } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";

export function AssessmentGradingPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: [...queryKeys.assessments.all(), "grading", id], queryFn: () => assessmentApi.reviews(id), refetchInterval: 10000 });
  const retry = useMutation({ mutationFn: () => assessmentApi.retryGrading(id), onSuccess: () => query.refetch() });
  const refresh = async () => { await query.refetch(); await client.invalidateQueries({ queryKey: queryKeys.assessments.all() }); };
  return <section aria-label={`Chấm bài làm ${id}`} className="space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Chấm bài làm #{id}</h2><div className="flex gap-2">
      <Button variant="secondary" disabled={retry.isPending} onClick={() => retry.mutate()}>Chấm AI lại</Button><Button variant="ghost" onClick={onClose}>Đóng</Button></div></div>
    <AssessmentError error={query.error ?? retry.error} />
    {query.isPending && <p role="status">Đang tải bài làm…</p>}
    {query.data?.length === 0 && <p>Bài này chỉ có trắc nghiệm; điểm được chấm tự động.</p>}
    {query.data?.map(review => <ReviewAnswer key={`${review.questionId}:${review.reviewedAt}`} id={id} review={review} refresh={refresh} />)}
  </section>;
}
function ReviewAnswer({ id, review, refresh }: { id: number; review: GradingReview; refresh: () => Promise<void> }) {
  const [score, setScore] = useState(String(review.score ?? review.suggestedScore ?? ""));
  const approve = useMutation({ mutationFn: (value: number | null) => assessmentApi.approveGrade(id, review.questionId, value), onSuccess: refresh });
  return <article className="space-y-3 rounded-lg border border-[var(--color-border-default)] p-4">
    <h3 className="whitespace-pre-wrap font-medium">{review.prompt}</h3>
    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">{review.answerText || "Không có bài làm"}</pre>
    {review.rubric && <details><summary className="cursor-pointer text-sm font-medium">Rubric và đáp án mẫu</summary><p className="mt-2 whitespace-pre-wrap text-sm">{review.rubric.referenceAnswer}</p>{review.rubric.criteria.map((criterion, i) => <p key={i} className="text-sm">{criterion.weight}% · {criterion.description}</p>)}</details>}
    <p className="text-sm">Điểm AI đề xuất: <strong>{review.suggestedScore ?? "Chưa có"}/{review.points}</strong>{review.reviewedAt ? " · Đã duyệt" : " · Chờ duyệt"}</p>
    {review.evaluation && <EvaluationFeedback evaluation={review.evaluation} />}
    <div className="flex flex-wrap items-end gap-3"><Button disabled={approve.isPending || review.suggestedScore == null} onClick={() => approve.mutate(null)}>Chấp thuận điểm AI</Button>
      <label className="text-sm">Điểm duyệt<input type="number" min={0} max={review.points} step="0.01" value={score} onChange={event => setScore(event.target.value)} className={assessmentInput} /></label>
      <Button variant="secondary" disabled={approve.isPending || score === "" || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > review.points} onClick={() => approve.mutate(Number(score))}>Lưu điểm điều chỉnh</Button>
    </div><AssessmentError error={approve.error} />
  </article>;
}
function EvaluationFeedback({ evaluation }: { evaluation: Record<string, unknown> }) {
  const criteria = Array.isArray(evaluation.criteria_results) ? evaluation.criteria_results : [];
  const codeReview = typeof evaluation.code_review === "object" && evaluation.code_review != null ? evaluation.code_review as Record<string, unknown> : null;
  return <div className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
    <h4 className="font-medium">Giải trình chấm điểm</h4>
    {evaluation.status === "ERROR" && <p>Chấm tự động chưa khả dụng. Có thể thử lại hoặc chấm thủ công.</p>}
    {typeof evaluation.general_comment === "string" && <p className="whitespace-pre-wrap">{evaluation.general_comment}</p>}
    {criteria.map((item: unknown, i: number) => {
      if (!item || typeof item !== "object") return null;
      const criterion = item as Record<string, unknown>;
      return <p key={i}>Tiêu chí {i + 1}: {typeof criterion.score_percent === "number" ? `${criterion.score_percent}%` : "—"} · {typeof criterion.feedback === "string" ? criterion.feedback : ""}</p>;
    })}
    {typeof evaluation.passed === "number" && typeof evaluation.total === "number" && <p>Test đạt: {evaluation.passed}/{evaluation.total} (80% điểm)</p>}
    {codeReview && <><p>Chất lượng code: {typeof codeReview.score_percent === "number" ? `${codeReview.score_percent}%` : "—"} (20% điểm)</p>
      {typeof codeReview.general_comment === "string" && <p>{codeReview.general_comment}</p>}{codeReview.hardcode_suspected === true && <p className="text-[var(--color-status-warning)]">AI nghi ngờ hardcode; cần người chấm kiểm tra.</p>}</>}
  </div>;
}
