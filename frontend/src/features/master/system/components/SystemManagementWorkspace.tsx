import { useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Cpu,
  FileDown,
  Gauge,
  Save,
  Sparkles,
} from "lucide-react";
import type { TenantInfo } from "@/api/master/masterAdminApi";
import { cn } from "@/lib/utils";

export type SystemManagementView = "ai-usage" | "ai-quotas";

type Props = {
  view: SystemManagementView;
  tenants: TenantInfo[];
};

type QuotaRow = {
  id: string;
  tenant: string;
  plan: string;
  cvLimit: number;
  cvUsed: number;
  interviewLimit: number;
  interviewUsed: number;
};

const fallbackTenants = ["TechCorp Vietnam", "FPT Software", "VNG Corporation", "ACME Enterprise"];
const monthlyUsage = [
  { month: "T4", cv: 48, interview: 26, matching: 34 },
  { month: "T5", cv: 56, interview: 31, matching: 39 },
  { month: "T6", cv: 51, interview: 35, matching: 44 },
  { month: "T7", cv: 68, interview: 42, matching: 49 },
  { month: "T8", cv: 74, interview: 47, matching: 58 },
  { month: "T9", cv: 82, interview: 54, matching: 64 },
];

const surface = "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.18)]";

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2"><span className="text-sm font-semibold text-blue-700">{eyebrow}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Dữ liệu mẫu</span></div><h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</header>;
}

