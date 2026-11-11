import type { Locale } from "./schema";

const INTL_LOCALES: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
  ja: "ja-JP",
};

const OG_LOCALES: Record<Locale, string> = {
  vi: "vi_VN",
  en: "en_US",
  ja: "ja_JP",
};

export function toIntlLocale(locale: Locale): string {
  return INTL_LOCALES[locale] ?? "vi-VN";
}

export function toOgLocale(locale: Locale): string {
  return OG_LOCALES[locale] ?? "vi_VN";
}

export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
  locale: Locale = "vi",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(toIntlLocale(locale), options);
}

export function formatDateTime(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" },
  locale: Locale = "vi",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(toIntlLocale(locale), options);
}

export function formatTime(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
  locale: Locale = "vi",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString(toIntlLocale(locale), options);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: Locale = "vi",
): string {
  return new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
}

export function compareLocaleText(a: string, b: string, locale: Locale = "vi"): number {
  return a.localeCompare(b, toIntlLocale(locale));
}

