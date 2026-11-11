import { useEffect, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  FileDown,
  Gauge,
  HelpCircle,
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
import { Tooltip } from "@/components/ux/Tooltip";
import { CustomSelect } from "@/components/ux/CustomSelect";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
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

function HelpTip({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip content={content} side="top">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tooltip,
  tone = "blue",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
  tooltip?: string;
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
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <span>{label}</span>
            {tooltip && <HelpTip content={tooltip} label={`Giải thích ${label}`} />}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-600">
            {value}
          </p>
        </div>
        <span className={cn("grid size-10 place-items-center rounded-xl", tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      {detail && <p className="mt-3 text-xs text-slate-500">{detail}</p>}
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
          tooltip={`Tổng số lượt AI đã phân tích CV trong ${months} tháng gần nhất.`}
        />
        <MetricCard
          icon={Bot}
          label="Giờ phỏng vấn AI"
          value={`${(report?.totalInterviewHours ?? 0).toLocaleString("vi-VN")} giờ`}
          tooltip="Tổng thời lượng hội thoại phỏng vấn AI trong kỳ báo cáo."
          tone="violet"
        />
        <MetricCard
          icon={Sparkles}
          label="Tổng lượt gọi AI"
          value={(report?.totalAiRequests ?? 0).toLocaleString("vi-VN")}
          tooltip={`${(report?.totalTokensConsumed ?? 0).toLocaleString("vi-VN")} token đã tiêu thụ · Tỷ lệ thành công ${report?.successRatePercent ?? 100}%${report?.avgLatencyMs ? ` · Độ trễ TB ${report.avgLatencyMs}ms` : ""}.`}
          tone="emerald"
        />
        <MetricCard
          icon={Cpu}
          label="Chi phí AI ước tính"
          value={`$${Number(report?.totalEstimatedCostUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`}
          tooltip="Chi phí ước tính theo bảng giá dữ liệu đầu vào và đầu ra."
          tone="amber"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className={cn(surface, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-600">
                Xu hướng tiêu thụ {months} tháng
              </h2>
              <HelpTip
                content="Biểu đồ theo dõi số lượt lọc CV, giờ phỏng vấn AI và tổng lượt gọi AI theo từng tháng."
                label="Giải thích xu hướng tiêu thụ AI"
              />
            </div>
            <div className="w-44">
              <CustomSelect
                ariaLabel="Khoảng thời gian báo cáo"
                value={String(months)}
                onChange={(val) => setMonths(Number(val))}
                options={[
                  { value: "6", label: "6 tháng gần nhất" },
                  { value: "12", label: "12 tháng gần nhất" },
                ]}
              />
            </div>
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
                      title={`Lọc CV: ${item.cvCount.toLocaleString("vi-VN")} lượt`}
                    />
                    <span
                      className="w-2.5 rounded-t bg-violet-400 sm:w-4 transition-all"
                      style={{ height: `${intPct}%` }}
                      title={`Phỏng vấn AI: ${item.interviewHours} giờ`}
                    />
                    <span
                      className="w-2.5 rounded-t bg-cyan-400 sm:w-4 transition-all"
                      style={{ height: `${reqPct}%` }}
                      title={`Tổng lượt gọi: ${item.aiRequests.toLocaleString("vi-VN")} · Chi phí: $${item.estimatedCostUsd}`}
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
              Lọc CV
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-violet-400" />
              Giờ phỏng vấn AI
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-cyan-400" />
              Tổng lượt gọi AI
            </span>
          </div>
        </section>

        <section className={cn(surface, "p-5 sm:p-6")}>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-600">Phân bổ chi phí theo tác vụ</h2>
            <HelpTip
              content="Chi phí ước tính (USD) và tỷ trọng tiêu thụ theo từng nhóm tác vụ AI."
              label="Giải thích phân bổ chi phí theo tác vụ"
            />
          </div>
          <div className="mt-6 space-y-5">
            {(report?.costByTask || []).map((item) => (
              <div key={item.taskType}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-bold text-slate-600">
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
                  {item.requests.toLocaleString("vi-VN")} lượt ·{" "}
                  {item.totalTokens.toLocaleString("vi-VN")} token
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={cn(surface, "overflow-hidden")}>
        <div className="flex items-center gap-2 border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-600">
            Mức sử dụng & Chi phí theo doanh nghiệp
          </h2>
          <HelpTip
            content="Tổng hợp số lượt gọi AI, token đã dùng và chi phí ước tính theo từng doanh nghiệp."
            label="Giải thích mức sử dụng theo doanh nghiệp"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Doanh nghiệp / Gói</th>
                <th className="px-4 py-3 text-right">Lọc CV</th>
                <th className="px-4 py-3 text-right">Phỏng vấn AI</th>
                <th className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span>Token tiêu thụ</span>
                    <HelpTip
                      content="Tổng lượng dữ liệu văn bản (input và output) đã xử lý."
                      label="Giải thích Token tiêu thụ"
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span>Chi phí ước tính</span>
                    <HelpTip
                      content="Chi phí AI ước tính quy đổi theo USD."
                      label="Giải thích Chi phí ước tính"
                    />
                  </span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span>Biến động tháng</span>
                    <HelpTip
                      content="Tỷ lệ tăng hoặc giảm mức sử dụng AI so với tháng trước."
                      label="Giải thích Biến động tháng"
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(report?.tenantUsages || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500">
                    Chưa có dữ liệu tiêu thụ AI của các doanh nghiệp.
                  </td>
                </tr>
              ) : (
                (report?.tenantUsages || []).map((row) => (
                  <tr
                    key={row.tenantId}
                    className="border-t border-slate-100 hover:bg-blue-50/30"
                  >
                    <td className="px-5 py-4">
                      <strong className="block font-semibold text-slate-600">
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
                    <td className="px-4 py-4 text-right font-semibold text-slate-600">
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
  const askConfirm = useUiStore((s) => s.askConfirm);
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
        err.response?.data?.message || err.message || "Không thể tải hạn mức AI"
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
      toast.success(`Đã lưu hạn mức cho "${row.tenantName}"`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Lỗi khi lưu hạn mức");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleKillSwitch = (row: TenantAiQuota) => {
    const enablingKill = !row.aiKillSwitch;
    askConfirm({
      title: enablingKill ? "Khóa khẩn cấp AI" : "Mở khóa AI",
      description: enablingKill
        ? `Khóa khẩn cấp toàn bộ tính năng AI (lọc CV & phỏng vấn AI) của "${row.tenantName}"? Mọi tác vụ AI của doanh nghiệp này sẽ tạm dừng ngay lập tức.`
        : `Mở khóa lại hạn mức AI theo gói mặc định cho "${row.tenantName}"?`,
      confirmLabel: enablingKill ? "Khóa khẩn cấp" : "Mở khóa",
      danger: enablingKill,
      onConfirm: async () => {
        try {
          setSavingId(row.tenantId);
          const updated = await aiConfigApi.updateTenantAiQuota(
            row.tenantId,
            enablingKill ? { killSwitch: true } : { resetToPlanDefault: true }
          );
          setRows((prev) =>
            prev.map((item) => (item.tenantId === row.tenantId ? updated : item))
          );
          toast.success(
            enablingKill
              ? `Đã khóa AI khẩn cấp cho "${row.tenantName}"`
              : `Đã mở khóa AI cho "${row.tenantName}"`
          );
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || "Lỗi khi cập nhật trạng thái AI");
        } finally {
          setSavingId(null);
        }
      },
    });
  };

  const handleResetToPlan = (row: TenantAiQuota) => {
    askConfirm({
      title: "Khôi phục hạn mức",
      description: `Khôi phục hạn mức AI của "${row.tenantName}" về cấu hình mặc định của gói dịch vụ?`,
      confirmLabel: "Khôi phục",
      onConfirm: async () => {
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
          toast.success(`Đã khôi phục hạn mức gốc cho "${row.tenantName}"`);
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || "Lỗi khi khôi phục hạn mức gốc");
        } finally {
          setSavingId(null);
        }
      },
    });
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
        aria-label="Tổng quan hạn mức AI"
      >
        <MetricCard
          icon={Gauge}
          label="Tổng số doanh nghiệp"
          value={String(rows.length)}
          tooltip="Tổng số doanh nghiệp đang áp dụng kiểm soát hạn mức AI."
        />
        <MetricCard
          icon={AlertTriangle}
          label="Sắp chạm ngưỡng"
          value={String(nearLimitCount)}
          tooltip="Doanh nghiệp đã sử dụng từ 80% hạn mức AI trong tháng."
          tone="amber"
        />
        <MetricCard
          icon={ShieldAlert}
          label="Đang khóa AI"
          value={String(killSwitchedCount)}
          tooltip="Doanh nghiệp đang bị tạm khóa khẩn cấp tính năng AI."
          tone="violet"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Đang hoạt động"
          value={String(Math.max(0, rows.length - killSwitchedCount))}
          tooltip="Doanh nghiệp đang sử dụng tính năng AI bình thường."
          tone="emerald"
        />
      </section>

      <section className={cn(surface, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-600">
              Hạn mức AI theo doanh nghiệp
            </h2>
            <HelpTip
              content="Can thiệp hạn mức AI riêng cho từng doanh nghiệp: nhập -1 để không giới hạn, 0 để khóa tính năng, hoặc số dương để đặt hạn mức riêng. Có thể lưu thay đổi, khôi phục về mặc định gói hoặc khóa khẩn cấp."
              label="Giải thích quản lý hạn mức AI"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Doanh nghiệp / Gói</th>
                <th className="px-4 py-3">Đã dùng CV</th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <span>Hạn mức CV</span>
                    <HelpTip
                      content="Số lượt lọc CV tối đa mỗi tháng. Nhập -1 cho không giới hạn, 0 để tạm khóa."
                      label="Giải thích Hạn mức CV"
                    />
                  </span>
                </th>
                <th className="px-4 py-3">Đã dùng Phỏng vấn</th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <span>Hạn mức Giờ</span>
                    <HelpTip
                      content="Số giờ phỏng vấn AI tối đa mỗi tháng. Nhập -1 cho không giới hạn, 0 để tạm khóa."
                      label="Giải thích Hạn mức Giờ"
                    />
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <span>Giới hạn / phút</span>
                    <HelpTip
                      content="Số lượt gọi AI tối đa trong mỗi phút của doanh nghiệp."
                      label="Giải thích Giới hạn mỗi phút"
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span>Chi phí tháng</span>
                    <HelpTip
                      content="Chi phí AI ước tính phát sinh trong tháng hiện tại (USD)."
                      label="Giải thích Chi phí tháng"
                    />
                  </span>
                </th>
                <th className="px-5 py-3 text-right">Thao tác</th>
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
                            Đã khóa AI
                          </span>
                        )}
                        {!row.aiKillSwitch && isOverridden && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                            Đã tùy chỉnh
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
                              ? "Không giới hạn"
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
                          aria-label={`Giới hạn lượt gọi mỗi phút của ${row.tenantName}`}
                          className="min-h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-right text-xs font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="text-[10px] text-slate-400">
                          Phút này: {row.currentMinuteRpm ?? 0} lượt ·{" "}
                          {(row.currentMinuteTpm ?? 0).toLocaleString("vi-VN")} token
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
                            title="Khôi phục về hạn mức gốc của gói"
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
                              ? "Mở khóa lại AI cho doanh nghiệp này"
                              : "Khóa khẩn cấp toàn bộ tính năng AI của doanh nghiệp này"
                          }
                          className={cn(
                            "inline-flex min-h-8 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                            row.aiKillSwitch
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          )}
                        >
                          <PowerOff className="size-3.5" />
                          {row.aiKillSwitch ? "Mở AI" : "Khóa AI"}
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
