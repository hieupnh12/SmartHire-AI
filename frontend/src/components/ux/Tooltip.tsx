import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
};

/** Lightweight tooltip — hover + focus for keyboard users. */
export function Tooltip({ content, children, side = "top" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2 py-1 text-xs text-[var(--color-text-inverse)] shadow-sm",
            side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
