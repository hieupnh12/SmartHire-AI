import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  /** Omit `to` for the current page (non-link). */
  to?: string;
};

type Props = {
  items: BreadcrumbItem[];
  /** Optional chip/badge after the trail (e.g. workspace). */
  meta?: ReactNode;
  /** Actions aligned to the right of the same row. */
  actions?: ReactNode;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Shared page breadcrumb — use across recruiter, candidate, and admin surfaces.
 * Pass `actions` to place header buttons on the same row as the trail.
 */
export function Breadcrumb({ items, meta, actions, className, size = "sm" }: Props) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3.5 py-2.5 shadow-[var(--shadow-card)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 sm:py-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <nav
          aria-label="Breadcrumb"
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-1",
            size === "sm" ? "text-sm" : "text-base",
          )}
        >
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1">
                {index > 0 && (
                  <ChevronRight
                    className="size-4 shrink-0 text-[var(--color-primary)]/50"
                    aria-hidden="true"
                    strokeWidth={2.5}
                  />
                )}
                {item.to && !last ? (
                  <Link
                    to={item.to}
                    className="max-w-[220px] truncate rounded-md px-1.5 py-0.5 font-medium text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "max-w-[280px] truncate",
                      last
                        ? "rounded-lg bg-[var(--color-primary-subtle)] px-2.5 py-1 font-semibold text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20"
                        : "px-1.5 font-medium text-[var(--color-on-surface-variant)]",
                    )}
                    aria-current={last ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
        {meta}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
