import { button } from "@/features/tenant/recruiter/matching/components/rankingUi";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function DetailDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-dialog-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-elevated)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] px-6 py-4">
          <h2 id="detail-dialog-title" className="text-lg font-semibold text-[var(--color-on-surface)]">{title}</h2>
          <button className={button} type="button" onClick={onClose}>Đóng</button>
        </header>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
