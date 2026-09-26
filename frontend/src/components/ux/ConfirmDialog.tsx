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
        className="relative w-full max-w-[380px] rounded-[20px] border border-[var(--color-border-default)] bg-surface-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex gap-4 ${confirm.description ? 'items-start' : 'items-center'}`}>
          <span className={confirm.danger ? "flex-shrink-0 grid size-11 place-items-center rounded-full bg-red-50 text-red-600" : "flex-shrink-0 grid size-11 place-items-center rounded-full bg-blue-50 text-blue-600"}>
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 id="confirm-title" className="font-display text-lg font-bold text-slate-900 leading-tight">{confirm.title}</h2>
            {confirm.description && (
              <p id="confirm-desc" className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {confirm.description}
              </p>
            )}
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={handleClose} disabled={isConfirming} className="w-full">
            {t("common.cancel")}
          </Button>
          <Button
            variant={confirm.danger ? "danger" : "primary"}
            onClick={() => void handleConfirm()}
            disabled={isConfirming}
            className="w-full"
          >
            {isConfirming && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            {confirm.confirmLabel ?? t("common.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
