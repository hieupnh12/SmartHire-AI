import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { ApplicationStatus } from "@/api/types/applicant";
import { applicantApi } from "@/api/tenant/applicantApi";
import { EmptyState } from "@/components/ux/EmptyState";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { ApplicationCard } from "../components/ApplicationCard";
import { WithdrawDialog } from "../components/WithdrawDialog";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { toIntlLocale, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

const FILTER_VALUES: ("ALL" | ApplicationStatus)[] = [
  "ALL",
  "NEW",
  "IN_REVIEW",
  "ASSESSMENT",
  "INTERVIEW",
  "HUMAN_INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "FAILED",
  "WITHDRAWN",
];

export function MyApplicationsPage() {
  const t = useT();
  const locale = useLocale();
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [search, setSearch] = useState("");
  const mine = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine, enabled: Boolean(token) });
  const [withdrawTarget, setWithdrawTarget] = useState<{ id: number; title: string } | null>(null);
  const withdraw = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => applicantApi.withdraw(id, reason),
    onSuccess: () => {
      toast.success(t("candidate.core.applications.withdrawSuccessToast"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.applicants.mine });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const allRows = useMemo(() => mine.data?.data ?? [], [mine.data?.data]);
  const activeRows = useMemo(() => allRows.filter((row) => row.status !== "WITHDRAWN"), [allRows]);
  const rows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase(toIntlLocale(locale));
    const sourceRows = status === "ALL" ? activeRows : allRows;
    return sourceRows
      .filter((row) => status === "ALL" || row.status === status)
      .filter((row) => !keyword || [row.jobTitle, row.jobDepartment, row.jobLocation]
        .filter(Boolean).some((value) => value!.toLocaleLowerCase(toIntlLocale(locale)).includes(keyword)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allRows, activeRows, search, status, locale]);

  const statusLabel = (value: ApplicationStatus) => {
    const key = `candidate.core.applications.statuses.${value}`;
    const label = t(key);
    return label === key ? value : label;
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="applications-title">
      <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">{t("candidate.core.applications.eyebrow")}</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 id="applications-title" className="text-3xl font-semibold tracking-tight">{t("candidate.core.applications.title")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.subtitle")}</p></div>
          <div className="w-fit rounded-2xl border border-[var(--color-primary)]/15 bg-white/80 px-4 py-3 text-right"><strong className="block text-2xl text-[var(--color-primary)]">{activeRows.length}</strong><span className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.trackingCountLabel")}</span></div>
        </div>
      </header>

      {mine.isSuccess && activeRows.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-[var(--shadow-card)]">
          <label className="relative block"><span className="sr-only">{t("candidate.core.applications.searchSr")}</span><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder={t("candidate.core.applications.searchPlaceholder")} className="min-h-11 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15" /></label>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("candidate.core.applications.filterAria")}>{FILTER_VALUES.map((filterValue) => <button key={filterValue} type="button" onClick={() => setStatus(filterValue)} aria-pressed={status === filterValue} className={cn("min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors", status === filterValue ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)]")}>{t(`candidate.core.applications.filters.${filterValue}`)}</button>)}</div>
        </div>
      )}

      {mine.isPending && <LoadingState className="grid gap-4 lg:grid-cols-2" label={t("candidate.core.applications.loading")}>{[0, 1, 2, 3].map((item) => <SkeletonCard key={item} className="min-h-64" />)}</LoadingState>}
      {mine.isError && <p role="alert" className="rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(mine.error)}</p>}
      {mine.isSuccess && activeRows.length === 0 && <EmptyState title={t("candidate.core.applications.emptyTitle")} description={t("candidate.core.applications.emptyDesc")} />}
      {mine.isSuccess && activeRows.length > 0 && rows.length === 0 && <EmptyState title={t("candidate.core.applications.emptyFilteredTitle")} description={t("candidate.core.applications.emptyFilteredDesc")} />}

      {rows.length > 0 && <ul className="grid gap-4 lg:grid-cols-2">{rows.map((row) =>
        <ApplicationCard key={row.id} row={row} statusLabel={statusLabel(row.status)} withdrawing={withdraw.isPending} onWithdraw={() => setWithdrawTarget({ id: row.id, title: row.jobTitle })} />,
      )}</ul>}
      <WithdrawDialog
        jobTitle={withdrawTarget?.title ?? null}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={(reason) => withdraw.mutateAsync({ id: withdrawTarget!.id, reason })}
      />
    </section>
  );
}
