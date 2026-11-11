import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileClock,
  HelpCircle,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { AiQuotaUsage, AuditLog, RevenueAnalytics, TenantInfo } from "@/api/master/masterAdminApi";
import { Tooltip } from "@/components/ux/Tooltip";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import { cn } from "@/lib/utils";

type Destination = "analytics" | "tenants" | "subscriptions" | "logs";
type Props = {
  revenue: RevenueAnalytics | null;
  aiQuota: AiQuotaUsage | null;
  tenants: TenantInfo[];
  logs: AuditLog[];
  onNavigate: (destination: Destination) => void;
  onCreateTenant: () => void;
};

const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.18)]";

type MetricBadge = {
  text: string;
  tone: "emerald" | "rose" | "amber" | "blue";
  trend?: "up" | "down";
};

const badgeToneClass: Record<MetricBadge["tone"], string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-500",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
};

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

function QuickMetric({
  label,
  value,
  tooltip,
  badge,
  icon: Icon,
}: {
  label: string;
  value: string;
  tooltip: string;
  badge?: MetricBadge;
  icon: typeof Activity;
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">
            <span>{label}</span>
            <span className="ml-1.5 inline-flex align-middle">
              <HelpTip content={tooltip} label={`Giải thích ${label}`} />
            </span>
          </p>
          <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-600">{value}</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-100/75 text-blue-600">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      {badge && (
        <div className="mt-4 flex items-center">
          <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", badgeToneClass[badge.tone])}>
            {badge.trend === "up" && <TrendingUp className="size-3" aria-hidden="true" />}
            {badge.trend === "down" && <TrendingDown className="size-3" aria-hidden="true" />}
            <span>{badge.text}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function PlatformHomeDashboard({ revenue, aiQuota, tenants, logs, onNavigate, onCreateTenant }: Props) {
  const activeTenantsList = tenants.filter((tenant) => !tenant.deleted && tenant.status === "ACTIVE");
  const attentionTenants = tenants.filter((tenant) => !tenant.deleted && tenant.status !== "ACTIVE");
  const warnings = logs.filter((log) => log.level !== "INFO");
  const cvLimit = aiQuota?.totalCvParsesLimit && aiQuota.totalCvParsesLimit > 0 ? aiQuota.totalCvParsesLimit : 1000;
  const cvUsage = Math.min(100, Math.round(((aiQuota?.totalCvParsesUsed ?? 0) / cvLimit) * 100));

  const overdueCount = revenue?.overdueInvoicesCount ?? 0;
  const overdueAmount = revenue?.overdueInvoicesAmount ?? 0;
  const nearQuotaCount = aiQuota?.nearQuotaTenantsCount ?? 0;
  const totalActionItems = attentionTenants.length + overdueCount + nearQuotaCount + warnings.length;

  const tasks = [
    {
      title: `${attentionTenants.length} tenant cần kiểm tra`,
      detail: attentionTenants.length > 0 ? "Đang khởi tạo, chờ thanh toán hoặc tạm ngưng" : "Tất cả tenant đang ở trạng thái ổn định",
      icon: Building2,
      tone: attentionTenants.length > 0 ? "rose" : "blue",
      destination: "tenants" as const,
    },
    {
      title: `${overdueCount} hóa đơn đã quá hạn`,
      detail: overdueCount > 0 ? `${overdueAmount.toLocaleString("vi-VN")} ₫ đang chờ thu hồi` : "Không có công nợ quá hạn",
      icon: CreditCard,
      tone: overdueCount > 0 ? "amber" : "blue",
      destination: "subscriptions" as const,
    },
    {
      title: `${nearQuotaCount} tenant gần chạm AI quota`,
      detail: nearQuotaCount > 0 ? "Mức sử dụng vượt ngưỡng 80%" : "Hạn mức AI các tenant vẫn trong ngưỡng an toàn",
      icon: Bot,
      tone: nearQuotaCount > 0 ? "amber" : "blue",
      destination: "analytics" as const,
    },
    {
      title: `${warnings.length} cảnh báo hệ thống mới`,
      detail: warnings.length > 0 ? "Kiểm tra các cảnh báo hoặc lỗi hệ thống" : "Không có cảnh báo bảo mật mới",
      icon: ShieldCheck,
      tone: warnings.length > 0 ? "rose" : "blue",
      destination: "logs" as const,
    },
  ];

  const isHealthy = (aiQuota?.systemHealth ?? "HEALTHY") === "HEALTHY";
  const growthRate = revenue?.growthRate ?? "0.0%";
  const isNegativeGrowth = growthRate.trim().startsWith("-");

  return (
    <div className="space-y-6 animate-fade-in">
      <HeaderActions>
        <button
          type="button"
          onClick={onCreateTenant}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <Plus className="size-3.5" />
          <span>Khởi tạo tenant</span>
        </button>
      </HeaderActions>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickMetric
          label="Tenant hoạt động"
          value={`${revenue?.activeTenants ?? activeTenantsList.length}`}
          badge={{
            text: `${attentionTenants.length} cần chú ý`,
            tone: attentionTenants.length > 0 ? "amber" : "emerald",
          }}
          tooltip={`Số doanh nghiệp đang hoạt động: ${revenue?.activeTenants ?? activeTenantsList.length} / tổng ${revenue?.totalTenants ?? tenants.length} tenant (${attentionTenants.length} tenant cần chú ý).`}
          icon={Building2}
        />
        <QuickMetric
          label="MRR hiện tại"
          value={`${(revenue?.mrr ?? 0).toLocaleString("vi-VN")} ₫`}
          badge={{
            text: growthRate,
            tone: isNegativeGrowth ? "rose" : "emerald",
            trend: isNegativeGrowth ? "down" : "up",
          }}
          tooltip={`Quy đổi năm: doanh thu định kỳ hàng tháng tính từ các hợp đồng gói năm đang hoạt động (${growthRate} doanh thu thu về so với tháng trước).`}
          icon={CircleDollarSign}
        />
        <QuickMetric
          label="AI quota toàn nền tảng"
          value={`${cvUsage}%`}
          badge={{
            text: cvUsage >= 80 ? "Gần chạm ngưỡng" : "An toàn",
            tone: cvUsage >= 80 ? "amber" : "emerald",
          }}
          tooltip={`Mức tiêu thụ AI toàn sàn hiện tại: ${(aiQuota?.totalCvParsesUsed ?? 0).toLocaleString("vi-VN")} / ${cvLimit.toLocaleString("vi-VN")} lượt CV AI.`}
          icon={Bot}
        />
        <QuickMetric
          label="Tình trạng hệ thống"
          value={isHealthy ? "Ổn định" : "Cảnh báo"}
          badge={{
            text: `${aiQuota?.apiSuccessRate ?? 100}%`,
            tone: isHealthy ? "emerald" : "rose",
            trend: isHealthy ? "up" : "down",
          }}
          tooltip={`Tỷ lệ xử lý AI thành công đạt ${aiQuota?.apiSuccessRate ?? 100}% · ${aiQuota?.activeModels?.length ?? 0} mô hình AI đang hoạt động.`}
          icon={Activity}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className={cn(cardClass, "overflow-hidden")}>
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-slate-600">Dòng sự kiện gần đây</h2>
              <HelpTip
                content="Hoạt động hệ thống, hạn mức sử dụng và thao tác quản trị gần đây"
                label="Giải thích Dòng sự kiện gần đây"
              />
            </div>
            <button type="button" onClick={() => onNavigate("logs")} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
              Xem nhật ký <ArrowRight className="size-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {logs.slice(0, 6).map((log) => (
              <article key={log.id} className="flex gap-3 px-5 py-4">
                <span className={cn("mt-1 grid size-9 shrink-0 place-items-center rounded-xl", log.level === "ERROR" ? "bg-rose-50 text-rose-700" : log.level === "WARN" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
                  {log.level === "INFO" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{log.action}</h3>
                    <time className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleString("vi-VN")}</time>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{log.tenantCode} · {log.description}</p>
                </div>
              </article>
            ))}
            {logs.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">Chưa có sự kiện mới.</p>}
          </div>
        </section>

        <section className={cn(cardClass, "p-5")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-slate-600">Cần xử lý</h2>
              <HelpTip
                content="Danh sách hạng mục ưu tiên theo mức độ cần can thiệp thực tế"
                label="Giải thích Cần xử lý"
              />
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", totalActionItems > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
              {totalActionItems}
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {tasks.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="relative flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <button
                    type="button"
                    onClick={() => onNavigate(item.destination)}
                    aria-label={item.title}
                    className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  />
                  <span className={cn("pointer-events-none relative z-10 grid size-9 shrink-0 place-items-center rounded-lg", item.tone === "rose" ? "bg-rose-50 text-rose-700" : item.tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                    <span className="text-sm font-semibold text-slate-800">{item.title}</span>
                    <span className="pointer-events-auto ml-1.5 inline-flex align-middle">
                      <HelpTip content={item.detail} label={`Giải thích: ${item.title}`} />
                    </span>
                  </div>
                  <ArrowRight className="pointer-events-none relative z-10 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SummaryCard
          icon={Activity}
          title="Hạ tầng & AI Engine"
          subtitle="Số liệu đo lường thời gian thực"
          rows={[
            ["Độ trễ AI trung bình", aiQuota?.averageLatencyMs ? `${aiQuota.averageLatencyMs} ms` : "< 150 ms"],
            ["Tỷ lệ gọi AI thành công", `${aiQuota?.apiSuccessRate ?? 100}%`],
            ["Kết nối dữ liệu hoạt động", `${revenue?.activeTenants ?? activeTenantsList.length} / ${revenue?.totalTenants ?? tenants.length} cụm`],
          ]}
        />
        <SummaryCard
          icon={FileClock}
          title="Tiêu thụ tài nguyên kỳ này"
          subtitle="Tóm tắt toàn nền tảng (30 ngày)"
          rows={[
            ["Tenant mới tháng này", `${revenue?.newTenantsThisMonth ?? 0}`],
            ["CV đã xử lý bằng AI", `${(aiQuota?.totalCvParsesUsed ?? 0).toLocaleString("vi-VN")}`],
            ["Giờ phỏng vấn AI", `${aiQuota?.totalVoiceHoursUsed ?? 0} giờ`],
          ]}
        />
        <SummaryCard
          icon={CreditCard}
          title="Tài chính & Thương mại"
          subtitle="Tổng hợp hóa đơn & hợp đồng"
          rows={[
            ["Doanh thu định kỳ năm", `${(revenue?.arr ?? 0).toLocaleString("vi-VN")} ₫`],
            ["Hóa đơn chờ thanh toán", `${revenue?.pendingInvoicesCount ?? 0} (${(revenue?.pendingInvoicesAmount ?? 0).toLocaleString("vi-VN")} ₫)`],
            ["Yêu cầu tư vấn / Hợp đồng chờ xử lý", `${revenue?.openLeadsCount ?? 0} yêu cầu · ${revenue?.pendingContractsCount ?? 0} HĐ`],
          ]}
        />
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, title, subtitle, rows }: { icon: typeof Activity; title: string; subtitle: string; rows: string[][] }) {
  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="text-sm font-semibold text-slate-600">{title}</h2>
          <HelpTip content={subtitle} label={`Giải thích ${title}`} />
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
