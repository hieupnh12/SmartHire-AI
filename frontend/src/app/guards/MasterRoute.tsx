import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { masterAuthApi } from "@/api/master/masterAuthApi";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { cn } from "@/lib/utils";

function MasterAdminLoadingShell() {
  return (
    <div
      className="min-h-dvh min-w-0 bg-[#f8fafc] font-sans antialiased"
      aria-busy="true"
      role="status"
    >
      {/* Mock Sidebar for Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-slate-200/80 bg-white p-4 md:flex">
        {/* Brand logo skeleton */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100">
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>

        {/* Nav items skeleton */}
        <div className="mt-5 space-y-2 flex-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <Skeleton className="size-4 rounded" />
              <Skeleton className={cn("h-3.5", i % 2 === 0 ? "w-28" : "w-20")} />
            </div>
          ))}
        </div>

        {/* User profile skeleton at bottom */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-3 px-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-14" />
          </div>
        </div>
      </aside>

      {/* Main Area Skeleton */}
      <div className="flex min-h-dvh flex-col md:pl-[260px]">
        {/* Header Skeleton */}
        <header className="flex h-16 w-full items-center justify-between border-b border-slate-100/80 bg-white px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>

        {/* Body Content Skeleton */}
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full">
          {/* Page Heading Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3.5 w-96 max-w-full" />
          </div>

          {/* Cards Grid Skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Large Container Skeleton */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="space-y-3 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function MasterRoute() {
  const token = localStorage.getItem("master_access_token");
  const query = useQuery({
    queryKey: ["master-session", token],
    queryFn: () => masterAuthApi.me(token!),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });

  if (!token) return <Navigate to="/admin/login" replace />;

  if (query.isError) {
    localStorage.removeItem("master_access_token");
    return <Navigate to="/admin/login" replace />;
  }

  if (query.isPending) {
    return <MasterAdminLoadingShell />;
  }

  if (query.data?.data?.role !== "WORKSPACE_ADMIN") {
    localStorage.removeItem("master_access_token");
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
