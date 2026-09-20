import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { localeLabels, locales, useI18nStore, useT, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  variant?: "default" | "sidebar" | "icon";
  menuSide?: "top" | "right" | "bottom";
  openOnHover?: boolean;
};

export function LanguageSwitcher({ variant = "default", menuSide = "bottom", openOnHover = false }: LanguageSwitcherProps) {
  const t = useT();
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverCloseTimer = () => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => () => clearHoverCloseTimer(), []);

  const openAndFocus = (index = locales.indexOf(locale)) => {
    setOpen(true);
    requestAnimationFrame(() => itemRefs.current[Math.max(index, 0)]?.focus());
  };

  const moveFocus = (currentIndex: number, offset: number) => {
    const nextIndex = (currentIndex + offset + locales.length) % locales.length;
    itemRefs.current[nextIndex]?.focus();
  };

  const selectLocale = (value: Locale) => {
    setLocale(value);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex", variant === "sidebar" && "w-full")}
      onMouseEnter={() => {
        if (!openOnHover) return;
        clearHoverCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={() => {
        if (!openOnHover) return;
        clearHoverCloseTimer();
        hoverCloseTimerRef.current = setTimeout(() => setOpen(false), 220);
      }}
      onFocusCapture={() => openOnHover && setOpen(true)}
      onBlurCapture={(event) => {
        if (openOnHover && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-default)] border px-3 text-sm font-medium",
          variant === "sidebar" && "min-h-11 w-full justify-between rounded-xl",
          variant === "icon" && "size-11 min-h-11 justify-center rounded-xl p-0",
          "transition-[color,background-color,border-color,box-shadow] duration-[var(--motion-fast)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          open
            ? "border-brand-primary bg-white text-brand-primary shadow-[0_0_0_3px_var(--color-primary-soft)]"
            : "border-[var(--color-border-default)] bg-white/75 text-[var(--color-on-surface-variant)] hover:border-brand-primary/40 hover:bg-[var(--container-blue)] hover:text-brand-primary",
        )}
        aria-label={t("common.language")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openAndFocus())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAndFocus();
          }
        }}
      >
        {variant === "sidebar" ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700">
            <Languages className="size-[18px]" aria-hidden="true" />
          </span>
        ) : (
          <Languages className="size-[18px] shrink-0" aria-hidden="true" />
        )}
        <span className={cn("hidden whitespace-nowrap sm:inline", variant === "sidebar" && "inline", variant === "icon" && "hidden")}>{localeLabels[locale]}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-[var(--motion-fast)]", open && "rotate-180", variant === "icon" && "hidden")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("common.language")}
          className={cn(
            "absolute right-0 z-50 min-w-48 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white/95 p-1.5 shadow-[var(--shadow-ambient)] backdrop-blur-xl",
            menuSide === "top" && "bottom-[calc(100%+8px)]",
            menuSide === "bottom" && "top-[calc(100%+8px)]",
            menuSide === "right" && "bottom-0 left-[calc(100%+12px)] right-auto top-auto min-w-56 rounded-2xl border-slate-200 bg-white shadow-[0_20px_50px_-18px_rgba(15,23,42,0.32)] before:absolute before:-left-3 before:bottom-0 before:h-full before:w-3",
            variant === "icon" && menuSide !== "right" && "left-[calc(100%+8px)] right-auto",
          )}
        >
          <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]/70">
            {t("common.language")}
          </div>
          {locales.map((value, index) => {
            const selected = value === locale;
            return (
              <button
                key={value}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={cn(
                  "flex min-h-10 w-full items-center justify-between gap-4 rounded-[var(--radius-default)] px-2.5 text-left text-sm transition-colors duration-[var(--motion-fast)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30",
                  selected
                    ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
                    : "text-[var(--color-on-surface)] hover:bg-[var(--color-primary-subtle)]",
                )}
                onClick={() => selectLocale(value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveFocus(index, 1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveFocus(index, -1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    itemRefs.current[0]?.focus();
                  } else if (event.key === "End") {
                    event.preventDefault();
                    itemRefs.current[locales.length - 1]?.focus();
                  }
                }}
              >
                <span>{localeLabels[value]}</span>
                <Check className={cn("size-4 text-brand-primary", !selected && "invisible")} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
