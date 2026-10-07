import type { CvBuilderItem, CvBuilderItemRow, CvLanguage, CvSectionType } from "@/api/types/cv";

export const MAX_ITEM_ROWS = 8;

const defaultRowLabels: Record<CvLanguage, Partial<Record<CvSectionType, string[]>>> = {
  vi: {
    experience: ["Mô tả công việc", "Thành tựu nổi bật"],
    projects: ["Thông tin chung", "Mô tả", "Phạm vi công việc", "Công nghệ sử dụng"],
  },
  en: {
    experience: ["Job description", "Key achievements"],
    projects: ["General information", "Description", "Project Scope", "Technology used"],
  },
};

const HEADING = /<p><(?:b|strong)>(.*?)<\/(?:b|strong)><\/p>/i;

const decode = (html: string) => new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rows of the enterprise two-column table; items saved before rows existed are split on their "<p><b>Label</b></p>" headings. */
export function itemRows(item: CvBuilderItem, type: CvSectionType, language: CvLanguage): CvBuilderItemRow[] {
  if (item.rows?.length) return item.rows;
  const labels = defaultRowLabels[language][type] ?? [];
  const [before, ...parts] = item.description.split(new RegExp(HEADING.source, "gi"));
  if (parts.length === 0) return labels.map((label, index) => ({ label, value: index === 0 ? item.description : "" }));
  const rows: CvBuilderItemRow[] = [];
  if (before.trim()) rows.push({ label: labels[0] ?? "", value: before });
  for (let index = 0; index < parts.length; index += 2) rows.push({ label: decode(parts[index]), value: parts[index + 1] ?? "" });
  return rows;
}

/** Flattens rows back into the plain description used by other layouts, AI review and the parsing PDF. */
export function rowsToDescription(rows: CvBuilderItemRow[]): string {
  return rows
    .filter((row) => row.value.trim())
    .map((row) => (row.label.trim() ? `<p><b>${escape(row.label.trim())}</b></p>${row.value}` : row.value))
    .join("");
}
