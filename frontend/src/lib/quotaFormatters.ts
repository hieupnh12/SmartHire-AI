export interface FormatQuotaOptions {
  monthly?: boolean;
  unsupportedLabel?: string;
  unlimitedLabel?: string;
}

/**
 * Unified plan quota formatter matching backend enforcement:
 * - null / undefined / < 0 -> unlimited
 * - 0 -> unsupported
 * - > 0 -> vi-VN formatted number + unit (+ optional /tháng)
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
  } = options;

  if (value === null || value === undefined || value < 0) {
    return unlimitedLabel;
  }
  if (value === 0) {
    return unsupportedLabel;
  }

  const formatted = value.toLocaleString("vi-VN");
  const base = unit ? `${formatted} ${unit}` : formatted;
  return monthly ? `${base}/tháng` : base;
}
