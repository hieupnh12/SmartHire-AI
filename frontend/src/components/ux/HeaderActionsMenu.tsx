import { Bell, ChevronDown, Home, LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

type HeaderActionsMenuProps = {
  userInitial?: string;
  userName?: string;
  loadingUser?: boolean;
  variant?: "default" | "icon";
  menuSide?: "bottom" | "right";
  accountPath?: string;
  notificationsPath?: string;
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
  notificationsPath,
  showHomeLink = true,
  onLogout,
}: HeaderActionsMenuProps) {
  const t = useT();
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

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex min-h-9 items-center gap-2 rounded-xl border bg-white px-2.5 py-1 text-sm font-medium shadow-2xs transition-colors",
          variant === "icon" && "size-10 justify-center rounded-full p-1",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
          open
            ? "border-brand-primary text-brand-primary"
            : "border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] hover:border-brand-primary/40 hover:bg-[var(--color-primary-subtle)]",
        )}
        aria-label={`${t("common.welcome")}, ${t("common.logout")}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-7 place-items-center rounded-full bg-[var(--color-primary-subtle)] text-xs font-semibold text-brand-primary ring-1 ring-inset ring-brand-primary/20">
          {loadingUser ? "…" : userInitial ?? "U"}
        </span>
        <span className={cn("hidden max-w-32 truncate text-xs sm:inline", variant === "icon" && "sm:hidden")}>
          {loadingUser ? t("common.loading") : userName ?? t("common.account")}
        </span>
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180", variant === "icon" && "hidden")} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute z-50 w-60 overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-1.5 shadow-lg",
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
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-subtle)] font-semibold text-brand-primary ring-1 ring-inset ring-brand-primary/20">
                {loadingUser ? "…" : userInitial ?? "U"}
              </span>
              <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-on-surface)]">
                {loadingUser ? t("common.loading") : userName ?? t("common.account")}
              </span>
            </Link>
          )}

          {notificationsPath && (
            <Link
              to={notificationsPath}
              role="menuitem"
              className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
              onClick={() => setOpen(false)}
            >
              <Bell className="size-4" aria-hidden="true" />
              {t("nav.notificationSettings")}
            </Link>
          )}
          {showHomeLink && (
            <Link
              to="/"
              role="menuitem"
              className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
              onClick={() => setOpen(false)}
            >
              <Home className="size-4" aria-hidden="true" />
              {t("common.welcome")}
            </Link>
          )}
          <div className="my-1 border-t border-[var(--color-border-default)]" />
          <button
            type="button"
            role="menuitem"
            className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
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
