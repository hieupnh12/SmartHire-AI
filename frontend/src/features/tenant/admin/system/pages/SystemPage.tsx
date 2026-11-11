import { useQuery } from "@tanstack/react-query";
import { authApi, jobApi, dashboardApi } from "@/api";
import { getApiErrorMessage } from "@/lib/axios";
import { CompanyEmailSettingsCard } from "@/features/tenant/admin/company/components/CompanyEmailSettingsCard";
import { Card } from "@/components/ux/Card";
import { useT } from "@/i18n";
import { Activity } from "lucide-react";

export function SystemPage() {
  const t = useT();
  const health = useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: async () => {
      const rows = await Promise.all([
        authApi.health().then((d) => ({ name: "auth", ok: d.success, detail: d.data })),
        jobApi.health().then((d) => ({ name: "jobs", ok: d.success, detail: d.data })),
        dashboardApi.health().then((d) => ({ name: "dashboard", ok: d.success, detail: d.data })),
      ]);
      return rows;
    },
    retry: false,
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
          {t("tenantAdmin.system.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {t("tenantAdmin.system.subtitle")}
        </p>
      </div>

      {/* Main Feature: Gmail Configuration */}
      <CompanyEmailSettingsCard />

      {/* System Health Section */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <Activity className="size-4 text-brand-primary" />
          <span>{t("tenantAdmin.system.infraTitle")}</span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {t("tenantAdmin.system.infraDesc")}
        </p>
        {health.isError && (
          <p className="text-status-danger text-xs">{getApiErrorMessage(health.error)}</p>
        )}
        {health.data && (
          <ul className="grid gap-2 sm:grid-cols-3 text-xs">
            {health.data.map((row) => (
              <li
                key={row.name}
                className="rounded-lg border border-[var(--color-border-default)] bg-surface-muted p-2.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold uppercase">{row.name}</span>
                  <span
                    className={`font-semibold ${
                      row.ok ? "text-status-success" : "text-status-danger"
                    }`}
                  >
                    {row.ok ? t("tenantAdmin.system.statusHealthy") : t("tenantAdmin.system.statusError")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
