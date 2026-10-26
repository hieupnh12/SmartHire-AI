import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Code2, FileText, Mail, RefreshCw } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { GradeDecision, GradingReview, SubmissionGradingDetail as GradingDetail } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { AssessmentError, assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/uiStore";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown): string { return typeof value === "string" && value.trim() ? value : "AI chưa cung cấp phân tích này."; }
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
const display = (value: number | null | undefined) => value == null ? "—" : Number(value.toFixed(2)).toLocaleString("vi-VN");
const card = "min-w-0 space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5";

export function SubmissionGradingDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const client = useQueryClient();
  const askConfirm = useUiStore(state => state.askConfirm);
  const key = [...queryKeys.assessments.all(), "grading-detail", id];
  const query = useQuery({ queryKey: key, queryFn: () => assessmentApi.gradingDetail(id), refetchInterval: 10000 });
  const { register, watch, getValues, setValue, setError, clearErrors, formState: { errors } } = useForm<{ scores: Record<string, string> }>({ defaultValues: { scores: {} } });
  const values = watch("scores");
  const errorSummary = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.scrollIntoView({ block: "start" }); heading.current?.focus({ preventScroll: true }); }, [id]);
  const [notice, setNotice] = useState("");
  const refresh = async () => { await client.invalidateQueries({ queryKey: queryKeys.assessments.all() }); };
  const approve = useMutation({ mutationFn: (decision: GradeDecision) => assessmentApi.approveGrade(id, decision.questionId, decision.score),
    onSuccess: async (_, decision) => { setValue(`scores.${decision.questionId}`, ""); setNotice("Đã xác nhận duyệt điểm."); await refresh(); } });
  const update = useMutation({ mutationFn: (decisions: GradeDecision[]) => assessmentApi.updateGradingResult(id, decisions),
    onSuccess: async (data, decisions) => { client.setQueryData(key, data); decisions.forEach(decision => setValue(`scores.${decision.questionId}`, "")); setNotice(data.score == null ? "Đã cập nhật điểm. Còn câu hỏi chờ duyệt." : "Đã cập nhật kết quả chính thức."); await refresh(); } });
  const email = useMutation({ mutationFn: () => assessmentApi.sendResultEmail(id), onSuccess: result => setNotice(result.status === "SENT" ? "Kết quả này đã được gửi trước đó (idempotent)." : result.status === "PENDING" ? "Đã đưa / tái xếp hàng email kết quả (PENDING). Đây chưa phải xác nhận giao thành công." : "Email kết quả đang FAILED — hệ thống đã reset attempts để worker thử lại.") });
  const retry = useMutation({ mutationFn: () => assessmentApi.retryGrading(id), onSuccess: async () => { setNotice("Đã yêu cầu chấm lại các câu chưa có điểm gợi ý."); await refresh(); } });
  const busy = approve.isPending || update.isPending || email.isPending || retry.isPending;
  const detail = query.data;
  const reviews = detail?.reviews ?? [];
  const dirty = Object.values(values ?? {}).some(value => value?.trim());
  const decisionFor = (review: GradingReview): GradeDecision | null => {
    const raw = getValues(`scores.${review.questionId}`)?.trim() ?? "";
    if (!raw && review.suggestedScore == null) { setError(`scores.${review.questionId}`, { message: "Chưa có điểm AI. Nhập điểm để duyệt thủ công." }); return null; }
    const score = raw ? Number(raw) : null;
    const valid = !raw || (/^\d+(\.\d{1,2})?$/.test(raw) && z.number().finite().min(0).max(review.points).safeParse(score).success);
    if (!valid) { setError(`scores.${review.questionId}`, { message: `Nhập điểm từ 0 đến ${review.points}, tối đa 2 chữ số thập phân.` }); return null; }
    clearErrors(`scores.${review.questionId}`);
    return { questionId: review.questionId, score };
  };
  const validate = (selected: GradingReview[]) => {
    const decisions = selected.map(decisionFor);
    if (decisions.some(decision => decision == null)) { requestAnimationFrame(() => errorSummary.current?.focus()); return null; }
    return decisions as GradeDecision[];
  };
  return <section aria-label={`Xem và duyệt bài làm ${id}`} className="min-w-0 space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 ref={heading} tabIndex={-1} className="scroll-mt-32 text-xl font-semibold">Xem & Duyệt kết quả · Bài làm #{id}</h2>{detail && <p className="mt-2 break-words text-sm">{detail.candidateName} · {detail.testTitle}</p>}</div><Button variant="ghost" disabled={busy} onClick={() => {
      if (dirty) askConfirm({ title: "Đóng màn hình duyệt điểm?", description: "Điểm ghi đè chưa lưu sẽ bị bỏ.", confirmLabel: "Đóng", onConfirm: onClose }); else onClose();
    }}>Đóng</Button></header>
    <AssessmentError error={query.error} retry={() => void query.refetch()} />
    <AssessmentError error={approve.error || update.error || email.error || retry.error} />
    {notice && <p role="status" className="rounded-lg bg-[var(--color-primary-subtle)] p-3 text-sm text-[var(--color-primary)]">{notice}</p>}
    {query.isPending && (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <SkeletonCard className="h-44" />
        <SkeletonCard className="h-44" />
      </div>
    )}
    {Object.keys(errors.scores ?? {}).length > 0 && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-[var(--color-status-danger)] p-3 text-sm"><p className="font-medium">Kiểm tra điểm ghi đè trước khi lưu:</p>{Object.entries(errors.scores ?? {}).map(([questionId, error]) => <a key={questionId} href={`#override-${id}-${questionId}`} className="mt-1 block underline">Câu #{questionId}: {error?.message}</a>)}</div>}
    {detail && <>
      <div className={card}><h3 className="font-semibold">Kết quả chính thức</h3><p className="text-2xl font-semibold">{detail.score == null ? "Chờ duyệt đầy đủ" : `${display(detail.score)} / ${detail.totalPoints} điểm`}</p><p className="text-sm">{detail.passingScore == null ? "Không đặt ngưỡng đạt" : `Ngưỡng đạt: ${display(detail.passingScore)} điểm`}{detail.score != null && detail.passingScore != null ? detail.score >= detail.passingScore ? " · Đạt yêu cầu" : " · Chưa đạt yêu cầu" : ""}</p></div>
      {detail.integrity && <IntegrityPanel integrity={detail.integrity} />}
      <section className={card}><h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 text-[var(--color-primary)]" aria-hidden="true" />1. TRẮC NGHIỆM · Chấm tự động</h3><p className="text-sm">{detail.objective.correctCount}/{detail.objective.questionCount} câu đúng · {display(detail.objective.score)}/{detail.objective.totalPoints} điểm · Tỉ lệ đúng {detail.objective.questionCount ? display(detail.objective.correctCount / detail.objective.questionCount * 100) : "0"}%</p>{detail.objective.questionCount === 0 && <p className="text-sm text-[var(--color-on-surface-variant)]">Đề không có câu trắc nghiệm.</p>}</section>
      {(["ESSAY", "CODING"] as const).map(type => <section key={type} className="min-w-0 space-y-4"><h3 className="flex items-center gap-2 font-semibold">{type === "ESSAY" ? <FileText className="size-5" aria-hidden="true" /> : <Code2 className="size-5" aria-hidden="true" />}{type === "ESSAY" ? "2. TỰ LUẬN LÝ THUYẾT · AI Rubric & Duyệt điểm" : "3. THỬ THÁCH LẬP TRÌNH · Sandbox & AI Review"}</h3>
        {reviews.filter(review => review.type === type).length === 0 && <p className="text-sm">Không có câu hỏi thuộc nhóm này.</p>}
        {reviews.filter(review => review.type === type).map(review => <article key={review.questionId} className={card}>
          <h4 className="whitespace-pre-wrap break-words font-semibold">{review.prompt}</h4>
          <p className="text-xs text-[var(--color-on-surface-variant)]">Câu #{review.questionId} · {review.points} điểm{review.language ? ` · ${review.language}` : ""}</p>
          <div><h5 className="mb-2 text-sm font-medium">{type === "ESSAY" ? "Bài viết của ứng viên" : "Mã nguồn ứng viên đã nộp"}</h5><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm"><code>{review.answerText?.trim() ? review.answerText : "Ứng viên không trả lời câu hỏi này."}</code></pre></div>
          {type === "ESSAY" ? <EssayEvidence review={review} /> : <CodingEvidence review={review} />}
          <p className="text-sm">Điểm AI đề xuất: <strong>{display(review.suggestedScore)}/{review.points}</strong> · {review.reviewedAt ? `Đã duyệt ${display(review.score)}/${review.points} điểm` : "Chờ Recruiter duyệt"}</p>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end"><label className="min-w-0 w-full flex-1 text-sm" htmlFor={`override-${id}-${review.questionId}`}>Điểm ghi đè của Recruiter (tùy chọn)<input id={`override-${id}-${review.questionId}`} type="number" min={0} max={review.points} step="0.01" className={assessmentInput} disabled={busy} placeholder={review.suggestedScore == null ? "Nhập điểm thủ công" : "Để trống để nhận điểm AI"} {...register(`scores.${review.questionId}`, { onChange: () => clearErrors(`scores.${review.questionId}`) })} aria-invalid={!!errors.scores?.[String(review.questionId)]} aria-describedby={`override-error-${id}-${review.questionId}`} /><span id={`override-error-${id}-${review.questionId}`}><FieldError message={errors.scores?.[String(review.questionId)]?.message} /></span></label>
            <Button className="w-full sm:w-auto sm:shrink-0" disabled={busy} onClick={() => { const decisions = validate([review]); if (decisions) approve.mutate(decisions[0]); }}><Check className="size-4" aria-hidden="true" />Xác nhận duyệt điểm</Button></div>
        </article>)}
      </section>)}
      <footer className="space-y-3 border-t border-[var(--color-border-default)] pt-4"><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => { const selected = reviews.filter(review => !review.reviewedAt || getValues(`scores.${review.questionId}`)?.trim()); const decisions = validate(selected); if (decisions) update.mutate(decisions); }}>Cập nhật kết quả bài thi</Button>
        <Button variant="secondary" disabled={busy || detail.score == null || !detail.emailAvailable || dirty || reviews.some(review => !review.reviewedAt)} onClick={() => askConfirm({ title: "Gửi email kết quả bài thi?", description: `Gửi kết quả chính thức đã duyệt tới ${detail.candidateEmail}.`, confirmLabel: "Gửi email", onConfirm: async () => { await email.mutateAsync(); } })}><Mail className="size-4" aria-hidden="true" />Gửi email thông báo kết quả cho ứng viên</Button>
        <Button variant="secondary" disabled={busy} onClick={() => retry.mutate()}><RefreshCw className="size-4" aria-hidden="true" />Thử chấm AI lại</Button></div>
        <p className="text-xs text-[var(--color-on-surface-variant)]">{!detail.emailAvailable ? "Ứng viên không có email khả dụng hoặc đã tắt email assessment." : dirty ? "Lưu điểm ghi đè trước khi gửi email." : detail.score == null ? "Email chỉ được gửi khi mọi câu tự luận và code đã được duyệt." : "Điểm AI là đề xuất; điểm chính thức là điểm Recruiter đã xác nhận."}</p>
      </footer>
    </>}
  </section>;
}

