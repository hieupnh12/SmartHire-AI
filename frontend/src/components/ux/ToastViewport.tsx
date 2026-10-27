import { useState, useEffect, useRef } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Pause, X } from "lucide-react";
import { useToastStore, type ToastItem, type ToastTone } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

const toneConfig: Record<
  ToastTone,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
    borderClass: string;
    bgClass: string;
    glowClass: string;
    progressClass: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-l-emerald-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-emerald-50/80 dark:bg-emerald-950/30",
    glowClass: "shadow-emerald-500/5",
    progressClass: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-l-rose-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-rose-50/80 dark:bg-rose-950/30",
    glowClass: "shadow-rose-500/5",
    progressClass: "bg-rose-500",
  },
  danger: {
    icon: AlertCircle,
    iconClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-l-rose-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-rose-50/80 dark:bg-rose-950/30",
    glowClass: "shadow-rose-500/5",
    progressClass: "bg-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-l-amber-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-amber-50/80 dark:bg-amber-950/30",
    glowClass: "shadow-amber-500/5",
    progressClass: "bg-amber-500",
  },
  info: {
    icon: Info,
    iconClass: "text-sky-600 dark:text-sky-400",
    borderClass: "border-l-sky-500 border-slate-200/80 dark:border-slate-800",
    bgClass: "bg-sky-50/80 dark:bg-sky-950/30",
    glowClass: "shadow-sky-500/5",
    progressClass: "bg-sky-500",
  },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [remaining, setRemaining] = useState(item.duration);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const dismissedRef = useRef(false);
  isHoveredRef.current = isHovered;

  const config = toneConfig[item.tone] ?? toneConfig.info;
  const Icon = config.icon;

  useEffect(() => {
    if (item.duration <= 0) return;

    const tickMs = 50;
    const timer = setInterval(() => {
      if (isHoveredRef.current) {
        // Paused when mouse is hovering over the toast
        return;
      }

      setRemaining((prev) => {
        const next = prev - tickMs;
        if (next <= 0) {
          clearInterval(timer);
          if (!dismissedRef.current) {
            dismissedRef.current = true;
            window.setTimeout(() => onDismiss(item.id), 0);
          }
          return 0;
        }
        return next;
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [item.id, item.duration, onDismiss]);

  const progressPercent = item.duration > 0 ? Math.max(0, Math.min(100, (remaining / item.duration) * 100)) : 0;

  return (
    <div
      role="status"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "pointer-events-auto relative flex flex-col rounded-xl border border-l-4 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-md transition-all duration-200 overflow-hidden",
        config.borderClass,
        config.glowClass,
        isHovered ? "shadow-2xl ring-1 ring-slate-400/20 dark:ring-slate-600/30 -translate-y-0.5" : "hover:shadow-xl",
      )}
    >
      <div className="flex items-start gap-3 p-3.5 pb-4">
        <div className={cn("rounded-lg p-1.5 shrink-0", config.bgClass)}>
          <Icon className={cn("size-4", config.iconClass)} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {item.title}
            </p>
            {isHovered && item.duration > 0 && (
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 animate-fadeIn">
                <Pause className="size-2.5" /> Tạm dừng
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
              {item.description}
            </p>
          )}
        </div>

        <button
          type="button"
          className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          onClick={() => onDismiss(item.id)}
          aria-label="Đóng thông báo"
        >
          <X className="size-4" />
        </button>
      </div>

      {item.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100/80 dark:bg-slate-800/80">
          <div
            className={cn(
              "h-full transition-all ease-linear",
              config.progressClass,
              isHovered && "opacity-60",
            )}
            style={{
              width: `${progressPercent}%`,
              transitionDuration: isHovered ? "0ms" : "75ms",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <aside
      className="pointer-events-none fixed top-5 right-5 z-[9999] flex w-[min(100%-2rem,24rem)] flex-col gap-2.5"
      aria-label="Thông báo hệ thống"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </aside>
  );
}
