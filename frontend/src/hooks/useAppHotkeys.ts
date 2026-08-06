import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18nStore } from "@/i18n";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/features/auth/stores/authStore";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function workspaceHome(role?: string | null) {
  if (role === "ADMIN") return "/admin";
  if (role === "RECRUITER") return "/recruiter";
  if (role === "CANDIDATE") return "/candidate";
  return "/";
}

/**
 * Global shortcuts:
 * ?           open help
 * Esc         close panels
 * Alt+L       cycle language EN→VI→JA
 * g then h    welcome
 * g then w    role workspace home
 * /           focus [data-search-input]
 */
export function useAppHotkeys() {
  const navigate = useNavigate();
  const cycleLocale = useI18nStore((s) => s.cycleLocale);
  const toggleShortcuts = useUiStore((s) => s.toggleShortcuts);
  const closeShortcuts = useUiStore((s) => s.closeShortcuts);
  const closeConfirm = useUiStore((s) => s.closeConfirm);
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  const confirmOpen = useUiStore((s) => s.confirm.open);
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    let pendingG = false;
    let gTimer: number | undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        cycleLocale();
        return;
      }

      if (e.key === "Escape") {
        if (shortcutsOpen) closeShortcuts();
        if (confirmOpen) closeConfirm();
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>("[data-search-input]");
        el?.focus();
        return;
      }

      if (e.key === "g" || e.key === "G") {
        pendingG = true;
        window.clearTimeout(gTimer);
        gTimer = window.setTimeout(() => {
          pendingG = false;
        }, 800);
        return;
      }

      if (pendingG) {
        pendingG = false;
        window.clearTimeout(gTimer);
        if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          navigate("/");
        } else if (e.key === "w" || e.key === "W") {
          e.preventDefault();
          navigate(workspaceHome(role));
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(gTimer);
    };
  }, [
    navigate,
    cycleLocale,
    toggleShortcuts,
    closeShortcuts,
    closeConfirm,
    shortcutsOpen,
    confirmOpen,
    role,
  ]);
}