function MetricCard({ icon: Icon, label, value, detail, tone = "blue" }: { icon: ComponentType<{ className?: string }>; label: string; value: string; detail: string; tone?: "blue" | "violet" | "amber" | "emerald" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700", emerald: "bg-emerald-50 text-emerald-700" };
  return <article className={cn(surface, "p-5")}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><span className={cn("grid size-10 place-items-center rounded-xl", tones[tone])}><Icon className="size-5" aria-hidden="true" /></span></div><p className="mt-3 text-xs text-slate-500">{detail}</p></article>;
}

function AiUsageReport({ tenants }: { tenants: TenantInfo[] }) {
  const names = tenants.length ? tenants.slice(0, 4).map((tenant) => tenant.name) : fallbackTenants;
  const tenantUsage = names.map((tenant, index) => ({ tenant, cv: [8420, 7160, 5840, 3920][index] ?? 2400, interview: [186, 142, 128, 76][index] ?? 54, cost: [2380, 1960, 1540, 980][index] ?? 720, change: [12.8, 8.4, -3.2, 5.7][index] ?? 2.4 }));
  return <div className="space-y-6 animate-fade-in">
    <PageHeader eyebrow="Hệ thống / AI usage" title="Báo cáo sử dụng AI" description="Theo dõi mức tiêu thụ, chi phí ước tính và xu hướng sử dụng AI trên toàn bộ tenant trước khi kết nối API thống kê thực tế." action={<button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"><FileDown className="size-4" />Xuất báo cáo mẫu</button>} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số sử dụng AI">
      <MetricCard icon={BrainCircuit} label="CV đã phân tích" value="25.340" detail="Tăng 12,8% so với kỳ trước" />
      <MetricCard icon={Bot} label="Giờ AI interview" value="532 giờ" detail="76% lưu lượng trong hạn mức" tone="violet" />
      <MetricCard icon={Sparkles} label="Lượt matching" value="18.760" detail="Độ trễ trung bình 1,8 giây" tone="emerald" />
      <MetricCard icon={Cpu} label="Chi phí ước tính" value="$6.860" detail="27,1% ngân sách AI tháng" tone="amber" />
    </section>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <section className={cn(surface, "p-5 sm:p-6")}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Xu hướng tiêu thụ 6 tháng</h2><p className="mt-1 text-xs text-slate-500">Chỉ số tương đối theo từng nhóm dịch vụ AI</p></div><select aria-label="Khoảng thời gian báo cáo" className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600"><option>6 tháng gần nhất</option><option>12 tháng gần nhất</option></select></div><div className="mt-7 flex h-64 items-end gap-3 border-b border-slate-200 pb-3 sm:gap-5">{monthlyUsage.map((item) => <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end"><div className="flex h-[calc(100%-1.75rem)] items-end justify-center gap-1"><span className="w-2.5 rounded-t bg-blue-500 sm:w-4" style={{ height: `${item.cv}%` }} title={`CV: ${item.cv}%`} /><span className="w-2.5 rounded-t bg-violet-400 sm:w-4" style={{ height: `${item.interview}%` }} title={`Interview: ${item.interview}%`} /><span className="w-2.5 rounded-t bg-cyan-400 sm:w-4" style={{ height: `${item.matching}%` }} title={`Matching: ${item.matching}%`} /></div><span className="mt-2 text-center text-xs font-medium text-slate-500">{item.month}</span></div>)}</div><div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-500"><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-blue-500" />CV screening</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-violet-400" />AI interview</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-cyan-400" />Matching</span></div></section>
      <section className={cn(surface, "p-5 sm:p-6")}><h2 className="font-semibold text-slate-950">Phân bổ chi phí</h2><p className="mt-1 text-xs text-slate-500">Ước tính theo loại tác vụ</p><div className="mt-6 space-y-5">{[["CV screening",46,"bg-blue-500"],["AI interview",31,"bg-violet-500"],["Semantic matching",17,"bg-cyan-500"],["Khác",6,"bg-slate-400"]].map(([label, value, color]) => <div key={String(label)}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-600">{label}</span><strong>{value}%</strong></div><div className="h-2.5 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", String(color))} style={{ width: `${value}%` }} /></div></div>)}</div></section>
    </div>
    <section className={cn(surface, "overflow-hidden")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-950">Mức sử dụng theo tenant</h2><p className="mt-1 text-xs text-slate-500">Dữ liệu giả lập để chuẩn bị mapping response API sau này</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tenant</th><th className="px-4 py-3 text-right">CV screening</th><th className="px-4 py-3 text-right">AI interview</th><th className="px-4 py-3 text-right">Chi phí</th><th className="px-5 py-3 text-right">Biến động</th></tr></thead><tbody>{tenantUsage.map((row) => <tr key={row.tenant} className="border-t border-slate-100 hover:bg-blue-50/30"><td className="px-5 py-4 font-semibold text-slate-900">{row.tenant}</td><td className="px-4 py-4 text-right text-slate-600">{row.cv.toLocaleString("vi-VN")} lượt</td><td className="px-4 py-4 text-right text-slate-600">{row.interview} giờ</td><td className="px-4 py-4 text-right font-semibold">${row.cost.toLocaleString("en-US")}</td><td className={cn("px-5 py-4 text-right font-semibold", row.change >= 0 ? "text-emerald-700" : "text-rose-700")}>{row.change >= 0 ? "+" : ""}{row.change}%</td></tr>)}</tbody></table></div></section>
  </div>;
}

function AiQuotaManagement({ tenants }: { tenants: TenantInfo[] }) {
  const initialRows = useMemo<QuotaRow[]>(() => {
    const source = tenants.length ? tenants.slice(0, 6).map((tenant) => ({ id: String(tenant.id), tenant: tenant.name })) : fallbackTenants.map((tenant, index) => ({ id: String(index + 1), tenant }));
    return source.map((item, index) => ({ ...item, plan: ["Enterprise", "Business", "Business", "Starter"][index] ?? "Business", cvLimit: [12000, 10000, 8000, 5000][index] ?? 6000, cvUsed: [8420, 9140, 7640, 1820][index] ?? 3200, interviewLimit: [300, 240, 180, 100][index] ?? 140, interviewUsed: [186, 226, 162, 38][index] ?? 64 }));
  }, [tenants]);
  const [rows, setRows] = useState(initialRows);
  const [savedId, setSavedId] = useState<string | null>(null);
  const nearLimit = rows.filter((row) => row.cvUsed / row.cvLimit >= 0.8 || row.interviewUsed / row.interviewLimit >= 0.8).length;
  const updateLimit = (id: string, field: "cvLimit" | "interviewLimit", value: number) => setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: Math.max(0, value) } : row));
  return <div className="space-y-6 animate-fade-in">
    <PageHeader eyebrow="Hệ thống / Quota" title="Quản lý hạn ngạch AI" description="Mô phỏng màn hình kiểm soát hạn mức theo tenant. Thay đổi hiện chỉ tồn tại trong phiên làm việc và chưa được gửi đến backend." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tổng quan hạn ngạch AI">
      <MetricCard icon={Gauge} label="Tenant được cấp quota" value={String(rows.length)} detail="Theo danh sách tenant hiện có" />
      <MetricCard icon={AlertTriangle} label="Gần chạm ngưỡng" value={String(nearLimit)} detail="Sử dụng từ 80% hạn mức" tone="amber" />
      <MetricCard icon={Clock3} label="Chu kỳ hiện tại" value="30 ngày" detail="Làm mới vào 01/10/2026" tone="violet" />
      <MetricCard icon={CheckCircle2} label="Chính sách hoạt động" value="3" detail="Starter, Business, Enterprise" tone="emerald" />
    </section>
    <section className={cn(surface, "overflow-hidden")}><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-950">Hạn mức theo tenant</h2><p className="mt-1 text-xs text-slate-500">Có thể chỉnh dữ liệu mẫu để kiểm thử trạng thái và luồng lưu</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Chu kỳ tháng 09/2026</span></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tenant / Gói</th><th className="px-4 py-3">CV screening</th><th className="px-4 py-3">Hạn mức CV</th><th className="px-4 py-3">AI interview</th><th className="px-4 py-3">Hạn mức giờ</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody>{rows.map((row) => { const cvPercent = Math.round(row.cvUsed / Math.max(row.cvLimit, 1) * 100); const interviewPercent = Math.round(row.interviewUsed / Math.max(row.interviewLimit, 1) * 100); const warning = cvPercent >= 80 || interviewPercent >= 80; return <tr key={row.id} className="border-t border-slate-100 align-middle hover:bg-blue-50/20"><td className="px-5 py-4"><strong className="block text-slate-900">{row.tenant}</strong><span className="mt-1 block text-xs text-slate-500">{row.plan}</span></td><td className="px-4 py-4"><div className="w-36"><div className="mb-1.5 flex justify-between text-xs"><span>{row.cvUsed.toLocaleString("vi-VN")}</span><strong className={cvPercent >= 80 ? "text-amber-700" : "text-slate-700"}>{cvPercent}%</strong></div><div className="h-2 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", cvPercent >= 90 ? "bg-rose-500" : cvPercent >= 80 ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${Math.min(cvPercent, 100)}%` }} /></div></div></td><td className="px-4 py-4"><input type="number" min="0" value={row.cvLimit} onChange={(event) => updateLimit(row.id, "cvLimit", Number(event.target.value))} aria-label={`Hạn mức CV của ${row.tenant}`} className="min-h-10 w-28 rounded-lg border border-slate-200 bg-white px-3 text-right font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></td><td className="px-4 py-4"><span className={cn("font-semibold", interviewPercent >= 80 ? "text-amber-700" : "text-slate-700")}>{row.interviewUsed} / {row.interviewLimit} giờ</span></td><td className="px-4 py-4"><input type="number" min="0" value={row.interviewLimit} onChange={(event) => updateLimit(row.id, "interviewLimit", Number(event.target.value))} aria-label={`Hạn mức giờ AI interview của ${row.tenant}`} className="min-h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-right font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => { setSavedId(row.id); window.setTimeout(() => setSavedId(null), 1600); }} className={cn("inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors", savedId === row.id ? "bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}><Save className="size-3.5" />{savedId === row.id ? "Đã lưu mẫu" : "Lưu thay đổi"}</button>{warning && <p className="mt-1.5 text-[10px] font-semibold text-amber-700">Cần xem xét hạn mức</p>}</td></tr>; })}</tbody></table></div></section>
    <section className="grid gap-4 lg:grid-cols-3">{[["Starter","5.000 CV · 100 giờ","Dành cho tenant mới"],["Business","10.000 CV · 240 giờ","Ngưỡng cảnh báo 80%"],["Enterprise","Tùy chỉnh","Phê duyệt theo hợp đồng"]].map(([name, limit, detail]) => <article key={name} className={cn(surface, "p-5")}><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-950">{name}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-500">Policy mẫu</span></div><p className="mt-4 text-lg font-bold text-blue-700">{limit}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>)}</section>
  </div>;
}

export function SystemManagementWorkspace({ view, tenants }: Props) {
  return view === "ai-usage" ? <AiUsageReport tenants={tenants} /> : <AiQuotaManagement tenants={tenants} />;
}
