import { Check, ChevronDown, Home, Languages, LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { localeLabels, locales, useI18nStore, useT, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

type HeaderActionsMenuProps = {
  userInitial?: string;
  userName?: string;
  onLogout: () => void;
};

export function HeaderActionsMenu({ userInitial, userName, onLogout }: HeaderActionsMenuProps) {
  const t = useT();
  const locale = useI18nStore((state) => state.locale);
  const setLocale = useI18nStore((state) => state.setLocale);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

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
          "inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-2.5 text-sm font-medium shadow-sm transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
          open
            ? "border-brand-primary text-brand-primary"
            : "border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] hover:border-teal-500/40 hover:bg-teal-50",
        )}
        aria-label={`${t("common.language")}, ${t("common.welcome")}, ${t("common.logout")}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-8 place-items-center rounded-full bg-teal-50 font-semibold text-brand-primary ring-1 ring-inset ring-brand-primary/20">
          {userInitial ?? "U"}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{userName ?? localeLabels[locale]}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
            <Languages className="size-4" aria-hidden="true" />
            {t("common.language")}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {locales.map((value) => {
              const selected = value === locale;
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={cn(
                    "flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary",
                    selected ? "bg-teal-50 font-semibold text-brand-primary" : "hover:bg-[var(--color-surface-alt)]",
                  )}
                  onClick={() => selectLocale(value)}
                >
                  {value.toUpperCase()}
                  {selected && <Check className="size-3.5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="my-1.5 border-t border-[var(--color-border-default)]" />
          <Link
            to="/"
            role="menuitem"
            className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-[var(--color-on-surface)] hover:bg-teal-50 hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => setOpen(false)}
          >
            <Home className="size-4" aria-hidden="true" />
            {t("common.welcome")}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold text-brand-primary hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t("common.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
