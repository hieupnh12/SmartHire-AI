import { formatNumber, type Locale } from "@/i18n";

export interface FormatQuotaOptions {
  monthly?: boolean;
  unsupportedLabel?: string;
  unlimitedLabel?: string;
  monthlySuffix?: string;
  locale?: Locale;
}

/**
 * Unified plan quota formatter matching backend enforcement:
 * - null / undefined / < 0 -> unlimited
 * - 0 -> unsupported
 * - > 0 -> locale-formatted number + unit (+ optional monthly suffix)
 */
export function formatQuotaLimit(
  value: number | null | undefined,
  unit: string,
  options: FormatQuotaOptions = {},
): string {
  const {
    monthly = false,
    unsupportedLabel = "Không hỗ trợ",
    unlimitedLabel = "Không giới hạn",
    monthlySuffix = "/tháng",
    locale = "vi",
  } = options;

  if (value === null || value === undefined || value < 0) {
    return unlimitedLabel;
  }
  if (value === 0) {
    return unsupportedLabel;
  }

  const formatted = formatNumber(value, undefined, locale);
  const base = unit ? `${formatted} ${unit}` : formatted;
  return monthly ? `${base}${monthlySuffix}` : base;
}
