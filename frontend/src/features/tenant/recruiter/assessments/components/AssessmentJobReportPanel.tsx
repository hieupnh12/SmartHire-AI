import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";

const display = (value: number | null | undefined) =>
  value == null ? "—" : Number(value.toFixed(1)).toLocaleString("vi-VN");

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} phút ${s}s` : `${s}s`;
}

/** Pass-rate / duration / custom-run / proctor summary for one job. */
export function AssessmentJobReportPanel({ jobId }: { jobId: number }) {
  const report = useQuery({
    queryKey: [...queryKeys.assessments.all(), "job-report", jobId],
    queryFn: () => assessmentApi.jobReport(jobId),
    refetchInterval: 30_000,
  });

  return (
    <section
      aria-label="Báo cáo assessment theo job"
      className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <header className="flex items-center gap-2">
        <BarChart3 className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Báo cáo theo vị trí</h2>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Pass-rate theo câu, thời gian làm, số custom-run và sự kiện giám sát.
          </p>
        </div>
      </header>
      <AssessmentError error={report.error} retry={() => void report.refetch()} />
      {report.isPending && <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">Đang tải báo cáo…</p>}
      {report.data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">Pass-rate theo câu hỏi</caption>
              <thead>
                <tr className="border-b border-[var(--color-border-default)] text-xs uppercase text-[var(--color-on-surface-variant)]">
                  <th scope="col" className="p-2">Câu</th>
                  <th scope="col" className="p-2">Loại</th>
                  <th scope="col" className="p-2">Đã chấm</th>
                  <th scope="col" className="p-2">Full credit</th>
                  <th scope="col" className="p-2">Pass-rate</th>
                  <th scope="col" className="p-2">TB % điểm</th>
                </tr>
              </thead>
              <tbody>
                {report.data.questions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-3 text-[var(--color-on-surface-variant)]">
                      Chưa có câu đã chấm điểm.
                    </td>
                  </tr>
                )}
                {report.data.questions.map((row) => (
                  <tr key={row.questionId} className="border-t border-[var(--color-border-default)]">
                    <td className="p-2">#{row.questionId}</td>
                    <td className="p-2">{row.type}</td>
                    <td className="p-2">{row.graded}</td>
                    <td className="p-2">{row.fullCredit}</td>
                    <td className="p-2">{display(row.passRatePercent)}%</td>
                    <td className="p-2">{display(row.avgScorePercent)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Lượt làm và tín hiệu anti-cheat nhẹ</caption>
              <thead>
                <tr className="border-b border-[var(--color-border-default)] text-xs uppercase text-[var(--color-on-surface-variant)]">
                  <th scope="col" className="p-2">Ứng viên</th>
                  <th scope="col" className="p-2">Đề</th>
                  <th scope="col" className="p-2">Trạng thái</th>
                  <th scope="col" className="p-2">Điểm</th>
                  <th scope="col" className="p-2">Thời gian</th>
                  <th scope="col" className="p-2">Custom run</th>
                  <th scope="col" className="p-2">Proctor</th>
                </tr>
              </thead>
              <tbody>
                {report.data.attempts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-3 text-[var(--color-on-surface-variant)]">
                      Chưa có lượt nộp.
                    </td>
                  </tr>
                )}
                {report.data.attempts.map((row) => (
                  <tr key={row.submissionId} className="border-t border-[var(--color-border-default)]">
                    <td className="p-2">{row.candidateName}</td>
                    <td className="max-w-[12rem] truncate p-2" title={row.testTitle}>{row.testTitle}</td>
                    <td className="p-2">{row.status}</td>
                    <td className="p-2">
                      {row.score == null ? "—" : `${display(row.score)}/${row.totalPoints ?? "—"}`}
                    </td>
                    <td className="p-2">{formatDuration(row.durationSeconds)}</td>
                    <td className="p-2">{row.customRunCount}</td>
                    <td className="p-2">{row.proctorEventCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
