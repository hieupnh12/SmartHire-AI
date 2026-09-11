import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { masterTenantApi } from "@/api/master/tenantApi";
import { getApiErrorMessage } from "@/lib/axios";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const adminSchema = z.object({
  adminName: z.string().trim().min(1, "Nh?p h? t?n admin").max(255),
  adminEmail: z.string().trim().email("Email kh?ng h?p l?").max(255),
  adminPassword: z.string().min(12, "M?t kh?u c?n ?t nh?t 12 k? t?")
    .refine((value) => new TextEncoder().encode(value).length <= 72, "M?t kh?u t?i ?a 72 byte UTF-8"),
});
const schema = adminSchema.extend({
  code: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/, "M? g?m 2?32 k? t? th??ng, s? ho?c d?u g?ch ngang; b?t ??u b?ng ch?"),
  name: z.string().trim().min(1, "Nh?p t?n doanh nghi?p").max(255),
  subdomain: z.string().regex(/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/, "Subdomain g?m 3?63 k? t?; b?t ??u b?ng ch?, k?t th?c b?ng ch? ho?c s?"),
});
type FormValues = z.infer<typeof schema>;

export function TenantOnboardPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const retryId = Number(params.get("retry"));
  const retry = Number.isSafeInteger(retryId) && retryId > 0;
  const form = useForm<FormValues>({
    resolver: zodResolver(retry ? adminSchema : schema),
    defaultValues: { code: "", name: "", subdomain: "", adminName: "", adminEmail: "", adminPassword: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => retry
      ? masterTenantApi.retry(retryId, values)
      : masterTenantApi.onboardTenant(values),
    onSuccess: () => form.resetField("adminPassword"),
  });
  const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 py-2 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]";
  const fields: { name: keyof FormValues; label: string; type: string; autoComplete?: string }[] = [
    ...(!retry ? [
      { name: "name" as const, label: "T?n doanh nghi?p", type: "text" },
      { name: "code" as const, label: "M? doanh nghi?p", type: "text" },
      { name: "subdomain" as const, label: "Subdomain", type: "text" },
    ] : []),
    { name: "adminName", label: "H? t?n admin doanh nghi?p", type: "text", autoComplete: "name" },
    { name: "adminEmail", label: "Email admin", type: "email", autoComplete: "email" },
    { name: "adminPassword", label: "M?t kh?u admin (?t nh?t 12 k? t?)", type: "password", autoComplete: "new-password" },
  ];
  return (
    <main className="min-h-screen bg-[var(--color-surface-page)] px-6 py-10 text-[var(--color-text-primary)]">
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate("/admin/dashboard")} className="mb-6 flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay l?i qu?n tr?
        </button>
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6">
          <h1 className="mb-2 text-2xl font-bold">{retry ? "Th? l?i kh?i t?o doanh nghi?p" : "T?o doanh nghi?p"}</h1>
          <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
            {retry ? "Nh?p l?i th?ng tin admin ?? d?ng ? l?n t?o tr??c. T?i kho?n ?? t?o s? ???c gi? nguy?n."
              : "T?o kh?ng gian ri?ng v? t?i kho?n qu?n tr? cho doanh nghi?p."}
          </p>
          {mutation.isSuccess ? (
            <div role="status" className="space-y-4">
              <CheckCircle2 className="h-8 w-8 text-[var(--color-status-success)]" aria-hidden="true" />
              <p>Doanh nghi?p <strong>{mutation.data.name}</strong> ?? ???c k?ch ho?t.</p>
              <p>M? ??ng nh?p: <strong>{mutation.data.code}</strong></p>
              <button className={inputClass} onClick={() => navigate("/admin/dashboard")}>V? danh s?ch doanh nghi?p</button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4" noValidate>
              {mutation.isError && <p role="alert" className="text-sm text-[var(--color-status-danger)]">
                {getApiErrorMessage(mutation.error, "Kh?ng th? kh?i t?o doanh nghi?p.")}
                {" "}N?u y?u c?u b? gi?n ?o?n, ki?m tra tr?ng th?i trong danh s?ch doanh nghi?p tr??c khi th? l?i.
              </p>}
              <fieldset disabled={mutation.isPending} className="space-y-4 disabled:opacity-60">
                {fields.map((field) => (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="mb-1 block text-sm font-semibold">{field.label}</label>
                    <input id={field.name} type={field.type} autoComplete={field.autoComplete}
                      {...form.register(field.name)} className={inputClass}
                      aria-invalid={Boolean(form.formState.errors[field.name])}
                      aria-describedby={form.formState.errors[field.name] ? `${field.name}-error` : undefined} />
                    {form.formState.errors[field.name] && (
                      <p id={`${field.name}-error`} role="alert" className="mt-1 text-sm text-[var(--color-status-danger)]">
                        {form.formState.errors[field.name]?.message}
                      </p>
                    )}
                  </div>
                ))}
                <button type="submit" className="w-full rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-4 py-3 font-semibold text-white">
                  {mutation.isPending ? "?ang kh?i t?o?" : retry ? "Th? l?i" : "T?o doanh nghi?p"}
                </button>
              </fieldset>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
