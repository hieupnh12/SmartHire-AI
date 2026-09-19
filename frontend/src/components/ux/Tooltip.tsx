import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
  className?: string;
};

/** Lightweight tooltip — hover + focus for keyboard users. */
export function Tooltip({ content, children, side = "top", disabled = false, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => !disabled && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => !disabled && setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2 py-1 text-xs text-[var(--color-text-inverse)] shadow-sm",
            side === "top" && "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2",
            side === "right" && "left-[calc(100%+6px)] top-1/2 -translate-y-1/2",
            side === "bottom" && "left-1/2 top-[calc(100%+6px)] -translate-x-1/2",
            side === "left" && "right-[calc(100%+6px)] top-1/2 -translate-y-1/2",
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
