import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { localeLabels, locales, useI18nStore, useT, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const t = useT();
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-default)] border px-3 text-sm font-medium",
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
        <Languages className="size-[18px] shrink-0" aria-hidden="true" />
        <span className="hidden whitespace-nowrap sm:inline">{localeLabels[locale]}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-[var(--motion-fast)]", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("common.language")}
          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-48 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white/95 p-1.5 shadow-[var(--shadow-ambient)] backdrop-blur-xl"
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
