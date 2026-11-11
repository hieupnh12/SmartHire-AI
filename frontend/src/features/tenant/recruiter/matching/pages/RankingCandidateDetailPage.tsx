import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import { matchingApi } from "@/api/tenant/matchingApi";
import { jobApi } from "@/api/tenant/jobApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/axios";
import { PREVIEW_JOB_ID, rankingPreview } from "../data/rankingPreview";
import {
  RankingCandidateDetailView,
  RankingDetailError,
  RankingDetailLoading,
} from "../components/RankingDetail";
import type { RankingRow } from "../types/ranking";

export function RankingCandidateDetailPage() {
  const { id, applicationId: applicationIdParam } = useParams<{ id: string; applicationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const jobId = Number(id);
  const applicationId = Number(applicationIdParam);
  const validJobId = Number.isInteger(jobId) && (jobId > 0 || jobId === PREVIEW_JOB_ID);
  const validApplicationId = Number.isInteger(applicationId) && applicationId > 0;
  const isPreview = jobId === PREVIEW_JOB_ID;

  const token = useAuthStore((store) => store.accessToken);
  const sessionKey = useMemo(() => crypto.randomUUID(), [token]);
  const tenantKey = `${getTenantIdFromWindow() ?? ""}:${sessionKey}`;

  const locationState = location.state as { row?: RankingRow; jobTitle?: string } | undefined;

  const jobQuery = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobApi.get(jobId),
    enabled: validJobId && !isPreview && !!token && !locationState?.jobTitle,
  });

  const detailQuery = useQuery({
    queryKey: ["ranking-detail", tenantKey, applicationId],
    queryFn: () => matchingApi.detail(applicationId),
    enabled: validApplicationId && !isPreview && !!token,
  });

  const previewRow = isPreview
    ? rankingPreview.rows.find((r) => r.applicationId === applicationId) || rankingPreview.rows[0]
    : undefined;

  const jobTitle = isPreview
    ? rankingPreview.jobTitle
    : locationState?.jobTitle || jobQuery.data?.data?.title || "Công việc tuyển dụng";

  const row = previewRow || detailQuery.data?.data || locationState?.row;

  const handleBack = () => {
    navigate(`/recruiter/jobs/${jobId}/rank`);
  };

  if (!token && !isPreview) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          Đăng nhập bằng tài khoản Recruiter để xem chi tiết xếp hạng ứng viên.
        </p>
      </div>
    );
  }

  if (!validJobId || !validApplicationId) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700" role="alert">
          <p className="font-semibold">Đường dẫn không hợp lệ</p>
          <p className="mt-1 text-xs text-rose-600">
            Mã công việc hoặc mã ứng viên không đúng định dạng.
          </p>
          <Link
            to="/recruiter"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 underline hover:no-underline"
          >
            <ArrowLeft className="size-3.5" />
            <span>Quay lại trang tuyển dụng</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!row && detailQuery.isPending) {
    return <RankingDetailLoading />;
  }

  if (!row && detailQuery.isError) {
    return (
      <RankingDetailError
        message={getApiErrorMessage(detailQuery.error)}
        onBack={handleBack}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  if (!row) {
    return (
      <RankingDetailError
        message="Không tìm thấy thông tin đánh giá của ứng viên này trong hệ thống."
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 pb-12">
      {/* Breadcrumb strip */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          to={`/recruiter/jobs/${jobId}/rank`}
          className="hover:text-brand-primary transition-colors font-medium flex items-center gap-1.5"
        >
          <Sparkles className="size-3.5 text-brand-primary" />
          <span>Bảng xếp hạng: {jobTitle}</span>
        </Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
          {row.candidateName} (Hồ sơ #{row.applicationId})
        </span>
      </nav>

      <RankingCandidateDetailView
        row={row}
        jobId={jobId}
        jobTitle={jobTitle}
        tenantKey={tenantKey}
        preview={isPreview}
        fallback={!previewRow && !detailQuery.data?.data && !!locationState?.row}
        onBack={handleBack}
      />
    </div>
  );
}

