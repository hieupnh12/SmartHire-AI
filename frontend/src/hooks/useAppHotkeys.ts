import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18nStore } from "@/i18n";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";

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
  if (role === "ADMIN" || role === "TENANT_ADMIN") return "/internal/admin";
  if (role === "RECRUITER" || role === "HR") return "/recruiter";
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
 * /           cycle focus through visible [data-search-input] elements
 * Arrow Up/Down navigate recruiter job cards
 * Enter       open the focused recruiter job workspace
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

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      if (e.key === "/" && (!isTypingTarget(e.target) || (e.target instanceof HTMLElement && e.target.matches("[data-search-input]")))) {
        e.preventDefault();
        const searchInputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-search-input]"))
          .filter((input) => !input.disabled && input.getClientRects().length > 0);
        const currentIndex = searchInputs.indexOf(document.activeElement as HTMLInputElement);
        searchInputs[(currentIndex + 1) % searchInputs.length]?.focus();
        return;
      }

      const focusedElement = e.target instanceof HTMLElement ? e.target : null;
      const jobCards = Array.from(document.querySelectorAll<HTMLElement>("[data-job-card]"))
        .filter((card) => card.getClientRects().length > 0);
      const focusedCardIndex = focusedElement ? jobCards.indexOf(focusedElement) : -1;

      if (e.key === "ArrowDown" && focusedElement?.matches("[data-job-list-search]") && jobCards.length > 0) {
        e.preventDefault();
        jobCards[0].focus();
        return;
      }

      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && focusedCardIndex >= 0) {
        e.preventDefault();
        const offset = e.key === "ArrowDown" ? 1 : -1;
        jobCards[(focusedCardIndex + offset + jobCards.length) % jobCards.length].focus();
        return;
      }

      if (e.key === "Enter" && focusedCardIndex >= 0) {
        e.preventDefault();
        const workspacePath = jobCards[focusedCardIndex].dataset.jobWorkspacePath;
        if (workspacePath) navigate(workspacePath);
        return;
      }

      if (isTypingTarget(e.target)) return;

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
