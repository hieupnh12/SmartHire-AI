import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ChevronRight, Library, House, Menu, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { jobApi } from "@/api/tenant/jobApi";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { canViewAllJobs } from "@/features/tenant/recruiter/permissions";

const generalLinks = [
  {
    to: "/recruiter",
    labelKey: "recruiter.ops.jobs.drawer.homeLabel",
    descriptionKey: "recruiter.ops.jobs.drawer.homeDesc",
    icon: House,
  },
] as const;

export function JobNavigationDrawer() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canViewAll = canViewAllJobs(user);
  const canCreateJob = isAdmin || (user?.permissions?.includes("JOBS_CREATE") ?? false) || (user?.permissions?.includes("JOBS") ?? false);
  const location = useLocation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const tenantTheme = getTenantTheme(getTenantIdFromWindow() ?? "acme");
  const tenantThemeStyle = getTenantThemeStyle(tenantTheme);

  const isHome = location.pathname === "/recruiter";
  const isQuestionBank = location.pathname.startsWith("/recruiter/question-bank");
  const isCreateJob = location.pathname === "/recruiter/jobs/new";

  const currentJobId = location.pathname.match(/^\/recruiter\/jobs\/(\d+)(?:\/|$)/)?.[1];
  const recentJobs = useQuery({
    queryKey: queryKeys.jobs.list({ page: 0, size: 8, scope: canViewAll ? "all" : "my", context: "detail-drawer" }),
    queryFn: () => jobApi.search({ page: 0, size: 8, scope: canViewAll ? "all" : "my" }),
    enabled: open && !!user,
    staleTime: 60_000,
  });

  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(false);
    setOpen(true);
  };

  const handleClose = () => {
    if (isClosing || !open) return;
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      triggerRef.current?.focus();
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open && !isClosing) {
      const timer = setTimeout(() => setHasOpened(true), 450);
      return () => clearTimeout(timer);
    }
    setHasOpened(false);
  }, [open, isClosing]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isClosing]);

  if (!currentJobId) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] transition-colors hover:border-brand-primary/30 hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        aria-label={t("recruiter.ops.jobs.drawer.openAria")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {open && createPortal(
        <div className="tenant-workspace-theme fixed inset-0 z-[70]" style={tenantThemeStyle}>
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-[var(--color-inverse-surface)]/35 backdrop-blur-[2px]",
              isClosing ? "animate-job-drawer-backdrop-out" : "animate-job-drawer-backdrop-in"
            )}
            onClick={handleClose}
            aria-label={t("recruiter.ops.jobs.drawer.closeAria")}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-drawer-title"
            className={cn(
              "absolute inset-y-0 left-0 flex w-[min(92vw,24rem)] flex-col border-r border-[var(--color-border-default)] bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]",
              isClosing ? "animate-job-drawer-slide-out" : "animate-job-drawer-slide-in"
            )}
          >
            <div
              className="animate-job-drawer-item-in flex items-start justify-between gap-4 border-b border-[var(--color-border-default)] px-5 py-5"
              style={{ animationDelay: "50ms" }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-primary">{t("recruiter.ops.jobs.drawer.eyebrow")}</p>
                <h2 id="job-drawer-title" className="mt-1 text-xl font-semibold text-[var(--color-on-surface)]">{t("recruiter.ops.jobs.drawer.title")}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={handleClose}
                className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
                aria-label={t("recruiter.ops.jobs.drawer.closeAria")}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <section aria-labelledby="general-navigation-title">
                <h3
                  id="general-navigation-title"
                  className="animate-job-drawer-item-in px-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-outline)]"
                  style={{ animationDelay: "90ms" }}
                >
                  {t("recruiter.ops.jobs.drawer.generalHeading")}
                </h3>
                <div className="mt-2 space-y-1">
                  {generalLinks.map(({ to, labelKey, descriptionKey, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={handleClose}
                      className={cn(
                        "animate-job-drawer-item-in group flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary",
                        isHome && "bg-[var(--color-primary-soft)]"
                      )}
                      style={{ animationDelay: "130ms" }}
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-xl text-[var(--color-on-surface-variant)] group-hover:text-brand-primary",
                          isHome ? "bg-white text-brand-primary shadow-xs" : "bg-[var(--color-surface-alt)]"
                        )}
                      >
                        <Icon className="size-[18px]" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--color-on-surface)]">{t(labelKey)}</span>
                        <span className="block text-xs text-[var(--color-on-surface-variant)]">{t(descriptionKey)}</span>
                      </span>
                      <ChevronRight className="size-4 text-[var(--color-outline)]" aria-hidden="true" />
                    </Link>
                  ))}
                  <Link
                    to="/recruiter/question-bank"
                    onClick={handleClose}
                    className={cn(
                      "animate-job-drawer-item-in group flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary",
                      isQuestionBank && "bg-[var(--color-primary-soft)]"
                    )}
                    style={{ animationDelay: "170ms" }}
                  >
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-xl text-[var(--color-on-surface-variant)] group-hover:text-brand-primary",
                        isQuestionBank ? "bg-white text-brand-primary shadow-xs" : "bg-[var(--color-surface-alt)]"
                      )}
                    >
                      <Library className="size-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--color-on-surface)]">{t("recruiter.ops.jobs.drawer.questionBankTitle")}</span>
                      <span className="block text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.drawer.questionBankDesc")}</span>
                    </span>
                    <ChevronRight className="size-4 text-[var(--color-outline)]" aria-hidden="true" />
                  </Link>
                  {canCreateJob && (
                    <Link
                      to="/recruiter/jobs/new"
                      onClick={handleClose}
                      className={cn(
                        "animate-job-drawer-item-in group flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary",
                        isCreateJob && "bg-[var(--color-primary-soft)]"
                      )}
                      style={{ animationDelay: "210ms" }}
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-xl text-[var(--color-on-surface-variant)] group-hover:text-brand-primary",
                          isCreateJob ? "bg-white text-brand-primary shadow-xs" : "bg-[var(--color-surface-alt)]"
                        )}
                      >
                        <Plus className="size-[18px]" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--color-on-surface)]">{t("recruiter.ops.jobs.drawer.createJobTitle")}</span>
                        <span className="block text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.drawer.createJobDesc")}</span>
                      </span>
                      <ChevronRight className="size-4 text-[var(--color-outline)]" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </section>

              <div
                className="animate-job-drawer-item-in my-5 border-t border-[var(--color-border-default)]"
                style={{ animationDelay: "240ms" }}
              />

              <section aria-labelledby="recent-jobs-title">
                <div
                  className="animate-job-drawer-item-in flex items-center justify-between gap-3 px-2"
                  style={{ animationDelay: "270ms" }}
                >
                  <h3 id="recent-jobs-title" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-outline)]">{t("recruiter.ops.jobs.drawer.recentHeading")}</h3>
                  <Link to="/recruiter" onClick={handleClose} className="text-xs font-semibold text-brand-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">{t("recruiter.ops.jobs.drawer.viewAll")}</Link>
                </div>
                <div className="mt-2 space-y-1.5">
                  {recentJobs.isPending && Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="animate-job-drawer-item-in h-[4.5rem] animate-pulse rounded-xl bg-[var(--color-surface-container)]"
                      style={{ animationDelay: `${hasOpened ? index * 35 : 300 + index * 35}ms` }}
                    />
                  ))}
                  {recentJobs.isError && (
                    <p
                      role="alert"
                      className="animate-job-drawer-item-in rounded-xl bg-red-50 p-3 text-sm text-red-700"
                      style={{ animationDelay: "300ms" }}
                    >
                      {getApiErrorMessage(recentJobs.error)}
                    </p>
                  )}
                  {recentJobs.data?.data.items.map((job, index) => {
                    const active = String(job.id) === currentJobId;
                    const delay = hasOpened ? index * 35 : 300 + index * 35;
                    return (
                      <Link
                        key={job.id}
                        to={`/recruiter/jobs/${job.id}`}
                        onClick={handleClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "animate-job-drawer-item-in flex min-h-[4.5rem] items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary",
                          active ? "border-brand-primary/25 bg-[var(--color-primary-soft)]" : "border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]"
                        )}
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", active ? "bg-white text-brand-primary shadow-xs" : "bg-[var(--color-primary-soft)] text-brand-primary")}>
                          <BriefcaseBusiness className="size-[18px]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--color-on-surface)]">{job.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-on-surface-variant)]">{t(`recruiter.ops.jobStatuses.${job.status}`)} · {job.department || t("recruiter.ops.jobs.drawer.noDepartment")}</span>
                        </span>
                        {active && <span className="size-2 shrink-0 rounded-full bg-brand-primary" aria-label={t("recruiter.ops.jobs.drawer.currentJobAria")} />}
                      </Link>
                    );
                  })}
                  {recentJobs.isSuccess && recentJobs.data.data.items.length === 0 && (
                    <p
                      className="animate-job-drawer-item-in rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm text-[var(--color-on-surface-variant)]"
                      style={{ animationDelay: "300ms" }}
                    >
                      {t("recruiter.ops.jobs.drawer.emptyJobs")}
                    </p>
                  )}
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
