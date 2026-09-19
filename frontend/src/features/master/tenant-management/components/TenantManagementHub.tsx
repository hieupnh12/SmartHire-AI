import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  AlertTriangle,
  ArchiveRestore,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ClipboardCopy,
  Database,
  Download,
  Gauge,
  Eye,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  Trash2,
  UserRoundCog,
  X,
} from "lucide-react";
import { masterAdminApi, type TenantInfo } from "@/api/master/masterAdminApi";
import { masterTenantApi, type OnboardTenantResponse } from "@/api/master/tenantApi";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";

export type TenantHubTab = "overview" | "directory" | "create" | "verification" | "provisioning";
type Props = {
  activeTab: TenantHubTab;
  onTabChange: (tab: TenantHubTab) => void;
  tenants: TenantInfo[];
  onTenantCreated: (tenant: OnboardTenantResponse) => void;
  onToggleStatus: (tenant: TenantInfo) => void;
  onRetryProvisioning: (tenant: TenantInfo) => void;
};

const schema = z.object({
  name: z.string().trim().min(1, "Nhập tên doanh nghiệp").max(255),
  code: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/, "Mã gồm 2–32 ký tự thường, số hoặc dấu gạch ngang"),
  subdomain: z.string().regex(/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/, "Subdomain gồm 3–63 ký tự hợp lệ"),
  adminName: z.string().trim().min(1, "Nhập họ tên admin").max(255),
  adminEmail: z.string().trim().email("Email không hợp lệ").max(255),
  adminPassword: z.string().min(12, "Mật khẩu cần ít nhất 12 ký tự").refine((value) => new TextEncoder().encode(value).length <= 72, "Mật khẩu tối đa 72 byte UTF-8"),
});
type FormValues = z.infer<typeof schema>;

const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.16)]";
const inputClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

