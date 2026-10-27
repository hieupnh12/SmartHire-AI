import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore, type ToastTone } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

const toneConfig: Record<
  ToastTone,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
    borderClass: string;
    bgClass: string;
    glowClass: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-l-emerald-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-emerald-50/80 dark:bg-emerald-950/30",
    glowClass: "shadow-emerald-500/5",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-l-rose-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-rose-50/80 dark:bg-rose-950/30",
    glowClass: "shadow-rose-500/5",
  },
  danger: {
    icon: AlertCircle,
    iconClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-l-rose-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-rose-50/80 dark:bg-rose-950/30",
    glowClass: "shadow-rose-500/5",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-l-amber-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-amber-50/80 dark:bg-amber-950/30",
    glowClass: "shadow-amber-500/5",
  },
  info: {
    icon: Info,
    iconClass: "text-sky-600 dark:text-sky-400",
    borderClass: "border-l-sky-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-sky-50/80 dark:bg-sky-950/30",
    glowClass: "shadow-sky-500/5",
  },
};

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <aside
      className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex w-[min(100%-2rem,24rem)] flex-col gap-2.5"
      aria-label="Thông báo hệ thống"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {items.map((t) => {
        const config = toneConfig[t.tone] ?? toneConfig.info;
        const Icon = config.icon;

        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto relative flex items-start gap-3 rounded-xl border border-l-4 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-lg backdrop-blur-md transition-all duration-200",
              config.borderClass,
              config.glowClass,
              "hover:shadow-xl",
            )}
          >
            <div className={cn("rounded-lg p-1.5 shrink-0", config.bgClass)}>
              <Icon className={cn("size-4", config.iconClass)} aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                {t.title}
              </p>
              {t.description && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                  {t.description}
                </p>
              )}
            </div>

            <button
              type="button"
              className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              onClick={() => dismiss(t.id)}
              aria-label="Đóng thông báo"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
