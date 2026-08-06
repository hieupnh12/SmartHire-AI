import { useUiStore } from "@/stores/uiStore";
import { useT } from "@/i18n";
import { Button } from "@/components/ux/Button";

export function ConfirmDialog() {
  const t = useT();
  const confirm = useUiStore((s) => s.confirm);
  const closeConfirm = useUiStore((s) => s.closeConfirm);

  if (!confirm.open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={closeConfirm}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={confirm.description ? "confirm-desc" : undefined}
        className="w-full max-w-md rounded-[var(--radius-lg)] bg-surface-card p-6 shadow-[var(--shadow-elevated)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="font-display text-xl font-semibold">
          {confirm.title}
        </h2>
        {confirm.description && (
          <p id="confirm-desc" className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {confirm.description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={closeConfirm}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={confirm.danger ? "danger" : "primary"}
            onClick={() => {
              confirm.onConfirm?.();
              closeConfirm();
            }}
          >
            {confirm.confirmLabel ?? t("common.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
