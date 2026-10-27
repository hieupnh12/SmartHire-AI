import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0 && s > 0) return `${m}p ${s}s`;
  if (m > 0) return `${m} phút`;
  return `${s}s`;
}

/**
 * Compact Stat Bar (1 dòng): Pass-rate, TB thời gian, Tín hiệu giám sát, Tổng lượt làm.
 * Thay thế hoàn toàn khối báo cáo lớn và bảng con trùng lặp, tối ưu 100% diện tích First Fold.
 */
export function AssessmentJobReportPanel({ jobId }: { jobId: number }) {
  const report = useQuery({
    queryKey: [...queryKeys.assessments.all(), "job-report", jobId],
    queryFn: () => assessmentApi.jobReport(jobId),
    refetchInterval: 30_000,
  });

  const questions = report.data?.questions ?? [];
  const attempts = report.data?.attempts ?? [];

  // Metrics calculation
  const gradedAttempts = attempts.filter((a) => a.score != null);
  const passedAttempts = gradedAttempts.filter((a) => a.totalPoints && (a.score! / a.totalPoints) >= 0.5);
  const passRate = gradedAttempts.length
    ? Math.round((passedAttempts.length / gradedAttempts.length) * 100)
    : questions.length
    ? Math.round(questions.reduce((acc, q) => acc + (q.passRatePercent ?? 0), 0) / questions.length)
    : null;

  const withDuration = attempts.filter((a) => a.durationSeconds != null && a.durationSeconds > 0);
  const avgDurationSec = withDuration.length
    ? Math.round(withDuration.reduce((acc, a) => acc + a.durationSeconds!, 0) / withDuration.length)
    : null;

  const totalProctorEvents = attempts.reduce((acc, a) => acc + (a.proctorEventCount ?? 0), 0);
  const totalSubmissions = attempts.length;
  const submittedCount = attempts.filter((a) => a.status === "SUBMITTED" || a.status === "GRADED").length;
  const expiredCount = attempts.filter((a) => a.status === "EXPIRED").length;

  return (
    <section aria-label="Báo cáo tóm tắt bài làm" className="flex flex-col gap-2">
      <AssessmentError error={report.error} retry={() => void report.refetch()} />

      {/* 4 Compact Metric Cards (1 dòng gọn gàng) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Pass-rate */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pass-rate TB</p>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {passRate != null ? `${passRate}%` : "—"}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {gradedAttempts.length ? `${passedAttempts.length}/${gradedAttempts.length} lượt đạt yêu cầu` : "Chưa có bài chấm"}
            </p>
          </div>
        </div>

        {/* Average Duration */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Clock3 className="size-4" />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">TB Thời gian</p>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {formatDuration(avgDurationSec)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {withDuration.length ? `Dựa trên ${withDuration.length} lượt hoàn thành` : "Đang ghi nhận"}
            </p>
          </div>
        </div>

        {/* Proctor / Anti-cheat */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "grid size-7 place-items-center rounded-lg",
                totalProctorEvents > 0
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
              )}
            >
              {totalProctorEvents > 0 ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tín hiệu Vi phạm</p>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {totalProctorEvents} <span className="text-xs font-normal text-slate-500">cảnh báo</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {totalProctorEvents > 0 ? "Phát hiện rời tab / đổi cửa sổ" : "Môi trường thi an toàn"}
            </p>
          </div>
        </div>

        {/* Total Attempts */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Users className="size-4" />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng lượt làm</p>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {totalSubmissions} <span className="text-xs font-normal text-slate-500">lượt</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {submittedCount} đã nộp{expiredCount > 0 ? ` · ${expiredCount} quá giờ` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
