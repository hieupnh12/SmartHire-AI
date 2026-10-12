import { useQuery } from "@tanstack/react-query";
import { authApi, jobApi, dashboardApi } from "@/api";
import { getApiErrorMessage } from "@/lib/axios";
import { CompanyEmailSettingsCard } from "@/features/tenant/admin/company/components/CompanyEmailSettingsCard";
import { Card } from "@/components/ux/Card";
import { Activity } from "lucide-react";

export function SystemPage() {
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
          Cấu hình Gmail
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Thiết lập tài khoản Gmail của công ty để gửi thư mời nhân viên, lịch phỏng vấn và kết quả tuyển dụng.
        </p>
      </div>

      {/* Main Feature: Cấu hình Gmail gửi thư */}
      <CompanyEmailSettingsCard />

      {/* System Health Section */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <Activity className="size-4 text-brand-primary" />
          <span>Trạng thái hạ tầng hệ thống (Infra Health)</span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Kiểm tra kết nối tới cơ sở dữ liệu HikariCP, Redis Cache và RabbitMQ.
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
                    {row.ok ? "● Đang hoạt động" : "● Lỗi kết nối"}
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
