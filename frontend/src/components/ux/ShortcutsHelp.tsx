import { useT } from "@/i18n";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ux/Button";

const rows = [
  { keys: "?", descKey: "shortcuts.openShortcuts" },
  { keys: "g then h", descKey: "shortcuts.goWelcome" },
  { keys: "g then w", descKey: "shortcuts.goWorkspace" },
  { keys: "Alt + L", descKey: "shortcuts.switchLang" },
  { keys: "/", descKey: "shortcuts.focusSearch" },
  { keys: "Esc", descKey: "shortcuts.close" },
] as const;

export function ShortcutsHelp() {
  const t = useT();
  const open = useUiStore((s) => s.shortcutsOpen);
  const close = useUiStore((s) => s.closeShortcuts);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-lg rounded-[var(--radius-lg)] bg-surface-card p-6 shadow-[var(--shadow-elevated)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="shortcuts-title" className="font-display text-xl font-semibold">
              {t("shortcuts.title")}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {t("shortcuts.hint")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={close} aria-label={t("common.close")}>
            ×
          </Button>
        </div>
        <ul className="mt-5 space-y-2">
          {rows.map((r) => (
            <li
              key={r.keys}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-surface-muted px-3 py-2 text-sm"
            >
              <span className="text-[var(--color-text-secondary)]">{t(r.descKey)}</span>
              <kbd className="rounded border border-[var(--color-border-default)] bg-surface-card px-2 py-1 font-mono text-xs">
                {r.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