function statusStyle(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "bg-rose-50 text-rose-700";
  if (status === "PROVISIONING") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function OverviewPanel({ tenants, onNavigate }: { tenants: TenantInfo[]; onNavigate: (tab: TenantHubTab) => void }) {
  const active = tenants.filter((tenant) => tenant.status === "ACTIVE").length;
  const provisioning = tenants.filter((tenant) => tenant.status === "PROVISIONING").length;
  const failed = tenants.filter((tenant) => tenant.status === "FAILED").length;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Tổng tenant", tenants.length, "Registry trong Master DB", Building2, "blue"],
      ["Đang hoạt động", active, "Database riêng đã sẵn sàng", CheckCircle2, "emerald"],
      ["Đang provisioning", provisioning, "Đang tạo DB hoặc chạy Flyway", CircleDashed, "amber"],
      ["Cần xử lý", failed, "Provisioning thất bại hoặc tạm ngưng", AlertTriangle, "rose"],
    ].map(([label,value,helper,Icon,tone]) => { const MetricIcon = Icon as typeof Building2; return <article key={String(label)} className={cn(cardClass, "p-5")}><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label as string}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value as number}</p></div><span className={cn("grid size-10 place-items-center rounded-xl", tone === "emerald" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700")}><MetricIcon className="size-5" /></span></div><p className="mt-4 text-xs text-slate-500">{helper as string}</p></article>; })}</div>
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><section className={cn(cardClass, "p-5")}><h2 className="font-semibold text-slate-950">Vòng đời tenant</h2><p className="mt-1 text-xs text-slate-500">Luồng cấp phát database-per-tenant hiện tại</p><div className="mt-6 grid gap-3 sm:grid-cols-4">{[["1","Đăng ký","Master registry"],["2","Provisioning","MySQL riêng"],["3","Migration","Flyway schema"],["4","Kích hoạt","Tenant Admin"]].map(([step,title,detail],index) => <div key={step} className="relative rounded-xl border border-slate-200 p-4"><span className="grid size-7 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">{step}</span><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-slate-500">{detail}</p>{index < 3 && <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-white text-slate-400 sm:block" />}</div>)}</div></section><section className={cn(cardClass, "p-5")}><h2 className="font-semibold text-slate-950">Thao tác nhanh</h2><div className="mt-4 space-y-3"><button type="button" onClick={() => onNavigate("create")} className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-blue-600 px-4 text-left text-white hover:bg-blue-700"><Plus className="size-5" /><span><strong className="block text-sm">Tạo tenant mới</strong><span className="text-xs text-blue-100">Đăng ký, tạo DB và admin đầu tiên</span></span></button><button type="button" onClick={() => onNavigate("directory")} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-200 px-4 text-left hover:bg-slate-50"><Database className="size-5 text-blue-600" /><span><strong className="block text-sm">Mở danh bạ</strong><span className="text-xs text-slate-500">Tìm kiếm và quản lý trạng thái tenant</span></span></button><button type="button" onClick={() => onNavigate("provisioning")} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-200 px-4 text-left hover:bg-slate-50"><ServerCog className="size-5 text-blue-600" /><span><strong className="block text-sm">Theo dõi provisioning</strong><span className="text-xs text-slate-500">Kiểm tra tenant chờ hoặc thất bại</span></span></button></div></section></div>
  </div>;
}

function DirectoryPanel({ tenants, onToggleStatus, onRetryProvisioning }: Pick<Props, "tenants" | "onToggleStatus" | "onRetryProvisioning">) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState<TenantInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const filtered = tenants.filter((tenant) => (status === "ALL" || tenant.status === status) && [tenant.name, tenant.code, tenant.subdomain].some((value) => value.toLowerCase().includes(search.toLowerCase())));
  const openDetail = async (tenant: TenantInfo) => {
    setDetailLoading(true);
    setSelected(tenant);
    try { setSelected(await masterAdminApi.getTenantById(tenant.id)); } catch { setSelected(tenant); } finally { setDetailLoading(false); }
  };
  return <div className="relative"><section className={cn(cardClass, "overflow-hidden")}><div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold text-slate-950">Danh bạ doanh nghiệp</h2><p className="mt-1 text-xs text-slate-500">Dữ liệu an toàn từ Master Tenant Registry</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, mã hoặc subdomain" className={cn(inputClass, "pl-9 sm:w-64")} /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className={cn(inputClass, "sm:w-40")}><option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Active</option><option value="PROVISIONING">Provisioning</option><option value="FAILED">Failed</option><option value="SUSPENDED">Suspended</option></select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Doanh nghiệp</th><th className="px-3 py-3">Subdomain</th><th className="px-3 py-3">Database</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Ngày tạo</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody>{filtered.map((tenant) => <tr key={tenant.id} className="border-t border-slate-100 hover:bg-blue-50/30"><td className="px-5 py-4"><strong className="block text-slate-900">{tenant.name}</strong><span className="text-xs text-slate-500">{tenant.code}</span></td><td className="px-3 py-4 font-mono text-xs">{tenant.subdomain}.smarthire.top</td><td className="px-3 py-4 font-mono text-xs text-slate-500">{tenant.dbName}</td><td className="px-3 py-4"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusStyle(tenant.status))}>{tenant.status}</span></td><td className="px-3 py-4 text-slate-500">{new Date(tenant.createdAt).toLocaleDateString("vi-VN")}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openDetail(tenant)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label={`Xem ${tenant.name}`}><Eye className="size-4" /></button>{tenant.status === "FAILED" || tenant.status === "PROVISIONING" ? <button type="button" onClick={() => onRetryProvisioning(tenant)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-amber-50 px-3 text-xs font-semibold text-amber-700"><RefreshCw className="size-3.5" />Retry</button> : <button type="button" onClick={() => onToggleStatus(tenant)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">{tenant.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt"}</button>}</div></td></tr>)}{filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Không tìm thấy tenant phù hợp.</td></tr>}</tbody></table></div></section>{selected && <><button type="button" className="fixed inset-0 z-40 bg-slate-950/20" onClick={() => setSelected(null)} aria-label="Đóng chi tiết tenant" /><aside role="dialog" aria-modal="true" aria-label={`Chi tiết ${selected.name}`} className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Tenant detail</p><h2 className="mt-1 text-xl font-bold">{selected.name}</h2></div><button type="button" onClick={() => setSelected(null)} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100" aria-label="Đóng"><X className="size-5" /></button></div>{detailLoading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-6 animate-spin text-blue-600" /></div> : <dl className="mt-7 space-y-4 text-sm">{[["Tenant ID",selected.id],["Mã doanh nghiệp",selected.code],["Subdomain",`${selected.subdomain}.smarthire.top`],["Database",selected.dbName],["Trạng thái",selected.status],["Ngày tạo",new Date(selected.createdAt).toLocaleString("vi-VN")]].map(([label,value]) => <div key={label as string} className="border-b border-slate-100 pb-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-all font-medium text-slate-900">{String(value)}</dd></div>)}</dl>}<div className="mt-6 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-900"><ShieldCheck className="mb-2 size-5 text-blue-700" />Chỉ hiển thị metadata an toàn. Credential và dữ liệu trong tenant database không được trả về.</div></aside></>}</div>;
}

function CreatePanel({ onTenantCreated, onNavigate }: { onTenantCreated: Props["onTenantCreated"]; onNavigate: (tab: TenantHubTab) => void }) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", code: "", subdomain: "", adminName: "", adminEmail: "", adminPassword: "" } });
  const mutation = useMutation({ mutationFn: masterTenantApi.onboardTenant, onSuccess: (tenant) => { form.reset(); onTenantCreated(tenant); } });
  const fields: Array<{ name: keyof FormValues; label: string; placeholder: string; type?: string; section: "tenant" | "admin" }> = [
    { name: "name", label: "Tên doanh nghiệp", placeholder: "Công ty Cổ phần TechCorp", section: "tenant" }, { name: "code", label: "Mã tenant", placeholder: "techcorp", section: "tenant" }, { name: "subdomain", label: "Subdomain", placeholder: "techcorp", section: "tenant" },
    { name: "adminName", label: "Họ tên admin đầu tiên", placeholder: "Nguyễn Văn Admin", section: "admin" }, { name: "adminEmail", label: "Email admin", placeholder: "admin@techcorp.vn", type: "email", section: "admin" }, { name: "adminPassword", label: "Mật khẩu khởi tạo", placeholder: "Tối thiểu 12 ký tự", type: "password", section: "admin" },
  ];
  if (mutation.isSuccess) return <section className={cn(cardClass, "mx-auto max-w-2xl p-8 text-center")}><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-7" /></span><h2 className="mt-4 text-xl font-bold">Tenant đã được kích hoạt</h2><p className="mt-2 text-sm text-slate-500"><strong>{mutation.data.name}</strong> đã có database riêng và tài khoản quản trị đầu tiên.</p><button type="button" onClick={() => { mutation.reset(); onNavigate("directory"); }} className="mt-6 min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white">Về danh bạ tenant</button></section>;
  return <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-5 xl:grid-cols-[1fr_360px]" noValidate><section className={cn(cardClass, "p-5 sm:p-6")}><div><h2 className="font-semibold text-slate-950">Tạo tenant doanh nghiệp</h2><p className="mt-1 text-xs text-slate-500">API sẽ đăng ký Master DB, tạo MySQL riêng, chạy Flyway và tạo TENANT_ADMIN.</p></div>{mutation.isError && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{getApiErrorMessage(mutation.error, "Không thể khởi tạo tenant.")}</p>}<fieldset disabled={mutation.isPending} className="mt-6 space-y-6 disabled:opacity-60"><div><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4 text-blue-600" />Thông tin doanh nghiệp</h3><div className="grid gap-4 sm:grid-cols-2">{fields.filter((field) => field.section === "tenant").map((field,index) => <FormField key={field.name} field={field} form={form} wide={index === 0} />)}</div></div><div className="border-t border-slate-100 pt-6"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><UserRoundCog className="size-4 text-blue-600" />Quản trị viên đầu tiên</h3><div className="grid gap-4 sm:grid-cols-2">{fields.filter((field) => field.section === "admin").map((field,index) => <FormField key={field.name} field={field} form={form} wide={index === 0} />)}</div></div><button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait">{mutation.isPending ? <><LoaderCircle className="size-4 animate-spin" />Đang provisioning…</> : <><Plus className="size-4" />Tạo tenant và database</>}</button></fieldset></section><aside className={cn(cardClass, "h-fit p-5")}><h2 className="text-sm font-semibold">Điều gì sẽ xảy ra?</h2><ol className="mt-4 space-y-4">{[["1","Kiểm tra code và subdomain không trùng"],["2","Ghi tenant ở trạng thái PROVISIONING"],["3","Tạo database/user riêng và chạy Flyway"],["4","Tạo TENANT_ADMIN, sau đó chuyển ACTIVE"]].map(([step,text]) => <li key={step} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{step}</span><span className="text-xs leading-5 text-slate-600">{text}</span></li>)}</ol><div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle className="mb-2 size-4" />Nếu provisioning lỗi, tenant được giữ ở trạng thái FAILED để retry; hệ thống không tự động xóa tài nguyên đã tạo một phần.</div></aside></form>;
}

function FormField({ field, form, wide }: { field: { name: keyof FormValues; label: string; placeholder: string; type?: string }; form: ReturnType<typeof useForm<FormValues>>; wide?: boolean }) {
  const error = form.formState.errors[field.name];
  return <div className={wide ? "sm:col-span-2" : undefined}><label htmlFor={`tenant-${field.name}`} className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</label><input id={`tenant-${field.name}`} type={field.type ?? "text"} placeholder={field.placeholder} {...form.register(field.name)} className={inputClass} aria-invalid={Boolean(error)} aria-describedby={error ? `tenant-${field.name}-error` : undefined} />{error && <p id={`tenant-${field.name}-error`} role="alert" className="mt-1 text-xs text-rose-700">{error.message}</p>}</div>;
}

function VerificationPanel() {
  const rows = [["GreenField Logistics","GCN đăng ký doanh nghiệp","Đang chờ","18/09/2026"],["Nova Retail Group","Giấy phép kinh doanh","Cần bổ sung","17/09/2026"],["MediCare Systems","MST và người đại diện","Đã xác thực","16/09/2026"]];
  return <section className={cn(cardClass, "overflow-hidden")}><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-semibold">Hàng đợi xác thực doanh nghiệp</h2><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">UI mẫu · chưa có API</span></div><p className="mt-1 text-xs text-slate-500">Chuẩn bị giao diện cho quy trình thẩm định hồ sơ pháp lý.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Doanh nghiệp</th><th className="px-3 py-3">Hồ sơ</th><th className="px-3 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Ngày gửi</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{row[0]}</td><td className="px-3 py-4 text-slate-600">{row[1]}</td><td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{row[2]}</span></td><td className="px-5 py-4 text-right text-slate-500">{row[3]}</td></tr>)}</tbody></table></div></section>;
}

function ProvisioningPanel({ tenants, onRetryProvisioning }: Pick<Props, "tenants" | "onRetryProvisioning">) {
  const relevant = tenants.filter((tenant) => tenant.status === "PROVISIONING" || tenant.status === "FAILED");
  const sample = relevant[0];
  const stages = ["Validate code & subdomain", "Ghi Master DB", "Tạo database & quyền", "Chạy Flyway migrations", "Tạo tenant admin", "Áp dụng plan, quota & pipeline"];
  return <div className="grid gap-5 xl:grid-cols-[1fr_380px]"><section className={cn(cardClass, "overflow-hidden")}><div className="border-b border-slate-100 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Provisioning monitor</h2><p className="mt-1 text-xs text-slate-500">Theo dõi saga idempotent; retry tiếp tục từ bước an toàn gần nhất.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Zero-secret logging</span></div></div><div className="divide-y divide-slate-100">{relevant.map((tenant) => <div key={tenant.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tenant.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{tenant.status === "FAILED" ? <AlertTriangle className="size-5" /> : <LoaderCircle className="size-5 animate-spin" />}</span><div className="flex-1"><h3 className="text-sm font-semibold">{tenant.name}</h3><p className="mt-1 text-xs text-slate-500">{tenant.dbName} · {tenant.status === "FAILED" ? "Tài nguyên một phần được giữ để recovery" : "Đang cấp phát tài nguyên riêng"}</p></div><button type="button" onClick={() => onRetryProvisioning(tenant)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white"><RefreshCw className="size-3.5" />{tenant.status === "FAILED" ? "Retry an toàn" : "Mở chi tiết"}</button></div>)}{relevant.length === 0 && <div className="px-5 py-8 text-center"><CheckCircle2 className="mx-auto size-8 text-emerald-600" /><p className="mt-3 text-sm font-semibold">Không có provisioning cần xử lý</p><p className="mt-1 text-xs text-slate-500">Tất cả tenant trong registry đang ở trạng thái ổn định.</p></div>}</div><div className="border-t border-slate-100 p-5"><h3 className="text-sm font-semibold">Pipeline cấp phát chuẩn</h3><ol className="mt-4 grid gap-3 sm:grid-cols-2">{stages.map((stage,index) => <li key={stage} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold", index < 2 ? "bg-emerald-100 text-emerald-700" : index === 2 && sample ? "bg-amber-100 text-amber-700" : "bg-white text-slate-500")}>{index + 1}</span><span className="text-xs font-medium text-slate-700">{stage}</span></li>)}</ol></div></section><aside className={cn(cardClass, "h-fit p-5")}><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-blue-600" /><h2 className="font-semibold">Recovery guardrails</h2></div><div className="mt-4 space-y-3 text-xs leading-5 text-slate-600"><p className="rounded-xl bg-blue-50 p-3"><strong className="block text-blue-900">Idempotency key</strong>Mỗi lần retry dùng tenant ID và checkpoint; không tạo trùng database, user hoặc admin.</p><p className="rounded-xl bg-amber-50 p-3"><strong className="block text-amber-900">Rollback có kiểm soát</strong>Không tự động xóa dữ liệu đã tạo một phần. Super Admin chọn retry hoặc recovery sau khi kiểm tra.</p><p className="rounded-xl bg-slate-50 p-3"><strong className="block text-slate-900">Audit an toàn</strong>Log chỉ chứa stage, mã lỗi và correlation ID; password/connection secret luôn bị loại bỏ.</p></div></aside></div>;
}

function SagaRecoveryConsole({ tenants }: Pick<Props, "tenants">) {
  const target = tenants.find((tenant) => tenant.status === "FAILED" || tenant.status === "PROVISIONING") ?? tenants[0];
  const tenantCode = target?.code ?? "sample-tenant";
  const lines = [
    "[ZERO-LOG POLICY ACTIVE] Credentials, JWT tokens and DB passwords are masked.",
    `[14:22:01.002] INFO TenantProvisioningService: initializing recovery for ${tenantCode}`,
    `[14:22:01.094] ACQUIRED: pg_advisory_lock for tenant ${target?.id ?? "sample"}`,
    "[14:22:01.120] CHECKPOINT 1: identifier validation · PASSED",
    "[14:22:01.144] CHECKPOINT 2: Master tenant registry · PASSED",
    `[14:22:01.180] CHECKPOINT 3: database ${target?.dbName ?? "smarthire_tenant_sample"} · PASSED`,
    "[14:22:01.215] CHECKPOINT 4: Flyway tenant migrations · WAITING",
  ];
  const content = lines.join("\n");
  const copyLogs = () => void navigator.clipboard?.writeText(content);
  const downloadLogs = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ source: "ui-sample", tenant: tenantCode, lines }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `provisioning-${tenantCode}-sample.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <section className={cn(cardClass, "p-5")}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><TerminalSquare className="size-5" /></span><div><h2 className="font-semibold">Live Saga Recovery Console</h2><p className="mt-1 text-xs text-slate-500">Bản xem trước checkpoint provisioning; chưa kết nối API stream log.</p></div></div><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-blue-600"/><span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Sample stream</span></div></div><pre className="mt-5 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-200">{content}</pre><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">Buffer: 4096 lines · ANSI UTF-8 · dữ liệu minh họa</span><div className="flex gap-2"><button type="button" onClick={copyLogs} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ClipboardCopy className="size-3.5"/>Copy logs</button><button type="button" onClick={downloadLogs} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="size-3.5"/>Download JSON</button></div></div></section>;
}

function ResourcesPanel({ tenants }: Pick<Props, "tenants">) {
  const active = tenants.filter((tenant) => tenant.status === "ACTIVE");
  return <div className="space-y-5"><section className={cn(cardClass, "p-5")}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Database health & datasource pools</h2><p className="mt-1 text-xs text-slate-500">UI vận hành cho health check và làm mới HikariCP; endpoint backend chưa được khai báo.</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700">UI mẫu · chưa có API</span></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{active.slice(0,3).map((tenant,index) => <article key={tenant.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Gauge className="size-4" /></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Healthy</span></div><h3 className="mt-3 text-sm font-semibold">{tenant.name}</h3><p className="mt-1 truncate font-mono text-xs text-slate-500">{tenant.dbName}</p><dl className="mt-4 grid grid-cols-3 gap-2 text-center"><div><dt className="text-[10px] text-slate-500">Latency</dt><dd className="text-xs font-semibold">{8 + index * 3} ms</dd></div><div><dt className="text-[10px] text-slate-500">Active</dt><dd className="text-xs font-semibold">{4 + index}/20</dd></div><div><dt className="text-[10px] text-slate-500">Queued</dt><dd className="text-xs font-semibold">0</dd></div></dl><div className="mt-4 flex gap-2"><button type="button" disabled className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-400"><Gauge className="size-3.5" />Health check</button><button type="button" disabled className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-400"><RotateCw className="size-3.5" />Rotate pool</button></div></article>)}{active.length === 0 && <p className="col-span-full py-8 text-center text-sm text-slate-500">Chưa có tenant ACTIVE để hiển thị.</p>}</div></section><section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Default plan, quota & recruitment blueprint</h2><p className="mt-1 text-xs text-slate-500">Cấu hình được áp dụng sau Flyway và trước khi chuyển tenant sang ACTIVE.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Default plan" value="Enterprise Pro" helper="Có thể đổi trong quản lý gói"/><Metric label="AI screening" value="10,000 / tháng" helper="Quota mặc định"/><Metric label="Recruiter seats" value="50" helper="SSO/SAML enabled"/></div><div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-4 text-xs font-medium text-slate-700">{["Applied","CV Screen (AI)","Shortlist","Assessment","AI Interview","Offer"].map((stage,index) => <span key={stage} className="contents"><span className={cn("rounded-lg px-3 py-2", index === 5 ? "bg-blue-600 text-white" : "bg-white")}>{stage}</span>{index < 5 && <ChevronRight className="size-4 text-slate-400" />}</span>)}</div></section></div>;
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div>; }

function RecoveryPanel() {
  return <div className="grid gap-5 lg:grid-cols-2"><section className={cn(cardClass, "p-5")}><div className="flex items-center gap-2"><ArchiveRestore className="size-5 text-blue-600"/><h2 className="font-semibold">Backup & restore policy</h2></div><p className="mt-1 text-xs text-slate-500">UI mẫu cho chính sách vòng đời dữ liệu; chưa có API backup/restore.</p><div className="mt-5 space-y-3"><Policy title="Automated backup" value="Daily · 02:00 UTC" detail="Point-in-time recovery trong 7 ngày"/><Policy title="Retention" value="30 ngày" detail="Bản sao mã hóa, tách khỏi tenant database"/><Policy title="Restore workflow" value="Approval required" detail="Restore vào database tạm, health check rồi mới cutover"/></div><button type="button" disabled className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-400"><ArchiveRestore className="size-4"/>Tạo restore request</button></section><section className={cn(cardClass, "border-rose-200 p-5")}><div className="flex items-center gap-2 text-rose-700"><Trash2 className="size-5"/><h2 className="font-semibold">Tenant deletion policy</h2></div><p className="mt-1 text-xs text-slate-500">Không xóa trực tiếp. Quy trình bắt buộc suspend, backup cuối và thời gian chờ.</p><ol className="mt-5 space-y-3 text-sm text-slate-700">{["Suspend tenant và revoke phiên truy cập mới","Tạo final backup, kiểm tra khả năng restore","Chờ 30 ngày theo retention policy","Phê duyệt hai người và ghi audit trail","Xóa database/user, đóng pool rồi ẩn danh metadata"].map((item,index) => <li key={item} className="flex gap-3 rounded-xl bg-rose-50/60 p-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-rose-700">{index + 1}</span><span>{item}</span></li>)}</ol><button type="button" disabled className="mt-5 min-h-10 rounded-xl bg-rose-50 px-4 text-sm font-semibold text-rose-300">Yêu cầu xóa tenant</button><p className="mt-2 text-xs text-slate-500">Nút bị khóa cho đến khi backend có approval workflow và retention enforcement.</p></section></div>;
}

function Policy({ title, value, detail }: { title: string; value: string; detail: string }) { return <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className="shrink-0 text-xs font-semibold text-blue-700">{value}</span></div>; }

export function TenantManagementHub(props: Props) {
  const panels: Record<TenantHubTab, React.ReactNode> = {
    overview: <OverviewPanel tenants={props.tenants} onNavigate={props.onTabChange} />,
    directory: <DirectoryPanel tenants={props.tenants} onToggleStatus={props.onToggleStatus} onRetryProvisioning={props.onRetryProvisioning} />,
    create: <CreatePanel onTenantCreated={props.onTenantCreated} onNavigate={props.onTabChange} />,
    verification: <VerificationPanel />,
    provisioning: <div className="space-y-5"><ProvisioningPanel tenants={props.tenants} onRetryProvisioning={props.onRetryProvisioning} /><SagaRecoveryConsole tenants={props.tenants} /><ResourcesPanel tenants={props.tenants} /><RecoveryPanel /></div>,
  };
  return <div className="space-y-5 animate-fade-in"><header><p className="text-sm font-semibold text-blue-600">Tenant management</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Cụm quản lý doanh nghiệp</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Quản lý toàn bộ vòng đời tenant từ đăng ký, cấp phát database riêng, xác thực đến vận hành.</p></header><div>{panels[props.activeTab]}</div></div>;
}
