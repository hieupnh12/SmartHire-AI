import { useQuery } from "@tanstack/react-query";
import { authApi, jobApi, dashboardApi } from "@/api";
import { getApiErrorMessage } from "@/lib/axios";

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
    <section className="space-y-4">
      <h1 className="font-display text-3xl font-bold">System</h1>
      <p className="text-[var(--color-text-secondary)]">
        Infra status via public module <code>/health</code> (Hikari / Redis / RabbitMQ on BE).
      </p>
      {health.isError && (
        <p className="text-status-danger">{getApiErrorMessage(health.error)}</p>
      )}
      {health.data && (
        <ul className="space-y-2 text-sm">
          {health.data.map((row) => (
            <li key={row.name} className="rounded-md border border-[var(--color-border-default)] bg-surface-card p-3">
              <span className={row.ok ? "text-status-success" : "text-status-danger"}>
                {row.ok ? "UP" : "DOWN"}
              </span>{" "}
              <span className="font-mono">{row.name}</span>
              <pre className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {JSON.stringify(row.detail)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
