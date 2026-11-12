import { useCallback } from "react";
import { create } from "zustand";
import { en } from "./locales/en";
import { vi, type Messages } from "./locales/vi";
import { ja } from "./locales/ja";
import { locales, type Locale, type TranslationParams } from "./schema";

const catalogs: Record<Locale, Messages> = { en, vi, ja };

function detectLocale(): Locale {
  if (typeof window === "undefined") return "vi";
  const saved = window.localStorage.getItem("locale") as Locale | null;
  if (saved && locales.includes(saved)) return saved;
  const nav = window.navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("ja")) return "ja";
  return "vi";
}

const initialLocale = detectLocale();

type I18nState = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  cycleLocale: () => void;
};

export const useI18nStore = create<I18nState>((set, get) => ({
  locale: initialLocale,
  messages: catalogs[initialLocale],
  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locale", locale);
      document.documentElement.lang = locale;
    }
    set({ locale, messages: catalogs[locale] });
  },
  cycleLocale: () => {
    const cur = get().locale;
    const idx = locales.indexOf(cur);
    const next = locales[(idx + 1) % locales.length];
    get().setLocale(next);
  },
}));

function lookupRaw(messages: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = messages;
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    params[key] !== undefined ? String(params[key]) : match,
  );
}

/** Dot-path lookup with fallback to Vietnamese/English and `{param}` interpolation. */
export function translate(messages: Messages, path: string, params?: TranslationParams): string {
  const raw = lookupRaw(messages, path) ?? lookupRaw(vi, path) ?? lookupRaw(en, path);
  if (raw === undefined) return path;
  return interpolate(raw, params);
}

/** Standalone translation helper for non-React modules (API errors, formatters, SEO). */
export function t(path: string, params?: TranslationParams): string {
  return translate(useI18nStore.getState().messages, path, params);
}

export type TranslateFn = (path: string, params?: TranslationParams) => string;

export function useT(): TranslateFn {
  const messages = useI18nStore((s) => s.messages);
  return useCallback(
    (path: string, params?: TranslationParams) => translate(messages, path, params),
    [messages],
  );
}

export function useLocale(): Locale {
  return useI18nStore((s) => s.locale);
}

export { locales, type Locale, type TranslationParams } from "./schema";
export { type Messages } from "./locales/vi";
export { localeLabels } from "./localeMeta";
export {
  toIntlLocale,
  toOgLocale,
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber,
  compareLocaleText,
} from "./format";
