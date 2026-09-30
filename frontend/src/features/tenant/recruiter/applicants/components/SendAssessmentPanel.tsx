import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { button, input, muted } from "@/features/tenant/recruiter/matching/components/rankingUi";
import type { ApplicationDetail } from "@/api/types/applicant";

export function SendAssessmentPanel({ detail, onSent }: { detail: ApplicationDetail; onSent: () => void }) {
  const [testId, setTestId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tests = useQuery({
    queryKey: [...queryKeys.assessments.all(), "job", detail.jobId],
    queryFn: () => assessmentApi.listForJob(detail.jobId),
  });
  const published = (tests.data?.items ?? []).filter((test) => test.status === "PUBLISHED");
  const selected = published.find((test) => test.id === testId) ?? published[0] ?? null;
  const send = useMutation({
    mutationFn: (id: number) => assessmentApi.send(id, detail.id),
    onSuccess: (result) => {
      setNotice(result.emailSent ? "Đã gửi assessment qua thông báo và email." : "Đã gửi thông báo trong hệ thống; email chưa gửi được.");
      onSent();
    },
  });
  return (
    <div className="space-y-2">
      <p className="font-semibold">Gửi assessment</p>
      {tests.isPending && <p className={muted}>Đang tải đề…</p>}
      {tests.isError && <p role="alert">{getApiErrorMessage(tests.error)}</p>}
      {tests.isSuccess && published.length === 0 && <p className={muted}>Job này chưa có đề đã xuất bản.</p>}
      {selected && (
        <div className="flex flex-wrap gap-2">
          <select className={`${input} sm:max-w-xs`} value={selected.id} onChange={(e) => { setTestId(Number(e.target.value)); setNotice(null); send.reset(); }}>
            {published.map((test) => <option key={test.id} value={test.id}>{test.title} · {test.durationMinutes} phút</option>)}
          </select>
          <button className={button} type="button" disabled={send.isPending} onClick={() => send.mutate(selected.id)}>
            {send.isPending ? "Đang gửi…" : "Gửi cho ứng viên"}
          </button>
        </div>
      )}
      {notice && <p role="status" className={muted}>{notice}</p>}
      {send.isError && <p role="alert">{getApiErrorMessage(send.error)}</p>}
    </div>
  );
}
