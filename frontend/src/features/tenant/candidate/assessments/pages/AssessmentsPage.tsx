import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Clock } from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentInput as input, assessmentMuted as muted, assessmentStatus } from "@/components/ux/assessmentUi";

export function AssessmentsPage() {
  const [params, setParams] = useSearchParams();
  const [starting, setStarting] = useState<number | null>(null);
  const navigate = useNavigate();
  const client = useQueryClient();
  const applications = useQuery({ queryKey: [...queryKeys.assessments.all(), "applications"], queryFn: applicantApi.mine });
  const eligible = (applications.data?.data ?? []).filter(a => !a.archived && ["ASSESSMENT", "INTERVIEW"].includes(a.status));
  const requested = Number(params.get("applicationId"));
  const applicationId = eligible.find(a => a.id === requested)?.id ?? eligible[0]?.id ?? 0;
  const tests = useQuery({ queryKey: queryKeys.assessments.available(applicationId), queryFn: () => assessmentApi.available(applicationId), enabled: applicationId > 0 });
  const start = useMutation({ mutationFn: (id: number) => assessmentApi.start(id, applicationId), onSuccess: result => {
    client.setQueryData(queryKeys.assessments.submission(result.id), result);
    navigate(`/candidate/assessments/${result.id}/take`);
  }, onSettled: () => setStarting(null) });
  return <section className="space-y-6 text-[var(--color-on-surface)]">
    <header><p className={muted}>Ứng tuyển / Đánh giá kỹ thuật</p><h1 className="mt-1 text-2xl font-semibold">Bài kiểm tra</h1></header>
    <AssessmentError error={applications.error} retry={() => void applications.refetch()} />
    <AssessmentError error={tests.error} retry={() => void tests.refetch()} />
    <AssessmentError error={start.error} />
    {applications.isPending && <p role="status">Đang tải đơn ứng tuyển…</p>}
    {applications.isSuccess && !eligible.length && <div className="flex items-center gap-3 border-y border-[var(--color-border-default)] py-8"><ClipboardCheck className="size-8 text-[var(--color-primary)]" aria-hidden="true" /><p>Chưa có đơn ứng tuyển ở vòng kiểm tra.</p></div>}
    {!!eligible.length && <>
      <label className="block max-w-lg space-y-1 text-sm">Đơn ứng tuyển<select className={input} value={applicationId} disabled={start.isPending} onChange={event => { setParams({ applicationId: event.target.value }); start.reset(); }}>
        {eligible.map(a => <option key={a.id} value={a.id}>{a.jobTitle} · Đơn #{a.id}</option>)}
      </select></label>
      {tests.isPending && <p role="status">Đang tải bài kiểm tra…</p>}
      {tests.data?.length === 0 && <p className={muted}>Chưa có đề được xuất bản cho vị trí này.</p>}
      <ul className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">{tests.data?.map(test => {
        const done = test.submissionStatus === "GRADED" || test.submissionStatus === "EXPIRED" || test.submissionStatus === "SUBMITTED";
        return <li key={test.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{test.title}</h2><p className={`mt-1 flex flex-wrap items-center gap-2 ${muted}`}><Clock className="size-4" aria-hidden="true" />{test.durationMinutes} phút · {assessmentStatus[test.submissionStatus ?? "NOT_STARTED"]}</p>{test.description && <p className={`mt-2 whitespace-pre-wrap break-words ${muted}`}>{test.description}</p>}</div>
          <Button disabled={start.isPending} onClick={() => {
            if (test.submissionId && test.submissionStatus !== "NOT_STARTED") { navigate(`/candidate/assessments/${test.submissionId}/take`); return; }
            if (!window.confirm(`Bắt đầu ${test.title}? Thời gian làm bài là ${test.durationMinutes} phút và tiếp tục chạy khi rời trang.`)) return;
            setStarting(test.id); start.mutate(test.id);
          }}>{starting === test.id ? "Đang mở…" : done ? "Xem kết quả" : test.submissionStatus === "IN_PROGRESS" ? "Tiếp tục" : "Bắt đầu"}<ArrowRight className="size-4" aria-hidden="true" /></Button>
        </li>;
      })}</ul>
    </>}
  </section>;
}
