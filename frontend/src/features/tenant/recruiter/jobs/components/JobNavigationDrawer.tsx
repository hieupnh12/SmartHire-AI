import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ChevronRight, House, List, Menu, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobStatus } from "@/api/types/job";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const statusLabel: Record<JobStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang tuyển",
  PAUSED: "Tạm dừng",
  CLOSED: "Đã đóng",
  ARCHIVED: "Lưu trữ",
};

const generalLinks = [
  { to: "/recruiter", label: "Trang tuyển dụng", description: "Tổng quan tất cả vị trí", icon: House },
  { to: "/recruiter/jobs", label: "Tất cả việc làm", description: "Quản lý danh sách job", icon: List },
  { to: "/recruiter/jobs/new", label: "Tạo việc làm", description: "Mở một vị trí mới", icon: Plus },
] as const;

export function JobNavigationDrawer() {
  const location = useLocation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const currentJobId = location.pathname.match(/^\/recruiter\/jobs\/(\d+)\/?$/)?.[1];
  const recentJobs = useQuery({
    queryKey: queryKeys.jobs.list({ page: 0, size: 8, context: "detail-drawer" }),
    queryFn: () => jobApi.search({ page: 0, size: 8 }),
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!currentJobId) return null;

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] transition-colors hover:border-brand-primary/30 hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        aria-label="Mở điều hướng việc làm"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[70]">
          <button type="button" className="absolute inset-0 bg-[var(--color-inverse-surface)]/35 backdrop-blur-[2px]" onClick={close} aria-label="Đóng bảng điều hướng" />
          <aside role="dialog" aria-modal="true" aria-labelledby="job-drawer-title" className="absolute inset-y-0 left-0 flex w-[min(92vw,24rem)] flex-col border-r border-[var(--color-border-default)] bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-default)] px-5 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-primary">Không gian tuyển dụng</p>
                <h2 id="job-drawer-title" className="mt-1 text-xl font-semibold text-[var(--color-on-surface)]">Điều hướng việc làm</h2>
              </div>
              <button ref={closeRef} type="button" onClick={close} className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary" aria-label="Đóng bảng điều hướng">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <section aria-labelledby="general-navigation-title">
                <h3 id="general-navigation-title" className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-outline)]">Điều hướng chung</h3>
                <div className="mt-2 space-y-1">
                  {generalLinks.map(({ to, label, description, icon: Icon }) => (
                    <Link key={to} to={to} onClick={close} className="group flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)] group-hover:text-brand-primary"><Icon className="size-[18px]" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--color-on-surface)]">{label}</span><span className="block text-xs text-[var(--color-on-surface-variant)]">{description}</span></span>
                      <ChevronRight className="size-4 text-[var(--color-outline)]" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>

              <div className="my-5 border-t border-[var(--color-border-default)]" />

              <section aria-labelledby="recent-jobs-title">
                <div className="flex items-center justify-between gap-3 px-2">
                  <h3 id="recent-jobs-title" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-outline)]">Job tạo gần đây</h3>
                  <Link to="/recruiter/jobs" onClick={close} className="text-xs font-semibold text-brand-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">Xem tất cả</Link>
                </div>
                <div className="mt-2 space-y-1.5">
                  {recentJobs.isPending && Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[4.5rem] animate-pulse rounded-xl bg-[var(--color-surface-container)]" />)}
                  {recentJobs.isError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{getApiErrorMessage(recentJobs.error)}</p>}
                  {recentJobs.data?.data.items.map((job) => {
                    const active = String(job.id) === currentJobId;
                    return (
                      <Link key={job.id} to={`/recruiter/jobs/${job.id}`} onClick={close} aria-current={active ? "page" : undefined} className={cn("flex min-h-[4.5rem] items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary", active ? "border-brand-primary/25 bg-[var(--color-primary-soft)]" : "border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]")}>
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", active ? "bg-white text-brand-primary" : "bg-[var(--color-primary-soft)] text-brand-primary")}><BriefcaseBusiness className="size-[18px]" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[var(--color-on-surface)]">{job.title}</span><span className="mt-0.5 block truncate text-xs text-[var(--color-on-surface-variant)]">{statusLabel[job.status]} · {job.department || "Chưa phân phòng ban"}</span></span>
                        {active && <span className="size-2 shrink-0 rounded-full bg-brand-primary" aria-label="Job hiện tại" />}
                      </Link>
                    );
                  })}
                  {recentJobs.isSuccess && recentJobs.data.data.items.length === 0 && <p className="rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm text-[var(--color-on-surface-variant)]">Chưa có job nào được tạo.</p>}
                </div>
              </section>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
