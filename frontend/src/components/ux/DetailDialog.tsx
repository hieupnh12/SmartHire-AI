import { button } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function DetailDialog({
  open,
  title,
  onClose,
  size = "default",
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  size?: "default" | "wide";
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden overscroll-contain bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-dialog-title"
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-elevated)]",
          size === "wide"
            ? "max-h-[94vh] max-w-[1180px]"
            : "max-h-[90vh] max-w-3xl",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border-default)] px-7 pb-4 pt-6">
          <h2 id="detail-dialog-title" className="min-w-0 py-0.5 text-lg font-semibold leading-7 text-[var(--color-on-surface)]">{title}</h2>
          <button className={button} type="button" onClick={onClose}>Đóng</button>
        </header>
        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", size === "wide" ? "px-7 pb-10 pt-5" : "px-6 pb-8 pt-4")}>{children}</div>
      </div>
    </div>
  );
}
