import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { useI18nStore } from "@/i18n";
import { useAppHotkeys } from "@/hooks/useAppHotkeys";
import { ToastViewport } from "@/components/ux/ToastViewport";
import { ShortcutsHelp } from "@/components/ux/ShortcutsHelp";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { useT } from "@/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function HotkeysBridge() {
  useAppHotkeys();
  return null;
}

function SkipLink() {
  const t = useT();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-[var(--color-text-inverse)]"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}

function LocaleBoot({ children }: { children: ReactNode }) {
  const locale = useI18nStore((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LocaleBoot>
          <SkipLink />
          <HotkeysBridge />
          {children}
          <ToastViewport />
          <ShortcutsHelp />
          <ConfirmDialog />
        </LocaleBoot>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
