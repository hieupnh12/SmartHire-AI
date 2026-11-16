import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { jobApi } from "@/api/tenant/jobApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { canViewAllJobs } from "@/features/tenant/recruiter/permissions";
import { LoadingState, Skeleton } from "@/components/ux/Skeleton";

export function RecruiterJobScopedFallbackRoute({ subpath }: { subpath: string }) {
  const user = useAuthStore((s) => s.user);
  const canViewAll = canViewAllJobs(user);
  const query = useQuery({
    queryKey: ["recruiter-fallback-latest-job", canViewAll ? "all" : "my"],
    queryFn: () => jobApi.search({ page: 0, size: 1, scope: canViewAll ? "all" : "my" }),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return (
      <LoadingState label="Đang chuyển hướng..." className="p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </LoadingState>
    );
  }

  const firstJob = query.data?.data?.items?.[0];
  if (firstJob?.id) {
    return <Navigate to={`/recruiter/jobs/${firstJob.id}/${subpath}`} replace />;
  }
  return <Navigate to="/recruiter" replace />;
}
