import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useT } from "@/i18n";
import { Button } from "@/components/ux/Button";

export function ConfirmDialog() {
  const t = useT();
  const confirm = useUiStore((s) => s.confirm);
  const closeConfirm = useUiStore((s) => s.closeConfirm);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirm.open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previousFocus?.focus();
  }, [confirm.open]);

  const handleClose = () => {
    if (!isConfirming) closeConfirm();
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);
    try {
      await confirm.onConfirm?.();
      closeConfirm();
    } catch {
      setError("Không thể hoàn tất thao tác. Vui lòng thử lại.");
    } finally {
      setIsConfirming(false);
    }
  };

  if (!confirm.open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={confirm.description ? "confirm-desc" : undefined}
        className="relative w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-surface-card p-6 shadow-[0_24px_60px_-16px_rgba(15,23,42,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={handleClose} disabled={isConfirming} className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-surface-muted disabled:opacity-50" aria-label="Đóng"><X className="size-4" aria-hidden="true" /></button>
        <span className={confirm.danger ? "grid size-11 place-items-center rounded-xl bg-red-50 text-red-700" : "grid size-11 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"}><AlertTriangle className="size-5" aria-hidden="true" /></span>
        <h2 id="confirm-title" className="mt-4 pr-8 font-display text-xl font-semibold">{confirm.title}</h2>
        {confirm.description && (
          <p id="confirm-desc" className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {confirm.description}
          </p>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={handleClose} disabled={isConfirming}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={confirm.danger ? "danger" : "primary"}
            onClick={() => void handleConfirm()}
            disabled={isConfirming}
          >
            {isConfirming && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            {confirm.confirmLabel ?? t("common.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
