import { useToastStore } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

const toneClass = {
  info: "border-[var(--color-status-info)]",
  success: "border-[var(--color-status-success)]",
  warning: "border-[var(--color-status-warning)]",
  danger: "border-[var(--color-status-danger)]",
} as const;

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-[var(--radius-md)] border-l-4 bg-surface-card p-4 shadow-[var(--shadow-card)]",
            "animate-[fadeSlide_var(--motion-normal)_ease-out]",
            toneClass[t.tone],
          )}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">{t.title}</p>
              {t.description && (
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              className="min-h-9 min-w-9 rounded-md text-[var(--color-text-secondary)] hover:bg-surface-muted"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
