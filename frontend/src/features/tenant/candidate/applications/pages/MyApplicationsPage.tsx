import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, CalendarDays, ChevronRight, MapPin, Search, XCircle } from "lucide-react";
import type { ApplicationStatus } from "@/api/types/applicant";
import { applicantApi } from "@/api/tenant/applicantApi";
import { EmptyState } from "@/components/ux/EmptyState";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { StatusPill } from "@/components/ux/StatusPill";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: "Đã nộp", IN_REVIEW: "Đang xem xét", ASSESSMENT: "Bài đánh giá", INTERVIEW: "Phỏng vấn AI", HUMAN_INTERVIEW: "Phỏng vấn trực tiếp",
  OFFER: "Đề nghị nhận việc", HIRED: "Đã tuyển", REJECTED: "Không phù hợp", WITHDRAWN: "Đã rút",
};

const FILTERS: { value: "ALL" | ApplicationStatus; label: string }[] = [
  { value: "ALL", label: "Tất cả" }, { value: "NEW", label: "Đã nộp" },
  { value: "IN_REVIEW", label: "Đang xem xét" }, { value: "ASSESSMENT", label: "Bài đánh giá" },
  { value: "INTERVIEW", label: "Phỏng vấn AI" }, { value: "HUMAN_INTERVIEW", label: "Phỏng vấn trực tiếp" }, { value: "OFFER", label: "Đề nghị" },
  { value: "HIRED", label: "Đã tuyển" }, { value: "REJECTED", label: "Không phù hợp" },
];

export function MyApplicationsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const askConfirm = useUiStore((state) => state.askConfirm);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [search, setSearch] = useState("");
  const mine = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine, enabled: Boolean(token) });
  const withdraw = useMutation({
    mutationFn: (id: number) => applicantApi.withdraw(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applicants.mine }),
  });

  const activeRows = useMemo(() => (mine.data?.data ?? []).filter((row) => row.status !== "WITHDRAWN"), [mine.data?.data]);
  const rows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    return activeRows
      .filter((row) => status === "ALL" || row.status === status)
      .filter((row) => !keyword || [row.jobTitle, row.jobDepartment, row.jobLocation]
        .filter(Boolean).some((value) => value!.toLocaleLowerCase("vi-VN").includes(keyword)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeRows, search, status]);

  const confirmWithdraw = (id: number, title: string) => askConfirm({
    title: "Rút đơn ứng tuyển?",
    description: `Đơn ứng tuyển “${title}” sẽ được rút và không còn xuất hiện trong danh sách của bạn.`,
    danger: true,
    confirmLabel: "Rút đơn",
    onConfirm: async () => { await withdraw.mutateAsync(id); },
  });

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="applications-title">
      <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Hành trình ứng tuyển</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 id="applications-title" className="text-3xl font-semibold tracking-tight">Đơn đã ứng tuyển</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">Theo dõi trạng thái và các bước tiếp theo của những công việc bạn đã thực sự ứng tuyển.</p></div>
          <div className="w-fit rounded-2xl border border-[var(--color-primary)]/15 bg-white/80 px-4 py-3 text-right"><strong className="block text-2xl text-[var(--color-primary)]">{activeRows.length}</strong><span className="text-xs text-[var(--color-on-surface-variant)]">đơn đang theo dõi</span></div>
        </div>
      </header>

      {mine.isSuccess && activeRows.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-[var(--shadow-card)]">
          <label className="relative block"><span className="sr-only">Tìm trong đơn đã ứng tuyển</span><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Tìm theo vị trí, phòng ban hoặc địa điểm" className="min-h-11 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15" /></label>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Lọc đơn theo trạng thái">{FILTERS.map((filter) => <button key={filter.value} type="button" onClick={() => setStatus(filter.value)} aria-pressed={status === filter.value} className={cn("min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors", status === filter.value ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)]")}>{filter.label}</button>)}</div>
        </div>
      )}

      {mine.isPending && <LoadingState className="grid gap-4 lg:grid-cols-2" label="Đang tải đơn ứng tuyển">{[0, 1, 2, 3].map((item) => <SkeletonCard key={item} className="min-h-64" />)}</LoadingState>}
      {mine.isError && <p role="alert" className="rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(mine.error)}</p>}
      {withdraw.isError && <p role="alert" className="rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(withdraw.error)}</p>}
      {mine.isSuccess && activeRows.length === 0 && <EmptyState title="Bạn chưa có đơn ứng tuyển" description="Khám phá các vị trí đang tuyển và nộp CV cho công việc phù hợp với bạn." />}
      {mine.isSuccess && activeRows.length > 0 && rows.length === 0 && <EmptyState title="Không tìm thấy đơn phù hợp" description="Thử thay đổi từ khóa hoặc chọn trạng thái khác." />}

      {rows.length > 0 && <ul className="grid gap-4 lg:grid-cols-2">{rows.map((row) => {
        const meta = [row.jobDepartment, row.jobLocation, row.jobWorkMode, row.jobEmploymentType].filter(Boolean);
        const canWithdraw = !["HIRED", "REJECTED"].includes(row.status);
        return <li key={row.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[var(--color-primary)]/30 hover:shadow-[var(--shadow-ambient)]"><div className="flex-1 p-5 sm:p-6"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><BriefcaseBusiness className="size-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-lg font-semibold leading-6">{row.jobTitle}</h2><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Mã đơn #{row.id}</p></div><StatusPill status={row.status} label={STATUS_LABELS[row.status]} /></div></div></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--color-on-surface-variant)]">{meta.length > 0 && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 shrink-0" aria-hidden="true" />{meta.join(" · ")}</span>}<span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0" aria-hidden="true" />Ứng tuyển {formatDate(row.createdAt)}</span></div><div className="mt-5"><ApplicationPipeline status={row.status} /></div></div><div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3 sm:px-6">{canWithdraw ? <button type="button" onClick={() => confirmWithdraw(row.id, row.jobTitle)} disabled={withdraw.isPending} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-container)] disabled:opacity-50"><XCircle className="size-4" aria-hidden="true" />Rút đơn</button> : <span />}<div className="flex gap-2"><Link to={`/jobs/${row.jobId}`} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-[var(--color-on-surface-variant)] hover:bg-white">Xem việc</Link><Link to={`/applications/${row.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">Xem tiến trình<ChevronRight className="size-4" aria-hidden="true" /></Link></div></div></li>;
      })}</ul>}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
