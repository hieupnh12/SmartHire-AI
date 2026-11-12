import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { BriefcaseBusiness, Users } from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { ApplicationStatus } from "@/api/types/applicant";
import { Card } from "@/components/ux/Card";
import { Skeleton } from "@/components/ux/Skeleton";
import { keepPreviousForScope, TableRefreshBar } from "@/components/ux/TableRefresh";
import { formatDate, formatNumber, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export function RecruitmentPage() {
  const t = useT();
  const locale = useLocale();
  const [searchParams] = useSearchParams();
  const urlJobIdRaw = searchParams.get("jobId");
  const urlJobId = urlJobIdRaw ? Number(urlJobIdRaw) : NaN;
  const [jobId, setJobId] = useState<number | null>(() =>
    Number.isFinite(urlJobId) && urlJobId > 0 ? urlJobId : null,
  );
  const [page, setPage] = useState(0);

  const getStatusLabel = (status: ApplicationStatus) => {
    const map: Record<ApplicationStatus, string> = {
      NEW: t("tenantAdmin.recruitment.statuses.NEW"),
      IN_REVIEW: t("tenantAdmin.recruitment.statuses.IN_REVIEW"),
      ASSESSMENT: t("tenantAdmin.recruitment.statuses.ASSESSMENT"),
      INTERVIEW: t("tenantAdmin.recruitment.statuses.INTERVIEW"),
      HUMAN_INTERVIEW: t("tenantAdmin.recruitment.statuses.HUMAN_INTERVIEW"),
      OFFER: t("tenantAdmin.recruitment.statuses.OFFER"),
      HIRED: t("tenantAdmin.recruitment.statuses.HIRED"),
      REJECTED: t("tenantAdmin.recruitment.statuses.REJECTED"),
      FAILED: t("tenantAdmin.recruitment.statuses.FAILED"),
      WITHDRAWN: t("tenantAdmin.recruitment.statuses.WITHDRAWN"),
    };
    return map[status] ?? status;
  };

  const jobs = useQuery({
    queryKey: ["admin", "published-jobs"],
    queryFn: () => jobApi.search({ status: "PUBLISHED", page: 0, size: 50, scope: "all" }),
  });
  const jobItems = jobs.data?.data?.items ?? [];
  const jobTotal = jobs.data?.data?.total ?? jobItems.length;

  const firstJobId = jobItems[0]?.id;

  useEffect(() => {
    if (Number.isFinite(urlJobId) && urlJobId > 0) {
      setJobId(urlJobId);
      setPage(0);
    }
  }, [urlJobId]);

  useEffect(() => {
    if (jobId == null && firstJobId != null) {
      setJobId(firstJobId);
    }
  }, [jobId, firstJobId]);

  const applicants = useQuery({
    queryKey: ["admin", "job-applicants", jobId, page],
    queryFn: () => applicantApi.listByJob(jobId!, { archived: false, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousForScope(jobId, 2),
    enabled: jobId != null,
  });
  const isApplicantsRefreshing = applicants.isFetching && applicants.isPlaceholderData;

  const selected = jobItems.find((job) => job.id === jobId) ?? null;
  const rows = applicants.data?.data?.items ?? [];
  const total = applicants.data?.data?.total ?? 0;

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-brand-primary">{t("tenantAdmin.recruitment.eyebrow")}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
          {t("tenantAdmin.recruitment.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          {t("tenantAdmin.recruitment.subtitle")}
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(16rem,22rem)_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] px-5 py-4">
            <BriefcaseBusiness className="size-5 text-brand-primary" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{t("tenantAdmin.recruitment.jobsCardTitle")}</h2>
          </div>
          <div className="p-3">
            {jobs.isLoading && <Skeleton className="h-24 w-full" />}
            {jobs.isError && <p className="px-2 py-3 text-sm text-status-danger">{getApiErrorMessage(jobs.error)}</p>}
            {jobs.isSuccess && jobItems.length === 0 && (
              <p className="px-2 py-6 text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.recruitment.noJobs")}</p>
            )}
            {jobTotal > jobItems.length && (
              <p className="px-2 pb-2 text-xs text-[var(--color-text-secondary)]">{t("tenantAdmin.recruitment.latest50Hint")}</p>
            )}
            <ul className="space-y-1">
              {jobItems.map((job) => {
                const active = job.id === jobId;
                return (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setJobId(job.id);
                        setPage(0);
                      }}
                      className={cn(
                        "w-full rounded-[var(--radius-md)] px-3 py-3 text-left transition-colors",
                        active ? "bg-[var(--color-primary-soft)]" : "hover:bg-surface-muted",
                      )}
                    >
                      <span className="block text-sm font-semibold text-[var(--color-text-primary)]">{job.title}</span>
                      <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                        {[job.department, job.location].filter(Boolean).join(" · ") || t("tenantAdmin.recruitment.noLocation")}
                        {" · "}
                        {t("tenantAdmin.recruitment.applicantCount", {
                          count: formatNumber(job.applicationCount ?? 0, undefined, locale),
                        })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-0">
          <TableRefreshBar active={isApplicantsRefreshing} />
          <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] px-5 py-4">
            <Users className="size-5 text-brand-primary" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                {selected ? selected.title : t("tenantAdmin.recruitment.applicantsFallbackTitle")}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {selected
                  ? t("tenantAdmin.recruitment.totalApplied", {
                      count: formatNumber(total, undefined, locale),
                    })
                  : t("tenantAdmin.recruitment.selectJobHint")}
              </p>
            </div>
          </div>
          <div className="p-5">
            {jobId == null && !jobs.isLoading && (
              <p className="text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.recruitment.selectJobFromLeft")}</p>
            )}
            {applicants.isPending && !applicants.data && <Skeleton className="h-24 w-full" />}
            {applicants.isError && <p className="text-sm text-status-danger">{getApiErrorMessage(applicants.error)}</p>}
            {applicants.isSuccess && rows.length === 0 && (
              <p className="text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.recruitment.noApplicantsForJob")}</p>
            )}
            {rows.length > 0 && (
              <div className={cn("overflow-x-auto transition-opacity duration-200", isApplicantsRefreshing && "opacity-60")}>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                    <tr>
                      <th className="py-2 font-semibold">{t("tenantAdmin.recruitment.columns.candidate")}</th>
                      <th className="px-3 py-2 font-semibold">{t("tenantAdmin.recruitment.columns.status")}</th>
                      <th className="px-3 py-2 font-semibold">{t("tenantAdmin.recruitment.columns.source")}</th>
                      <th className="py-2 text-right font-semibold">{t("tenantAdmin.recruitment.columns.appliedAt")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--color-border-default)]">
                        <td className="py-3">
                          <p className="font-semibold text-[var(--color-text-primary)]">{row.candidateName}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{row.candidateEmail}</p>
                        </td>
                        <td className="px-3 py-3">{getStatusLabel(row.status)}</td>
                        <td className="px-3 py-3 text-[var(--color-text-secondary)]">{row.source ?? "—"}</td>
                        <td className="py-3 text-right text-[var(--color-text-secondary)]">
                          {formatDate(row.createdAt, undefined, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => current - 1)}
                  className="min-h-9 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 text-sm font-medium disabled:opacity-50"
                >
                  {t("tenantAdmin.recruitment.pagination.prev")}
                </button>
                <button
                  type="button"
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => setPage((current) => current + 1)}
                  className="min-h-9 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 text-sm font-medium disabled:opacity-50"
                >
                  {t("tenantAdmin.recruitment.pagination.next")}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
