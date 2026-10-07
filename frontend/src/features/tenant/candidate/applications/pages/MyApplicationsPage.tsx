import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { ApplicationStatus } from "@/api/types/applicant";
import { applicantApi } from "@/api/tenant/applicantApi";
import { EmptyState } from "@/components/ux/EmptyState";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { ApplicationCard } from "../components/ApplicationCard";
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

      {rows.length > 0 && <ul className="grid gap-4 lg:grid-cols-2">{rows.map((row) =>
        <ApplicationCard key={row.id} row={row} statusLabel={STATUS_LABELS[row.status]} withdrawing={withdraw.isPending} onWithdraw={() => confirmWithdraw(row.id, row.jobTitle)} />,
      )}</ul>}
    </section>
  );
}
