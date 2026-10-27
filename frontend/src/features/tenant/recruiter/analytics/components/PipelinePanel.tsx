import { AlertTriangle, HelpCircle, Layers, Timer } from "lucide-react";
import type { PipelineData } from "../types/recruiterAnalytics";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";

export function PipelinePanel({ data }: { data: PipelineData }) {
  if (!data.totalCandidates) {
    return <AnalyticsEmptyState>Chưa có dữ liệu ứng viên trong kỳ này.</AnalyticsEmptyState>;
  }

  const max = Math.max(...data.stages.map((s) => s.count), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      {/* 1. Phễu tuyển dụng (Pipeline) */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2.5 mb-3">
          <div className="flex items-center gap-1.5">
            <Layers className="size-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-[var(--color-on-surface)]">Phễu tuyển dụng (Pipeline)</h2>
            <span
              title="Phễu theo dõi số lượng ứng viên qua từng giai đoạn và tỷ lệ chuyển đổi."
              className="cursor-help text-[var(--color-outline)] hover:text-brand-primary"
            >
              <HelpCircle className="size-3.5" />
            </span>
          </div>
          <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
            Tổng <strong className="text-[var(--color-on-surface)]">{data.totalCandidates}</strong> ứng viên
          </span>
        </div>

        <div className="space-y-2.5">
          {data.stages.map((stage) => {
            const percent = Math.max(6, Math.round((stage.count / max) * 100));
            return (
              <div key={stage.code} className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[var(--color-on-surface)]">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    {stage.conversionRate != null && (
                      <span
                        title="Tỷ lệ chuyển tiếp thành công sang vòng kế tiếp"
                        className="inline-flex items-center gap-0.5 font-medium text-brand-primary"
                      >
                        {stage.conversionRate}%
                        <HelpCircle className="size-2.5 text-[var(--color-outline)] cursor-help" />
                      </span>
                    )}
                    <strong className="font-bold tabular-nums text-[var(--color-on-surface)]">
                      {stage.count}
                    </strong>
                  </div>
                </div>

                <div className="h-6 w-full rounded-md bg-[var(--color-surface-alt)] p-0.5">
                  <div
                    className="flex h-full min-w-4 items-center rounded bg-brand-primary px-2 text-[10px] font-semibold text-white transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  >
                    {stage.count > 0 && `${stage.count}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Cảnh báo SLA */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2.5 mb-3">
          <div className="flex items-center gap-1.5">
            <Timer className="size-4 text-amber-600" />
            <h2 className="text-sm font-bold text-[var(--color-on-surface)]">Cảnh báo SLA</h2>
            <span
              title="SLA: Thời gian tối đa cho phép ứng viên chờ xử lý tại một giai đoạn tuyển dụng."
              className="cursor-help text-[var(--color-outline)] hover:text-amber-600"
            >
              <HelpCircle className="size-3.5" />
            </span>
          </div>
          <span className="text-xs text-[var(--color-outline)]">
            {data.slaAlerts.length} cảnh báo
          </span>
        </div>

        {data.slaAlerts.length === 0 ? (
          <div className="py-10 text-center text-xs text-[var(--color-on-surface-variant)]">
            <p className="font-medium text-emerald-700">Tất cả hồ sơ đều trong hạn cam kết SLA ✓</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.slaAlerts.map((alert) => (
              <div
                key={alert.stageCode}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-2.5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                    <strong className="font-bold text-[var(--color-on-surface)]">{alert.stageLabel}</strong>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">
                    {alert.candidateCount} ứng viên đang chờ (SLA: {Math.round(alert.thresholdMinutes / 60)}h)
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    Chờ {Math.round(alert.oldestWaitingMinutes / 60)}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
