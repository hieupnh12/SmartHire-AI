import { Check, ChevronDown, Home, Languages, LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { locales, useI18nStore, useT, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

type HeaderActionsMenuProps = {
  userInitial?: string;
  userName?: string;
  loadingUser?: boolean;
  variant?: "default" | "icon";
  menuSide?: "bottom" | "right";
  accountPath?: string;
  showHomeLink?: boolean;
  onLogout: () => void;
};

export function HeaderActionsMenu({
  userInitial,
  userName,
  loadingUser = false,
  variant = "default",
  menuSide = "bottom",
  accountPath,
  showHomeLink = true,
  onLogout,
}: HeaderActionsMenuProps) {
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
          variant === "icon" && "size-12 justify-center rounded-full p-1",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
          open
            ? "border-brand-primary text-brand-primary"
            : "border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] hover:border-brand-primary/40 hover:bg-[var(--color-primary-subtle)]",
        )}
        aria-label={`${t("common.language")}, ${t("common.welcome")}, ${t("common.logout")}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-8 place-items-center rounded-full bg-[var(--color-primary-subtle)] font-semibold text-brand-primary ring-1 ring-inset ring-brand-primary/20">
          {loadingUser ? "…" : userInitial ?? "U"}
        </span>
        <span className={cn("hidden max-w-32 truncate sm:inline", variant === "icon" && "sm:hidden")}>{loadingUser ? t("common.loading") : userName ?? t("common.account")}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180", variant === "icon" && "hidden")} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute z-50 w-64 overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-1.5 shadow-lg",
            menuSide === "bottom" && "right-0 top-[calc(100%+8px)]",
            menuSide === "right" && "bottom-0 left-[calc(100%+12px)]",
          )}
        >
          {variant === "icon" && (
            <Link
              to={accountPath ?? "/"}
              role="menuitem"
              className="mb-1.5 flex items-center gap-3 rounded-lg bg-[var(--color-surface-alt)] px-3 py-2.5 transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
              onClick={() => setOpen(false)}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary-subtle)] font-semibold text-brand-primary ring-1 ring-inset ring-brand-primary/20">
                {loadingUser ? "…" : userInitial ?? "U"}
              </span>
              <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-on-surface)]">
                {loadingUser ? t("common.loading") : userName ?? t("common.account")}
              </span>
            </Link>
          )}
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
                    selected ? "bg-[var(--color-primary-subtle)] font-semibold text-brand-primary" : "hover:bg-[var(--color-surface-alt)]",
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
          {showHomeLink && (
            <Link
              to="/"
              role="menuitem"
              className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
              onClick={() => setOpen(false)}
            >
              <Home className="size-4" aria-hidden="true" />
              {t("common.welcome")}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold text-brand-primary hover:bg-[var(--color-primary-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
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
