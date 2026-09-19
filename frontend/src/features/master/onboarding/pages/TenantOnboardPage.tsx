import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { masterTenantApi } from "@/api/master/tenantApi";
import { getApiErrorMessage } from "@/lib/axios";
import { ArrowLeft, CheckCircle2, Building2, ShieldCheck, Database, Loader2, Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";

const adminSchema = z.object({
  adminName: z.string().trim().min(1, "Vui lòng nhập họ tên quản trị viên").max(255),
  adminEmail: z.string().trim().email("Email không đúng định dạng").max(255),
  adminPassword: z.string()
    .min(12, "Mật khẩu quản trị cần ít nhất 12 ký tự")
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Mật khẩu tối đa 72 byte UTF-8"),
});

const schema = adminSchema.extend({
  code: z.string()
    .regex(/^[a-z][a-z0-9-]{1,31}$/, "Mã gồm 2-32 ký tự thường, số hoặc gạch ngang; bắt đầu bằng chữ cái (ví dụ: se36, fpt)"),
  name: z.string().trim().min(1, "Vui lòng nhập tên doanh nghiệp").max(255),
  subdomain: z.string()
    .regex(/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/, "Subdomain gồm 3-63 ký tự chữ thường và số (ví dụ: se36, acme)"),
});

type FormValues = z.infer<typeof schema>;

export function TenantOnboardPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const retryId = Number(params.get("retry"));
  const retry = Number.isSafeInteger(retryId) && retryId > 0;

  const initialName = params.get("name") || "";
  const initialEmail = params.get("email") || "";
  const initialAdminName = params.get("adminName") || "";
  const initialCode = initialName
    ? initialName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 30)
    : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(retry ? adminSchema : schema),
    defaultValues: {
      code: initialCode,
      name: initialName,
      subdomain: initialCode,
      adminName: initialAdminName,
      adminEmail: initialEmail,
      adminPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      retry ? masterTenantApi.retry(retryId, values) : masterTenantApi.onboardTenant(values),
    onSuccess: () => form.resetField("adminPassword"),
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    form.setValue("name", val);
    if (!retry) {
      // Auto-suggest code and subdomain from company name if empty
      const generatedCode = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 30);

      if (!form.getValues("code") || form.getFieldState("code").isDirty === false) {
        form.setValue("code", generatedCode, { shouldValidate: true });
      }
      if (!form.getValues("subdomain") || form.getFieldState("subdomain").isDirty === false) {
        form.setValue("subdomain", generatedCode, { shouldValidate: true });
      }
    }
  };

  const inputClass =
    "w-full rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8] transition-all focus:border-[#3b82f6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] px-4 py-8 text-[#1e293b] sm:px-6 lg:py-12 selection:bg-teal-600 selection:text-white">
      <div className="mx-auto max-w-2xl">
        {/* Top bar navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="inline-flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-sm font-medium text-[#64748b] transition-colors hover:bg-white hover:text-[#1e293b] hover:shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Quay lại Quản trị Landlord</span>
          </button>
          <LanguageSwitcher />
        </div>

        {/* Main Card */}
        <section className="rounded-[20px] border border-[#e2e8f0] bg-white p-6 shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] sm:p-10">
          {/* Header */}
          <div className="mb-8 border-b border-[#f1f5f9] pb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">
              <Building2 className="h-3.5 w-3.5" />
              <span>Multi-Tenant Provisioning Engine</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0f172a] sm:text-3xl">
              {retry ? "Thử lại khởi tạo doanh nghiệp" : "Khởi tạo Doanh nghiệp Mới"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
              {retry
                ? "Nhập lại thông tin tài khoản Quản trị viên để tiếp tục tiến trình khởi tạo Database riêng biệt."
                : "Hệ thống sẽ tự động cấp phát Database MySQL riêng biệt (Separate Database) và phân quyền Quản trị viên cho Workspace của doanh nghiệp."}
            </p>
          </div>

          {mutation.isSuccess ? (
            <div role="status" className="space-y-6 text-center py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-[#0f172a]">
                  Khởi tạo Doanh nghiệp Thành công!
                </h2>
                <p className="text-sm text-[#475569]">
                  Doanh nghiệp <strong>{mutation.data.name}</strong> đã được tạo và kích hoạt Database riêng biệt.
                </p>
              </div>

              <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-4 text-left font-mono text-xs space-y-2 text-[#334155]">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Mã định danh (Code):</span>
                  <span className="font-bold text-[#0f172a]">{mutation.data.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Subdomain Workspace:</span>
                  <span className="font-bold text-[#2563eb]">{mutation.data.subdomain}.smarthire.top</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Database riêng:</span>
                  <span className="font-bold text-[#059669]">{mutation.data.dbName || `smarthire_tenant_${mutation.data.code}`}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/admin/dashboard")}
                  className="rounded-[10px] bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#1e293b]"
                >
                  Về danh sách Doanh nghiệp
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-6" noValidate>
              {mutation.isError && (
                <div
                  role="alert"
                  className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 leading-relaxed"
                >
                  <strong>Lỗi khởi tạo:</strong> {getApiErrorMessage(mutation.error, "Không thể khởi tạo doanh nghiệp.")}
                  <p className="mt-1 text-red-600">
                    Vui lòng kiểm tra lại mã code/subdomain (không trùng lặp) và đảm bảo máy chủ Database khả dụng.
                  </p>
                </div>
              )}

              <fieldset disabled={mutation.isPending} className="space-y-5 disabled:opacity-60">
                {!retry && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                        <Building2 className="h-4 w-4 text-[#3b82f6]" />
                        <span>Thông tin Doanh nghiệp</span>
                      </div>

                      {/* Name */}
                      <div>
                        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                          Tên Doanh nghiệp <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          placeholder="Ví dụ: FPT Software, VNG Corporation"
                          {...form.register("name")}
                          onChange={handleNameChange}
                          className={inputClass}
                          aria-invalid={Boolean(form.formState.errors.name)}
                        />
                        {form.formState.errors.name && (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Code */}
                      <div>
                        <label htmlFor="code" className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                          Mã Doanh nghiệp (Code) <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="code"
                          type="text"
                          placeholder="ví dụ: se36, fpt"
                          {...form.register("code")}
                          className={`${inputClass} font-mono`}
                          aria-invalid={Boolean(form.formState.errors.code)}
                        />
                        {form.formState.errors.code && (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            {form.formState.errors.code.message}
                          </p>
                        )}
                      </div>

                      {/* Subdomain */}
                      <div>
                        <label htmlFor="subdomain" className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                          Subdomain Workspace <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="subdomain"
                            type="text"
                            placeholder="ví dụ: se36"
                            {...form.register("subdomain")}
                            className={`${inputClass} font-mono pr-28`}
                            aria-invalid={Boolean(form.formState.errors.subdomain)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#94a3b8] pointer-events-none">
                            .smarthire.top
                          </span>
                        </div>
                        {form.formState.errors.subdomain && (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            {form.formState.errors.subdomain.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[10px] bg-slate-50 border border-slate-200 p-3 text-xs text-[#64748b] flex items-center gap-2">
                      <Database className="h-4 w-4 text-[#3b82f6] shrink-0" />
                      <span>Database riêng sẽ được tạo tự động: <code className="font-mono text-[#0f172a]">smarthire_tenant_{form.watch("code") || "..."}</code></span>
                    </div>
                  </>
                )}

                <div className="pt-3 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569] uppercase tracking-wider mb-4">
                    <ShieldCheck className="h-4 w-4 text-[#059669]" />
                    <span>Tài khoản Quản trị viên (Tenant Admin)</span>
                  </div>

                  <div className="space-y-4">
                    {/* Admin Name */}
                    <div>
                      <label htmlFor="adminName" className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                        Họ tên Quản trị viên <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="adminName"
                        type="text"
                        placeholder="Ví dụ: Nguyễn Văn Quản Trị"
                        autoComplete="name"
                        {...form.register("adminName")}
                        className={inputClass}
                        aria-invalid={Boolean(form.formState.errors.adminName)}
                      />
                      {form.formState.errors.adminName && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {form.formState.errors.adminName.message}
                        </p>
                      )}
                    </div>

                    {/* Admin Email */}
                    <div>
                      <label htmlFor="adminEmail" className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                        Email Quản trị viên <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="adminEmail"
                        type="email"
                        placeholder="admin@ten-doanh-nghiep.com"
                        autoComplete="email"
                        {...form.register("adminEmail")}
                        className={`${inputClass} font-mono`}
                        aria-invalid={Boolean(form.formState.errors.adminEmail)}
                      />
                      {form.formState.errors.adminEmail && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {form.formState.errors.adminEmail.message}
                        </p>
                      )}
                    </div>

                    {/* Admin Password */}
                    <div>
                      <label htmlFor="adminPassword" className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                        Mật khẩu Quản trị viên (Tối thiểu 12 ký tự) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="adminPassword"
                        type="password"
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        {...form.register("adminPassword")}
                        className={`${inputClass} font-mono`}
                        aria-invalid={Boolean(form.formState.errors.adminPassword)}
                      />
                      {form.formState.errors.adminPassword && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {form.formState.errors.adminPassword.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#3b82f6] px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-[#2563eb] focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Đang cấp phát Database & chạy Migration...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{retry ? "Thử lại cấp phát" : "Khởi tạo Doanh nghiệp & Cấp phát Database"}</span>
                    </>
                  )}
                </button>
              </fieldset>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

