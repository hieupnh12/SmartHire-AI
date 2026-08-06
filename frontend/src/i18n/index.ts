import { create } from "zustand";
import { en, type Locale, type Messages, locales } from "./locales/en";
import { vi } from "./locales/vi";
import { ja } from "./locales/ja";

const catalogs: Record<Locale, Messages> = { en, vi, ja };

function detectLocale(): Locale {
  const saved = localStorage.getItem("locale") as Locale | null;
  if (saved && locales.includes(saved)) return saved;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("vi")) return "vi";
  if (nav.startsWith("ja")) return "ja";
  return "en";
}

type I18nState = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  cycleLocale: () => void;
};

export const useI18nStore = create<I18nState>((set, get) => ({
  locale: detectLocale(),
  messages: catalogs[detectLocale()],
  setLocale: (locale) => {
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
    set({ locale, messages: catalogs[locale] });
  },
  cycleLocale: () => {
    const cur = get().locale;
    const idx = locales.indexOf(cur);
    const next = locales[(idx + 1) % locales.length];
    get().setLocale(next);
  },
}));

/** Dot-path lookup, e.g. t("welcome.title") */
export function translate(messages: Messages, path: string): string {
  const parts = path.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

export function useT() {
  const messages = useI18nStore((s) => s.messages);
  return (path: string) => translate(messages, path);
}

// re-export locale meta from en module shape
export { locales, type Locale } from "./locales/en";
export { localeLabels } from "./localeMeta";
