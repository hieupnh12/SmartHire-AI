import { CheckCircle2, HelpCircle } from "lucide-react";
import type { PerformanceData } from "../types/recruiterAnalytics";

const metaMap: Record<string, { label: string; tooltip: string }> = {
  TIME_TO_SHORTLIST: {
    label: "Time-to-shortlist",
    tooltip: "Thời gian trung bình từ khi đăng tin/nhận CV đến khi chọn được danh sách ứng viên đạt yêu cầu.",
  },
  RESPONSE_TIME: {
    label: "Thời gian phản hồi",
    tooltip: "Thời gian trung bình phản hồi lại ứng viên sau khi nộp hồ sơ hoặc hoàn thành vòng phỏng vấn.",
  },
  OFFER_ACCEPTANCE: {
    label: "Offer acceptance",
    tooltip: "Tỷ lệ ứng viên đồng ý nhận việc sau khi được gửi thư mời tuyển dụng (Offer letter).",
  },
  HIRE_RATE: {
    label: "Tỷ lệ tuyển dụng",
    tooltip: "Tỷ lệ ứng viên được tuyển thành công trên tổng số ứng viên ứng tuyển.",
  },
};

export function PerformancePanel({ data }: { data: PerformanceData }) {
  const display = (m: PerformanceData["metrics"][number]) =>
    m.value == null ? "—" : `${m.value}${m.unit === "PERCENT" ? "%" : m.unit === "DAYS" ? " ngày" : " giờ"}`;

  return (
    <div className="space-y-4">
      {/* 1. Grid 4 chỉ số hiệu suất phẳng */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.metrics.map((m) => {
          const meta = metaMap[m.code] ?? { label: m.code, tooltip: m.code };
          const isPassed =
            m.value != null &&
            (m.comparison === "LTE" ? m.value <= m.target : m.value >= m.target);

          return (
            <div
              key={m.code}
              className="rounded-xl border border-[var(--color-border-default)] bg-white p-3.5 transition-colors hover:border-brand-primary/40"
            >
              <div className="flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
                <span className="font-semibold text-[var(--color-on-surface)] truncate">{meta.label}</span>
                <span title={meta.tooltip} className="cursor-help text-[var(--color-outline)] hover:text-brand-primary">
                  <HelpCircle className="size-3.5" />
                </span>
              </div>

              <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-on-surface)] tabular-nums">
                {display(m)}
              </p>

              <div className="mt-2.5 flex items-center justify-between border-t border-[var(--color-border-default)]/60 pt-2 text-[11px]">
                <span className="text-[var(--color-outline)]">
                  Mục tiêu {m.comparison === "LTE" ? "≤" : "≥"} {m.target}
                  {m.unit === "PERCENT" ? "%" : m.unit === "DAYS" ? " ngày" : "h"}
                </span>
                {m.value != null && (
                  <span
                    className={
                      isPassed ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"
                    }
                  >
                    {isPassed ? "Đạt ✓" : "Chưa đạt"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Banner kết quả tổng kết mục tiêu */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-default)] bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-on-surface)]">
              Đạt {data.achievedTargets}/{data.totalTargets} mục tiêu tuyển dụng
            </h2>
            {data.recommendation && (
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                {data.recommendation}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
