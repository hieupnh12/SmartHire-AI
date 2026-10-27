import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { button, input, muted } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { Skeleton } from "@/components/ux/Skeleton";
import type { ApplicationDetail } from "@/api/types/applicant";
import { CheckCircle2, Send, RefreshCw } from "lucide-react";

export function SendAssessmentPanel({ detail, onSent }: { detail: ApplicationDetail; onSent: () => void }) {
  const client = useQueryClient();
  const [testId, setTestId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const tests = useQuery({
    queryKey: [...queryKeys.assessments.all(), "job", detail.jobId],
    queryFn: () => assessmentApi.listForJob(detail.jobId),
  });

  // Chỉ hiển thị đề đã gán cho ứng viên này hoặc đề mẫu chung (chưa gán cho ai)
  const candidateAssignedTest = (tests.data?.items ?? []).find(
    (test) => test.status === "PUBLISHED" && test.assignedApplicationId === detail.id,
  );

  const availableTests = (tests.data?.items ?? []).filter(
    (test) => test.status === "PUBLISHED" && (!test.assignedApplicationId || test.assignedApplicationId === detail.id),
  );

  const selected = availableTests.find((test) => test.id === testId) ?? (candidateAssignedTest ?? availableTests[0] ?? null);

  const assignAndSend = useMutation({
    mutationFn: (id: number) => assessmentApi.assignToApplication(id, detail.id),
    onSuccess: async (result) => {
      setNotice(
        result.emailSent
          ? "Đã giao đề và gửi lời mời kiểm tra qua thông báo & email."
          : "Đã giao đề và gửi thông báo trong hệ thống; email chưa gửi được.",
      );
      await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      onSent();
    },
  });

  const isAssigned = selected?.assignedApplicationId === detail.id;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">Giao & Gửi đề Assessment</p>
        {candidateAssignedTest && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" /> Đã có đề riêng
          </span>
        )}
      </div>

      {candidateAssignedTest ? (
        <p className={muted}>
          Ứng viên đã được gán đề riêng: <strong>{candidateAssignedTest.title}</strong> ({candidateAssignedTest.durationMinutes} phút). Bạn có thể gửi lại thông báo lời mời cho ứng viên.
        </p>
      ) : (
        <p className={muted}>
          Chọn một đề mẫu của vị trí để nhân bản và giao riêng cho ứng viên này.
        </p>
      )}

      {tests.isPending && <Skeleton className="h-10 w-full sm:max-w-xs" />}
      {tests.isError && <p role="alert" className="text-sm text-red-600">{getApiErrorMessage(tests.error)}</p>}
      {tests.isSuccess && availableTests.length === 0 && (
        <p className={muted}>Vị trí tuyển dụng này chưa có đề thi nào ở trạng thái xuất bản (PUBLISHED).</p>
      )}
      {selected && (
        <div className="flex flex-wrap items-center gap-2">
          {!candidateAssignedTest && (
            <select
              className={`${input} sm:max-w-xs`}
              value={selected.id}
              onChange={(e) => {
                setTestId(Number(e.target.value));
                setNotice(null);
                assignAndSend.reset();
              }}
            >
              {availableTests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.title} · {test.durationMinutes} phút {test.assignedApplicationId ? "(Đề riêng)" : "(Đề mẫu)"}
                </option>
              ))}
            </select>
          )}

          <button
            className={`${button} inline-flex items-center gap-1.5`}
            type="button"
            disabled={assignAndSend.isPending}
            onClick={() => assignAndSend.mutate(selected.id)}
          >
            {assignAndSend.isPending ? (
              <>
                <RefreshCw className="size-4 animate-spin" /> Đang xử lý…
              </>
            ) : isAssigned ? (
              <>
                <Send className="size-4" /> Gửi lại lời mời
              </>
            ) : (
              <>
                <Send className="size-4" /> Giao đề & Gửi lời mời
              </>
            )}
          </button>
        </div>
      )}

      {notice && (
        <p role="status" className="rounded-lg bg-[var(--color-primary-subtle)] p-2.5 text-xs text-[var(--color-primary)]">
          {notice}
        </p>
      )}
      {assignAndSend.isError && (
        <p role="alert" className="text-xs text-red-600">
          {getApiErrorMessage(assignAndSend.error)}
        </p>
      )}
    </div>
  );
}
