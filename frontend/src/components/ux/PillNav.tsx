import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type PillNavItem<T extends string = string> = {
  id: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  to?: string;
};

type Props<T extends string> = {
  items: readonly PillNavItem<T>[];
  activeId: T;
  ariaLabel: string;
  onSelect?: (id: T) => void;
  className?: string;
};

/** Clean hairline secondary navigation bar aligned flush with the primary header nav. */
export function PillNav<T extends string>({
  items,
  activeId,
  ariaLabel,
  onSelect,
  className,
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "-mb-px flex items-center gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const active = activeId === item.id;
        const Icon = item.icon;
        const itemClass = cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          active
            ? "border-[var(--color-primary)] font-semibold text-[var(--color-primary)]"
            : "border-transparent font-medium text-[#475467] hover:border-slate-300 hover:text-[#101828] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200",
        );
        const content = (
          <>
            {Icon && (
              <Icon
                className={cn(
                  "size-3.5 shrink-0",
                  active ? "text-[var(--color-primary)]" : "text-[#667085] dark:text-slate-400",
                )}
                aria-hidden="true"
              />
            )}
            <span>{item.label}</span>
          </>
        );

        if (item.to != null) {
          return (
            <Link
              key={item.id}
              to={item.to}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              onClick={() => onSelect?.(item.id)}
              className={itemClass}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect?.(item.id)}
            className={itemClass}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
