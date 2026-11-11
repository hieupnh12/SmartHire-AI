import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import { matchingApi } from "@/api/tenant/matchingApi";
import { jobApi } from "@/api/tenant/jobApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useT } from "@/i18n";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/axios";
import { getRankingPreview, PREVIEW_JOB_ID } from "../data/rankingPreview";
import {
  RankingCandidateDetailView,
  RankingDetailError,
  RankingDetailLoading,
} from "../components/RankingDetail";
import type { RankingRow } from "../types/ranking";

export function RankingCandidateDetailPage() {
  const t = useT();
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

  const previewBoard = useMemo(() => (isPreview ? getRankingPreview(t) : null), [isPreview, t]);

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

  const previewRow = previewBoard
    ? previewBoard.rows.find((r) => r.applicationId === applicationId) || previewBoard.rows[0]
    : undefined;

  const jobTitle = previewBoard
    ? previewBoard.jobTitle
    : locationState?.jobTitle || jobQuery.data?.data?.title || t("recruiter.screening.rankingDetailPage.defaultJobTitle");

  const row = previewRow || detailQuery.data?.data || locationState?.row;

  const handleBack = () => {
    navigate(`/recruiter/jobs/${jobId}/rank`);
  };

  if (!token && !isPreview) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          {t("recruiter.screening.rankingDetailPage.authRequired")}
        </p>
      </div>
    );
  }

  if (!validJobId || !validApplicationId) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700" role="alert">
          <p className="font-semibold">{t("recruiter.screening.rankingDetailPage.invalidTitle")}</p>
          <p className="mt-1 text-xs text-rose-600">
            {t("recruiter.screening.rankingDetailPage.invalidDesc")}
          </p>
          <Link
            to="/recruiter"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 underline hover:no-underline"
          >
            <ArrowLeft className="size-3.5" />
            <span>{t("recruiter.screening.rankingDetailPage.backToWorkspace")}</span>
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
        message={t("recruiter.screening.rankingDetailPage.notFound")}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 pb-12">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          to={`/recruiter/jobs/${jobId}/rank`}
          className="hover:text-brand-primary transition-colors font-medium flex items-center gap-1.5"
        >
          <Sparkles className="size-3.5 text-brand-primary" />
          <span>{t("recruiter.screening.rankingDetailPage.breadcrumbPrefix", { jobTitle })}</span>
        </Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
          {t("recruiter.screening.rankingDetailPage.candidateRecord", {
            name: row.candidateName,
            id: row.applicationId,
          })}
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

