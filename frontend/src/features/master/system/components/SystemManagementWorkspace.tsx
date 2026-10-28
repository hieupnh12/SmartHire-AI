import { useEffect, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  FileDown,
  Gauge,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { TenantInfo } from "@/api/master/masterAdminApi";
import {
  aiConfigApi,
  type AiUsageReport as AiUsageReportData,
  type TenantAiQuota,
} from "@/api/master/aiConfigApi";
import { cn } from "@/lib/utils";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { AiEngineConfiguration } from "./AiEngineConfiguration";

export type SystemManagementView = "ai-usage" | "ai-quotas" | "ai-config";

type Props = {
  view: SystemManagementView;
  tenants: TenantInfo[];
};

const surface =
  "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.18)]";

function PageHeader({
  eyebrow,
  description,
  action,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <>
      {action && <HeaderActions>{action}</HeaderActions>}
      {(eyebrow || description) && (
        <div className="mb-4">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-0.5">
              {eyebrow}
            </p>
          )}
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      )}
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "blue",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "violet" | "amber" | "emerald";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <article className={cn(surface, "p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={cn("grid size-10 place-items-center rounded-xl", tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function AiUsageReportView() {
  const [months, setMonths] = useState<number>(6);
  const [report, setReport] = useState<AiUsageReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (targetMonths = months) => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiConfigApi.getUsageReport(targetMonths);
      setReport(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Không thể tải báo cáo sử dụng AI"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(months);
  }, [months]);

  const handleExportCsv = () => {
    if (!report) return;
    const headers = [
      "Tenant ID",
      "Tenant Code",
      "Tenant Name",
      "Plan",
      "CV Screening",
      "AI Interview Hours",
      "Total AI Requests",
      "Total Tokens",
      "Estimated Cost (USD)",
      "MoM Change (%)",
    ];
    const rows = report.tenantUsages.map((u) => [
      u.tenantId,
      `"${u.tenantCode}"`,
      `"${u.tenantName.replace(/"/g, '""')}"`,
      `"${u.planName}"`,
      u.cvParses,
      u.interviewHours,
      u.totalRequests,
      u.totalTokens,
      u.estimatedCostUsd,
      u.changePercent,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-usage-report-${months}m.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !report) {
    return <PageSkeleton variant="detail" />;
  }

  const trend = report?.monthlyTrend || [];
  const maxCv = Math.max(1, ...trend.map((t) => t.cvCount));
  const maxInt = Math.max(1, ...trend.map((t) => t.interviewHours));
  const maxReq = Math.max(1, ...trend.map((t) => t.aiRequests));

  const taskColors: Record<string, string> = {
    CV_PARSING: "bg-blue-500",
    INTERVIEW_GEN: "bg-violet-500",
    INTERVIEW_NLP: "bg-indigo-500",
    MATCHING: "bg-cyan-500",
    CODE_GRADING: "bg-emerald-500",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Hệ thống / AI Metering & Cost"
        title="Báo cáo sử dụng AI"
        description="Theo dõi thực tế số lượt gọi AI, tổng lượng Token (Prompt + Completion) và đối soát chi phí USD theo từng Tenant & tác vụ."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchReport(months)}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="size-3.5" />
              Làm mới
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileDown className="size-3.5" />
              Xuất CSV
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Chỉ số sử dụng AI"
      >
        <MetricCard
          icon={BrainCircuit}
          label="CV đã phân tích"
          value={(report?.totalCvParses ?? 0).toLocaleString("vi-VN")}
          detail={`Trong ${months} tháng gần nhất`}
        />
        <MetricCard
          icon={Bot}
          label="Giờ AI interview"
          value={`${(report?.totalInterviewHours ?? 0).toLocaleString("vi-VN")} giờ`}
          detail="Tổng thời lượng hội thoại phỏng vấn AI"
          tone="violet"
        />
        <MetricCard
          icon={Sparkles}
          label="Tổng lượt gọi & Token AI"
          value={(report?.totalAiRequests ?? 0).toLocaleString("vi-VN")}
          detail={`${(report?.totalTokensConsumed ?? 0).toLocaleString("vi-VN")} tokens · Thành công ${report?.successRatePercent ?? 100}%${report?.avgLatencyMs ? ` · TB ${report.avgLatencyMs}ms` : ""}`}
          tone="emerald"
        />
        <MetricCard
          icon={Cpu}
          label="Chi phí API ước tính"
          value={`$${Number(report?.totalEstimatedCostUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`}
          detail="Tính theo bảng giá Input/Output 1M Tokens"
          tone="amber"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className={cn(surface, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">
                Xu hướng tiêu thụ {months} tháng
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Biểu đồ tương quan CV Screening, Giờ Phỏng vấn AI và Tổng Request AI theo tháng
              </p>
            </div>
            <select
              aria-label="Khoảng thời gian báo cáo"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600"
            >
              <option value={6}>6 tháng gần nhất</option>
              <option value={12}>12 tháng gần nhất</option>
            </select>
          </div>

          <div className="mt-7 flex h-64 items-end gap-3 border-b border-slate-200 pb-3 sm:gap-5">
            {trend.map((item) => {
              const cvPct = item.cvCount > 0 ? Math.max(8, Math.round((item.cvCount / maxCv) * 100)) : 4;
              const intPct = item.interviewHours > 0 ? Math.max(8, Math.round((item.interviewHours / maxInt) * 100)) : 4;
              const reqPct = item.aiRequests > 0 ? Math.max(8, Math.round((item.aiRequests / maxReq) * 100)) : 4;
              return (
                <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div className="flex h-[calc(100%-1.75rem)] items-end justify-center gap-1">
                    <span
                      className="w-2.5 rounded-t bg-blue-500 sm:w-4 transition-all"
                      style={{ height: `${cvPct}%` }}
                      title={`CV: ${item.cvCount.toLocaleString("vi-VN")} lượt`}
                    />
                    <span
                      className="w-2.5 rounded-t bg-violet-400 sm:w-4 transition-all"
                      style={{ height: `${intPct}%` }}
                      title={`Interview: ${item.interviewHours} giờ`}
                    />
                    <span
                      className="w-2.5 rounded-t bg-cyan-400 sm:w-4 transition-all"
                      style={{ height: `${reqPct}%` }}
                      title={`Requests: ${item.aiRequests.toLocaleString("vi-VN")} · Cost: $${item.estimatedCostUsd}`}
                    />
                  </div>
                  <span className="mt-2 text-center text-xs font-medium text-slate-500">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-blue-500" />
              CV screening
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-violet-400" />
              Giờ AI interview
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-cyan-400" />
              Tổng AI Requests
            </span>
          </div>
        </section>

        <section className={cn(surface, "p-5 sm:p-6")}>
          <h2 className="font-semibold text-slate-950">Phân bổ chi phí theo Task</h2>
          <p className="mt-1 text-xs text-slate-500">
            Chi phí USD thực tế và tỷ trọng theo từng tác vụ AI
          </p>
          <div className="mt-6 space-y-5">
            {(report?.costByTask || []).map((item) => (
              <div key={item.taskType}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-bold text-slate-900">
                    ${Number(item.costUsd).toFixed(4)} ({item.sharePercent}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      taskColors[item.taskType] || "bg-slate-400"
                    )}
                    style={{ width: `${Math.max(item.sharePercent, item.requests > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {item.requests.toLocaleString("vi-VN")} requests ·{" "}
                  {item.totalTokens.toLocaleString("vi-VN")} tokens
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={cn(surface, "overflow-hidden")}>
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-950">Mức sử dụng & Chi phí theo Tenant</h2>
          <p className="mt-1 text-xs text-slate-500">
            Dữ liệu thực tế tổng hợp từ bảng Metering (`tenant_ai_usage_daily` & `tenant_usage_daily`)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Tenant / Gói</th>
                <th className="px-4 py-3 text-right">CV screening</th>
                <th className="px-4 py-3 text-right">AI interview</th>
                <th className="px-4 py-3 text-right">Tokens tiêu thụ</th>
                <th className="px-4 py-3 text-right">Chi phí API (USD)</th>
                <th className="px-5 py-3 text-right">Biến động tháng</th>
              </tr>
            </thead>
            <tbody>
              {(report?.tenantUsages || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500">
                    Chưa có dữ liệu tiêu thụ AI của các Tenant.
                  </td>
                </tr>
              ) : (
                (report?.tenantUsages || []).map((row) => (
                  <tr
                    key={row.tenantId}
                    className="border-t border-slate-100 hover:bg-blue-50/30"
                  >
                    <td className="px-5 py-4">
                      <strong className="block font-semibold text-slate-900">
                        {row.tenantName}
                      </strong>
                      <span className="text-xs text-slate-500">
                        {row.tenantCode} · {row.planName}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">
                      {row.cvParses.toLocaleString("vi-VN")} lượt
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">
                      {row.interviewHours} giờ
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">
                      {row.totalTokens.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      ${Number(row.estimatedCostUsd).toFixed(4)}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-4 text-right font-semibold",
                        row.changePercent >= 0 ? "text-emerald-700" : "text-rose-700"
                      )}
                    >
                      {row.changePercent >= 0 ? "+" : ""}
                      {row.changePercent}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AiQuotaManagementView() {
  const [rows, setRows] = useState<TenantAiQuota[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const fetchQuotas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiConfigApi.getTenantAiQuotas();
      setRows(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Không thể tải hạn ngạch AI"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotas();
  }, []);

  const updateLocalLimit = (
    tenantId: number,
    field: "cvLimit" | "interviewHoursLimit" | "effectiveRpmLimit",
    value: number
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.tenantId === tenantId
          ? { ...row, [field]: Number.isNaN(value) ? 0 : Math.max(-1, value) }
          : row
      )
    );
  };

  const handleSaveOverride = async (row: TenantAiQuota) => {
    try {
      setSavingId(row.tenantId);
      const updated = await aiConfigApi.updateTenantAiQuota(row.tenantId, {
        cvLimit: row.cvLimit,
        interviewHoursLimit: row.interviewHoursLimit,
        rpmLimit: row.effectiveRpmLimit,
      });
      setRows((prev) =>
        prev.map((item) => (item.tenantId === row.tenantId ? updated : item))
      );
      setSavedId(row.tenantId);
      window.setTimeout(() => setSavedId(null), 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi lưu hạn mức");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleKillSwitch = async (row: TenantAiQuota) => {
    const enablingKill = !row.aiKillSwitch;
    const confirmMsg = enablingKill
      ? `Khóa khẩn cấp toàn bộ tính năng AI (CV Screening & AI Interview) của "${row.tenantName}"?`
      : `Mở khóa lại hạn mức AI theo gói mặc định cho "${row.tenantName}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSavingId(row.tenantId);
      const updated = await aiConfigApi.updateTenantAiQuota(
        row.tenantId,
        enablingKill ? { killSwitch: true } : { resetToPlanDefault: true }
      );
      setRows((prev) =>
        prev.map((item) => (item.tenantId === row.tenantId ? updated : item))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi cập nhật Kill Switch");
    } finally {
      setSavingId(null);
    }
  };

  const handleResetToPlan = async (row: TenantAiQuota) => {
    try {
      setSavingId(row.tenantId);
      const updated = await aiConfigApi.updateTenantAiQuota(row.tenantId, {
        resetToPlanDefault: true,
      });
      setRows((prev) =>
        prev.map((item) => (item.tenantId === row.tenantId ? updated : item))
      );
      setSavedId(row.tenantId);
      window.setTimeout(() => setSavedId(null), 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi khôi phục hạn mức gốc");
    } finally {
      setSavingId(null);
    }
  };

  if (loading && rows.length === 0) {
    return <PageSkeleton variant="list" />;
  }

  const nearLimitCount = rows.filter((row) => {
    const cvRatio = row.cvLimit > 0 ? row.cvUsed / row.cvLimit : 0;
    const intRatio = row.interviewHoursLimit > 0 ? row.interviewHoursUsed / row.interviewHoursLimit : 0;
    return cvRatio >= 0.8 || intRatio >= 0.8;
  }).length;

  const killSwitchedCount = rows.filter((r) => r.aiKillSwitch).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Hệ thống / Tenant Quota Override & Kill Switch"
        title="Quản lý hạn ngạch AI"
        description="Can thiệp hạn mức AI riêng cho từng Tenant (Top-up / Bonus Quota, giới hạn tốc độ RPM mỗi phút, đặt -1 cho Không giới hạn, hoặc bật Kill Switch khóa AI khẩn cấp). Đồng bộ trực tiếp với Redis Quota Guard."
        action={
          <button
            type="button"
            onClick={fetchQuotas}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="size-3.5" />
            Làm mới
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Tổng quan hạn ngạch AI"
      >
        <MetricCard
          icon={Gauge}
          label="Tổng số Tenant"
          value={String(rows.length)}
          detail="Đang quản lý qua Redis Quota Guard"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Sắp chạm ngưỡng"
          value={String(nearLimitCount)}
          detail="Sử dụng từ 80% hạn mức tháng"
          tone="amber"
        />
        <MetricCard
          icon={ShieldAlert}
          label="Đang bật Kill Switch"
          value={String(killSwitchedCount)}
          detail="Tenant bị khóa tạm thời tính năng AI"
          tone="violet"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Đang hoạt động"
          value={String(Math.max(0, rows.length - killSwitchedCount))}
          detail="Cho phép gọi API AI bình thường"
          tone="emerald"
        />
      </section>

      <section className={cn(surface, "overflow-hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="font-semibold text-slate-950">
              Hạn mức AI, Rate Limit (RPM) & Kill Switch theo Tenant
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Nhập <strong>-1</strong> cho Không giới hạn (Unlimited), <strong>0</strong> để khóa tính năng, hoặc số dương để cấp hạn mức tùy chỉnh (Override).
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Đồng bộ thời gian thực với Redis
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Tenant / Gói gốc</th>
                <th className="px-4 py-3">Đã dùng CV</th>
                <th className="px-4 py-3">Hạn mức CV (Override)</th>
                <th className="px-4 py-3">Đã dùng Phỏng vấn</th>
                <th className="px-4 py-3">Hạn mức Giờ (Override)</th>
                <th className="px-4 py-3">Rate Limit (RPM/phút)</th>
                <th className="px-4 py-3 text-right">Chi phí tháng</th>
                <th className="px-5 py-3 text-right">Can thiệp Admin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const cvPercent =
                  row.cvLimit > 0
                    ? Math.round((row.cvUsed / Math.max(row.cvLimit, 1)) * 100)
                    : 0;
                const interviewPercent =
                  row.interviewHoursLimit > 0
                    ? Math.round(
                        (row.interviewHoursUsed / Math.max(row.interviewHoursLimit, 1)) * 100
                      )
                    : 0;
                const isOverridden =
                  row.cvLimit !== row.basePlanCvLimit ||
                  row.interviewHoursLimit !== row.basePlanInterviewHoursLimit ||
                  row.customRpmOverride != null;

                return (
                  <tr
                    key={row.tenantId}
                    className={cn(
                      "border-t border-slate-100 align-middle transition-colors",
                      row.aiKillSwitch ? "bg-rose-50/40" : "hover:bg-blue-50/20"
                    )}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900">{row.tenantName}</strong>
                        {row.aiKillSwitch && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                            AI Locked
                          </span>
                        )}
                        {!row.aiKillSwitch && isOverridden && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                            Overridden
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-xs text-slate-500">
                        {row.tenantCode} · {row.planName} (Gốc:{" "}
                        {row.basePlanCvLimit < 0 ? "∞" : row.basePlanCvLimit} CV /{" "}
                        {row.basePlanInterviewHoursLimit < 0
                          ? "∞"
                          : row.basePlanInterviewHoursLimit}
                        h)
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="w-36">
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span>{row.cvUsed.toLocaleString("vi-VN")} lượt</span>
                          <strong
                            className={
                              row.cvLimit === 0
                                ? "text-rose-700"
                                : cvPercent >= 80
                                ? "text-amber-700"
                                : "text-slate-700"
                            }
                          >
                            {row.cvLimit < 0
                              ? "Unlimited"
                              : row.cvLimit === 0
                              ? "Khóa (0)"
                              : `${cvPercent}%`}
                          </strong>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              row.cvLimit === 0 || cvPercent >= 90
                                ? "bg-rose-500"
                                : cvPercent >= 80
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            )}
                            style={{
                              width: `${
                                row.cvLimit < 0
                                  ? 15
                                  : row.cvLimit === 0
                                  ? 100
                                  : Math.min(cvPercent, 100)
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="-1"
                        value={row.cvLimit}
                        onChange={(e) =>
                          updateLocalLimit(row.tenantId, "cvLimit", Number(e.target.value))
                        }
                        aria-label={`Hạn mức CV của ${row.tenantName}`}
                        className="min-h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-right text-xs font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          row.interviewHoursLimit === 0
                            ? "text-rose-700"
                            : interviewPercent >= 80
                            ? "text-amber-700"
                            : "text-slate-700"
                        )}
                      >
                        {row.interviewHoursUsed} /{" "}
                        {row.interviewHoursLimit < 0
                          ? "∞"
                          : `${row.interviewHoursLimit} giờ`}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="-1"
                        value={row.interviewHoursLimit}
                        onChange={(e) =>
                          updateLocalLimit(
                            row.tenantId,
                            "interviewHoursLimit",
                            Number(e.target.value)
                          )
                        }
                        aria-label={`Hạn mức giờ phỏng vấn AI của ${row.tenantName}`}
                        className="min-h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-right text-xs font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          min="-1"
                          value={row.effectiveRpmLimit ?? 30}
                          onChange={(e) =>
                            updateLocalLimit(
                              row.tenantId,
                              "effectiveRpmLimit",
                              Number(e.target.value)
                            )
                          }
                          aria-label={`Giới hạn RPM của ${row.tenantName}`}
                          className="min-h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-right text-xs font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="text-[10px] text-slate-400">
                          Phút này: {row.currentMinuteRpm ?? 0} req ·{" "}
                          {(row.currentMinuteTpm ?? 0).toLocaleString("vi-VN")} tok
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      ${Number(row.estimatedCostUsdMonth ?? 0).toFixed(4)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={savingId === row.tenantId}
                          onClick={() => handleSaveOverride(row)}
                          className={cn(
                            "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                            savedId === row.tenantId
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          )}
                        >
                          <Save className="size-3.5" />
                          {savedId === row.tenantId ? "Đã lưu" : "Lưu"}
                        </button>

                        {isOverridden && (
                          <button
                            type="button"
                            disabled={savingId === row.tenantId}
                            onClick={() => handleResetToPlan(row)}
                            title="Khôi phục về hạn mức gốc của gói cước"
                            className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={savingId === row.tenantId}
                          onClick={() => handleToggleKillSwitch(row)}
                          title={
                            row.aiKillSwitch
                              ? "Mở khóa lại AI cho Tenant này"
                              : "Kill Switch: Khóa khẩn cấp AI của Tenant này"
                          }
                          className={cn(
                            "inline-flex min-h-8 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                            row.aiKillSwitch
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          )}
                        >
                          <PowerOff className="size-3.5" />
                          {row.aiKillSwitch ? "Mở AI" : "Kill Switch"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function SystemManagementWorkspace({ view }: Props) {
  if (view === "ai-config") {
    return <AiEngineConfiguration />;
  }
  return view === "ai-usage" ? <AiUsageReportView /> : <AiQuotaManagementView />;
}
