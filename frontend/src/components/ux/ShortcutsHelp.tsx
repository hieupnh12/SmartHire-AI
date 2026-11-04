import { useEffect } from "react";
import { Command, X } from "lucide-react";
import { useT } from "@/i18n";
import { useUiStore } from "@/stores/uiStore";

type ShortcutRow = {
  keys: string[];
  separator?: string;
  descKey: string;
};

const rows: ShortcutRow[] = [
  { keys: ["?"], descKey: "shortcuts.openShortcuts" },
  { keys: ["g", "h"], separator: "rồi", descKey: "shortcuts.goWelcome" },
  { keys: ["g", "w"], separator: "rồi", descKey: "shortcuts.goWorkspace" },
  { keys: ["Alt", "L"], separator: "+", descKey: "shortcuts.switchLang" },
  { keys: ["/"], descKey: "shortcuts.focusSearch" },
  { keys: ["↑", "↓"], separator: "/", descKey: "shortcuts.navigateJobs" },
  { keys: ["Enter"], descKey: "shortcuts.openJob" },
  { keys: ["Esc"], descKey: "shortcuts.close" },
];

export function ShortcutsHelp() {
  const t = useT();
  const open = useUiStore((s) => s.shortcutsOpen);
  const close = useUiStore((s) => s.closeShortcuts);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="relative w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden dark:border-slate-800 dark:bg-slate-900 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:border-blue-900/60 dark:text-blue-400">
              <Command className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {t("shortcuts.title")}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("shortcuts.hint")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-2 max-h-[65vh] overflow-y-auto">
          {rows.map((r) => (
            <div
              key={r.descKey}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 transition-colors hover:bg-slate-100/60 dark:border-slate-800/60 dark:bg-slate-800/30 dark:hover:bg-slate-800/60"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t(r.descKey)}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                {r.keys.map((k, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-sans font-normal">
                        {r.separator ?? "+"}
                      </span>
                    )}
                    <kbd className="inline-flex min-w-6 h-6 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {k}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nhấn <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Esc</kbd> hoặc click bên ngoài để đóng
          </p>
        </div>
      </div>
    </div>
  );
}
