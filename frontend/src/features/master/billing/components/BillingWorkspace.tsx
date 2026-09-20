import { useMemo, useState } from "react";
import type { SubscriptionPlan, TenantInfo } from "@/api/master/masterAdminApi";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";

export type BillingView = "overview" | "plans" | "allocations" | "invoices";

type BillingWorkspaceProps = {
  plans: SubscriptionPlan[];
  tenants: TenantInfo[];
  view: BillingView;
  onViewChange: (view: BillingView) => void;
  monthlyRevenue: number;
  activeTenants: number;
  onCreatePlan: () => void;
  onEditPlan: (plan: SubscriptionPlan) => void;
  onTogglePlanStatus: (plan: SubscriptionPlan) => void;
};

type InvoiceStatus = "PAID" | "PENDING" | "OVERDUE";

type Invoice = {
  id: string;
  tenant: string;
  plan: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
};

const invoices: Invoice[] = [
  { id: "INV-2026-0948", tenant: "Viettel Group", plan: "Enterprise", amount: 3990, dueDate: "18/09/2026", status: "PAID" },
  { id: "INV-2026-0947", tenant: "FPT Software", plan: "Enterprise", amount: 3990, dueDate: "20/09/2026", status: "PENDING" },
  { id: "INV-2026-0946", tenant: "VNG Corporation", plan: "Professional", amount: 1490, dueDate: "14/09/2026", status: "OVERDUE" },
  { id: "INV-2026-0945", tenant: "Techcombank", plan: "Enterprise", amount: 3990, dueDate: "24/09/2026", status: "PENDING" },
  { id: "INV-2026-0944", tenant: "Acme Corporation", plan: "Professional", amount: 149, dueDate: "12/09/2026", status: "PAID" },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const surface = "rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.28)]";

export function BillingWorkspace({
  plans,
  tenants,
  view,
  onViewChange,
  monthlyRevenue,
  activeTenants,
  onCreatePlan,
  onEditPlan,
  onTogglePlanStatus,
}: BillingWorkspaceProps) {
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [allocationQuery, setAllocationQuery] = useState("");
  const [savedTenantId, setSavedTenantId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>(() => ({}));
  const filteredInvoices = useMemo(() => {
    const query = invoiceQuery.trim().toLowerCase();
    return query
      ? invoices.filter((invoice) => `${invoice.id} ${invoice.tenant} ${invoice.plan}`.toLowerCase().includes(query))
      : invoices;
  }, [invoiceQuery]);
  const filteredTenants = useMemo(() => {
    const query = allocationQuery.trim().toLowerCase();
    return query
      ? tenants.filter((tenant) => `${tenant.name} ${tenant.code} ${tenant.subdomain}`.toLowerCase().includes(query))
      : tenants;
  }, [allocationQuery, tenants]);

  const overdueTotal = invoices
    .filter((invoice) => invoice.status === "OVERDUE")
    .reduce((total, invoice) => total + invoice.amount, 0);

  const downloadInvoices = () => {
    const header = "Invoice,Tenant,Plan,Due date,Amount,Status";
    const rows = invoices.map((invoice) =>
      [invoice.id, invoice.tenant, invoice.plan, invoice.dueDate, invoice.amount, invoice.status]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smarthire-invoices-2026-09.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700">
            <span>Nền tảng</span><ChevronRight className="size-3" aria-hidden="true" /><span>Gói & thanh toán</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Gói dịch vụ & thanh toán</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Theo dõi doanh thu định kỳ, quản lý gói SaaS và xử lý hóa đơn của toàn bộ doanh nghiệp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadInvoices} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            <Download className="size-4" aria-hidden="true" />Xuất báo cáo
          </button>
          <button type="button" onClick={onCreatePlan} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
            <Plus className="size-4" aria-hidden="true" />Tạo gói mới
          </button>
        </div>
      </header>

      <nav className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 sm:w-fit" aria-label="Điều hướng gói và thanh toán">
        {([['overview', 'Tổng quan'], ['plans', `Gói dịch vụ (${plans.length})`], ['allocations', 'Phân bổ gói'], ['invoices', 'Hóa đơn']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => onViewChange(id)} aria-current={view === id ? "page" : undefined} className={cn("min-h-9 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors", view === id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>{label}</button>
        ))}
      </nav>

      {view === "overview" && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tổng quan thanh toán">
            <MetricCard icon={CircleDollarSign} label="Doanh thu định kỳ" value={money.format(monthlyRevenue)} detail="MRR tháng 09/2026" trend="+12,8%" positive />
            <MetricCard icon={Building2} label="Thuê bao hoạt động" value={activeTenants.toString()} detail="Trên toàn nền tảng" trend="+4 tháng này" positive />
            <MetricCard icon={Clock3} label="Đang chờ thanh toán" value={money.format(7980)} detail="2 hóa đơn chưa đến hạn" trend="3,6%" />
            <MetricCard icon={TriangleAlert} label="Công nợ quá hạn" value={money.format(overdueTotal)} detail="1 hóa đơn cần xử lý" trend="-1,2%" />
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
            <section className={cn(surface, "overflow-hidden")}>
              <SectionHeader title="Hiệu suất doanh thu" description="Doanh thu ghi nhận trong 6 tháng gần nhất" action="Xuất báo cáo" onAction={downloadInvoices} />
              <RevenueChart />
            </section>
            <section className={cn(surface, "p-5 sm:p-6")}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm font-semibold text-slate-950">Tình trạng thu tiền</p><p className="mt-1 text-xs text-slate-500">Chu kỳ tháng 09/2026</p></div>
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><CreditCard className="size-5" aria-hidden="true" /></span>
              </div>
              <div className="mt-6 flex items-center gap-5">
                <div className="grid size-28 shrink-0 place-items-center rounded-full bg-[conic-gradient(#2563eb_0_82%,#f59e0b_82%_94%,#ef4444_94%)] p-3">
                  <div className="grid size-full place-items-center rounded-full bg-white text-center"><span><strong className="block text-2xl text-slate-950">94%</strong><small className="text-[10px] font-medium text-slate-500">đã thu</small></span></div>
                </div>
                <dl className="min-w-0 flex-1 space-y-3 text-xs">
                  <StatusLegend color="bg-blue-600" label="Đã thanh toán" value="$41.860" />
                  <StatusLegend color="bg-amber-500" label="Đang chờ" value="$7.980" />
                  <StatusLegend color="bg-red-500" label="Quá hạn" value={money.format(overdueTotal)} />
                </dl>
              </div>
              <button type="button" onClick={() => onViewChange("invoices")} className="mt-6 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-50 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">Xem tất cả hóa đơn<ChevronRight className="size-4" /></button>
            </section>
          </div>

          <section className={cn(surface, "overflow-hidden")}>
            <SectionHeader title="Gói dịch vụ" description="Hiệu suất và giới hạn của các gói đang cung cấp" action="Quản lý gói" onAction={() => onViewChange("plans")} />
            <div className="grid divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              {plans.slice(0, 3).map((plan, index) => <CompactPlan key={plan.id ?? plan.code} plan={plan} tenants={[5, 9, 4][index] ?? 0} />)}
            </div>
          </section>
          <InvoiceTable invoices={invoices.slice(0, 4)} onShowAll={() => onViewChange("invoices")} onDownload={downloadInvoices} />
        </>
      )}

      {view === "plans" && (
        <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {plans.map((plan, index) => <PlanCard key={plan.id ?? plan.code} plan={plan} tenants={[5, 9, 4][index] ?? 0} onEdit={() => onEditPlan(plan)} onToggle={() => onTogglePlanStatus(plan)} />)}
          <button type="button" onClick={onCreatePlan} className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-8 text-center transition-colors hover:bg-blue-50">
            <span className="grid size-12 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm"><Plus className="size-5" /></span>
            <span className="mt-4 text-sm font-semibold text-slate-900">Tạo gói dịch vụ mới</span>
            <span className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Thiết lập mức giá, giới hạn tuyển dụng và hạn ngạch AI.</span>
          </button>
        </section>
      )}

      {view === "allocations" && (
        <section className={cn(surface, "overflow-hidden")}>
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Phân bổ gói cho Tenant</h2>
              <p className="mt-1 text-xs text-slate-500">Gán, nâng cấp hoặc hạ cấp gói dịch vụ cho từng doanh nghiệp.</p>
            </div>
            <label className="relative block w-full sm:max-w-xs"><span className="sr-only">Tìm doanh nghiệp</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={allocationQuery} onChange={(event) => setAllocationQuery(event.target.value)} placeholder="Tìm tenant..." className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">Doanh nghiệp</th><th className="px-6 py-3">Trạng thái</th><th className="px-6 py-3">Gói hiện tại</th><th className="px-6 py-3">Chu kỳ</th><th className="px-6 py-3 text-right">Thao tác</th></tr></thead>
              <tbody>{filteredTenants.map((tenant, index) => {
                const fallbackPlan = plans[index % Math.max(plans.length, 1)];
                const selectedCode = assignments[tenant.id] ?? fallbackPlan?.code ?? "";
                return <tr key={tenant.id} className="border-t border-slate-100 hover:bg-blue-50/30"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="size-4" /></span><span><strong className="block font-semibold text-slate-900">{tenant.name}</strong><small className="text-xs text-slate-500">{tenant.code} · {tenant.subdomain}</small></span></div></td><td className="px-6 py-4"><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", tenant.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{tenant.status}</span></td><td className="px-6 py-4"><select aria-label={`Gói dịch vụ của ${tenant.name}`} value={selectedCode} onChange={(event) => { setAssignments((current) => ({ ...current, [tenant.id]: event.target.value })); setSavedTenantId(null); }} className="min-h-10 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">{plans.filter((plan) => plan.status === "ACTIVE").map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}</select></td><td className="px-6 py-4 text-slate-500">Hàng năm</td><td className="px-6 py-4 text-right"><button type="button" onClick={() => setSavedTenantId(tenant.id)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">{savedTenantId === tenant.id ? <><UserRoundCheck className="size-3.5" />Đã lưu</> : "Lưu thay đổi"}</button></td></tr>;
              })}</tbody>
            </table>
          </div>
          {filteredTenants.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Không tìm thấy tenant phù hợp.</p>}
        </section>
      )}

      {view === "invoices" && (
        <>
          <div className={cn(surface, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}>
            <label className="relative block w-full sm:max-w-sm"><span className="sr-only">Tìm hóa đơn</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={invoiceQuery} onChange={(event) => setInvoiceQuery(event.target.value)} placeholder="Tìm mã hóa đơn, tenant hoặc gói..." className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><SlidersHorizontal className="size-4" />Bộ lọc</button>
          </div>
          <InvoiceTable invoices={filteredInvoices} onDownload={downloadInvoices} />
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, trend, positive = false }: { icon: typeof CreditCard; label: string; value: string; detail: string; trend: string; positive?: boolean }) {
  return <article className={cn(surface, "p-5")}><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-5" /></span><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold", positive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{trend}</span></div><p className="mt-5 text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-400">{detail}</p></article>;
}

function SectionHeader({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 className="text-sm font-semibold text-slate-950">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div><button type="button" onClick={onAction} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">{action}<ChevronRight className="size-3.5" /></button></div>;
}

function RevenueChart() {
  const points = [38, 45, 43, 58, 66, 78];
  return <div className="p-5 sm:p-6"><div className="mb-5 flex items-end justify-between"><div><strong className="text-2xl font-semibold text-slate-950">$48.500</strong><span className="ml-2 text-xs font-semibold text-emerald-700">+12,8%</span></div><span className="text-xs text-slate-400">Đơn vị: USD</span></div><div className="flex h-44 items-end gap-3 sm:gap-5" role="img" aria-label="Biểu đồ doanh thu tăng từ tháng 4 đến tháng 9"><div className="flex h-full flex-1 items-end justify-around border-b border-slate-200 bg-[linear-gradient(to_top,#e2e8f0_1px,transparent_1px)] [background-size:100%_25%]">{points.map((point, index) => <div key={index} className="group flex h-full w-full items-end justify-center"><div className="relative w-3/5 max-w-12 rounded-t-lg bg-blue-100 transition-colors group-hover:bg-blue-200" style={{ height: `${point}%` }}><span className="absolute inset-x-0 -top-6 hidden text-center text-[10px] font-semibold text-blue-700 group-hover:block">${point - 30}k</span></div></div>)}</div></div><div className="mt-3 grid grid-cols-6 text-center text-[10px] font-medium text-slate-400">{["T4", "T5", "T6", "T7", "T8", "T9"].map((month) => <span key={month}>{month}</span>)}</div></div>;
}

function StatusLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="flex items-center gap-2"><span className={cn("size-2 rounded-full", color)} /><dt className="min-w-0 flex-1 text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value}</dd></div>;
}

function CompactPlan({ plan, tenants }: { plan: SubscriptionPlan; tenants: number }) {
  return <article className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="rounded-lg bg-blue-50 px-2 py-1 font-mono text-[10px] font-semibold text-blue-700">{plan.code}</span><span className={cn("size-2 rounded-full", plan.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300")} /></div><h3 className="mt-4 text-sm font-semibold text-slate-950">{plan.name}</h3><p className="mt-1 text-xs text-slate-500">{tenants} tenant đang sử dụng</p><div className="mt-4 flex items-baseline gap-1"><strong className="text-xl text-slate-950">{money.format(plan.priceMonthly)}</strong><span className="text-xs text-slate-400">/ tháng</span></div></article>;
}

function PlanCard({ plan, tenants, onEdit, onToggle }: { plan: SubscriptionPlan; tenants: number; onEdit: () => void; onToggle: () => void }) {
  return <article className={cn(surface, "flex flex-col overflow-hidden")}><div className="border-b border-slate-100 p-6"><div className="flex items-start justify-between gap-3"><div><span className="font-mono text-[10px] font-semibold tracking-wide text-blue-700">{plan.code}</span><h2 className="mt-1 text-lg font-semibold text-slate-950">{plan.name}</h2></div><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", plan.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{plan.status === "ACTIVE" ? "Đang hoạt động" : "Tạm ngưng"}</span></div><p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{plan.description}</p><div className="mt-5 flex items-baseline gap-1"><strong className="text-3xl font-semibold tracking-tight text-slate-950">{money.format(plan.priceMonthly)}</strong><span className="text-xs text-slate-500">/tháng</span></div><p className="mt-1 text-xs text-slate-400">{money.format(plan.priceYearly)} khi thanh toán theo năm</p></div><div className="flex-1 space-y-3 p-6 text-sm text-slate-600"><PlanFeature text={`${plan.maxJobs} vị trí tuyển dụng`} /><PlanFeature text={`${plan.maxCvParses.toLocaleString("vi-VN")} lượt phân tích CV / tháng`} /><PlanFeature text={`${plan.maxAiInterviewHours} giờ phỏng vấn AI`} /><div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs"><span className="text-slate-500">Tenant đang dùng</span><strong className="text-slate-900">{tenants}</strong></div></div><div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4"><button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100"><SlidersHorizontal className="size-4" />Chỉnh sửa</button><button type="button" onClick={onToggle} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">{plan.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt"}</button></div></article>;
}

function PlanFeature({ text }: { text: string }) { return <div className="flex items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><Check className="size-3" /></span><span>{text}</span></div>; }

function InvoiceTable({ invoices: rows, onShowAll, onDownload }: { invoices: Invoice[]; onShowAll?: () => void; onDownload: () => void }) {
  return <section className={cn(surface, "overflow-hidden")}><SectionHeader title="Hóa đơn gần đây" description={`${rows.length} hóa đơn trong danh sách`} action={onShowAll ? "Xem tất cả" : "Tải xuống"} onAction={onShowAll ?? onDownload} /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">Mã hóa đơn</th><th className="px-6 py-3">Doanh nghiệp</th><th className="px-6 py-3">Gói</th><th className="px-6 py-3">Đến hạn</th><th className="px-6 py-3 text-right">Giá trị</th><th className="px-6 py-3">Trạng thái</th></tr></thead><tbody>{rows.map((invoice) => <tr key={invoice.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/30"><td className="px-6 py-4 font-mono text-xs font-semibold text-blue-700"><span className="inline-flex items-center gap-2"><FileText className="size-4 text-slate-400" />{invoice.id}</span></td><td className="px-6 py-4 font-medium text-slate-900">{invoice.tenant}</td><td className="px-6 py-4 text-slate-500">{invoice.plan}</td><td className="px-6 py-4 text-slate-500">{invoice.dueDate}</td><td className="px-6 py-4 text-right font-semibold text-slate-900">{money.format(invoice.amount)}</td><td className="px-6 py-4"><InvoiceBadge status={invoice.status} /></td></tr>)}</tbody></table></div></section>;
}

function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const config = { PAID: ["Đã thanh toán", "bg-emerald-50 text-emerald-700"], PENDING: ["Đang chờ", "bg-amber-50 text-amber-700"], OVERDUE: ["Quá hạn", "bg-red-50 text-red-700"] }[status];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold", config[1])}><span className="size-1.5 rounded-full bg-current" />{config[0]}</span>;
}
