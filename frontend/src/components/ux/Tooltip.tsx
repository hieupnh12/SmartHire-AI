import { useState, useRef, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Props = {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
};

/** Lightweight portal tooltip — hover + focus for keyboard users, never clipped by overflow containers. */
export function Tooltip({
  content,
  children,
  side = "top",
  disabled = false,
  className,
  contentClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      const tooltipWidth = tooltip ? tooltip.offsetWidth : 240;
      const tooltipHeight = tooltip ? tooltip.offsetHeight : 36;
      const gap = 8;
      const padding = 12;

      let actualSide = side;
      if (side === "top" && rect.top - tooltipHeight - gap < padding) {
        actualSide = "bottom";
      } else if (side === "bottom" && rect.bottom + tooltipHeight + gap > window.innerHeight - padding) {
        actualSide = "top";
      }

      let top = 0;
      let left = 0;

      if (actualSide === "top") {
        top = rect.top - gap - tooltipHeight;
        left = rect.left + (rect.width - tooltipWidth) / 2;
      } else if (actualSide === "bottom") {
        top = rect.bottom + gap;
        left = rect.left + (rect.width - tooltipWidth) / 2;
      } else if (actualSide === "right") {
        top = rect.top + (rect.height - tooltipHeight) / 2;
        left = rect.right + gap;
      } else if (actualSide === "left") {
        top = rect.top + (rect.height - tooltipHeight) / 2;
        left = rect.left - gap - tooltipWidth;
      }

      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));
      top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));

      setCoords({ top, left });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, side]);

  const handleOpen = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const initialTop = side === "top" ? Math.max(12, rect.top - 44) : rect.bottom + 8;
    const initialLeft = Math.max(12, rect.left + rect.width / 2 - 120);
    setCoords({ top: initialTop, left: initialLeft });
    setOpen(true);
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("relative inline-flex", className)}
        onMouseEnter={handleOpen}
        onMouseLeave={() => setOpen(false)}
        onFocus={handleOpen}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={cn(
              "pointer-events-none z-[99999] w-max max-w-sm whitespace-normal break-words rounded-xl bg-slate-900/95 px-3 py-2 text-xs font-normal text-slate-100 shadow-2xl border border-slate-700/60 backdrop-blur-md leading-relaxed dark:bg-slate-800/95 dark:border-slate-600 dark:text-slate-100 animate-in fade-in-50 zoom-in-95 duration-150",
              contentClassName,
            )}
          >
            {content}
          </span>,
          document.body,
        )}
    </>
  );
}
