const MILLION = 1_000_000;

function formatMillions(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value / MILLION);
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
  if (min == null && max == null) return "Thỏa thuận";

  if (currency.toUpperCase() === "VND") {
    if (min != null && max != null) return `${formatMillions(min)} – ${formatMillions(max)} triệu`;
    return min != null ? `Từ ${formatMillions(min)} triệu` : `Đến ${formatMillions(max!)} triệu`;
  }

  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  if (min != null && max != null) return `${formatter.format(min)} – ${formatter.format(max)}`;
  return min != null ? `Từ ${formatter.format(min)}` : `Đến ${formatter.format(max!)}`;
}

export function formatSalaryText(salary?: string | null) {
  if (!salary || !/VND|₫|đồng/i.test(salary)) return salary;
  const amounts = [...salary.matchAll(/\d+(?:[.,]\d+)*/g)]
    .map((match) => parseAmount(match[0]))
    .filter(Number.isFinite);
  if (amounts.length === 0) return salary;
  return `${amounts.map(formatMillions).join(" – ")} triệu`;
}
