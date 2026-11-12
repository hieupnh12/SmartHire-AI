import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, BookmarkCheck, Briefcase, Laptop, MapPin, Search } from "lucide-react";
import { savedJobApi, type SavedJobView } from "@/api/tenant/savedJobApi";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { JobAlertsPanel } from "@/features/tenant/candidate/jobs/components/JobAlertsPanel";
import { formatDate, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { formatSalaryText } from "@/lib/formatSalary";
import { toast } from "@/stores/toastStore";

export const SAVED_JOBS_QUERY_KEY = ["candidate-saved-jobs"] as const;
export const SAVED_JOB_IDS_QUERY_KEY = ["candidate-saved-job-ids"] as const;

export function SavedJobsPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const savedQuery = useQuery({
    queryKey: SAVED_JOBS_QUERY_KEY,
    queryFn: savedJobApi.list,
  });

  const removeMutation = useMutation({
    mutationFn: (jobId: number) => savedJobApi.remove(jobId),
    onSuccess: (_res, jobId) => {
      queryClient.setQueryData<SavedJobView[]>(SAVED_JOBS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((item) => item.job.id !== jobId),
      );
      queryClient.setQueryData<number[]>(SAVED_JOB_IDS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((id) => id !== jobId),
      );
      toast.success(t("candidate.core.career.card.removedToast"));
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const items = savedQuery.data ?? [];

  return (
    <section className="mx-auto max-w-5xl space-y-6 text-[var(--color-on-surface)]" aria-labelledby="saved-jobs-title">
      <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
          {t("candidate.core.career.savedJobs.eyebrow")}
        </p>
        <h1 id="saved-jobs-title" className="mt-2 text-3xl font-semibold tracking-tight">
          {t("candidate.core.career.savedJobs.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">
          {t("candidate.core.career.savedJobs.subtitle")}
        </p>
      </header>

      <JobAlertsPanel />

      {savedQuery.isPending ? (
        <LoadingState className="space-y-3" label={t("candidate.core.career.savedJobs.loading")}>
          {[0, 1].map((item) => (
            <SkeletonCard key={item} className="min-h-36" />
          ))}
        </LoadingState>
      ) : savedQuery.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]"
        >
          <p>{getApiErrorMessage(savedQuery.error)}</p>
          <Button variant="secondary" size="sm" onClick={() => savedQuery.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
            <Bookmark className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">{t("candidate.core.career.savedJobs.emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-on-surface-variant)]">
            {t("candidate.core.career.savedJobs.emptyDesc")}
          </p>
          <Link
            to="/jobs"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
          >
            <Search className="size-4" aria-hidden="true" />
            {t("candidate.core.career.savedJobs.browseJobs")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(({ id, job, savedAt }) => (
            <article
              key={id}
              className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {job.department && (
                      <span className="rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 font-semibold text-[var(--color-primary)]">
                        {job.department}
                      </span>
                    )}
                    <span className="text-[var(--color-on-surface-variant)]">
                      {t("candidate.core.career.savedJobs.savedOn", {
                        date: formatDate(savedAt, { day: "2-digit", month: "2-digit", year: "numeric" }, locale),
                      })}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold">
                    <Link to={`/jobs/${job.id}`} className="transition-colors hover:text-[var(--color-primary)]">
                      {job.title}
                    </Link>
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-on-surface-variant)]">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-alt)] px-3 py-1">
                        <MapPin className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                        {job.location}
                      </span>
                    )}
                    {job.workMode && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 font-medium text-[var(--color-primary)]">
                        <Laptop className="size-3.5" aria-hidden="true" />
                        {job.workMode}
                      </span>
                    )}
                    {job.employmentType && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-alt)] px-3 py-1">
                        <Briefcase className="size-3.5" aria-hidden="true" />
                        {job.employmentType}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                  <p className="text-base font-semibold text-emerald-700">
                    {job.salary ? formatSalaryText(job.salary) : t("candidate.core.career.card.negotiableSalary")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(job.id)}
                      aria-label={t("candidate.core.career.card.unsaveJob")}
                    >
                      <BookmarkCheck className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                      {t("candidate.core.career.savedJobs.unsave")}
                    </Button>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                    >
                      {t("candidate.core.career.card.viewDetails")}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

