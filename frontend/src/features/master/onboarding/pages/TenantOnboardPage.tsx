import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { masterTenantApi } from "@/api/master/tenantApi";
import { getApiErrorMessage } from "@/lib/axios";
import { ArrowLeft, CheckCircle2, Building2, ShieldCheck, Database, Loader2, Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { useT, type TranslateFn } from "@/i18n";

function createAdminSchema(t: TranslateFn) {
  return z.object({
    adminName: z.string().trim().min(1, t("master.commerce.tenantOnboard.validation.adminNameRequired")).max(255),
    adminEmail: z.string().trim().email(t("master.commerce.tenantOnboard.validation.adminEmailInvalid")).max(255),
  });
}

function createSchema(t: TranslateFn) {
  return createAdminSchema(t).extend({
    code: z.string()
      .regex(/^[a-z][a-z0-9-]{1,31}$/, t("master.commerce.tenantOnboard.validation.codePattern")),
    name: z.string().trim().min(1, t("master.commerce.tenantOnboard.validation.nameRequired")).max(255),
    subdomain: z.string()
      .regex(/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/, t("master.commerce.tenantOnboard.validation.subdomainPattern")),
    environmentType: z.enum(["PRODUCTION", "POC_SANDBOX"]).default("PRODUCTION"),
  });
}

type FormValues = z.infer<ReturnType<typeof createSchema>>;

export function TenantOnboardPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const retryId = Number(params.get("retry"));
  const retry = Number.isSafeInteger(retryId) && retryId > 0;

  const adminSchema = useMemo(() => createAdminSchema(t), [t]);
  const schema = useMemo(() => createSchema(t), [t]);

  const initialName = params.get("name") || "";
  const initialEmail = params.get("email") || "";
  const initialAdminName = params.get("adminName") || "";
  const initialEnv = (params.get("env") as "PRODUCTION" | "POC_SANDBOX") || "PRODUCTION";
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
      environmentType: initialEnv,
      adminName: initialAdminName,
      adminEmail: initialEmail,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      retry ? masterTenantApi.retry(retryId, values) : masterTenantApi.onboardTenant(values),
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
            <span>{t("master.commerce.tenantOnboard.backToLandlord")}</span>
          </button>
          <LanguageSwitcher />
        </div>

        {/* Main Card */}
        <section className="rounded-[20px] border border-[#e2e8f0] bg-white p-6 shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] sm:p-10">
          {/* Header */}
          <div className="mb-8 border-b border-[#f1f5f9] pb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">
              <Building2 className="h-3.5 w-3.5" />
              <span>{t("master.commerce.tenantOnboard.badge")}</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0f172a] sm:text-3xl">
              {retry ? t("master.commerce.tenantOnboard.titleRetry") : t("master.commerce.tenantOnboard.titleCreate")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
              {retry
                ? t("master.commerce.tenantOnboard.subtitleRetry")
                : t("master.commerce.tenantOnboard.subtitleCreate")}
            </p>
          </div>

          {mutation.isSuccess ? (
            <div role="status" className="space-y-6 text-center py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-[#0f172a]">
                  {t("master.commerce.tenantOnboard.successTitle")}
                </h2>
                <p className="text-sm text-[#475569]">
                  {t("master.commerce.tenantOnboard.successDescBefore")}
                  <strong>{mutation.data.name}</strong>
                  {t("master.commerce.tenantOnboard.successDescAfter")}
                </p>
              </div>

              <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-4 text-left font-mono text-xs space-y-2 text-[#334155]">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">{t("master.commerce.tenantOnboard.codeLabel")}</span>
                  <span className="font-bold text-[#0f172a]">{mutation.data.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">{t("master.commerce.tenantOnboard.subdomainLabel")}</span>
                  <span className="font-bold text-[#2563eb]">{mutation.data.subdomain}.smarthire.top</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">{t("master.commerce.tenantOnboard.dedicatedDbLabel")}</span>
                  <span className="font-bold text-[#059669]">{mutation.data.dbName || `smarthire_tenant_${mutation.data.code}`}</span>
                </div>
                {mutation.data.activationUrl && (
                  <div className="pt-2 border-t border-[#e2e8f0] space-y-1">
                    <span className="block text-[#64748b] font-sans">{t("master.commerce.tenantOnboard.activationLinkLabel")}</span>
                    <a
                      href={mutation.data.activationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-[#2563eb] underline hover:text-[#1d4ed8]"
                    >
                      {mutation.data.activationUrl}
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/admin/dashboard")}
                  className="rounded-[10px] bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#1e293b]"
                >
                  {t("master.commerce.tenantOnboard.backToListBtn")}
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
                  <strong>{t("master.commerce.tenantOnboard.errorPrefix")}</strong>{" "}
                  {getApiErrorMessage(mutation.error, t("master.commerce.tenantOnboard.errorFallback"))}
                  <p className="mt-1 text-red-600">
                    {t("master.commerce.tenantOnboard.errorHint")}
                  </p>
                </div>
              )}

              <fieldset disabled={mutation.isPending} className="space-y-5 disabled:opacity-60">
                {!retry && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                        <Building2 className="h-4 w-4 text-[#3b82f6]" />
                        <span>{t("master.commerce.tenantOnboard.companySection")}</span>
                      </div>

                      {/* Name */}
                      <div>
                        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                          {t("master.commerce.tenantOnboard.companyNameLabel")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          placeholder={t("master.commerce.tenantOnboard.companyNamePlaceholder")}
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
                          {t("master.commerce.tenantOnboard.companyCodeLabel")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="code"
                          type="text"
                          placeholder={t("master.commerce.tenantOnboard.companyCodePlaceholder")}
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
                          {t("master.commerce.tenantOnboard.subdomainFieldLabel")} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="subdomain"
                            type="text"
                            placeholder={t("master.commerce.tenantOnboard.subdomainPlaceholder")}
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

                    {/* Environment Type (Production vs POC Sandbox) */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                        {t("master.commerce.tenantOnboard.envTypeLabel")} <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`flex items-center gap-2.5 p-3 rounded-[10px] border cursor-pointer transition-all ${
                            form.watch("environmentType") === "PRODUCTION"
                              ? "border-blue-600 bg-blue-50/50 text-blue-950 font-semibold"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            value="PRODUCTION"
                            {...form.register("environmentType")}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-xs">{t("master.commerce.tenantOnboard.envProductionTitle")}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{t("master.commerce.tenantOnboard.envProductionDesc")}</div>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-2.5 p-3 rounded-[10px] border cursor-pointer transition-all ${
                            form.watch("environmentType") === "POC_SANDBOX"
                              ? "border-amber-600 bg-amber-50/50 text-amber-950 font-semibold"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            value="POC_SANDBOX"
                            {...form.register("environmentType")}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <div className="text-xs">{t("master.commerce.tenantOnboard.envSandboxTitle")}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{t("master.commerce.tenantOnboard.envSandboxDesc")}</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[10px] bg-slate-50 border border-slate-200 p-3 text-xs text-[#64748b] flex items-center gap-2">
                      <Database className="h-4 w-4 text-[#3b82f6] shrink-0" />
                      <span>{t("master.commerce.tenantOnboard.autoDbHint")} <code className="font-mono text-[#0f172a]">smarthire_tenant_{form.watch("code") || "..."}</code></span>
                    </div>
                  </>
                )}

                <div className="pt-3 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569] uppercase tracking-wider mb-4">
                    <ShieldCheck className="h-4 w-4 text-[#059669]" />
                    <span>{t("master.commerce.tenantOnboard.adminSection")}</span>
                  </div>

                  <div className="space-y-4">
                    {/* Admin Name */}
                    <div>
                      <label htmlFor="adminName" className="mb-1.5 block text-sm font-semibold text-[#1e293b]">
                        {t("master.commerce.tenantOnboard.adminNameLabel")} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="adminName"
                        type="text"
                        placeholder={t("master.commerce.tenantOnboard.adminNamePlaceholder")}
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
                        {t("master.commerce.tenantOnboard.adminEmailLabel")} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="adminEmail"
                        type="email"
                        placeholder={t("master.commerce.tenantOnboard.adminEmailPlaceholder")}
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

                    <div className="rounded-[10px] border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs leading-relaxed text-emerald-900">
                      <strong className="block font-semibold text-emerald-800 mb-0.5">
                        {t("master.commerce.tenantOnboard.inviteClaimTitle")}
                      </strong>
                      {t("master.commerce.tenantOnboard.inviteClaimDesc")}
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
                      <span>{t("master.commerce.tenantOnboard.submittingBtn")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{retry ? t("master.commerce.tenantOnboard.submitRetryBtn") : t("master.commerce.tenantOnboard.submitCreateBtn")}</span>
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

