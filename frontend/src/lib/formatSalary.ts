import { formatNumber, t, toIntlLocale, useI18nStore } from "@/i18n";

const MILLION = 1_000_000;

function formatMillions(value: number) {
  const locale = useI18nStore.getState().locale;
  return formatNumber(value / MILLION, { maximumFractionDigits: 2 }, locale);
}

function parseAmount(value: string) {
  const compact = value.replace(/\s/g, "");
  const parts = compact.split(/[.,]/);
  if (parts.length === 1) return Number(compact);
  const fraction = parts.at(-1) ?? "";
  return Number(fraction.length <= 2 ? `${parts.slice(0, -1).join("")}.${fraction}` : parts.join(""));
}

export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currency = "VND",
) {
  if (min == null && max == null) return t("salary.negotiable");

  if (currency.toUpperCase() === "VND") {
    if (min != null && max != null) {
      return t("salary.millionRange", { min: formatMillions(min), max: formatMillions(max) });
    }
    return min != null
      ? t("salary.millionFrom", { min: formatMillions(min) })
      : t("salary.millionUpTo", { max: formatMillions(max!) });
  }

  const locale = useI18nStore.getState().locale;
  const formatter = new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  if (min != null && max != null) return `${formatter.format(min)} – ${formatter.format(max)}`;
  return min != null
    ? t("salary.currencyFrom", { min: formatter.format(min) })
    : t("salary.currencyUpTo", { max: formatter.format(max!) });
}

export function formatSalaryText(salary?: string | null) {
  if (!salary || !/VND|₫|đồng/i.test(salary)) return salary;
  const amounts = [...salary.matchAll(/\d+(?:[.,]\d+)*/g)]
    .map((match) => parseAmount(match[0]))
    .filter(Number.isFinite);
  if (amounts.length === 0) return salary;
  return t("salary.millionList", { amounts: amounts.map(formatMillions).join(" – ") });
}
