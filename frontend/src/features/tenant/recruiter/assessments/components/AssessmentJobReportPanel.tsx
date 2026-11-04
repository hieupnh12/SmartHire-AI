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
 * High-Hierarchy Metric Cards for Assessment Submissions:
 * - Clear typographic weight
 * - Visual sub-indicators / progress bars
 * - Distinct status badges for high-level recruiter insights
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
  const inProgressCount = attempts.filter((a) => a.status === "IN_PROGRESS" || a.status === "NOT_STARTED").length;
  const expiredCount = attempts.filter((a) => a.status === "EXPIRED").length;

  return (
    <section aria-label="Báo cáo tóm tắt bài làm" className="flex flex-col gap-2">
      <AssessmentError error={report.error} retry={() => void report.refetch()} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Pass-rate Card */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tỷ lệ Đạt (Pass-rate)</span>
            <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {passRate != null ? `${passRate}%` : "—"}
              </p>
              {passRate != null && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    passRate >= 70
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                  )}
                >
                  {passRate >= 70 ? "Tốt" : "Cần chú ý"}
                </span>
              )}
            </div>
            {/* Visual Mini Progress Bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${passRate ?? 0}%` }}
              />
            </div>
            <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
              {gradedAttempts.length ? `${passedAttempts.length}/${gradedAttempts.length} lượt đạt yêu cầu` : "Chưa có bài chấm"}
            </p>
          </div>
        </div>

        {/* 2. Average Duration Card */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">TB Thời gian làm bài</span>
            <div className="grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Clock3 className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {formatDuration(avgDurationSec)}
              </p>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                {withDuration.length > 0 ? "Thực tế" : "Chờ dữ liệu"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="size-1.5 rounded-full bg-sky-500" />
              <p className="truncate">
                {withDuration.length ? `Dựa trên ${withDuration.length} lượt hoàn thành` : "Đang ghi nhận lượt thi"}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Proctor / Anti-cheat Card */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tín hiệu Giám sát (Proctor)</span>
            <div
              className={cn(
                "grid size-8 place-items-center rounded-lg",
                totalProctorEvents > 0
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
              )}
            >
              {totalProctorEvents > 0 ? <ShieldAlert className="size-4.5" /> : <ShieldCheck className="size-4.5" />}
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {totalProctorEvents}{" "}
                <span className="text-xs font-normal text-slate-500">cảnh báo</span>
              </p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  totalProctorEvents > 0
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                )}
              >
                {totalProctorEvents > 0 ? "Cần xem xét" : "An toàn 100%"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className={cn("size-1.5 rounded-full", totalProctorEvents > 0 ? "bg-amber-500" : "bg-emerald-500")} />
              <p className="truncate">
                {totalProctorEvents > 0 ? "Có ghi nhận rời tab / đổi cửa sổ" : "Môi trường thi trung thực"}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Total Submissions Card */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng số lượt làm</span>
            <div className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Users className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {totalSubmissions}{" "}
                <span className="text-xs font-normal text-slate-500">lượt</span>
              </p>
              <div className="flex items-center gap-1">
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {submittedCount} nộp
                </span>
                {inProgressCount > 0 && (
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                    {inProgressCount} đang thi
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="size-1.5 rounded-full bg-[var(--color-primary)]" />
              <p className="truncate">
                {submittedCount} đã nộp{expiredCount > 0 ? ` · ${expiredCount} quá giờ` : " · tiến độ ổn định"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
