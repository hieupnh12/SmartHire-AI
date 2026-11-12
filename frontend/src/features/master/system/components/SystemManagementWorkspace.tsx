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
import { useT, useLocale, formatNumber } from "@/i18n";

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
  const t = useT();
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
            {tooltip && (
              <HelpTip
                content={tooltip}
                label={t("master.ops.systemWorkspace.helpTipLabel", { label })}
              />
            )}
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
  const t = useT();
  const locale = useLocale();
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
        err.response?.data?.message || err.message || t("master.ops.systemWorkspace.usage.loadError")
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
  const maxCv = Math.max(1, ...trend.map((item) => item.cvCount));
  const maxInt = Math.max(1, ...trend.map((item) => item.interviewHours));
  const maxReq = Math.max(1, ...trend.map((item) => item.aiRequests));

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
              {t("master.ops.systemWorkspace.usage.refreshBtn")}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileDown className="size-3.5" />
              {t("master.ops.systemWorkspace.usage.exportCsvBtn")}
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
        aria-label={t("master.ops.systemWorkspace.usage.metricsAria")}
      >
        <MetricCard
          icon={BrainCircuit}
          label={t("master.ops.systemWorkspace.usage.kpiCvLabel")}
          value={formatNumber(report?.totalCvParses ?? 0, undefined, locale)}
          tooltip={t("master.ops.systemWorkspace.usage.kpiCvTooltip", { months })}
        />
        <MetricCard
          icon={Bot}
          label={t("master.ops.systemWorkspace.usage.kpiInterviewLabel")}
          value={t("master.ops.systemWorkspace.usage.kpiInterviewValue", {
            hours: formatNumber(report?.totalInterviewHours ?? 0, undefined, locale),
          })}
          tooltip={t("master.ops.systemWorkspace.usage.kpiInterviewTooltip")}
          tone="violet"
        />
        <MetricCard
          icon={Sparkles}
          label={t("master.ops.systemWorkspace.usage.kpiRequestsLabel")}
          value={formatNumber(report?.totalAiRequests ?? 0, undefined, locale)}
          tooltip={t("master.ops.systemWorkspace.usage.kpiRequestsTooltip", {
            tokens: formatNumber(report?.totalTokensConsumed ?? 0, undefined, locale),
            rate: report?.successRatePercent ?? 100,
            latency: report?.avgLatencyMs
              ? t("master.ops.systemWorkspace.usage.kpiLatencyPart", { ms: report.avgLatencyMs })
              : "",
          })}
          tone="emerald"
        />
        <MetricCard
          icon={Cpu}
          label={t("master.ops.systemWorkspace.usage.kpiCostLabel")}
          value={`$${formatNumber(
            Number(report?.totalEstimatedCostUsd ?? 0),
            { minimumFractionDigits: 2, maximumFractionDigits: 4 },
            locale,
          )}`}
          tooltip={t("master.ops.systemWorkspace.usage.kpiCostTooltip")}
          tone="amber"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className={cn(surface, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-600">
                {t("master.ops.systemWorkspace.usage.trendTitle", { months })}
              </h2>
              <HelpTip
                content={t("master.ops.systemWorkspace.usage.trendTooltip")}
                label={t("master.ops.systemWorkspace.usage.trendHelpLabel")}
              />
            </div>
            <div className="w-44">
              <CustomSelect
                ariaLabel={t("master.ops.systemWorkspace.usage.rangeAria")}
                value={String(months)}
                onChange={(val) => setMonths(Number(val))}
                options={[
                  { value: "6", label: t("master.ops.systemWorkspace.usage.range6m") },
                  { value: "12", label: t("master.ops.systemWorkspace.usage.range12m") },
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
                      title={t("master.ops.systemWorkspace.usage.tooltipCv", {
                        count: formatNumber(item.cvCount, undefined, locale),
                      })}
                    />
                    <span
                      className="w-2.5 rounded-t bg-violet-400 sm:w-4 transition-all"
                      style={{ height: `${intPct}%` }}
                      title={t("master.ops.systemWorkspace.usage.tooltipInterview", {
                        hours: item.interviewHours,
                      })}
                    />
                    <span
                      className="w-2.5 rounded-t bg-cyan-400 sm:w-4 transition-all"
                      style={{ height: `${reqPct}%` }}
                      title={t("master.ops.systemWorkspace.usage.tooltipRequests", {
                        count: formatNumber(item.aiRequests, undefined, locale),
                        cost: item.estimatedCostUsd,
                      })}
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
              {t("master.ops.systemWorkspace.usage.legendCv")}
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-violet-400" />
              {t("master.ops.systemWorkspace.usage.legendInterview")}
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-cyan-400" />
              {t("master.ops.systemWorkspace.usage.legendRequests")}
            </span>
          </div>
        </section>

        <section className={cn(surface, "p-5 sm:p-6")}>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-600">
              {t("master.ops.systemWorkspace.usage.costByTaskTitle")}
            </h2>
            <HelpTip
              content={t("master.ops.systemWorkspace.usage.costByTaskTooltip")}
              label={t("master.ops.systemWorkspace.usage.costByTaskHelpLabel")}
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
                  {t("master.ops.systemWorkspace.usage.taskRequestsTokens", {
                    requests: formatNumber(item.requests, undefined, locale),
                    tokens: formatNumber(item.totalTokens, undefined, locale),
                  })}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={cn(surface, "overflow-hidden")}>
        <div className="flex items-center gap-2 border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-600">
            {t("master.ops.systemWorkspace.usage.tenantUsageTitle")}
          </h2>
          <HelpTip
            content={t("master.ops.systemWorkspace.usage.tenantUsageTooltip")}
            label={t("master.ops.systemWorkspace.usage.tenantUsageHelpLabel")}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("master.ops.systemWorkspace.usage.colTenantPlan")}</th>
                <th className="px-4 py-3 text-right">{t("master.ops.systemWorkspace.usage.colCvScreening")}</th>
                <th className="px-4 py-3 text-right">{t("master.ops.systemWorkspace.usage.colAiInterview")}</th>
                <th className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span>{t("master.ops.systemWorkspace.usage.colTokens")}</span>
                    <HelpTip
                      content={t("master.ops.systemWorkspace.usage.colTokensTooltip")}
                      label={t("master.ops.systemWorkspace.usage.colTokensHelpLabel")}
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span>{t("master.ops.systemWorkspace.usage.colApiCost")}</span>
                    <HelpTip
                      content={t("master.ops.systemWorkspace.usage.colApiCostTooltip")}
                      label={t("master.ops.systemWorkspace.usage.colApiCostHelpLabel")}
                    />
                  </span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span>{t("master.ops.systemWorkspace.usage.colMomChange")}</span>
                    <HelpTip
                      content={t("master.ops.systemWorkspace.usage.colMomChangeTooltip")}
                      label={t("master.ops.systemWorkspace.usage.colMomChangeHelpLabel")}
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(report?.tenantUsages || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500">
                    {t("master.ops.systemWorkspace.usage.emptyTenantUsage")}
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
                      {t("master.ops.systemWorkspace.usage.cvParsesCount", {
                        count: formatNumber(row.cvParses, undefined, locale),
                      })}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">
                      {t("master.ops.systemWorkspace.usage.interviewHoursCount", {
                        hours: row.interviewHours,
                      })}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">
                      {formatNumber(row.totalTokens, undefined, locale)}
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
  const t = useT();
  const locale = useLocale();
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
        err.response?.data?.message || err.message || t("master.ops.systemWorkspace.quotas.loadError")
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
      toast.success(t("master.ops.systemWorkspace.quotas.saveSuccess", { name: row.tenantName }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || t("master.ops.systemWorkspace.quotas.saveError"));
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleKillSwitch = (row: TenantAiQuota) => {
    const enablingKill = !row.aiKillSwitch;
    askConfirm({
      title: enablingKill
        ? t("master.ops.systemWorkspace.quotas.killSwitchLockTitle")
        : t("master.ops.systemWorkspace.quotas.killSwitchUnlockTitle"),
      description: enablingKill
        ? t("master.ops.systemWorkspace.quotas.killSwitchLockDesc", { name: row.tenantName })
        : t("master.ops.systemWorkspace.quotas.killSwitchUnlockDesc", { name: row.tenantName }),
      confirmLabel: enablingKill
        ? t("master.ops.systemWorkspace.quotas.killSwitchLockConfirm")
        : t("master.ops.systemWorkspace.quotas.killSwitchUnlockConfirm"),
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
              ? t("master.ops.systemWorkspace.quotas.killSwitchLockedToast", { name: row.tenantName })
              : t("master.ops.systemWorkspace.quotas.killSwitchUnlockedToast", { name: row.tenantName })
          );
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || t("master.ops.systemWorkspace.quotas.killSwitchError"));
        } finally {
          setSavingId(null);
        }
      },
    });
  };

  const handleResetToPlan = (row: TenantAiQuota) => {
    askConfirm({
      title: t("master.ops.systemWorkspace.quotas.resetTitle"),
      description: t("master.ops.systemWorkspace.quotas.resetDesc", { name: row.tenantName }),
      confirmLabel: t("master.ops.systemWorkspace.quotas.resetConfirm"),
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
          toast.success(t("master.ops.systemWorkspace.quotas.resetSuccess", { name: row.tenantName }));
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || t("master.ops.systemWorkspace.quotas.resetError"));
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
            {t("master.ops.systemWorkspace.quotas.refreshBtn")}
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
        aria-label={t("master.ops.systemWorkspace.quotas.metricsAria")}
      >
        <MetricCard
          icon={Gauge}
          label={t("master.ops.systemWorkspace.quotas.metricTotalTenants")}
          value={String(rows.length)}
          tooltip={t("master.ops.systemWorkspace.quotas.metricTotalTenantsTooltip")}
        />
        <MetricCard
          icon={AlertTriangle}
          label={t("master.ops.systemWorkspace.quotas.metricNearLimit")}
          value={String(nearLimitCount)}
          tooltip={t("master.ops.systemWorkspace.quotas.metricNearLimitTooltip")}
          tone="amber"
        />
        <MetricCard
          icon={ShieldAlert}
          label={t("master.ops.systemWorkspace.quotas.metricKillSwitched")}
          value={String(killSwitchedCount)}
          tooltip={t("master.ops.systemWorkspace.quotas.metricKillSwitchedTooltip")}
          tone="violet"
        />
        <MetricCard
          icon={CheckCircle2}
          label={t("master.ops.systemWorkspace.quotas.metricOperational")}
          value={String(Math.max(0, rows.length - killSwitchedCount))}
          tooltip={t("master.ops.systemWorkspace.quotas.metricOperationalTooltip")}
          tone="emerald"
        />
      </section>

      <section className={cn(surface, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-600">
              {t("master.ops.systemWorkspace.quotas.tableTitle")}
            </h2>
            <HelpTip
              content={t("master.ops.systemWorkspace.quotas.tableTooltip")}
              label={t("master.ops.systemWorkspace.quotas.tableHelpLabel")}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("master.ops.systemWorkspace.quotas.colTenantBase")}</th>
                <th className="px-4 py-3">{t("master.ops.systemWorkspace.quotas.colCvUsed")}</th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <span>{t("master.ops.systemWorkspace.quotas.colCvLimit")}</span>
                    <HelpTip
                      content={t("master.ops.systemWorkspace.quotas.colCvLimitTooltip")}
                      label={t("master.ops.systemWorkspace.quotas.colCvLimitHelpLabel")}
                    />
                  </span>
                </th>
                <th className="px-4 py-3">{t("master.ops.systemWorkspace.quotas.colInterviewUsed")}</th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <span>{t("master.ops.systemWorkspace.quotas.colInterviewLimit")}</span>
                    <HelpTip
                      content={t("master.ops.systemWorkspace.quotas.colInterviewLimitTooltip")}
                      label={t("master.ops.systemWorkspace.quotas.colInterviewLimitHelpLabel")}
                    />
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <span>{t("master.ops.systemWorkspace.quotas.colRpmLimit")}</span>
                    <HelpTip
                      content={t("master.ops.systemWorkspace.quotas.colRpmLimitTooltip")}
                      label={t("master.ops.systemWorkspace.quotas.colRpmLimitHelpLabel")}
                    />
                  </span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span>{t("master.ops.systemWorkspace.quotas.colMonthlyCost")}</span>
                    <HelpTip
                      content={t("master.ops.systemWorkspace.quotas.colMonthlyCostTooltip")}
                      label={t("master.ops.systemWorkspace.quotas.colMonthlyCostHelpLabel")}
                    />
                  </span>
                </th>
                <th className="px-5 py-3 text-right">{t("master.ops.systemWorkspace.quotas.colAdminAction")}</th>
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
                            {t("master.ops.systemWorkspace.quotas.badgeAiLocked")}
                          </span>
                        )}
                        {!row.aiKillSwitch && isOverridden && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                            {t("master.ops.systemWorkspace.quotas.badgeOverridden")}
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-xs text-slate-500">
                        {t("master.ops.systemWorkspace.quotas.baseLimitInfo", {
                          code: row.tenantCode,
                          plan: row.planName,
                          cv: row.basePlanCvLimit < 0 ? "∞" : row.basePlanCvLimit,
                          hours: row.basePlanInterviewHoursLimit < 0 ? "∞" : row.basePlanInterviewHoursLimit,
                        })}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="w-36">
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span>
                            {t("master.ops.systemWorkspace.quotas.cvUsedCount", {
                              count: formatNumber(row.cvUsed, undefined, locale),
                            })}
                          </span>
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
                              ? t("master.ops.systemWorkspace.quotas.unlimited")
                              : row.cvLimit === 0
                              ? t("master.ops.systemWorkspace.quotas.lockedZero")
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
                        aria-label={t("master.ops.systemWorkspace.quotas.cvLimitAria", {
                          name: row.tenantName,
                        })}
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
                          : t("master.ops.systemWorkspace.quotas.interviewHoursUnit", {
                              hours: row.interviewHoursLimit,
                            })}
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
                        aria-label={t("master.ops.systemWorkspace.quotas.interviewLimitAria", {
                          name: row.tenantName,
                        })}
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
                          aria-label={t("master.ops.systemWorkspace.quotas.rpmLimitAria", {
                            name: row.tenantName,
                          })}
                          className="min-h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-right text-xs font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="text-[10px] text-slate-400">
                          {t("master.ops.systemWorkspace.quotas.currentMinuteUsage", {
                            rpm: row.currentMinuteRpm ?? 0,
                            tpm: formatNumber(row.currentMinuteTpm ?? 0, undefined, locale),
                          })}
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
                          {savedId === row.tenantId
                            ? t("master.ops.systemWorkspace.quotas.savedBtn")
                            : t("master.ops.systemWorkspace.quotas.saveBtn")}
                        </button>

                        {isOverridden && (
                          <button
                            type="button"
                            disabled={savingId === row.tenantId}
                            onClick={() => handleResetToPlan(row)}
                            title={t("master.ops.systemWorkspace.quotas.resetBtnTitle")}
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
                              ? t("master.ops.systemWorkspace.quotas.unlockAiTitle")
                              : t("master.ops.systemWorkspace.quotas.lockAiTitle")
                          }
                          className={cn(
                            "inline-flex min-h-8 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                            row.aiKillSwitch
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          )}
                        >
                          <PowerOff className="size-3.5" />
                          {row.aiKillSwitch
                            ? t("master.ops.systemWorkspace.quotas.unlockAiBtn")
                            : t("master.ops.systemWorkspace.quotas.killSwitchBtn")}
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
