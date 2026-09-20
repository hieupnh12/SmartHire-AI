import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { masterAdminApi } from "@/api/master/masterAdminApi";
import { getTenantIdFromSubdomain } from "@/lib/tenant";
import { TenantNotFoundPage } from "@/features/tenant/career/pages/TenantNotFoundPage";

export function TenantSubdomainGuard() {
  const subdomain = getTenantIdFromSubdomain();
  const query = useQuery({
    queryKey: ["tenant-subdomain", subdomain],
    queryFn: () => masterAdminApi.checkSubdomainExists(subdomain!),
    enabled: Boolean(subdomain),
    retry: false,
    staleTime: 60_000,
  });

  if (!subdomain) {
    return <TenantNotFoundPage subdomain={window.location.hostname} />;
  }

  if (query.isPending) {
    return (
      <main
        aria-busy="true"
        className="grid min-h-screen place-items-center bg-[var(--color-surface)] px-6 text-center text-sm text-[var(--color-on-surface-variant)]"
      >
        <p role="status">Đang xác thực subdomain “{subdomain}”…</p>
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-surface)] px-6 text-center">
        <div role="alert" className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700 shadow-sm">
          Không thể kết nối để xác thực subdomain “{subdomain}”. Vui lòng thử tải lại trang.
        </div>
      </main>
    );
  }

  if (!query.data) {
    return <TenantNotFoundPage subdomain={subdomain} />;
  }

  return <Outlet />;
}