function IntegrityPanel({ integrity }: { integrity: NonNullable<GradingDetail["integrity"]> }) {
  const events = integrity.proctorEvents ?? [];
  const runs = integrity.customRuns ?? [];
  return (
    <section className={card}>
      <h3 className="font-semibold">Tín hiệu toàn vẹn · cạnh điểm</h3>
      <p className="text-sm">
        {integrity.proctorEventCount} sự kiện giám sát · {runs.reduce((sum, row) => sum + row.count, 0)} lần custom-run
      </p>
      {runs.length > 0 && (
        <ul className="space-y-1 text-sm">
          {runs.map((row) => (
            <li key={row.questionId}>
              Câu #{row.questionId}: {row.count} custom-run
              {row.prompt ? ` · ${row.prompt.slice(0, 80)}${row.prompt.length > 80 ? "…" : ""}` : ""}
            </li>
          ))}
        </ul>
      )}
      {events.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className="p-2">Sự kiện</th>
                <th scope="col" className="p-2">Thời điểm</th>
                <th scope="col" className="p-2">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr key={`${event.eventType}-${event.createdAt}-${index}`} className="border-t border-[var(--color-border-default)]">
                  <td className="p-2 font-medium">{event.eventType}</td>
                  <td className="whitespace-nowrap p-2">{new Date(event.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="max-w-xs truncate p-2 text-[var(--color-on-surface-variant)]" title={event.detail ?? undefined}>
                    {event.detail ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {integrity.proctorEventCount === 0 && runs.length === 0 && (
        <p className="text-sm text-[var(--color-on-surface-variant)]">Không ghi nhận blur/copy hay custom-run.</p>
      )}
    </section>
  );
}

function EssayEvidence({ review }: { review: GradingReview }) {
  const evaluation = review.evaluation ?? {};
  const results = Array.isArray(evaluation.criteria_results) ? evaluation.criteria_results : [];
  return <div className="min-w-0 space-y-3">
    {evaluation.status === "ERROR" && <p role="status" className="text-sm text-[var(--color-status-warning)]">AI chưa chấm được. Có thể chấm lại hoặc duyệt điểm thủ công.</p>}
    {review.rubric ? <><details className="text-sm"><summary className="cursor-pointer font-medium">Đáp án tham khảo</summary><p className="mt-2 whitespace-pre-wrap break-words">{review.rubric.referenceAnswer}</p></details><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr><th scope="col" className="p-2">Tiêu chí rubric</th><th scope="col" className="p-2">Điểm / Tối đa</th><th scope="col" className="p-2">Nhận xét AI</th></tr></thead><tbody>{review.rubric.criteria.map((criterion, index) => {
      const result = object(results[index]);
      const percent = number(result.score_percent);
      const maximum = review.points * criterion.weight / 100;
      return <tr key={index} className="border-t border-[var(--color-border-default)]"><td className="p-2 align-top"><span className="font-medium">{criterion.name ?? criterion.description}</span><p className="text-xs">Trọng số {criterion.weight}%</p></td><td className="whitespace-nowrap p-2 align-top">{percent != null && percent >= 0 && percent <= 100 ? display(maximum * percent / 100) : "—"} / {display(maximum)}</td><td className="whitespace-pre-wrap break-words p-2 align-top">{text(result.feedback)}</td></tr>;
    })}</tbody></table></div></> : <p className="text-sm">Câu hỏi cũ chưa có rubric. Recruiter có thể duyệt điểm thủ công.</p>}
    <p className="whitespace-pre-wrap break-words text-sm">{text(evaluation.general_comment)}</p>
  </div>;
}

function CodingEvidence({ review }: { review: GradingReview }) {
  const evaluation = review.evaluation ?? {};
  const tests = Array.isArray(evaluation.tests) ? evaluation.tests : [];
  const codeReview = object(evaluation.code_review);
  const hiddenPassed = number(evaluation.hidden_passed);
  const hiddenTotal = number(evaluation.hidden_total);
  const testsPercent = number(evaluation.tests_percent);
  const aiPercent = number(evaluation.ai_percent);
  const formulaPercent = number(evaluation.formula_percent);
  const testWeight = number(evaluation.test_weight) ?? 0.9;
  const aiWeight = number(evaluation.ai_weight) ?? 0.1;
  return <div className="min-w-0 space-y-4">
    {evaluation.status === "ERROR" && <p role="status" className="text-sm text-[var(--color-status-warning)]">Sandbox hoặc AI review chưa khả dụng. Không coi lỗi dịch vụ là điểm 0.</p>}
    {evaluation.manual_review_required === true && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Cần duyệt tay: AI nghi hardcode{evaluation.hardcode_capped === true ? " · điểm đề xuất đã bị trần 50%" : ""}.</p>}
    <p className="text-sm">Hidden tests: {display(hiddenPassed)}/{display(hiddenTotal)} · Correctness: {display(testsPercent)}%</p>
    {testsPercent != null && <p className="text-sm">Công thức: {display(testsPercent)}% × {display(testWeight * 100)}% (test){testsPercent > 0 ? ` + ${display(aiPercent)}% × ${display(aiWeight * 100)}% (AI)` : " · AI bỏ qua vì không pass hidden"} = {display(formulaPercent)}% → gợi ý {display(review.suggestedScore)}/{review.points}</p>}
    {tests.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th scope="col" className="p-2">Test case</th><th scope="col" className="p-2">Loại</th><th scope="col" className="p-2">Kết quả Sandbox</th></tr></thead><tbody>{tests.map((raw, index) => { const test = object(raw); return <tr key={index} className="border-t border-[var(--color-border-default)]"><td className="p-2">Test {index + 1}</td><td className="p-2">{test.sample === true ? "Công khai (không tính điểm)" : "Ẩn"}</td><td className="p-2"><span className={test.passed === true ? "text-emerald-700" : "text-[var(--color-status-danger)]"}>{test.passed === true ? "Passed" : test.passed === false ? "Failed" : "Chưa có kết quả"}</span>{typeof test.status_description === "string" ? ` · ${test.status_description}` : number(test.status) != null ? ` · Trạng thái ${test.status}` : ""}</td></tr>; })}</tbody></table></div>}
    {Object.keys(codeReview).length > 0 && <>
      <div className="grid gap-3 sm:grid-cols-2">{[["Time Complexity", codeReview.time_complexity], ["Space Complexity", codeReview.space_complexity], ["Clean Code", codeReview.clean_code], ["Naming Convention", codeReview.naming_conventions], ["Xử lý ngoại lệ an toàn", codeReview.exception_safety]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm"><h5 className="font-medium">{String(label)}</h5><p className="mt-1 whitespace-pre-wrap break-words">{text(value)}</p></div>)}</div>
      <p className="whitespace-pre-wrap break-words text-sm">AI Code Review: {text(codeReview.general_comment)}</p>
    </>}
    {typeof evaluation.general_comment === "string" && evaluation.general_comment && <p className="text-sm text-[var(--color-on-surface-variant)]">{evaluation.general_comment}</p>}
  </div>;
}
